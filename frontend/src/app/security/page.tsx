'use client';

import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Security Center" backHref="/settings" />
      <div className="p-4">
      <div className="mt-8 rounded-card bg-success p-8 text-center text-white">
        <span className="text-5xl">🛡️</span>
        <p className="mt-4 text-2xl font-bold">Excellent</p>
        <p className="text-sm opacity-90">Your account is highly secure</p>
      </div>
      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between rounded-card border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <span className="text-success">📱</span>
            <div>
              <p className="font-medium text-primary">Device Binding</p>
              <p className="text-sm text-gray-500">Your account is bound to this device</p>
              <p className="text-xs text-success">Active</p>
            </div>
          </div>
          <span className="text-success">✓</span>
        </div>
        <div className="flex items-center justify-between rounded-card border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <span className="text-success">🔒</span>
            <div>
              <p className="font-medium text-primary">End-to-End Encryption</p>
              <p className="text-sm text-gray-500">All transactions are encrypted</p>
              <p className="text-xs text-success">Enabled</p>
            </div>
          </div>
          <span className="text-success">✓</span>
        </div>
        <div className="flex items-center justify-between rounded-card border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <span className="text-success">👆</span>
            <div>
              <p className="font-medium text-primary">Biometric Authentication</p>
              <p className="text-sm text-gray-500">Fingerprint login enabled</p>
              <p className="text-xs text-success">Enabled</p>
            </div>
          </div>
          <span className="text-success">✓</span>
        </div>
        <Link href="/settings/pin" className="flex items-center justify-between rounded-card border border-gray-100 p-4">
          <span className="text-primary">🔑 Change PIN</span>
          <span>→</span>
        </Link>
        <Link href="/settings/device" className="flex items-center justify-between rounded-card border border-gray-100 p-4">
          <span className="text-primary">💻 Manage Devices</span>
          <span>→</span>
        </Link>
      </div>
      </div>
    </div>
  );
}
