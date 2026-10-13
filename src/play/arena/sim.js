/* Glowline Arena — authoritative simulation.
 * Shared by the multiplayer server (Cloudflare Durable Object) and the in-browser
 * offline mode, so bots and rules behave identically in both.
 * Pure ES module: no DOM, no timers. Call step() at TICK_HZ.
 *
 * new Sim({ features: true }) turns on the 2026-10 upgrade: power pellets, portals, rare
 * evolutions and the daily modifier. Without it the rules are exactly the original game,
 * which the legacy room keeps serving to older clients.
 */
export const TICK_HZ = 20;
export const DT = 1 / TICK_HZ;
export const WORLD_R = 2600;
export const BASE_SPEED = 185;
export const BOOST_SPEED = 390;
export const START_MASS = 12;

export const lengthFor = (m) => 70 + Math.min(m, 600) * 2.4 + Math.max(0, m - 600) * 1.1;
export const radiusFor = (m) => 8 + Math.sqrt(m) * 0.82;
export const turnFor = (m) => 4.6 / (1 + m / 900);
export const SKINS = 12;
export const SKINS_V2 = 20;

/* evolutions (index = wire id, 0 = none) */
export const EVO = { VIPER: 1, CONSTRICTOR: 2, EEL: 3, SPLIT: 4, MAGNET: 5, COMET: 6, FIREFLY: 7 };
export const EVO_NAMES = ["", "Viper", "Constrictor", "Eel", "Split-tail", "Magnet", "Comet", "Firefly"];
export const EVO_ACTIVE = { 3: 1, 4: 1, 6: 1 }; // evolutions with a double-tap ability
/* pellet kinds (sent in the top bits of the food colour byte) */
export const PK = { STD: 0, SURGE: 1, WARD: 2, LENS: 3, KEY: 4, EVO: 5, BOUNTY: 6 };

/* all timings in ticks (20 per second) */
export const T = {
  SURGE: 80, WARD: 400, LENS: 240, PROTECT: 20, BOUNCE: 8,
  PORTAL_LIFE: 800, PORTAL_USES: 3, PORTAL_R: 60, DWELL: 7, FLARE: 8, PORTAL_CD: 400,
  EEL_TELL: 6, EEL_PHASE: 24, EEL_CD: 500, SPLIT_LIFE: 120, SPLIT_CD: 400, COMET_DASH: 7, COMET_CD: 240,
  VENOM_EVERY: 5, VENOM_LIFE: 60, SLOW: 30, EVO_PELLET_LIFE: 900
};
export const EVO_CAP = 4;
const MILESTONES = [400, 1200, 2500];
const POWER = [ // kind, share of random spawns, max on map
  [PK.SURGE, 0.006, 12], [PK.WARD, 0.003, 6], [PK.LENS, 0.003, 6], [PK.KEY, 0.002, 4]
];

/* daily modifiers, chosen from the UTC weekday so every room and player agrees */
export const MODIFIERS = {
  rift: { name: "Rift Night", text: "Six portals, free to use, shorter cooldown." },
  feather: { name: "Featherweight", text: "Boosting costs half as much." },
  venom: { name: "Venom Season", text: "Evolutions are three times as likely." },
  blackout: { name: "Blackout", text: "Fog cuts your view. Lens pellets are common." },
  gold: { name: "Gold Rush", text: "Food is worth double and power-ups are twice as common." }
};
const WEEK = [null, "rift", "feather", "venom", "blackout", "gold", "rift"]; // Sunday is a plain day
export function modifierFor(date) { return WEEK[(date || new Date()).getUTCDay()]; }

const CELL = 96;
const TAU = Math.PI * 2;

const BOT_NAMES = [
  "Neon Viper", "Byte Noodle", "Glowworm", "Sir Hiss", "Pixel Python", "Lumen", "Static", "Quasar",
  "Mamba Jamba", "Slinky", "Vector", "Noodle Prime", "Coil", "Zigzag", "Orbit", "Spline", "Comet Tail",
  "Hex", "Sidewinder", "Ribbon", "Photon", "Ziggy", "Tangle", "Echo", "Velvet", "Kaiju Jr", "Wiggles",
  "Starling", "Nova", "Loopdeloop", "Cobalt", "Fizz", "Marlin", "Drift", "Tinsel", "Sprocket"
];

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const angDiff = (a, b) => {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};
const cellKey = (cx, cy) => ((cx + 2048) << 12) | (cy + 2048);
const r1 = (v) => Math.round(v * 10) / 10;

