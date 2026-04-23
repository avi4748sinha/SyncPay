import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0f172a',
          dark: '#0a0f1a',
        },
        secondary: '#22d3ee',
        accent: {
          from: '#0d9488',
          to: '#22d3ee',
        },
        success: '#22c55e',
        warning: '#f97316',
        error: '#ef4444',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '1rem',
        button: '0.75rem',
      },
      boxShadow: {
        card: '0 4px 20px rgba(0,0,0,0.08)',
        soft: '0 2px 12px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
