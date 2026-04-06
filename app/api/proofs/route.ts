export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { rows, row, run, insert } from '@/lib/db';
import type { Proof, Tag } from '@/lib/types';

async function attachTags(proofs: Proof[]): Promise<Proof[]> {
  if (proofs.length === 0) return proofs;
  const ids = proofs.map(p => p.id);
  const ph = ids.map(() => '?').join(',');
  const tags = await rows<{ proof_id: number; id: number; name: string }>(
    `SELECT pt.proof_id, t.id, t.name FROM proof_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.proof_id IN (${ph})`,
    ids
  );
  return proofs.map(p => ({
    ...p,
    tags: tags.filter(t => t.proof_id === p.id).map(t => ({ id: t.id, name: t.name }) as Tag),
  }));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const chapterId = searchParams.get('chapter_id');
    const tag = searchParams.get('tag');
    const difficulty = searchParams.get('difficulty');

    let sql = `
      SELECT p.*, c.title as chapter_title FROM proofs p
      LEFT JOIN chapters c ON c.id = p.chapter_id
      WHERE 1=1
    `;
    const args: (string | number)[] = [];

    if (status) { sql += ' AND p.status = ?'; args.push(status); }
    if (chapterId) { sql += ' AND p.chapter_id = ?'; args.push(parseInt(chapterId, 10)); }
    if (difficulty) { sql += ' AND p.difficulty = ?'; args.push(parseInt(difficulty, 10)); }
    if (tag) {
      sql += ' AND p.id IN (SELECT pt.proof_id FROM proof_tags pt JOIN tags t ON t.id = pt.tag_id WHERE t.name = ?)';
      args.push(tag);
    }
    sql += ' ORDER BY p.date_created DESC';

    const proofs = await rows<Proof>(sql, args);
    return NextResponse.json({ data: await attachTags(proofs) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Partial<Proof> & { tags?: string[] };
    const now = new Date().toISOString().split('T')[0];
    const id = await insert(
      'INSERT INTO proofs (label, statement, status, chapter_id, section_id, proof_sketch, date_created, date_completed, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [body.label ?? '', body.statement ?? '', body.status ?? 'Conjecture', body.chapter_id ?? null, body.section_id ?? null, body.proof_sketch ?? '', body.date_created ?? now, body.date_completed ?? null, body.difficulty ?? 3]
    );

    if (body.tags?.length) {
      for (const name of body.tags) {
        await run('INSERT INTO tags (name) VALUES (?) ON CONFLICT (name) DO NOTHING', [name]);
        const tag = await row<{ id: number }>('SELECT id FROM tags WHERE name = ?', [name]);
        if (tag) await run('INSERT INTO proof_tags (proof_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [id, tag.id]);
      }
    }

    const proof = await row<Proof>(
      'SELECT p.*, c.title as chapter_title FROM proofs p LEFT JOIN chapters c ON c.id = p.chapter_id WHERE p.id = ?', [id]
    );
    const proofs = await attachTags([proof!]);
    return NextResponse.json({ data: proofs[0] }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
