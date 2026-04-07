export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { rows, row, insert } from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import type { NotationEntry } from '@/lib/types';

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');

    let sql = `
      SELECT n.*, c.title as chapter_title FROM notation n
      LEFT JOIN chapters c ON c.id = n.first_used_chapter_id
      WHERE n.user_id = ?
    `;
    const args: (string | number)[] = [userId];
    if (q) {
      sql += ' AND (n.symbol LIKE ? OR n.definition LIKE ? OR n.latex LIKE ?)';
      const like = `%${q}%`;
      args.push(like, like, like);
    }
    sql += ' ORDER BY n.symbol ASC';

    const entries = await rows<NotationEntry>(sql, args);
    return NextResponse.json({ data: entries });
  } catch (e) {
    const msg = String(e);
    return NextResponse.json({ error: msg }, { status: msg.includes('Unauthorized') ? 401 : 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json() as Partial<NotationEntry>;
    const id = await insert(
      'INSERT INTO notation (user_id, symbol, latex, definition, first_used_chapter_id) VALUES (?, ?, ?, ?, ?)',
      [userId, body.symbol ?? '', body.latex ?? '', body.definition ?? '', body.first_used_chapter_id ?? null]
    );
    const entry = await row<NotationEntry>(
      'SELECT n.*, c.title as chapter_title FROM notation n LEFT JOIN chapters c ON c.id = n.first_used_chapter_id WHERE n.id = ?', [id]
    );
    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (e) {
    const msg = String(e);
    return NextResponse.json({ error: msg }, { status: msg.includes('Unauthorized') ? 401 : 500 });
  }
}
