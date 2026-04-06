export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { ThesisMeta } from '@/lib/types';

export async function GET() {
  try {
    const thesis = db.prepare('SELECT * FROM thesis WHERE id = 1').get() as ThesisMeta | undefined;
    if (!thesis) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: thesis });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json() as Partial<ThesisMeta>;
    db.prepare(`
      UPDATE thesis SET
        title = COALESCE(?, title),
        supervisor = COALESCE(?, supervisor),
        university = COALESCE(?, university),
        degree = COALESCE(?, degree),
        expected_submission = COALESCE(?, expected_submission),
        abstract = COALESCE(?, abstract)
      WHERE id = 1
    `).run(body.title, body.supervisor, body.university, body.degree, body.expected_submission, body.abstract);
    const thesis = db.prepare('SELECT * FROM thesis WHERE id = 1').get() as ThesisMeta;
    return NextResponse.json({ data: thesis });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
