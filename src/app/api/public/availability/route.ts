import { NextRequest, NextResponse } from 'next/server';
import { getPublicAvailability } from '@/services/public-booking';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<Response> {
    const rl = rateLimit(`pub-avail:${clientIp(req.headers)}`, 60, 60_000);
    if (!rl.ok) {
        return NextResponse.json(
            { error: 'Слишком много запросов' },
            { status: 429, headers: { 'retry-after': String(rl.retryAfterSeconds) } },
        );
    }

    const { searchParams } = new URL(req.url);
    const result = await getPublicAvailability({
        slug: searchParams.get('slug') ?? '',
        from: searchParams.get('from') ?? '',
        to: searchParams.get('to') ?? '',
        serviceId: searchParams.get('serviceId'),
        employeeUserId: searchParams.get('employeeUserId'),
    });

    if (!result.ok) {
        const status = result.code === 'NOT_FOUND' ? 404 : 400;
        return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json({ days: result.data });
}
