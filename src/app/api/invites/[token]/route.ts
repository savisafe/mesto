import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { acceptInvite, getInviteSignInTarget } from '@/services/employees';
import { routes, authPathWithParams } from '@/routes/routes';

export const runtime = 'nodejs';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ token: string }> },
) {
    const { token } = await params;
    const user = await getCurrentUser();

    // Без сессии ведём на регистрацию (если аккаунта по приглашению ещё нет)
    // или на вход (если есть) с next-параметром, чтобы вернуться и принять
    // инвайт сразу после авторизации.
    if (!user) {
        const target = await getInviteSignInTarget(token);
        const base = target && !target.userExists ? routes.REGISTRATION : routes.LOGIN;
        const path = authPathWithParams(base, {
            next: `/api/invites/${token}`,
            email: target?.email,
        });
        return NextResponse.redirect(new URL(path, req.url));
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
