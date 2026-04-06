export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { run } from '@/lib/db';

export async function PUT(req: Request) {
  try {
    const { ids } = await req.json() as { ids: number[] };
    await Promise.all(ids.map((id, idx) => run('UPDATE sections SET order_index = ? WHERE id = ?', [idx, id])));
    return NextResponse.json({ data: { ok: true } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
