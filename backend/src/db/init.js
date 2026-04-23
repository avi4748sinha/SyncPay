import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, 'schema.sql');

async function init() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/syncpay';
  const client = new pg.Client({ connectionString });
  try {
    await client.connect();
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(sql);
    console.log('Schema applied successfully.');
  } catch (err) {
    console.error('Init failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

init();
