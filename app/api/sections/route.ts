export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Section } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const body = await req.json() as Partial<Section> & { chapter_id: number };
    const maxOrder = (db.prepare(
      'SELECT MAX(order_index) as m FROM sections WHERE chapter_id = ?'
    ).get(body.chapter_id) as { m: number | null }).m ?? -1;

    const result = db.prepare(`
      INSERT INTO sections (chapter_id, title, status, order_index, target_word_count, current_word_count, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      body.chapter_id,
      body.title ?? 'New Section',
      body.status ?? 'Not Started',
      maxOrder + 1,
      body.target_word_count ?? 0,
      body.current_word_count ?? 0,
      body.notes ?? ''
    );
    const section = db.prepare('SELECT * FROM sections WHERE id = ?').get(result.lastInsertRowid) as Section;
    return NextResponse.json({ data: section }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
