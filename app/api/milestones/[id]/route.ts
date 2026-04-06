export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Milestone } from '@/lib/types';

interface Ctx { params: { id: string } }

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const id = parseInt(params.id, 10);
    const body = await req.json() as Partial<Milestone> & { chapter_ids?: number[] };

    db.prepare(`
      UPDATE milestones SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        due_date = COALESCE(?, due_date),
        status = COALESCE(?, status)
      WHERE id = ?
    `).run(body.title, body.description, body.due_date, body.status, id);

    if (body.chapter_ids !== undefined) {
      db.prepare('DELETE FROM milestone_chapters WHERE milestone_id = ?').run(id);
      for (const cid of body.chapter_ids) {
        db.prepare('INSERT OR IGNORE INTO milestone_chapters (milestone_id, chapter_id) VALUES (?, ?)').run(id, cid);
      }
    }

    const ms = db.prepare('SELECT * FROM milestones WHERE id = ?').get(id) as Milestone;
    const chapters = db.prepare(
      'SELECT c.id, c.title FROM milestone_chapters mc JOIN chapters c ON c.id = mc.chapter_id WHERE mc.milestone_id = ?'
    ).all(id) as { id: number; title: string }[];
    return NextResponse.json({ data: { ...ms, linked_chapters: chapters } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const id = parseInt(params.id, 10);
    db.prepare('DELETE FROM milestones WHERE id = ?').run(id);
    return NextResponse.json({ data: { id } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
