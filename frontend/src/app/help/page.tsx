'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { useAuthStore } from '@/store/authStore';

type Tab = 'ticket' | 'chat' | 'faq';

export default function HelpPage() {
  const [tab, setTab] = useState<Tab>('ticket');
  const searchParams = useSearchParams();
  const presetTxnId = searchParams.get('txn_id') || '';
  const presetAmount = searchParams.get('amount');
  const [category, setCategory] = useState('Payment Issue');
  const [txnId, setTxnId] = useState(presetTxnId);
  const [desc, setDesc] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const token = useAuthStore((s) => s.token);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError('Please login first.');
      return;
    }
    if (!desc.trim()) {
      setError('Please describe your issue.');
      return;
    }
    setStatus('sending');
    setError('');
    try {
      const res = await fetch('/api/admin/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: `${category}${txnId ? ` · ${txnId}` : ''}`,
          message: desc,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setStatus('done');
        setDesc('');
        setTxnId('');
      } else {
        setStatus('error');
        setError(data.message || 'Could not raise ticket.');
      }
    } catch {
      setStatus('error');
      setError('Network error.');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Help & Support" backHref="/settings" />
      <div className="p-4">
        <div className="mt-4 flex gap-4 border-b border-gray-200">
          <button
            onClick={() => setTab('ticket')}
            className={`pb-2 text-sm font-medium ${
              tab === 'ticket' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'
            }`}
          >
            Raise Ticket
          </button>
          <button
            onClick={() => setTab('chat')}
            className={`pb-2 text-sm font-medium ${
              tab === 'chat' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'
            }`}
          >
            Live Chat
          </button>
          <button
            onClick={() => setTab('faq')}
            className={`pb-2 text-sm font-medium ${
              tab === 'faq' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'
            }`}
          >
            FAQs
          </button>
        </div>
        {tab === 'ticket' && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-sm text-gray-600">Issue Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-2 w-full rounded-card border border-gray-200 px-4 py-3 focus:border-secondary focus:outline-none"
              >
                <option>Payment Issue</option>
                <option>Sync Issue</option>
                <option>Account</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">Transaction ID (Optional)</label>
              <input
                type="text"
                value={txnId}
                onChange={(e) => setTxnId(e.target.value)}
                placeholder="TXN123456"
                className="mt-2 w-full rounded-card border border-gray-200 px-4 py-3 focus:border-secondary focus:outline-none disabled:bg-gray-100"
                disabled={!!presetTxnId}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Describe your issue</label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder={
                  presetTxnId && presetAmount
                    ? `Issue with transaction ${presetTxnId} of ₹${(Number(presetAmount) / 100).toFixed(2)}`
                    : 'Please provide details...'
                }
                rows={4}
                className="mt-2 w-full rounded-card border border-gray-200 px-4 py-3 focus:border-secondary focus:outline-none"
              />
            </div>
            {error && <p className="text-xs font-medium text-error">{error}</p>}
            {status === 'done' && (
              <p className="text-xs font-medium text-green-600">Ticket submitted successfully.</p>
            )}
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full rounded-button gradient-teal py-3 font-medium text-white disabled:opacity-60"
            >
              {status === 'sending' ? 'Submitting…' : 'Submit Ticket'}
            </button>
            <div className="rounded-card border border-gray-200 p-4 text-center">
              <p className="text-sm text-primary">Call Support: 1800-123-4567</p>
            </div>
          </form>
        )}
        {tab === 'chat' && <p className="mt-8 text-center text-gray-500">Live chat coming soon</p>}
        {tab === 'faq' && <p className="mt-8 text-center text-gray-500">FAQs coming soon</p>}
      </div>
    </div>
  );
}
