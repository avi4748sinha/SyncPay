'use client';

import { useEffect, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { useAuthStore } from '@/store/authStore';

interface Notif {
  id: string;
  type: string;
  title: string;
  body: string;
  created_at: string;
}

export default function NotificationsPage() {
  const token = useAuthStore((s) => s.token);
  const [list, setList] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => Array.isArray(d.notifications) && setList(d.notifications))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Notifications" backHref="/dashboard" />
      <div className="p-4">
        {loading && <p className="py-8 text-center text-gray-500">Loading...</p>}
        {!loading && list.length === 0 && (
          <div className="rounded-xl bg-white p-8 text-center shadow-soft">
            <p className="text-gray-500">No notifications yet</p>
            <p className="mt-1 text-sm text-gray-400">Payment and sync updates will appear here</p>
          </div>
        )}
        {!loading && list.length > 0 && (
          <div className="space-y-3">
            {list.map((n) => (
              <div key={n.id} className="rounded-xl bg-white p-4 shadow-soft">
                <p className="font-semibold text-primary">{n.title}</p>
                {n.body && <p className="mt-1 text-sm text-gray-600">{n.body}</p>}
                <p className="mt-1 text-xs text-gray-400">
                  {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
