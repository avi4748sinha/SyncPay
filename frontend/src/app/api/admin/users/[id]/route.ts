import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = req.headers.get('authorization');
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  try {
    const res = await fetch(`${BACKEND}/admin/users/${params.id}`, {
      headers: { Authorization: auth },
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, message: 'Request failed' }, { status: 503 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = req.headers.get('authorization');
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  try {
    const res = await fetch(`${BACKEND}/admin/users/${params.id}`, {
      method: 'DELETE',
      headers: { Authorization: auth },
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ success: false, message: 'Request failed' }, { status: 503 });
  }
}
