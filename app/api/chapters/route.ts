export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Chapter, Section } from '@/lib/types';

export async function GET() {
  try {
    const chapters = db.prepare('SELECT * FROM chapters ORDER BY order_index').all() as Chapter[];
    const sections = db.prepare('SELECT * FROM sections ORDER BY order_index').all() as Section[];
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
    const maxOrder = (db.prepare('SELECT MAX(order_index) as m FROM chapters').get() as { m: number | null }).m ?? -1;
    const result = db.prepare(`
      INSERT INTO chapters (title, status, order_index, target_word_count, current_word_count, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      body.title ?? 'New Chapter',
      body.status ?? 'Not Started',
      maxOrder + 1,
      body.target_word_count ?? 0,
      body.current_word_count ?? 0,
      body.notes ?? ''
    );
    const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(result.lastInsertRowid) as Chapter;
    return NextResponse.json({ data: chapter }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
