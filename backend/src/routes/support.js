import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All support routes require authenticated user, but not necessarily admin
router.use(requireAuth);

// POST /support/tickets - user raises support ticket
router.post('/tickets', async (req, res) => {
  try {
    const { subject, message } = req.body || {};
    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Subject and message required' });
    }

    // Safety: ensure table exists (in case DB init not rerun)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        mobile_number VARCHAR(20) NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(
      `INSERT INTO support_tickets (user_id, mobile_number, subject, message, status)
       VALUES ($1, $2, $3, $4, 'OPEN')`,
      [req.user.userId, req.user.mobile, subject.trim(), message.trim()]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Support ticket create failed', err?.message || err);
    res.status(500).json({ success: false, message: 'Failed to create ticket' });
  }
});

export default router;

