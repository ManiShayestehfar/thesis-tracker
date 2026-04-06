export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Chapter } from '@/lib/types';

interface Ctx { params: { id: string } }

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const id = parseInt(params.id, 10);
    const body = await req.json() as Partial<Chapter>;
    db.prepare(`
      UPDATE chapters SET
        title = COALESCE(?, title),
        status = COALESCE(?, status),
        order_index = COALESCE(?, order_index),
        target_word_count = COALESCE(?, target_word_count),
        current_word_count = COALESCE(?, current_word_count),
        notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(body.title, body.status, body.order_index, body.target_word_count, body.current_word_count, body.notes, id);
    const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(id) as Chapter;
    return NextResponse.json({ data: chapter });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const id = parseInt(params.id, 10);
    db.prepare('DELETE FROM chapters WHERE id = ?').run(id);
    return NextResponse.json({ data: { id } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
