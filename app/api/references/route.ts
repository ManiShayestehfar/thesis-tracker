export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Reference } from '@/lib/types';

function attachRelations(refs: Reference[]): Reference[] {
  if (refs.length === 0) return refs;
  const ids = refs.map(r => r.id);
  const ph = ids.map(() => '?').join(',');

  const chapters = db.prepare(
    `SELECT rc.ref_id, c.id, c.title FROM ref_chapters rc JOIN chapters c ON c.id = rc.chapter_id WHERE rc.ref_id IN (${ph})`
  ).all(...ids) as { ref_id: number; id: number; title: string }[];

  const proofs = db.prepare(
    `SELECT rp.ref_id, p.id, p.label FROM ref_proofs rp JOIN proofs p ON p.id = rp.proof_id WHERE rp.ref_id IN (${ph})`
  ).all(...ids) as { ref_id: number; id: number; label: string }[];

  return refs.map(r => ({
    ...r,
    linked_chapters: chapters.filter(c => c.ref_id === r.id).map(c => ({ id: c.id, title: c.title })),
    linked_proofs: proofs.filter(p => p.ref_id === r.id).map(p => ({ id: p.id, label: p.label })),
  }));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const q = searchParams.get('q');

    let sql = 'SELECT * FROM refs WHERE 1=1';
    const args: (string | number)[] = [];

    if (status) { sql += ' AND read_status = ?'; args.push(status); }
    if (q) {
      sql += ' AND (title LIKE ? OR authors LIKE ? OR citation_key LIKE ?)';
      const like = `%${q}%`;
      args.push(like, like, like);
    }
    sql += ' ORDER BY year DESC, authors ASC';

    const refs = db.prepare(sql).all(...args) as Reference[];
    return NextResponse.json({ data: attachRelations(refs) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Partial<Reference> & { chapter_ids?: number[]; proof_ids?: number[] };
    const result = db.prepare(`
      INSERT INTO refs (citation_key, title, authors, year, journal, doi, url, notes, read_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      body.citation_key ?? '',
      body.title ?? '',
      body.authors ?? '',
      body.year ?? null,
      body.journal ?? '',
      body.doi ?? '',
      body.url ?? '',
      body.notes ?? '',
      body.read_status ?? 'Unread'
    );
    const id = result.lastInsertRowid as number;

    if (body.chapter_ids?.length) {
      for (const cid of body.chapter_ids) {
        db.prepare('INSERT OR IGNORE INTO ref_chapters (ref_id, chapter_id) VALUES (?, ?)').run(id, cid);
      }
    }
    if (body.proof_ids?.length) {
      for (const pid of body.proof_ids) {
        db.prepare('INSERT OR IGNORE INTO ref_proofs (ref_id, proof_id) VALUES (?, ?)').run(id, pid);
      }
    }

    const ref = db.prepare('SELECT * FROM refs WHERE id = ?').get(id) as Reference;
    const refs = attachRelations([ref]);
    return NextResponse.json({ data: refs[0] }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
