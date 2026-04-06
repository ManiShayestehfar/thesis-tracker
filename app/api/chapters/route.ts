export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { rows, row, insert } from '@/lib/db';
import type { Chapter, Section } from '@/lib/types';

export async function GET() {
  try {
    const chapters = await rows<Chapter>('SELECT * FROM chapters ORDER BY order_index');
    const sections = await rows<Section>('SELECT * FROM sections ORDER BY order_index');
    const withSections = chapters.map(ch => ({
      ...ch,
      sections: sections.filter(s => s.chapter_id === ch.id),
    }));
    return NextResponse.json({ data: withSections });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Partial<Chapter>;
    const maxRow = await row<{ m: number | null }>('SELECT MAX(order_index) as m FROM chapters');
    const maxOrder = maxRow?.m ?? -1;
    const id = await insert(
      'INSERT INTO chapters (title, status, order_index, target_word_count, current_word_count, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [body.title ?? 'New Chapter', body.status ?? 'Not Started', maxOrder + 1, body.target_word_count ?? 0, body.current_word_count ?? 0, body.notes ?? '']
    );
    const chapter = await row<Chapter>('SELECT * FROM chapters WHERE id = ?', [id]);
    return NextResponse.json({ data: chapter }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
