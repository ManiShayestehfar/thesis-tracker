export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getUserIdFromCookies } from '@/lib/auth';
import { row } from '@/lib/db';
import type { User } from '@/lib/types';

export async function GET() {
  try {
    const userId = await getUserIdFromCookies();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await row<User>('SELECT id, email, name, created_at FROM users WHERE id = ?', [userId]);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ data: user });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
