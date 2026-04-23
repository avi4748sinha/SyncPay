/**
 * One-time migration: add `role` column to users table if missing.
 * Run from backend folder: node src/db/migrate-add-role.js
 */
import 'dotenv/config';
import { pool } from './pool.js';

async function migrate() {
  try {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'
    `);
    console.log('Migration done: users.role column is present.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
