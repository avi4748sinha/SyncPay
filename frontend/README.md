# SyncPay Frontend

Mobile-first PWA for SyncPay offline-first wallet. Matches Figma design (Deep Navy, Electric Cyan, Teal gradient, Inter).

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Zustand (auth, wallet, network)
- qrcode.react (QR generation)
- idb-keyval (IndexedDB for offline txns)

## Run

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Set `NEXT_PUBLIC_API_URL=http://localhost:4000` in `.env.local` to hit backend.

## Screens

- `/splash` → `/onboarding` → `/login` → `/otp` → `/dashboard`
- Send: `/send` → scan → amount → `/send/confirm` → `/send/pin` → `/send/qr`
- Receive: `/receive` (identity QR → scan payment QR) → `/receive/success`
- `/history`, `/sync`, `/notifications`, `/settings`, `/security`, `/help`, `/about`, `/admin`

## Design

- Primary: Deep Navy `#0f172a`
- Secondary: Electric Cyan `#22d3ee`
- Accent: Teal gradient
- Success / Warning / Error: Green / Orange / Red
- Network bar: green when online, orange + "Sync Now" when offline
