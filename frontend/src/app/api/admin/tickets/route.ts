import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

// Admin listing of tickets
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  try {
    const res = await fetch(`${BACKEND}/admin/tickets`, { headers: { Authorization: auth } });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: true, tickets: [] }, { status: 200 });
  }
}

// User raising ticket (proxy to /support/tickets)
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND}/support/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: auth,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, message: 'Backend not reachable' }, { status: 503 });
  }
}
