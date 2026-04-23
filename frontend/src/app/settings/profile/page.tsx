'use client';

import { AppHeader } from '@/components/AppHeader';
import { useAuthStore } from '@/store/authStore';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Profile" backHref="/settings" />
      <div className="mx-auto max-w-[440px] space-y-4 p-4">
        <div className="rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-600 p-5 text-white shadow-md">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-2xl">
              {user?.name?.[0] || 'U'}
            </div>
            <div>
              <p className="text-lg font-semibold">{user?.name || 'User'}</p>
              <p className="text-sm opacity-90">{user?.mobile_number}</p>
              <p className="text-xs opacity-80">{user?.sync_id}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700">Basic details</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Name</dt>
              <dd className="max-w-[60%] truncate text-right font-medium text-primary">
                {user?.name || '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Mobile</dt>
              <dd className="font-medium text-primary">{user?.mobile_number}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Sync ID</dt>
              <dd className="max-w-[60%] truncate text-right font-medium text-primary">
                {user?.sync_id}
              </dd>
            </div>
          </dl>
        </div>

        <p className="text-xs text-gray-500">
          Profile editing is locked in this demo. In a real banking app this would be connected to KYC / account update
          flow.
        </p>
      </div>
    </div>
  );
}

