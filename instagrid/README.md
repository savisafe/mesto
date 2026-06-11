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
| `@instagrid/server` | ✅ phase 2–5 | Public `GET /feeds/:id`, sync pipeline, providers, token encryption, OAuth connect flow, cron token refresh |
| `@instagrid/react` | ✅ phase 5 | `<InstaGrid>` — thin React wrapper around `<ig-grid>` |

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

## Connecting an Instagram account (OAuth)

The connect flow is implemented (`InstagramOAuth` + `handleConnectStart` /
`handleConnectCallback`) and tested against mocked Graph endpoints. To run it
against real Instagram you need a **Meta app** (Instagram Login product) and
these server-only env values:

| Env | Purpose |
| --- | --- |
| `INSTAGRID_IG_CLIENT_ID` | Meta app client id |
| `INSTAGRID_IG_CLIENT_SECRET` | Meta app secret |
| `INSTAGRID_REDIRECT_URI` | OAuth callback, e.g. `https://api.example.com/callback` |
| `INSTAGRID_STATE_SECRET` | HMAC secret for the OAuth `state` |
| `INSTAGRID_TOKEN_KEY` | base64 32-byte key for token encryption at rest |

Flow: `GET /connect?feed=<id>` → Instagram authorize → `GET /callback` exchanges
the code for a long-lived token, encrypts it, and runs the first sync. The
account requires an Instagram **Business/Creator** account; going live for other
users needs Meta app review.

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

## Isolation & extraction

instagrid is self-contained (own lockfile, `tsconfig`, tests, CI) and imports
nothing from the host app, so it can be lifted into its own repository at any
time — see [docs/EXTRACTION.md](./docs/EXTRACTION.md). Contributing guidelines:
[CONTRIBUTING.md](./CONTRIBUTING.md).

Connecting a real Instagram account: [docs/META_SETUP.md](./docs/META_SETUP.md).

## License

MIT — see [LICENSE](./LICENSE).
