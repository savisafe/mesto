'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
    register,
    login,
    requestMagicLink,
    resendVerification,
    type RegisterInput,
    type LoginInput,
} from '@/services/auth';
import { createSession, invalidateSession } from '@/lib/session';
import { SESSION_COOKIE, setSessionCookie, clearSessionCookie } from '@/lib/auth';

export type ActionResult = { ok: true } | { ok: false; error: string };

async function startSession(userId: string): Promise<void> {
    const h = await headers();
    const userAgent = h.get('user-agent');
    const ip =
        h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        h.get('x-real-ip') ??
        null;
    const { token, expiresAt } = await createSession({ userId, userAgent, ip });
    await setSessionCookie(token, expiresAt);
}

export async function registerAction(
    input: RegisterInput,
    next?: string,
): Promise<ActionResult> {
    const result = await register(input);
    if (!result.ok) return { ok: false, error: result.error };
    await startSession(result.data.id);
    redirect(safeNext(next));
}

// Защита: пускаем только относительные пути внутри сайта,
// чтобы next=<external-url> не превратился в open redirect.
function safeNext(next?: string): string {
    if (!next) return '/dashboard';
    if (next.startsWith('/') && !next.startsWith('//')) return next;
    return '/dashboard';
}

export async function loginAction(
    input: LoginInput,
    next?: string,
): Promise<ActionResult> {
    const result = await login(input);
    if (!result.ok) return { ok: false, error: result.error };
    await startSession(result.data.id);
    redirect(safeNext(next));
}

export async function requestMagicLinkAction(email: string): Promise<ActionResult> {
    const result = await requestMagicLink(email);
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true };
}

export async function resendVerificationAction(email: string): Promise<ActionResult> {
    const result = await resendVerification(email);
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true };
}

export async function logoutAction(): Promise<void> {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token) await invalidateSession(token);
    await clearSessionCookie();
    redirect('/');
}
