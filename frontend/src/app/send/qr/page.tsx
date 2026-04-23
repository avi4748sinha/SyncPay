'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { AppHeader } from '@/components/AppHeader';
import { getPendingTxn } from '@/lib/idb';
import type { OfflineTransaction } from '@/lib/idb';

export default function SendQRPage() {
  const [txn, setTxn] = useState<OfflineTransaction | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [amount, setAmount] = useState('');
  const [receiver, setReceiver] = useState('');

  useEffect(() => {
    const txnId = typeof window !== 'undefined' ? sessionStorage.getItem('offline_txn_id') : null;
    if (txnId) {
      getPendingTxn(txnId).then((t) => {
        setTxn(t || null);
      });
    }
    setAmount(sessionStorage.getItem('send_success_amount') || '');
    setReceiver(sessionStorage.getItem('send_success_receiver') || '');
  }, []);

  const qrPayload = txn
    ? JSON.stringify({
        txn_id: txn.txn_id,
        sender_id: txn.sender_id,
        receiver_id: txn.receiver_id,
        amount: txn.amount,
        timestamp: txn.timestamp,
        signature: txn.signature,
        device_id: txn.device_id,
      })
    : JSON.stringify({ txn_id: 'pending', amount: amount || '0' });

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Show QR to Receiver" backHref="/send" />

      {!showSuccess ? (
        <>
          <div className="mt-8 flex justify-center rounded-xl border-4 border-secondary/30 bg-white p-6">
            <QRCodeSVG value={qrPayload} size={220} level="M" />
          </div>
          {txn && <p className="mt-4 text-center text-sm text-gray-500">Transaction ID: {txn.txn_id.slice(0, 8)}…</p>}
          <p className="text-center text-sm text-warning">Status: Offline – will sync when online</p>
          <div className="mt-6 flex flex-col gap-2 text-sm text-success">
            <span>✔ Cryptographically Signed</span>
            <span>✔ Secure Handshake</span>
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem('offline_txn_id');
              setShowSuccess(true);
            }}
            className="mt-8 w-full rounded-xl bg-success py-3 font-semibold text-white"
          >
            Done – Payment Accepted
          </button>
        </>
      ) : (
        <div className="mt-12 text-center px-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success text-3xl text-white">✓</div>
          <h2 className="mt-4 text-xl font-bold text-primary">Payment Recorded</h2>
          <p className="mt-2 text-warning">Pending Sync</p>
          <p className="mt-4 text-primary">₹{amount} to {receiver}</p>
          <p className="mt-2 text-sm text-gray-500">Will sync automatically when you&apos;re back online.</p>
          <Link href="/dashboard" className="mt-8 inline-block w-full rounded-xl bg-primary py-3 font-semibold text-white">
            Back to Home
          </Link>
        </div>
      )}
    </div>
  );
}
