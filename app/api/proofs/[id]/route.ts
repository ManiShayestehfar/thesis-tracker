export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { rows, row, run } from '@/lib/db';
import type { Proof, Tag } from '@/lib/types';

interface Ctx { params: { id: string } }

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const id = parseInt(params.id, 10);
    const proof = await row<Proof>(
      'SELECT p.*, c.title as chapter_title FROM proofs p LEFT JOIN chapters c ON c.id = p.chapter_id WHERE p.id = ?', [id]
    );
    if (!proof) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const tags = await rows<Tag>('SELECT t.id, t.name FROM proof_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.proof_id = ?', [id]);
    return NextResponse.json({ data: { ...proof, tags } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const id = parseInt(params.id, 10);
    const body = await req.json() as Partial<Proof> & { tags?: string[] };
    const current = await row<Proof>('SELECT * FROM proofs WHERE id = ?', [id]);
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await run(`
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
    `, [
      body.label, body.statement, body.status,
      body.chapter_id !== undefined ? body.chapter_id : current.chapter_id,
      body.section_id !== undefined ? body.section_id : current.section_id,
      body.proof_sketch,
      body.date_completed !== undefined ? body.date_completed : current.date_completed,
      body.difficulty,
      id,
    ]);

    if (body.tags !== undefined) {
      await run('DELETE FROM proof_tags WHERE proof_id = ?', [id]);
      for (const name of body.tags) {
        await run('INSERT INTO tags (name) VALUES (?) ON CONFLICT (name) DO NOTHING', [name]);
        const tag = await row<{ id: number }>('SELECT id FROM tags WHERE name = ?', [name]);
        if (tag) await run('INSERT INTO proof_tags (proof_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [id, tag.id]);
      }
    }

    const proof = await row<Proof>(
      'SELECT p.*, c.title as chapter_title FROM proofs p LEFT JOIN chapters c ON c.id = p.chapter_id WHERE p.id = ?', [id]
    );
    const tags = await rows<Tag>('SELECT t.id, t.name FROM proof_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.proof_id = ?', [id]);
    return NextResponse.json({ data: { ...proof, tags } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const id = parseInt(params.id, 10);
    await run('DELETE FROM proofs WHERE id = ?', [id]);
    return NextResponse.json({ data: { id } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
