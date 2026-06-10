import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { FeedResponse } from '@instagrid/core';
import { MemoryFeedStore } from './store';
import { RateLimiter } from './rate-limit';
import { createNodeServer } from './node';
import { MockProvider } from './providers/mock';
import { syncFeed } from './sync';

// End-to-end demo without Meta: a mock provider feeds the sync pipeline, which
// populates the store the public API reads from.
//   <ig-grid endpoint="http://localhost:8787" feed="demo"></ig-grid>
const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(here, '../../../fixtures/feed.sample.json');
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as FeedResponse;

const store = new MemoryFeedStore();
await syncFeed({
    feedId: 'demo',
    account: { provider: 'mock', externalUserId: '0', username: fixture.username },
    token: 'mock-token',
    provider: new MockProvider(fixture.items),
    store,
});

const rateLimiter = new RateLimiter({ capacity: 60, refillPerSec: 1 });
const port = Number(process.env.PORT ?? 8787);

createNodeServer({ store, rateLimiter }).listen(port, () => {
    console.log(`instagrid feed API on http://localhost:${port}/feeds/demo`);
});
