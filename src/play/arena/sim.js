/* Glowline Arena — authoritative simulation.
 * Shared by the multiplayer server (Cloudflare Durable Object) and the in-browser
 * offline mode, so bots and rules behave identically in both.
 * Pure ES module: no DOM, no timers. Call step() at TICK_HZ.
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

export class Sim {
  constructor(opts = {}) {
    this.rand = mulberry32(opts.seed || (Date.now() & 0xffffffff));
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
    this.ev = this.blankEvents();
    for (let i = 0; i < this.foodTarget(); i++) this.spawnFood();
    this.ev = this.blankEvents();
    for (let i = 0; i < this.botTarget; i++) this.addBot();
    this.ev = this.blankEvents();
  }

  blankEvents() { return { tick: this.tick, heads: [], eat: [], food: [], add: [], del: [], lb: null }; }
  foodTarget() { return Math.round(this.worldR * this.worldR * 0.000145) + this.snakes.size * 12; }

  /* ---------------- food ---------------- */
  spawnFood(x, y, v, c, ttl) {
    if (x == null) {
      const r = this.worldR * 0.97 * Math.sqrt(this.rand()), a = this.rand() * TAU;
      x = Math.cos(a) * r; y = Math.sin(a) * r;
      const q = this.rand();
      v = q < 0.012 ? 12 : q < 0.2 ? 3 : q < 0.5 ? 2 : 1;
      c = (this.rand() * 8) | 0;
    }
    const f = { id: this.nextFood++, x: Math.round(x), y: Math.round(y), v, c, exp: ttl ? this.tick + ttl : 0 };
    this.food.set(f.id, f);
    const k = cellKey(Math.floor(f.x / CELL), Math.floor(f.y / CELL));
    let s = this.foodGrid.get(k);
    if (!s) this.foodGrid.set(k, (s = new Set()));
    s.add(f);
    this.ev.food.push([f.id, f.x, f.y, f.v, f.c]);
    return f;
  }
  removeFood(f, eater) {
    if (!this.food.delete(f.id)) return;
    const s = this.foodGrid.get(cellKey(Math.floor(f.x / CELL), Math.floor(f.y / CELL)));
    if (s) s.delete(f);
    this.ev.eat.push([f.id, eater || 0]);
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
  createSnake(name, skin, bot) {
    const [x, y, a] = this.spawnPoint();
    const s = {
      id: this.nextSnake++, name: String(name || "Player").slice(0, 16), skin: ((skin | 0) % SKINS + SKINS) % SKINS,
      bot: !!bot, x, y, a, want: a, boost: false, m: START_MASS, peak: START_MASS, kills: 0,
      born: this.tick, pts: [], dropAcc: 0, ai: bot ? { skill: 0.35 + this.rand() * 0.6, think: 0, target: null, mode: "roam", boldness: this.rand() } : null
    };
    // lay the initial body out behind the head
    const L = lengthFor(s.m), step = BASE_SPEED * DT;
    for (let d = L; d >= 0; d -= step) s.pts.push(x - Math.cos(a) * d, y - Math.sin(a) * d);
    this.snakes.set(s.id, s);
    this.usedNames.add(s.name);
    this.ev.add.push(this.describe(s));
    return s;
  }
  describe(s) {
    return { id: s.id, name: s.name, skin: s.skin, m: Math.round(s.m), bot: s.bot, a: +s.a.toFixed(3), pts: s.pts.map((v) => Math.round(v * 10) / 10) };
  }
  addBot() { return this.createSnake(this.pickName(), (this.rand() * SKINS) | 0, true); }
  addPlayer(name, skin) {
    // make room: retire a bot if the arena is crowded
    if (this.snakes.size >= this.maxSnakes) {
      for (const s of this.snakes.values()) if (s.bot) { this.kill(s, 0, "retired", false); break; }
    }
    return this.createSnake(name, skin, false).id;
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
    }
    const killer = killerId ? this.snakes.get(killerId) : null;
    if (killer) killer.kills++;
    this.ev.del.push([s.id, killerId || 0, cause, Math.round(s.peak), s.kills, this.tick - s.born]);
  }

  /* ---------------- spatial index of bodies (rebuilt each tick) ---------------- */
  buildBodyGrid() {
    const g = new Map();
    for (const s of this.snakes.values()) {
      const p = s.pts, r = radiusFor(s.m);
      for (let i = 0; i < p.length; i += 2) {
        const k = cellKey(Math.floor(p[i] / CELL), Math.floor(p[i + 1] / CELL));
        let a = g.get(k);
        if (!a) g.set(k, (a = []));
        a.push(p[i], p[i + 1], r, s.id);
      }
    }
    this.bodyGrid = g;
  }
  /** visit body points near (x,y) within radius rad. cb(px,py,pr,sid) */
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
  }

  /* ---------------- step ---------------- */
  step() {
    // events raised between ticks (joins, leaves) are already in this.ev
    this.tick++;
    this.ev.tick = this.tick;
    this.buildBodyGrid();

    for (const s of this.snakes.values()) if (s.bot) this.thinkBot(s);

    // movement
    for (const s of this.snakes.values()) {
      const boosting = s.boost && s.m > START_MASS + 2;
      const turn = turnFor(s.m) * DT * (boosting ? 0.8 : 1);
      const d = angDiff(s.a, s.want);
      s.a += Math.max(-turn, Math.min(turn, d));
      if (s.a > Math.PI) s.a -= TAU; else if (s.a < -Math.PI) s.a += TAU;
      const sp = boosting ? BOOST_SPEED : BASE_SPEED;
      s.x += Math.cos(s.a) * sp * DT;
      s.y += Math.sin(s.a) * sp * DT;
      s.boosting = boosting;
      if (boosting) {
        const loss = Math.max(2.2, s.m * 0.012) * DT * 2.2;
        s.m -= loss;
        s.dropAcc += loss;
        if (s.dropAcc >= 2) {
          s.dropAcc -= 2;
          const n = s.pts.length;
          this.spawnFood(s.pts[0] + (this.rand() - 0.5) * 8, s.pts[1] + (this.rand() - 0.5) * 8, 1, s.skin % 8, TICK_HZ * 40);
          void n;
        }
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
    }

    // eating
    for (const s of this.snakes.values()) {
      const r = radiusFor(s.m), reach = r + 26;
      const c0 = Math.floor((s.x - reach) / CELL), c1 = Math.floor((s.x + reach) / CELL);
      const r0 = Math.floor((s.y - reach) / CELL), r1 = Math.floor((s.y + reach) / CELL);
      for (let cx = c0; cx <= c1; cx++) for (let cy = r0; cy <= r1; cy++) {
        const set = this.foodGrid.get(cellKey(cx, cy));
        if (!set) continue;
        for (const f of set) {
          const dx = f.x - s.x, dy = f.y - s.y, rr = reach + f.v * 0.8;
          if (dx * dx + dy * dy < rr * rr) {
            s.m += f.v * 0.9;
            if (s.m > s.peak) s.peak = s.m;
            this.removeFood(f, s.id);
          }
        }
      }
    }

    // collisions (against the body grid built at the start of the tick, plus fresh heads)
    this.buildBodyGrid();
    const dead = [];
    for (const s of this.snakes.values()) {
      const r = radiusFor(s.m);
      if (Math.hypot(s.x, s.y) > this.worldR - r * 0.5) { dead.push([s, 0, "wall"]); continue; }
      let killer = 0;
      this.nearBodies(s.x, s.y, r + 60, (px, py, pr, sid) => {
        if (sid === s.id) return true;
        const dx = px - s.x, dy = py - s.y, rr = pr + r * 0.72;
        if (dx * dx + dy * dy < rr * rr) { killer = sid; return false; }
        return true;
      });
      if (killer) dead.push([s, killer, "cut"]);
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

    for (const s of this.snakes.values()) {
      this.ev.heads.push([s.id, s.x, s.y, s.a, s.m, s.boosting ? 1 : 0]);
    }
    if (this.tick % 10 === 0) {
      this.ev.lb = [...this.snakes.values()].sort((a, b) => b.m - a.m).slice(0, 10).map((s) => [s.id, Math.round(s.m)]);
    }
    const out = this.ev;
    this.ev = this.blankEvents();
    return out;
  }

  snapshot() {
    return {
      tick: this.tick, worldR: this.worldR,
      snakes: [...this.snakes.values()].map((s) => this.describe(s)),
      food: [...this.food.values()].map((f) => [f.id, f.x, f.y, f.v, f.c])
    };
  }
}
