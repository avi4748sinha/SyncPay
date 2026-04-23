import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization');
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(`${BACKEND}/auth/me`, {
      headers: { ...(auth ? { Authorization: auth } : {}) },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: 'Backend not reachable.' },
      { status: 503 }
    );
  }
}