export class Sim {
  constructor(opts = {}) {
    this.rand = mulberry32(opts.seed || (Date.now() & 0xffffffff));
    this.F = !!opts.features;
    this.skins = opts.skins || (this.F ? SKINS_V2 : SKINS);
    this.worldR = opts.worldR || WORLD_R;
    this.botTarget = opts.bots == null ? 14 : opts.bots;
    this.maxSnakes = opts.maxSnakes || 40;
    this.tick = 0;
    this.snakes = new Map();
    this.nextSnake = 1;
    this.food = new Map();
    this.foodGrid = new Map();
    this.nextFood = 1;
    this.usedNames = new Set();
    // upgrade state
    this.fixedMod = opts.modifier !== undefined;
    this.mod = this.F ? (this.fixedMod ? opts.modifier || null : modifierFor()) : null;
    this.pcount = [0, 0, 0, 0, 0, 0, 0];
    this.portals = new Map(); this.nextPortal = 1; this.portalNext = 40;
    this.decoys = new Map(); this.nextDecoy = 1;
    this.evoNext = this.F ? 600 + ((this.rand() * 1200) | 0) : 0;
    this.ev = this.blankEvents();
    for (let i = 0; i < this.foodTarget(); i++) this.spawnFood();
    this.ev = this.blankEvents();
    for (let i = 0; i < this.botTarget; i++) this.addBot();
    this.ev = this.blankEvents();
  }

  blankEvents() { return { tick: this.tick, heads: [], eat: [], food: [], add: [], del: [], lb: null, x: [] }; }
  foodTarget() { return Math.round(this.worldR * this.worldR * 0.000145) + this.snakes.size * 12; }
  rad(s) { return radiusFor(s.m) * (s.evo === EVO.CONSTRICTOR ? 1.35 : 1); }
  phased(s) { return s.evo === EVO.EEL && this.tick >= s.tellUntil && this.tick < s.abUntil; }
  /** a snake that can neither be hit nor hit anyone this tick */
  ghost(s) { return this.F && (s.protUntil > this.tick || this.phased(s)); }
  evolvedCount() { let n = 0; for (const s of this.snakes.values()) if (s.evo) n++; return n; }

  /* ---------------- food ---------------- */
  spawnFood(x, y, v, c, ttl, k = 0) {
    if (x == null) {
      const r = this.worldR * 0.97 * Math.sqrt(this.rand()), a = this.rand() * TAU;
      x = Math.cos(a) * r; y = Math.sin(a) * r;
      const q = this.rand();
      v = q < 0.012 ? 12 : q < 0.2 ? 3 : q < 0.5 ? 2 : 1;
      c = (this.rand() * 8) | 0;
      if (this.F) {
        if (this.mod === "gold") v *= 2;
        const p = this.rollPower();
        if (p) {
          const at = this.powerSpot();
          if (at) { x = at[0]; y = at[1]; v = 1; k = p; }
        }
      }
    }
    const f = { id: this.nextFood++, x: Math.round(x), y: Math.round(y), v, c, k, exp: ttl ? this.tick + ttl : 0 };
    this.food.set(f.id, f);
    if (k) this.pcount[k]++;
    const key = cellKey(Math.floor(f.x / CELL), Math.floor(f.y / CELL));
    let s = this.foodGrid.get(key);
    if (!s) this.foodGrid.set(key, (s = new Set()));
    s.add(f);
    this.ev.food.push([f.id, f.x, f.y, f.v, f.c | (k << 4)]);
    return f;
  }
  removeFood(f, eater) {
    if (!this.food.delete(f.id)) return;
    if (f.k) this.pcount[f.k]--;
    const s = this.foodGrid.get(cellKey(Math.floor(f.x / CELL), Math.floor(f.y / CELL)));
    if (s) s.delete(f);
    this.ev.eat.push([f.id, eater || 0]);
  }
  rollPower() {
    let q = this.rand();
    for (const [k, share, max] of POWER) {
      let p = share * (this.mod === "gold" ? 2 : 1) * (k === PK.LENS && this.mod === "blackout" ? 3 : 1);
      if (q < p) return this.pcount[k] < max * (this.mod === "gold" ? 2 : 1) ? k : 0;
      q -= p;
    }
    return 0;
  }
  /** somewhere away from the rim and at least `gap` from every head */
  powerSpot(gap = 300, rim = 0.9) {
    for (let i = 0; i < 8; i++) {
      const r = this.worldR * rim * Math.sqrt(this.rand()), a = this.rand() * TAU;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      let ok = true;
      for (const s of this.snakes.values()) if ((s.x - x) ** 2 + (s.y - y) ** 2 < gap * gap) { ok = false; break; }
      if (ok) return [x, y];
    }
    return null;
  }

