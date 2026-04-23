import { pool } from './pool.js';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

async function seed() {
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'`).catch(() => {});

  const pinHash = await bcrypt.hash('123456', 10);

  // Final admin: 9504919122 – Avinash Sinha (create or update to admin)
  const adminId = randomUUID();
  await pool.query(
    `INSERT INTO users (id, name, mobile_number, sync_id, pin_hash, role) VALUES ($1, $2, $3, $4, $5, 'admin')
     ON CONFLICT (mobile_number) DO UPDATE SET name = $2, role = 'admin', pin_hash = COALESCE(users.pin_hash, $5)`,
    [adminId, 'Avinash Sinha', '9504919122', '9504919122@syncpay', pinHash]
  );
  await pool.query(
    `INSERT INTO wallets (user_id, total_balance, offline_reserved, available_balance, offline_limit)
     SELECT id, 0, 0, 0, 0 FROM users WHERE mobile_number = '9504919122'
     ON CONFLICT (user_id) DO NOTHING`
  );

  // Demo users (optional)
  const id2 = randomUUID();
  const id3 = randomUUID();
  await pool.query(
    `INSERT INTO users (id, name, mobile_number, sync_id, pin_hash) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (mobile_number) DO NOTHING`,
    [id2, 'Priya Kumar', '9123456789', 'priya@syncpay', pinHash]
  );
  await pool.query(
    `INSERT INTO users (id, name, mobile_number, sync_id, pin_hash) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (mobile_number) DO NOTHING`,
    [id3, 'Rahul Sharma', '9876543210', 'rahul@syncpay', pinHash]
  );
  await pool.query(`UPDATE users SET role = 'user' WHERE mobile_number = '9876543210'`);

  await pool.query(
    `INSERT INTO wallets (user_id, total_balance, offline_reserved, available_balance, offline_limit)
     SELECT id, 500000, 0, 500000, 500000 FROM users WHERE mobile_number = '9123456789'
     ON CONFLICT (user_id) DO UPDATE SET total_balance = 500000, available_balance = 500000`
  );
  await pool.query(
    `INSERT INTO wallets (user_id, total_balance, offline_reserved, available_balance, offline_limit)
     SELECT id, 500000, 0, 500000, 500000 FROM users WHERE mobile_number = '9876543210'
     ON CONFLICT (user_id) DO UPDATE SET total_balance = 500000, available_balance = 500000`
  );

  console.log('Seed done. Admin: 9504919122 (Avinash Sinha). Login with 9504919122 -> Admin dashboard.');
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
