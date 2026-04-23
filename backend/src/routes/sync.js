import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { payloadForSignature, verifySignature, isTimestampValid } from '../utils/crypto.js';
import { config } from '../config/index.js';

const router = Router();

// POST /sync-transactions - client sends pending transactions from device
router.post(
  '/sync-transactions',
  requireAuth,
  [
    body('transactions').isArray().withMessage('transactions must be array'),
    body('transactions.*.txn_id').isUUID(),
    body('transactions.*.sender_id').isUUID(),
    body('transactions.*.receiver_id').isUUID(),
    body('transactions.*.amount').isInt({ min: 1 }),
    body('transactions.*.timestamp').isInt(),
    body('transactions.*.signature').optional().trim(),
    body('transactions.*.device_id').optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userId = req.user.userId;
      const transactions = req.body.transactions;
      const results = { synced: [], failed: [] };

      for (const t of transactions) {
        // Only allow syncing own sent transactions
        if (t.sender_id !== userId) {
          results.failed.push({ txn_id: t.txn_id, reason: 'Sender mismatch' });
          continue;
        }

        // 1. Uniqueness (idempotent: receiver may have settled first while online)
        const existing = await pool.query(
          `SELECT txn_id, sender_id, receiver_id, sync_status FROM transactions WHERE txn_id = $1`,
          [t.txn_id]
        );
        if (existing.rows.length > 0) {
          const row = existing.rows[0];
          if (
            row.sync_status === 'SYNCED' &&
            row.sender_id === t.sender_id &&
            row.receiver_id === t.receiver_id
          ) {
            results.synced.push({ txn_id: t.txn_id });
            continue;
          }
          results.failed.push({ txn_id: t.txn_id, reason: 'Duplicate transaction' });
          continue;
        }

        // 2. Timestamp validity
        if (!isTimestampValid(t.timestamp, config.txnTimestampMaxAgeSeconds)) {
          results.failed.push({ txn_id: t.txn_id, reason: 'Transaction expired' });
          continue;
        }

        // 3. Signature (optional strict check; we accept if format valid when no public key)
        const payloadStr = payloadForSignature({
          txn_id: t.txn_id,
          sender_id: t.sender_id,
          receiver_id: t.receiver_id,
          amount: t.amount,
          timestamp: t.timestamp,
          device_id: t.device_id,
        });
        if (t.signature && !verifySignature(payloadStr, t.signature, null)) {
          results.failed.push({ txn_id: t.txn_id, reason: 'Invalid signature' });
          continue;
        }

        // 4. Receiver exists
        const receiver = await pool.query('SELECT id FROM users WHERE id = $1', [t.receiver_id]);
        if (receiver.rows.length === 0) {
          results.failed.push({ txn_id: t.txn_id, reason: 'Receiver not found' });
          continue;
        }

        // 5. Sender balance (check wallet)
        const wallet = await pool.query(
          'SELECT available_balance FROM wallets WHERE user_id = $1 FOR UPDATE',
          [t.sender_id]
        );
        if (wallet.rows.length === 0) {
          results.failed.push({ txn_id: t.txn_id, reason: 'Wallet not found' });
          continue;
        }
        const available = Number(wallet.rows[0].available_balance);
        if (available < t.amount) {
          results.failed.push({ txn_id: t.txn_id, reason: 'Insufficient balance' });
          continue;
        }

        try {
          await pool.query('BEGIN');

          await pool.query(
            `INSERT INTO transactions (txn_id, sender_id, receiver_id, amount, status, sync_status, signature, device_id, synced_at)
             VALUES ($1, $2, $3, $4, 'SYNCED', 'SYNCED', $5, $6, NOW())`,
            [t.txn_id, t.sender_id, t.receiver_id, t.amount, t.signature || null, t.device_id || null]
          );

          await pool.query(
            `UPDATE wallets SET total_balance = total_balance - $1, available_balance = available_balance - $1, updated_at = NOW() WHERE user_id = $2`,
            [t.amount, t.sender_id]
          );
          await pool.query(
            `UPDATE wallets SET total_balance = total_balance + $1, available_balance = available_balance + $1, updated_at = NOW() WHERE user_id = $2`,
            [t.amount, t.receiver_id]
          );

          await pool.query('COMMIT');
          results.synced.push({ txn_id: t.txn_id });
        } catch (err) {
          await pool.query('ROLLBACK').catch(() => {});
          results.failed.push({ txn_id: t.txn_id, reason: err.message || 'Settlement failed' });
        }
      }

      // Log sync batch
      await pool.query(
        `INSERT INTO sync_logs (user_id, txn_count, status, details) VALUES ($1, $2, $3, $4)`,
        [userId, transactions.length, 'completed', JSON.stringify({ synced: results.synced.length, failed: results.failed.length })]
      );

      res.json({
        success: true,
        synced: results.synced.length,
        failed: results.failed.length,
        results,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Sync failed' });
    }
  }
);

export default router;
