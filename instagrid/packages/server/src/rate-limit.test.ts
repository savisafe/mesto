import { describe, it, expect } from 'vitest';
import { RateLimiter } from './rate-limit';

describe('RateLimiter', () => {
    it('allows up to capacity, then blocks', () => {
        const rl = new RateLimiter({ capacity: 2, refillPerSec: 0, now: () => 0 });
        expect(rl.take('a').ok).toBe(true);
        expect(rl.take('a').ok).toBe(true);
        expect(rl.take('a').ok).toBe(false);
    });

    it('tracks keys independently', () => {
        const rl = new RateLimiter({ capacity: 1, refillPerSec: 0, now: () => 0 });
        expect(rl.take('a').ok).toBe(true);
        expect(rl.take('b').ok).toBe(true);
        expect(rl.take('a').ok).toBe(false);
    });

    it('refills over time', () => {
        let t = 0;
        const rl = new RateLimiter({ capacity: 1, refillPerSec: 1, now: () => t });
        expect(rl.take('a').ok).toBe(true);
        const blocked = rl.take('a');
        expect(blocked.ok).toBe(false);
        expect(blocked.retryAfterMs).toBeGreaterThan(0);
        t = 1000; // one second later → one token back
        expect(rl.take('a').ok).toBe(true);
    });
});