  /* ---------------- snakes ---------------- */
  pickName() {
    for (let i = 0; i < 40; i++) {
      const n = BOT_NAMES[(this.rand() * BOT_NAMES.length) | 0];
      if (!this.usedNames.has(n)) return n;
    }
    return "Bot " + ((this.rand() * 900 + 100) | 0);
  }
  spawnPoint() {
    let best = null, bestD = -1;
    for (let i = 0; i < 24; i++) {
      const r = this.worldR * 0.75 * Math.sqrt(this.rand()), a = this.rand() * TAU;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      let d = 1e9;
      for (const s of this.snakes.values()) {
        const p = s.pts;
        for (let j = p.length - 2; j >= 0; j -= 8) {
          const dx = p[j] - x, dy = p[j + 1] - y, dd = dx * dx + dy * dy;
          if (dd < d) d = dd;
        }
      }
      if (d > bestD) { bestD = d; best = [x, y, a + Math.PI + (this.rand() - 0.5)]; }
      if (d > 600 * 600) break;
    }
    return best;
  }
  createSnake(name, skin, bot, cos) {
    const [x, y, a] = this.spawnPoint();
    const n = this.skins;
    const s = {
      id: this.nextSnake++, name: String(name || "Player").slice(0, 16), skin: ((skin | 0) % n + n) % n,
      bot: !!bot, x, y, a, want: a, boost: false, m: START_MASS, peak: START_MASS, kills: 0,
      born: this.tick, pts: [], dropAcc: 0, ai: bot ? { skill: 0.35 + this.rand() * 0.6, think: 0, target: null, mode: "roam", boldness: this.rand() } : null
    };
    if (this.F) {
      Object.assign(s, {
        evo: 0, rolled: 0, cdUntil: 0, abUntil: 0, tellUntil: 0, surgeUntil: 0, wardUntil: 0, lensUntil: 0, key: 0,
        protUntil: this.tick + T.PROTECT, slowUntil: 0, portCd: 0, dwell: 0, tp: null, venom: [], venomAcc: 0, pN: 0, pLast: -99,
        cos: Array.isArray(cos) ? cos.slice(0, 3).map((v) => Math.max(0, Math.min(15, v | 0))) : [0, 0, 0]
      });
    }
    // lay the initial body out behind the head
    const L = lengthFor(s.m), step = BASE_SPEED * DT;
    for (let d = L; d >= 0; d -= step) s.pts.push(x - Math.cos(a) * d, y - Math.sin(a) * d);
    this.snakes.set(s.id, s);
    this.usedNames.add(s.name);
    this.ev.add.push(this.describe(s));
    return s;
  }
  meta(s) {
    const d = { id: s.id, name: s.name, skin: s.skin, bot: s.bot };
    if (this.F) { d.evo = s.evo; d.cos = s.cos; }
    return d;
  }
  describe(s) {
    const d = this.meta(s);
    d.m = Math.round(s.m); d.a = +s.a.toFixed(3); d.pts = s.pts.map(r1);
    return d;
  }
  addBot() { return this.createSnake(this.pickName(), (this.rand() * SKINS) | 0, true); }
  addPlayer(name, skin, cos) {
    // make room: retire a bot if the arena is crowded
    if (this.snakes.size >= this.maxSnakes) {
      for (const s of this.snakes.values()) if (s.bot) { this.kill(s, 0, "retired", false); break; }
    }
    return this.createSnake(name, skin, false, cos).id;
  }
  removePlayer(id) {
    const s = this.snakes.get(id);
    if (s) this.kill(s, 0, "left", true);
  }
  setInput(id, angle, boost) {
    const s = this.snakes.get(id);
    if (!s || s.bot) return;
    if (Number.isFinite(angle)) s.want = angle;
    s.boost = !!boost;
  }
  humans() { let n = 0; for (const s of this.snakes.values()) if (!s.bot) n++; return n; }

  kill(s, killerId, cause, drop = true) {
    if (!this.snakes.has(s.id)) return;
    let leader = false;
    if (this.F && drop && killerId && s.m >= 100) {
      leader = true;
      for (const o of this.snakes.values()) if (o.m > s.m) { leader = false; break; }
    }
    this.snakes.delete(s.id);
    this.usedNames.delete(s.name);
    if (drop) {
      // scatter the body as food, worth ~70% of the snake's mass
      const p = s.pts, n = p.length / 2;
      let budget = Math.max(6, s.m * 0.7);
      const stride = Math.max(1, Math.floor(n / Math.min(120, Math.ceil(budget / 2))));
      for (let i = n - 1; i >= 0 && budget > 0; i -= stride) {
        const v = Math.min(10, Math.max(1, Math.round(budget / Math.ceil(i / stride + 1))));
        const r = radiusFor(s.m);
        this.spawnFood(p[i * 2] + (this.rand() - 0.5) * r * 1.6, p[i * 2 + 1] + (this.rand() - 0.5) * r * 1.6, v, s.skin % 8, TICK_HZ * 50);
        budget -= v;
      }
      if (leader) this.spawnFood(s.x, s.y, 25, 2, TICK_HZ * 60, PK.BOUNTY);
    }
    const killer = killerId ? this.snakes.get(killerId) : null;
    if (killer) killer.kills++;
    const d = [s.id, killerId || 0, cause, Math.round(s.peak), s.kills, this.tick - s.born];
    if (this.F) d.push(leader ? 1 : 0, s.evo || 0);
    this.ev.del.push(d);
  }

