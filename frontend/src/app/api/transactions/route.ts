import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const q = status ? `?status=${status}` : '';
  try {
    const res = await fetch(`${BACKEND}/transactions${q}`, { headers: { Authorization: auth } });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ success: false, transactions: [] }, { status: 503 });
  }
}
