# Glowline Arena server

A Cloudflare Worker with one Durable Object that runs the multiplayer snake match for
`/games/glowline-arena/`. The simulation is the same file the browser uses for offline play
(`src/play/arena/sim.js`), so bots and rules match in both modes.

- Endpoint: `wss://arena.promptarcade.games/room` (health check: `https://arena.promptarcade.games/health`)
- Deploy: `cd worker/arena && npx wrangler deploy` (creates the `arena.promptarcade.games` custom domain)
- Cost: free-plan Durable Objects (SQLite class). The room stops its clock 5 seconds after the
  last viewer leaves, so it only bills while people are playing.
- If this Worker isn't deployed, or is down or full, the game quietly switches to an offline match
  against bots. Nothing else on the site depends on it.
- Local test: `node scripts/arena-dev.mjs 5191`, then open
  `/games/play/glowline-arena.html?arena=ws://127.0.0.1:5191`.
