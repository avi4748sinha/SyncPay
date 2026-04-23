'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';

export default function SendSuccessPage() {
  const [receiver, setReceiver] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    setReceiver(sessionStorage.getItem('send_success_receiver') || '');
    setAmount(sessionStorage.getItem('send_success_amount') || '');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Payment" backHref="/dashboard" />
      <div className="flex flex-col items-center p-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success text-4xl text-white">✓</div>
        <h1 className="mt-6 text-2xl font-bold text-primary">Payment Successful</h1>
        <p className="mt-2 text-success">Money sent in real-time</p>
        <div className="mt-8 w-full max-w-sm rounded-xl bg-white p-6 shadow-soft">
          <p className="text-2xl font-bold text-primary">₹{amount}</p>
          <p className="mt-1 text-gray-600">sent to</p>
          <p className="font-semibold text-primary">{receiver}</p>
        </div>
        <Link
          href="/dashboard"
          className="mt-8 w-full max-w-sm rounded-xl bg-primary py-3.5 text-center font-semibold text-white"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
