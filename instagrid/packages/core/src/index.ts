// instagrid contract. The widget renders a `FeedResponse`; it never talks to
// Instagram directly. Backends produce this shape behind `FeedProvider`.

export type MediaType = 'image' | 'video' | 'carousel';

export interface FeedItem {
    id: string;
    type: MediaType;
    /** Stable, re-hosted thumbnail URL (Instagram's own URLs are temporary). */
    thumbUrl: string;
    /** Link to the original post. */
    permalink: string;
    caption?: string;
    /** ISO 8601 timestamp. */
    takenAt: string;
}

export interface FeedResponse {
    username: string;
    items: FeedItem[];
    /** ISO 8601 — when the backend last synced this feed. */
    updatedAt: string;
}

export type Theme = 'light' | 'dark';

export interface FeedConfig {
    columns: number;
    rows: number;
    /** Gap between tiles, px. */
    gap: number;
    /** Tile corner radius, px. */
    radius: number;
    theme: Theme;
}

export const DEFAULT_CONFIG: FeedConfig = {
    columns: 3,
    rows: 3,
    gap: 8,
    radius: 8,
    theme: 'light',
};

const LIMITS = {
    columns: { min: 1, max: 8 },
    rows: { min: 1, max: 8 },
    gap: { min: 0, max: 48 },
    radius: { min: 0, max: 48 },
} as const;

const clampInt = (value: unknown, min: number, max: number, fallback: number): number => {
    const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.trunc(n)));
};

export type FeedConfigInput = Partial<Record<keyof FeedConfig, unknown>>;

/** Coerce loose attribute input into a safe, bounded config. */
export function clampConfig(input: FeedConfigInput = {}): FeedConfig {
    return {
        columns: clampInt(input.columns, LIMITS.columns.min, LIMITS.columns.max, DEFAULT_CONFIG.columns),
        rows: clampInt(input.rows, LIMITS.rows.min, LIMITS.rows.max, DEFAULT_CONFIG.rows),
        gap: clampInt(input.gap, LIMITS.gap.min, LIMITS.gap.max, DEFAULT_CONFIG.gap),
        radius: clampInt(input.radius, LIMITS.radius.min, LIMITS.radius.max, DEFAULT_CONFIG.radius),
        theme: input.theme === 'dark' ? 'dark' : 'light',
    };
}

/** How many tiles the grid shows for a given config. */
export const tileCount = (config: FeedConfig): number => config.columns * config.rows;

/** The slice of items actually rendered (most recent first, capped to the grid). */
export function visibleItems(items: readonly FeedItem[], config: FeedConfig): FeedItem[] {
    return items.slice(0, tileCount(config));
}

export const gridTemplateColumns = (config: FeedConfig): string =>
    `repeat(${config.columns}, minmax(0, 1fr))`;

// ---- Backend-side contract (implemented by @instagrid/server providers) ----

export interface ConnectedAccount {
    provider: string;
    externalUserId: string;
    username: string;
}

export interface TokenInfo {
    accessToken: string;
    /** ISO 8601 expiry. */
    expiresAt: string;
}

/**
 * A source of feed items. Instagram is the first implementation; others
 * (manual gallery, TikTok…) satisfy the same interface so the widget and API
 * stay unchanged.
 */
export interface FeedProvider {
    readonly id: string;
    sync(account: ConnectedAccount, token: string): Promise<FeedItem[]>;
    refresh?(token: string): Promise<TokenInfo>;
}
