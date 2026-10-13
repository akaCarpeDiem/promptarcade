/* PromptArcade catalog — the single source of truth for every game on the site.
 *
 * To add a game: drop its play file in src/play/<slug>.html (load pa-score.js, pa-gate.js and
 * pa-kit.js like the others), add an entry below, add a screenshot at src/shots/<slug>.webp,
 * then run `npm run build`. Credits matter here: say which model made it and how.
 *
 * credit.maker   "Claude" | "Grok" | "GPT" | "Gemini" | …   (shown as the badge and used for filters)
 * credit.model   exact model name if known, otherwise null (the page then says "version not recorded")
 * credit.via     where it was built (chat app, Cursor agent, …)
 * credit.method  "single-prompt" | "multi-prompt" | "agentic"
 */
export const SITE = {
  name: "PromptArcade",
  url: "https://promptarcade.games",
  email: "support@promptarcade.games",
  tagline: "Every game here was made by AI, from prompts.",
  description: "Free browser games built entirely by AI models from plain-English prompts — a multiplayer snake arena, a survivors-style roguelite, physics puzzles, a daily word game, a 3D tower stacker and more. Global leaderboards, daily challenges, no account.",
  launched: "2026-10-11"
};

const CLAUDE_NEW = { maker: "Claude", model: "Claude Opus 5.5", via: "Claude (agentic session)", method: "agentic" };
const CLAUDE_CURSOR = { maker: "Claude", model: null, via: "Cursor agent", method: "multi-prompt" };

