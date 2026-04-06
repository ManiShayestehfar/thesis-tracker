export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { row, run } from '@/lib/db';
import type { NotationEntry } from '@/lib/types';

interface Ctx { params: { id: string } }

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const id = parseInt(params.id, 10);
    const body = await req.json() as Partial<NotationEntry>;
    const current = await row<NotationEntry>('SELECT * FROM notation WHERE id = ?', [id]);
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await run(`
      UPDATE notation SET
        symbol = COALESCE(?, symbol),
        latex = COALESCE(?, latex),
        definition = COALESCE(?, definition),
        first_used_chapter_id = ?
      WHERE id = ?
    `, [
      body.symbol, body.latex, body.definition,
      body.first_used_chapter_id !== undefined ? body.first_used_chapter_id : current.first_used_chapter_id,
      id,
    ]);

    const entry = await row<NotationEntry>(
      'SELECT n.*, c.title as chapter_title FROM notation n LEFT JOIN chapters c ON c.id = n.first_used_chapter_id WHERE n.id = ?', [id]
    );
    return NextResponse.json({ data: entry });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const id = parseInt(params.id, 10);
    await run('DELETE FROM notation WHERE id = ?', [id]);
    return NextResponse.json({ data: { id } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
