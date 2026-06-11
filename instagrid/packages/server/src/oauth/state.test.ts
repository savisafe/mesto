import { describe, it, expect } from 'vitest';
import { createState, verifyState } from './state';

const secret = 'state-secret';

describe('OAuth state', () => {
    it('round-trips and carries the feedId', () => {
        const state = createState('feed-1', secret, () => 1000);
        const payload = verifyState(state, secret, { now: () => 1000 });
        expect(payload?.feedId).toBe('feed-1');
    });

    it('rejects a wrong secret', () => {
        const state = createState('feed-1', secret);
        expect(verifyState(state, 'other')).toBeNull();
    });

    it('rejects tampering', () => {
        const state = createState('feed-1', secret);
        const [body] = state.split('.');
        expect(verifyState(`${body}.deadbeef`, secret)).toBeNull();
        expect(verifyState('garbage', secret)).toBeNull();
    });

    it('rejects an expired state', () => {
        const state = createState('feed-1', secret, () => 0);
        expect(verifyState(state, secret, { maxAgeMs: 1000, now: () => 5000 })).toBeNull();
    });
});
