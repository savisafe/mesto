import { describe, it, expect } from 'vitest';
import { buildFeedUrl, DEFAULT_ENDPOINT } from './url';

describe('buildFeedUrl', () => {
    it('prefers an explicit src (fixtures/demo)', () => {
        expect(buildFeedUrl({ src: './feed.json', feed: 'x' })).toBe('./feed.json');
    });

    it('builds the backend URL from endpoint + feed', () => {
        expect(buildFeedUrl({ endpoint: 'https://api.test', feed: 'ab12' })).toBe(
            'https://api.test/feeds/ab12',
        );
    });

    it('trims trailing slashes and encodes the id', () => {
        expect(buildFeedUrl({ endpoint: 'https://api.test/', feed: 'a b' })).toBe(
            'https://api.test/feeds/a%20b',
        );
    });

    it('falls back to the default endpoint', () => {
        expect(buildFeedUrl({ feed: 'xyz' })).toBe(`${DEFAULT_ENDPOINT}/feeds/xyz`);
    });

    it('returns null when there is nothing to load', () => {
        expect(buildFeedUrl({})).toBeNull();
        expect(buildFeedUrl({ feed: '   ' })).toBeNull();
    });
});