  /* ---------------- evolutions and abilities ---------------- */
  evolve(s) {
    const count = [0, 0, 0, 0, 0, 0, 0, 0];
    for (const o of this.snakes.values()) if (o.evo) count[o.evo]++;
    const low = Math.min(...count.slice(1));
    const pool = [];
    for (let t = 1; t <= 7; t++) if (count[t] === low) pool.push(t);
    s.evo = pool[(this.rand() * pool.length) | 0];
    s.cdUntil = this.tick + 40;
    this.ev.x.push(["evo", s.id, s.evo]);
  }
  checkMilestones(s) {
    while (s.rolled < MILESTONES.length && s.peak >= MILESTONES[s.rolled]) {
      s.rolled++;
      if (s.evo || this.evolvedCount() >= EVO_CAP) continue;
      const chance = 0.08 * (this.mod === "venom" ? 3 : 1) * (s.bot ? 0.5 : 1);
      if (this.rand() < chance) this.evolve(s);
    }
  }
  useAbility(id) {
    const s = typeof id === "object" ? id : this.snakes.get(id);
    if (!this.F || !s || !EVO_ACTIVE[s.evo] || this.tick < s.cdUntil || s.tp) return false;
    const t = this.tick;
    if (s.evo === EVO.EEL) {
      s.tellUntil = t + T.EEL_TELL; s.abUntil = t + T.EEL_TELL + T.EEL_PHASE; s.cdUntil = t + T.EEL_CD;
    } else if (s.evo === EVO.COMET) {
      if (s.m < 30) return false;
      s.m -= s.m * 0.06; s.abUntil = t + T.COMET_DASH; s.cdUntil = t + T.COMET_CD;
    } else if (s.evo === EVO.SPLIT) {
      if (s.m < 40) return false;
      // walk from the tail until 15% of the body length is covered
      const L = lengthFor(s.m) * 0.15, p = s.pts;
      let acc = 0, j = 2;
      for (; j < p.length - 2 && acc < L; j += 2) acc += Math.hypot(p[j] - p[j - 2], p[j + 1] - p[j - 1]);
      const pts = p.slice(0, j);
      if (pts.length < 6) return false;
      const shed = s.m * 0.15;
      s.m -= shed;
      p.splice(0, j - 2);
      const d = { id: this.nextDecoy++, owner: s.id, skin: s.skin, r: radiusFor(s.m), m: shed, pts, exp: t + T.SPLIT_LIFE };
      this.decoys.set(d.id, d);
      s.cdUntil = t + T.SPLIT_CD;
      this.ev.x.push(["dec", d.id, s.id, s.skin, r1(d.r), pts.map(r1)]);
    }
    this.ev.x.push(["ab", s.id, s.evo]);
    return true;
  }
  updateDecoys() {
    for (const d of this.decoys.values()) {
      if (d.exp > this.tick) continue;
      this.decoys.delete(d.id);
      let budget = d.m * 0.5;
      const n = d.pts.length / 2, stride = Math.max(1, Math.floor(n / Math.max(1, Math.ceil(budget / 2))));
      for (let i = 0; i < n && budget > 0; i += stride) {
        const v = Math.max(1, Math.min(6, Math.round(budget / Math.max(1, (n - i) / stride))));
        this.spawnFood(d.pts[i * 2], d.pts[i * 2 + 1], v, d.skin % 8, TICK_HZ * 40);
        budget -= v;
      }
      this.ev.x.push(["decx", d.id]);
    }
  }

