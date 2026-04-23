'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { Logo } from '@/components/Logo';

export default function OTPPage() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mobile, setMobile] = useState<string | null>(null);
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    setMobile(sessionStorage.getItem('otp_mobile'));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mobile || otp.length !== 6) {
      setError('Enter 6-digit OTP');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile_number: mobile, otp }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('syncpay_token', data.token);
        setAuth(data.token, data.user);
        if (data.user?.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      } else {
        setError(data.message || 'Invalid or expired OTP');
      }
    } catch (err) {
      setError('Server not reachable. Start backend.');
    } finally {
      setLoading(false);
    }
  }

  if (!mobile) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <p className="text-gray-600">No mobile found. <Link href="/login" className="text-secondary font-medium">Login</Link></p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-50 px-6 pt-8">
      <div className="w-full max-w-[360px]">
        <Logo className="mb-6" />
        <h1 className="text-2xl font-bold text-primary">Verify OTP</h1>
      <p className="mt-2 text-gray-600">Enter the 6-digit code sent to {mobile}</p>
      <form onSubmit={handleSubmit} className="mt-8">
        <input
          type="password"
          inputMode="numeric"
          placeholder="••••••"
          value={otp}
          onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
          className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-center text-2xl tracking-[0.4em] shadow-soft focus:border-secondary focus:outline-none"
          maxLength={6}
          autoComplete="one-time-code"
        />
        {error && <p className="mt-3 text-center text-sm text-error">{error}</p>}
        <button
          type="submit"
          disabled={loading || otp.length !== 6}
          className="mt-6 w-full rounded-xl bg-primary py-3.5 font-semibold text-white disabled:opacity-60"
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>
      </form>
      <button type="button" className="mt-4 text-center text-sm text-secondary">Resend OTP</button>
      </div>
    </div>
  );
}
