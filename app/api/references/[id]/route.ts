export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Reference } from '@/lib/types';

interface Ctx { params: { id: string } }

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const id = parseInt(params.id, 10);
    const body = await req.json() as Partial<Reference> & { chapter_ids?: number[]; proof_ids?: number[] };

    db.prepare(`
      UPDATE refs SET
        citation_key = COALESCE(?, citation_key),
        title = COALESCE(?, title),
        authors = COALESCE(?, authors),
        year = COALESCE(?, year),
        journal = COALESCE(?, journal),
        doi = COALESCE(?, doi),
        url = COALESCE(?, url),
        notes = COALESCE(?, notes),
        read_status = COALESCE(?, read_status)
      WHERE id = ?
    `).run(
      body.citation_key, body.title, body.authors, body.year,
      body.journal, body.doi, body.url, body.notes, body.read_status, id
    );

    if (body.chapter_ids !== undefined) {
      db.prepare('DELETE FROM ref_chapters WHERE ref_id = ?').run(id);
      for (const cid of body.chapter_ids) {
        db.prepare('INSERT OR IGNORE INTO ref_chapters (ref_id, chapter_id) VALUES (?, ?)').run(id, cid);
      }
    }
    if (body.proof_ids !== undefined) {
      db.prepare('DELETE FROM ref_proofs WHERE ref_id = ?').run(id);
      for (const pid of body.proof_ids) {
        db.prepare('INSERT OR IGNORE INTO ref_proofs (ref_id, proof_id) VALUES (?, ?)').run(id, pid);
      }
    }

    const ref = db.prepare('SELECT * FROM refs WHERE id = ?').get(id) as Reference;
    const chapters = db.prepare(
      'SELECT c.id, c.title FROM ref_chapters rc JOIN chapters c ON c.id = rc.chapter_id WHERE rc.ref_id = ?'
    ).all(id) as { id: number; title: string }[];
    const proofs = db.prepare(
      'SELECT p.id, p.label FROM ref_proofs rp JOIN proofs p ON p.id = rp.proof_id WHERE rp.ref_id = ?'
    ).all(id) as { id: number; label: string }[];

    return NextResponse.json({ data: { ...ref, linked_chapters: chapters, linked_proofs: proofs } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const id = parseInt(params.id, 10);
    db.prepare('DELETE FROM refs WHERE id = ?').run(id);
    return NextResponse.json({ data: { id } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
