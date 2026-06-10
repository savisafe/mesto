import { describe, it, expect } from 'vitest';
import { syncFeed } from './sync';
import { MemoryFeedStore } from './store';
import { MockProvider } from './providers/mock';
import { handleFeedRequest } from './handler';
import type { ImageStore } from './image-store';
import type { FeedItem } from '@instagrid/core';

const items: FeedItem[] = [
    {
        id: 'a',
        type: 'image',
        thumbUrl: 'https://ig.temp/a.jpg',
        permalink: 'https://instagram.com/p/a',
        takenAt: '2026-06-01T00:00:00Z',
    },
];

const account = { provider: 'mock', externalUserId: '0', username: 'studio' };

describe('syncFeed', () => {
    it('pulls from the provider and upserts a public record', async () => {
        const store = new MemoryFeedStore();
        const rec = await syncFeed({
            feedId: 'demo',
            account,
            token: 't',
            provider: new MockProvider(items),
            store,
            now: () => new Date('2026-06-09T12:00:00Z'),
        });

        expect(rec.feedId).toBe('demo');
        expect(rec.updatedAt).toBe('2026-06-09T12:00:00.000Z');
        expect(store.getFeed('demo')?.items).toHaveLength(1);
    });

    it('re-hosts thumbnails through the image store', async () => {
        const images: ImageStore = {
            store: (src, key) => Promise.resolve(`https://cdn.ours/${key}`),
        };
        const store = new MemoryFeedStore();
        await syncFeed({ feedId: 'demo', account, token: 't', provider: new MockProvider(items), store, images });

        expect(store.getFeed('demo')?.items[0]?.thumbUrl).toBe('https://cdn.ours/demo/a');
    });

    it('end-to-end: synced feed is served by the API', async () => {
        const store = new MemoryFeedStore();
        await syncFeed({ feedId: 'demo', account, token: 't', provider: new MockProvider(items), store });

        const reply = await handleFeedRequest({ method: 'GET', path: '/feeds/demo' }, { store });
        expect(reply.status).toBe(200);
        expect(JSON.parse(reply.body).items).toHaveLength(1);
    });
});
