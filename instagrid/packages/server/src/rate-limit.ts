export interface RateLimiterOptions {
    /** Max burst (tokens in a full bucket). */
    capacity: number;
    /** Tokens replenished per second. */
    refillPerSec: number;
    /** Injectable clock for tests; defaults to Date.now. */
    now?: () => number;
}

interface Bucket {
    tokens: number;
    updatedAt: number;
}

/**
 * Per-key token-bucket rate limiter. Pure and in-memory: good enough for a
 * single reference node; a distributed deploy swaps it for a shared store.
 */
export class RateLimiter {
    private buckets = new Map<string, Bucket>();
    private readonly capacity: number;
    private readonly refillPerMs: number;
    private readonly now: () => number;

    constructor({ capacity, refillPerSec, now = Date.now }: RateLimiterOptions) {
        this.capacity = capacity;
        this.refillPerMs = refillPerSec / 1000;
        this.now = now;
    }

    take(key: string): { ok: boolean; retryAfterMs: number } {
        const t = this.now();
        const bucket = this.buckets.get(key) ?? { tokens: this.capacity, updatedAt: t };

        const elapsed = Math.max(0, t - bucket.updatedAt);
        bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsed * this.refillPerMs);
        bucket.updatedAt = t;

        if (bucket.tokens >= 1) {
            bucket.tokens -= 1;
            this.buckets.set(key, bucket);
            return { ok: true, retryAfterMs: 0 };
        }

        this.buckets.set(key, bucket);
        const deficit = 1 - bucket.tokens;
        return { ok: false, retryAfterMs: Math.ceil(deficit / this.refillPerMs) };
    }
}
