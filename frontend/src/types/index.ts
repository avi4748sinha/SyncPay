export type SyncStatus = 'PENDING_SYNC' | 'SYNCED' | 'FAILED';

export interface User {
  id: string;
  name: string;
  mobile_number: string;
  sync_id: string;
  role?: 'user' | 'admin';
}

export interface Wallet {
  id: string;
  user_id: string;
  total_balance: number;
  offline_reserved: number;
  available_balance: number;
  offline_limit: number;
}

export interface Transaction {
  txn_id: string;
  sender_id: string;
  receiver_id: string;
  sender_name?: string;
  receiver_name?: string;
  amount: number;
  status: string;
  sync_status: SyncStatus;
  note?: string;
  created_at: string;
  synced_at?: string;
  direction?: 'sent' | 'received';
}

export interface ReceiverQRPayload {
  receiver_id: string;
  wallet_id: string;
  device_id: string;
  session_id: string;
  timestamp: number;
}

export interface SenderFinalQRPayload {
  txn_id: string;
  sender_id: string;
  receiver_id: string;
  amount: number;
  timestamp: number;
  signature: string;
  device_id: string;
}
