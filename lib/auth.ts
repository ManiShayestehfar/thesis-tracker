import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'auth_token';
const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? 'fallback-dev-secret-change-in-prod');

export interface JWTPayload {
  sub: string; // user id
  email: string;
  name: string;
}

export async function signJWT(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(secret);
}

export async function verifyJWT(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as JWTPayload;
}

export function setAuthCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });
}

export function clearAuthCookie() {
  cookies().set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
}

export async function getUserIdFromCookies(): Promise<number | null> {
  try {
    const token = cookies().get(COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = await verifyJWT(token);
    return parseInt(payload.sub, 10);
  } catch {
    return null;
  }
}

/** Use in API route handlers — throws with 401 message if not authenticated */
export async function requireUserId(): Promise<number> {
  const id = await getUserIdFromCookies();
  if (!id) throw new Error('Unauthorized');
  return id;
}
