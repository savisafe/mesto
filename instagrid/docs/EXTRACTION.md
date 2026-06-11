# Extracting instagrid into its own repository

`instagrid/` is self-contained: it has its own `package.json`, lockfile,
`tsconfig`, tests, LICENSE and CI, and imports nothing from the host app. It can
be lifted out at any time, preserving history.

## Option A — keep git history (recommended)

```bash
# From the mesto repo root, split the subtree into a branch:
git subtree split --prefix=instagrid -b instagrid-export

# Create the new repo and push the split branch as its main:
cd /tmp && git clone <mesto-url> instagrid && cd instagrid
git checkout instagrid-export
git remote remove origin
git remote add origin git@github.com:<you>/instagrid.git
git push -u origin instagrid-export:main
```

(Alternatively, `git filter-repo --subdirectory-filter instagrid` on a fresh
clone yields the same result with cleaner history rewriting.)

## Option B — fresh copy (no history)

```bash
cp -r instagrid /tmp/instagrid && cd /tmp/instagrid
git init && git add -A && git commit -m "init: instagrid"
```

## After extraction

1. Move `.github/workflows/ci.yml` is already at the repo root of the extract
   (it lives in `instagrid/.github/`), so CI runs immediately. Delete the host
   repo's `.github/workflows/instagrid.yml` lane.
2. Bump package versions off `0.0.0` and publish `@instagrid/*` to npm
   (`core`, `widget`, `react` are the public ones; `server` is a reference impl).
3. Wire deployment for `@instagrid/server` (see `docs/META_SETUP.md` for the
   Instagram credentials it needs).

## What must stay true

- No `import` from outside `instagrid/`.
- `npm ci && npm run typecheck && npm test` passes from the `instagrid/` root.
