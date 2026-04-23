'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { useAuthStore } from '@/store/authStore';

export default function SendPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [receiverId, setReceiverId] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    const id = sessionStorage.getItem('send_receiver_id');
    const name = sessionStorage.getItem('send_receiver');
    if (id) setReceiverId(id);
    if (name) setReceiverName(name);
  }, []);

  function addDigit(d: string) {
    if (d === 'C') setAmount('');
    else if (d === '<') setAmount((a) => a.slice(0, -1));
    else setAmount((a) => a + d);
  }

  function handleContinue() {
    const amt = parseFloat(amount);
    if (!receiverId || !amt || amt <= 0) return;
    sessionStorage.setItem('send_amount', String(amt));
    sessionStorage.setItem('send_note', note);
    router.push('/send/confirm');
  }

  const hasReceiver = !!receiverId && !!receiverName;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Send Payment" backHref="/dashboard" />

      <div className="p-4">
        <Link
          href="/send/scan"
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary bg-white py-6 shadow-soft"
        >
          <span className="text-2xl">📷</span>
          <span className="font-semibold text-primary">
            {hasReceiver ? 'Change receiver / Scan again' : 'Scan receiver QR first'}
          </span>
        </Link>

        {!hasReceiver && (
          <p className="mt-4 text-center text-sm text-gray-500">
            You must scan a valid receiver&apos;s QR before entering amount. Only registered users can receive payment.
          </p>
        )}

        {hasReceiver && (
          <>
            <p className="mt-6 text-center text-primary">
              Paying to: <strong>{receiverName}</strong>
            </p>

            <div className="mt-6">
              <label className="text-sm font-medium text-gray-700">Amount (₹)</label>
              <div className="mt-2 flex items-center rounded-xl border-2 border-gray-200 bg-white px-4 py-4 text-2xl font-semibold">
                <span className="text-gray-500">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                  placeholder="0"
                  className="ml-2 flex-1 bg-transparent focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700">Note (optional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What's this for?"
                className="mt-2 w-full rounded-xl border-2 border-gray-200 px-4 py-3 focus:border-secondary focus:outline-none"
              />
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              {['1','2','3','4','5','6','7','8','9','C','0','<'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => addDigit(d)}
                  className="rounded-xl border border-gray-200 bg-white py-3 text-lg font-medium shadow-soft"
                >
                  {d}
                </button>
              ))}
            </div>

            <button
              onClick={handleContinue}
              disabled={!amount || parseFloat(amount) <= 0}
              className="mt-6 w-full rounded-xl bg-primary py-3.5 font-semibold text-white shadow-md disabled:opacity-50"
            >
              Continue
            </button>
          </>
        )}
      </div>
    </div>
  );
}
