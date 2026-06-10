import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { FeedResponse } from '@instagrid/core';
import { MemoryFeedStore } from './store';
import { RateLimiter } from './rate-limit';
import { createNodeServer } from './node';
import type { FeedRecord } from './types';

// Seed one feed ("demo") from the shared fixture so the widget can hit a real
// endpoint locally: <ig-grid endpoint="http://localhost:8787" feed="demo">.
const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(here, '../../../fixtures/feed.sample.json');
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as FeedResponse;

const demo: FeedRecord = {
    feedId: 'demo',
    account: { provider: 'instagram', externalUserId: '0', username: fixture.username },
    items: fixture.items,
    updatedAt: fixture.updatedAt,
};

const store = new MemoryFeedStore([demo]);
const rateLimiter = new RateLimiter({ capacity: 60, refillPerSec: 1 });
const port = Number(process.env.PORT ?? 8787);

createNodeServer({ store, rateLimiter }).listen(port, () => {
    console.log(`instagrid feed API on http://localhost:${port}/feeds/demo`);
});
