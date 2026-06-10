import type { ConnectedAccount, FeedItem, FeedProvider } from '@instagrid/core';

/**
 * Provider that returns a fixed set of items. Lets the whole sync pipeline and
 * the DB store be built and tested end-to-end without Meta credentials.
 */
export class MockProvider implements FeedProvider {
    readonly id = 'mock';

    constructor(private readonly items: FeedItem[]) {}

    sync(_account: ConnectedAccount, _token: string): Promise<FeedItem[]> {
        return Promise.resolve(this.items);
    }
}
