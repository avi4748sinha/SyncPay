import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  try {
    const url = new URL(req.url);
    const limit = url.searchParams.get('limit') || '50';
    const res = await fetch(`${BACKEND}/admin/transactions?limit=${limit}`, { headers: { Authorization: auth } });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ success: false, transactions: [] }, { status: 503 });
  }
}
