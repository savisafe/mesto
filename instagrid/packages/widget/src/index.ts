import { defineIgGrid } from './ig-grid';

export { IgGrid, defineIgGrid, TAG_NAME } from './ig-grid';
export { buildFeedUrl, DEFAULT_ENDPOINT, type FeedSource } from './url';

// Auto-register when loaded as a script on a page (the one-line embed).
defineIgGrid();
