'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { useAuthStore } from '@/store/authStore';

interface AdminUserDetail {
  id: string;
  name: string;
  mobile_number: string;
  sync_id: string;
  role: string;
  total_balance?: number;
  available_balance?: number;
  offline_limit?: number;
}

interface Txn {
  txn_id: string;
  sender_name: string;
  receiver_name: string;
  amount: number;
  sync_status: string;
  created_at: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  mobile_number: string;
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.token);
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !params?.id) return;

    async function load() {
      setLoading(true);
      try {
        const [userRes, txRes, ticketRes] = await Promise.all([
          fetch(`/api/admin/users/${params.id}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
            r.json()
          ),
          fetch(`/api/admin/transactions?user_id=${encodeURIComponent(params.id)}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then((r) => r.json()),
          fetch(`/api/admin/tickets`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
        ]);
        if (userRes.success) setUser(userRes.user);
        if (txRes.success) setTxns(txRes.transactions || []);
        if (ticketRes.success) {
          const list: Ticket[] = (ticketRes.tickets || []).filter((t: any) => t.user_id === params.id);
          setTickets(list);
        }
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [token, params?.id]);

  const balance = (user?.total_balance || 0) / 100;
  const available = (user?.available_balance || 0) / 100;
  const offline = (user?.offline_limit || 0) / 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="User details" backHref="/admin" />
      <main className="mx-auto flex max-w-[1040px] flex-col gap-4 p-4 md:flex-row">
        {/* Left column: profile + wallet */}
        <div className="flex w-full flex-col gap-4 md:w-[35%]">
          <div className="rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-600 p-5 text-white shadow-md">
            {loading && !user ? (
              <p className="text-sm">Loading user…</p>
            ) : (
              <>
                <p className="text-sm font-semibold uppercase opacity-90">
                  {user?.role === 'admin' ? 'Admin' : 'Customer'}
                </p>
                <p className="mt-1 text-xl font-bold">{user?.name}</p>
                <p className="mt-1 text-sm opacity-90">{user?.mobile_number}</p>
                <p className="text-xs opacity-80">{user?.sync_id}</p>
              </>
            )}
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700">Wallet snapshot</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Total balance</dt>
                <dd className="font-semibold text-primary">₹{balance.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Available</dt>
                <dd className="font-semibold text-primary">₹{available.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Offline limit</dt>
                <dd className="font-semibold text-primary">₹{offline.toFixed(2)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl bg-white p-4 text-xs text-gray-500 shadow-sm">
            <p>
              This view is for bank manager only. It shows customer snapshot for reconciliation and support, similar to a
              core banking dashboard.
            </p>
          </div>
        </div>

        {/* Right column: recent txns + tickets */}
        <div className="flex w-full flex-col gap-4 md:w-[65%]">
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700">Recent transactions</h2>
            <div className="mt-3 space-y-2">
              {loading && !txns.length && <p className="text-sm text-gray-500">Loading transactions…</p>}
              {!loading && txns.length === 0 && (
                <p className="text-sm text-gray-500">No transactions found for this user.</p>
              )}
              {txns.slice(0, 10).map((t) => (
                <div key={t.txn_id} className="rounded-xl bg-gray-50 p-3 text-sm">
                  <p className="font-medium text-primary">
                    {t.sender_name} → {t.receiver_name} · ₹{(t.amount / 100).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t.sync_status} · {t.created_at ? new Date(t.created_at).toLocaleString() : ''}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700">Support tickets</h2>
            <div className="mt-3 space-y-2">
              {loading && !tickets.length && <p className="text-sm text-gray-500">Loading tickets…</p>}
              {!loading && tickets.length === 0 && (
                <p className="text-sm text-gray-500">No tickets raised by this user yet.</p>
              )}
              {tickets.map((t) => (
                <div key={t.id} className="rounded-xl bg-gray-50 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-primary truncate pr-2">{t.subject}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        t.status === 'RESOLVED'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(t.created_at).toLocaleString()} · {t.mobile_number}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

