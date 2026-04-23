import { getPendingTxns, markTxnSynced, markTxnFailed, type OfflineTransaction } from './idb';
import { getToken } from './api';

function decodeJwt(token: string | null): any | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(parts[1].length + (4 - (parts[1].length % 4)) % 4, '=');
    const json = atob(payload);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function syncPendingTransactions(): Promise<{
  synced: number;
  failed: number;
  failedReasons?: string[];
}> {
  const token = getToken();
  if (!token) return { synced: 0, failed: 0 };

  const decoded = decodeJwt(token);
  const senderId = (decoded?.userId || decoded?.id) as string | undefined;

  const allPending = await getPendingTxns();
  const pending = senderId ? allPending.filter((t) => t.sender_id === senderId) : allPending;
  if (pending.length === 0) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('syncpay-wallet-refresh'));
      window.dispatchEvent(new Event('syncpay-pending-refresh'));
    }
    return { synced: 0, failed: 0 };
  }

  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        transactions: pending.map((t) => ({
          txn_id: t.txn_id,
          sender_id: t.sender_id,
          receiver_id: t.receiver_id,
          amount: t.amount,
          timestamp: t.timestamp,
          signature: t.signature,
          device_id: t.device_id,
        })),
      }),
    });
    const data = await res.json();
    const results = data.results || data;
    if (!data.success) {
      const fr = (results.failed || []).map((f: { reason?: string }) => f.reason).filter(Boolean);
      return { synced: 0, failed: pending.length, failedReasons: fr.length ? fr : ['Request failed'] };
    }

    for (const r of results.synced || []) {
      await markTxnSynced(r.txn_id);
    }
    for (const f of results.failed || []) {
      await markTxnFailed(f.txn_id);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('syncpay-wallet-refresh'));
      window.dispatchEvent(new Event('syncpay-pending-refresh'));
    }

    const failedList = results.failed || [];
    const failedReasons = failedList.map((f: { reason?: string }) => f.reason).filter(Boolean) as string[];
    return {
      synced: (results.synced || []).length,
      failed: failedList.length,
      failedReasons: failedReasons.length ? failedReasons : undefined,
    };
  } catch {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('syncpay-wallet-refresh'));
      window.dispatchEvent(new Event('syncpay-pending-refresh'));
    }
    return { synced: 0, failed: pending.length };
  }
}

export function initSyncOnOnline(): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => {
    void syncPendingTransactions();
    void trySettleIncomingPending();
  };
  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}

/** When receiver is online, push pending incoming offline txns to central ledger (sender debited, receiver credited). */
export async function trySettleIncomingPending(): Promise<void> {
  const token = getToken();
  if (!token || typeof window === 'undefined' || !navigator.onLine) return;

  const decoded = decodeJwt(token);
  const userId = (decoded?.userId || decoded?.id) as string | undefined;
  if (!userId) return;

  const pending = await getPendingTxns();
  const incoming = pending.filter((t: OfflineTransaction) => t.receiver_id === userId && t.sender_id !== userId);

  for (const t of incoming) {
    try {
      const res = await fetch('/api/transactions/settle-offline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          txn_id: t.txn_id,
          sender_id: t.sender_id,
          receiver_id: t.receiver_id,
          amount: t.amount,
          timestamp: t.timestamp,
          signature: t.signature,
          device_id: t.device_id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) await markTxnSynced(t.txn_id);
    } catch {
      // ignore per-txn errors
    }
  }

  window.dispatchEvent(new Event('syncpay-wallet-refresh'));
  window.dispatchEvent(new Event('syncpay-pending-refresh'));
}
