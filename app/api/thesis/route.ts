export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { row, run } from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import type { ThesisMeta } from '@/lib/types';

export async function GET() {
  try {
    const userId = await requireUserId();
    const thesis = await row<ThesisMeta>('SELECT * FROM thesis WHERE user_id = ?', [userId]);
    if (!thesis) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: thesis });
  } catch (e) {
    const msg = String(e);
    return NextResponse.json({ error: msg }, { status: msg.includes('Unauthorized') ? 401 : 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json() as Partial<ThesisMeta>;
    await run(`
      UPDATE thesis SET
        title = COALESCE(?, title),
        supervisor = COALESCE(?, supervisor),
        university = COALESCE(?, university),
        degree = COALESCE(?, degree),
        expected_submission = COALESCE(?, expected_submission),
        abstract = COALESCE(?, abstract)
      WHERE user_id = ?
    `, [body.title, body.supervisor, body.university, body.degree, body.expected_submission, body.abstract, userId]);
    const thesis = await row<ThesisMeta>('SELECT * FROM thesis WHERE user_id = ?', [userId]);
    return NextResponse.json({ data: thesis });
  } catch (e) {
    const msg = String(e);
    return NextResponse.json({ error: msg }, { status: msg.includes('Unauthorized') ? 401 : 500 });
  }
}
