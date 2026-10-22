# PromptArcade deploy

**Site:** https://promptarcade.games · **Cloudflare Pages project:** `promptarcade` · **Contact:** support@promptarcade.games only

## What's in this repo

| Path | What it is |
| --- | --- |
| `src/catalog.mjs` | Every game on the site: title, credits (model / how it was made), copy, quests, retired slugs, news |
| `src/play/` | The games themselves (`<slug>.html`) plus the shared kit: `pa-score.js` (leaderboards), `pa-gate.js` (name gate), `pa-kit.js` (pause, audio, results card, Arcade Pass) |
| `src/play/arena/` | Glowline Arena simulation — used by the browser **and** the multiplayer server |
| `src/assets/`, `src/fonts/`, `src/vendor/`, `src/shots/`, `src/og/`, `src/icons/`, `src/static/` | Site CSS/JS, self-hosted fonts (OFL), three.js, screenshots, social images, icons, favicon |
| `scripts/build.mjs` | Static generator: `src/` → `dist/` (pages, source viewers, sitemap, `_redirects`, `_headers`, `pa-data.js`) |
| `worker/arena/` | Separate Cloudflare Worker + Durable Object for live multiplayer (optional) |
| `functions/` | The live Pages Functions: `/api/scores`, `/api/players`, `/api/auth`, `/api/account` (D1, KV fallback, Workers AI name moderation). `functions/_shared/games.js` is the score allow-list |
| `wrangler.toml` | Pages config and bindings (D1 `SCORES`, KV `SCORES_KV`, `AI`), with separate preview bindings. Ids only, no secrets |

## Build + test

```bash
npm test          # builds into a temp dir and checks links, redirects, catalog, sims, word lists
npm run build     # writes dist/
```

No npm dependencies. Node 20+.

## Deploy the site (Pages)

`functions/` and `wrangler.toml` are in the repo and are deployed exactly as they are; don't copy in
anything from elsewhere or edit bindings for a deploy. `wrangler.toml` sets `pages_build_output_dir`,
so its bindings override the dashboard's: production uses the `promptarcade-scores` D1 database and
every other branch uses `promptarcade-scores-preview`, so preview test runs never touch the live boards.

Secrets (`SCORE_SALT`, `RESEND_API_KEY`) live only in the Cloudflare dashboard, never in files.

Deploys are done by hand with wrangler, from an up-to-date `main`:

1. `git checkout main && git pull`, then `npm test` (must pass) and `npm run build`.
2. Preview first:
   `npx wrangler pages deploy dist --project-name=promptarcade --branch=v3-preview`
   and check it (`/api/scores/<slug>` returns JSON, the changed games load without console errors).
3. Production:
   `npx wrangler pages deploy dist --project-name=promptarcade --branch=main`
   Note the previous production deployment id first (`npx wrangler pages deployment list
   --project-name=promptarcade --environment=production`) so you can roll back to it.
4. Check production: `/api/scores` returns JSON, the changed pages load, `/games/neon-tetris/` redirects.
   Don't save test scores to the production boards.

A new game needs its slug added to `functions/_shared/games.js`, or `/api/scores` rejects its scores.

## Deploy multiplayer (optional)

```bash
cd worker/arena && npx wrangler deploy
```

Creates Worker `promptarcade-arena` with Durable Object `ArenaRoom` on the custom domain
`arena.promptarcade.games`. Health check: `https://arena.promptarcade.games/health` → `ok`.
Without it, Glowline Arena plays offline against bots.

## Never commit

`node_modules/`, `dist/`, `.wrangler/`, `.env*`, `.dev.vars`, API tokens, account secrets.
