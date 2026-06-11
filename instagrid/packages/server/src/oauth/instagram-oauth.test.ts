import { describe, it, expect, vi } from 'vitest';
import { InstagramOAuth } from './instagram-oauth';

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

const makeOAuth = (fetchImpl: typeof fetch) =>
    new InstagramOAuth({
        clientId: 'CID',
        clientSecret: 'SECRET',
        redirectUri: 'https://app.test/callback',
        fetchImpl,
        tokenUrl: 'https://oauth.test/access_token',
        graphBase: 'https://graph.test',
        now: () => 0,
    });

describe('InstagramOAuth.authorizeUrl', () => {
    it('includes client_id, redirect_uri, scope and state', () => {
        const url = makeOAuth(vi.fn() as unknown as typeof fetch).authorizeUrl('STATE');
        expect(url).toContain('client_id=CID');
        expect(url).toContain('redirect_uri=https%3A%2F%2Fapp.test%2Fcallback');
        expect(url).toContain('scope=instagram_business_basic');
        expect(url).toContain('state=STATE');
        expect(url).toContain('response_type=code');
    });
});

describe('InstagramOAuth.connect', () => {
    it('chains code → long-lived → profile', async () => {
        const calls: string[] = [];
        const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
            const url = String(input);
            calls.push(url);
            if (url === 'https://oauth.test/access_token') {
                return json({ access_token: 'SHORT', user_id: 777 });
            }
            if (url.startsWith('https://graph.test/access_token')) {
                expect(url).toContain('access_token=SHORT');
                return json({ access_token: 'LONG', expires_in: 5184000 });
            }
            if (url.startsWith('https://graph.test/me')) {
                expect(url).toContain('access_token=LONG');
                return json({ id: '777', username: 'studio' });
            }
            throw new Error(`unexpected url ${url}`);
        });

        const result = await makeOAuth(fetchImpl as unknown as typeof fetch).connect('CODE');

        expect(result.account).toEqual({ provider: 'instagram', externalUserId: '777', username: 'studio' });
        expect(result.token).toBe('LONG');
        expect(new Date(result.expiresAt).toISOString()).toBe('1970-03-02T00:00:00.000Z');
        expect(calls).toHaveLength(3);
    });

    it('throws if the code exchange fails', async () => {
        const fetchImpl = vi.fn(async () => new Response('', { status: 400 }));
        await expect(makeOAuth(fetchImpl as unknown as typeof fetch).connect('bad')).rejects.toThrow(
            /code exchange failed/,
        );
    });
});
