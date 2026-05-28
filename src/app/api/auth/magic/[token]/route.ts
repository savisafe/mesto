import { NextRequest, NextResponse } from 'next/server';
import { consumeMagicLink } from '@/services/auth';
import { createSession } from '@/lib/session';
import { setSessionCookie } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ token: string }> },
) {
    const { token } = await params;
    const result = await consumeMagicLink(token);
    if (!result.ok) {
        return NextResponse.redirect(new URL(`/login-otp?error=invalid`, req.url));
    }

    const userAgent = req.headers.get('user-agent');
    const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        req.headers.get('x-real-ip') ??
        null;

    const { token: sessionToken, expiresAt } = await createSession({
        userId: result.data.id,
        userAgent,
        ip,
    });
    await setSessionCookie(sessionToken, expiresAt);

    return NextResponse.redirect(new URL(`/dashboard`, req.url));
}
