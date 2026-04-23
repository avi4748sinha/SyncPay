'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ReceiveSuccessPage() {
  const [amount, setAmount] = useState('0');
  const [sender, setSender] = useState('Sender');
  const [status, setStatus] = useState('PENDING_SYNC');

  useEffect(() => {
    setAmount(sessionStorage.getItem('receive_success_amount') || '0');
    setSender(sessionStorage.getItem('receive_success_sender_id') || 'Sender');
    setStatus(sessionStorage.getItem('receive_success_status') || 'PENDING_SYNC');
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center bg-success px-4 pt-16">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-4xl text-success">OK</div>
      <h1 className="mt-6 text-3xl font-bold text-white">Payment Received!</h1>
      <p className="mt-2 text-white/90">{status === 'PENDING_SYNC' ? 'Pending Sync' : 'Synced'}</p>

      <div className="mt-8 w-full max-w-sm rounded-card bg-white/10 p-6 text-white">
        <p className="text-3xl font-bold">+ Rs {Number(amount || '0').toFixed(2)}</p>
        <p className="mt-2 text-gray-100">from {sender}</p>
      </div>

      <p className="mt-6 text-center text-sm text-white/90">Transaction will sync when sender comes online and taps sync.</p>

      <Link href="/dashboard" className="mt-8 w-full max-w-sm rounded-button bg-white py-3 text-center font-semibold text-success">
        Done
      </Link>
    </div>
  );
}
