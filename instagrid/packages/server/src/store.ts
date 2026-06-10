import type { FeedRecord, FeedStore } from './types';

/**
 * In-memory feed store. Phase 2 seeds it from fixtures; later phases replace it
 * with a DB-backed store (same interface), fed by the sync job.
 */
export class MemoryFeedStore implements FeedStore {
    private records = new Map<string, FeedRecord>();

    constructor(seed: FeedRecord[] = []) {
        for (const rec of seed) this.records.set(rec.feedId, rec);
    }

    getFeed(feedId: string): FeedRecord | null {
        return this.records.get(feedId) ?? null;
    }

    upsert(record: FeedRecord): void {
        this.records.set(record.feedId, record);
    }

    get size(): number {
        return this.records.size;
    }
}
