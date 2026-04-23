'use client';

import { useNetworkStore } from '@/store/networkStore';
import Link from 'next/link';

const OFFLINE_LIMIT = 5000;

export function NetworkStatusBar() {
  const isOnline = useNetworkStore((s) => s.isOnline);

  return (
    <div
      className={`sticky top-0 z-50 w-full px-4 py-2 text-center text-sm font-medium text-white shadow-md ${
        isOnline ? 'bg-success' : 'bg-warning'
      }`}
    >
      {isOnline ? (
        <span className="flex items-center justify-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-white" />
          ONLINE – Synced
        </span>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span>OFFLINE MODE – You can spend up to ₹{OFFLINE_LIMIT.toLocaleString()}</span>
          <Link
            href="/sync"
            className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30"
          >
            Sync Now
          </Link>
        </div>
      )}
    </div>
  );
}
