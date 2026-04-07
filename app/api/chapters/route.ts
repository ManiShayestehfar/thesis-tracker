export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { rows, row, insert } from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import type { Chapter, Section } from '@/lib/types';

export async function GET() {
  try {
    const userId = await requireUserId();
    const chapters = await rows<Chapter>('SELECT * FROM chapters WHERE user_id = ? ORDER BY order_index', [userId]);
    const sections = chapters.length > 0
      ? await rows<Section>(`SELECT * FROM sections WHERE chapter_id IN (${chapters.map(() => '?').join(',')}) ORDER BY order_index`, chapters.map(c => c.id))
      : [];
    const withSections = chapters.map(ch => ({
      ...ch,
      sections: sections.filter(s => s.chapter_id === ch.id),
    }));
    return NextResponse.json({ data: withSections });
  } catch (e) {
    const msg = String(e);
    return NextResponse.json({ error: msg }, { status: msg.includes('Unauthorized') ? 401 : 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json() as Partial<Chapter>;
    const maxRow = await row<{ m: number | null }>('SELECT MAX(order_index) as m FROM chapters WHERE user_id = ?', [userId]);
    const maxOrder = maxRow?.m ?? -1;
    const id = await insert(
      'INSERT INTO chapters (user_id, title, status, order_index, target_word_count, current_word_count, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, body.title ?? 'New Chapter', body.status ?? 'Not Started', maxOrder + 1, body.target_word_count ?? 0, body.current_word_count ?? 0, body.notes ?? '']
    );
    const chapter = await row<Chapter>('SELECT * FROM chapters WHERE id = ?', [id]);
    return NextResponse.json({ data: chapter }, { status: 201 });
  } catch (e) {
    const msg = String(e);
    return NextResponse.json({ error: msg }, { status: msg.includes('Unauthorized') ? 401 : 500 });
  }
}
