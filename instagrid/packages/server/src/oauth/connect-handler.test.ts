import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { handleConnectStart, handleConnectCallback, type ConnectDeps } from './connect-handler';
import { createState } from './state';
import { MemoryFeedStore } from '../store';
import { MemoryAccountStore, readToken } from '../accounts';
import { Encryptor } from '../crypto';
import { MockProvider } from '../providers/mock';
import { handleFeedRequest } from '../handler';
import type { ConnectResult } from './instagram-oauth';
import type { FeedItem } from '@instagrid/core';

const items: FeedItem[] = [
    {
        id: 'a',
        type: 'image',
        thumbUrl: 'https://cdn/a.jpg',
        permalink: 'https://instagram.com/p/a',
        takenAt: '2026-06-01T00:00:00Z',
    },
];

const connectResult: ConnectResult = {
    account: { provider: 'instagram', externalUserId: '777', username: 'studio' },
    token: 'LONG_TOKEN',
    expiresAt: '2026-09-01T00:00:00Z',
};

const makeDeps = (overrides: Partial<ConnectDeps> = {}): ConnectDeps => ({
    oauth: {
        authorizeUrl: (state) => `https://ig.test/authorize?state=${state}`,
        connect: async () => connectResult,
    },
    accountStore: new MemoryAccountStore(),
    encryptor: new Encryptor(randomBytes(32)),
    feedStore: new MemoryFeedStore(),
    provider: new MockProvider(items),
    stateSecret: 'secret',
    successUrl: 'https://app.test/connected',
    ...overrides,
});

describe('handleConnectStart', () => {
    it('302-redirects to the authorize URL with signed state', () => {
        const reply = handleConnectStart(makeDeps(), 'feed-1');
        expect(reply.status).toBe(302);
        expect(reply.headers.location).toContain('https://ig.test/authorize?state=');
    });

    it('400 without a feed id', () => {
        expect(handleConnectStart(makeDeps(), '  ').status).toBe(400);
    });
});

describe('handleConnectCallback', () => {
    it('rejects missing/invalid params', async () => {
        const deps = makeDeps();
        expect((await handleConnectCallback(deps, {})).status).toBe(400);
        expect((await handleConnectCallback(deps, { code: 'c', state: 'bad' })).status).toBe(400);
        expect((await handleConnectCallback(deps, { error: 'access_denied' })).status).toBe(400);
    });

    it('completes connect, stores encrypted token, syncs the feed', async () => {
        const deps = makeDeps();
        const state = createState('feed-1', deps.stateSecret);

        const reply = await handleConnectCallback(deps, { code: 'CODE', state });

        expect(reply.status).toBe(302);
        expect(reply.headers.location).toBe('https://app.test/connected?feed=feed-1');

        // Token stored encrypted, recoverable via the encryptor.
        expect(deps.accountStore.get('777')?.encryptedToken).not.toContain('LONG_TOKEN');
        expect(readToken(deps.accountStore, deps.encryptor, '777')).toBe('LONG_TOKEN');

        // Feed synced and now served by the public API.
        const served = await handleFeedRequest({ method: 'GET', path: '/feeds/feed-1' }, { store: deps.feedStore });
        expect(served.status).toBe(200);
        expect(JSON.parse(served.body).username).toBe('studio');
    });

    it('502 when the OAuth exchange throws', async () => {
        const deps = makeDeps({
            oauth: {
                authorizeUrl: () => 'x',
                connect: async () => {
                    throw new Error('boom');
                },
            },
        });
        const state = createState('feed-1', deps.stateSecret);
        expect((await handleConnectCallback(deps, { code: 'CODE', state })).status).toBe(502);
    });
});
