'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function SignupPage() {
  const [name, setName] = useState('');
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
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputRefs.current[i - 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 10);
    const next = [...digits];
    pasted.split('').forEach((c, j) => { if (j < 10) next[j] = c; });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, 9)]?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Enter your name'); return; }
    if (mobile.length !== 10) { setError('Enter 10-digit mobile number'); return; }
    setError('');
    setLoading(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), mobile_number: mobile }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        sessionStorage.setItem('otp_mobile', mobile);
        router.push('/otp');
      } else {
        setError(data.message || 'Signup failed');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') setError('Request timeout.');
      else setError('Cannot connect. Start backend.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 py-8">
      <div className="w-full max-w-[360px] flex flex-col items-center">
        <Logo className="mb-8" />
        <h1 className="text-center text-2xl font-bold text-primary">Create account</h1>
        <p className="mt-2 text-center text-gray-600">Sign up to use SyncPay</p>

        <form onSubmit={handleSubmit} className="mt-8">
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            placeholder="Your name"
            className="mt-1 w-full rounded-xl border-2 border-gray-200 px-4 py-3 focus:border-secondary focus:outline-none"
          />

          <label className="mt-4 block text-sm font-medium text-gray-700">Mobile number</label>
          <div className="mt-2 flex justify-center gap-2">
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
                className="h-12 w-9 rounded-lg border-2 border-gray-200 text-center text-lg font-bold text-primary focus:border-secondary focus:outline-none sm:w-10"
              />
            ))}
          </div>

          {error && <p className="mt-3 text-center text-sm font-medium text-error">{error}</p>}

          <button
            type="submit"
            disabled={loading || !name.trim() || mobile.length !== 10}
            className="mt-6 w-full rounded-xl bg-primary py-3.5 font-semibold text-white shadow-md disabled:opacity-60"
          >
            {loading ? 'Signing up...' : 'Sign up'}
          </button>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account? <Link href="/login" className="font-semibold text-secondary">Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
