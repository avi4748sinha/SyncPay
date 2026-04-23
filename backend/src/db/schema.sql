-- SyncPay Central Ledger Schema
-- Run this to create tables

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  mobile_number VARCHAR(20) UNIQUE NOT NULL,
  sync_id VARCHAR(100) UNIQUE NOT NULL,
  pin_hash VARCHAR(255),
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallets (1:1 with user)
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_balance BIGINT NOT NULL DEFAULT 0,
  offline_reserved BIGINT NOT NULL DEFAULT 0,
  available_balance BIGINT NOT NULL DEFAULT 0,
  offline_limit BIGINT NOT NULL DEFAULT 500000,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions
CREATE TYPE txn_status AS ENUM ('PENDING', 'SYNCED', 'FAILED');
CREATE TYPE sync_status AS ENUM ('PENDING_SYNC', 'SYNCED', 'FAILED');

CREATE TABLE IF NOT EXISTS transactions (
  txn_id UUID PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES users(id),
  receiver_id UUID NOT NULL REFERENCES users(id),
  amount BIGINT NOT NULL CHECK (amount > 0),
  status txn_status NOT NULL DEFAULT 'PENDING',
  sync_status sync_status NOT NULL DEFAULT 'PENDING_SYNC',
  signature TEXT,
  device_id VARCHAR(255),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  CONSTRAINT no_self_transfer CHECK (sender_id != receiver_id)
);

COMMENT ON COLUMN transactions.status IS 'PENDING | SYNCED | FAILED';
COMMENT ON COLUMN transactions.sync_status IS 'PENDING_SYNC | SYNCED | FAILED';

CREATE INDEX idx_txn_sender ON transactions(sender_id);
CREATE INDEX idx_txn_receiver ON transactions(receiver_id);
CREATE INDEX idx_txn_created ON transactions(created_at);
CREATE INDEX idx_txn_sync_status ON transactions(sync_status);

-- Devices (device binding)
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id VARCHAR(255) NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_name VARCHAR(255),
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(device_id, user_id)
);

CREATE INDEX idx_devices_user ON devices(user_id);

-- SyncLogs (audit of sync batches)
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  txn_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL,
  details JSONB
);

CREATE INDEX idx_sync_logs_user ON sync_logs(user_id);

-- Fraud / disputes (admin)
CREATE TABLE IF NOT EXISTS fraud_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  txn_id UUID REFERENCES transactions(txn_id),
  user_id UUID REFERENCES users(id),
  reason VARCHAR(255),
  severity VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_fraud_alerts_resolved ON fraud_alerts(resolved);

-- Notifications (for user feed)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  body TEXT,
  txn_id UUID REFERENCES transactions(txn_id),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);

-- Support tickets (for help & support)
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mobile_number VARCHAR(20) NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update wallet available_balance trigger
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE wallets SET
    total_balance = total_balance - NEW.amount,
    offline_reserved = GREATEST(0, offline_reserved - NEW.amount),
    available_balance = total_balance - offline_reserved,
    updated_at = NOW()
  WHERE user_id = NEW.sender_id;

  UPDATE wallets SET
    total_balance = total_balance + NEW.amount,
    available_balance = total_balance - offline_reserved,
    updated_at = NOW()
  WHERE user_id = NEW.receiver_id;

  UPDATE transactions SET synced_at = NOW(), sync_status = 'SYNCED', status = 'SYNCED' WHERE txn_id = NEW.txn_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger only when we insert a settled transaction (e.g. from sync)
-- In app we'll update ledger via service, not trigger; trigger is optional for sync flow.
