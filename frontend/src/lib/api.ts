const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('syncpay_token');
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data as T;
}

export const authApi = {
  login: (mobile: string) => api<{ success: boolean; dev_otp?: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ mobile_number: mobile }) }),
  verifyOtp: (mobile: string, otp: string) =>
    api<{ success: boolean; token: string; user: { id: string; name: string; mobile_number: string; sync_id: string } }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ mobile_number: mobile, otp }),
    }),
  me: () => api<{ user: unknown }>('/auth/me'),
};

export const walletApi = {
  get: () => api<{ wallet: { total_balance: number; available_balance: number; offline_limit: number } }>('/wallet'),
};

export const transactionsApi = {
  list: (params?: { status?: string }) => {
    const q = params?.status ? `?status=${params.status}` : '';
    return api<{ transactions: unknown[] }>(`/transactions${q}`);
  },
  sync: (transactions: unknown[]) =>
    api<{ synced: number; failed: number; results: { synced: { txn_id: string }[]; failed: { txn_id: string; reason: string }[] } }>('/sync-transactions', {
      method: 'POST',
      body: JSON.stringify({ transactions }),
    }),
};
