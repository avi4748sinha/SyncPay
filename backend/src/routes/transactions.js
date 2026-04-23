import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { payloadForSignature, verifySignature, isTimestampValid } from '../utils/crypto.js';
import { config } from '../config/index.js';

const router = Router();

// GET /transactions - list for current user
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const status = req.query.status; // PENDING_SYNC | SYNCED | FAILED
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const offset = parseInt(req.query.offset, 10) || 0;

    let q = `
      SELECT t.txn_id, t.sender_id, t.receiver_id, t.amount, t.status, t.sync_status, t.note, t.created_at, t.synced_at,
             sender.name AS sender_name, receiver.name AS receiver_name
      FROM transactions t
      JOIN users sender ON sender.id = t.sender_id
      JOIN users receiver ON receiver.id = t.receiver_id
      WHERE t.sender_id = $1 OR t.receiver_id = $2
    `;
    const params = [userId, userId];

    if (status) {
      params.push(status);
      q += ` AND t.sync_status = $${params.length}`;
    }
    q += ` ORDER BY t.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(q, params);

    const list = result.rows.map((r) => ({
      txn_id: r.txn_id,
      sender_id: r.sender_id,
      receiver_id: r.receiver_id,
      sender_name: r.sender_name,
      receiver_name: r.receiver_name,
      amount: Number(r.amount),
      status: r.status,
      sync_status: r.sync_status,
      note: r.note,
      created_at: r.created_at,
      synced_at: r.synced_at,
      direction: r.sender_id === userId ? 'sent' : 'received',
    }));

    res.json({ success: true, transactions: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
});

// POST /send-transaction - online send (instant ledger update); requires PIN if user has set one
router.post(
  '/send-transaction',
  requireAuth,
  [
    body('receiver_id').isUUID(),
    body('amount').isInt({ min: 1 }),
    body('note').optional().trim(),
    body('pin').optional().trim().isLength(6),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      const { receiver_id, amount, note, pin } = req.body;
      const senderId = req.user.userId;

      const userRow = await pool.query('SELECT pin_hash FROM users WHERE id = $1', [senderId]);
      if (userRow.rows.length > 0 && userRow.rows[0].pin_hash) {
        if (!pin || pin.length !== 6) {
          return res.status(400).json({ success: false, message: 'UPI PIN required' });
        }
        const match = await bcrypt.compare(String(pin), userRow.rows[0].pin_hash);
        if (!match) {
          return res.status(401).json({ success: false, message: 'Invalid UPI PIN' });
        }
      }

      if (senderId === receiver_id) {
        return res.status(400).json({ success: false, message: 'Cannot send to self' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const wallet = await client.query(
          'SELECT available_balance, offline_limit FROM wallets WHERE user_id = $1 FOR UPDATE',
          [senderId]
        );
        if (wallet.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ success: false, message: 'Wallet not found' });
        }
        const bal = Number(wallet.rows[0].available_balance);
        if (bal < amount) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: 'Insufficient balance' });
        }

        const receiver = await client.query('SELECT id FROM users WHERE id = $1', [receiver_id]);
        if (receiver.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: 'Receiver not found' });
        }

        const { v4: uuid } = await import('uuid');
        const txnId = uuid();

        await client.query(
          `INSERT INTO transactions (txn_id, sender_id, receiver_id, amount, status, sync_status, note)
           VALUES ($1, $2, $3, $4, 'PENDING', 'SYNCED', $5)`,
          [txnId, senderId, receiver_id, amount, note || null]
        );

        await client.query(
          `UPDATE wallets SET total_balance = total_balance - $1, available_balance = available_balance - $1, updated_at = NOW() WHERE user_id = $2`,
          [amount, senderId]
        );
        await client.query(
          `UPDATE wallets SET total_balance = total_balance + $1, available_balance = available_balance + $1, updated_at = NOW() WHERE user_id = $2`,
          [amount, receiver_id]
        );

        await client.query(
          `UPDATE transactions SET status = 'SYNCED', synced_at = NOW() WHERE txn_id = $1`,
          [txnId]
        );

        await client.query('COMMIT');

        const row = await pool.query(
          `SELECT t.txn_id, t.sender_id, t.receiver_id, t.amount, t.status, t.sync_status, t.created_at
           FROM transactions t WHERE t.txn_id = $1`,
          [txnId]
        );

        res.status(201).json({ success: true, transaction: row.rows[0] });
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Send failed' });
    }
  }
);

// POST /settle-offline — receiver (online) submits signed offline txn; ledger updates immediately
router.post(
  '/settle-offline',
  requireAuth,
  [
    body('txn_id').isUUID(),
    body('sender_id').isUUID(),
    body('receiver_id').isUUID(),
    body('amount').isInt({ min: 1 }),
    body('timestamp').isInt(),
    body('signature').optional().trim(),
    body('device_id').optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userId = req.user.userId;
      const t = req.body;

      if (t.receiver_id !== userId) {
        return res.status(403).json({ success: false, message: 'Only the receiver can settle this payment' });
      }

      if (!isTimestampValid(t.timestamp, config.txnTimestampMaxAgeSeconds)) {
        return res.status(400).json({ success: false, message: 'Transaction expired' });
      }

      const payloadStr = payloadForSignature({
        txn_id: t.txn_id,
        sender_id: t.sender_id,
        receiver_id: t.receiver_id,
        amount: t.amount,
        timestamp: t.timestamp,
        device_id: t.device_id,
      });
      if (t.signature && !verifySignature(payloadStr, t.signature, null)) {
        return res.status(400).json({ success: false, message: 'Invalid signature' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const dup = await client.query(
          `SELECT txn_id, sender_id, receiver_id, sync_status FROM transactions WHERE txn_id = $1`,
          [t.txn_id]
        );
        if (dup.rows.length > 0) {
          const row = dup.rows[0];
          if (
            row.sync_status === 'SYNCED' &&
            row.sender_id === t.sender_id &&
            row.receiver_id === t.receiver_id
          ) {
            await client.query('COMMIT');
            return res.json({ success: true, already_settled: true, txn_id: t.txn_id });
          }
          await client.query('ROLLBACK');
          return res.status(409).json({ success: false, message: 'Duplicate transaction' });
        }

        const receiverRow = await client.query('SELECT id FROM users WHERE id = $1', [t.receiver_id]);
        if (receiverRow.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ success: false, message: 'Receiver not found' });
        }

        const senderRow = await client.query('SELECT id FROM users WHERE id = $1', [t.sender_id]);
        if (senderRow.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ success: false, message: 'Sender not found' });
        }

        const wallet = await client.query(
          'SELECT available_balance FROM wallets WHERE user_id = $1 FOR UPDATE',
          [t.sender_id]
        );
        if (wallet.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ success: false, message: 'Sender wallet not found' });
        }
        const available = Number(wallet.rows[0].available_balance);
        if (available < t.amount) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: 'Insufficient sender balance' });
        }

        await client.query(
          `INSERT INTO transactions (txn_id, sender_id, receiver_id, amount, status, sync_status, signature, device_id, synced_at)
           VALUES ($1, $2, $3, $4, 'SYNCED', 'SYNCED', $5, $6, NOW())`,
          [t.txn_id, t.sender_id, t.receiver_id, t.amount, t.signature || null, t.device_id || null]
        );

        await client.query(
          `UPDATE wallets SET total_balance = total_balance - $1, available_balance = available_balance - $1, updated_at = NOW() WHERE user_id = $2`,
          [t.amount, t.sender_id]
        );
        await client.query(
          `UPDATE wallets SET total_balance = total_balance + $1, available_balance = available_balance + $1, updated_at = NOW() WHERE user_id = $2`,
          [t.amount, t.receiver_id]
        );

        await client.query('COMMIT');
        res.json({ success: true, txn_id: t.txn_id });
      } catch (e) {
        await client.query('ROLLBACK').catch(() => {});
        throw e;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Settlement failed' });
    }
  }
);

export default router;
