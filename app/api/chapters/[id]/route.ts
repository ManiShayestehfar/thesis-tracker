export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { row, run } from '@/lib/db';
import type { Chapter } from '@/lib/types';

interface Ctx { params: { id: string } }

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const id = parseInt(params.id, 10);
    const body = await req.json() as Partial<Chapter>;
    await run(`
      UPDATE chapters SET
        title = COALESCE(?, title),
        status = COALESCE(?, status),
        order_index = COALESCE(?, order_index),
        target_word_count = COALESCE(?, target_word_count),
        current_word_count = COALESCE(?, current_word_count),
        notes = COALESCE(?, notes)
      WHERE id = ?
    `, [body.title, body.status, body.order_index, body.target_word_count, body.current_word_count, body.notes, id]);
    const chapter = await row<Chapter>('SELECT * FROM chapters WHERE id = ?', [id]);
    return NextResponse.json({ data: chapter });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const id = parseInt(params.id, 10);
    await run('DELETE FROM chapters WHERE id = ?', [id]);
    return NextResponse.json({ data: { id } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
