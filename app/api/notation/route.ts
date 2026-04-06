export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { NotationEntry } from '@/lib/types';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');

    let sql = `
      SELECT n.*, c.title as chapter_title FROM notation n
      LEFT JOIN chapters c ON c.id = n.first_used_chapter_id
      WHERE 1=1
    `;
    const args: string[] = [];
    if (q) {
      sql += ' AND (n.symbol LIKE ? OR n.definition LIKE ? OR n.latex LIKE ?)';
      const like = `%${q}%`;
      args.push(like, like, like);
    }
    sql += ' ORDER BY n.symbol ASC';

    const entries = db.prepare(sql).all(...args) as NotationEntry[];
    return NextResponse.json({ data: entries });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Partial<NotationEntry>;
    const result = db.prepare(`
      INSERT INTO notation (symbol, latex, definition, first_used_chapter_id)
      VALUES (?, ?, ?, ?)
    `).run(
      body.symbol ?? '',
      body.latex ?? '',
      body.definition ?? '',
      body.first_used_chapter_id ?? null
    );
    const id = result.lastInsertRowid;
    const entry = db.prepare(
      'SELECT n.*, c.title as chapter_title FROM notation n LEFT JOIN chapters c ON c.id = n.first_used_chapter_id WHERE n.id = ?'
    ).get(id) as NotationEntry;
    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
