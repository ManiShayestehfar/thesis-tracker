export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { rows, row, run } from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import type { LogEntry, Tag } from '@/lib/types';

interface Ctx { params: { id: string } }

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const userId = await requireUserId();
    const id = parseInt(params.id, 10);
    const body = await req.json() as Partial<LogEntry> & { tags?: string[]; proof_ids?: number[]; chapter_ids?: number[] };

    await run(`
      UPDATE log_entries SET
        date = COALESCE(?, date),
        body = COALESCE(?, body)
      WHERE id = ? AND user_id = ?
    `, [body.date, body.body, id, userId]);

    if (body.tags !== undefined) {
      await run('DELETE FROM log_tags WHERE entry_id = ?', [id]);
      for (const name of body.tags) {
        await run('INSERT INTO tags (user_id, name) VALUES (?, ?) ON CONFLICT (user_id, name) DO NOTHING', [userId, name]);
        const tag = await row<{ id: number }>('SELECT id FROM tags WHERE user_id = ? AND name = ?', [userId, name]);
        if (tag) await run('INSERT INTO log_tags (entry_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [id, tag.id]);
      }
    }
    if (body.proof_ids !== undefined) {
      await run('DELETE FROM log_proofs WHERE entry_id = ?', [id]);
      for (const pid of body.proof_ids) {
        await run('INSERT INTO log_proofs (entry_id, proof_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [id, pid]);
      }
    }
    if (body.chapter_ids !== undefined) {
      await run('DELETE FROM log_chapters WHERE entry_id = ?', [id]);
      for (const cid of body.chapter_ids) {
        await run('INSERT INTO log_chapters (entry_id, chapter_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [id, cid]);
      }
    }

    const entry = await row<LogEntry>('SELECT * FROM log_entries WHERE id = ?', [id]);
    const [tags, proofs, chapters] = await Promise.all([
      rows<Tag>('SELECT t.id, t.name FROM log_tags lt JOIN tags t ON t.id = lt.tag_id WHERE lt.entry_id = ?', [id]),
      rows<{ id: number; label: string }>('SELECT p.id, p.label FROM log_proofs lp JOIN proofs p ON p.id = lp.proof_id WHERE lp.entry_id = ?', [id]),
      rows<{ id: number; title: string }>('SELECT c.id, c.title FROM log_chapters lc JOIN chapters c ON c.id = lc.chapter_id WHERE lc.entry_id = ?', [id]),
    ]);

    return NextResponse.json({ data: { ...entry, tags, linked_proofs: proofs, linked_chapters: chapters } });
  } catch (e) {
    const msg = String(e);
    return NextResponse.json({ error: msg }, { status: msg.includes('Unauthorized') ? 401 : 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const userId = await requireUserId();
    const id = parseInt(params.id, 10);
    await run('DELETE FROM log_entries WHERE id = ? AND user_id = ?', [id, userId]);
    return NextResponse.json({ data: { id } });
  } catch (e) {
    const msg = String(e);
    return NextResponse.json({ error: msg }, { status: msg.includes('Unauthorized') ? 401 : 500 });
  }
}
