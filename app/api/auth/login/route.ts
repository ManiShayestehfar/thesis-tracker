export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { row } from '@/lib/db';
import { signJWT, setAuthCookie } from '@/lib/auth';

interface UserRow {
  id: number;
  email: string;
  name: string;
  password_hash: string;
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json() as { email: string; password: string };

    if (!email?.trim() || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await row<UserRow>('SELECT id, email, name, password_hash FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = await signJWT({ sub: String(user.id), email: user.email, name: user.name });
    setAuthCookie(token);

    return NextResponse.json({ data: { id: user.id, email: user.email, name: user.name } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
