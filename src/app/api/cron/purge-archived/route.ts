import { NextRequest, NextResponse } from 'next/server';
import { purgeExpiredArchives } from '@/services/businesses';
import { cleanupExpiredSessions } from '@/lib/session';

export const runtime = 'nodejs';
// Не кэшируем — каждый вызов должен реально работать.
export const dynamic = 'force-dynamic';

/**
 * Cron-эндпоинт. Вызывается Vercel Cron'ом по расписанию из vercel.json.
 *
 * Vercel автоматически добавляет заголовок
 *   Authorization: Bearer <CRON_SECRET>
 * Сверяем — иначе любой может задёргать чистку.
 */
export async function GET(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        return NextResponse.json(
            { ok: false, error: 'CRON_SECRET is not configured' },
            { status: 500 },
        );
    }

    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
        return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const [archives] = await Promise.all([purgeExpiredArchives(), cleanupExpiredSessions()]);
        return NextResponse.json({
            ok: true,
            purgedBusinesses: archives.purged,
        });
    } catch (err) {
        console.error('Cron purge failed:', err);
        return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
    }
}
