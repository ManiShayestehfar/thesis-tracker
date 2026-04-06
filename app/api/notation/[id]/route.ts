export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { NotationEntry } from '@/lib/types';

interface Ctx { params: { id: string } }

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const id = parseInt(params.id, 10);
    const body = await req.json() as Partial<NotationEntry>;
    db.prepare(`
      UPDATE notation SET
        symbol = COALESCE(?, symbol),
        latex = COALESCE(?, latex),
        definition = COALESCE(?, definition),
        first_used_chapter_id = ?
      WHERE id = ?
    `).run(
      body.symbol, body.latex, body.definition,
      body.first_used_chapter_id !== undefined ? body.first_used_chapter_id : db.prepare('SELECT first_used_chapter_id FROM notation WHERE id = ?').get(id) as number | null,
      id
    );
    const entry = db.prepare(
      'SELECT n.*, c.title as chapter_title FROM notation n LEFT JOIN chapters c ON c.id = n.first_used_chapter_id WHERE n.id = ?'
    ).get(id) as NotationEntry;
    return NextResponse.json({ data: entry });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const id = parseInt(params.id, 10);
    db.prepare('DELETE FROM notation WHERE id = ?').run(id);
    return NextResponse.json({ data: { id } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
