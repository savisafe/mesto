# Connecting instagrid to Instagram (Meta app setup)

To pull a real feed, `@instagrid/server` needs a **Meta app** with the
**Instagram API with Instagram Login** product. This is a one-time setup; after
it, each studio connects their own account via the OAuth flow.

> The connected Instagram account must be a **Business** or **Creator** account
> (Settings → switch account type in the Instagram app). Personal accounts are
> not supported by the API.

## 1. Create the Meta app

1. Go to <https://developers.facebook.com/apps/> → **Create app**.
2. Pick the **Business** app type (or "Other" → Business).
3. In the app dashboard → **Add product** → **Instagram** →
   **API setup with Instagram login**.

## 2. Configure OAuth

In **Instagram → API setup with Instagram login**:

1. Note the **Instagram app ID** and **Instagram app secret** (these are the
   Instagram-specific credentials, not the top-level Meta App ID).
2. Under **Business login settings** → **OAuth redirect URIs**, add your
   callback **exactly** (https):
   ```
   https://<your-server>/callback
   ```
3. Required permission (scope): `instagram_business_basic` — covers profile +
   media read, which is all the widget needs.

## 3. Add test accounts (development mode)

While the app is in development, only roles/testers can connect:

1. App dashboard → **Roles** (or Instagram → API setup → **Instagram testers**)
   → add the studio's Instagram username.
2. The studio accepts the invite in Instagram →
   **Settings → Apps and websites → Tester invites**.

## 4. Server environment

Set these **server-only** values on the `@instagrid/server` deployment:

| Env | Value |
| --- | --- |
| `INSTAGRID_IG_CLIENT_ID` | Instagram app ID (step 2.1) |
| `INSTAGRID_IG_CLIENT_SECRET` | Instagram app secret (step 2.1) |
| `INSTAGRID_REDIRECT_URI` | `https://<your-server>/callback` (must match step 2.2) |
| `INSTAGRID_STATE_SECRET` | random string — `openssl rand -hex 32` |
| `INSTAGRID_TOKEN_KEY` | base64 32-byte key — `openssl rand -base64 32` |

These map directly to `InstagramOAuth({ clientId, clientSecret, redirectUri })`,
`createState/verifyState(secret)` and `new Encryptor(Buffer.from(key,'base64'))`.

## 5. The connect flow

1. Studio hits `GET /connect?feed=<feedId>` → redirect to Instagram authorize.
2. Instagram redirects back to `GET /callback?code=...&state=...`.
3. Server exchanges the code for a long-lived token (60 days), encrypts and
   stores it, and runs the first sync. The feed is then live at
   `GET /feeds/<feedId>`.
4. A cron calls `refreshDueTokens(...)` (e.g. daily) to keep tokens fresh.

## 6. Going live (App Review)

To connect accounts you don't own, request **Advanced Access** for
`instagram_business_basic` in **App Review**, with a screencast of the connect
flow. Until approved, the app works only for the testers from step 3.

## Notes

- Long-lived tokens last 60 days and are refreshable after 24h; the refresh cron
  handles this. If a token lapses, the studio re-connects via `/connect`.
- Instagram media URLs are temporary — the sync pipeline re-hosts thumbnails via
  the configured `ImageStore`, so the grid never shows broken images.
