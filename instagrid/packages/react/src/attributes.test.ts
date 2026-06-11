import { describe, it, expect } from 'vitest';
import { toAttributes } from './attributes';

describe('toAttributes', () => {
    it('stringifies set props and omits undefined', () => {
        expect(toAttributes({ feed: 'ab12', columns: 3, rows: 2, theme: 'dark' })).toEqual({
            feed: 'ab12',
            columns: '3',
            rows: '2',
            theme: 'dark',
        });
    });

    it('returns an empty map for empty props', () => {
        expect(toAttributes({})).toEqual({});
    });

    it('keeps src/endpoint for backendless and custom-backend use', () => {
        expect(toAttributes({ src: './feed.json' })).toEqual({ src: './feed.json' });
        expect(toAttributes({ endpoint: 'https://api.test', feed: 'x' })).toEqual({
            endpoint: 'https://api.test',
            feed: 'x',
        });
    });
});
