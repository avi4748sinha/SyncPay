'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';
import { useRouter } from 'next/navigation';
import {
  getPendingAmountBySender,
  getPendingAmountByReceiver,
  getPendingTxns,
  markTxnSynced,
  markTxnFailed,
} from '@/lib/idb';
import { trySettleIncomingPending } from '@/lib/syncEngine';
import { useNetworkStore } from '@/store/networkStore';

export default function DashboardPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const wallet = useWalletStore((s) => s.wallet);
  const setWallet = useWalletStore((s) => s.setWallet);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [pendingSyncSum, setPendingSyncSum] = useState(0);
  const [pendingIncomingSum, setPendingIncomingSum] = useState(0);
  const isOnline = useNetworkStore((s) => s.isOnline);
  const reconcilingRef = useRef(false);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    // If admin, redirect to Admin Dashboard so they don't see user dashboard first
    if (user?.role === 'admin') {
      router.push('/admin');
      return;
    }
    fetch('/api/wallet', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => d.wallet && setWallet(d.wallet))
      .catch(() => {});
  }, [token, router, setWallet]);

  useEffect(() => {
    if (!user?.id) return;
    getPendingAmountBySender(user.id).then(setPendingSyncSum);
    getPendingAmountByReceiver(user.id).then(setPendingIncomingSum);
  }, [user?.id]);

  // After Sync Now / online sync completes, update wallet + pending immediately.
  useEffect(() => {
    if (!token) return;
    if (!user?.id) return;
    if (user?.role === 'admin') return;

    const refresh = () => {
      fetch('/api/wallet', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => d.wallet && setWallet(d.wallet))
        .catch(() => {});

      getPendingAmountBySender(user.id).then(setPendingSyncSum);
      getPendingAmountByReceiver(user.id).then(setPendingIncomingSum);
    };

    const handler = () => refresh();
    window.addEventListener('syncpay-wallet-refresh', handler);
    window.addEventListener('syncpay-pending-refresh', handler);
    return () => {
      window.removeEventListener('syncpay-wallet-refresh', handler);
      window.removeEventListener('syncpay-pending-refresh', handler);
    };
  }, [token, user?.id, user?.role, setWallet]);

  // If someone else synced while you are already on this screen,
  // refresh wallet periodically when online.
  useEffect(() => {
    if (!token) return;
    if (!user?.id) return;
    if (user?.role === 'admin') return;
    if (!isOnline) return;

    const interval = window.setInterval(() => {
      void trySettleIncomingPending();
      fetch('/api/wallet', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => d.wallet && setWallet(d.wallet))
        .catch(() => {});

      getPendingAmountBySender(user.id).then(setPendingSyncSum);
      getPendingAmountByReceiver(user.id).then(setPendingIncomingSum);
    }, 7000);

    return () => window.clearInterval(interval);
  }, [token, user?.id, user?.role, isOnline, setWallet]);

  // Reconcile local pending with server statuses so receiver's pending incoming
  // moves from PENDING_SYNC -> SYNCED/FAILED after sender sync settles.
  useEffect(() => {
    if (!token) return;
    if (!user?.id) return;
    if (user?.role === 'admin') return;
    if (!isOnline) return;

    const reconcile = async () => {
      if (reconcilingRef.current) return;
      reconcilingRef.current = true;
      try {
        const localPending = await getPendingTxns();
        if (localPending.length === 0) return;

        const serverRes = await fetch(`/api/transactions`, { headers: { Authorization: `Bearer ${token}` } }).then(
          (r) => r.json()
        );
        const serverTxns: any[] = serverRes?.transactions || [];
        const serverMap = new Map<string, string>();
        for (const t of serverTxns) serverMap.set(t.txn_id, t.sync_status);

        let changed = false;
        for (const t of localPending) {
          const s = serverMap.get(t.txn_id);
          if (!s) continue;
          if (s === 'SYNCED') {
            await markTxnSynced(t.txn_id);
            changed = true;
          } else if (s === 'FAILED') {
            await markTxnFailed(t.txn_id);
            changed = true;
          }
        }

        if (changed) {
          window.dispatchEvent(new Event('syncpay-pending-refresh'));
        }
      } catch {
        // ignore reconciliation errors
      } finally {
        reconcilingRef.current = false;
      }
    };

    const interval = window.setInterval(() => {
      void reconcile();
    }, 25000);

    return () => window.clearInterval(interval);
  }, [token, user?.id, user?.role, isOnline]);

  const total = wallet?.total_balance != null ? Number(wallet.total_balance) / 100 : 0;
  const availablePaise = wallet?.available_balance != null ? Number(wallet.available_balance) : 0;
  const offlineLimitPaise = wallet?.offline_limit != null ? Number(wallet.offline_limit) : 0;
  const offlineLimitRupees = offlineLimitPaise / 100;
  const offlineSpendableRupees = Math.min(availablePaise, offlineLimitPaise) / 100;
  const offlineRemainingPaise = Math.max(0, offlineLimitPaise - pendingSyncSum);
  const offlineRemainingRupees = offlineRemainingPaise / 100;

  return (
    <div className="min-h-screen bg-gray-50/95 pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-sm">
        <Logo compact />
        <div className="flex items-center gap-3">
          <Link href="/notifications" className="rounded-full p-2 text-primary transition hover:bg-gray-100" aria-label="Notifications">🔔</Link>
          <Link href="/settings" className="rounded-full p-2 text-primary transition hover:bg-gray-100" aria-label="Menu">☰</Link>
        </div>
      </header>

      <main className="mx-auto max-w-[440px] space-y-4 px-4 py-5">
        {user?.role === 'admin' && (
          <Link href="/admin" className="block rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 shadow-soft transition hover:border-primary/30 hover:bg-primary/10">
            <p className="font-bold text-primary">👤 Admin Panel</p>
            <p className="mt-1 text-sm text-gray-600">Manage users & add money to any wallet</p>
            <p className="mt-2 text-sm font-medium text-secondary">Tap to open →</p>
          </Link>
        )}

        <div className="rounded-2xl bg-white p-5 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Total Wallet Balance</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-primary">
            ₹{balanceVisible ? total.toFixed(2) : '••••••'}
            <button type="button" onClick={() => setBalanceVisible(!balanceVisible)} className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-primary" aria-label="Toggle visibility">👁</button>
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Offline Spendable</p>
          <p className="mt-2 text-xl font-bold text-primary">₹{balanceVisible ? offlineSpendableRupees.toFixed(2) : '••••'}</p>
          <p className="mt-1 text-xs text-gray-500">Min(balance, limit) · syncs when online</p>
        </div>

        <div className="rounded-2xl gradient-teal p-5 text-white shadow-card">
          <p className="text-xs font-medium uppercase tracking-wider opacity-90">Offline Limit Remaining</p>
          <p className="mt-2 text-sm leading-relaxed">
            You can spend ₹{offlineRemainingRupees.toFixed(0)} more offline (max ₹{offlineLimitRupees.toFixed(0)}). Pending outgoing: ₹{(pendingSyncSum / 100).toFixed(0)} · Pending incoming: ₹{(pendingIncomingSum / 100).toFixed(0)}
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/send" className="flex-1 rounded-xl bg-primary py-3.5 text-center font-semibold text-white shadow-soft transition hover:opacity-95 active:scale-[0.98]">
            Send →
          </Link>
          <Link href="/receive" className="flex-1 rounded-xl border-2 border-primary py-3.5 text-center font-semibold text-primary transition hover:bg-primary/5 active:scale-[0.98]">
            Receive
          </Link>
        </div>

        <section className="pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Quick Actions</h2>
          <div className="mt-3 flex justify-around gap-2 rounded-2xl bg-white p-4 shadow-soft">
            <Link href="/history" className="flex flex-col items-center gap-2 rounded-xl py-2 text-gray-600 transition hover:bg-gray-50 hover:text-primary">
              <span className="text-2xl">🕐</span>
              <span className="text-sm font-medium">History</span>
            </Link>
            <Link href="/add-money" className="flex flex-col items-center gap-2 rounded-xl py-2 text-gray-600 transition hover:bg-gray-50 hover:text-primary">
              <span className="text-2xl">➕</span>
              <span className="text-sm font-medium">Add Money</span>
            </Link>
            <Link href="/sync" className="flex flex-col items-center gap-2 rounded-xl py-2 text-gray-600 transition hover:bg-gray-50 hover:text-primary">
              <span className="text-2xl">🔄</span>
              <span className="text-sm font-medium">Sync Now</span>
            </Link>
          </div>
        </section>

        <section className="pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Recent Transactions</h2>
            <Link href="/history" className="text-sm font-medium text-secondary">See All</Link>
          </div>
          <div className="mt-3 rounded-2xl bg-white p-6 shadow-soft">
            <p className="text-center text-sm text-gray-500">No recent transactions</p>
          </div>
        </section>
      </main>
    </div>
  );
}
