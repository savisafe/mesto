import { describe, it, expect } from 'vitest';
import {
    clampConfig,
    DEFAULT_CONFIG,
    tileCount,
    visibleItems,
    gridTemplateColumns,
    type FeedItem,
} from './index';

const makeItems = (n: number): FeedItem[] =>
    Array.from({ length: n }, (_, i) => ({
        id: String(i),
        type: 'image' as const,
        thumbUrl: `https://cdn/${i}.jpg`,
        permalink: `https://instagram.com/p/${i}`,
        takenAt: '2026-01-01T00:00:00Z',
    }));

describe('clampConfig', () => {
    it('falls back to defaults for missing/garbage input', () => {
        expect(clampConfig()).toEqual(DEFAULT_CONFIG);
        expect(clampConfig({ columns: 'abc', rows: null })).toEqual(DEFAULT_CONFIG);
    });

    it('parses string attributes and bounds them', () => {
        expect(clampConfig({ columns: '4', rows: '2', gap: '12' })).toMatchObject({
            columns: 4,
            rows: 2,
            gap: 12,
        });
        expect(clampConfig({ columns: 999 }).columns).toBe(8);
        expect(clampConfig({ columns: 0 }).columns).toBe(1);
        expect(clampConfig({ gap: -5 }).gap).toBe(0);
    });

    it('only accepts dark/light theme', () => {
        expect(clampConfig({ theme: 'dark' }).theme).toBe('dark');
        expect(clampConfig({ theme: 'neon' }).theme).toBe('light');
    });
});

describe('grid helpers', () => {
    it('tileCount = columns * rows', () => {
        expect(tileCount(clampConfig({ columns: 3, rows: 3 }))).toBe(9);
    });

    it('visibleItems caps to the grid size', () => {
        const cfg = clampConfig({ columns: 2, rows: 2 });
        expect(visibleItems(makeItems(10), cfg)).toHaveLength(4);
        expect(visibleItems(makeItems(3), cfg)).toHaveLength(3);
    });

    it('gridTemplateColumns', () => {
        expect(gridTemplateColumns(clampConfig({ columns: 3 }))).toBe('repeat(3, minmax(0, 1fr))');
    });
});
