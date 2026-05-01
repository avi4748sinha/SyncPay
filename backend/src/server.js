import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import authRoutes from './routes/auth.js';
import walletRoutes from './routes/wallet.js';
import transactionRoutes from './routes/transactions.js';
import syncRoutes from './routes/sync.js';
import notificationRoutes from './routes/notifications.js';
import securityRoutes from './routes/security.js';
import adminRoutes from './routes/admin.js';
import supportRoutes from './routes/support.js';

const app = express();

// ✅ CORS (allow your frontend)
app.use(cors({ origin: process.env.FRONTEND_URL || true, credentials: true }));

app.use(express.json());

// Health
app.get('/health', (req, res) => res.json({ ok: true, service: 'syncpay-api' }));

// API routes
app.use('/auth', authRoutes);
app.use('/wallet', walletRoutes);
app.use('/transactions', transactionRoutes);
app.use('/sync-transactions', syncRoutes);
app.use('/notifications', notificationRoutes);
app.use('/security', securityRoutes);
app.use('/admin', adminRoutes);
app.use('/support', supportRoutes);

// 404
app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ✅ IMPORTANT FIX (Railway compatible)
const PORT = process.env.PORT || config.port || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SyncPay API running on port ${PORT}`);
});