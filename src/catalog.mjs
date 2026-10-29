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
    tagline: "Launch worlds into a 3D gravity well. Two of a kind fuse into something bigger.",
    about: "Stardust becomes pebbles, pebbles become moons, moons become worlds, all the way up to a black hole. Instead of dropping into a jar you aim from anywhere round the rim and everything falls toward the star at the centre, so the pile builds outward like a little planet, every body a real lit sphere with its night side in shadow. Swap with the next body when it suits you, charge a gravity pulse to shake the pile loose, feed things to the wormholes that come up the queue, and ride out the meteor showers. If the pile reaches the danger ring and stays there, the run is over.",
    credit: CLAUDE_NEW,
    brief: "A merge-and-drop physics puzzle with a space theme: two matching bodies fuse into the next tier, eleven tiers ending in a black hole. Then rebuild it in real 3D with better graphics, and make it more immersive and more interactive.",
    process: "In late October 2026 Claude rebuilt it in real 3D in an agentic session, keeping the rules and adding new mechanics, and play-tested it in a headless browser at desktop and phone sizes.",
    tech: [
      "Every body is a sphere lit by the core star, with its own surface, rings or accretion disk",
      "Radial gravity toward a central star, with a circular rim and a danger ring instead of a jar",
      "Custom circle physics: 8 substeps, positional correction, impulses with friction and spin",
      "Swaps, gravity pulses, wormholes and meteor showers",
      "HDR bloom, and combo shockwaves that scale with tier"
    ]
  },
  {
    slug: "wordglow", title: "Wordglow", added: "2026-10-11", featured: 4,
    genre: "Daily", tags: ["daily", "word", "puzzle"], difficulty: "Simple", accent: "#2ee6c5", accent2: "#b48cff",
    unit: "streak points", daily: true,
    classic: "Five-letter word", twist: "Each day is a chain of three words, and each word starts with the last letter of the one before. Twelve guesses cover the whole chain, so the guesses you save on one word carry over to the next.",
    tagline: "Three linked words a day on glowing glass tiles. Twelve guesses.",
    about: "Every day brings a chain of three five-letter words, the same chain for everyone, on glass tiles that flip and glow under an aurora. Solve the first word and its last letter becomes the locked first letter of the next. You get twelve guesses for the whole chain, and no more than six on any one word, so a quick solve buys time for a harder one later. Stuck? Spend a guess on a spark to light one letter. Share your glowing grid, keep a streak going, and play unlimited practice chains once the daily is done.",
    credit: CLAUDE_NEW,
    brief: "A daily five-letter word game with streaks, stats, hard mode, practice mode and a shareable result grid. Then rebuild it in real 3D with better graphics, and make it more immersive and more interactive.",
    process: "In late October 2026 Claude rebuilt it in real 3D in an agentic session, keeping the rules and adding new mechanics, and play-tested it in a headless browser at desktop and phone sizes.",
    tech: [
      "The board is drawn as 3D glass tiles with flips, bursts and a win wave, over an aurora with HDR bloom",
      "Each day's three-word chain is picked by a seeded walk through the answer list",
      "1,800+ answers picked from open word-frequency data with names, places and slang filtered out",
      "Sparks light one letter for one guess, once per word",
      "Progress, streaks and stats saved locally; the daily rolls over at your local midnight"
    ]
  },
  {
    slug: "block-bloom", title: "Block Bloom", added: "2026-10-11", featured: 5,
    genre: "Puzzle", tags: ["puzzle", "casual"], difficulty: "Simple", accent: "#ff7eb6", accent2: "#ffd36b",
    unit: "points",
    classic: "Falling blocks", twist: "No next-piece preview; a row finished in one colour scores ten times as much and bursts every gem of that colour, so the columns cascade into chains; dew drops recolour the falling piece.",
    tagline: "Falling gems, no preview. One-colour rows bloom, burst and cascade into chains.",
    about: "Gem blocks fall into the garden one at a time. Turn them, slide them and drop them to fill a row and watch it burst into petals. There is no next-piece window: each piece appears at the top the moment the last one lands, so you play what you get. Finish a whole row in a single colour and it scores ten times as much and goes to Full Bloom: every other gem of that colour on the board bursts too, the columns cascade down, and any rows they complete chain for even more. Clearing rows fills your dew drops, and a dew drop turns the falling piece to the next colour when you need a row to stay pure.",
    credit: CLAUDE_NEW,
    brief: "A falling-block puzzle on an 8×14 board with turning pieces, no next-piece preview, combos, rising speed, and a 10× bonus for single-colour rows. Then make the whole board fit on screen, and add upgrades: Full Bloom colour bursts with column cascades and chains, and dew drops that recolour the falling piece.",
    tech: [
      "The board always fits the screen: on wide screens the score and stats move beside it",
      "Full Bloom bursts a colour across the board, then columns cascade and chain",
      "Dew drops, earned by clearing rows, recolour the falling piece",
      "Wall kicks let a piece turn snugly against walls and other blocks",
      "Tap to turn, drag to move and flick down to drop on touch screens"
    ]
  },
  {
    slug: "gridstorm", title: "Gridstorm", added: "2026-10-11", featured: 6,
    genre: "Shooter", tags: ["shooter", "twin-stick", "arcade"], difficulty: "Advanced", accent: "#5ef2ff", accent2: "#ffe68a",
    unit: "points",
    classic: "Twin-stick arena", twist: "Fight inside a thunderstorm: every kill sends out a shockwave that blows up whatever it reaches, so packed swarms go off in chain reactions, while thunderheads call lightning down on where you're heading.",
    tagline: "A twin-stick shooter on a 3D honeycomb floating in a thunderstorm.",
    about: "Fly a little storm-chaser drone over a honeycomb of charge cells floating above a lightning-lit storm. Move with one hand, aim with the other, and survive the storm's creatures: jellies of static, darts that take aim and lunge, shellbacks whose shield always faces you, seeders that sow mines, eels that zigzag at right angles, and thunderheads that call lightning down where you're about to be. Every kill sends out a shockwave that sets off anything it reaches, and the cells it crosses rise and glow. Stand on lit cells to overcharge your guns, dash through trouble and charge the floor as you go, and when a supercell rolls in, chain shockwaves into it to bring it down.",
    credit: CLAUDE_NEW,
    brief: "A twin-stick arena shooter set inside a thunderstorm, with its own cast of storm creatures, a honeycomb floor that lights up with every blast, chain-reaction shockwaves, surges and a score multiplier. Then rebuild it in real 3D with better graphics, and make it more immersive and more interactive.",
    process: "In late October 2026 Claude rebuilt it in real 3D in an agentic session, keeping the rules and adding new mechanics, and play-tested it in a headless browser at desktop and phone sizes.",
    tech: [
      "Over a thousand instanced hex cells that rise and glow with their charge, in one shader",
      "Darts telegraph their lunge, shellbacks block shots from the front, and lightning lands where you're heading after a warning ring",
      "Kill shockwaves chain from enemy to enemy, with points that scale with chain depth",
      "A dash, overcharge from lit cells, and a supercell boss",
      "Rain, forked lightning, boiling storm clouds and a storm sea below, with HDR bloom"
    ]
  },
  {
    slug: "deepdelve", title: "Deepdelve", added: "2026-10-11", featured: 7,
    genre: "Roguelike", tags: ["roguelike", "daily", "strategy"], difficulty: "Mid", accent: "#ffcf70", accent2: "#ff7a2a",
    unit: "points", daily: true,
    classic: "Dungeon crawl", twist: "One seeded Daily Delve for every player, and a dragon waiting on every fifth floor.",
    tagline: "A turn-based dungeon crawl in a torch-lit 3D dungeon, new every day.",
    about: "Descend through procedurally generated floors of a torch-lit 3D dungeon, fight modelled monsters turn by turn, find potions, bombs and better gear, and face a dragon every fifth floor. Open chests (some of them bite), watch for hidden spike traps, pray at shrines, and trade blows to charge a fury spin that hits everything around you. Death is permanent, and the Daily Delve gives everyone the same dungeon each day.",
    credit: CLAUDE_NEW,
    brief: "A classic turn-based roguelike: procedural rooms and corridors, field of view, monsters with different behaviours, items, levelling and a daily seeded dungeon. Then rebuild it in real 3D with better graphics, and make it more immersive and more interactive.",
    process: "In late October 2026 Claude rebuilt it in real 3D in an agentic session, keeping the rules and adding new mechanics, and play-tested it in a headless browser at desktop and phone sizes.",
    tech: [
      "Stone floors and brick walls lit by your torch and wall sconces, with fog of war from a small visibility texture",
      "Recursive shadowcasting field of view with remembered tiles",
      "Seeded generator: the Daily Delve is identical for every player",
      "Monsters path with a Dijkstra map; wraiths drift through walls, bats flutter, slimes split, mimics wait",
      "Chests, spike traps, shrines and a fury spin"
    ]
  },
  {
    slug: "skystack", title: "Skystack 3D", added: "2026-10-11", featured: 8,
    genre: "3D", tags: ["3d", "casual", "one-button"], difficulty: "Simple", accent: "#ffb347", accent2: "#6ec8ff",
    unit: "floors",
    classic: "Tower stacker", twist: "You're building a real skyscraper: a crane lowers each floor, the tower climbs from brick walk-ups to a glass spire as day turns to night, and from the fifth floor up the wind makes the whole thing sway.",
    tagline: "Build a skyscraper floor by floor off a tower crane, into the night.",
    about: "A tower crane swings each new floor in over the tower, first from one side and then the other, and climbs with the building as it grows. Lower the floor at the right moment: whatever hangs over the floor below is sheared off and falls to the street, so every miss makes the building thinner. Climb from brick row through concrete, glass and art deco to a glass spire, while the sun sets, the traffic lights stream through the streets below and the windows light up. From the fifth floor the wind makes the tower sway. Three flush drops in a row brace it, a hot streak of flush drops grows the floor back a little, and every tenth floor is a sky lobby that comes in wider.",
    credit: CLAUDE_NEW,
    brief: "A one-button 3D skyscraper builder in three.js: a crane lowers each floor, overhangs shear off, the facade changes district every ten floors, the day turns to night with height, wind sway, braces for flush drops and wide sky lobbies. Then upgrade it with better graphics, and make it more immersive and more interactive.",
    process: "In late October 2026 Claude upgraded it in an agentic session, adding the tower crane, the living city, the sky dome, bloom and the regrow streak, and play-tested it in a headless browser at desktop and phone sizes.",
    tech: [
      "Facades are painted on canvases at load, one per district, with a second map of the windows that light up at night",
      "A lattice tower crane that climbs with the building and slews its jib to follow the load",
      "Wind sway bends the tower more toward the top and grows with height, while the stack is stored in straight, unswayed positions",
      "A city of streets, flowing traffic lights and lit windows, under a sky dome with a setting sun and stars",
      "HDR bloom, birds by day and a searchlight helicopter at night"
    ]
  },
  {
    slug: "crosstime", title: "Crosstime", added: "2026-10-21",
    genre: "Arcade", tags: ["arcade", "endless", "crossing"], difficulty: "Mid", accent: "#5ef2ff", accent2: "#ffd36b",
    unit: "points",
    classic: "Road and river crosser", twist: "Get hit and time rewinds to your last safe spot, but rewinds run out, and a wall of static creeps up behind you.",
    tagline: "Hop across an endless 3D night city. Get hit and time rewinds.",
    about: "Hop a little courier bot across an endless night city in real 3D: rain-slick roads full of cars, vans, buses and trucks with their headlights on, canals of cargo barges and float pads that power down and sink, and rail crossings where the night train comes through with almost no warning. Get flattened or fall in and the whole street rewinds to the last moment you stood somewhere safe. Rewinds run out, and a wall of static follows you up the street. Fill the stasis meter with close calls and slow the whole street down, grab parcels and deliver them to the beacon up the road before the timer runs out, and keep moving for a streak bonus.",
    credit: CLAUDE_NEW,
    brief: "Remake the road-and-river crossing classic as an endless night city with cars, trucks, cargo barges, sinking float pads and trains, and make getting hit rewind time instead of ending the run. Then rebuild it in real 3D with better graphics, and make it more immersive and more interactive.",
    process: "In late October 2026 Claude rebuilt it in real 3D in an agentic session, keeping the rules and adding new mechanics, and play-tested it in a headless browser at desktop and phone sizes.",
    tech: [
      "Every lane is a pure function of the world clock, so running the clock backwards replays the street in reverse, and slowing it slows everything",
      "The player is snapshotted every frame; a rewind scrubs back to the newest snapshot on solid ground",
      "Rows are built in 3D as they come into view: modelled vehicles, barges, sinking pads, trains with signals, lamps and parks",
      "Stasis, parcel deliveries and streak scoring on top of the original rules",
      "Swipes hop the moment they cross a threshold, so touch play feels as quick as the keys"
    ]
  },
  {
    slug: "echo-maze", title: "Echo Maze", added: "2026-10-21",
    genre: "Arcade", tags: ["arcade", "maze", "stealth"], difficulty: "Mid", accent: "#6ee1ff", accent2: "#b48cff",
    unit: "points",
    classic: "Maze chase", twist: "You're a bat in a pitch-black cave who sees by sonar. Every ping lights the tunnels but tells the hunters where you are.",
    tagline: "A bat, a black cave and a sonar ping that gives you away.",
    about: "You're a young bat lost in a pitch-black cave, and you can only see a little way around you. Ping and a wave of sound races down the tunnels and lights them for a moment, but the things in the cave hunt by sound. Spiders come to where they heard you, stone lurkers stalk you and freeze only while light is on them, and owls glide straight over the rock toward your last ping. Find every crystal to unseal the moonlit way out. Glowcaps flash and stun everything nearby, fireflies light the way, and the fewer pings you use the bigger your escape bonus.",
    credit: CLAUDE_NEW,
    brief: "Rework the maze chase so it no longer resembles the famous pellet maze: a bat that sees by sonar in a dark cave, hunters that react to sound and light, crystals to collect and an exit to reach, with new art throughout.",
    tech: [
      "Each ping is a breadth-first flood through the tunnels, so the light follows the cave instead of passing through rock",
      "Creatures react to sound and light: spiders chase the last noise, lurkers freeze while lit, owls fly over walls",
      "Caves are carved depth-first with long horizontal runs, then partly braided into loops with a few hidden nooks",
      "Darkness is one value per tile, scaled up smoothly, with the tunnels you've seen faintly remembered",
      "On tall screens the whole cave turns a quarter-turn so it still fills the screen"
    ]
  },
  {
    slug: "ringfall", title: "Ringfall", added: "2026-10-21",
    genre: "Shooter", tags: ["shooter", "arcade", "defense"], difficulty: "Mid", accent: "#8ee9ff", accent2: "#ff5c7a",
    unit: "points",
    classic: "City missile defence", twist: "The cities sit around a small turning planet, so warheads come from every side, and every blast can set off another for a growing multiplier.",
    tagline: "Defend an orbital ring round a living planet, in real 3D.",
    about: "Six habitats and three interceptor batteries ride a ring round a living planet, and the ring keeps turning while warheads come in from every side. Tap or click ahead of them to burst an interceptor in their path. Catch one in a blast and it bursts too, and every link in that chain multiplies the points. Later waves bring warheads that split in three, warheads that weave, orbiting bombers and armoured dreadnoughts. Between waves you pick a refit for the ring, from wider blasts and hot rockets to a dome shield or a rebuilt habitat, and kills charge an ion pulse that sweeps the space round the ring clean.",
    credit: CLAUDE_NEW,
    brief: "Remake the city missile-defence classic around a small rotating planet with three batteries, chain-reaction blasts, splitting and weaving warheads, and orbiting bombers. Then rebuild it in real 3D with better graphics, and make it more immersive and more interactive.",
    process: "In late October 2026 Claude rebuilt it in real 3D in an agentic session, keeping the rules and adding new mechanics, and play-tested it in a headless browser at desktop and phone sizes.",
    tech: [
      "Real-time 3D with HDR bloom: a lit planet with clouds and city lights, the ring, its shuttles and tethers",
      "Interceptors arc up off the ring's plane and burst back on it, so the rules still play on a flat orbit",
      "Blasts that catch a warhead spawn a blast of their own, and the chain depth is the multiplier",
      "Between-wave refits from a deck of ten cards, and an ion pulse charged by kills",
      "Aim with the mouse, touch, or the arrow keys and Space"
    ]
  },
  {
    slug: "neon-outrun", title: "Neon Nightdrive", added: "2026-09-20",
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
    genre: "3D", tags: ["3d", "flying"], difficulty: "Advanced", accent: "#29f0ff", accent2: "#ff2fa8", unit: "points",
    original: true,
    tagline: "Thread a jet through a neon megacity: open windows, sky offices and crane booms.",
    about: "A real-time 3D flight through a neon-lit megacity at night. Thread the jet down canyons of dark glass towers hung with blade signs and hard-light adverts, under streams of flying traffic, then through open windows into glowing sky offices and chrome lobbies and out through a missing pane, under sweeping steel beams and between crane masts. Every sector is a new night, from neon dusk through acid rain to an ion storm. String gold beacons into a multiplier and light the afterburner when you dare.",
    credit: { maker: "Claude", model: null, via: "Claude (agentic session)", method: "agentic" },
    brief: "A three.js endless flyer: a banking ship, pooled 3D obstacles, a boost meter, an orb multiplier and colour-shifting sectors. Then keep the game exactly the same but rebuild every visual as a flythrough of a neon cyberpunk megacity: towers, windows, rooms, offices and doors from building to building, flying traffic and cranes, with a sleek jet and afterburner.",
    process: "First built with a coding agent as a neon lane flyer, then rebuilt by an AI coding agent as a city flythrough: the obstacle and scoring code was kept as it was and only the world around it was replaced, every gate turned into a door, window or missing pane at the exact same spot. In late October 2026 Claude restyled the whole city as a neon megacity in an agentic session, with new night skies, tower skins, signs, interiors and flying traffic, and checked every sector in a headless browser at desktop and phone sizes. The flying is unchanged.",
    tech: ["Every opening sits exactly where the old gates did, so the flying is unchanged", "Procedural megacity built in chunks as you fly: dark glass towers with neon trim, blade signs in an invented script and hard-light adverts for made-up brands", "Windows are real glass with lit rooms behind them, traced per pixel", "Six neon nights from dusk to an ion storm, with HDR bloom, haze, rain and streams of flying traffic", "A graphite jet with a glowing livery, a shock-diamond afterburner, nav lights and wingtip vortices"]
  },
  {
    slug: "circuit-hop", title: "Circuit Hop", added: "2026-09-20",
    genre: "Platformer", tags: ["platformer"], difficulty: "Advanced", accent: "#7dffb0", accent2: "#5ef2ff", unit: "points",
    original: true,
    tagline: "A tight platformer through a 3D circuit-board world, with a little robot hero.",
    about: "Guide a little robot through eight circuit-board sectors built as a 3D diorama, from Relay Lane to the Mainframe. Wall-jump up shafts, air-dash through bots to smash them, bounce off boost pads, dodge hover drones, time the laser gates and hop the spike beds, grabbing data chips for combos on the way to the exit portal. Every sector gives you a rank for how well you ran it.",
    credit: CLAUDE_CURSOR,
    brief: "A tile-based platformer with coyote time, jump buffering, wall jumps, hazards, enemies, checkpoints and handcrafted levels. Then rebuild it in real 3D with better graphics, and make it more immersive and more interactive.",
    process: "Built by an AI coding agent from a multi-step brief: movement feel first, then the level set, hazards and enemies, then camera, effects and touch buttons. In late October 2026 Claude rebuilt it in real 3D in an agentic session, keeping the rules and adding new mechanics, and play-tested it in a headless browser at desktop and phone sizes.",
    tech: [
      "The original tile physics, drawn one tile to one world unit, so every collision rule and the reachability test still hold",
      "Coyote time, jump buffering, hold-to-jump-higher, wall jumps and an air dash",
      "Eight sectors with boost pads, hover drones, chip combos, stomp chains and ranks",
      "Circuit-board shaders with copper traces and data pulses, under HDR bloom"
    ]
  },
  {
    slug: "void-rocks", title: "Void Rocks", added: "2026-09-20",
    genre: "Shooter", tags: ["shooter", "arcade"], difficulty: "Mid", accent: "#c49bff", accent2: "#5ef2ff", unit: "points",
    classic: "Rock-field shooter", twist: "A tractor tether: grab a rock, whirl it round your tug as a wrecking ball, then fling it through the field for chain multipliers. Scrapper drones fly in to cut up the big rocks.",
    tagline: "A 3D rock-field shooter where the rocks are your best weapon.",
    about: "Pilot a little salvage tug through a drifting field of faceted, veined rock in real 3D. Split the big rocks with your gun, then grab a small one with the tether and it whirls round your tug as a wrecking ball. Let go and it flies the way you're facing, ploughing through the field: every rock it hits raises the chain multiplier. Scrapper drones fly in to cut up the biggest rocks, so swat them with a tethered rock for a big bonus. Fly through gold salvage to refit the tug with twin guns, a heavy tether and spread guns, and when a rift tears open and starts dragging everything in, fling a rock into it to seal it.",
    credit: CLAUDE_CURSOR,
    brief: "A rock-field shooter with inertia, screen wrap, splitting rocks, a tractor tether, scrapper drones that cut up rocks, a short-range blink and waves. Then rebuild it in real 3D with better graphics, and make it more immersive and more interactive.",
    process: "Built by an AI coding agent from a multi-step brief: ship physics and wrapping first, then rocks, enemies and waves, then glow rendering, audio and touch clusters. In October 2026 Claude rebuilt the twist in an agentic session and play-tested it in a headless browser, and later gave it solid cratered rocks, a salvage tug, rock-cutting drones and a blink jump so it stands further from the original. In late October 2026 Claude rebuilt it in real 3D in an agentic session, keeping the rules and adding new mechanics, and play-tested it in a headless browser at desktop and phone sizes.",
    tech: [
      "Real-time 3D with HDR bloom: faceted rocks with craters and glowing veins, parallax stars and a nebula",
      "The original wrapping arena in screen pixels, drawn under a straight-down camera, so things show on both sides of an edge",
      "Tether that winds up as it whirls; thrown rocks pierce the field and count a chain multiplier",
      "Salvage refits in four marks, and rifts with a lensing shader that you seal with a flung rock"
    ]
  },
  {
    slug: "star-siege", title: "Star Siege", added: "2026-09-20",
    genre: "Shooter", tags: ["shooter", "arcade"], difficulty: "Mid", accent: "#ff7eb6", accent2: "#7dffb0", unit: "points",
    classic: "Alien invasion", twist: "Colour lasers against a honeycomb swarm: a hit on the wrong colour paints the alien yours, and a hit on a match chain-pops every touching alien of that colour.",
    tagline: "Paint a 3D alien swarm in low orbit, then pop it in chains.",
    about: "A honeycomb swarm of aliens in four colours glides over a turning planet and sinks toward your cannon, and your laser carries one of the colours. Hit an alien of a different colour and you paint it yours. Hit one that matches and every touching alien of that colour detonates in a chain. Divers peel off and swoop at you, big clusters drop power capsules (spread, rapid and a bubble shield), and a charged overload beam paints whole columns at once. Every fourth wave a hive queen arrives who can only be hurt by a matching hit or a cluster popped right beside her.",
    credit: CLAUDE_CURSOR,
    brief: "A fixed shooter against a gliding honeycomb swarm: colour lasers that paint or chain-pop, drifting crystal barriers, a bonus comet and faster waves. Then rebuild it in real 3D with better graphics, and make it more immersive and more interactive.",
    process: "Built by an AI coding agent from a multi-step brief: the formation and shooting first, then barriers and waves, then sprites, audio and touch controls. In October 2026 Claude rebuilt the twist in an agentic session and play-tested it in a headless browser, then reshaped the swarm into a gliding honeycomb with drifting crystal barriers and a comet so it stands further from the original. In late October 2026 Claude rebuilt it in real 3D in an agentic session, keeping the rules and adding new mechanics, and play-tested it in a headless browser at desktop and phone sizes.",
    tech: [
      "Real-time 3D deck over a turning planet with HDR bloom; aliens beat their fins in the vertex shader",
      "Flood fill through the six honeycomb neighbours of each alien, popped in a ripple",
      "Divers on curved paths, an overload beam, power capsules and a hive queen",
      "An aim preview shows how big a chain your next shot will set off",
      "Touch drag with auto fire"
    ]
  },
  {
    slug: "prism-breaker", title: "Prism Breaker", added: "2026-09-20",
    genre: "Arcade", tags: ["arcade", "paddle"], difficulty: "Mid", accent: "#6ec8ff", accent2: "#c49bff", unit: "points",
    classic: "Brick breaker", twist: "Spin: the paddle's motion at contact puts spin on the ball, so shots curve in flight round steel guards, and bent breaks score double.",
    tagline: "A brick breaker in a 3D crystal hall, where the ball curves.",
    about: "Bounce light through a crystal hall in real 3D. Move the emitter as the ball touches it and the ball leaves spinning, bending in flight the way you swept, so you can curve shots round the steel guards, and any brick broken on a bend scores double. Prism bricks split the light into beams, charge bricks blow out their neighbours, whole rows slide from side to side, and two halls end in a guardian with a core to crack. Catch multiball, lasers, a wider emitter, slow-motion, a barrier and more.",
    credit: CLAUDE_CURSOR,
    brief: "A brick-breaker with handcrafted layouts, multi-hit and steel bricks, power-ups, combos and a speed ramp. Then rebuild it in real 3D with better graphics, and make it more immersive and more interactive.",
    process: "Built by an AI coding agent from a multi-step brief: physics and paddle control first, then layouts and power-ups, then effects, audio and touch drag. In October 2026 Claude Opus 5.5 rebuilt the twist in an agentic session and play-tested it in a headless browser. In late October 2026 Claude rebuilt it in real 3D in an agentic session, keeping the rules and adding new mechanics, and play-tested it in a headless browser at desktop and phone sizes.",
    tech: [
      "Real-time 3D crystal hall with HDR bloom, glass bricks and light trails",
      "Spin from the emitter's measured speed; the ball's velocity turns a little every frame",
      "Prism bricks fire beams, charge bricks blow out their neighbours, and rows slide",
      "Guardian halls with a core to crack",
      "The rules stay flat on the floor plane, so the feel of the original is unchanged"
    ]
  },
  {
    slug: "fusion-2048", title: "Fusion 2048", added: "2026-09-20",
    genre: "Puzzle", tags: ["puzzle"], difficulty: "Simple", accent: "#5ef2ff", accent2: "#ff7eb6", unit: "points",
    classic: "Sliding tiles", twist: "Chain reactions: a fused tile that lands next to its twin fuses again for a multiplier, while lead blocks drop in and wall off lines.",
    tagline: "Fuse glowing cells in a 3D fusion reactor and set off chain reactions.",
    about: "Slide glowing glass cells round a steel tray at the heart of a fusion reactor, and fuse equal numbers into bigger ones. A freshly fused cell that lands touching its twin fuses again on its own, and again, each link worth more. Lead blocks drop in and wall off rows and columns until they decay. Chains charge vents that blow a cell clean out of the tray, bigger cells earn rewinds, and the reactor heats up round you from Cold through Critical and Stellar to Nova.",
    credit: CLAUDE_CURSOR,
    brief: "A 2048 sliding-tile game (the original is open source under MIT) with tweened slides, merge particles and escalating sound. Then rebuild it in real 3D with better graphics, and make it more immersive and more interactive.",
    process: "Built by an AI coding agent from a short multi-step brief: board rules first, then animation and juice, then swipe input. In October 2026 Claude Opus 5.5 rebuilt the twist in an agentic session and play-tested it in a headless browser. In late October 2026 Claude rebuilt it in real 3D in an agentic session, keeping the rules and adding new mechanics, and play-tested it in a headless browser at desktop and phone sizes.",
    tech: [
      "Real-time 3D reactor with HDR bloom: glass cubes in a steel tray over a plasma well",
      "Chain reactions resolved as their own animated steps",
      "Lead cells split each line into runs that slide separately",
      "Vents and rewinds earned by play, and reactor stages that follow your best cell",
      "Swipe, keys or tap to play"
    ]
  },
  {
    slug: "neon-flap", title: "Neon Skyway", added: "2026-09-20",
    genre: "Arcade", tags: ["arcade", "reflex", "3d"], difficulty: "Mid", accent: "#ffb21e", accent2: "#ff2fa8", unit: "points",
    classic: "One-tap flyer", twist: "You fly a hover car through a stacked neon megacity: hold boost to shoot up, cut the engine to drop like a stone, and weave through billboards, cargo lifts, security lasers, patrol drones and oncoming traffic.",
    tagline: "Boost and drop a hover car through a neon megacity in the sky.",
    about: "A hover car run through a stacked, neon-lit megacity in real 3D, with lanes of flying traffic above and below you. Hold boost to climb fast and cut the engine to drop like a stone, then thread the gaps: towers, hard-light billboards that turn solid, sliding cargo lifts, swinging cranes, security lasers, patrol drones that lock on to your height, exhaust stacks that throw you upward and oncoming traffic. Grab energy cells for a shield, skim close for combo points, and fly through five districts before Overdrive throws them all at you at once.",
    credit: { maker: "Claude", model: null, via: "Claude (agentic session)", method: "agentic" },
    brief: "A one-button flyer with moving gaps, shrinking gaps, collectibles and near-miss bonuses. Then rebuild it as a cyberpunk hover car run through a futuristic flying-car city, with a boost button to climb fast, an engine-off button to fall fast, and more creative obstacles.",
    process: "Built by an AI coding agent from a short multi-step brief, then reworked several times as a pterodactyl flyer. In late October 2026 Claude rebuilt it from scratch in an agentic session as a 3D hover car run: flight feel first, then the eight obstacle types and districts, then the city, the car and the effects. An autopilot flew test runs in a headless browser to tune the gaps at desktop and phone sizes. Leaderboard scores carry over.",
    tech: ["Real-time 3D in three.js with HDR bloom, fog and a sky that shifts with each district", "A layered city: near towers with neon edges, holo adverts and blade signs, far skylines and a smog deck glowing from the undercity", "Hover cars built from boxes and extrusions, with headlight cones, thrusters and hundreds of flying traffic lights", "Eight obstacle types with hit shapes that follow the art, from billboards that harden in rhythm to drones that track your height", "Boost and engine-off controls on keys, mouse and touch buttons"]
  }
];

