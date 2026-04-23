import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

// GET /admin/stats - dashboard counts
router.get('/stats', async (req, res) => {
  try {
    const users = await pool.query('SELECT COUNT(*) AS c FROM users');
    const txns = await pool.query('SELECT COUNT(*) AS c FROM transactions');
    const pending = await pool.query(`SELECT COUNT(*) AS c FROM transactions WHERE sync_status = 'PENDING_SYNC'`);
    res.json({
      success: true,
      totalUsers: parseInt(users.rows[0]?.c || '0', 10),
      totalTransactions: parseInt(txns.rows[0]?.c || '0', 10),
      pendingSyncCount: parseInt(pending.rows[0]?.c || '0', 10),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

// POST /admin/credit-wallet - add money to user wallet (bank manager); optional offline_limit in rupees
router.post('/credit-wallet', async (req, res) => {
  try {
    const { user_id, amount, offline_limit } = req.body;
    if (!user_id || amount == null || amount < 0) {
      return res.status(400).json({ success: false, message: 'user_id and amount (>= 0) required' });
    }
    const amt = Math.floor(Number(amount) * 100); // amount in paise
    if (amt <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }
    const user = await pool.query('SELECT id FROM users WHERE id = $1', [user_id]);
    if (user.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    await pool.query(
      `UPDATE wallets SET total_balance = total_balance + $1, available_balance = available_balance + $1, updated_at = NOW() WHERE user_id = $2`,
      [amt, user_id]
    );
    if (offline_limit != null && Number(offline_limit) >= 0) {
      const limitPaise = Math.floor(Number(offline_limit) * 100);
      await pool.query(
        `UPDATE wallets SET offline_limit = $1, updated_at = NOW() WHERE user_id = $2`,
        [limitPaise, user_id]
      );
    }
    res.json({ success: true, message: 'Wallet credited', amount: amt / 100 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Credit failed' });
  }
});

// GET /admin/users - unique by user id (mobile_number is unique in DB)
router.get('/users', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT u.id, u.name, u.mobile_number, u.sync_id, u.role, u.created_at,
              w.total_balance, w.offline_limit
       FROM users u LEFT JOIN wallets w ON w.user_id = u.id
       ORDER BY u.mobile_number ASC LIMIT 500`
    );
    res.json({ success: true, users: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// GET /admin/users/:id - single user with wallet
router.get('/users/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const r = await pool.query(
      `SELECT u.id, u.name, u.mobile_number, u.sync_id, u.role, u.created_at,
              w.total_balance, w.offline_limit, w.available_balance
       FROM users u
       LEFT JOIN wallets w ON w.user_id = u.id
       WHERE u.id = $1`,
      [id]
    );
    if (r.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user: r.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
});

// DELETE /admin/users/:id - delete user (cannot delete self)
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const adminId = req.user.userId;
    if (userId === adminId) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own admin account' });
    }
    const r = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
    if (r.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
});

// GET /admin/transactions
router.get('/transactions', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const r = await pool.query(
      `SELECT t.txn_id, t.sender_id, t.receiver_id, t.amount, t.status, t.sync_status, t.created_at, t.synced_at,
              sender.name AS sender_name, receiver.name AS receiver_name
       FROM transactions t
       JOIN users sender ON sender.id = t.sender_id
       JOIN users receiver ON receiver.id = t.receiver_id
       ORDER BY t.created_at DESC LIMIT $1`,
      [limit]
    );
    res.json({ success: true, transactions: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
});

// GET /admin/pending-syncs
router.get('/pending-syncs', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT txn_id, sender_id, receiver_id, amount, created_at FROM transactions WHERE sync_status = 'PENDING_SYNC'`
    );
    res.json({ success: true, pending: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch pending syncs' });
  }
});

// GET /admin/fraud-alerts
router.get('/fraud-alerts', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, txn_id, user_id, reason, severity, created_at, resolved FROM fraud_alerts WHERE resolved = false ORDER BY created_at DESC`
    );
    res.json({ success: true, alerts: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch fraud alerts' });
  }
});

// GET /admin/tickets - support tickets (table may not exist yet)
router.get('/tickets', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, user_id, mobile_number, subject, message, status, created_at FROM support_tickets ORDER BY created_at DESC LIMIT 100`
    );
    res.json({ success: true, tickets: r.rows });
  } catch (err) {
    res.json({ success: true, tickets: [] });
  }
});

// POST /admin/reverse-transaction
router.post('/reverse-transaction', async (req, res) => {
  try {
    const { txn_id } = req.body;
    if (!txn_id) {
      return res.status(400).json({ success: false, message: 'txn_id required' });
    }

    const txn = await pool.query(
      'SELECT txn_id, sender_id, receiver_id, amount, status FROM transactions WHERE txn_id = $1',
      [txn_id]
    );
    if (txn.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    const t = txn.rows[0];
    if (t.status !== 'SYNCED') {
      return res.status(400).json({ success: false, message: 'Can only reverse SYNCED transactions' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE wallets SET total_balance = total_balance + $1, available_balance = available_balance + $1, updated_at = NOW() WHERE user_id = $2`,
        [t.amount, t.sender_id]
      );
      await client.query(
        `UPDATE wallets SET total_balance = total_balance - $1, available_balance = available_balance - $1, updated_at = NOW() WHERE user_id = $2`,
        [t.amount, t.receiver_id]
      );
      await client.query(
        `UPDATE transactions SET status = 'FAILED', sync_status = 'FAILED' WHERE txn_id = $1`,
        [txn_id]
      );

      await client.query('COMMIT');
      res.json({ success: true, message: 'Transaction reversed' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Reverse failed' });
  }
});

export default router;
