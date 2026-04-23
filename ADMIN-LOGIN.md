# SyncPay – Admin Login & Wallet Add

## Kon hai Admin?

| Cheez | Value |
|-------|--------|
| **Admin ka mobile** | **9504919122** |
| **Admin ka name** | Avinash Sinha |
| **Kaam** | Users dekhna, kisi bhi user ke wallet me paise add karna (Credit wallet), optional offline limit set karna |

Sirf **9504919122** wala number admin hai. Baaki sab users normal user hain.

---

## Admin credentials (final)

| Field | Value |
|-------|--------|
| **Mobile** | **9504919122** |
| **Name** | Avinash Sinha |
| **OTP (dev)** | Backend terminal me dikhega: `[DEV] OTP for 9504919122 -> XXXXXX` |

---

## Admin login steps

1. **Backend + DB**
   ```bash
   cd backend
   npm run db:seed
   npm run dev
   ```
   Seed se **9504919122** admin ban jata hai (Avinash Sinha). Agar ye number pehle se signup tha to bhi seed run karo – role update ho jayega.

2. **Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Login**
   - **Login** → Mobile: **9504919122** → Continue
   - OTP: backend terminal me jo 6-digit aaye woh daalo → Verify
   - Verify ke baad seedha **Admin dashboard** khulega (user wala dashboard nahi). Wahi pe **Add money to user wallet** form hai.

4. **Refresh / nayi tab:** Ab agar admin page refresh kare ya direct `/admin` open kare, to bhi session restore ho kar admin panel dikhega. Agar kabhi Dashboard open ho to admin ko **Admin Panel** card dikhega ya redirect ho kar `/admin` pe chala jayega.

---

## Wallet me paise add (Admin panel)

1. Admin login → **Admin dashboard** open (ya Dashboard pe "Admin Panel" card → tap).
2. **Add money to user wallet**
   - **Select user** – list me se user choose karo
   - **Amount (₹)** – kitna add karna hai
   - **Offline limit (₹)** – optional
3. **Credit wallet** → us user ke wallet me amount add, ledger update.

---

## Summary

| Role | Mobile | Login ke baad |
|------|--------|----------------|
| **Admin** | **9504919122** (Avinash Sinha) | **Admin dashboard** (users + wallet credit) |
| User | Koi bhi other | Dashboard (apna wallet) |
