export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { rows, row, run } from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import type { Milestone } from '@/lib/types';

interface Ctx { params: { id: string } }

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const userId = await requireUserId();
    const id = parseInt(params.id, 10);
    const body = await req.json() as Partial<Milestone> & { chapter_ids?: number[] };

    await run(`
      UPDATE milestones SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        due_date = COALESCE(?, due_date),
        status = COALESCE(?, status)
      WHERE id = ? AND user_id = ?
    `, [body.title, body.description, body.due_date, body.status, id, userId]);

    if (body.chapter_ids !== undefined) {
      await run('DELETE FROM milestone_chapters WHERE milestone_id = ?', [id]);
      for (const cid of body.chapter_ids) {
        await run('INSERT INTO milestone_chapters (milestone_id, chapter_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [id, cid]);
      }
    }

    const ms = await row<Milestone>('SELECT * FROM milestones WHERE id = ? AND user_id = ?', [id, userId]);
    const chapters = await rows<{ id: number; title: string }>(
      'SELECT c.id, c.title FROM milestone_chapters mc JOIN chapters c ON c.id = mc.chapter_id WHERE mc.milestone_id = ?', [id]
    );
    return NextResponse.json({ data: { ...ms, linked_chapters: chapters } });
  } catch (e) {
    const msg = String(e);
    return NextResponse.json({ error: msg }, { status: msg.includes('Unauthorized') ? 401 : 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const userId = await requireUserId();
    const id = parseInt(params.id, 10);
    await run('DELETE FROM milestones WHERE id = ? AND user_id = ?', [id, userId]);
    return NextResponse.json({ data: { id } });
  } catch (e) {
    const msg = String(e);
    return NextResponse.json({ error: msg }, { status: msg.includes('Unauthorized') ? 401 : 500 });
  }
}
