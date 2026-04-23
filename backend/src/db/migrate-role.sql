-- Add role to users (run once: node -e "require('pg').Client(...).query(require('fs').readFileSync('...','utf8'))" or run in psql)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';
-- Set first user as admin (change id if needed), or run: UPDATE users SET role = 'admin' WHERE mobile_number = '9876543210';
-- UPDATE users SET role = 'admin' WHERE id = (SELECT id FROM users LIMIT 1);
