export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { rows } from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import type { Tag } from '@/lib/types';

export async function GET() {
  try {
    const userId = await requireUserId();
    const tags = await rows<Tag>('SELECT * FROM tags WHERE user_id = ? ORDER BY name ASC', [userId]);
    return NextResponse.json({ data: tags });
  } catch (e) {
    const msg = String(e);
    return NextResponse.json({ error: msg }, { status: msg.includes('Unauthorized') ? 401 : 500 });
  }
}
