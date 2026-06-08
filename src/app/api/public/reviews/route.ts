import { NextRequest, NextResponse } from 'next/server';
import { createPublicReview } from '@/services/reviews';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const STATUS_BY_CODE: Record<string, number> = {
    NOT_FOUND: 404,
    INVALID_PAYLOAD: 400,
    INVALID_RATING: 400,
    REVIEW_NOT_ALLOWED: 403,
    ALREADY_REVIEWED: 409,
};

export async function POST(req: NextRequest): Promise<Response> {
    const rl = rateLimit(`pub-review:${clientIp(req.headers)}`, 5, 60_000);
    if (!rl.ok) {
        return NextResponse.json(
            { error: 'Слишком много попыток, попробуйте позже' },
            { status: 429, headers: { 'retry-after': String(rl.retryAfterSeconds) } },
        );
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });

    const { slug, phone, rating, comment } = body;
    if (typeof slug !== 'string' || typeof phone !== 'string' || typeof rating !== 'number') {
        return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });
    }

    const result = await createPublicReview({
        slug,
        phone,
        rating,
        comment: typeof comment === 'string' ? comment : null,
    });

    if (!result.ok) {
        const status = STATUS_BY_CODE[result.code ?? ''] ?? 400;
        return NextResponse.json({ error: result.error, code: result.code }, { status });
    }
    return NextResponse.json({ review: result.data }, { status: 201 });
}
