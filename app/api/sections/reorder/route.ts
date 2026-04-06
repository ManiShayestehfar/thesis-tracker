export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PUT(req: Request) {
  try {
    const { ids } = await req.json() as { ids: number[] };
    const update = db.prepare('UPDATE sections SET order_index = ? WHERE id = ?');
    const tx = db.transaction(() => {
      ids.forEach((id, idx) => update.run(idx, id));
    });
    tx();
    return NextResponse.json({ data: { ok: true } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
