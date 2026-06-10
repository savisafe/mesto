/**
 * Re-hosts post thumbnails to a stable location. Instagram's `media_url` /
 * `thumbnail_url` are short-lived CDN links, so the sync job copies them to our
 * storage and serves those URLs instead.
 */
export interface ImageStore {
    /** Copy `sourceUrl` under `key`, return a stable public URL. */
    store(sourceUrl: string, key: string): Promise<string>;
}

/**
 * No-op store: returns the source URL unchanged. Fine for the mock pipeline and
 * tests; production uses a blob-backed implementation (S3 / Vercel Blob).
 */
export class PassthroughImageStore implements ImageStore {
    store(sourceUrl: string): Promise<string> {
        return Promise.resolve(sourceUrl);
    }
}
