import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /wallet/user/:id - validate receiver exists (for scan), return name
router.get('/user/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query('SELECT id, name, sync_id FROM users WHERE id = $1', [id]);
    if (r.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user: { id: r.rows[0].id, name: r.rows[0].name, sync_id: r.rows[0].sync_id } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed' });
  }
});

// GET /wallet
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const w = await pool.query(
      `SELECT w.id, w.user_id, w.total_balance, w.offline_reserved, w.available_balance, w.offline_limit, w.updated_at
       FROM wallets w
       WHERE w.user_id = $1`,
      [userId]
    );
    if (w.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }
    const wallet = w.rows[0];
    res.json({
      success: true,
      wallet: {
        id: wallet.id,
        user_id: wallet.user_id,
        total_balance: Number(wallet.total_balance),
        offline_reserved: Number(wallet.offline_reserved),
        available_balance: Number(wallet.available_balance),
        offline_limit: Number(wallet.offline_limit),
        updated_at: wallet.updated_at,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch wallet' });
  }
});

// PATCH /offline-limit — raise offline spending cap (cannot exceed available_balance)
router.patch(
  '/offline-limit',
  requireAuth,
  [body('offline_limit').isInt({ min: 0 }).withMessage('offline_limit must be non-negative int (paise)')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      const userId = req.user.userId;
      const offlineLimit = Number(req.body.offline_limit);

      const w = await pool.query(
        'SELECT available_balance, offline_limit FROM wallets WHERE user_id = $1',
        [userId]
      );
      if (w.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Wallet not found' });
      }
      const available = Number(w.rows[0].available_balance);
      if (offlineLimit > available) {
        return res.status(400).json({
          success: false,
          message: `Offline limit cannot exceed available balance (max ₹${(available / 100).toFixed(2)})`,
        });
      }

      await pool.query(`UPDATE wallets SET offline_limit = $1, updated_at = NOW() WHERE user_id = $2`, [
        offlineLimit,
        userId,
      ]);

      const out = await pool.query(
        `SELECT w.id, w.user_id, w.total_balance, w.offline_reserved, w.available_balance, w.offline_limit, w.updated_at
         FROM wallets w WHERE w.user_id = $1`,
        [userId]
      );
      const wallet = out.rows[0];
      res.json({
        success: true,
        wallet: {
          id: wallet.id,
          user_id: wallet.user_id,
          total_balance: Number(wallet.total_balance),
          offline_reserved: Number(wallet.offline_reserved),
          available_balance: Number(wallet.available_balance),
          offline_limit: Number(wallet.offline_limit),
          updated_at: wallet.updated_at,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Failed to update offline limit' });
    }
  }
);

export default router;
