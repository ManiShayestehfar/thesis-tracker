export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Tag } from '@/lib/types';

export async function GET() {
  try {
    const tags = db.prepare('SELECT * FROM tags ORDER BY name ASC').all() as Tag[];
    return NextResponse.json({ data: tags });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
