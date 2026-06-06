import { NextRequest, NextResponse } from 'next/server';
import { createPublicBooking } from '@/services/public-booking';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const STATUS_BY_CODE: Record<string, number> = {
    NOT_FOUND: 404,
    SERVICE_NOT_FOUND: 404,
    INVALID_EMPLOYEE: 400,
    INVALID_PAYLOAD: 400,
    OUT_OF_HOURS: 409,
    BLOCKED: 409,
    SLOT_CONFLICT: 409,
};

export async function POST(req: NextRequest): Promise<Response> {
    const rl = rateLimit(`pub-book:${clientIp(req.headers)}`, 5, 60_000);
    if (!rl.ok) {
        return NextResponse.json(
            { error: 'Слишком много попыток, попробуйте позже' },
            { status: 429, headers: { 'retry-after': String(rl.retryAfterSeconds) } },
        );
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });

    const { slug, serviceId, employeeUserId, startsAt, client } = body;
    if (
        typeof slug !== 'string' ||
        typeof serviceId !== 'string' ||
        typeof startsAt !== 'string' ||
        typeof client !== 'object' ||
        client === null
    ) {
        return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });
    }
    const c = client as Record<string, unknown>;

    const result = await createPublicBooking({
        slug,
        serviceId,
        employeeUserId: typeof employeeUserId === 'string' ? employeeUserId : null,
        startsAt: new Date(startsAt),
        client: {
            name: typeof c.name === 'string' ? c.name : '',
            phone: typeof c.phone === 'string' ? c.phone : '',
            email: typeof c.email === 'string' ? c.email : null,
        },
    });

    if (!result.ok) {
        const status = STATUS_BY_CODE[result.code ?? ''] ?? 400;
        return NextResponse.json({ error: result.error, code: result.code }, { status });
    }
    return NextResponse.json({ booking: result.data }, { status: 201 });
}
