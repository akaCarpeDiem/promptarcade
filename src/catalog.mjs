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
 *
 * Every game is either a classic with a twist or an original:
 * classic        the kind of classic it remakes, as a plain description ("Falling blocks"). Never a
 *                trademarked game name: the build test fails on those.
 * twist          one sentence on what it changes about that classic
 * original       true for games that aren't a remake of anything (no classic/twist)
 */
export const SITE = {
  name: "PromptArcade",
  url: "https://promptarcade.games",
  email: "support@promptarcade.games",
  tagline: "An arcade of prompt-made classics with a twist",
  description: "Classic arcade games remade by AI from plain-English prompts, each with a twist that changes how it plays: multiplayer snake, falling blocks with no preview, a daily word, a vector rock shooter and more. Free, no account needed.",
  launched: "2026-10-11"
};

const CLAUDE_NEW = { maker: "Claude", model: "Claude Opus 5.5", via: "Claude (agentic session)", method: "agentic" };
const CLAUDE_CURSOR = { maker: "Claude", model: null, via: "Cursor agent", method: "multi-prompt" };

export const GAMES = [
  {
    slug: "glowline-arena", title: "Glowline Arena", added: "2026-10-11", featured: 1,
    genre: "Multiplayer", tags: ["multiplayer", "io", "arcade"], difficulty: "Mid", accent: "#5ef2ff", accent2: "#ff5ca8",
    unit: "length",
    classic: "Snake", twist: "Snake goes live and multiplayer: boost to cut off real rivals, slip through portals and evolve into rare forms.",
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
    classic: "Survivors horde", twist: "A forge for permanent upgrades, unlockable spirits and a segmented wyrm boss on the way to dawn.",
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
    classic: "Merge and drop", twist: "There's no jar: you launch from the rim of a round gravity well and everything falls toward a star in the middle, so the pile grows outward in every direction.",
    tagline: "Launch bodies into a gravity well. Two of a kind fuse into something bigger.",
    about: "Stardust becomes pebbles, pebbles become moons, moons become worlds, all the way up to a black hole. Instead of dropping into a jar you aim from anywhere round the rim and everything falls toward the star at the centre, so the pile builds outward like a little planet. Chain reactions are worth the most. If the pile reaches the danger ring and stays there, the run is over.",
    credit: CLAUDE_NEW,
    brief: "A merge-and-drop physics puzzle with a space theme: two matching bodies fuse into the next tier, eleven tiers ending in a black hole.",
    tech: [
      "Radial gravity toward a central star, with a circular rim and a danger ring instead of a jar",
      "Custom circle physics: 8 substeps, positional correction, impulses with friction and spin",
      "Every planet sprite is painted procedurally — craters, bands, rings, coronas",
      "Combo multiplier for merge chains, shockwaves and screen shake that scale with tier"
    ]
  },
  {
    slug: "wordglow", title: "Wordglow", added: "2026-10-11", featured: 4,
    genre: "Daily", tags: ["daily", "word", "puzzle"], difficulty: "Simple", accent: "#2ee6c5", accent2: "#b48cff",
    unit: "streak points", daily: true,
    classic: "Five-letter word", twist: "Each day is a chain of three words, and each word starts with the last letter of the one before. Twelve guesses cover the whole chain, so the guesses you save on one word carry over to the next.",
    tagline: "Three linked words a day. Twelve guesses. Keep your streak glowing.",
    about: "Every day brings a chain of three five-letter words, the same chain for everyone. Solve the first word and its last letter becomes the locked first letter of the next. You get twelve guesses for the whole chain, and no more than six on any one word, so a quick solve buys time for a harder one later. Share your glowing grid, keep a streak going, and play unlimited practice chains once the daily is done.",
    credit: CLAUDE_NEW,
    brief: "A daily five-letter word game with streaks, stats, hard mode, practice mode and a shareable result grid.",
    tech: [
      "Each day's three-word chain is picked by a seeded walk through the answer list, and it steers away from letters few words start with",
      "1,800+ answers picked from open word-frequency data with names, places and slang filtered out",
      "Duplicate-letter-correct scoring and an enforced hard mode",
      "Progress, streaks and stats saved locally; the daily rolls over at your local midnight"
    ]
  },
  {
    slug: "block-bloom", title: "Block Bloom", added: "2026-10-11", featured: 5,
    genre: "Puzzle", tags: ["puzzle", "casual"], difficulty: "Simple", accent: "#ff7eb6", accent2: "#ffd36b",
    unit: "points",
    classic: "Falling blocks", twist: "No next-piece preview, and a row finished in a single colour scores ten times as much.",
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
    classic: "Twin-stick arena", twist: "Every kill sends out a shockwave along the grid, and the ring blows up whatever it reaches, so packed swarms go off in chain reactions worth more with every link.",
    tagline: "A twin-stick shooter where every kill sends out a chain-reaction shockwave.",
    about: "Move with one hand, aim with the other, and survive an escalating storm of geometric enemies — dodgers that sidestep your shots, splitters, armored snakes and gravity wells that bend bullets and swallow everything nearby. Every kill sends a shockwave through the grid, and anything the ring reaches explodes and sends out its own. Let them bunch up, then set off the whole pack. Collect gems to climb the multiplier.",
    credit: CLAUDE_NEW,
    brief: "A neon twin-stick arena shooter with a warping spring-mass background grid, several enemy behaviours, bombs and a score multiplier.",
    tech: [
      "1,500-point spring-mass grid simulated every frame and pushed by explosions",
      "Gravity wells that pull the grid, your ship, enemies and bullets",
      "Kill shockwaves run along the spring grid and chain from enemy to enemy, with points that scale with chain depth",
      "Additive-blend vector rendering with dual-stroke glow — no shaders needed"
    ]
  },
  {
    slug: "deepdelve", title: "Deepdelve", added: "2026-10-11", featured: 7,
    genre: "Roguelike", tags: ["roguelike", "daily", "strategy"], difficulty: "Mid", accent: "#ffcf70", accent2: "#ff7a2a",
    unit: "points", daily: true,
    classic: "Dungeon crawl", twist: "One seeded Daily Delve for every player, and a dragon waiting on every fifth floor.",
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
    classic: "Tower stacker", twist: "Wind: from the fifth floor up the tower sways, and the higher it gets the more the top swings. The slab slides on a fixed track, so you drop it where the top is right now.",
    tagline: "Stack sliding slabs on a tower that sways in the wind. One button, real 3D.",
    about: "Drop each sliding slab onto the tower. Whatever hangs over the edge is sliced off and tumbles away, so the tower narrows with every miss. Once you're five floors up the wind picks up and the tower starts to sway, a little at first and then a lot. The slab's track stays still while the top moves under it, so you're timing two motions at once. Land a perfect drop to keep the slab's size, and chain perfect drops to grow it back.",
    credit: CLAUDE_NEW,
    brief: "A one-button 3D tower-stacking game in three.js with slicing, falling debris, perfect-drop combos and shifting colours.",
    tech: [
      "three.js with an orthographic isometric camera and soft shadows",
      "Overhangs are cut into separate meshes that fall and spin away",
      "Wind sway bends the tower more toward the top and grows with height, while the stack is still stored in straight, unswayed positions",
      "The palette and sky gradient drift as the tower climbs"
    ]
  },
  {
    slug: "crosstime", title: "Crosstime", added: "2026-10-21",
    genre: "Arcade", tags: ["arcade", "endless", "crossing"], difficulty: "Mid", accent: "#5ef2ff", accent2: "#ffd36b",
    unit: "points",
    classic: "Road and river crosser", twist: "Get hit and time rewinds to your last safe spot, but rewinds run out, and a wall of static creeps up behind you.",
    tagline: "Hop across an endless night city. Get hit and time rewinds.",
    about: "Hop a little courier bot across an endless night city: busy roads full of cars, vans, buses and trucks, rivers of drifting logs and diving turtles, and rail crossings where the night train comes through with almost no warning. Get flattened or fall in and the whole street rewinds to the last moment you stood somewhere safe, so you can try that hop again. Rewinds run out, though, and clocks on the grass are the only way to win them back. Don't dawdle: a wall of static follows you up the street.",
    credit: CLAUDE_NEW,
    brief: "Remake the road-and-river crossing classic as an endless night city with cars, trucks, logs, diving turtles and trains, and make getting hit rewind time instead of ending the run.",
    tech: [
      "Every lane is a pure function of the world clock, so running the clock backwards replays the street in reverse",
      "The player is snapshotted every frame; a rewind scrubs back to the newest snapshot on solid ground",
      "Endless lanes are generated in groups with gap rules that keep every crossing possible",
      "Headlight beams and lamp pools are drawn additively before the cars so they light the road",
      "Swipes hop the moment they cross a threshold, so touch play feels as quick as the keys"
    ]
  },
  {
    slug: "echo-maze", title: "Echo Maze", added: "2026-10-21",
    genre: "Arcade", tags: ["arcade", "maze", "chase"], difficulty: "Mid", accent: "#b48cff", accent2: "#7dffb0",
    unit: "points",
    classic: "Pellet maze chase", twist: "Your own path comes back to haunt you: echoes replay your route a few seconds behind you, and every level is a brand-new maze.",
    tagline: "Clear the maze before your own echo catches you.",
    about: "Eat every pellet in the maze while four hunters close in, each with its own way of chasing you. The catch is behind you: the maze remembers where you've been, and a few seconds later an echo of you comes along the very same route. Double back, stop to think or loop the same corridor and you'll walk straight into yourself. Power orbs turn the tables on hunters and echoes alike. Every level is a freshly generated maze, and the deeper you go the more echoes follow you.",
    credit: CLAUDE_NEW,
    brief: "Remake the pellet-maze chase with an original twist: echoes that replay the player's own recent route, hunters with distinct chase styles, and a new symmetric maze every level.",
    tech: [
      "Mazes are carved depth-first on one half, mirrored, then braided so there are no dead ends",
      "Your route is recorded every frame; each echo binary-searches it to replay where you were seconds ago",
      "Hunters pick turns at each junction by distance to a target: straight at you, ahead of you, shy, or flanking",
      "Tile-centre movement with turn buffering, instant reversals and wrap-around tunnels",
      "Walls are traced once into an offscreen canvas as glowing outlines, so each frame only draws what moves"
    ]
  },
  {
    slug: "ringfall", title: "Ringfall", added: "2026-10-21",
    genre: "Shooter", tags: ["shooter", "arcade", "defense"], difficulty: "Mid", accent: "#8ee9ff", accent2: "#ff5c7a",
    unit: "points",
    classic: "City missile defence", twist: "The cities sit around a small turning planet, so warheads come from every side, and every blast can set off another for a growing multiplier.",
    tagline: "Defend a tiny planet from warheads raining in from every side.",
    about: "Six cities and three batteries ring a small blue planet, and it's under attack from every direction at once. Tap or click ahead of the incoming warheads to burst an interceptor in their path. Catch one in a blast and it explodes too, and every link in that chain multiplies the points. Later waves bring warheads that split in three, warheads that weave, and orbiting bombers that keep dropping more until you take them down. The planet keeps turning the whole time.",
    credit: CLAUDE_NEW,
    brief: "Remake the city missile-defence classic around a small rotating planet with three batteries, chain-reaction blasts, splitting and weaving warheads, and orbiting bombers.",
    tech: [
      "Interceptors fly curved arcs by easing angle and radius from the launch site, so no shot passes through the planet",
      "Blasts that catch a warhead spawn a smaller blast of their own, and the chain depth is the multiplier",
      "The nearest battery with ammo fires, measured by angle round the planet as it turns",
      "Warheads home on their site as it rotates; a weaving one can still miss and hit open ground",
      "Aim with the mouse, touch, or the arrow keys and Space"
    ]
  },
  {
    slug: "neon-outrun", title: "Neon Outrun", added: "2026-09-20",
    genre: "Racing", tags: ["racing", "arcade", "3d"], difficulty: "Advanced", accent: "#ff5ca8", accent2: "#ffd36b", unit: "points",
    classic: "Sunset road racer", twist: "A real-3D cyberpunk megacity: draft behind haulers for extra top speed, thread hover cars for near-miss combos and dodge lane closures to beat the checkpoint clock.",
    tagline: "A real-3D cyberpunk racer through a neon megacity.",
    about: "Race a futuristic hypercar down an endless boulevard through a neon megacity at night. Towers vanish into the smog, holograms hang over the street and flying traffic streams overhead. Weave through hover cars and haulers that signal before they change lanes, tuck into a slipstream for extra top speed, brake for the tight bends and road works, and reach every checkpoint before the clock runs out. The course gets sharper and busier the further you go.",
    credit: { maker: "Claude", model: null, via: "Claude (agentic session)", method: "agentic" },
    brief: "Rebuild the sunset road racer from the ground up in real 3D: a realistic car, road and city, cars and trucks as traffic, real-looking streetlights, tighter steering and a harder course. Then restyle it as a futuristic cyberpunk megacity: neon glow, LED lights, big imagery, a modified future car and futuristic traffic.",
    process: "Rebuilt by an AI coding agent in one session: the procedural road and city chunks first, then the car and traffic models, lighting and sky, then handling, traffic AI and road works, then audio and HUD. A second pass restyled the city: HDR bloom, a wet reflective road, megatowers, holograms, hover cars and flying traffic. An automated driver played simulated runs in a headless browser to tune the clock and difficulty.",
    tech: [
      "three.js: an endless procedural boulevard and megacity built in chunks ahead of the camera",
      "HDR rendering with a custom bloom pass, so every neon sign, LED strip and tail light glows",
      "A wet road whose puddles mirror the city, with reflections streaking back from every light",
      "Futuristic car, hover car and hauler bodies extruded from side profiles, with LED trim and iridescent paint",
      "Holographic adverts for made-up brands, megatowers in the smog and streams of flying traffic",
      "Traffic AI that follows, brakes and signals before changing lanes; slipstream and near-miss scoring",
      "Synthesised engine with a six-speed gearbox, wind and tyre noise"
    ]
  },
  {
    slug: "hyperlane-3d", title: "Hyperlane 3D", added: "2026-09-20",
    genre: "3D", tags: ["3d", "flying"], difficulty: "Advanced", accent: "#5ef2ff", accent2: "#c77dff", unit: "points",
    original: true,
    tagline: "A real-time 3D flight down an endless neon hyperlane.",
    about: "A real-time 3D flight down an endless neon hyperlane. Bank between walls, gates and laser bars, string energy orbs into a multiplier, and burn boost when you dare.",
    credit: CLAUDE_CURSOR,
    brief: "A three.js endless flyer: a banking ship, pooled 3D obstacles, a boost meter, an orb multiplier and color-shifting sectors.",
    tech: ["three.js scene with object pooling", "Colour-shifting sectors", "Boost meter and orb multiplier"]
  },
  {
    slug: "circuit-hop", title: "Circuit Hop", added: "2026-09-20",
    genre: "Platformer", tags: ["platformer"], difficulty: "Advanced", accent: "#7dffb0", accent2: "#5ef2ff", unit: "points",
    original: true,
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
    classic: "Vector rock shooter", twist: "A tractor tether: grab a rock, whirl it round your ship as a wrecking ball, then fling it through the field for chain multipliers.",
    tagline: "A vector rock shooter where the rocks are your best weapon.",
    about: "A glowing vector rock shooter with a tractor tether. Split the big rocks with your gun, then grab a small one and it whirls round your ship as a wrecking ball, smashing whatever it touches and soaking up saucer fire. Let go and it flies the way you're facing, ploughing through the field: every rock it hits raises the chain multiplier. Thrust, drift and hyperspace out of trouble when it gets crowded.",
    credit: CLAUDE_CURSOR,
    brief: "A vector-style rock shooter with inertia, screen wrap, splitting rocks, saucers, hyperspace and waves.",
    process: "Built by an AI coding agent from a multi-step brief: ship physics and wrapping first, then rocks, saucers and waves, then glow rendering, audio and touch clusters. In October 2026 Claude Opus 5.5 rebuilt the twist in an agentic session and play-tested it in a headless browser.",
    tech: ["Inertia and screen wrap", "Tether that winds up as it whirls; throws aim along the ship's nose", "Thrown rocks pierce the field and count a chain multiplier", "Glow vector rendering"]
  },
  {
    slug: "star-siege", title: "Star Siege", added: "2026-09-20",
    genre: "Shooter", tags: ["shooter", "arcade"], difficulty: "Mid", accent: "#ff7eb6", accent2: "#7dffb0", unit: "points",
    classic: "Alien invasion", twist: "Colour lasers: a hit on the wrong colour paints the alien yours, and a hit on a match chain-pops the whole touching cluster.",
    tagline: "Paint the invasion, then pop it in chains.",
    about: "A marching alien formation in four colours, and a laser that carries one of them. Hit an alien of a different colour and you paint it yours. Hit one that matches and every touching alien of that colour detonates in a chain, worth more the bigger the cluster. Switch colours to find the big clusters, paint bridges to join them, and pop them before the formation lands.",
    credit: CLAUDE_CURSOR,
    brief: "A fixed-shooter invasion game: marching formation, three alien types, eroding shields, mothership and faster waves.",
    process: "Built by an AI coding agent from a multi-step brief: the formation march and shooting first, then shields and waves, then pixel sprites, audio and touch controls. In October 2026 Claude Opus 5.5 rebuilt the twist in an agentic session and play-tested it in a headless browser.",
    tech: ["Flood fill through touching same-colour aliens, popped in a ripple", "A fourth colour joins from wave 3", "Eroding pixel shields", "Touch drag with auto fire"]
  },
  {
    slug: "prism-breaker", title: "Prism Breaker", added: "2026-09-20",
    genre: "Arcade", tags: ["arcade", "breakout"], difficulty: "Mid", accent: "#6ec8ff", accent2: "#c49bff", unit: "points",
    classic: "Brick breaker", twist: "Spin: the paddle's motion at contact puts spin on the ball, so shots curve in flight round steel guards, and bent breaks score double.",
    tagline: "A neon brick-breaker where the ball curves.",
    about: "A glassy neon brick-breaker with spin. Move the paddle as the ball touches it and the ball leaves spinning, bending in flight the way you swept. Curve shots round the steel guards that wall off each layout, and any brick broken on a bend scores double. Chain combos without touching the paddle, catch multiball, lasers and a wider paddle, and the six layouts loop faster each time round.",
    credit: CLAUDE_CURSOR,
    brief: "A brick-breaker with handcrafted layouts, multi-hit and steel bricks, power-ups, combos and a speed ramp.",
    process: "Built by an AI coding agent from a multi-step brief: physics and paddle control first, then layouts and power-ups, then effects, audio and touch drag. In October 2026 Claude Opus 5.5 rebuilt the twist in an agentic session and play-tested it in a headless browser.",
    tech: ["Spin from the paddle's measured speed; the ball's velocity turns a little every frame", "Six layouts with steel guards, looping faster", "Multiball, lasers and wide paddle"]
  },
  {
    slug: "fusion-2048", title: "Fusion 2048", added: "2026-09-20",
    genre: "Puzzle", tags: ["puzzle"], difficulty: "Simple", accent: "#5ef2ff", accent2: "#ff7eb6", unit: "points",
    classic: "Sliding tiles", twist: "Chain reactions: a fused tile that lands next to its twin fuses again for a multiplier, while lead blocks drop in and wall off lines.",
    tagline: "Slide, fuse and set off chain reactions past 2048.",
    about: "Slide glowing tiles and fuse equal numbers into bigger ones, but a freshly fused tile that lands touching its twin fuses again on its own, and again, each link worth more. Set up cascades for big chains. Every few moves a lead block drops onto the board: tiles can't pass it, so it splits its row and column in two until it crumbles.",
    credit: CLAUDE_CURSOR,
    brief: "A 2048 sliding-tile game (the original is open source under MIT) with tweened slides, merge particles and escalating sound.",
    process: "Built by an AI coding agent from a short multi-step brief: board rules first, then animation and juice, then swipe input. In October 2026 Claude Opus 5.5 rebuilt the twist in an agentic session and play-tested it in a headless browser.",
    tech: ["Chain reactions resolved as their own animated steps", "Lead cells split each line into runs that slide separately", "Tweened slides and merges", "Swipe input"]
  },
  {
    slug: "neon-flap", title: "Ptero Flap", added: "2026-09-20",
    genre: "Arcade", tags: ["arcade", "reflex"], difficulty: "Mid", accent: "#47b5f2", accent2: "#ffb347", unit: "points",
    classic: "One-tap flyer", twist: "A wide-eyed little pterodactyl flaps through a moonlit island night, where gaps drift up and down between trees, webs, moss and vines, and grazing an edge builds a close-call combo.",
    tagline: "Flap a wide-eyed little pterodactyl through a moonlit prehistoric island.",
    about: "A wide-eyed little clay pterodactyl flaps across a moonlit prehistoric island: a big glowing moon, a lagoon, palm trees, a dome hut with a warm window and fireflies drifting in the dark. Dodge hanging branches, spiderwebs, vines and glowing moss from above, and trees, rock spires and webs strung between bamboo stalks from below. Some gaps drift up and down, and the gaps slowly tighten. Grab glowing amber on the way, and thread a gap close to its edge for a close-call bonus that grows while you keep the combo going.",
    credit: CLAUDE_CURSOR,
    brief: "A one-button flyer with moving gaps, shrinking gaps, collectibles and near-miss bonuses.",
    process: "Built by an AI coding agent from a short multi-step brief: flight feel first, then gate patterns and difficulty, then parallax art and effects. In October 2026 Claude Opus 5.5 rebuilt the twist in an agentic session and play-tested it in a headless browser. Then, at Logan's request, it repainted the whole game as a pterodactyl flying through a prehistoric jungle in a cartoon style. Later in October it moved to a moonlit night island and the split-sky twin-flyer mode was removed. The brontosaurus obstacles then gave way to a night forest of trees, webs, moss and vines, and the agent designed a brand-new pterodactyl of its own from scratch: a procedural 3D clay model, ray-marched offline into a small sprite sheet. The island and obstacles are painted in code.",
    tech: ["The pterodactyl is a procedural 3D clay model built from smoothly blended rounded shapes, ray-marched offline with soft shadows, ambient occlusion and a moonlit rim light into one small sprite sheet", "Its 24-frame flap cycle, blinks and dizzy bonk face are resampled once to screen size, so a frame only copies pixels and allocates nothing", "The island, trees, webs, moss, vines and spiders are painted in code with soft canvas gradients", "Six parallax layers painted once into seamless tiles: moonlit sky and lagoon, sea stacks, islands with a glowing hut, foreground bushes, ground and hanging leaves", "Hit shapes follow the art: round crowns and webs, narrow trunks, moss down to its hem"]
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
  { date: "2026-10-22", title: "Ptero Flap goes moonlit", body: "Ptero Flap has a new look: a brand-new wide-eyed clay pterodactyl flying over a moonlit island, with a glowing moon, a lagoon, palm trees, a dome hut with a warm window and fireflies. The brontosauruses are gone; now you thread a night forest of trees, rock spires, hanging moss, vines and spider webs, some strung between bamboo stalks. The split-sky twin-flyer mode is gone too, so it is one pterodactyl and one flap button again. Moving gaps, amber and close-call combos stay." },
  { date: "2026-10-22", title: "Neon Flap is now Ptero Flap", body: "The one-tap flyer has been repainted from the ground up. You now fly a cartoon pterodactyl through a prehistoric jungle at sunset, past a smoking volcano, dodging trees, hanging branches, spiderwebs, rock spires and brontosauruses that raise their necks into your path." },
  { date: "2026-10-21", title: "Nine classics get a real twist", body: "Void Rocks now has a tractor tether: whirl a rock round your ship and fling it for chain kills. Star Siege lasers carry a colour, so you paint aliens and pop matching clusters. Prism Breaker balls take spin off the paddle and curve round steel. Fusion 2048 sets off chain reactions while lead blocks wall off the board. Neon Flap splits into twin flyers, one in each half of the sky. Wordglow is now a daily chain of three linked words that share twelve guesses. Nebula Drop swaps the jar for a round gravity well. Gridstorm kills send out shockwaves that chain through the swarm. And the Skystack tower sways in the wind as it climbs." },
  { date: "2026-10-21", title: "Three new classics with a twist", body: "Crosstime is a road-and-river crosser where getting hit rewinds time. Echo Maze is a pellet maze where your own path comes back to hunt you. Ringfall is city missile defence wrapped round a small turning planet, with blasts that chain into blasts." },
  { date: "2026-10-21", title: "Classics with a twist", body: "PromptArcade is now an arcade of prompt-made classics with a twist: well-known games remade by AI, each changed enough to play differently. Every game page now says which classic it remakes and what the twist is, and games that aren't remakes have their own Originals shelf. The home page has a new arcade cabinet that plays through the shelf." },
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
  { game: "neon-flap", stat: "score", min: 500, text: "Score 500 in Ptero Flap" },
  { game: "prism-breaker", stat: "score", min: 3000, text: "Score 3,000 in Prism Breaker" },
  { game: "crosstime", stat: "score", min: 600, text: "Score 600 in Crosstime" },
  { game: "echo-maze", stat: "score", min: 3000, text: "Score 3,000 in Echo Maze" },
  { game: "ringfall", stat: "score", min: 3000, text: "Score 3,000 in Ringfall" }
];
