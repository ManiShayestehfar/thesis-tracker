export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { rows, row, run, insert } from '@/lib/db';
import type { LogEntry, Tag } from '@/lib/types';

async function attachRelations(entries: LogEntry[]): Promise<LogEntry[]> {
  if (entries.length === 0) return entries;
  const ids = entries.map(e => e.id);
  const ph = ids.map(() => '?').join(',');

  const [tags, proofs, chapters] = await Promise.all([
    rows<{ entry_id: number; id: number; name: string }>(
      `SELECT lt.entry_id, t.id, t.name FROM log_tags lt JOIN tags t ON t.id = lt.tag_id WHERE lt.entry_id IN (${ph})`, ids
    ),
    rows<{ entry_id: number; id: number; label: string }>(
      `SELECT lp.entry_id, p.id, p.label FROM log_proofs lp JOIN proofs p ON p.id = lp.proof_id WHERE lp.entry_id IN (${ph})`, ids
    ),
    rows<{ entry_id: number; id: number; title: string }>(
      `SELECT lc.entry_id, c.id, c.title FROM log_chapters lc JOIN chapters c ON c.id = lc.chapter_id WHERE lc.entry_id IN (${ph})`, ids
    ),
  ]);

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

    const entries = await rows<LogEntry>(sql, args);
    return NextResponse.json({ data: await attachRelations(entries) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Partial<LogEntry> & { tags?: string[]; proof_ids?: number[]; chapter_ids?: number[] };
    const now = new Date().toISOString();
    const date = body.date ?? now.split('T')[0];

    const id = await insert('INSERT INTO log_entries (date, body, created_at) VALUES (?, ?, ?)', [date, body.body ?? '', now]);

    if (body.tags?.length) {
      for (const name of body.tags) {
        await run('INSERT INTO tags (name) VALUES (?) ON CONFLICT (name) DO NOTHING', [name]);
        const tag = await row<{ id: number }>('SELECT id FROM tags WHERE name = ?', [name]);
        if (tag) await run('INSERT INTO log_tags (entry_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [id, tag.id]);
      }
    }
    if (body.proof_ids?.length) {
      for (const pid of body.proof_ids) {
        await run('INSERT INTO log_proofs (entry_id, proof_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [id, pid]);
      }
    }
    if (body.chapter_ids?.length) {
      for (const cid of body.chapter_ids) {
        await run('INSERT INTO log_chapters (entry_id, chapter_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [id, cid]);
      }
    }

    const entry = await row<LogEntry>('SELECT * FROM log_entries WHERE id = ?', [id]);
    const entries = await attachRelations([entry!]);
    return NextResponse.json({ data: entries[0] }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
