# PromptArcade v1 — live

**Live URL:** https://promptarcade.pages.dev/  
**Preview (latest):** https://a98276ac.promptarcade.pages.dev/  
**Pages project:** `promptarcade`  
**Source:** `/workspace/promptarcade-deploy` (overlay → dist via `scripts/build.py`)  
**Contact lock:** support@promptarcade.games only

## Shipped (20 games)

### Ported from PromptShare Games (17)
Simple: Paper Moths, Gate Comet, Lantern Stack, Moss Steps, Wick Line  
Mid: Roofline Crane, Upstream Koi, Kiln Break, Orchard Serpent, Belt Drift, Pulse Lanterns, Loom Shuttle, Tide Bell  
Advanced: Pier Watch, Courier of Glass, Soot Lantern, Night Press  

### New PromptArcade originals (3)
- **Neon Tetris** (Mid / Puzzle) — keyboard tetromino stacker, scoring, levels, game over → score
- **Vault Dash** (Mid / Racing) — endless neon runner, jump + slide
- **Spark Climb** (Simple / Platformer) — vertical platform climb

## UX
- Shared glass header + dark neon layout on hub, shelves, and play pages
- Difficulty shelves: Featured / Simple / Mid / Advanced (+ All)
- Genre chips: Platformer, Racing, Puzzle, Arcade
- Title pills + difficulty + GROK model + genre chips on cards
- Every game: username gate → Start → play → score auto-appends to Top 10

## Leaderboards
- v1: `localStorage` keys `pa_scores_<slug>` (+ display name `pa_player_name`)
- Same POST shape as `/api/games/:slug/scores` for future D1/Workers swap
- Plate sidebar paints local immediately; upgrades from API when available

## Next steps
1. **DNS:** Point `promptarcade.games` (+ `www`) to this Pages project in Cloudflare DNS; attach custom domain in Pages settings.
2. **D1:** Add Workers functions + D1 binding for shared leaderboards (mirror PromptShare scores API).
3. **Advanced multi-prompt:** more multi-model / multi-prompt games on the Advanced shelf.
4. Optional: thin PromptShare `/games` teaser linking out to PromptArcade.
