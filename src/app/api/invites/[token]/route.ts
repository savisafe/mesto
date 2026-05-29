import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { acceptInvite } from '@/services/employees';

export const runtime = 'nodejs';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ token: string }> },
) {
    const { token } = await params;
    const user = await getCurrentUser();

    // Без сессии — отправляем в /login с next-параметром, чтобы вернуться
    // и принять инвайт сразу после авторизации.
    if (!user) {
        const next = `/api/invites/${encodeURIComponent(token)}`;
        return NextResponse.redirect(
            new URL(`/login?next=${encodeURIComponent(next)}`, req.url),
        );
    }

    const result = await acceptInvite(token);
    if (!result.ok) {
        const code = result.code ?? 'INVALID';
        return NextResponse.redirect(
            new URL(`/dashboard?invite=${code.toLowerCase()}`, req.url),
        );
    }

    return NextResponse.redirect(new URL(`/dashboard?invite=ok`, req.url));
}
