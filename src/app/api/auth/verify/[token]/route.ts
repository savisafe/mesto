import { NextRequest, NextResponse } from 'next/server';
import { verifyEmail } from '@/services/auth';

export const runtime = 'nodejs';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ token: string }> },
) {
    const { token } = await params;
    const result = await verifyEmail(token);
    const status = result.ok ? 'ok' : 'invalid';
    return NextResponse.redirect(new URL(`/?verify=${status}`, req.url));
}
