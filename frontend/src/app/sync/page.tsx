'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { useAuthStore } from '@/store/authStore';
import { getPendingTxns } from '@/lib/idb';
import { syncPendingTransactions, trySettleIncomingPending } from '@/lib/syncEngine';

export default function SyncPage() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const [pending, setPending] = useState<
    { txn_id: string; sender_id: string; receiver_id: string; amount: number; timestamp: number }[]
  >([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('Never');
  const [message, setMessage] = useState('');

  const myPending = useMemo(() => pending.filter((t) => t.sender_id === user?.id), [pending, user?.id]);

  async function loadPending() {
    const list = await getPendingTxns();
    setPending(list as any);
  }

  useEffect(() => {
    loadPending();
  }, [user?.id]);

  useEffect(() => {
    const handler = () => loadPending();
    window.addEventListener('syncpay-pending-refresh', handler);
    return () => window.removeEventListener('syncpay-pending-refresh', handler);
  }, [user?.id]);

  async function handleSync() {
    if (!token) return;
    setSyncing(true);
    setMessage('');
    try {
      await trySettleIncomingPending();
      const result = await syncPendingTransactions();
      setLastSync(new Date().toLocaleString());
      const extra =
        result.failedReasons && result.failedReasons.length
          ? ` — ${result.failedReasons.slice(0, 3).join('; ')}`
          : '';
      setMessage(`Synced: ${result.synced}, Failed: ${result.failed}${extra}`);
      await loadPending();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Sync Center" backHref="/dashboard" />
      <div className="p-4">
        <div className="mt-4 rounded-card gradient-teal p-8 text-center text-white">
          <span className="text-5xl">SYNC</span>
          <p className="mt-4 text-3xl font-bold">{myPending.length}</p>
          <p className="text-sm opacity-90">Transactions Pending Sync</p>
          <button
            onClick={handleSync}
            disabled={syncing || myPending.length === 0}
            className="mt-6 rounded-button bg-white/20 px-6 py-2 font-medium hover:bg-white/30 disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>

        <div className="mt-6 flex items-center justify-between rounded bg-gray-50 px-4 py-3">
          <span className="text-success">OK</span>
          <span className="text-gray-600">Last Synced</span>
          <span className="text-primary">{lastSync}</span>
        </div>

        {message && <p className="mt-3 rounded bg-blue-50 p-3 text-sm text-primary">{message}</p>}

        <div className="mt-8">
          <h2 className="font-semibold text-primary">Pending Transactions</h2>
          <div className="mt-3 space-y-2">
            {myPending.length === 0 && (
              <p className="rounded-card border border-gray-100 bg-white p-4 text-sm text-gray-500">No pending transactions.</p>
            )}
            {myPending.map((t) => (
              <div key={t.txn_id} className="flex items-center justify-between rounded-card border border-gray-100 p-4">
                <div className="flex items-center gap-3">
                  <span className="text-warning">PD</span>
                  <div>
                    <p className="font-medium">Txn {t.txn_id.slice(0, 8)}</p>
                    <p className="text-xs text-gray-500">{new Date(t.timestamp).toLocaleString()}</p>
                  </div>
                </div>
                <p className="font-semibold text-primary">Rs {(Number(t.amount) / 100).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-8 rounded bg-blue-50 p-4 text-sm text-gray-700">
          Outgoing pending syncs here when you are the sender. If the receiver is online when they scan your Final QR, settlement can happen immediately on their device. Otherwise, sync when you are online.
        </p>
      </div>
    </div>
  );
}
