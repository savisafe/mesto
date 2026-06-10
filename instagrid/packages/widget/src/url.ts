export interface FeedSource {
    /** Direct JSON URL (fixtures, demos) — wins over endpoint/feed. */
    src?: string | null;
    /** Base URL of the instagrid backend, e.g. https://api.example.com */
    endpoint?: string | null;
    /** Feed id assigned by the backend. */
    feed?: string | null;
}

/** Default public backend; overridable per-tag via the `endpoint` attribute. */
export const DEFAULT_ENDPOINT = 'https://api.instagrid.dev';

/**
 * Resolve where the widget fetches its feed JSON from. Returns null when there
 * is nothing to load (no `src` and no `feed`), so the caller can show a hint.
 */
export function buildFeedUrl({ src, endpoint, feed }: FeedSource): string | null {
    if (src && src.trim()) return src.trim();
    if (!feed || !feed.trim()) return null;
    const base = (endpoint && endpoint.trim() ? endpoint.trim() : DEFAULT_ENDPOINT).replace(/\/+$/, '');
    return `${base}/feeds/${encodeURIComponent(feed.trim())}`;
}
