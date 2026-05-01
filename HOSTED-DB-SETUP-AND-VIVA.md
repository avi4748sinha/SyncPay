# SyncPay Hosted DB Setup And Viva Guide

## 1. Dusre Insaan Ko Kya Karna Hoga

Agar kisi aur laptop par project chalana ho, to easiest setup ye hai:

- GitHub se project clone/pull karo
- Local machine par sirf frontend aur backend run karo
- Database ke liye Render hosted Postgres use karo
- Local Postgres install karna zaroori nahi
- Redis local optional hai, dev mode me OTP fallback chal jata hai

### Simple one-line explanation

`Agar koi insaan GitHub se project leta hai, to wo frontend aur backend apne laptop par locally chalayega, lekin database ke liye Render hosted Postgres use karega.`

### Exact use-case

Is setup me:

- code GitHub se aayega
- frontend local chalega
- backend local chalega
- database Render par hosted rahega
- local Postgres ki need nahi hogi
- same hosted DB use karne par data shared rahega

## 2. Prerequisites

Dusre insaan ke laptop par bas ye chahiye:

- Node.js installed
- Git installed
- Project ka latest code from GitHub

## 3. Backend Env Setup

`backend/.env` file banao aur is format me values daalo:

```env
PORT=4001
NODE_ENV=development
DATABASE_URL=PASTE_RENDER_EXTERNAL_DATABASE_URL_HERE?sslmode=require
REDIS_URL=redis://localhost:6379
JWT_SECRET=allingo-dev-secret
JWT_EXPIRE=7d
OTP_EXPIRE_SECONDS=300
DEFAULT_OFFLINE_LIMIT=500000
OTP_SMS_COUNTRY_CODE=91
ALLOW_LOGGED_OTP=true
ALLOW_OTP_WITHOUT_SMS=true
```

Notes:

- `External Database URL` hi use karna hai
- `sslmode=require` add karna zaroori ho sakta hai
- Twilio required nahi hai for demo mode

## 4. Frontend Env Setup

`frontend/.env.local` file banao:

```env
NEXT_PUBLIC_API_URL=http://localhost:4001
```

## 5. Commands To Run

Backend terminal:

```bash
cd backend
npm install
npm run db:init
npm run db:migrate
npm run db:migrate-tickets
npm run db:seed
npm run dev
```

Frontend terminal:

```bash
cd frontend
npm install
npm run dev
```

Browser me open karo:

```txt
http://localhost:3000
```

## 6. Login Ke Liye Demo User

Use this mobile number:

```txt
9504919122
```

Seed script admin user create karta hai. OTP backend terminal/log me dikh jayega because:

- `ALLOW_LOGGED_OTP=true`
- `ALLOW_OTP_WITHOUT_SMS=true`

## 7. Agar Login Failed Aaye To

### Case 1: `Backend not reachable`

Check:

- backend run ho raha hai ya nahi
- `frontend/.env.local` me `http://localhost:4001` hai ya nahi

### Case 2: `relation "users" does not exist`

Matlab DB schema create nahi hua. Run:

```bash
npm run db:init
npm run db:migrate
npm run db:migrate-tickets
npm run db:seed
```

### Case 3: `ECONNRESET` ya DB timeout

Check:

- Render ka `External Database URL` use ho raha hai ya nahi
- URL me `?sslmode=require` hai ya nahi

### Case 4: `Not registered. Sign up first.`

Matlab seed data nahi gaya. Run:

```bash
npm run db:seed
```

## 8. Hosting Me Humne Kya Kya Changes Kiye

Project ko demo-friendly banane ke liye ye practical changes kiye gaye:

- OTP ko backend logs me dekhne ka support add kiya
- SMS provider fail hone par bhi demo mode me login flow continue karne ka support add kiya
- frontend build issues fix kiye for hosted deployment
- scanner pages me strict TypeScript null-check fixes kiye
- help page ko prerender-safe banaya
- Render backend + hosted database setup test kiya

## 9. Presentation Me Kya Bolna Hai

Short clear explanation:

1. SyncPay ek offline-first wallet prototype hai
2. Frontend Next.js par bana hai
3. Backend Node.js + Express use karta hai
4. Data PostgreSQL me store hota hai
5. OTP ke liye production me SMS provider use ho sakta hai, but demo ke liye backend log based fallback diya gaya
6. App ka focus offline payment flow, sync, security, aur demo usability par hai

## 10. Viva Me Changes Kaise Explain Karne Hain

Bolne ke liye simple lines:

- Humne deployment ke liye backend ko hosting-compatible banaya
- Demo reliability ke liye OTP fallback add kiya
- Hosted database use kiya so har laptop par Postgres install karna zaroori na ho
- Build errors ko fix kiya taaki Next.js production build pass kare
- Local aur hosted dono setup support kiye

## 11. Fallback Plan Presentation Ke Time

Presentation ke din agar issue aaye to ye fallback use karo:

1. Local frontend chalao
2. Local backend chalao
3. Render hosted DB use karo
4. OTP backend terminal se le lo

Aur agar hosting issue aaye to bolo:

- Frontend aur backend separately deployable hain
- Local run mode fully working hai
- Hosted database already integrated hai

## 12. One-Line Explanation For Faculty

`This project is a Next.js plus Node.js offline-first wallet prototype using PostgreSQL, with a demo-safe OTP fallback and hosted database support for easy presentation and testing.`
