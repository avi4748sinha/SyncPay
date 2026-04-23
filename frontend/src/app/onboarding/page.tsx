'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/Logo';

const slides = [
  { icon: '📶', title: 'Pay Offline', desc: 'Make instant payments even without internet connection.' },
  { icon: '📱', title: 'Instant QR', desc: 'Scan QR and generate dynamic payment codes.' },
  { icon: '🛡️', title: 'Secure Sync', desc: 'Bank grade encryption with automatic syncing.' },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 px-6 pt-10 pb-8">
      <div className="flex justify-center pb-8">
        <Logo />
      </div>
      <div className="flex-1 flex flex-col items-center">
        <div className="flex flex-col items-center text-center max-w-sm">
          <span className="text-5xl">{slides[step].icon}</span>
          <h1 className="mt-5 text-2xl font-bold text-primary">{slides[step].title}</h1>
          <p className="mt-3 text-gray-600 leading-relaxed">{slides[step].desc}</p>
        </div>
        <div className="mt-10 flex justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-2 w-8 rounded-full transition ${i === step ? 'bg-primary' : 'bg-gray-300'}`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-4">
        <Link href="/login" className="flex-1 rounded-xl border-2 border-primary py-3.5 text-center font-semibold text-primary">
          Skip
        </Link>
        {step < 2 ? (
          <button
            onClick={() => setStep(step + 1)}
            className="flex-1 rounded-xl gradient-teal py-3.5 font-semibold text-white shadow-soft"
          >
            Next
          </button>
        ) : (
          <Link href="/login" className="flex-1 rounded-xl gradient-teal py-3.5 text-center font-semibold text-white shadow-soft">
            Get Started
          </Link>
        )}
      </div>
    </div>
  );
}