  /* ---------------- portals ---------------- */
  portalTarget() { return this.mod === "rift" ? 6 : 2 + (this.tick % 2400 < 1200 ? 1 : 0); }
  updatePortals() {
    for (const p of this.portals.values()) {
      if (p.exp <= this.tick || p.uses <= 0) {
        this.portals.delete(p.id);
        this.ev.x.push(["pox", p.id]);
        this.portalNext = Math.max(this.portalNext, this.tick + 200 + ((this.rand() * 200) | 0));
      }
    }
    if (this.portals.size < this.portalTarget() && this.tick >= this.portalNext) {
      for (let i = 0; i < 10; i++) {
        const at = this.powerSpot(300, 0.82);
        if (!at) continue;
        let ok = true;
        for (const o of this.portals.values()) if ((o.x - at[0]) ** 2 + (o.y - at[1]) ** 2 < 900 * 900) { ok = false; break; }
        if (!ok) continue;
        const p = { id: this.nextPortal++, x: Math.round(at[0]), y: Math.round(at[1]), uses: T.PORTAL_USES, exp: this.tick + T.PORTAL_LIFE };
        this.portals.set(p.id, p);
        this.ev.x.push(["po", p.id, p.x, p.y, p.uses, p.exp]);
        break;
      }
      this.portalNext = this.tick + (this.mod === "rift" ? 20 : 60);
    }
  }
  enclosed(s) {
    let hits = 0;
    const r = this.rad(s);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU, ca = Math.cos(a), sa = Math.sin(a);
      let hit = false;
      for (let d = 50; d <= 400 && !hit; d += 50) {
        const x = s.x + ca * d, y = s.y + sa * d;
        if (Math.hypot(x, y) > this.worldR) { hit = true; break; }
        this.nearBodies(x, y, 40, (px, py, pr, sid) => {
          if (sid === s.id) return true;
          if ((px - x) ** 2 + (py - y) ** 2 < (pr + r) ** 2) { hit = true; return false; }
          return true;
        });
      }
      if (hit) hits++;
    }
    return hits >= 6;
  }
  landing(s) {
    const L = lengthFor(s.m), reach = this.worldR - (L / 2 + 300);
    if (reach < 150) return null;
    for (let i = 0; i < 24; i++) {
      const r = reach * Math.sqrt(this.rand()), a = this.rand() * TAU;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      let ok = true;
      for (const o of this.snakes.values()) if (o !== s && (o.x - x) ** 2 + (o.y - y) ** 2 < 700 * 700) { ok = false; break; }
      if (!ok) continue;
      for (const p of this.portals.values()) if ((p.x - x) ** 2 + (p.y - y) ** 2 < 400 * 400) { ok = false; break; }
      if (!ok) continue;
      this.nearBodies(x, y, CELL * 1.5, (px, py, pr, sid) => { if (sid !== s.id) { ok = false; return false; } return true; });
      if (ok) return [x, y];
    }
    return null;
  }
  updatePortalUse(s, boosting) {
    const t = this.tick;
    if (s.tp) {
      if (t >= s.tp.at) {
        const dx = s.tp.x - s.x, dy = s.tp.y - s.y, p = s.pts;
        for (let i = 0; i < p.length; i += 2) { p[i] += dx; p[i + 1] += dy; }
        s.x += dx; s.y += dy; s.tp = null; s.protUntil = t + T.PROTECT;
        this.ev.x.push(["tp", s.id, Math.round(dx), Math.round(dy)]);
      }
      return;
    }
    if (s.bot || t < s.portCd || boosting || this.phased(s) || (s.evo === EVO.COMET && t < s.abUntil)) { s.dwell = 0; return; }
    let portal = null;
    for (const p of this.portals.values()) if ((p.x - s.x) ** 2 + (p.y - s.y) ** 2 < T.PORTAL_R * T.PORTAL_R) { portal = p; break; }
    if (!portal) { s.dwell = 0; return; }
    if (++s.dwell < T.DWELL) return;
    s.dwell = 0;
    if (this.enclosed(s)) { s.portCd = t + 40; this.ev.x.push(["pr", s.id]); return; }
    const dest = this.landing(s);
    if (!dest) { s.portCd = t + 20; this.ev.x.push(["pz", portal.id, s.id]); return; }
    if (s.key) s.key = 0;
    else if (this.mod !== "rift") s.m = Math.max(START_MASS, s.m - Math.max(5, s.m * 0.05) * (s.evo === EVO.CONSTRICTOR ? 1.5 : 1));
    portal.uses--;
    s.portCd = t + (this.mod === "rift" ? 200 : T.PORTAL_CD);
    s.tp = { at: t + T.FLARE, x: dest[0], y: dest[1] };
    this.ev.x.push(["pf", s.id, Math.round(dest[0]), Math.round(dest[1]), portal.id, portal.uses]);
  }

  /* ---------------- spatial index of bodies (rebuilt each tick) ---------------- */
  buildBodyGrid() {
    const g = new Map();
    const put = (x, y, r, id) => {
      const k = cellKey(Math.floor(x / CELL), Math.floor(y / CELL));
      let a = g.get(k);
      if (!a) g.set(k, (a = []));
      a.push(x, y, r, id);
    };
    for (const s of this.snakes.values()) {
      if (this.ghost(s)) continue;
      const p = s.pts, r = this.F ? this.rad(s) : radiusFor(s.m);
      for (let i = 0; i < p.length; i += 2) put(p[i], p[i + 1], r, s.id);
    }
    for (const d of this.decoys.values()) for (let i = 0; i < d.pts.length; i += 2) put(d.pts[i], d.pts[i + 1], d.r, -d.id);
    this.bodyGrid = g;
  }
  /** visit body points near (x,y) within radius rad. cb(px,py,pr,sid) — decoys have negative ids */
  nearBodies(x, y, rad, cb) {
    const c0 = Math.floor((x - rad) / CELL), c1 = Math.floor((x + rad) / CELL);
    const r0 = Math.floor((y - rad) / CELL), r1 = Math.floor((y + rad) / CELL);
    for (let cx = c0; cx <= c1; cx++) for (let cy = r0; cy <= r1; cy++) {
      const a = this.bodyGrid.get(cellKey(cx, cy));
      if (!a) continue;
      for (let i = 0; i < a.length; i += 4) if (cb(a[i], a[i + 1], a[i + 2], a[i + 3]) === false) return;
    }
  }

  /* ---------------- bots ---------------- */
  clearance(s, ang, dist) {
    // how far can we travel along ang before something solid? (0..dist)
    const r = radiusFor(s.m);
    const steps = 6;
    for (let i = 1; i <= steps; i++) {
      const d = (dist * i) / steps;
      const x = s.x + Math.cos(ang) * d, y = s.y + Math.sin(ang) * d;
      if (Math.hypot(x, y) > this.worldR - r - 20) return d - dist / steps;
      let hit = false;
      this.nearBodies(x, y, r + 40, (px, py, pr, sid) => {
        if (sid === s.id) return true;
        const dx = px - x, dy = py - y;
        if (dx * dx + dy * dy < (pr + r + 12) * (pr + r + 12)) { hit = true; return false; }
        return true;
      });
      if (hit) return d - dist / steps;
    }
    return dist;
  }
  thinkBot(s) {
    const ai = s.ai;
    if (--ai.think > 0) return;
    ai.think = 2 + ((1 - ai.skill) * 4) | 0;
    const r = radiusFor(s.m);
    const look = 120 + r * 5 + ai.skill * 140;

    // 1) pick a goal direction
    let goal = s.want;
    let boost = false;
    // hunting: cut in front of a smaller nearby snake
    let prey = null, preyD = 1e9;
    if (s.m > 40 && ai.boldness > 0.35) {
      for (const o of this.snakes.values()) {
        if (o === s || o.m > s.m * 0.9) continue;
        const d = Math.hypot(o.x - s.x, o.y - s.y);
        if (d < 380 && d < preyD) { prey = o; preyD = d; }
      }
    }
    if (prey) {
      const lead = 60 + preyD * 0.5;
      const tx = prey.x + Math.cos(prey.a) * lead, ty = prey.y + Math.sin(prey.a) * lead;
      goal = Math.atan2(ty - s.y, tx - s.x);
      boost = s.m > 30 && preyD < 260 && ai.skill > 0.5;
      ai.mode = "hunt";
    } else {
      // best food within reach, value/distance scoring on a few nearby cells
      let best = null, bestScore = 0;
      const rad = 420;
      const c0 = Math.floor((s.x - rad) / CELL), c1 = Math.floor((s.x + rad) / CELL);
      const r0 = Math.floor((s.y - rad) / CELL), r1 = Math.floor((s.y + rad) / CELL);
      for (let cx = c0; cx <= c1; cx++) for (let cy = r0; cy <= r1; cy++) {
        const set = this.foodGrid.get(cellKey(cx, cy));
        if (!set) continue;
        for (const f of set) {
          if (f.k === PK.EVO) continue; // the Evolution Pellet is a player story
          const dx = f.x - s.x, dy = f.y - s.y, d = Math.sqrt(dx * dx + dy * dy) + 30;
          const facing = Math.cos(angDiff(s.a, Math.atan2(dy, dx)));
          const sc = (f.v * (1.4 + facing)) / d;
          if (sc > bestScore) { bestScore = sc; best = f; }
        }
      }
      if (best) {
        goal = Math.atan2(best.y - s.y, best.x - s.x);
        boost = best.v >= 8 && s.m > 25 && ai.skill > 0.55;
        ai.mode = "feed";
      } else {
        // drift toward the middle-ish
        if (this.rand() < 0.08) ai.wander = (this.rand() - 0.5) * 2;
        goal = Math.atan2(-s.y, -s.x) + (ai.wander || 0);
        ai.mode = "roam";
      }
    }

    // 2) avoid danger: sample fan of headings, prefer clear + close to goal
    const fan = [0, -0.35, 0.35, -0.7, 0.7, -1.1, 1.1, -1.6, 1.6, -2.2, 2.2];
    const straight = this.clearance(s, s.a, look);
    if (straight < look * 0.98 || Math.abs(angDiff(s.a, goal)) > 0.2) {
      let bestA = goal, bestV = -1e9;
      for (const off of fan) {
        const a = s.a + off;
        const c = this.clearance(s, a, look);
        const v = c / look * 3 - Math.abs(angDiff(a, goal)) * 0.55 * (c >= look * 0.98 ? 1 : 0.4);
        if (v > bestV) { bestV = v; bestA = a; }
      }
      // slower bots react late
      if (this.rand() < 0.25 + ai.skill * 0.75) goal = bestA;
      if (straight < look * 0.4 && s.m > 30 && ai.skill > 0.6) boost = this.rand() < 0.5;
    }
    s.want = goal;
    s.boost = boost;

    // 3) evolved bots use their ability at readable moments
    if (this.F && EVO_ACTIVE[s.evo] && this.tick >= s.cdUntil) {
      if (s.evo === EVO.COMET && prey && preyD < 240 && Math.abs(angDiff(s.a, goal)) < 0.25) this.useAbility(s);
      else if (s.evo === EVO.EEL && straight < look * 0.3 && this.rand() < 0.5) this.useAbility(s);
      else if (s.evo === EVO.SPLIT && straight < look * 0.35 && s.m > 80 && this.rand() < 0.3) this.useAbility(s);
    }
  }

  /* ---------------- step ---------------- */
  step() {
    // events raised between ticks (joins, leaves) are already in this.ev
    this.tick++;
    this.ev.tick = this.tick;
    const F = this.F, t = this.tick;
    if (F && !this.fixedMod && t % 1200 === 0) {
      const m = modifierFor();
      if (m !== this.mod) { this.mod = m; this.ev.x.push(["mod", m]); }
    }
    this.buildBodyGrid();

    for (const s of this.snakes.values()) if (s.bot) this.thinkBot(s);

    // movement
    for (const s of this.snakes.values()) {
      const surge = F && s.surgeUntil > t;
      const dashing = F && s.evo === EVO.COMET && s.abUntil > t;
      const boosting = (s.boost && (surge || s.m > START_MASS + 2)) || dashing;
      let turn = turnFor(s.m) * DT * (boosting ? 0.8 : 1);
      if (F) turn *= (s.evo === EVO.CONSTRICTOR ? 0.8 : 1) * (dashing ? 0.25 : 1);
      const d = angDiff(s.a, s.want);
      s.a += Math.max(-turn, Math.min(turn, d));
      if (s.a > Math.PI) s.a -= TAU; else if (s.a < -Math.PI) s.a += TAU;
      let sp = dashing ? BOOST_SPEED * 2.2 : boosting ? BOOST_SPEED : BASE_SPEED;
      if (F && s.slowUntil > t) sp *= 0.7;
      s.x += Math.cos(s.a) * sp * DT;
      s.y += Math.sin(s.a) * sp * DT;
      s.boosting = boosting;
      if (boosting && !surge && !dashing) {
        let loss = Math.max(2.2, s.m * 0.012) * DT * 2.2;
        if (F) loss *= (s.evo === EVO.VIPER ? 1.25 : s.evo === EVO.CONSTRICTOR ? 1.3 : 1) * (this.mod === "feather" ? 0.5 : 1);
        s.m -= loss;
        s.dropAcc += loss;
        if (s.dropAcc >= 2) {
          s.dropAcc -= 2;
          this.spawnFood(s.pts[0] + (this.rand() - 0.5) * 8, s.pts[1] + (this.rand() - 0.5) * 8, 1, s.skin % 8, TICK_HZ * 40);
        }
      }
      if (F && s.evo === EVO.VIPER) {
        if (boosting && ++s.venomAcc >= T.VENOM_EVERY) { s.venomAcc = 0; s.venom.push([s.pts[s.pts.length - 2], s.pts[s.pts.length - 1], t + T.VENOM_LIFE]); }
        while (s.venom.length && s.venom[0][2] <= t) s.venom.shift();
      }
      // grow the trail and trim to length
      s.pts.push(s.x, s.y);
      const L = lengthFor(s.m);
      let acc = 0, cut = 0;
      for (let i = s.pts.length - 2; i >= 2; i -= 2) {
        acc += Math.hypot(s.pts[i] - s.pts[i - 2], s.pts[i + 1] - s.pts[i - 1]);
        if (acc > L) { cut = i - 2; break; }
      }
      if (cut > 0) s.pts.splice(0, cut);
      if (F) this.updatePortalUse(s, boosting);
    }

    // eating
    for (const s of this.snakes.values()) {
      if (F && this.phased(s)) continue;
      const r = radiusFor(s.m), reach = r + 26;
      const pull = F && s.evo === EVO.MAGNET ? 2.5 : 1, scan = reach * pull + 10;
      const c0 = Math.floor((s.x - scan) / CELL), c1 = Math.floor((s.x + scan) / CELL);
      const r0 = Math.floor((s.y - scan) / CELL), r1 = Math.floor((s.y + scan) / CELL);
      for (let cx = c0; cx <= c1; cx++) for (let cy = r0; cy <= r1; cy++) {
        const set = this.foodGrid.get(cellKey(cx, cy));
        if (!set) continue;
        for (const f of set) {
          const dx = f.x - s.x, dy = f.y - s.y, rr = reach * (f.k ? 1 : pull) + f.v * 0.8;
          if (dx * dx + dy * dy < rr * rr) {
            if (f.k && !this.eatPower(s, f)) continue;
            if (!f.k || f.k === PK.SURGE || f.k === PK.BOUNTY) s.m += f.v * 0.9;
            if (s.m > s.peak) s.peak = s.m;
            this.removeFood(f, s.id);
          }
        }
      }
      if (F) this.checkMilestones(s);
    }

    if (F) {
      // venom: a head touching a Viper's fresh trail is slowed and drained, 8 mass at most per contact
      for (const v of this.snakes.values()) {
        if (v.evo !== EVO.VIPER || !v.venom.length) continue;
        for (const s of this.snakes.values()) {
          if (s === v || this.phased(s) || s.protUntil > t) continue;
          const rr = radiusFor(s.m) + 12;
          for (const p of v.venom) {
            if ((p[0] - s.x) ** 2 + (p[1] - s.y) ** 2 < rr * rr) {
              if (t - s.pLast > 20) s.pN = 0;
              s.pLast = t; s.slowUntil = t + T.SLOW;
              if (t % 5 === 0 && s.pN < 8 && s.m > START_MASS + 1) { s.m -= 1; s.pN++; }
              break;
            }
          }
        }
      }
      this.updateDecoys();
    }

    // collisions (against the body grid built at the start of the tick, plus fresh heads)
    this.buildBodyGrid();
    const dead = [];
    for (const s of this.snakes.values()) {
      const r = radiusFor(s.m);
      if (F && s.protUntil > t) continue;
      if (Math.hypot(s.x, s.y) > this.worldR - r * 0.5) { dead.push([s, 0, "wall"]); continue; }
      if (F && this.phased(s)) continue;
      let killer = 0, hx = 0, hy = 0;
      this.nearBodies(s.x, s.y, r + 60, (px, py, pr, sid) => {
        if (sid === s.id) return true;
        const dx = px - s.x, dy = py - s.y, rr = pr + r * 0.72;
        if (dx * dx + dy * dy < rr * rr) { killer = sid; hx = px; hy = py; return false; }
        return true;
      });
      if (!killer) continue;
      if (F && s.wardUntil > t) {
        // the Ward turns a fatal touch into a bounce
        s.wardUntil = 0;
        s.a = Math.atan2(s.y - hy, s.x - hx); s.want = s.a;
        s.protUntil = t + T.BOUNCE;
        this.ev.x.push(["ward", s.id]);
        continue;
      }
      if (killer < 0) dead.push([s, 0, "decoy"]);
      else dead.push([s, killer, "cut"]);
    }
    // head-on: when two heads die into each other, the bigger one survives
    const deadIds = new Set(dead.map((d) => d[0].id));
    for (const [s, killer, cause] of dead) {
      if (cause === "cut" && deadIds.has(killer)) {
        const o = this.snakes.get(killer);
        if (o && Math.hypot(o.x - s.x, o.y - s.y) < radiusFor(o.m) + radiusFor(s.m) && o.m < s.m) continue;
      }
      this.kill(s, killer, cause, true);
    }

    // food upkeep: expire old drops, top up the field
    if (this.tick % 10 === 0) {
      for (const f of this.food.values()) if (f.exp && f.exp < this.tick) this.removeFood(f, 0);
    }
    let need = this.foodTarget() - this.food.size;
    for (let i = 0; i < Math.min(need, 25); i++) this.spawnFood();

    if (F) {
      this.updatePortals();
      // the Evolution Pellet: one at a time, every 90-150 s (half that in Venom Season)
      if (t >= this.evoNext && !this.pcount[PK.EVO]) {
        const at = this.evolvedCount() < EVO_CAP ? this.powerSpot(400, 0.8) : null;
        if (at) {
          this.spawnFood(at[0], at[1], 1, 7, T.EVO_PELLET_LIFE, PK.EVO);
          const gap = 1800 + ((this.rand() * 1200) | 0);
          this.evoNext = t + (this.mod === "venom" ? gap / 2 : gap);
        } else this.evoNext = t + 200;
      }
    }

    // keep the arena lively
    if (this.tick % 20 === 0) {
      const humans = this.humans();
      const wantBots = Math.max(0, Math.min(this.botTarget, this.maxSnakes - humans) - (humans > 8 ? humans - 8 : 0));
      let bots = this.snakes.size - humans;
      if (bots < wantBots) this.addBot();
      else if (bots > wantBots + 1) {
        for (const s of this.snakes.values()) if (s.bot && s.m < 40) { this.kill(s, 0, "retired", false); break; }
      }
    }

    for (const s of this.snakes.values()) this.ev.heads.push([s.id, s.x, s.y, s.a, s.m, F ? this.flags(s) : s.boosting ? 1 : 0]);
    if (this.tick % 10 === 0) {
      this.ev.lb = [...this.snakes.values()].sort((a, b) => b.m - a.m).slice(0, 10).map((s) => [s.id, Math.round(s.m)]);
    }
    const out = this.ev;
    this.ev = this.blankEvents();
    return out;
  }
  eatPower(s, f) {
    const t = this.tick;
    switch (f.k) {
      case PK.SURGE: s.surgeUntil = t + T.SURGE; break;
      case PK.WARD: s.wardUntil = t + T.WARD; break;
      case PK.LENS: s.lensUntil = t + T.LENS; break;
      case PK.KEY: if (s.key) return false; s.key = 1; break;
      case PK.EVO:
        if (s.bot) return false;
        if (s.evo || this.evolvedCount() >= EVO_CAP) s.m += 40; else this.evolve(s);
        break;
    }
    this.ev.x.push(["pu", s.id, f.k]);
    return true;
  }
  /* bit0 boost · bit1 ward · bit2 ability active · bit3 surge · bits4-6 evolution · bit7 arrival protection */
  flags(s) {
    const t = this.tick;
    return (s.boosting ? 1 : 0) | (s.wardUntil > t ? 2 : 0) | (this.phased(s) || (s.evo === EVO.COMET && s.abUntil > t) ? 4 : 0) |
      (s.surgeUntil > t ? 8 : 0) | ((s.evo & 7) << 4) | (s.protUntil > t ? 128 : 0);
  }
  /** what only the owner needs: power-up timers, key, ability cooldown, portal cooldown (absolute ticks) */
  status(s) { return [s.surgeUntil, s.wardUntil, s.lensUntil, s.key, s.cdUntil, s.slowUntil, s.portCd, s.evo]; }

  snapshot(lite) {
    const out = {
      tick: this.tick, worldR: this.worldR,
      snakes: [...this.snakes.values()].map((s) => (lite ? this.meta(s) : this.describe(s))),
      food: [...this.food.values()].map((f) => [f.id, f.x, f.y, f.v, f.c | (f.k << 4)])
    };
    if (this.F) {
      out.v = 2; out.mod = this.mod;
      out.portals = [...this.portals.values()].map((p) => [p.id, p.x, p.y, p.uses, p.exp]);
      out.decoys = [...this.decoys.values()].map((d) => [d.id, d.owner, d.skin, r1(d.r), d.pts.map(r1), d.exp]);
    }
    return out;
  }
}
