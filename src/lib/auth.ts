import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { validateSession, type SessionWithUser } from './session';

export const SESSION_COOKIE = 'mesto_session';

// cache() мемоизирует в рамках одного запроса:
// несколько server-component вызовов на странице → один SELECT в БД.
export const getCurrentUser = cache(async (): Promise<SessionWithUser | null> => {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return null;
    return validateSession(token);
});

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
    const store = await cookies();
    store.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        expires: expiresAt,
    });
}

export async function clearSessionCookie(): Promise<void> {
    const store = await cookies();
    store.delete(SESSION_COOKIE);
}
