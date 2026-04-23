# SyncPay – Offline-First Digital Wallet  
## College Project Documentation

**Tagline:** Pay Now. Sync Later.

---

## 1. Introduction

### 1.1 Project Title
**SyncPay** – An Offline-First Digital Wallet with QR-Based Payments and Central Ledger

### 1.2 Problem Statement
In many areas, internet connectivity is unstable or absent during transactions. Existing UPI/wallet apps often fail when the network is down. Users need a way to:
- Make payments when offline and sync when back online
- Use a simple, secure flow (QR scan, amount, PIN) similar to UPI
- Have a central ledger (server) that remains the source of truth and supports admin (bank manager) operations

### 1.3 Solution Overview
SyncPay is a mobile-first web application (PWA-style) that:
- Allows **online payments** in one scan (receiver QR → amount → UPI PIN → instant server settlement)
- Allows **offline payments** with a two-step QR handshake; transactions are stored locally and **synced automatically** when the device is back online
- Uses a **central server** (PostgreSQL + Node.js) as the ledger; an **admin (bank manager)** can manage users and credit wallets
- Ensures **eventual consistency**: offline transactions are validated and settled on the server after sync

**Technical details** (how OTP works, how backend is connected, CORS/proxy, QR generation, security, offline loading/sync) are in **Section 4A** below.

---

## 2. Objectives

1. **Offline-first design:** Support payments without internet and sync later.
2. **QR-based flow:** Receiver shows Identity QR → Sender scans, enters amount, verifies with PIN → Payment (online: instant; offline: store locally, show Final QR for receiver).
3. **Central ledger:** All balances and transactions are maintained on the server; server is the single source of truth.
4. **Admin role:** Bank manager can view users, add money to any wallet, and set offline limits.
5. **Security:** UPI PIN for payment authorization; optional signature verification for offline sync; no OTP shown on screen (server-side only).
6. **Usability:** Clean, responsive UI with SyncPay branding; mobile-first (360px–440px target).

---

## 3. Technology Stack

### 3.1 Frontend
| Technology    | Purpose |
|---------------|---------|
| **Next.js 14** (App Router) | React framework, SSR/API routes |
| **TypeScript** | Type safety |
| **Tailwind CSS** | Styling, responsive layout |
| **Zustand** | Client-side state (auth, wallet, network) |
| **idb-keyval** | IndexedDB wrapper for offline pending transactions |
| **qrcode.react** | QR code generation |
| **jsQR** | QR code scanning (camera) |

### 3.2 Backend
| Technology    | Purpose |
|---------------|---------|
| **Node.js**   | Runtime |
| **Express**   | REST API server |
| **PostgreSQL**| Main database (users, wallets, transactions) |
| **Redis**     | OTP storage (in-memory fallback in development) |
| **JWT**       | Authentication (jsonwebtoken) |
| **bcryptjs**  | UPI PIN hashing |
| **express-validator** | Request validation |
| **uuid**      | Transaction IDs |

