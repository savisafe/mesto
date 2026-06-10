import type {
    ConnectedAccount,
    FeedItem,
    FeedProvider,
    MediaType,
    TokenInfo,
} from '@instagrid/core';

const GRAPH_BASE = 'https://graph.instagram.com';
const MEDIA_FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';

/** Raw media object from the Instagram Graph API. */
export interface IgMedia {
    id: string;
    caption?: string;
    media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
    media_url?: string;
    thumbnail_url?: string;
    permalink: string;
    timestamp: string;
}

interface IgMediaResponse {
    data?: IgMedia[];
}

const TYPE_MAP: Record<IgMedia['media_type'], MediaType> = {
    IMAGE: 'image',
    VIDEO: 'video',
    CAROUSEL_ALBUM: 'carousel',
};

/** Map a Graph API media object to the normalised feed item. */
export function normalizeMedia(m: IgMedia): FeedItem {
    // Videos expose a poster via thumbnail_url; images use media_url.
    const thumb = m.media_type === 'VIDEO' ? m.thumbnail_url ?? m.media_url : m.media_url ?? m.thumbnail_url;
    return {
        id: m.id,
        type: TYPE_MAP[m.media_type],
        thumbUrl: thumb ?? '',
        permalink: m.permalink,
        ...(m.caption ? { caption: m.caption } : {}),
        takenAt: new Date(m.timestamp).toISOString(),
    };
}

export interface InstagramProviderOptions {
    /** Injectable for tests; defaults to global fetch. */
    fetchImpl?: typeof fetch;
    /** Override the Graph base URL (tests). */
    baseUrl?: string;
    /** Max items to pull. */
    limit?: number;
}

/**
 * Real Instagram source via the Graph API. Fully implemented; it only needs a
 * valid access token, which the OAuth connect flow (phase 4) provides.
 */
export class InstagramProvider implements FeedProvider {
    readonly id = 'instagram';
    private readonly fetchImpl: typeof fetch;
    private readonly baseUrl: string;
    private readonly limit: number;

    constructor({ fetchImpl, baseUrl = GRAPH_BASE, limit = 24 }: InstagramProviderOptions = {}) {
        this.fetchImpl = fetchImpl ?? fetch;
        this.baseUrl = baseUrl.replace(/\/+$/, '');
        this.limit = limit;
    }

    async sync(_account: ConnectedAccount, token: string): Promise<FeedItem[]> {
        const url =
            `${this.baseUrl}/me/media?fields=${MEDIA_FIELDS}` +
            `&limit=${this.limit}&access_token=${encodeURIComponent(token)}`;
        const res = await this.fetchImpl(url);
        if (!res.ok) throw new Error(`instagram sync failed: HTTP ${res.status}`);
        const body = (await res.json()) as IgMediaResponse;
        return (body.data ?? []).map(normalizeMedia);
    }

    /** Extend a long-lived token (valid 60 days, refreshable after 24h). */
    async refresh(token: string): Promise<TokenInfo> {
        const url =
            `${this.baseUrl}/refresh_access_token?grant_type=ig_refresh_token` +
            `&access_token=${encodeURIComponent(token)}`;
        const res = await this.fetchImpl(url);
        if (!res.ok) throw new Error(`instagram token refresh failed: HTTP ${res.status}`);
        const body = (await res.json()) as { access_token: string; expires_in: number };
        return {
            accessToken: body.access_token,
            expiresAt: new Date(Date.now() + body.expires_in * 1000).toISOString(),
        };
    }
}
