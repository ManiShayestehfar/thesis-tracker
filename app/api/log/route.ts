export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { LogEntry, Tag } from '@/lib/types';

function attachRelations(entries: LogEntry[]): LogEntry[] {
  if (entries.length === 0) return entries;
  const ids = entries.map(e => e.id);
  const ph = ids.map(() => '?').join(',');

  const tags = db.prepare(
    `SELECT lt.entry_id, t.id, t.name FROM log_tags lt JOIN tags t ON t.id = lt.tag_id WHERE lt.entry_id IN (${ph})`
  ).all(...ids) as { entry_id: number; id: number; name: string }[];

  const proofs = db.prepare(
    `SELECT lp.entry_id, p.id, p.label FROM log_proofs lp JOIN proofs p ON p.id = lp.proof_id WHERE lp.entry_id IN (${ph})`
  ).all(...ids) as { entry_id: number; id: number; label: string }[];

  const chapters = db.prepare(
    `SELECT lc.entry_id, c.id, c.title FROM log_chapters lc JOIN chapters c ON c.id = lc.chapter_id WHERE lc.entry_id IN (${ph})`
  ).all(...ids) as { entry_id: number; id: number; title: string }[];

  return entries.map(e => ({
    ...e,
    tags: tags.filter(t => t.entry_id === e.id).map(t => ({ id: t.id, name: t.name }) as Tag),
    linked_proofs: proofs.filter(p => p.entry_id === e.id).map(p => ({ id: p.id, label: p.label })),
    linked_chapters: chapters.filter(c => c.entry_id === e.id).map(c => ({ id: c.id, title: c.title })),
  }));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tag = searchParams.get('tag');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const limit = searchParams.get('limit');

    let sql = 'SELECT * FROM log_entries WHERE 1=1';
    const args: (string | number)[] = [];

    if (from) { sql += ' AND date >= ?'; args.push(from); }
    if (to) { sql += ' AND date <= ?'; args.push(to); }
    if (tag) {
      sql += ' AND id IN (SELECT lt.entry_id FROM log_tags lt JOIN tags t ON t.id = lt.tag_id WHERE t.name = ?)';
      args.push(tag);
    }
    sql += ' ORDER BY date DESC, created_at DESC';
    if (limit) { sql += ' LIMIT ?'; args.push(parseInt(limit, 10)); }

    const entries = db.prepare(sql).all(...args) as LogEntry[];
    return NextResponse.json({ data: attachRelations(entries) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Partial<LogEntry> & { tags?: string[]; proof_ids?: number[]; chapter_ids?: number[] };
    const now = new Date().toISOString();
    const date = body.date ?? now.split('T')[0];

    const result = db.prepare(
      'INSERT INTO log_entries (date, body, created_at) VALUES (?, ?, ?)'
    ).run(date, body.body ?? '', now);
    const id = result.lastInsertRowid as number;

    if (body.tags?.length) {
      for (const name of body.tags) {
        db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run(name);
        const tag = db.prepare('SELECT id FROM tags WHERE name = ?').get(name) as { id: number };
        db.prepare('INSERT OR IGNORE INTO log_tags (entry_id, tag_id) VALUES (?, ?)').run(id, tag.id);
      }
    }
    if (body.proof_ids?.length) {
      for (const pid of body.proof_ids) {
        db.prepare('INSERT OR IGNORE INTO log_proofs (entry_id, proof_id) VALUES (?, ?)').run(id, pid);
      }
    }
    if (body.chapter_ids?.length) {
      for (const cid of body.chapter_ids) {
        db.prepare('INSERT OR IGNORE INTO log_chapters (entry_id, chapter_id) VALUES (?, ?)').run(id, cid);
      }
    }

    const entry = db.prepare('SELECT * FROM log_entries WHERE id = ?').get(id) as LogEntry;
    const entries = attachRelations([entry]);
    return NextResponse.json({ data: entries[0] }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