/* Games that used to be on the site. Their old URLs redirect (301) so links and bookmarks keep working. */
export const RETIRED = {
  "pellet-panic": null,
  "vault-dash": null, "spark-climb": null,
  "paper-moths": null, "gate-comet": null, "lantern-stack": null, "moss-steps": null, "wick-line": null,
  "roofline-crane": null, "upstream-koi": null, "kiln-break": null, "orchard-serpent": "glowline-arena", "belt-drift": null,
  "pulse-lanterns": null, "loom-shuttle": null, "tide-bell": null, "pier-watch": null, "courier-of-glass": null,
  "soot-lantern": "deepdelve", "night-press": "wordglow"
};

/* What's-new feed (newest first). */
export const NEWS = [
  { date: "2026-10-28", title: "Neon Skyway and a neon Hyperlane", body: "Ptero Flap is now Neon Skyway: you fly a hover car through a stacked neon megacity, holding boost to shoot up and cutting the engine to drop like a stone. Thread towers, hard-light billboards, cargo lifts, cranes, security lasers, patrol drones, exhaust stacks and oncoming traffic across five districts. Hyperlane 3D has a whole new look too: the city is now a neon megacity at night, with dark glass towers, blade signs, giant holo adverts, flying traffic and glowing sky offices. The flying is exactly the same." },
  { date: "2026-10-27", title: "Twelve games rebuilt in 3D", body: "Every game that wasn't already a big build has been rebuilt in real 3D with new mechanics. Ringfall defends an orbital ring with refits and an ion pulse. Prism Breaker is a crystal hall with prism beams, charge bricks and guardians. Fusion 2048 runs in a fusion reactor with vents and rewinds. Nebula Drop has lit worlds, swaps, gravity pulses and wormholes. Circuit Hop is a circuit-board diorama with an air dash, boost pads, drones, ranks and eight sectors. Deepdelve is a torch-lit dungeon with chests, mimics, traps and shrines. Wordglow is glass tiles in an aurora with sparks. Star Siege adds divers, an overload beam, capsules and a hive queen. Void Rocks adds refits and rifts. Crosstime adds stasis, parcels and streaks. Gridstorm adds a dash, overcharge and supercells. And Skystack gets a tower crane and a living city." },
  { date: "2026-10-23", title: "Echo Maze is now a bat in the dark", body: "Echo Maze has been rebuilt from scratch. You're a young bat lost in a pitch-black cave who sees by sonar: every ping lights the tunnels, but the spiders, stone lurkers and owls hunt by sound. Find every crystal, then fly out into the moonlight." },
  { date: "2026-10-23", title: "Five classics get a look of their own", body: "Gridstorm now takes place inside a thunderstorm, with a new cast of storm creatures and thunderheads that call down lightning. Skystack is a real skyscraper lowered floor by floor off a crane, climbing from brick walk-ups to a glass spire as day turns to night. Void Rocks has solid cratered rocks and drones that cut them up, Star Siege faces a gliding honeycomb swarm, and Crosstime's rivers carry cargo barges and float pads. Block Bloom now fits on any screen and adds Full Bloom cascades and dew drops." },
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
  { game: "neon-outrun", stat: "score", min: 5000, text: "Score 5,000 in Neon Nightdrive" },
  { game: "fusion-2048", stat: "score", min: 3000, text: "Score 3,000 in Fusion 2048" },
  { game: "circuit-hop", stat: "score", min: 1500, text: "Score 1,500 in Circuit Hop" },
  { game: "void-rocks", stat: "score", min: 5000, text: "Score 5,000 in Void Rocks" },
  { game: "neon-flap", stat: "score", min: 500, text: "Score 500 in Neon Skyway" },
  { game: "prism-breaker", stat: "score", min: 3000, text: "Score 3,000 in Prism Breaker" },
  { game: "crosstime", stat: "score", min: 600, text: "Score 600 in Crosstime" },
  { game: "echo-maze", stat: "score", min: 3000, text: "Score 3,000 in Echo Maze" },
  { game: "ringfall", stat: "score", min: 3000, text: "Score 3,000 in Ringfall" }
];
