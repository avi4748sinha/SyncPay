'use client';

import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { useAuthStore } from '@/store/authStore';

interface Stats {
  totalUsers: number;
  totalTransactions: number;
  pendingSyncCount: number;
}

export default function AdminPage() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pendingSyncs, setPendingSyncs] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [creditUserId, setCreditUserId] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditOfflineLimit, setCreditOfflineLimit] = useState('');
  const [creditMsg, setCreditMsg] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function fetchAll() {
    if (!token) return;
    fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => d.success && setStats(d));
    fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []));
    fetch('/api/admin/transactions', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setTransactions(d.transactions || []));
    fetch('/api/admin/pending-syncs', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setPendingSyncs(d.pending || []));
    fetch('/api/admin/tickets', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setTickets(d.tickets || []));
  }

  useEffect(() => {
    if (token && user?.role === 'admin') fetchAll();
  }, [token, user?.role]);

  async function handleCredit() {
    if (!token || !creditUserId || !creditAmount || parseFloat(creditAmount) <= 0) return;
    setCreditMsg('');
    try {
      const body: { user_id: string; amount: number; offline_limit?: number } = {
        user_id: creditUserId,
        amount: parseFloat(creditAmount),
      };
      if (creditOfflineLimit !== '' && parseFloat(creditOfflineLimit) >= 0) {
        body.offline_limit = parseFloat(creditOfflineLimit);
      }
      const res = await fetch('/api/admin/credit-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setCreditMsg(`₹${creditAmount} added to wallet.`);
        setCreditAmount('');
        setCreditUserId('');
        setCreditOfflineLimit('');
        fetchAll();
      } else {
        setCreditMsg(data.message || 'Failed');
      }
    } catch {
      setCreditMsg('Request failed');
    }
  }

  async function handleDeleteUser(u: { id: string; name: string; mobile_number: string }) {
    if (!token || u.id === user?.id) return;
    if (!confirm(`Delete user ${u.name} (${u.mobile_number})? This cannot be undone.`)) return;
    setDeletingId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setUsers((prev) => prev.filter((x) => x.id !== u.id));
        if (creditUserId === u.id) setCreditUserId('');
        setStats((s) => (s ? { ...s, totalUsers: s.totalUsers - 1 } : null));
      } else {
        alert(data.message || 'Delete failed');
      }
    } catch {
      alert('Request failed');
    } finally {
      setDeletingId(null);
    }
  }

  if (token && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }
  if (user?.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-gray-600">Admin only. <a href="/dashboard" className="font-semibold text-secondary">Go to Dashboard</a></p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <AppHeader title="Admin Dashboard" backHref="/dashboard" />
      <main className="mx-auto max-w-[520px] space-y-5 p-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-white p-3 shadow-soft text-center">
            <p className="text-xs font-medium text-gray-500">Total Users</p>
            <p className="text-xl font-bold text-primary">{stats?.totalUsers ?? '–'}</p>
          </div>
          <div className="rounded-xl bg-white p-3 shadow-soft text-center">
            <p className="text-xs font-medium text-gray-500">Transactions</p>
            <p className="text-xl font-bold text-primary">{stats?.totalTransactions ?? '–'}</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-3 shadow-soft text-center">
            <p className="text-xs font-medium text-amber-700">Pending Sync</p>
            <p className="text-xl font-bold text-amber-700">{stats?.pendingSyncCount ?? '–'}</p>
          </div>
        </div>

        {/* Add money */}
        <div className="rounded-2xl bg-white p-5 shadow-card">
          <h2 className="text-lg font-bold text-primary">Add money to user wallet</h2>
          <p className="mt-1 text-sm text-gray-500">Bank manager: credit a user&apos;s wallet</p>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Select user (unique by mobile)</label>
            <select
              value={creditUserId}
              onChange={(e) => setCreditUserId(e.target.value)}
              className="mt-1 w-full rounded-xl border-2 border-gray-200 px-4 py-2 focus:border-secondary focus:outline-none"
            >
              <option value="">Choose user</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.mobile_number} – {u.name} — ₹{((u.total_balance || 0) / 100).toFixed(2)}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Amount (₹)</label>
            <input
              type="number"
              min="1"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              className="mt-1 w-full rounded-xl border-2 border-gray-200 px-4 py-2 focus:border-secondary focus:outline-none"
              placeholder="0"
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Offline limit (₹) – optional</label>
            <input
              type="number"
              min="0"
              value={creditOfflineLimit}
              onChange={(e) => setCreditOfflineLimit(e.target.value)}
              className="mt-1 w-full rounded-xl border-2 border-gray-200 px-4 py-2 focus:border-secondary focus:outline-none"
              placeholder="e.g. 5000"
            />
          </div>
          {creditMsg && <p className="mt-2 text-sm text-success">{creditMsg}</p>}
          <button
            onClick={handleCredit}
            disabled={!creditUserId || !creditAmount || parseFloat(creditAmount) <= 0}
            className="mt-4 w-full rounded-xl bg-primary py-2.5 font-semibold text-white disabled:opacity-50"
          >
            Credit wallet
          </button>
        </div>

        {/* All users – unique by mobile, with Delete */}
        <section>
          <h2 className="text-lg font-bold text-primary">All users ({users.length})</h2>
          <p className="text-xs text-gray-500">Each row is one user (unique mobile). Admin cannot be deleted.</p>
          <div className="mt-2 space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-2 rounded-xl bg-white p-4 shadow-soft">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-primary">{u.name}</p>
                  <p className="text-sm text-gray-500">{u.mobile_number} · {u.sync_id}</p>
                  <p className="mt-1 text-sm text-primary">Balance: ₹{((u.total_balance || 0) / 100).toFixed(2)} {u.role === 'admin' && <span className="text-amber-600">(Admin)</span>}</p>
                </div>
                {u.role !== 'admin' && u.id !== user?.id && (
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(u)}
                    disabled={deletingId === u.id}
                    className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    {deletingId === u.id ? '…' : 'Delete'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Pending Sync – kis user ka sync pending */}
        <section>
          <h2 className="text-lg font-bold text-primary">Pending Sync ({pendingSyncs.length})</h2>
          <p className="text-xs text-gray-500">Transactions not yet synced to server (offline → online)</p>
          <div className="mt-2 space-y-2">
            {pendingSyncs.length === 0 ? (
              <p className="rounded-xl bg-white p-4 text-center text-sm text-gray-500">No pending sync</p>
            ) : (
              pendingSyncs.slice(0, 10).map((p: any) => (
                <div key={p.txn_id} className="rounded-xl bg-amber-50 p-3 text-sm">
                  <p className="font-medium text-primary">₹{(p.amount / 100).toFixed(2)} · {p.txn_id?.slice(0, 8)}…</p>
                  <p className="text-xs text-gray-600">Sender: {p.sender_id?.slice(0, 8)}… → Receiver: {p.receiver_id?.slice(0, 8)}…</p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Recent Transactions */}
        <section>
          <h2 className="text-lg font-bold text-primary">Recent Transactions</h2>
          <div className="mt-2 space-y-2">
            {transactions.length === 0 ? (
              <p className="rounded-xl bg-white p-4 text-center text-sm text-gray-500">No transactions yet</p>
            ) : (
              transactions.slice(0, 15).map((t: any) => (
                <div key={t.txn_id} className="rounded-xl bg-white p-3 shadow-soft text-sm">
                  <p className="font-medium text-primary">{t.sender_name} → {t.receiver_name} · ₹{(t.amount / 100).toFixed(2)}</p>
                  <p className="text-xs text-gray-500">Status: {t.sync_status} · {t.created_at ? new Date(t.created_at).toLocaleString() : ''}</p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Ticket Support */}
        <section>
          <h2 className="text-lg font-bold text-primary">Ticket Support</h2>
          <p className="text-xs text-gray-500">Support tickets from users</p>
          <div className="mt-2 space-y-2">
            {tickets.length === 0 ? (
              <p className="rounded-xl bg-white p-4 text-center text-sm text-gray-500">No tickets yet</p>
            ) : (
              tickets.slice(0, 10).map((t: any) => (
                <div key={t.id} className="rounded-xl bg-white p-3 shadow-soft text-sm">
                  <p className="font-medium text-primary">{t.subject || 'No subject'}</p>
                  <p className="text-xs text-gray-600">{t.message?.slice(0, 80)}…</p>
                  <p className="text-xs text-gray-500">Status: {t.status} · {t.mobile_number || '–'}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
