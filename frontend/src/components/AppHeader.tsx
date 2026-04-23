'use client';

import Link from 'next/link';
import { Logo } from './Logo';

interface AppHeaderProps {
  title: string;
  backHref: string;
  dark?: boolean;
}

export function AppHeader({ title, backHref, dark }: AppHeaderProps) {
  const linkClass = dark ? 'text-white' : 'text-primary';
  return (
    <header className={`flex items-center gap-3 border-b px-4 py-3 ${dark ? 'border-white/10 bg-primary' : 'border-gray-100 bg-white shadow-sm'}`}>
      <Link href={backHref} className={`rounded-full p-1.5 text-lg font-medium transition hover:opacity-80 ${linkClass}`} aria-label="Back">←</Link>
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <Logo dark={dark} compact />
        <span className={`truncate text-base font-bold sm:text-lg ${linkClass}`}>{title}</span>
      </div>
    </header>
  );
}
