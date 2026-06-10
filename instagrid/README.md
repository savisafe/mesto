# instagrid

Self-hostable, framework-agnostic **Instagram feed grid** widget.

> Drop a `<script>` and one tag, get a responsive grid of the latest posts.
> No paid SaaS, no per-page API keys — the widget renders a public JSON feed
> served by a backend you control.

This repository is developed in isolation so it can be extracted into its own
open-source project (MIT). It currently lives next to the `mesto` app while
the contract and the client are stabilised; nothing here imports `mesto`.

## Why a backend?

Instagram only exposes posts through the official **Graph API** (the Basic
Display API was shut down by Meta on 2024-12-04). There is no compliant way to
fetch a feed "by username" from the browser. So instagrid is two halves:

- **`@instagrid/widget`** — a tiny, dependency-free Web Component that renders a
  normalised feed JSON. Knows nothing about Instagram. ⭐ the open-source core.
- **`@instagrid/server`** *(later phase)* — connects an account via OAuth,
  caches media, and serves a public, CDN-friendly `GET /feeds/:id` JSON.

Because the client only consumes a generic `FeedResponse`, the same widget can
later render other sources (manual gallery, TikTok, …) behind the same API.

## The embed (goal DX)

```html
<script src="https://cdn.example.com/instagrid.js" async></script>
<ig-grid feed="ab12cd" columns="3" rows="3"></ig-grid>
```

For local development / demos you can point the widget straight at a JSON file
instead of a backend:

```html
<ig-grid src="./fixtures/feed.sample.json" columns="3" rows="3"></ig-grid>
```

## Packages

| Package | Status | Description |
| --- | --- | --- |
| `@instagrid/core` | ✅ phase 1 | Types (`FeedItem`, `FeedResponse`, `FeedConfig`), config clamping, grid helpers, `FeedProvider` interface |
| `@instagrid/widget` | ✅ phase 1 | `<ig-grid>` Web Component (vanilla, zero-deps) |
| `@instagrid/server` | ✅ phase 2–3 | Public `GET /feeds/:id` + sync pipeline, providers (`MockProvider`, real `InstagramProvider`), token encryption. OAuth connect lands in phase 4 |
| `@instagrid/react` | ⏳ | Thin React wrapper |

### Run the reference API locally

```bash
cd instagrid/packages/server
npm run dev    # serves the fixture at http://localhost:8787/feeds/demo
```

Then point the widget at it:

```html
<ig-grid endpoint="http://localhost:8787" feed="demo"></ig-grid>
```

The server returns only public post fields — tokens and account internals never
leave the backend (`toFeedResponse` is the boundary).

## Roadmap

1. **Contract + client** — types and a working `<ig-grid>` rendering from a
   static fixture. *(this phase)*
2. **Public feed API** — reference server serving cached posts from a DB.
3. **Instagram provider** — OAuth connect, token refresh, media sync, image
   re-hosting (Instagram media URLs are temporary).
4. **Connect dashboard** — "Connect Instagram" → `feedId` + embed snippet.
5. **Hardening + OSS release** — rate limits, docs, demo deploy, npm publish.
6. **`mesto` integration** — store `feedId` per business, replace the SnapWidget
   field with the native widget.

## Develop

```bash
cd instagrid
npm install
npm test          # core + widget unit tests
npm run build     # type-check + emit ESM
```

## License

MIT — see [LICENSE](./LICENSE).
