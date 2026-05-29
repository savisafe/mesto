import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { validateSession } from './session';
import { toPublicUser, type PublicUser } from '@/db/schema';

export const SESSION_COOKIE = 'mesto_session';

// cache() мемоизирует в рамках одного запроса:
// несколько server-component вызовов на странице → один SELECT в БД.
export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const result = await validateSession(token);
    return result ? toPublicUser(result.user) : null;
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