export const GAMES = [
  {
    slug: "glowline-arena", title: "Glowline Arena", added: "2026-10-11", featured: 1,
    genre: "Multiplayer", tags: ["multiplayer", "io", "arcade"], difficulty: "Mid", accent: "#5ef2ff", accent2: "#ff5ca8",
    unit: "length",
    tagline: "A live multiplayer snake arena. Eat, grow, and cut off everyone else.",
    about: "Glide through a glowing hex arena with players from everywhere — and a pack of surprisingly cunning bots. Eat light to grow, boost to cut in front of rivals, and turn their wreckage into your next meal. Grab rare power-ups, slip through portals, and if you get lucky, evolve into a Viper, an Eel, a Comet or four other rare forms for the rest of your life. Every day brings a new twist, and Glow XP unlocks looks-only skins and trails. If the live server is quiet or unreachable, you drop straight into an offline match against bots.",
    credit: CLAUDE_NEW,
    brief: "Make a multiplayer .io-style snake arena with smart bots, a live leaderboard, minimap and skins — and have it fall back to an offline match when the server isn't there.",
    tech: [
      "One simulation file runs on both the Cloudflare Durable Object server and in your browser",
      "20 Hz authoritative ticks; each player is sent only the snakes near them, about 300 bytes a tick",
      "Evolutions, power-ups and portal states ride in spare bits of bytes the frame already had",
      "Bodies are rebuilt client-side from head positions, so only heads go over the wire",
      "Spatial hashing for collisions and bot vision; bots hunt, feed and dodge with a sampled fan of rays",
      "Interpolated rendering with stripes that travel along the body via dash offsets",
      "The how-to-play guides are live loops drawn by the game's own renderer, not videos"
    ]
  },
  {
    slug: "ember-swarm", title: "Ember Swarm", added: "2026-10-11", featured: 2,
    genre: "Roguelite", tags: ["roguelite", "survivors", "action"], difficulty: "Mid", accent: "#ffb35c", accent2: "#ff3d7f",
    unit: "points",
    tagline: "Survive the night against hundreds of shadow creatures. Your weapons fire on their own.",
    about: "A survivors-style roguelite. Move, collect embers and pick upgrades as the swarm thickens — seven weapons, eight passives, elites with treasure, and two bosses on the way to dawn. Embers you bank buy permanent upgrades in the forge, and new spirits unlock as you get better.",
    credit: CLAUDE_NEW,
    brief: "Build a survivors-style roguelite: auto-firing weapons, level-up choices, elites, bosses and meta progression between runs — with original art, names and enemies.",
    tech: [
      "Hundreds of enemies with spatial-hash separation and per-type behaviours (chargers telegraph, spitters kite)",
      "Seven weapons with five upgrade tiers each, all data-driven",
      "Pre-rendered sprite atlas drawn procedurally at load — no image files",
      "Persistent forge, unlockable characters and a revive, saved locally",
      "A segmented wyrm boss that follows its own trail history"
    ]
  },
  {
    slug: "nebula-drop", title: "Nebula Drop", added: "2026-10-11", featured: 3,
    genre: "Puzzle", tags: ["puzzle", "physics", "merge"], difficulty: "Simple", accent: "#b48cff", accent2: "#5ef2ff",
    unit: "points",
    tagline: "Drop celestial bodies into the jar. Two of a kind fuse into something bigger.",
    about: "Stardust becomes pebbles, pebbles become moons, moons become worlds — all the way up to a black hole. A physics merge puzzle where every drop nudges the pile and chain reactions are worth the most. Don't let the jar overflow.",
    credit: CLAUDE_NEW,
    brief: "A merge-and-drop physics puzzle with a space theme: two matching bodies fuse into the next tier, eleven tiers ending in a black hole.",
    tech: [
      "Custom circle physics: 8 substeps, positional correction, impulses with friction and spin",
      "Every planet sprite is painted procedurally — craters, bands, rings, coronas",
      "Combo multiplier for merge chains, shockwaves and screen shake that scale with tier"
    ]
  },
  {
    slug: "wordglow", title: "Wordglow", added: "2026-10-11", featured: 4,
    genre: "Daily", tags: ["daily", "word", "puzzle"], difficulty: "Simple", accent: "#2ee6c5", accent2: "#b48cff",
    unit: "streak points", daily: true,
    tagline: "One five-letter word a day. Six tries. Keep your streak glowing.",
    about: "A fresh five-letter word every day — the same one for everyone. Guess in six tries, share your glowing grid with friends, and keep a streak going. Practice rounds are unlimited once the daily is done. Your leaderboard score grows with your streak.",
    credit: CLAUDE_NEW,
    brief: "A daily five-letter word game with streaks, stats, hard mode, practice mode and a shareable result grid.",
    tech: [
      "1,800+ answers picked from open word-frequency data with names, places and slang filtered out",
      "Duplicate-letter-correct scoring and an enforced hard mode",
      "Progress, streaks and stats saved locally; the daily rolls over at your local midnight"
    ]
  },
  {
    slug: "block-bloom", title: "Block Bloom", added: "2026-10-11", featured: 5,
    genre: "Puzzle", tags: ["puzzle", "casual"], difficulty: "Simple", accent: "#ff7eb6", accent2: "#ffd36b",
    unit: "points",
    tagline: "Falling gems, no preview. Clear a row in one colour for 10× points.",
    about: "Gem blocks fall into the garden one at a time. Turn them, slide them and drop them to fill a row and watch it burst into petals. There is no next-piece window: each piece appears at the top the moment the last one lands, so you play what you get. Finish a whole row in a single colour and it scores ten times as much.",
    credit: CLAUDE_NEW,
    brief: "A falling-block puzzle on an 8×14 board with turning pieces, no next-piece preview, combos, rising speed, and a 10× bonus for single-colour rows.",
    tech: [
      "Wall kicks let a piece turn snugly against walls and other blocks",
      "Rows that are still one colour glow so you can chase the 10× bonus",
      "Tap to turn, drag to move and flick down to drop on touch screens"
    ]
  },
  {
    slug: "gridstorm", title: "Gridstorm", added: "2026-10-11", featured: 6,
    genre: "Shooter", tags: ["shooter", "twin-stick", "arcade"], difficulty: "Advanced", accent: "#5ef2ff", accent2: "#ffe68a",
    unit: "points",
    tagline: "A twin-stick shooter on a grid that ripples with every explosion.",
    about: "Move with one hand, aim with the other, and survive an escalating storm of geometric enemies — dodgers that sidestep your shots, splitters, armored snakes and gravity wells that bend bullets and swallow everything nearby. Collect gems to climb the multiplier.",
    credit: CLAUDE_NEW,
    brief: "A neon twin-stick arena shooter with a warping spring-mass background grid, several enemy behaviours, bombs and a score multiplier.",
    tech: [
      "1,500-point spring-mass grid simulated every frame and pushed by explosions",
      "Gravity wells that pull the grid, your ship, enemies and bullets",
      "Additive-blend vector rendering with dual-stroke glow — no shaders needed"
    ]
  },
  {
    slug: "deepdelve", title: "Deepdelve", added: "2026-10-11", featured: 7,
    genre: "Roguelike", tags: ["roguelike", "daily", "strategy"], difficulty: "Mid", accent: "#ffcf70", accent2: "#ff7a2a",
    unit: "points", daily: true,
    tagline: "A turn-based dungeon crawler with a new dungeon every day.",
    about: "Descend through procedurally generated floors, fight monsters turn by turn, find potions, bombs and better gear, and face a dragon every fifth floor. Death is permanent. The Daily Delve gives everyone the same dungeon each day.",
    credit: CLAUDE_NEW,
    brief: "A classic turn-based roguelike: procedural rooms and corridors, field of view, monsters with different behaviours, items, levelling and a daily seeded dungeon.",
    tech: [
      "Recursive shadowcasting field of view with remembered tiles",
      "Seeded generator — the Daily Delve is identical for every player",
      "Monsters path with a Dijkstra map; wraiths drift through walls, bats flutter, slimes split",
      "Tap-to-travel pathfinding that stops when something new comes into view"
    ]
  },
  {
    slug: "skystack", title: "Skystack 3D", added: "2026-10-11", featured: 8,
    genre: "3D", tags: ["3d", "casual", "one-button"], difficulty: "Simple", accent: "#7dffb0", accent2: "#6ec8ff",
    unit: "floors",
    tagline: "Stack sliding slabs as high as you can. One button, real 3D.",
    about: "Drop each sliding slab onto the tower. Whatever hangs over the edge is sliced off and tumbles away, so the tower narrows with every miss. Land a perfect drop to keep its size — chain them and it grows back.",
    credit: CLAUDE_NEW,
    brief: "A one-button 3D tower-stacking game in three.js with slicing, falling debris, perfect-drop combos and shifting colours.",
    tech: [
      "three.js with an orthographic isometric camera and soft shadows",
      "Overhangs are cut into separate meshes that fall and spin away",
      "The palette and sky gradient drift as the tower climbs"
    ]
  },
  {
    slug: "neon-outrun", title: "Neon Outrun", added: "2026-09-20",
    genre: "Racing", tags: ["racing", "arcade"], difficulty: "Advanced", accent: "#ff5ca8", accent2: "#ffd36b", unit: "points",
    tagline: "A pseudo-3D sunset racer against the clock.",
    about: "A pseudo-3D sunset racer. Weave through traffic on a road of curves and hills, hit the checkpoint arches before the clock runs out, and chase near-miss bonuses at full throttle.",
    credit: CLAUDE_CURSOR,
    brief: "A segment-projection road racer in the style of late-80s arcade cabinets: curves, hills, traffic, roadside neon, checkpoint time attack.",
    process: "Built by an AI coding agent from a multi-step brief: the road renderer first, then the track, traffic and roadside sprites, then the HUD, engine audio and touch pedals, with a headless-browser playtest after each pass.",
    tech: ["Segment-projection road renderer (the classic sprite-scaling technique)", "Procedural engine audio", "Touch pedals"]
  },
  {
    slug: "hyperlane-3d", title: "Hyperlane 3D", added: "2026-09-20",
    genre: "3D", tags: ["3d", "flying"], difficulty: "Advanced", accent: "#5ef2ff", accent2: "#c77dff", unit: "points",
    tagline: "A real-time 3D flight down an endless neon hyperlane.",
    about: "A real-time 3D flight down an endless neon hyperlane. Bank between walls, gates and laser bars, string energy orbs into a multiplier, and burn boost when you dare.",
    credit: CLAUDE_CURSOR,
    brief: "A three.js endless flyer: a banking ship, pooled 3D obstacles, a boost meter, an orb multiplier and color-shifting sectors.",
    tech: ["three.js scene with object pooling", "Colour-shifting sectors", "Boost meter and orb multiplier"]
  },
  {
    slug: "circuit-hop", title: "Circuit Hop", added: "2026-09-20",
    genre: "Platformer", tags: ["platformer"], difficulty: "Advanced", accent: "#7dffb0", accent2: "#5ef2ff", unit: "points",
    tagline: "A tight neon platformer through circuit-board levels.",
    about: "A tight neon platformer through handcrafted circuit-board levels. Wall-jump, stomp patrol bots, dodge laser gates and grab every data chip on the way to the exit portal.",
    credit: CLAUDE_CURSOR,
    brief: "A tile-based platformer with coyote time, jump buffering, wall jumps, hazards, enemies, checkpoints and handcrafted levels.",
    process: "Built by an AI coding agent from a multi-step brief: movement feel first, then the level set, hazards and enemies, then camera, effects and touch buttons.",
    tech: ["Coyote time and jump buffering", "Wall jumps and checkpoints", "Handcrafted level set"]
  },
  {
    slug: "void-rocks", title: "Void Rocks", added: "2026-09-20",
    genre: "Shooter", tags: ["shooter", "arcade"], difficulty: "Mid", accent: "#c49bff", accent2: "#5ef2ff", unit: "points",
    tagline: "A glowing vector rock shooter with inertia and saucers.",
    about: "A glowing vector rock shooter. Thrust, drift and blast rocks into smaller rocks, outgun the saucers, and hyperspace out of trouble when it gets crowded.",
    credit: CLAUDE_CURSOR,
    brief: "A vector-style rock shooter with inertia, screen wrap, splitting rocks, saucers, hyperspace and waves.",
    process: "Built by an AI coding agent from a multi-step brief: ship physics and wrapping first, then rocks, saucers and waves, then glow rendering, audio and touch clusters.",
    tech: ["Inertia and screen wrap", "Splitting rocks and saucers", "Glow vector rendering"]
  },
  {
    slug: "star-siege", title: "Star Siege", added: "2026-09-20",
    genre: "Shooter", tags: ["shooter", "arcade"], difficulty: "Mid", accent: "#ff7eb6", accent2: "#7dffb0", unit: "points",
    tagline: "Hold the line against a marching alien formation.",
    about: "Hold the line against a marching alien formation. Shoot through the ranks before they land, use the shields while they last, and tag the mothership for a bonus.",
    credit: CLAUDE_CURSOR,
    brief: "A fixed-shooter invasion game: marching formation, three alien types, eroding shields, mothership and faster waves.",
    process: "Built by an AI coding agent from a multi-step brief: the formation march and shooting first, then shields, waves and power-ups, then pixel sprites, audio and touch controls.",
    tech: ["Eroding pixel shields", "Speed-up as the formation thins", "Touch drag with auto fire"]
  },
  {
    slug: "prism-breaker", title: "Prism Breaker", added: "2026-09-20",
    genre: "Arcade", tags: ["arcade", "breakout"], difficulty: "Mid", accent: "#6ec8ff", accent2: "#c49bff", unit: "points",
    tagline: "A glassy neon brick-breaker with power-ups and combos.",
    about: "A glassy neon brick-breaker. Angle shots off your paddle, chain combos without touching it, and catch power-ups for multiball, lasers and a wider paddle.",
    credit: CLAUDE_CURSOR,
    brief: "A brick-breaker with handcrafted layouts, multi-hit and steel bricks, power-ups, combos and a speed ramp.",
    process: "Built by an AI coding agent from a multi-step brief: physics and paddle control first, then layouts and power-ups, then effects, audio and touch drag.",
    tech: ["Paddle-angle ball control", "Multiball, lasers and wide paddle", "Handcrafted layouts"]
  },
  {
    slug: "fusion-2048", title: "Fusion 2048", added: "2026-09-20",
    genre: "Puzzle", tags: ["puzzle"], difficulty: "Simple", accent: "#5ef2ff", accent2: "#ff7eb6", unit: "points",
    tagline: "Slide and fuse glowing tiles past 2048.",
    about: "Slide glowing tiles and fuse equal numbers into bigger ones. Plan your corners, build chains and see how far past 2048 you can push.",
    credit: CLAUDE_CURSOR,
    brief: "A 2048 sliding-tile game (the original is open source under MIT) with tweened slides, merge particles and escalating sound.",
    process: "Built by an AI coding agent from a short multi-step brief: board rules first, then animation and juice, then swipe input.",
    tech: ["Tweened slides and merges", "Swipe input", "Escalating sound"]
  },
  {
    slug: "neon-flap", title: "Neon Flap", added: "2026-09-20",
    genre: "Arcade", tags: ["arcade", "one-button"], difficulty: "Simple", accent: "#ff7eb6", accent2: "#8ee9ff", unit: "points",
    tagline: "One button, one glowing flyer, endless laser gates.",
    about: "One button, one glowing flyer, endless laser gates over a neon city. Flap through the gaps, grab coins and shave the edges for near-miss bonuses.",
    credit: CLAUDE_CURSOR,
    brief: "A one-button flyer with moving gates, shrinking gaps, coins and near-miss bonuses.",
    process: "Built by an AI coding agent from a short multi-step brief: flight feel first, then gate patterns and difficulty, then parallax art and effects.",
    tech: ["Parallax city", "Near-miss detection", "Moving gates"]
  }
];

