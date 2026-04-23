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

app.use(cors({ origin: true, credentials: true }));
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

app.listen(config.port, () => {
  console.log(`SyncPay API running on http://localhost:${config.port}`);
});
