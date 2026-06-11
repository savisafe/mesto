import { describe, it, expect } from 'vitest';
import { MemoryFeedStore } from './store';
import type { FeedRecord } from './types';

const rec = (feedId: string): FeedRecord => ({
    feedId,
    account: { provider: 'instagram', externalUserId: '1', username: feedId },
    items: [],
    updatedAt: '2026-06-01T00:00:00Z',
});

describe('MemoryFeedStore', () => {
    it('seeds, gets, and returns null for unknown', () => {
        const store = new MemoryFeedStore([rec('a')]);
        expect(store.getFeed('a')?.feedId).toBe('a');
        expect(store.getFeed('missing')).toBeNull();
        expect(store.size).toBe(1);
    });

    it('upsert adds and overwrites', () => {
        const store = new MemoryFeedStore();
        store.upsert(rec('a'));
        expect(store.size).toBe(1);
        store.upsert({ ...rec('a'), updatedAt: '2026-07-01T00:00:00Z' });
        expect(store.size).toBe(1);
        expect(store.getFeed('a')?.updatedAt).toBe('2026-07-01T00:00:00Z');
    });
});
