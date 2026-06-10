// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { defineIgGrid } from './ig-grid';
import type { FeedResponse } from '@instagrid/core';

const feed: FeedResponse = {
    username: 'studio',
    updatedAt: '2026-06-01T00:00:00Z',
    items: Array.from({ length: 6 }, (_, i) => ({
        id: String(i),
        type: 'image' as const,
        thumbUrl: `https://cdn/${i}.jpg`,
        permalink: `https://instagram.com/p/${i}`,
        caption: `post ${i}`,
        takenAt: '2026-06-01T00:00:00Z',
    })),
};

const mockFetch = (body: unknown, status = 200) =>
    vi.fn(async () => new Response(JSON.stringify(body), { status }));

describe('<ig-grid>', () => {
    beforeEach(() => {
        defineIgGrid();
        document.body.replaceChildren();
    });

    it('renders a grid capped to columns*rows, linking to permalinks', async () => {
        globalThis.fetch = mockFetch(feed) as unknown as typeof fetch;
        const el = document.createElement('ig-grid');
        el.setAttribute('src', './feed.json');
        el.setAttribute('columns', '2');
        el.setAttribute('rows', '2');
        document.body.append(el);

        await vi.waitFor(() => {
            expect(el.shadowRoot?.querySelectorAll('a.tile')).toHaveLength(4);
        });

        const first = el.shadowRoot?.querySelector('a.tile') as HTMLAnchorElement;
        expect(first.href).toContain('/p/0');
        expect(first.rel).toBe('noopener noreferrer');
        expect(el.shadowRoot?.querySelector('img')?.getAttribute('loading')).toBe('lazy');
    });

    it('shows a hint when neither feed nor src is set', async () => {
        const el = document.createElement('ig-grid');
        document.body.append(el);
        await vi.waitFor(() => {
            expect(el.shadowRoot?.querySelector('.msg')?.textContent).toContain('feed');
        });
    });

    it('shows an error with retry on a failed request', async () => {
        globalThis.fetch = mockFetch({}, 500) as unknown as typeof fetch;
        const el = document.createElement('ig-grid');
        el.setAttribute('src', './feed.json');
        document.body.append(el);
        await vi.waitFor(() => {
            expect(el.shadowRoot?.querySelector('button')?.textContent).toBe('Retry');
        });
    });
});
