export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { rows, row, run, insert } from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import type { Reference } from '@/lib/types';

async function attachRelations(refs: Reference[]): Promise<Reference[]> {
  if (refs.length === 0) return refs;
  const ids = refs.map(r => r.id);
  const ph = ids.map(() => '?').join(',');

  const [chapters, proofs] = await Promise.all([
    rows<{ ref_id: number; id: number; title: string }>(
      `SELECT rc.ref_id, c.id, c.title FROM ref_chapters rc JOIN chapters c ON c.id = rc.chapter_id WHERE rc.ref_id IN (${ph})`, ids
    ),
    rows<{ ref_id: number; id: number; label: string }>(
      `SELECT rp.ref_id, p.id, p.label FROM ref_proofs rp JOIN proofs p ON p.id = rp.proof_id WHERE rp.ref_id IN (${ph})`, ids
    ),
  ]);

  return refs.map(r => ({
    ...r,
    linked_chapters: chapters.filter(c => c.ref_id === r.id).map(c => ({ id: c.id, title: c.title })),
    linked_proofs: proofs.filter(p => p.ref_id === r.id).map(p => ({ id: p.id, label: p.label })),
  }));
}

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const q = searchParams.get('q');

    let sql = 'SELECT * FROM refs WHERE user_id = ?';
    const args: (string | number)[] = [userId];

    if (status) { sql += ' AND read_status = ?'; args.push(status); }
    if (q) {
      sql += ' AND (title LIKE ? OR authors LIKE ? OR citation_key LIKE ?)';
      const like = `%${q}%`;
      args.push(like, like, like);
    }
    sql += ' ORDER BY year DESC, authors ASC';

    const refs = await rows<Reference>(sql, args);
    return NextResponse.json({ data: await attachRelations(refs) });
  } catch (e) {
    const msg = String(e);
    return NextResponse.json({ error: msg }, { status: msg.includes('Unauthorized') ? 401 : 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json() as Partial<Reference> & { chapter_ids?: number[]; proof_ids?: number[] };
    const id = await insert(
      'INSERT INTO refs (user_id, citation_key, title, authors, year, journal, doi, url, notes, read_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, body.citation_key ?? '', body.title ?? '', body.authors ?? '', body.year ?? null, body.journal ?? '', body.doi ?? '', body.url ?? '', body.notes ?? '', body.read_status ?? 'Unread']
    );

    if (body.chapter_ids?.length) {
      for (const cid of body.chapter_ids) {
        await run('INSERT INTO ref_chapters (ref_id, chapter_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [id, cid]);
      }
    }
    if (body.proof_ids?.length) {
      for (const pid of body.proof_ids) {
        await run('INSERT INTO ref_proofs (ref_id, proof_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [id, pid]);
      }
    }

    const ref = await row<Reference>('SELECT * FROM refs WHERE id = ?', [id]);
    const refs = await attachRelations([ref!]);
    return NextResponse.json({ data: refs[0] }, { status: 201 });
  } catch (e) {
    const msg = String(e);
    return NextResponse.json({ error: msg }, { status: msg.includes('Unauthorized') ? 401 : 500 });
  }
}
