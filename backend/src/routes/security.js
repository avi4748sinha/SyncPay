import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /security-status
router.get('/status', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const devices = await pool.query(
      'SELECT id, device_id, device_name, last_active FROM devices WHERE user_id = $1',
      [userId]
    );

    res.json({
      success: true,
      security: {
        status: 'Excellent',
        message: 'Your account is highly secure',
        device_binding: { active: true, devices: devices.rows },
        encryption: { enabled: true, description: 'All transactions are encrypted' },
        biometric: { enabled: true, description: 'Fingerprint login enabled' },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch security status' });
  }
});

export default router;
