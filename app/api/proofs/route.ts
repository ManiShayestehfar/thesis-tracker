export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Proof, Tag } from '@/lib/types';

function attachTags(proofs: Proof[]): Proof[] {
  if (proofs.length === 0) return proofs;
  const tags = db.prepare(`
    SELECT pt.proof_id, t.id, t.name FROM proof_tags pt
    JOIN tags t ON t.id = pt.tag_id
    WHERE pt.proof_id IN (${proofs.map(() => '?').join(',')})
  `).all(...proofs.map(p => p.id)) as { proof_id: number; id: number; name: string }[];

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
    const proofs = db.prepare(sql).all(...args) as Proof[];
    return NextResponse.json({ data: attachTags(proofs) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Partial<Proof> & { tags?: string[] };
    const now = new Date().toISOString().split('T')[0];
    const result = db.prepare(`
      INSERT INTO proofs (label, statement, status, chapter_id, section_id, proof_sketch, date_created, date_completed, difficulty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      body.label ?? '',
      body.statement ?? '',
      body.status ?? 'Conjecture',
      body.chapter_id ?? null,
      body.section_id ?? null,
      body.proof_sketch ?? '',
      body.date_created ?? now,
      body.date_completed ?? null,
      body.difficulty ?? 3
    );
    const id = result.lastInsertRowid as number;

    if (body.tags?.length) {
      for (const name of body.tags) {
        db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run(name);
        const tag = db.prepare('SELECT id FROM tags WHERE name = ?').get(name) as { id: number };
        db.prepare('INSERT OR IGNORE INTO proof_tags (proof_id, tag_id) VALUES (?, ?)').run(id, tag.id);
      }
    }

    const proof = db.prepare('SELECT p.*, c.title as chapter_title FROM proofs p LEFT JOIN chapters c ON c.id = p.chapter_id WHERE p.id = ?').get(id) as Proof;
    const proofs = attachTags([proof]);
    return NextResponse.json({ data: proofs[0] }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
