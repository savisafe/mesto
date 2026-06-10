import type { ConnectedAccount, FeedProvider } from '@instagrid/core';
import type { FeedRecord, WritableFeedStore } from './types';
import type { ImageStore } from './image-store';

export interface SyncFeedOptions {
    feedId: string;
    account: ConnectedAccount;
    token: string;
    provider: FeedProvider;
    store: WritableFeedStore;
    /** Optional re-hosting of thumbnails (Instagram URLs are temporary). */
    images?: ImageStore;
    /** Injectable clock for tests. */
    now?: () => Date;
}

/**
 * One sync cycle: pull items from the provider, re-host thumbnails if an image
 * store is given, and upsert the public record. Returns the stored record.
 */
export async function syncFeed(opts: SyncFeedOptions): Promise<FeedRecord> {
    const raw = await opts.provider.sync(opts.account, opts.token);

    const images = opts.images;
    const items = images
        ? await Promise.all(
              raw.map(async (item) => ({
                  ...item,
                  thumbUrl: await images.store(item.thumbUrl, `${opts.feedId}/${item.id}`),
              })),
          )
        : raw;

    const record: FeedRecord = {
        feedId: opts.feedId,
        account: opts.account,
        items,
        updatedAt: (opts.now?.() ?? new Date()).toISOString(),
    };

    await opts.store.upsert(record);
    return record;
}

export type { ConnectedAccount };
