# SyncPay – Copy Paste Run

## Step 1: Backend .env (agar .env nahi hai to ye banao)

`backend` folder me `.env` file banao aur andar ye paste karo:

```
PORT=4001
NODE_ENV=development
DATABASE_URL=postgresql://postgres:123456@localhost:5432/syncpay
REDIS_URL=redis://localhost:6379
JWT_SECRET=allingo-dev-secret
JWT_EXPIRE=7d
OTP_EXPIRE_SECONDS=300
DEFAULT_OFFLINE_LIMIT=500000
```

(Password 123456 use ho raha hai – same as last project.)

---

## Step 2: Database banao

PostgreSQL open karo (pgAdmin ya terminal) aur ye run karo:

```sql
CREATE DATABASE syncpay;
```

Ya CMD/PowerShell me (postgres path set ho to):

```
psql -U postgres -c "CREATE DATABASE syncpay;"
```

---

## Step 3: Backend install + schema + run

PowerShell/CMD me:

```bash
cd C:\Users\Avinash\Desktop\SyncPay\backend
npm install
npm run db:init
npm run db:seed
npm run dev
```

Backend chal raha hoga: http://localhost:4000

---

## Step 4: Frontend (naya terminal)

Naya terminal kholo, phir:

```bash
cd C:\Users\Avinash\Desktop\SyncPay\frontend
npm install
npm run dev
```

Frontend: http://localhost:3000

---

## Step 5: Frontend ko backend se jodna (optional)

`frontend` folder me `.env.local` banao, andar ye:

```
NEXT_PUBLIC_API_URL=http://localhost:4001
```

Save karo, phir frontend dubara run karo: `npm run dev`

---

## Login test

1. Browser me jao: http://localhost:3000  
2. Splash → Onboarding → Get Started  
3. Mobile: `9876543210` → Continue  
4. Response me `dev_otp` aayega (network tab ya backend log me); wahi 6 digit OTP daalo  
5. Verify → Dashboard

---

## Ek line me (backend + DB ready ho to)

**Terminal 1 – Backend:**
```bash
cd C:\Users\Avinash\Desktop\SyncPay\backend && npm install && npm run db:init && npm run db:seed && npm run dev
```

**Terminal 2 – Frontend:**
```bash
cd C:\Users\Avinash\Desktop\SyncPay\frontend && npm install && npm run dev
```
