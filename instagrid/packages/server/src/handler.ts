import type { FeedResponse } from '@instagrid/core';
import type { FeedRecord, FeedReply, FeedRequest, ServerOptions } from './types';

const DEFAULT_MAX_AGE = 300; // 5 min in the browser
const DEFAULT_S_MAX_AGE = 900; // 15 min on the CDN

const CORS_HEADERS: Record<string, string> = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-max-age': '86400',
};

/**
 * Public projection of a stored record. The security boundary: only public
 * post fields leave the server — never tokens, account ids, or sync internals.
 */
export function toFeedResponse(record: FeedRecord): FeedResponse {
    return {
        username: record.account.username,
        items: record.items,
        updatedAt: record.updatedAt,
    };
}

/** Extract the feed id from "/feeds/:id" (ignoring any query string). */
export function parseFeedPath(path: string): string | null {
    const clean = path.split('?')[0] ?? '';
    const match = clean.match(/^\/feeds\/([^/]+)\/?$/);
    if (!match || !match[1]) return null;
    try {
        return decodeURIComponent(match[1]);
    } catch {
        return null;
    }
}

const json = (status: number, body: unknown, extra: Record<string, string> = {}): FeedReply => ({
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...CORS_HEADERS, ...extra },
    body: JSON.stringify(body),
});

/**
 * Framework-agnostic feed endpoint. Maps a `FeedRequest` to a `FeedReply`;
 * Node/Vercel/Hono adapters just translate to and from their own types.
 */
export async function handleFeedRequest(
    req: FeedRequest,
    opts: ServerOptions,
): Promise<FeedReply> {
    if (req.method === 'OPTIONS') {
        return { status: 204, headers: { ...CORS_HEADERS }, body: '' };
    }
    if (req.method !== 'GET') {
        return json(405, { error: 'method_not_allowed' }, { allow: 'GET, OPTIONS' });
    }

    const feedId = parseFeedPath(req.path);
    if (!feedId) {
        return json(404, { error: 'not_found' });
    }

    if (opts.rateLimiter) {
        const { ok, retryAfterMs } = opts.rateLimiter.take(req.clientId ?? 'anonymous');
        if (!ok) {
            return json(429, { error: 'rate_limited' }, {
                'retry-after': String(Math.ceil(retryAfterMs / 1000)),
            });
        }
    }

    const record = await opts.store.getFeed(feedId);
    if (!record) {
        // Do not reveal whether the id ever existed.
        return json(404, { error: 'not_found' });
    }

    const maxAge = opts.cacheMaxAge ?? DEFAULT_MAX_AGE;
    const sMaxAge = opts.cacheSMaxAge ?? DEFAULT_S_MAX_AGE;
    return json(200, toFeedResponse(record), {
        'cache-control': `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=86400`,
    });
}