### 3.3 Database (PostgreSQL)
- **users** – name, mobile_number, sync_id, pin_hash, role (user/admin)
- **wallets** – user_id, total_balance, available_balance, offline_limit
- **transactions** – txn_id, sender_id, receiver_id, amount, status, sync_status, signature, device_id
- **devices** – device binding
- **sync_logs** – audit of sync batches
- **notifications** – user notifications
- **fraud_alerts** – admin disputes/fraud

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser / PWA)                      │
│  Next.js + React + Zustand + IndexedDB (pending transactions)    │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────┐│
│  │ Login/Signup │  │ Send/Receive │  │ Offline Pending Queue    ││
│  │ OTP (no UI)  │  │ QR Scan/Pay │  │ → Sync when online       ││
│  └──────────────┘  └──────────────┘  └─────────────────────────┘│
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTPS / REST
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS API ROUTES (Proxy)                     │
│  /api/auth/*, /api/wallet/*, /api/transactions/*, /api/admin/*   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Express, Port 4001)                   │
│  Auth (login, signup, OTP, set-pin) │ Wallet │ Transactions     │
│  Sync (POST /sync-transactions)     │ Admin (credit, users)      │
└─────────────────────────────┬───────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────┐           ┌─────────────────────┐
│     PostgreSQL      │           │   Redis (OTP store)  │
│  Central Ledger    │           │   (dev: in-memory)  │
└─────────────────────┘           └─────────────────────┘
```

**Eventual consistency:** Offline transactions are stored in IndexedDB with status `PENDING_SYNC`. When the device is online, the sync engine sends them to `POST /sync-transactions`. The server validates (balance, signature, timestamp) and updates the ledger; then the client marks them as `SYNCED`.

---

## 4A. Technical Deep Dive (How Everything Works)

### 4A.1 How OTP Works (End-to-End)

**Why OTP is not shown on screen:**  
OTP is a secret that should only be on the server and the user’s phone (SMS). Showing it on the app screen would be a security risk. So the frontend never receives or displays the OTP; the user types what they get via SMS (or in dev, from the backend terminal).

**Backend flow:**

1. **Login (POST /auth/login)**  
   - Frontend sends `{ mobile_number: "9504919122" }`.  
   - Backend checks if the user exists in PostgreSQL. If not → `404 Not registered. Sign up first.`  
   - If exists: a 6-digit OTP is generated with `randomOTP()` (e.g. `Math.floor(100000 + Math.random() * 900000)`).  
   - OTP is stored with `setOTP(normalized_mobile, otp)`.  
   - **Storage:** In production, Redis is used with key `otp:9504919122` and TTL (e.g. 300 seconds). In development, Redis is skipped and an in-memory `Map` is used so the server does not hang; OTP is logged to the terminal only: `[DEV] OTP for 9504919122 -> 123456`.  
   - Response: `{ success: true, message: "OTP sent" }`. No `dev_otp` or OTP value is sent in the response.

2. **Signup (POST /auth/signup)**  
   - Same idea: after creating the user and wallet, an OTP is generated, stored via `setOTP`, and in dev logged to the terminal. Response does not contain the OTP.

3. **Verify OTP (POST /auth/verify-otp)**  
   - Frontend sends `{ mobile_number, otp }` (user types the 6 digits).  
   - Backend gets stored OTP with `getOTP(normalized_mobile)`.  
   - If no stored OTP or it does not match → `400 Invalid or expired OTP`.  
   - If match: OTP is deleted with `deleteOTP(normalized_mobile)` (one-time use).  
   - User is loaded from PostgreSQL (including `role`). JWT is signed (payload: userId, mobile, syncId, role) and returned with user object.  
   - Frontend stores the token and user (e.g. in localStorage/Zustand); if `role === 'admin'` it redirects to `/admin`, else to `/dashboard`.

**OTP storage (backend):**  
- **Production:** Redis `setEx(key, ttl_seconds, otp)`. Key = `otp:<mobile>`.  
- **Development:** In-memory `Map`; same key. A `setTimeout` deletes the key after TTL. Redis is not used in dev to avoid connection delays.

---

### 4A.2 How Frontend Connects to Backend (CORS & Proxy)

**The problem (cross-origin):**  
The frontend runs on `http://localhost:3000` (Next.js) and the backend on `http://localhost:4001` (Express). Browser treats these as different origins. If the frontend called `http://localhost:4001/auth/login` directly, the browser would enforce CORS. Backend would need to send `Access-Control-Allow-Origin` and other CORS headers, and preflight (OPTIONS) requests can complicate things.

**The solution: Next.js API routes as proxy**  
- The frontend **never** calls the backend URL directly from the browser.  
- It only calls **same-origin** URLs: `/api/auth/login`, `/api/auth/verify-otp`, `/api/wallet`, `/api/transactions/send`, `/api/sync`, etc.  
- Each of these is a **Next.js API route** (e.g. `frontend/src/app/api/auth/login/route.ts`).  
- Inside the route, the **server** (Next.js) does `fetch('http://localhost:4001/auth/login', { method: 'POST', body, headers })`.  
- Server-to-server requests are not subject to CORS. Next then returns the backend response to the browser.  
- So the browser only talks to the same origin (Next.js); CORS with the backend is avoided and timeouts can be handled in one place (e.g. 10s abort).

**Backend CORS (for direct hits / optional):**  
Express uses `cors({ origin: true, credentials: true })` so that if someone did call the backend directly (e.g. Postman or another frontend), the server would still allow it. For our app, the main path is via the Next proxy.

**Summary:**  
- Frontend → `/api/*` (same origin).  
- Next.js API route → `BACKEND` (e.g. `http://localhost:4001`) → Backend responds → Next forwards response to frontend.  
- No cross-origin request from browser to backend; no CORS issue for the main flow.

---

### 4A.3 How QR Codes Are Generated and Used

**Library:** `qrcode.react` – component `QRCodeSVG` with `value` (string to encode) and `size`, `level` (error correction).

**1. Receiver Identity QR (Receive screen)**  
- **Payload (JSON string):**  
  `{ receiver_id, wallet_id, device_id, session_id, timestamp }`  
  - `receiver_id` = user’s UUID from backend.  
  - `wallet_id` = same or user id.  
  - `device_id` = e.g. `"web"`.  
  - `session_id` = e.g. `"SES-" + Date.now()`.  
  - `timestamp` = `Date.now()`.  
- This QR does **not** contain amount; the sender scans it, then enters the amount.

**2. Sender Final QR (Offline payment – Show QR to receiver)**  
- After the user confirms an **offline** payment, a transaction is saved in IndexedDB and the “Final QR” is shown.  
- **Payload (JSON string):**  
  `{ txn_id, sender_id, receiver_id, amount, timestamp, signature, device_id }`  
  - `txn_id` = UUID generated on client.  
  - `sender_id`, `receiver_id` = user UUIDs.  
  - `amount` = in paise (number).  
  - `timestamp` = `Date.now()`.  
  - `signature` = SHA-256 hash of the payload string (see Security), 64-char hex.  
  - `device_id` = e.g. `"web"`.  
- Receiver can scan this QR to confirm the payment; when the sender is back online, the same transaction is synced to the server.

**Generation:**  
- `value={JSON.stringify(payload)}` passed to `<QRCodeSVG value={...} size={240} level="M" />`.  
- The other side **decodes** the QR to get the JSON and uses `receiver_id` or `txn_id`, etc., for validation and API calls.

---

### 4A.4 How Security Is Implemented

- **OTP:** Only on server (Redis or in-memory); never sent to frontend; never shown on UI. User enters what they receive (SMS / dev terminal).

- **UPI PIN:**  
  - Set/change: `POST /auth/set-pin` with `{ pin: "123456" }`. Backend hashes with **bcrypt** (e.g. 10 rounds) and stores in `users.pin_hash`.  
  - Payment (online): Frontend sends `pin` in `POST /transactions/send-transaction`. Backend loads `pin_hash`, does `bcrypt.compare(pin, pin_hash)`. If wrong → 401 Invalid UPI PIN. PIN is never stored in frontend.

- **JWT:**  
  - After OTP verify, backend returns a JWT signed with a secret (e.g. `config.jwt.secret`). Payload: `userId`, `mobile`, `syncId`, `role`.  
  - Frontend sends `Authorization: Bearer <token>` on every protected request. Backend middleware decodes and attaches `req.user`; admin routes also check `role === 'admin'`.

- **Offline transaction signature:**  
  - Before saving an offline payment, the client builds a payload string:  
    `txn_id|sender_id|receiver_id|amount|timestamp|device_id`  
    (same order as backend `payloadForSignature`).  
  - Client hashes this string with **SHA-256** (Web Crypto `crypto.subtle.digest`), then encodes as 64-char hex. That hex is stored as `signature` in IndexedDB and in the Final QR.  
  - On sync, backend rebuilds the same string, hashes it, and verifies signature format/length; it can also check timestamp to reject old transactions.

- **HTTPS:** In production, frontend and backend should be served over HTTPS so tokens and PIN are not sent in clear text.

---

### 4A.5 How Offline Data Is Loaded and Synced

**Where offline data lives:**  
- **IndexedDB** (browser), via the library **idb-keyval**.  
- Database name: `syncpay-offline`.  
- Store name: `pending_transactions`.  
- Key: `txn_id` (UUID). Value: object `{ txn_id, sender_id, receiver_id, amount, timestamp, signature, device_id, sync_status, note? }`.  
- Only rows with `sync_status === 'PENDING_SYNC'` are considered “pending”.

**When does data go offline (write)?**  
- When the user does **Confirm & Send** while **offline**:  
  - Frontend generates `txn_id`, builds payload string, computes SHA-256 signature.  
  - Calls `savePendingTxns([{ ...txn, sync_status: 'PENDING_SYNC' }])` which does `idb-keyval` `set(txn_id, txn)` for each.  
  - User is then shown the Final QR screen. No server call is made until later.

**When does offline data load (read)?**  
- **Dashboard:** To show “Offline limit remaining”, we need the sum of pending amounts for the current user (as sender). So we call `getPendingAmountBySender(userId)` which uses `getPendingTxns()`, filters by `sender_id === userId`, and sums `amount`.  
- **Sync:** When the app comes online, we need to send all pending transactions to the server. So we call `getPendingTxns()` (same store, filter by `PENDING_SYNC`), then `POST /api/sync` with `{ transactions: [...] }`.  
- **Show QR screen:** After saving one pending txn, we pass `txn_id` (e.g. via sessionStorage). The QR page calls `getPendingTxn(txnId)` to load that single transaction and display the Final QR.

**When does sync run?**  
- **SyncProvider** (in `layout.tsx`) runs once on mount: `initSyncOnOnline()`.  
- This adds a listener: `window.addEventListener('online', handler)`.  
- When the browser fires the `online` event (network back), `handler` calls `syncPendingTransactions()`.  
- That function: gets token from localStorage, `getPendingTxns()`, then `fetch('/api/sync', { method: 'POST', body: JSON.stringify({ transactions }) })`.  
- Next.js API route `/api/sync` forwards to backend `POST /sync-transactions`.  
- Backend validates each transaction (ownership, duplicate, timestamp, signature, balance), updates PostgreSQL and wallets, returns `{ results: { synced: [...], failed: [...] } }`.  
- Frontend then calls `markTxnSynced(txn_id)` or `markTxnFailed(txn_id)` for each result, updating IndexedDB so those entries are no longer treated as pending.

**Summary:**  
- Offline: write to IndexedDB on offline payment; read from IndexedDB for dashboard “remaining” and for sync.  
- Online: sync runs automatically on `online` event; pending list is sent to backend; backend updates ledger; client updates local `sync_status` so data stays consistent.

---

## 5. Features in Detail

### 5.1 User Features
- **Signup / Login:** Mobile number (10 digits); OTP sent to server (dev: OTP in backend terminal only, not shown on screen).
- **UPI PIN:** Set/change in Settings; required at payment time (online: verified by server; offline: used for local authorization).
- **Dashboard:** Total balance, offline spendable (min(balance, offline_limit)), offline limit remaining (considering pending sync sum).
- **Send payment (online):** Scan receiver QR → Enter amount → Enter UPI PIN → Confirm → Server deducts from sender and credits receiver instantly (one scan).
- **Send payment (offline):** Same flow; transaction is saved in IndexedDB; user is shown Final QR for receiver; when online, sync runs and server settles.
- **Receive:** Show Identity QR; scan sender’s Final QR (in offline flow).
- **Add Money:** Screen explains that only the bank manager (admin) can add money via the central ledger (no UPI/bank link in app).
- **History, Notifications, Sync Now, Settings, Security, Help, About:** As per design.

### 5.2 Admin (Bank Manager) Features
- **Login:** Dedicated admin mobile number (e.g. 9504919122); after OTP, redirect to Admin Dashboard.
- **Admin Dashboard:** List all users with balance; form to **add money** to any user’s wallet (amount in ₹, optional offline limit in ₹).
- **Central ledger:** All balances and transactions are on the server; admin credits reflect immediately in user wallets.

### 5.3 Security
- OTP only on server; not displayed on UI.
- UPI PIN hashed with bcrypt; verified on server for online payments.
- Offline transactions include payload signature (e.g. SHA-256 of payload) for sync-time verification.
- JWT for session; role-based access (admin vs user).
- New users start with zero balance; only admin can credit.

---

## 6. Flow Summary

| Scenario        | Steps |
|----------------|-------|
| **Online pay** | Scan receiver QR → Amount → UPI PIN → Confirm → Server updates ledger → Success. |
| **Offline pay**| Scan receiver QR → Amount → UPI PIN → Confirm → Save in IndexedDB → Show Final QR → When online, sync engine sends to server → Server settles. |
| **Admin credit**| Admin login → Admin Dashboard → Select user → Enter amount (and optional offline limit) → Credit wallet → Ledger updated. |

---

## 7. Screens / Modules

1. Splash – Logo, loading  
2. Onboarding – 3 slides (Pay Offline, Instant QR, Secure Sync)  
3. Login – 10-digit mobile  
4. Signup – Name, 10-digit mobile  
5. OTP – 6-digit code (no OTP shown on screen)  
6. Dashboard – Balance cards, Send/Receive, Quick actions, Recent transactions  
7. Send – Scan receiver QR, amount, note → Confirm  
8. Confirm – Summary, UPI PIN, Confirm & Send (online or offline)  
9. Show QR (offline) – Final QR for receiver  
10. Payment Success  
11. Receive – Identity QR  
12. History – Transactions  
13. Notifications – List from server  
14. Sync – Pending count, Sync Now  
15. Add Money – Message (admin adds via ledger)  
16. Settings – Profile, Set/Change UPI PIN, Security, Help, About  
17. Security Center  
18. Help & Support  
19. About  
20. Admin Dashboard – Users list, Credit wallet form  

---

## 8. How to Run the Project

### 8.1 Prerequisites
- Node.js (v18+)
- PostgreSQL (database: `syncpay`)
- (Optional) Redis for OTP in production

### 8.2 Backend
```bash
cd backend
cp .env.example .env   # set PORT=4001, DATABASE_URL, JWT_SECRET
npm install
npm run db:init        # create tables
npm run db:seed        # seed admin user (e.g. 9504919122)
npm run dev
```
OTP in development is logged in the terminal (e.g. `[DEV] OTP for 9504919122 -> XXXXXX`).

### 8.3 Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000`. Use `NEXT_PUBLIC_API_URL=http://localhost:4001` if backend is on 4001.

### 8.4 Admin Login
- Mobile: **9504919122** (or as per seed)
- OTP: from backend terminal
- After verify → Admin Dashboard; from there add money to any user wallet.

---

## 9. References

1. **Offline-first architecture**  
   - “Offline First” – offlinefirst.org  
   - PWA and Service Workers (MDN)

2. **Digital payments / UPI**  
   - NPCI UPI product overview and flow (public docs)  
   - “Digital Payment Systems” – security and ledger concepts

3. **Web technologies**  
   - Next.js Documentation – https://nextjs.org/docs  
   - React Documentation – https://react.dev  
   - Express.js – https://expressjs.com  
   - PostgreSQL – https://www.postgresql.org/docs

4. **Security**  
   - OWASP guidelines for web applications  
   - JWT (RFC 7519) for stateless authentication  
   - bcrypt for password/PIN hashing

5. **QR codes**  
   - QR code generation and scanning in web (e.g. qrcode.react, jsQR)

6. **State and storage**  
   - Zustand – https://github.com/pmndrs/zustand  
   - IndexedDB – MDN Web API documentation

*(Note: Replace or add specific book titles, papers, or URLs as required by your college format.)*

---

## 10. Conclusion

SyncPay demonstrates an **offline-first digital wallet** with:
- **Dual mode:** Online (instant one-scan payment) and offline (store-and-sync with two-step QR).
- **Central ledger** on PostgreSQL with Express backend and a clear **admin (bank manager)** role for user and wallet management.
- **Modern stack:** Next.js, TypeScript, Tailwind, Zustand, IndexedDB, Express, PostgreSQL, JWT, and UPI PIN.
- **Security-conscious design:** OTP on server only, UPI PIN for payments, optional signature for offline sync.

The project is suitable as a college-level full-stack and mobile-first application with real-world relevance to fintech and payment systems.

---

**Document version:** 1.0  
**Project:** SyncPay – Offline-First Digital Wallet  
**Use:** College project documentation; can be converted to PDF using Word, Google Docs, or any Markdown-to-PDF tool.

---

## 11. Viva Quick Answers (Exam Ready)

1. **Is this MERN stack?**  
   No. MERN uses MongoDB. SyncPay uses PostgreSQL, so it is closer to PERN-style backend with Next.js frontend.

2. **Main stack used?**  
   Next.js + React + TypeScript + Tailwind + Zustand (frontend), Express + PostgreSQL + Redis + JWT + bcrypt (backend), IndexedDB for offline queue.

3. **Why offline-first?**  
   To allow transaction capture even without internet and settle later when connectivity returns.

4. **How does security work?**  
   OTP server-side only, UPI PIN hashed via bcrypt, JWT auth, transaction ID uniqueness, validation during sync.

5. **Where is source of truth?**  
   PostgreSQL central ledger in backend.

## 12. Free Hosting Plan (with custom domain)

- Frontend: Vercel Free
- Backend: Render Free (or Railway/Fly)
- PostgreSQL: Neon Free / Supabase Free
- Redis: Upstash Free (optional)

Deployment flow:
1. Push repo to GitHub.
2. Deploy backend and set env vars (`DATABASE_URL`, `JWT_SECRET`, etc.).
3. Deploy frontend on Vercel with `NEXT_PUBLIC_API_URL` pointing to backend URL.
4. Add custom domain in Vercel project settings and update DNS records.
5. (Optional) map backend to `api.<domain>`.

---

## 13. Twilio OTP Integration (Latest Update)

### 13.1 What changed
- OTP SMS is now sent through **Twilio** from backend.
- Login and signup SMS are customized:
  - **Signup:** `Welcome to SyncPay, <FirstName>! OTP: XXXXXX ...`
  - **Login:** `Welcome back to SyncPay, <FirstName>! OTP: XXXXXX ...`
- OTP is still verified through `POST /auth/verify-otp` and then JWT is issued.

### 13.2 Required Environment Variables (Backend)
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_FROM_NUMBER=+12602613489
OTP_SMS_COUNTRY_CODE=91
```

### 13.3 Notes for viva
- The Twilio HTTP URL is not manually called in frontend.
- Backend uses Twilio SDK service (`sendOtpSms`) internally.
- On trial account, Twilio adds prefix: `Sent from your Twilio trial account - ...`.
- Normal SMS does not show logo/image (logo possible via MMS/WhatsApp templates).

---

## 14. Second Presentation Plan (Demo Script)

### 14.1 What to show in 8–12 minutes
1. **Problem + objective (1 min)**  
   - Unstable internet problem and why offline-first wallet is needed.
2. **Login + OTP authentication (2 min)**  
   - Enter mobile -> OTP SMS received -> verify OTP -> JWT session.
3. **Dashboard walkthrough (2 min)**  
   - Total balance, offline spendable, offline limit remaining, quick actions.
4. **Sync ID generation (1 min)**  
   - During signup, backend creates `sync_id = <mobile>@syncpay`.
5. **Offline transaction + sync concept (2–3 min)**  
   - Show pending transaction in Sync Center and explain central ledger settlement.
6. **Admin role (1 min)**  
   - Admin credits wallet in central ledger.

### 14.2 Exact lines to explain
- "Authentication is OTP-based; OTP is generated server-side and stored with TTL."
- "After OTP verification, backend issues JWT containing `userId`, `syncId`, and role."
- "`sync_id` is auto-generated in signup and acts as user payment identity."
- "Central ledger in PostgreSQL is the source of truth; offline entries are eventually synced."

---

## 15. Team Roles (For Viva)

### 15.1 Member-wise responsibility split
- **Avinash (Lead Integrator / Full Stack):**
  - End-to-end integration, offline sync logic fixes, Twilio OTP integration, deployment preparation.
- **Shubhi (UI/UX + Frontend Flows):**
  - Screen design consistency, dashboard/receive/send UX refinement, presentation-ready user journey.
- **Abhinay (Backend + Database):**
  - API validation, wallet/transaction ledger logic, PostgreSQL schema and route stability.
- **Aviral (Testing + Documentation + DevOps support):**
  - Test scenarios (online/offline/sync), bug reproduction notes, report/guide maintenance, hosting checklist support.

### 15.2 If examiner asks "teamwork kaise kiya?"
- We split by modules (frontend/backend/testing/docs) and merged via feature-based integration.
- Shared API contracts were used to avoid merge conflicts.
- Final integration and regression test were done jointly before demo.
