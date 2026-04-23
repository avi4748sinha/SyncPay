'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.push('/onboarding'), 2500);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gradient-bg px-6">
      <Logo className="flex-col gap-5" dark />
      <div className="mt-10 flex gap-1.5">
        <span className="h-2 w-2 animate-bounce rounded-full bg-secondary/90 [animation-delay:0ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-secondary/90 [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-secondary/90 [animation-delay:300ms]" />
      </div>
    </div>
  );
}
