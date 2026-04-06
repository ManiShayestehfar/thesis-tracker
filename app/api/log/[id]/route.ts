export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { LogEntry, Tag } from '@/lib/types';

interface Ctx { params: { id: string } }

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const id = parseInt(params.id, 10);
    const body = await req.json() as Partial<LogEntry> & { tags?: string[]; proof_ids?: number[]; chapter_ids?: number[] };

    db.prepare(`
      UPDATE log_entries SET
        date = COALESCE(?, date),
        body = COALESCE(?, body)
      WHERE id = ?
    `).run(body.date, body.body, id);

    if (body.tags !== undefined) {
      db.prepare('DELETE FROM log_tags WHERE entry_id = ?').run(id);
      for (const name of body.tags) {
        db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run(name);
        const tag = db.prepare('SELECT id FROM tags WHERE name = ?').get(name) as { id: number };
        db.prepare('INSERT OR IGNORE INTO log_tags (entry_id, tag_id) VALUES (?, ?)').run(id, tag.id);
      }
    }
    if (body.proof_ids !== undefined) {
      db.prepare('DELETE FROM log_proofs WHERE entry_id = ?').run(id);
      for (const pid of body.proof_ids) {
        db.prepare('INSERT OR IGNORE INTO log_proofs (entry_id, proof_id) VALUES (?, ?)').run(id, pid);
      }
    }
    if (body.chapter_ids !== undefined) {
      db.prepare('DELETE FROM log_chapters WHERE entry_id = ?').run(id);
      for (const cid of body.chapter_ids) {
        db.prepare('INSERT OR IGNORE INTO log_chapters (entry_id, chapter_id) VALUES (?, ?)').run(id, cid);
      }
    }

    const entry = db.prepare('SELECT * FROM log_entries WHERE id = ?').get(id) as LogEntry;
    const tags = db.prepare(
      'SELECT t.id, t.name FROM log_tags lt JOIN tags t ON t.id = lt.tag_id WHERE lt.entry_id = ?'
    ).all(id) as Tag[];
    const proofs = db.prepare(
      'SELECT p.id, p.label FROM log_proofs lp JOIN proofs p ON p.id = lp.proof_id WHERE lp.entry_id = ?'
    ).all(id) as { id: number; label: string }[];
    const chapters = db.prepare(
      'SELECT c.id, c.title FROM log_chapters lc JOIN chapters c ON c.id = lc.chapter_id WHERE lc.entry_id = ?'
    ).all(id) as { id: number; title: string }[];

    return NextResponse.json({ data: { ...entry, tags, linked_proofs: proofs, linked_chapters: chapters } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const id = parseInt(params.id, 10);
    db.prepare('DELETE FROM log_entries WHERE id = ?').run(id);
    return NextResponse.json({ data: { id } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
