'use client';

import { usePathname } from 'next/navigation';
import { NetworkStatusBar } from './NetworkStatusBar';

const HIDE_BAR_PATHS = ['/', '/splash', '/onboarding', '/login', '/otp', '/signup'];

export function NetworkStatusBarWrapper() {
  const pathname = usePathname();
  const hide = HIDE_BAR_PATHS.includes(pathname || '');

  if (hide) return null;
  return <NetworkStatusBar />;
}
