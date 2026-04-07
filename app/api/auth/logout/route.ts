export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth';

export async function POST() {
  clearAuthCookie();
  return NextResponse.json({ data: { ok: true } });
}
