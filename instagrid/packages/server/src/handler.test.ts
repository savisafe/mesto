import { describe, it, expect } from 'vitest';
import { handleFeedRequest, toFeedResponse, parseFeedPath } from './handler';
import { MemoryFeedStore } from './store';
import { RateLimiter } from './rate-limit';
import type { FeedRecord } from './types';

const record: FeedRecord = {
    feedId: 'ab12',
    account: { provider: 'instagram', externalUserId: '999', username: 'studio' },
    items: [
        {
            id: '1',
            type: 'image',
            thumbUrl: 'https://cdn/1.jpg',
            permalink: 'https://instagram.com/p/1',
            takenAt: '2026-06-01T00:00:00Z',
        },
    ],
    updatedAt: '2026-06-09T00:00:00Z',
};

const store = new MemoryFeedStore([record]);

describe('parseFeedPath', () => {
    it('extracts the id and ignores query/trailing slash', () => {
        expect(parseFeedPath('/feeds/ab12')).toBe('ab12');
        expect(parseFeedPath('/feeds/ab12/')).toBe('ab12');
        expect(parseFeedPath('/feeds/ab%2012?cb=1')).toBe('ab 12');
    });

    it('rejects other paths', () => {
        expect(parseFeedPath('/')).toBeNull();
        expect(parseFeedPath('/feeds')).toBeNull();
        expect(parseFeedPath('/feeds/a/b')).toBeNull();
    });
});

describe('toFeedResponse', () => {
    it('exposes only public fields (no account internals)', () => {
        const res = toFeedResponse(record);
        expect(res).toEqual({
            username: 'studio',
            items: record.items,
            updatedAt: record.updatedAt,
        });
        expect(JSON.stringify(res)).not.toContain('externalUserId');
    });
});

describe('handleFeedRequest', () => {
    it('200 with CORS + cache headers for a known feed', async () => {
        const r = await handleFeedRequest({ method: 'GET', path: '/feeds/ab12' }, { store });
        expect(r.status).toBe(200);
        expect(r.headers['access-control-allow-origin']).toBe('*');
        expect(r.headers['cache-control']).toContain('s-maxage=');
        expect(JSON.parse(r.body).username).toBe('studio');
    });

    it('204 for OPTIONS preflight', async () => {
        const r = await handleFeedRequest({ method: 'OPTIONS', path: '/feeds/ab12' }, { store });
        expect(r.status).toBe(204);
        expect(r.headers['access-control-allow-methods']).toContain('GET');
    });

    it('405 for non-GET', async () => {
        const r = await handleFeedRequest({ method: 'POST', path: '/feeds/ab12' }, { store });
        expect(r.status).toBe(405);
    });

    it('404 for unknown feed and bad path (no existence leak)', async () => {
        expect((await handleFeedRequest({ method: 'GET', path: '/feeds/nope' }, { store })).status).toBe(404);
        expect((await handleFeedRequest({ method: 'GET', path: '/x' }, { store })).status).toBe(404);
    });

    it('429 when rate limited', async () => {
        const rateLimiter = new RateLimiter({ capacity: 1, refillPerSec: 0 });
        const opts = { store, rateLimiter };
        const first = await handleFeedRequest({ method: 'GET', path: '/feeds/ab12', clientId: 'ip' }, opts);
        const second = await handleFeedRequest({ method: 'GET', path: '/feeds/ab12', clientId: 'ip' }, opts);
        expect(first.status).toBe(200);
        expect(second.status).toBe(429);
        expect(second.headers['retry-after']).toBeDefined();
    });
});
