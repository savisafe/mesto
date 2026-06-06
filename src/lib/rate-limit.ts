import 'server-only';

// Простой in-memory rate-limit (фиксированное окно) по ключу (обычно IP).
// Ограничение: на Vercel serverless память не общая между инстансами и сбрасывается
// при холодном старте — это «best-effort» защита от примитивного спама, а не
// строгий лимитер. Для жёстких гарантий нужен внешний стор (Upstash/Redis).

interface Bucket {
    count: number;
    resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
    ok: boolean;
    remaining: number;
    retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
    }

    if (bucket.count >= limit) {
        return {
            ok: false,
            remaining: 0,
            retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
        };
    }

    bucket.count += 1;
    return { ok: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

// Достаём IP клиента из заголовков прокси (Vercel ставит x-forwarded-for).
export function clientIp(headers: Headers): string {
    return (
        headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        headers.get('x-real-ip') ||
        'unknown'
    );
}
