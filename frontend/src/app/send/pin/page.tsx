'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';

export default function SendPinPage() {
  const [pin, setPin] = useState('');
  const router = useRouter();

  function handleVerify() {
    if (pin.length !== 6) return;
    router.push('/send/qr');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Verify Transaction" backHref="/send/confirm" />
      <div className="p-4">
      <p className="mt-8 text-center text-gray-600">Enter 6 digit Sync PIN</p>
      <input
        type="password"
        inputMode="numeric"
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
        className="mx-auto mt-4 block w-48 rounded-card border border-gray-200 px-4 py-3 text-center text-2xl tracking-[0.5em] focus:border-secondary focus:outline-none"
        placeholder="••••••"
      />
      <p className="mt-4 text-center text-xs text-gray-500">Use biometric authentication</p>
      <p className="mt-8 text-center text-xs text-gray-500">Secured with AES-256 encryption</p>

      <button
        onClick={handleVerify}
        disabled={pin.length !== 6}
        className="mt-8 w-full rounded-button gradient-teal py-3 font-medium text-white disabled:opacity-50"
      >
        Verify
      </button>
      </div>
    </div>
  );
}
