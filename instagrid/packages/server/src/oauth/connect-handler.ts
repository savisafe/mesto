import type { FeedProvider } from '@instagrid/core';
import type { FeedReply, WritableFeedStore } from '../types';
import type { AccountStore } from '../accounts';
import type { Encryptor } from '../crypto';
import type { ImageStore } from '../image-store';
import type { ConnectResult } from './instagram-oauth';
import { putToken } from '../accounts';
import { syncFeed } from '../sync';
import { createState, verifyState } from './state';

interface OAuthLike {
    authorizeUrl(state: string): string;
    connect(code: string): Promise<ConnectResult>;
}

export interface ConnectDeps {
    oauth: OAuthLike;
    accountStore: AccountStore;
    encryptor: Encryptor;
    feedStore: WritableFeedStore;
    /** Provider used for the initial sync (real InstagramProvider in prod). */
    provider: FeedProvider;
    images?: ImageStore;
    /** Secret for signing the OAuth `state`. */
    stateSecret: string;
    /** Where to send the user after a successful connect. */
    successUrl: string;
    now?: () => number;
}

const redirect = (location: string): FeedReply => ({
    status: 302,
    headers: { location },
    body: '',
});

const error = (status: number, code: string): FeedReply => ({
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ error: code }),
});

/**
 * Step 1: start the OAuth dance. `feedId` is bound into a signed state so the
 * callback knows which feed to populate (e.g. mesto passes a business-scoped id).
 */
export function handleConnectStart(deps: ConnectDeps, feedId: string): FeedReply {
    if (!feedId.trim()) return error(400, 'missing_feed_id');
    const state = createState(feedId, deps.stateSecret, deps.now);
    return redirect(deps.oauth.authorizeUrl(state));
}

/**
 * Step 2: handle the redirect back. Verifies state, completes the token
 * exchange, stores the encrypted token, and runs the first sync.
 */
export async function handleConnectCallback(
    deps: ConnectDeps,
    query: { code?: string; state?: string; error?: string },
): Promise<FeedReply> {
    if (query.error) return error(400, 'oauth_denied');
    if (!query.code || !query.state) return error(400, 'missing_code_or_state');

    const payload = verifyState(query.state, deps.stateSecret, deps.now ? { now: deps.now } : {});
    if (!payload) return error(400, 'invalid_state');

    let connected: ConnectResult;
    try {
        connected = await deps.oauth.connect(query.code);
    } catch {
        return error(502, 'oauth_exchange_failed');
    }

    putToken(deps.accountStore, deps.encryptor, connected.account, connected.token, connected.expiresAt);

    await syncFeed({
        feedId: payload.feedId,
        account: connected.account,
        token: connected.token,
        provider: deps.provider,
        store: deps.feedStore,
        ...(deps.images ? { images: deps.images } : {}),
    });

    return redirect(`${deps.successUrl}?feed=${encodeURIComponent(payload.feedId)}`);
}
