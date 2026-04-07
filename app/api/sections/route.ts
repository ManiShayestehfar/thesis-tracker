export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { row, insert } from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import type { Section } from '@/lib/types';

export async function POST(req: Request) {
  try {
    await requireUserId();
    const body = await req.json() as Partial<Section> & { chapter_id: number };
    const maxRow = await row<{ m: number | null }>(
      'SELECT MAX(order_index) as m FROM sections WHERE chapter_id = ?', [body.chapter_id]
    );
    const maxOrder = maxRow?.m ?? -1;
    const id = await insert(
      'INSERT INTO sections (chapter_id, title, status, order_index, target_word_count, current_word_count, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [body.chapter_id, body.title ?? 'New Section', body.status ?? 'Not Started', maxOrder + 1, body.target_word_count ?? 0, body.current_word_count ?? 0, body.notes ?? '']
    );
    const section = await row<Section>('SELECT * FROM sections WHERE id = ?', [id]);
    return NextResponse.json({ data: section }, { status: 201 });
  } catch (e) {
    const msg = String(e);
    return NextResponse.json({ error: msg }, { status: msg.includes('Unauthorized') ? 401 : 500 });
  }
}
