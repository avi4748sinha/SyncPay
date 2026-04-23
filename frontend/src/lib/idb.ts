import { get, set, keys, createStore } from 'idb-keyval';

const DB_NAME = 'syncpay-offline';
const TXN_STORE = 'pending_transactions';

const store = typeof window !== 'undefined' ? createStore(DB_NAME, TXN_STORE) : null;

export interface OfflineTransaction {
  txn_id: string;
  sender_id: string;
  receiver_id: string;
  amount: number;
  timestamp: number;
  signature: string;
  device_id: string;
  sync_status: 'PENDING_SYNC' | 'SYNCED' | 'FAILED';
  note?: string;
}

export async function savePendingTxns(txns: OfflineTransaction[]): Promise<void> {
  if (!store) return;
  for (const t of txns) {
    await set(t.txn_id, t, store);
  }
}

export async function getPendingTxns(): Promise<OfflineTransaction[]> {
  if (!store) return [];
  const k = await keys(store);
  const out: OfflineTransaction[] = [];
  for (const key of k) {
    const v = await get(key, store);
    if (v && (v as OfflineTransaction).sync_status === 'PENDING_SYNC') out.push(v as OfflineTransaction);
  }
  return out;
}

export async function getPendingTxn(txnId: string): Promise<OfflineTransaction | null> {
  if (!store) return null;
  const v = await get(txnId, store);
  return (v as OfflineTransaction) || null;
}

/** Sum of amounts for pending (PENDING_SYNC) transactions where sender is this user (for offline limit remaining) */
export async function getPendingAmountBySender(senderId: string): Promise<number> {
  const list = await getPendingTxns();
  return list.filter((t) => t.sender_id === senderId).reduce((sum, t) => sum + t.amount, 0);
}

/** Sum of amounts for pending (PENDING_SYNC) transactions where receiver is this user (for showing pending received amount). */
export async function getPendingAmountByReceiver(receiverId: string): Promise<number> {
  const list = await getPendingTxns();
  return list.filter((t) => t.receiver_id === receiverId).reduce((sum, t) => sum + t.amount, 0);
}

export async function markTxnSynced(txnId: string): Promise<void> {
  if (!store) return;
  const t = await get(txnId, store);
  if (t) {
    (t as OfflineTransaction).sync_status = 'SYNCED';
    await set(txnId, t, store);
  }
}

export async function markTxnFailed(txnId: string): Promise<void> {
  if (!store) return;
  const t = await get(txnId, store);
  if (t) {
    (t as OfflineTransaction).sync_status = 'FAILED';
    await set(txnId, t, store);
  }
}
