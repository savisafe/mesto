import {
    clampConfig,
    visibleItems,
    gridTemplateColumns,
    type FeedConfig,
    type FeedResponse,
} from '@instagrid/core';
import { buildFeedUrl } from './url';

const CONFIG_ATTRS = ['columns', 'rows', 'gap', 'radius', 'theme'] as const;
const SOURCE_ATTRS = ['feed', 'endpoint', 'src'] as const;

function styles(config: FeedConfig): string {
    const fg = config.theme === 'dark' ? '#e5e7eb' : '#27272a';
    const muted = config.theme === 'dark' ? '#9ca3af' : '#71717a';
    return `
    :host { display: block; }
    .grid {
      display: grid;
      grid-template-columns: ${gridTemplateColumns(config)};
      gap: ${config.gap}px;
    }
    .tile {
      position: relative;
      display: block;
      aspect-ratio: 1 / 1;
      overflow: hidden;
      border-radius: ${config.radius}px;
      background: ${config.theme === 'dark' ? '#18181b' : '#f4f4f5'};
    }
    .tile img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform .2s ease, opacity .2s ease;
    }
    .tile:hover img { transform: scale(1.04); opacity: .9; }
    .msg { color: ${muted}; font: 14px system-ui, sans-serif; padding: 12px 0; }
    .msg button {
      margin-left: 8px; color: ${fg}; cursor: pointer;
      background: none; border: 0; text-decoration: underline; font: inherit;
    }
  `;
}

/**
 * `<ig-grid>` — renders a normalised feed JSON as a responsive grid.
 *
 *   <ig-grid feed="ab12" columns="3" rows="3"></ig-grid>
 *   <ig-grid src="./feed.sample.json"></ig-grid>   <!-- local/demo -->
 */
export class IgGrid extends HTMLElement {
    static get observedAttributes(): string[] {
        return [...CONFIG_ATTRS, ...SOURCE_ATTRS];
    }

    private root: ShadowRoot;
    private data: FeedResponse | null = null;
    private controller: AbortController | null = null;

    constructor() {
        super();
        this.root = this.attachShadow({ mode: 'open' });
    }

    connectedCallback(): void {
        void this.load();
    }

    disconnectedCallback(): void {
        this.controller?.abort();
    }

    attributeChangedCallback(name: string, prev: string | null, next: string | null): void {
        if (!this.isConnected || prev === next) return;
        if ((SOURCE_ATTRS as readonly string[]).includes(name)) {
            void this.load();
        } else if (this.data) {
            this.renderGrid(this.data);
        }
    }

    private config(): FeedConfig {
        return clampConfig({
            columns: this.getAttribute('columns'),
            rows: this.getAttribute('rows'),
            gap: this.getAttribute('gap'),
            radius: this.getAttribute('radius'),
            theme: this.getAttribute('theme'),
        });
    }

    private async load(): Promise<void> {
        const url = buildFeedUrl({
            src: this.getAttribute('src'),
            endpoint: this.getAttribute('endpoint'),
            feed: this.getAttribute('feed'),
        });
        if (!url) {
            this.renderMessage('Set a "feed" id or "src" attribute.');
            return;
        }

        this.controller?.abort();
        this.controller = new AbortController();
        this.renderMessage('Loading…');

        try {
            const res = await fetch(url, { signal: this.controller.signal });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = (await res.json()) as FeedResponse;
            this.data = data;
            this.renderGrid(data);
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') return;
            this.renderError();
        }
    }

    private renderMessage(text: string): void {
        this.root.replaceChildren();
        const style = document.createElement('style');
        style.textContent = styles(this.config());
        const p = document.createElement('p');
        p.className = 'msg';
        p.textContent = text;
        this.root.append(style, p);
    }

    private renderError(): void {
        this.root.replaceChildren();
        const style = document.createElement('style');
        style.textContent = styles(this.config());
        const p = document.createElement('p');
        p.className = 'msg';
        p.textContent = 'Could not load the feed.';
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.textContent = 'Retry';
        retry.addEventListener('click', () => void this.load());
        p.append(retry);
        this.root.append(style, p);
    }

    private renderGrid(data: FeedResponse): void {
        const config = this.config();
        const items = visibleItems(data.items ?? [], config);

        this.root.replaceChildren();
        const style = document.createElement('style');
        style.textContent = styles(config);
        this.root.append(style);

        if (items.length === 0) {
            const p = document.createElement('p');
            p.className = 'msg';
            p.textContent = 'No posts yet.';
            this.root.append(p);
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'grid';
        for (const item of items) {
            const a = document.createElement('a');
            a.className = 'tile';
            a.href = item.permalink;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';

            const img = document.createElement('img');
            img.loading = 'lazy';
            img.src = item.thumbUrl;
            img.alt = item.caption ?? `@${data.username}`;

            a.append(img);
            grid.append(a);
        }
        this.root.append(grid);
    }
}

export const TAG_NAME = 'ig-grid';

/** Register `<ig-grid>` once. Safe to call multiple times. */
export function defineIgGrid(tag: string = TAG_NAME): void {
    if (typeof customElements === 'undefined') return;
    if (!customElements.get(tag)) customElements.define(tag, IgGrid);
}
