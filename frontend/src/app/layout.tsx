import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { NetworkStatusBarWrapper } from '@/components/NetworkStatusBarWrapper';
import { SyncProvider } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'SyncPay – Pay Now. Sync Later.',
  description: 'Offline-first digital wallet',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen">
        <SyncProvider>
          <NetworkStatusBarWrapper />
          <main className="app-container mx-auto">{children}</main>
        </SyncProvider>
      </body>
    </html>
  );
}
