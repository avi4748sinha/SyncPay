'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { AppHeader } from '@/components/AppHeader';
import { getPendingTxns } from '@/lib/idb';

type Tab = 'all' | 'pending' | 'synced' | 'failed';

export default function HistoryPage() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('all');
  const [list, setList] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!token) return;
    if (!user?.id) return;

    let cancelled = false;

    const load = async () => {
      try {
        // Pending: show offline pending transactions from IndexedDB.
        if (tab === 'pending') {
          const pending = await getPendingTxns();
          if (cancelled) return;

          const mine = pending
            .filter((t) => t.sender_id === user.id || t.receiver_id === user.id)
            .map((t) => ({
              txn_id: t.txn_id,
              sender_id: t.sender_id,
              receiver_id: t.receiver_id,
              sender_name: t.sender_id,
              receiver_name: t.receiver_id,
              amount: t.amount,
              status: 'PENDING',
              sync_status: t.sync_status,
              note: t.note,
              created_at: new Date(t.timestamp).toISOString(),
              synced_at: undefined,
              direction: t.sender_id === user.id ? 'sent' : 'received',
            }));

          mine.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
          setList(mine);
          return;
        }

        // For synced/failed: show server history.
        if (tab === 'synced' || tab === 'failed') {
          const q = `?status=${tab === 'synced' ? 'SYNCED' : 'FAILED'}`;
          const res = await fetch(`/api/transactions${q}`, { headers: { Authorization: `Bearer ${token}` } });
          const d = await res.json();
          if (cancelled) return;
          setList(d.transactions || []);
          return;
        }

        // All: merge server history + local pending.
        const [serverRes, pendingLocal] = await Promise.all([
          fetch(`/api/transactions`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
          getPendingTxns(),
        ]);

        if (cancelled) return;

        const serverTxns = serverRes?.transactions || [];
        const minePending = (pendingLocal || [])
          .filter((t: any) => t.sender_id === user.id || t.receiver_id === user.id)
          .map((t: any) => ({
            txn_id: t.txn_id,
            sender_id: t.sender_id,
            receiver_id: t.receiver_id,
            sender_name: t.sender_id,
            receiver_name: t.receiver_id,
            amount: t.amount,
            status: 'PENDING',
            sync_status: t.sync_status,
            note: t.note,
            created_at: new Date(t.timestamp).toISOString(),
            synced_at: undefined,
            direction: t.sender_id === user.id ? 'sent' : 'received',
          }));

        const mergedById = new Map<string, any>();
        for (const s of serverTxns) mergedById.set(s.txn_id, s);
        for (const p of minePending) mergedById.set(p.txn_id, p);

        const merged = Array.from(mergedById.values());
        merged.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
        setList(merged);
      } catch {
        if (!cancelled) setList([]);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [token, tab, user?.id, refreshKey]);

  useEffect(() => {
    const handler = () => {
      setRefreshKey((k) => k + 1);
    };
    window.addEventListener('syncpay-pending-refresh', handler);
    return () => window.removeEventListener('syncpay-pending-refresh', handler);
  }, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'synced', label: 'Synced' },
    { id: 'failed', label: 'Failed' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Transaction history" backHref="/dashboard" />
      <div className="p-4">
      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-button px-4 py-2 text-sm font-medium ${
              tab === t.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {list.length === 0 && <p className="py-8 text-center text-gray-500">No transactions</p>}
        {list.map((tx) => (
          <div key={tx.txn_id} className="rounded-card border border-gray-100 p-4 shadow-soft">
            <div className="flex justify-between">
              <div>
                <p className="font-medium text-primary">
                  {tx.direction === 'sent' ? tx.receiver_name : tx.sender_name}
                </p>
                <p className="text-xs text-gray-500">
                  {tx.txn_id} · {new Date(tx.created_at).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className={tx.direction === 'sent' ? 'text-error' : 'text-success'}>
                  {tx.direction === 'sent' ? '-' : '+'}₹{(tx.amount / 100).toFixed(2)}
                </p>
                <span
                  className={`block text-xs ${
                    tx.sync_status === 'SYNCED'
                      ? 'text-success'
                      : tx.sync_status === 'FAILED'
                      ? 'text-error'
                      : 'text-warning'
                  }`}
                >
                  {tx.sync_status}
                </span>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/help?txn_id=${encodeURIComponent(tx.txn_id)}&amount=${tx.amount}&dir=${tx.direction || ''}`
                  )
                }
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-primary hover:bg-gray-50"
              >
                Need help with this?
              </button>
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
