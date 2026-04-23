'use client';

import Image from 'next/image';

const DARK_BLUE = '#0f172a';
const LIGHT_CYAN = '#22d3ee';

export function Logo({ className = '', dark, compact }: { className?: string; dark?: boolean; compact?: boolean }) {
  const size = compact ? 36 : 52;
  const strokeDark = dark ? '#e2e8f0' : DARK_BLUE;
  const strokeLight = dark ? '#bae6fd' : LIGHT_CYAN;

  // For compact usage (headers, icons), keep SVG mark.
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
          aria-hidden
        >
          <path
            d="M24 6 A18 18 0 0 1 24 42"
            stroke={strokeDark}
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M24 42 A18 18 0 0 1 24 6"
            stroke={strokeLight}
            strokeWidth="2.8"
            fill="none"
            strokeLinecap="round"
          />
          <text
            x="24"
            y="27"
            textAnchor="middle"
            fontSize="15"
            fontWeight="bold"
            fill={strokeLight}
            fontFamily="system-ui, sans-serif"
          >
            ₹
          </text>
          <path
            d="M14 30 L16 26 L15 26 L17 22 L13 26 L14 26 Z"
            fill={strokeLight}
            stroke={strokeLight}
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  // For big logo places (splash, onboarding, login, dashboard), use provided brand image.
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Image
        src="/syncpay-logo.png"
        alt="SyncPay – Pay Now. Sync Later."
        width={260}
        height={120}
        priority
        className="h-auto w-[220px] sm:w-[260px] object-contain"
      />
    </div>
  );
}

