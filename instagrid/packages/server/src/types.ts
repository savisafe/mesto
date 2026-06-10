import type { FeedItem } from '@instagrid/core';

/**
 * Internal feed record as the backend stores it. It may carry private fields
 * (account references, sync metadata); these never reach the wire — the public
 * API maps it through `toFeedResponse` first.
 */
export interface FeedRecord {
    feedId: string;
    account: {
        provider: string;
        externalUserId: string;
        username: string;
    };
    items: FeedItem[];
    /** ISO 8601 — last successful sync. */
    updatedAt: string;
}

export interface FeedStore {
    getFeed(feedId: string): FeedRecord | null | Promise<FeedRecord | null>;
}

/** Framework-agnostic request shape the pure handler understands. */
export interface FeedRequest {
    method: string;
    /** Path with optional query string, e.g. "/feeds/ab12?x=1". */
    path: string;
    /** Client identifier for rate limiting (e.g. remote IP). */
    clientId?: string;
}

export interface FeedReply {
    status: number;
    headers: Record<string, string>;
    body: string;
}

export interface ServerOptions {
    store: FeedStore;
    rateLimiter?: { take(key: string): { ok: boolean; retryAfterMs: number } };
    /** Browser cache TTL, seconds. */
    cacheMaxAge?: number;
    /** Shared/CDN cache TTL, seconds. */
    cacheSMaxAge?: number;
}
