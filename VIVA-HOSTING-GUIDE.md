# SyncPay Viva + Hosting Guide

## 1) Main Stack (What to say in viva)

SyncPay is **NOT MERN**.

- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS, Zustand
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (central ledger)
- **Cache/OTP store:** Redis (or in-memory in dev)
- **Offline storage:** IndexedDB (idb-keyval)
- **QR:** qrcode.react (generate), jsQR (scan)
- **Auth/Security:** JWT, bcrypt (UPI PIN hashing)

Why not MERN?
- MERN = MongoDB + Express + React + Node
- Here DB is **PostgreSQL**, so this is closer to **PERN-like + Next.js** architecture.

## 2) Run Project (Windows, local)

### Backend
```bash
cd C:\Users\Avinash\Desktop\SyncPay\backend
npm install
npm run db:init
npm run db:seed
npm run dev
```
Backend: `http://localhost:4001`

### Frontend
```bash
cd C:\Users\Avinash\Desktop\SyncPay\frontend
npm install
npm run dev
```
Frontend: `http://localhost:3000`

### Frontend env
Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:4001
```

## 3) Viva Questions (Ready answers)

### Q1. What problem does SyncPay solve?
It enables payments even with unstable internet using offline-first flow and later sync to server.

### Q2. How is your project different from normal UPI apps?
Normal UPI usually needs live internet for settlement; SyncPay supports offline capture + online settlement later.

### Q3. Explain online payment flow.
Receiver identity QR -> sender scans -> amount + PIN -> server verifies PIN and settles instantly.

### Q4. Explain offline payment flow.
Sender scans receiver identity QR -> enters amount + PIN -> transaction saved in IndexedDB -> sender shows final QR -> receiver scans -> sender syncs later.

### Q5. Where do balances live finally?
Final source of truth is PostgreSQL ledger on backend.

### Q6. Why IndexedDB?
To safely store pending offline transactions in browser until network is back.

### Q7. How do you secure payment authorization?
UPI PIN is hashed using bcrypt; backend verifies PIN hash for online send.

### Q8. How do you avoid duplicate offline settlement?
Each transaction has unique `txn_id`; backend checks uniqueness before settlement.

### Q9. How is OTP handled securely?
OTP stored server-side (Redis/dev memory), not shown in UI.

### Q10. What is eventual consistency here?
Offline transaction appears pending first; after sync backend settles and both balances become consistent.

### Q11. Why Next.js API routes?
They proxy frontend calls to backend and simplify integration and auth handling.

### Q12. What are current limitations?
Camera permissions/device support variability, offline verification simplifications, and production hardening required.

## 4) Free Hosting (with your domain)

Recommended free combo:
- **Frontend (Next.js):** Vercel Free
- **Backend (Express):** Render Free / Railway trial / Fly.io
- **PostgreSQL:** Neon Free or Supabase Free
- **Redis:** Upstash Free (optional)

### Step-by-step
1. Push code to GitHub.
2. Deploy backend first (Render):
   - Root: `backend`
   - Build: `npm install`
   - Start: `npm start` (or your production command)
   - Add env vars: `DATABASE_URL`, `JWT_SECRET`, `REDIS_URL`, etc.
3. Deploy frontend on Vercel:
   - Root: `frontend`
   - Add env: `NEXT_PUBLIC_API_URL=https://<your-backend-url>`
4. Configure database (Neon/Supabase) and run migrations/seeds.
5. Connect custom domain in Vercel:
   - Vercel Project -> Settings -> Domains -> add your domain
   - In DNS provider, set required A/CNAME records.
6. (Optional) put backend behind API subdomain (e.g., `api.yourdomain.com`).

## 5) PDF Update

You already have:
- `PROJECT-REPORT.md`
- `PROJECT-REPORT.md.pdf`
- `SyncPay Project Documentation.pdf`

For latest updated PDF:
1. Open `PROJECT-REPORT.md` in VS Code/Cursor
2. Export to PDF using markdown preview print OR copy to Google Docs/Word and Save as PDF
3. Keep final file name: `SyncPay Project Documentation.pdf`

---

If viva asks one-line stack intro:
"This is a full-stack offline-first fintech web app using Next.js + Express + PostgreSQL with IndexedDB sync and QR-based payment flows."

## 6) Tomorrow's 2nd Presentation (Ready Script)

### A) Demo sequence (follow this exact order)
1. **Intro (30 sec):** "SyncPay is an offline-first wallet. Pay can be captured offline and settled on central ledger when online."
2. **Signup/Login (2 min):**
   - Enter mobile number
   - OTP arrives via Twilio SMS
   - Verify OTP and login
3. **Authentication explain (1 min):**
   - OTP generated/stored on server with TTL
   - `verify-otp` validates OTP and returns JWT
4. **Dashboard (2 min):**
   - Total wallet balance
   - Offline spendable
   - Offline limit remaining + pending sync info
5. **Sync ID generation (1 min):**
   - During signup backend creates `sync_id = <mobile>@syncpay`
6. **Offline + Sync Center (2 min):**
   - Show pending transactions
   - Click Sync Now
   - Explain eventual consistency and central ledger update
7. **Admin (optional 1 min):**
   - Admin credits user wallet from central ledger

### B) What to say if asked "OTP kaise kaam kar raha?"
- Login/signup API generates 6-digit OTP.
- OTP stored in Redis (dev fallback memory), TTL controlled by env.
- Twilio sends OTP SMS to user mobile.
- On verify, backend matches OTP, deletes it (one-time use), then returns JWT.

### C) What to say if asked "logo SMS me kyu nahi?"
- Normal SMS supports text only.
- Twilio trial also prepends trial notice text.
- Brand/logo can be shown in app UI; SMS logo requires MMS/WhatsApp template approach.

## 7) Team Roles for Viva (4 members)

- **Avinash:** integration lead, sync fixes, Twilio OTP integration, end-to-end demo flow.
- **Shubhi:** testing/documentation/hosting support, report updates, viva prep checklist.
- **Abhinay:** backend API and DB logic, auth/transactions/wallet route reliability.
- **Aviral:** frontend UX/screens, dashboard and send/receive UI polish, user journey.

If examiner asks "individual contribution proof":
- Show git commits or module ownership by folders and feature areas.
- Explain one bug fixed by each member.

## 8) PDF for Tomorrow

Use these two files as final sources for PDF export:
- `PROJECT-REPORT.md` (full report)
- `VIVA-HOSTING-GUIDE.md` (presentation + viva quick answers)

Export steps:
1. Open markdown file in Cursor/VS Code preview.
2. Print / Export as PDF.
3. Save names:
   - `SyncPay-Project-Report-v2.pdf`
   - `SyncPay-2nd-Presentation-Viva-Guide.pdf`
