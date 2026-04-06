export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { row, run } from '@/lib/db';
import type { ThesisMeta } from '@/lib/types';

export async function GET() {
  try {
    const thesis = await row<ThesisMeta>('SELECT * FROM thesis WHERE id = 1');
    if (!thesis) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: thesis });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json() as Partial<ThesisMeta>;
    await run(`
      UPDATE thesis SET
        title = COALESCE(?, title),
        supervisor = COALESCE(?, supervisor),
        university = COALESCE(?, university),
        degree = COALESCE(?, degree),
        expected_submission = COALESCE(?, expected_submission),
        abstract = COALESCE(?, abstract)
      WHERE id = 1
    `, [body.title, body.supervisor, body.university, body.degree, body.expected_submission, body.abstract]);
    const thesis = await row<ThesisMeta>('SELECT * FROM thesis WHERE id = 1');
    return NextResponse.json({ data: thesis });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
