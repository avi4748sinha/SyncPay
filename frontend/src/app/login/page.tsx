'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/Logo';

// Same-origin API route = no CORS, no timeout if backend is up
const API_URL = '';

export default function LoginPage() {
  const [digits, setDigits] = useState<string[]>(Array(10).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const mobile = digits.join('');

  function handleDigitChange(i: number, v: string) {
    const char = v.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = char;
    setDigits(next);
    setError('');
    if (char && i < 9) inputRefs.current[i + 1]?.focus();
    if (!char && i > 0) inputRefs.current[i - 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 10);
    const next = [...digits];
    pasted.split('').forEach((c, j) => { if (j < 10) next[j] = c; });
    setDigits(next);
    const focusIdx = Math.min(pasted.length, 9);
    inputRefs.current[focusIdx]?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mobile.length !== 10) {
      setError('Enter 10-digit mobile number');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(API_URL ? `${API_URL}/auth/login` : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile_number: mobile }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        sessionStorage.setItem('otp_mobile', mobile);
        router.push('/otp');
      } else {
        setError(data.message || (res.status === 400 && data.errors ? 'Invalid mobile' : 'Login failed'));
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') setError('Request timeout. Check backend.');
        else setError('Cannot connect. Is backend running? npm run dev in backend folder.');
      } else {
        setError('Cannot connect. Start backend on port 4001.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 py-8">
      <div className="w-full max-w-[360px] flex flex-col items-center">
        <Logo className="mb-8" />
        <h1 className="text-center text-2xl font-bold text-primary">Welcome Back</h1>
        <p className="mt-2 text-center text-sm text-gray-600">Enter your mobile number to continue</p>

        <form onSubmit={handleSubmit} className="mt-10">
          <div className="flex justify-center gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                className="h-14 w-10 rounded-xl border-2 border-gray-200 text-center text-xl font-bold text-primary transition focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
              />
            ))}
          </div>

          {error && (
            <p className="mt-4 text-center text-sm font-medium text-error">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || mobile.length !== 10}
            className="mt-8 w-full rounded-xl bg-primary py-3.5 font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-60"
          >
            {loading ? 'Sending...' : 'Continue'}
          </button>

          <p className="mt-6 text-center text-sm text-gray-600">
            New user?{' '}
            <Link href="/signup" className="font-semibold text-secondary">Sign up</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
