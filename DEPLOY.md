# PromptArcade.Games deploy

**Domain:** promptarcade.games (wire DNS later)  
**Pages project:** `promptarcade`  
**Contact lock:** support@promptarcade.games only

## Build + deploy

```bash
cd /workspace/promptarcade-deploy
python3 scripts/build.py
export WRANGLER_CACHE_DIR=/tmp/wrangler-cache
npx wrangler pages deploy dist --project-name=promptarcade
```

## Leaderboards

v1: per-game Top 10 in `localStorage` (`pa_scores_<slug>`), same POST shape as `/api/games/:slug/scores` for a future D1 Worker.

## Overlay → dist

Edit under `overlay/`, run `scripts/build.py` (regenerates hub/plates/legal and copies everything to `dist/`).
