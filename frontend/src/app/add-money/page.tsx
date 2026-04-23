'use client';

import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';

export default function AddMoneyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Add Money" backHref="/dashboard" />
      <div className="p-4">
        <div className="rounded-xl bg-white p-6 shadow-soft text-center">
          <p className="text-lg font-medium text-primary">Wallet managed by your bank</p>
          <p className="mt-2 text-gray-600">
            All balance and add-money is handled through the central ledger. Contact your bank manager (admin) to add funds to your wallet.
          </p>
          <p className="mt-4 text-sm text-gray-500">No UPI or bank link here – your manager credits your account from the admin panel.</p>
          <Link href="/dashboard" className="mt-6 inline-block rounded-xl bg-primary px-6 py-3 font-medium text-white">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
