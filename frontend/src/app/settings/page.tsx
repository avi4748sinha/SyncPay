'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { AppHeader } from '@/components/AppHeader';

function rupeesFromPaise(paise: number) {
  return (Number(paise) / 100).toFixed(2);
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const [pinSet, setPinSet] = useState<boolean | null>(null);
  const [offlineLimitPaise, setOfflineLimitPaise] = useState<number | null>(null);
  const [availablePaise, setAvailablePaise] = useState<number | null>(null);
  const [offlineLimitInput, setOfflineLimitInput] = useState('');
  const [offlineSaving, setOfflineSaving] = useState(false);
  const [offlineMsg, setOfflineMsg] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => d.pin_set != null && setPinSet(d.pin_set))
      .catch(() => setPinSet(false));
  }, [token]);

  const loadWallet = useCallback(async () => {
    if (!token) return;
    const r = await fetch('/api/wallet', { headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json().catch(() => ({}));
    if (d.success && d.wallet) {
      setOfflineLimitPaise(Number(d.wallet.offline_limit));
      setAvailablePaise(Number(d.wallet.available_balance));
      setOfflineLimitInput(rupeesFromPaise(d.wallet.offline_limit));
    }
  }, [token]);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  async function saveOfflineLimit() {
    if (!token) return;
    const rupees = parseFloat(offlineLimitInput.replace(/,/g, ''));
    if (Number.isNaN(rupees) || rupees < 0) {
      setOfflineMsg('Enter a valid amount in rupees.');
      return;
    }
    const paise = Math.round(rupees * 100);
    setOfflineSaving(true);
    setOfflineMsg('');
    try {
      const r = await fetch('/api/wallet/offline-limit', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ offline_limit: paise }),
      });
      const d = await r.json().catch(() => ({}));
      if (d.success && d.wallet) {
        setOfflineLimitPaise(Number(d.wallet.offline_limit));
        setAvailablePaise(Number(d.wallet.available_balance));
        setOfflineMsg('Offline spend cap updated.');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('syncpay-wallet-refresh'));
        }
      } else {
        setOfflineMsg(d.message || 'Could not update offline cap.');
      }
    } finally {
      setOfflineSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Settings" backHref="/dashboard" />
      <div className="p-4">
      <div className="mt-8 rounded-card gradient-teal p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-2xl">👤</div>
          <div>
            <p className="text-lg font-semibold">{user?.name || 'User'}</p>
            <p className="text-sm opacity-90">{user?.mobile_number}</p>
            <p className="text-xs opacity-75">{user?.sync_id}</p>
          </div>
        </div>
      </div>
      <div className="mt-8 space-y-1">
        <h2 className="px-2 text-sm font-semibold text-gray-500">Account</h2>
        <Link href="/settings/profile" className="flex items-center justify-between rounded-card border border-gray-100 p-4">Profile →</Link>
        <Link href="/notifications" className="flex items-center justify-between rounded-card border border-gray-100 p-4">Notifications →</Link>
        <div className="flex items-center justify-between rounded-card border border-gray-100 p-4">
          <span>Dark Mode</span>
          <input type="checkbox" className="rounded" />
        </div>
      </div>
      <div className="mt-6 space-y-1">
        <h2 className="px-2 text-sm font-semibold text-gray-500">Offline wallet</h2>
        <div className="rounded-card border border-gray-100 bg-white p-4">
          <p className="text-sm text-gray-600">
            Set how much you can spend while offline (cannot exceed main wallet available balance).
          </p>
          {offlineLimitPaise != null && availablePaise != null && (
            <p className="mt-2 text-xs text-gray-500">
              Current cap: ₹{rupeesFromPaise(offlineLimitPaise)} · Max by balance: ₹{rupeesFromPaise(availablePaise)}
            </p>
          )}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="sr-only" htmlFor="offline-cap">
              Offline cap (₹)
            </label>
            <input
              id="offline-cap"
              type="number"
              min={0}
              step="0.01"
              value={offlineLimitInput}
              onChange={(e) => setOfflineLimitInput(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm sm:max-w-[200px]"
              placeholder="5000.00"
            />
            <button
              type="button"
              onClick={() => void saveOfflineLimit()}
              disabled={offlineSaving || !token}
              className="rounded-button bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {offlineSaving ? 'Saving…' : 'Save cap'}
            </button>
          </div>
          {offlineMsg && <p className="mt-2 text-sm text-primary">{offlineMsg}</p>}
        </div>
      </div>
      <div className="mt-6 space-y-1">
        <h2 className="px-2 text-sm font-semibold text-gray-500">Security</h2>
        <Link href="/security" className="flex items-center justify-between rounded-card border border-gray-100 p-4">Security Center →</Link>
        <Link href="/settings/device" className="flex items-center justify-between rounded-card border border-gray-100 p-4">Device Binding →</Link>
        <Link href="/settings/pin" className="flex items-center justify-between rounded-card border border-gray-100 p-4">{pinSet ? 'Change UPI PIN' : 'Set UPI PIN'} →</Link>
        <div className="flex items-center justify-between rounded-card border border-gray-100 p-4">
          <span>Biometric Login</span>
          <input type="checkbox" defaultChecked className="rounded" />
        </div>
      </div>
      <div className="mt-6 space-y-1">
        <h2 className="px-2 text-sm font-semibold text-gray-500">Support</h2>
        <Link href="/help" className="flex items-center justify-between rounded-card border border-gray-100 p-4">Help & Support →</Link>
        <Link href="/about" className="flex items-center justify-between rounded-card border border-gray-100 p-4">About →</Link>
      </div>
      </div>
    </div>
  );
}
