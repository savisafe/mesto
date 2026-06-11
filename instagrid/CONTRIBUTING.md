# Contributing to instagrid

## Layout

npm-workspaces monorepo, framework-agnostic where possible:

```
packages/core     types + pure helpers (no deps)
packages/widget   <ig-grid> Web Component (vanilla)
packages/server   reference backend (Node-flavoured; pure handlers + thin adapters)
packages/react    <InstaGrid> React wrapper
apps/demo         static demo page
fixtures          sample feed JSON
```

## Rules

- **No dependency on any host app.** instagrid must build and test standalone.
- Keep the **widget dependency-free** — it ships to other people's pages.
- Push logic into **pure functions** (config clamping, URL building, request
  handling, normalisation) and keep adapters (Node `http`, DOM) thin. Pure code
  is what the tests target.
- Tokens and secrets never leave the server; the public API only serves
  `toFeedResponse` output.

## Develop

```bash
npm ci
npm run typecheck   # tsc -b across packages
npm test            # vitest (node + happy-dom)
npm run build       # emit dist/ per package
```

Run the reference API with the fixture:

```bash
cd packages/server && npm run dev   # http://localhost:8787/feeds/demo
```
