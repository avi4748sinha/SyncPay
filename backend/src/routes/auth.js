import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { setOTP, getOTP, deleteOTP } from '../db/redis.js';
import { config } from '../config/index.js';
import { requireAuth } from '../middleware/auth.js';
import { sendOtpSms } from '../services/sms.js';

const router = Router();

function randomOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// POST /auth/login - only for registered users; send OTP
router.post(
  '/login',
  [
    body('mobile_number').trim().notEmpty().withMessage('Mobile required'),
    body('mobile_number').matches(/^[0-9]{10}$/).withMessage('Valid 10-digit mobile required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      const { mobile_number } = req.body;
      const normalized = mobile_number.replace(/\D/g, '').slice(-10);

      const user = await pool.query(
        'SELECT id, name, mobile_number, sync_id FROM users WHERE mobile_number = $1',
        [normalized]
      );

      if (user.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Not registered. Sign up first.',
          code: 'NOT_REGISTERED',
        });
      }

      const otp = randomOTP();
      await setOTP(normalized, otp);

      const smsOk = await sendOtpSms(normalized, otp, {
        type: 'login',
        name: user.rows[0].name,
      });
      if (!smsOk && config.nodeEnv !== 'development') {
        return res.status(500).json({ success: false, message: 'Failed to send OTP SMS' });
      }

      if (config.nodeEnv === 'development') {
        console.log('[DEV] OTP for', normalized, '->', otp, '(see server terminal only)');
      }
      res.json({ success: true, message: 'OTP sent' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Login failed' });
    }
  }
);

// POST /auth/signup - new user: name + mobile, send OTP
router.post(
  '/signup',
  [
    body('name').trim().notEmpty().withMessage('Name required'),
    body('mobile_number').trim().notEmpty().withMessage('Mobile required'),
    body('mobile_number').matches(/^[0-9]{10}$/).withMessage('Valid 10-digit mobile required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      const { name, mobile_number } = req.body;
      const normalized = mobile_number.replace(/\D/g, '').slice(-10);

      const existing = await pool.query('SELECT id FROM users WHERE mobile_number = $1', [normalized]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Mobile already registered. Use Login.' });
      }

      const syncId = `${normalized}@syncpay`;
      await pool.query(
        'INSERT INTO users (name, mobile_number, sync_id) VALUES ($1, $2, $3)',
        [name.trim(), normalized, syncId]
      );
      await pool.query(
        `INSERT INTO wallets (user_id, total_balance, offline_reserved, available_balance, offline_limit)
         SELECT id, 0, 0, 0, 0 FROM users WHERE mobile_number = $1`,
        [normalized]
      );

      const otp = randomOTP();
      await setOTP(normalized, otp);

      const smsOk = await sendOtpSms(normalized, otp, {
        type: 'signup',
        name,
      });
      if (!smsOk && config.nodeEnv !== 'development') {
        return res.status(500).json({ success: false, message: 'Failed to send OTP SMS' });
      }

      if (config.nodeEnv === 'development') {
        console.log('[DEV] OTP for', normalized, '->', otp, '(see server terminal only)');
      }
      res.json({ success: true, message: 'OTP sent' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Signup failed' });
    }
  }
);

// POST /auth/verify-otp - verify OTP and return JWT
router.post(
  '/verify-otp',
  [
    body('mobile_number').trim().notEmpty(),
    body('otp').trim().isLength({ min: 6, max: 6 }).withMessage('6-digit OTP required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      const { mobile_number, otp } = req.body;
      const normalized = mobile_number.replace(/\D/g, '').slice(-10);

      const stored = await getOTP(normalized);
      if (!stored || stored !== String(otp)) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }

      const user = await pool.query(
        'SELECT id, name, mobile_number, sync_id, role FROM users WHERE mobile_number = $1',
        [normalized]
      );

      if (user.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found. Sign up first.' });
      }

      await deleteOTP(normalized);

      const role = user.rows[0].role || 'user';
      const payload = {
        userId: user.rows[0].id,
        mobile: user.rows[0].mobile_number,
        syncId: user.rows[0].sync_id,
        role,
      };
      const token = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expire });

      res.json({
        success: true,
        token,
        user: {
          id: user.rows[0].id,
          name: user.rows[0].name,
          mobile_number: user.rows[0].mobile_number,
          sync_id: user.rows[0].sync_id,
          role,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Verification failed' });
    }
  }
);

// GET /auth/me (optional - for session check)
router.get('/me', requireAuth, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT id, name, mobile_number, sync_id, created_at, pin_hash, role FROM users WHERE id = $1',
      [req.user.userId]
    );
    if (r.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const row = r.rows[0];
    const { pin_hash, ...rest } = row;
    res.json({ success: true, user: { ...rest, pin_set: !!pin_hash }, pin_set: !!pin_hash });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
});

// POST /auth/set-pin - set or change UPI PIN (6 digits)
router.post(
  '/set-pin',
  requireAuth,
  [
    body('pin').trim().isLength({ min: 6, max: 6 }).withMessage('6-digit PIN required'),
    body('pin').matches(/^[0-9]{6}$/).withMessage('PIN must be 6 digits'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      const userId = req.user.userId;
      const hashed = await bcrypt.hash(req.body.pin, 10);
      await pool.query('UPDATE users SET pin_hash = $1, updated_at = NOW() WHERE id = $2', [hashed, userId]);
      res.json({ success: true, message: 'PIN set successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Failed to set PIN' });
    }
  }
);

export default router;
