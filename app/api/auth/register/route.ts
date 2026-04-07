export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { row, insert, createUserThesis } from '@/lib/db';
import { signJWT, setAuthCookie } from '@/lib/auth';
import type { User } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json() as { email: string; password: string; name: string };

    if (!email?.trim() || !password || !name?.trim()) {
      return NextResponse.json({ error: 'Email, name, and password are required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const existing = await row<User>('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();
    const id = await insert(
      'INSERT INTO users (email, name, password_hash, created_at) VALUES (?, ?, ?, ?)',
      [email.toLowerCase().trim(), name.trim(), password_hash, now]
    );

    await createUserThesis(id);

    const token = await signJWT({ sub: String(id), email: email.toLowerCase().trim(), name: name.trim() });
    setAuthCookie(token);

    return NextResponse.json({ data: { id, email: email.toLowerCase().trim(), name: name.trim() } }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
