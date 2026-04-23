# SyncPay Backend

Central ledger API for SyncPay offline-first wallet. Validates and settles transactions when devices sync.

## Tech

- **Node.js** + **Express**
- **PostgreSQL** – users, wallets, transactions, devices, sync_logs
- **Redis** – OTP storage (TTL)
- **JWT** – auth

## Setup

1. **Env**

   ```bash
   cp .env.example .env
   # Set DATABASE_URL, REDIS_URL, JWT_SECRET (+ Twilio vars for OTP SMS)
   ```

2. **DB**

   ```bash
   # Create DB: createdb syncpay
   npm run db:init
   npm run db:seed   # optional demo users
   ```

3. **Run**

   ```bash
   npm install
   npm run dev
   ```

   API: `http://localhost:4000`

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Send OTP (body: `mobile_number`) |
| POST | `/auth/signup` | Register user + send OTP (body: `name`, `mobile_number`) |
| POST | `/auth/verify-otp` | Verify OTP, get JWT (body: `mobile_number`, `otp`) |
| GET | `/auth/me` | Current user (Bearer token) |
| GET | `/wallet` | Wallet balance (Bearer) |
| GET | `/transactions` | List transactions (Bearer) |
| POST | `/transactions/send-transaction` | Online send (Bearer) |
| POST | `/sync-transactions` | Sync pending offline txns (Bearer, body: `transactions[]`) |
| GET | `/notifications` | Notifications (Bearer) |
| GET | `/security/status` | Security status (Bearer) |
| GET | `/admin/users` | Admin: users |
| GET | `/admin/transactions` | Admin: transactions |
| GET | `/admin/pending-syncs` | Admin: pending syncs |
| GET | `/admin/fraud-alerts` | Admin: fraud alerts |
| POST | `/admin/reverse-transaction` | Admin: reverse (body: `txn_id`) |

## Sync flow

1. Client sends `POST /sync-transactions` with array of pending transactions (each: `txn_id`, `sender_id`, `receiver_id`, `amount`, `timestamp`, `signature`, `device_id`).
2. Server checks: uniqueness, timestamp window, signature (optional), receiver exists, sender balance.
3. If valid: insert transaction, update sender/receiver wallets, set `sync_status = SYNCED`.
4. If invalid: respond with `failed[]` and reason; client can mark local txn as FAILED.

## OTP SMS (Twilio)

Twilio integration is server-side. You do **not** paste Twilio `curl` API URL anywhere in app code.
The backend `sendOtpSms()` service calls Twilio SDK internally.

### Required env vars

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_FROM_NUMBER=+12602613489
OTP_SMS_COUNTRY_CODE=91
```

- `OTP_SMS_COUNTRY_CODE=91` assumes app stores 10-digit Indian mobile numbers.
- SMS destination is built as `+<country_code><10_digit_mobile>`.
- On Twilio trial accounts, SMS starts with `Sent from your Twilio trial account - ...`.

### Message behavior

- `/auth/signup`: `Welcome to SyncPay, <FirstName>! OTP: XXXXXX ...`
- `/auth/login`: `Welcome back to SyncPay, <FirstName>! OTP: XXXXXX ...`

### Important notes

- Normal SMS does not support logo/image rendering. For logo in message, use MMS/WhatsApp template flow.
- Keep `TWILIO_AUTH_TOKEN` private; never commit secrets to GitHub.
- If Twilio send fails in production, API returns `Failed to send OTP SMS`.

## Security

- **Ed25519**: Client signs payload; server can verify when user public key is stored.
- **Timestamp**: Offline sync accepts older transactions (default max age: 7 days, configurable with `TXN_MAX_AGE_SECONDS`).
- **Double spend**: Enforced by wallet `available_balance` and offline limits on client.
