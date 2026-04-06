export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { rows, row, run, insert } from '@/lib/db';
import type { Milestone } from '@/lib/types';

async function attachChapters(milestones: Milestone[]): Promise<Milestone[]> {
  if (milestones.length === 0) return milestones;
  const ids = milestones.map(m => m.id);
  const ph = ids.map(() => '?').join(',');
  const chapters = await rows<{ milestone_id: number; id: number; title: string }>(
    `SELECT mc.milestone_id, c.id, c.title FROM milestone_chapters mc JOIN chapters c ON c.id = mc.chapter_id WHERE mc.milestone_id IN (${ph})`,
    ids
  );
  return milestones.map(m => ({
    ...m,
    linked_chapters: chapters.filter(c => c.milestone_id === m.id).map(c => ({ id: c.id, title: c.title })),
  }));
}

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];
    await run(`UPDATE milestones SET status = 'Overdue' WHERE due_date < ? AND status = 'Pending'`, [today]);
    const milestones = await rows<Milestone>('SELECT * FROM milestones ORDER BY due_date ASC');
    return NextResponse.json({ data: await attachChapters(milestones) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Partial<Milestone> & { chapter_ids?: number[] };
    const id = await insert(
      'INSERT INTO milestones (title, description, due_date, status) VALUES (?, ?, ?, ?)',
      [body.title ?? 'New Milestone', body.description ?? '', body.due_date ?? new Date().toISOString().split('T')[0], body.status ?? 'Pending']
    );

    if (body.chapter_ids?.length) {
      for (const cid of body.chapter_ids) {
        await run('INSERT INTO milestone_chapters (milestone_id, chapter_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [id, cid]);
      }
    }

    const ms = await row<Milestone>('SELECT * FROM milestones WHERE id = ?', [id]);
    const mss = await attachChapters([ms!]);
    return NextResponse.json({ data: mss[0] }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
