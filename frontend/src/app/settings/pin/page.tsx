'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { useAuthStore } from '@/store/authStore';

export default function SetPinPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pinSet, setPinSet] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => d.pin_set != null && setPinSet(d.pin_set))
      .catch(() => setPinSet(false));
  }, [token, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (pin.length !== 6 || confirmPin.length !== 6) {
      setError('Enter 6-digit PIN in both fields');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/set-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/settings');
      } else {
        setError(data.message || 'Failed to set PIN');
      }
    } catch (err) {
      setError('Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title={pinSet ? 'Change UPI PIN' : 'Set UPI PIN'} backHref="/settings" />
      <div className="p-4">
        <p className="text-gray-600">
          {pinSet ? 'Enter new 6-digit UPI PIN. You’ll use it to confirm payments.' : 'Set a 6-digit UPI PIN to authorize payments (online and offline).'}
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">PIN</label>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              className="mt-1 w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-center text-xl tracking-[0.4em] focus:border-secondary focus:outline-none"
              maxLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm PIN</label>
            <input
              type="password"
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              className="mt-1 w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-center text-xl tracking-[0.4em] focus:border-secondary focus:outline-none"
              maxLength={6}
            />
          </div>
          {error && <p className="text-center text-sm text-error">{error}</p>}
          <button
            type="submit"
            disabled={loading || pin.length !== 6 || confirmPin.length !== 6}
            className="w-full rounded-xl bg-primary py-3.5 font-semibold text-white disabled:opacity-50"
          >
            {loading ? 'Saving...' : pinSet ? 'Change PIN' : 'Set PIN'}
          </button>
        </form>
      </div>
    </div>
  );
}
