import type { ConnectedAccount } from '@instagrid/core';

const AUTHORIZE_BASE = 'https://www.instagram.com/oauth/authorize';
const TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
const GRAPH_BASE = 'https://graph.instagram.com';
const DEFAULT_SCOPE = 'instagram_business_basic';

export interface InstagramOAuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scope?: string;
    /** Injectable for tests. */
    fetchImpl?: typeof fetch;
    authorizeBase?: string;
    tokenUrl?: string;
    graphBase?: string;
    now?: () => number;
}

export interface ConnectResult {
    account: ConnectedAccount;
    /** Long-lived access token (encrypt before storing). */
    token: string;
    /** ISO 8601 expiry. */
    expiresAt: string;
}

/**
 * Instagram Login (Graph API) OAuth. Implements the full connect chain:
 * code → short-lived token → long-lived token → profile. Endpoints are
 * overridable so the whole flow is testable without Meta.
 */
export class InstagramOAuth {
    private readonly cfg: Required<Omit<InstagramOAuthConfig, 'now'>> & { now: () => number };

    constructor(config: InstagramOAuthConfig) {
        this.cfg = {
            scope: DEFAULT_SCOPE,
            fetchImpl: config.fetchImpl ?? fetch,
            authorizeBase: config.authorizeBase ?? AUTHORIZE_BASE,
            tokenUrl: config.tokenUrl ?? TOKEN_URL,
            graphBase: (config.graphBase ?? GRAPH_BASE).replace(/\/+$/, ''),
            now: config.now ?? Date.now,
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            redirectUri: config.redirectUri,
            ...(config.scope ? { scope: config.scope } : {}),
        };
    }

    /** Where to send the user to grant access. */
    authorizeUrl(state: string): string {
        const params = new URLSearchParams({
            client_id: this.cfg.clientId,
            redirect_uri: this.cfg.redirectUri,
            response_type: 'code',
            scope: this.cfg.scope,
            state,
        });
        return `${this.cfg.authorizeBase}?${params.toString()}`;
    }

    /** Exchange the authorization code for a short-lived token. */
    async exchangeCode(code: string): Promise<{ accessToken: string; userId: string }> {
        const form = new URLSearchParams({
            client_id: this.cfg.clientId,
            client_secret: this.cfg.clientSecret,
            grant_type: 'authorization_code',
            redirect_uri: this.cfg.redirectUri,
            code,
        });
        const res = await this.cfg.fetchImpl(this.cfg.tokenUrl, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: form.toString(),
        });
        if (!res.ok) throw new Error(`code exchange failed: HTTP ${res.status}`);
        const body = (await res.json()) as { access_token: string; user_id: number | string };
        return { accessToken: body.access_token, userId: String(body.user_id) };
    }

    /** Upgrade a short-lived token to a long-lived (60-day) one. */
    async exchangeForLongLived(shortToken: string): Promise<{ accessToken: string; expiresAt: string }> {
        const url =
            `${this.cfg.graphBase}/access_token?grant_type=ig_exchange_token` +
            `&client_secret=${encodeURIComponent(this.cfg.clientSecret)}` +
            `&access_token=${encodeURIComponent(shortToken)}`;
        const res = await this.cfg.fetchImpl(url);
        if (!res.ok) throw new Error(`long-lived exchange failed: HTTP ${res.status}`);
        const body = (await res.json()) as { access_token: string; expires_in: number };
        return {
            accessToken: body.access_token,
            expiresAt: new Date(this.cfg.now() + body.expires_in * 1000).toISOString(),
        };
    }

    /** Read the connected account's id + username. */
    async fetchProfile(token: string): Promise<{ externalUserId: string; username: string }> {
        const url = `${this.cfg.graphBase}/me?fields=id,username&access_token=${encodeURIComponent(token)}`;
        const res = await this.cfg.fetchImpl(url);
        if (!res.ok) throw new Error(`profile fetch failed: HTTP ${res.status}`);
        const body = (await res.json()) as { id: string; username: string };
        return { externalUserId: body.id, username: body.username };
    }

    /** Full chain: code → long-lived token + account. */
    async connect(code: string): Promise<ConnectResult> {
        const short = await this.exchangeCode(code);
        const long = await this.exchangeForLongLived(short.accessToken);
        const profile = await this.fetchProfile(long.accessToken);
        return {
            account: {
                provider: 'instagram',
                externalUserId: profile.externalUserId,
                username: profile.username,
            },
            token: long.accessToken,
            expiresAt: long.expiresAt,
        };
    }
}