/* Games that used to be on the site. Their old URLs redirect (301) so links and bookmarks keep working. */
export const RETIRED = {
  "neon-tetris": "block-bloom",
  "pellet-panic": null,
  "vault-dash": null, "spark-climb": null,
  "paper-moths": null, "gate-comet": null, "lantern-stack": null, "moss-steps": null, "wick-line": null,
  "roofline-crane": null, "upstream-koi": null, "kiln-break": null, "orchard-serpent": "glowline-arena", "belt-drift": null,
  "pulse-lanterns": null, "loom-shuttle": null, "tide-bell": null, "pier-watch": null, "courier-of-glass": null,
  "soot-lantern": "deepdelve", "night-press": "wordglow"
};

/* What's-new feed (newest first). */
export const NEWS = [
  { date: "2026-10-11", title: "PromptArcade 3.0", body: "A full redesign and eight new games made with Claude Opus 5.5 — including a live multiplayer snake arena, a survivors-style roguelite, a daily word game and a daily dungeon. Plus the Arcade Pass: XP, badges, streaks and daily quests that follow you across every game." },
  { date: "2026-10-11", title: "Retired the one-prompt plates", body: "The early single-prompt experiments and two remakes have been retired so the shelf is all full builds. Old links now land on the games that replaced them." },
  { date: "2026-09-20", title: "Shared kit and global leaderboards", body: "Every game got the shared kit: pause menu, procedural music, a name gate and a global Top 10." }
];

