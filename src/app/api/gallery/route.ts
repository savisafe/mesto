import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { getCurrentUser } from '@/lib/auth';
import { checkBusinessAccess } from '@/services/_access';
import { addGalleryPhoto } from '@/services/gallery';
import { rateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const STATUS_BY_CODE: Record<string, number> = {
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    INVALID_PAYLOAD: 400,
    LIMIT_REACHED: 409,
};

export async function POST(req: NextRequest): Promise<Response> {
    const rl = rateLimit(`gallery:${clientIp(req.headers)}`, 20, 60_000);
    if (!rl.ok) {
        return NextResponse.json(
            { error: 'Слишком много загрузок, попробуйте позже' },
            { status: 429, headers: { 'retry-after': String(rl.retryAfterSeconds) } },
        );
    }

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

    const form = await req.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });

    const businessId = form.get('businessId');
    const file = form.get('file');
    if (typeof businessId !== 'string' || !(file instanceof File)) {
        return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });
    }

    const access = await checkBusinessAccess(businessId, user.id);
    if (!access) return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });

    if (!ALLOWED.includes(file.type)) {
        return NextResponse.json(
            { error: 'Только изображения (jpg, png, webp, gif)' },
            { status: 400 },
        );
    }
    if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: 'Файл больше 4 МБ' }, { status: 400 });
    }

    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const key = `gallery/${businessId}/${crypto.randomUUID()}.${ext}`;

    let url: string;
    try {
        const blob = await put(key, file, {
            access: 'public',
            contentType: file.type,
            // Явный токен: иначе при наличии VERCEL_OIDC_TOKEN в окружении SDK
            // пытается авторизоваться через OIDC (недоступен для development).
            token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        url = blob.url;
    } catch (error) {
        const detail = error instanceof Error ? error.message : 'unknown';
        console.error('[gallery] blob put failed:', detail);
        return NextResponse.json(
            {
                error: 'Не удалось загрузить файл',
                ...(process.env.NODE_ENV !== 'production' ? { detail } : {}),
            },
            { status: 500 },
        );
    }

    const result = await addGalleryPhoto(businessId, url);
    if (!result.ok) {
        // Откатываем загруженный блоб, чтобы не оставить мусор.
        try {
            await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN });
        } catch {
            // игнорируем
        }
        const status = STATUS_BY_CODE[result.code ?? ''] ?? 400;
        return NextResponse.json({ error: result.error, code: result.code }, { status });
    }

    return NextResponse.json({ photo: result.data }, { status: 201 });
}
