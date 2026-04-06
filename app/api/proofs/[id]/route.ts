export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Proof, Tag } from '@/lib/types';

interface Ctx { params: { id: string } }

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const id = parseInt(params.id, 10);
    const proof = db.prepare(
      'SELECT p.*, c.title as chapter_title FROM proofs p LEFT JOIN chapters c ON c.id = p.chapter_id WHERE p.id = ?'
    ).get(id) as Proof | undefined;
    if (!proof) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const tags = db.prepare(
      'SELECT t.id, t.name FROM proof_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.proof_id = ?'
    ).all(id) as Tag[];
    return NextResponse.json({ data: { ...proof, tags } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const id = parseInt(params.id, 10);
    const body = await req.json() as Partial<Proof> & { tags?: string[] };

    db.prepare(`
      UPDATE proofs SET
        label = COALESCE(?, label),
        statement = COALESCE(?, statement),
        status = COALESCE(?, status),
        chapter_id = ?,
        section_id = ?,
        proof_sketch = COALESCE(?, proof_sketch),
        date_completed = ?,
        difficulty = COALESCE(?, difficulty)
      WHERE id = ?
    `).run(
      body.label, body.statement, body.status,
      body.chapter_id !== undefined ? body.chapter_id : db.prepare('SELECT chapter_id FROM proofs WHERE id = ?').get(id) as number | null,
      body.section_id !== undefined ? body.section_id : db.prepare('SELECT section_id FROM proofs WHERE id = ?').get(id) as number | null,
      body.proof_sketch,
      body.date_completed !== undefined ? body.date_completed : db.prepare('SELECT date_completed FROM proofs WHERE id = ?').get(id) as string | null,
      body.difficulty,
      id
    );

    if (body.tags !== undefined) {
      db.prepare('DELETE FROM proof_tags WHERE proof_id = ?').run(id);
      for (const name of body.tags) {
        db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run(name);
        const tag = db.prepare('SELECT id FROM tags WHERE name = ?').get(name) as { id: number };
        db.prepare('INSERT OR IGNORE INTO proof_tags (proof_id, tag_id) VALUES (?, ?)').run(id, tag.id);
      }
    }

    const proof = db.prepare(
      'SELECT p.*, c.title as chapter_title FROM proofs p LEFT JOIN chapters c ON c.id = p.chapter_id WHERE p.id = ?'
    ).get(id) as Proof;
    const tags = db.prepare(
      'SELECT t.id, t.name FROM proof_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.proof_id = ?'
    ).all(id) as Tag[];
    return NextResponse.json({ data: { ...proof, tags } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const id = parseInt(params.id, 10);
    db.prepare('DELETE FROM proofs WHERE id = ?').run(id);
    return NextResponse.json({ data: { id } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
