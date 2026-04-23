'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { useAuthStore } from '@/store/authStore';
import { useNetworkStore } from '@/store/networkStore';
import { useWalletStore } from '@/store/walletStore';
import { savePendingTxns, getPendingAmountBySender } from '@/lib/idb';
import { payloadStringForSignature, hashPayloadToSignature } from '@/lib/offlineSignature';

const DEVICE_ID = typeof window !== 'undefined' ? 'web-' + (localStorage.getItem('device_id') || Math.random().toString(36).slice(2)) : 'web';

export default function SendConfirmPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const wallet = useWalletStore((s) => s.wallet);
  const isOnline = useNetworkStore((s) => s.isOnline);
  const [amount, setAmount] = useState('');
  const [receiver, setReceiver] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [note, setNote] = useState('');
  const [pin, setPin] = useState('');
  const [step, setStep] = useState<'summary' | 'pin'>('summary');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pinSet, setPinSet] = useState<boolean | null>(null);

  useEffect(() => {
    setAmount(sessionStorage.getItem('send_amount') || '');
    setReceiver(sessionStorage.getItem('send_receiver') || '');
    setReceiverId(sessionStorage.getItem('send_receiver_id') || '');
    setNote(sessionStorage.getItem('send_note') || '');
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => d.pin_set != null && setPinSet(d.pin_set))
        .catch(() => setPinSet(false));
    }
  }, [token]);

  async function handleConfirm() {
    if (!receiverId || !amount || parseFloat(amount) <= 0 || !token) return;
    setError('');
    const amtPaise = Math.round(parseFloat(amount) * 100);

    if (isOnline) {
      if (pinSet && pin.length !== 6) {
        setError('Enter 6-digit UPI PIN');
        return;
      }
      if (pinSet) {
        setLoading(true);
        try {
          const res = await fetch('/api/transactions/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ receiver_id: receiverId, amount: amtPaise, note: note || undefined, pin }),
          });
          const data = await res.json();
          if (data.success) {
            sessionStorage.setItem('send_success_receiver', receiver);
            sessionStorage.setItem('send_success_amount', amount);
            router.push('/send/success');
          } else {
            setError(data.message || 'Payment failed');
          }
        } catch (err) {
          setError('Network error. Try again.');
        } finally {
          setLoading(false);
        }
      } else {
        setError('Set UPI PIN in Settings first to send payment.');
      }
      return;
    }

    // Offline: check limit then save to IDB and go to QR screen
    if (pin.length !== 6) {
      setError('Enter 6-digit UPI PIN to authorize offline payment.');
      return;
    }
    setLoading(true);
    try {
      const userId = user?.id;
      if (!userId) {
        setError('Session expired. Login again.');
        setLoading(false);
        return;
      }
      const offlineLimit = wallet?.offline_limit ?? 0;
      const pendingSum = await getPendingAmountBySender(userId);
      if (pendingSum + amtPaise > offlineLimit) {
        const limitRupees = (offlineLimit / 100).toFixed(0);
        const remainingRupees = (Math.max(0, offlineLimit - pendingSum) / 100).toFixed(0);
        setError(`Offline limit exceeded. You can spend up to ₹${limitRupees} offline (₹${remainingRupees} remaining).`);
        setLoading(false);
        return;
      }
      const txnId = crypto.randomUUID();
      const timestamp = Date.now();
      const payloadStr = payloadStringForSignature({
        txn_id: txnId,
        sender_id: userId,
        receiver_id: receiverId,
        amount: amtPaise,
        timestamp,
        device_id: DEVICE_ID,
      });
      const signature = await hashPayloadToSignature(payloadStr);

      await savePendingTxns([
        {
          txn_id: txnId,
          sender_id: userId,
          receiver_id: receiverId,
          amount: amtPaise,
          timestamp,
          signature,
          device_id: DEVICE_ID,
          sync_status: 'PENDING_SYNC',
          note: note || undefined,
        },
      ]);
      sessionStorage.setItem('send_success_receiver', receiver);
      sessionStorage.setItem('send_success_amount', amount);
      sessionStorage.setItem('offline_txn_id', txnId);
      router.push('/send/qr');
    } catch (err) {
      setError('Failed to save offline payment.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Confirm Payment" backHref="/send" />

      <div className="mx-auto max-w-[440px] p-4">
        <div className="rounded-2xl bg-white p-6 shadow-card">
          <p className="text-sm text-gray-500">Amount</p>
          <p className="text-2xl font-bold text-primary">₹{amount}</p>
          <p className="mt-2 text-sm text-gray-500">To</p>
          <p className="font-semibold text-primary">{receiver}</p>
          {note && <p className="mt-2 text-sm text-gray-500">Note: {note}</p>}
          {isOnline && <p className="mt-4 text-sm text-success">✓ Instant – money moves now (one scan)</p>}
          {!isOnline && <p className="mt-4 text-sm text-warning">⚡ Offline – will sync when online</p>}
        </div>

        {step === 'summary' && (
          <>
            {isOnline && pinSet === false && (
              <p className="mt-4 text-center text-sm text-gray-600">
                Set UPI PIN in <a href="/settings" className="text-secondary font-medium">Settings</a> to send payment.
              </p>
            )}
            <button
              onClick={() => setStep('pin')}
              disabled={loading || (isOnline && pinSet === false)}
              className="mt-8 w-full rounded-xl bg-primary py-3.5 font-semibold text-white shadow-md disabled:opacity-60"
            >
              {isOnline && pinSet === false ? 'Set PIN in Settings first' : 'Enter UPI PIN'}
            </button>
          </>
        )}

        {step === 'pin' && (
          <>
            <p className="mt-6 text-sm font-medium text-gray-700">Enter 6-digit UPI PIN</p>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              placeholder="••••••"
              className="mt-2 w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-center text-xl tracking-[0.4em] focus:border-secondary focus:outline-none"
              maxLength={6}
            />
            {error && <p className="mt-3 text-center text-sm text-error">{error}</p>}
            <button
              onClick={handleConfirm}
              disabled={loading || pin.length !== 6}
              className="mt-6 w-full rounded-xl bg-primary py-3.5 font-semibold text-white shadow-md disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Confirm & Send'}
            </button>
            <button type="button" onClick={() => setStep('summary')} className="mt-3 w-full text-center text-sm text-gray-500">
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
