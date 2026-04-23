'use client';

import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { AppHeader } from '@/components/AppHeader';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="About" backHref="/settings" />
      <div className="p-4">
      <div className="mt-8 flex flex-col items-center">
        <Logo />
        <p className="mt-2 text-sm text-gray-500">Pay Now. Sync Later.</p>
        <p className="mt-1 text-xs text-gray-400">Version 1.0.0</p>
      </div>
      <div className="mt-8 rounded-card border border-gray-100 p-4 shadow-soft">
        <h3 className="font-semibold text-primary">Company Information</h3>
        <p className="mt-2 text-sm text-gray-600">Version: 1.0.0 · Build: 2026.02.24 · License: Commercial</p>
      </div>
      <div className="mt-4 rounded-card border border-gray-100 p-4 shadow-soft">
        <h3 className="font-semibold text-primary">Security Architecture</h3>
        <p className="mt-2 text-sm text-gray-600">SyncPay uses AES-256 encryption, cryptographic signing for offline transactions, and secure device binding to ensure your money is always protected.</p>
      </div>
      <div className="mt-6 space-y-2">
        <Link href="/about/terms" className="flex items-center justify-between rounded-card border border-gray-100 p-4">Terms & Conditions →</Link>
        <Link href="/about/privacy" className="flex items-center justify-between rounded-card border border-gray-100 p-4">Privacy Policy →</Link>
        <Link href="/about/licenses" className="flex items-center justify-between rounded-card border border-gray-100 p-4">Licenses →</Link>
      </div>
      </div>
    </div>
  );
}
