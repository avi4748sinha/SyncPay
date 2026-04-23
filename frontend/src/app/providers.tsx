'use client';

import { useEffect } from 'react';
import { initSyncOnOnline } from '@/lib/syncEngine';
import { useAuthStore } from '@/store/authStore';

const TOKEN_KEY = 'syncpay_token';

/** Restores auth from localStorage: sets token and fetches /api/auth/me to get user (including role). */
function useRestoreAuth() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    if (!stored) return;
    if (token && user) return;

    if (!token) setAuth(stored, null);
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${stored}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.user) setAuth(stored, d.user);
      })
      .catch(() => {});
  }, [token, user, setAuth]);
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  useRestoreAuth();
  useEffect(() => {
    const cleanup = initSyncOnOnline();
    return cleanup;
  }, []);
  return <>{children}</>;
}