/* Daily quests rotate by date. `stat` is read from what each game reports at the end of a run. */
export const QUESTS = [
  { game: "glowline-arena", stat: "score", min: 250, text: "Reach length 250 in Glowline Arena" },
  { game: "ember-swarm", stat: "seconds", min: 240, text: "Survive 4 minutes in Ember Swarm" },
  { game: "nebula-drop", stat: "tier", min: 6, text: "Form a Ringed Giant in Nebula Drop" },
  { game: "block-bloom", stat: "score", min: 600, text: "Score 600 in Block Bloom" },
  { game: "gridstorm", stat: "score", min: 25000, text: "Score 25,000 in Gridstorm" },
  { game: "deepdelve", stat: "depth", min: 4, text: "Reach depth 4 in Deepdelve" },
  { game: "skystack", stat: "score", min: 20, text: "Stack 20 floors in Skystack 3D" },
  { game: "wordglow", stat: "won", min: 1, text: "Solve today's Wordglow" },
  { game: "neon-outrun", stat: "score", min: 5000, text: "Score 5,000 in Neon Outrun" },
  { game: "fusion-2048", stat: "score", min: 3000, text: "Score 3,000 in Fusion 2048" },
  { game: "circuit-hop", stat: "score", min: 1500, text: "Score 1,500 in Circuit Hop" },
  { game: "void-rocks", stat: "score", min: 5000, text: "Score 5,000 in Void Rocks" },
  { game: "neon-flap", stat: "score", min: 500, text: "Score 500 in Neon Flap" },
  { game: "prism-breaker", stat: "score", min: 3000, text: "Score 3,000 in Prism Breaker" }
];
