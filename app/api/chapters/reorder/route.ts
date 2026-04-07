export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { run } from '@/lib/db';
import { requireUserId } from '@/lib/auth';

export async function PUT(req: Request) {
  try {
    const userId = await requireUserId();
    const { ids } = await req.json() as { ids: number[] };
    await Promise.all(ids.map((id, idx) => run('UPDATE chapters SET order_index = ? WHERE id = ? AND user_id = ?', [idx, id, userId])));
    return NextResponse.json({ data: { ok: true } });
  } catch (e) {
    const msg = String(e);
    return NextResponse.json({ error: msg }, { status: msg.includes('Unauthorized') ? 401 : 500 });
  }
}
