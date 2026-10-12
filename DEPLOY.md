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
| `functions/` | **Not in the repo yet** — the live `/api/scores` + `/api/players` Pages Functions (D1) |

## Build + test

```bash
npm test          # builds into a temp dir and checks links, redirects, catalog, sims, word lists
npm run build     # writes dist/
```

No npm dependencies. Node 20+.

## Deploy the site (Pages)

The live leaderboard API is a set of Pages Functions with a D1 binding that currently live only in
the deploy folder, not in this repo. **Deploying `dist/` without them removes the API.** So:

1. Copy the existing `functions/` folder (scores + players) into the repo root, unchanged.
2. Make sure `wrangler.toml` carries the same D1 binding the live project uses (binding name and
   database id), because a `wrangler.toml` with `pages_build_output_dir` overrides dashboard bindings.
3. `npm run build && npx wrangler pages deploy dist --project-name=promptarcade`
   (use `--branch=v3-preview` first for a preview URL).
4. Check on the deployment: `/api/scores` returns JSON, a game saves a score, `/games/neon-tetris/` redirects.

The scores API must accept the new slugs: glowline-arena, ember-swarm, nebula-drop, wordglow,
block-bloom, gridstorm, deepdelve, skystack (plus the eight existing ones).

## Deploy multiplayer (optional)

```bash
cd worker/arena && npx wrangler deploy
```

Creates Worker `promptarcade-arena` with Durable Object `ArenaRoom` on the custom domain
`arena.promptarcade.games`. Health check: `https://arena.promptarcade.games/health` → `ok`.
Without it, Glowline Arena plays offline against bots.

## Never commit

`node_modules/`, `dist/`, `.wrangler/`, `.env*`, `.dev.vars`, API tokens, account secrets.
