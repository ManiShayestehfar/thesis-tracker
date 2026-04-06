export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { rows } from '@/lib/db';
import type { Tag } from '@/lib/types';

export async function GET() {
  try {
    const tags = await rows<Tag>('SELECT * FROM tags ORDER BY name ASC');
    return NextResponse.json({ data: tags });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
