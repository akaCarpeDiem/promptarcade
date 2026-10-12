/* Glowline Arena room: owns one Sim and a set of connections.
 * Transport-agnostic — the Durable Object and the local test server both wrap their sockets as
 * { send(stringOrArrayBuffer), close(code, reason) } and forward messages to the returned handlers.
 */
import { Sim, TICK_HZ } from "./sim.js";
import { encodeFrame } from "./proto.js";

const MAX_HUMANS = 40;
const BLOCK = /(n[i1]gg|f[a@]gg?[o0]t|r[e3]t[a@]rd|k[i1]ke|sp[i1]c\b|ch[i1]nk|tr[a@]nn|wh[o0]re|c[u\*]nt|h[i1]tl[e3]r|n[a@]z[i1])/i;

export function cleanName(n) {
  n = String(n || "").replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 16);
  if (!n || BLOCK.test(n.replace(/[\s._-]/g, ""))) return "Player";
  return n;
}

export class Room {
  constructor(opts = {}) {
    this.opts = opts;
    this.sim = new Sim({ bots: opts.bots == null ? 14 : opts.bots, seed: opts.seed });
    this.conns = new Set();
    this.timer = null;
    this.idleTicks = 0;
  }
  humans() { let n = 0; for (const c of this.conns) if (c.snake) n++; return n; }

  connect(sock) {
    if (this.conns.size >= MAX_HUMANS + 10) {
      try { sock.send(JSON.stringify({ t: "full" })); sock.close(1013, "full"); } catch (e) {}
      return { message() {}, close() {} };
    }
    const c = { sock, snake: 0, msgs: 0, window: Date.now(), name: "Player", skin: 0 };
    this.conns.add(c);
    this.send(c, JSON.stringify({ t: "snap", snap: this.sim.snapshot(), online: this.conns.size, hz: TICK_HZ }));
    this.ensureTicking();
    return {
      message: (data) => this.onMessage(c, data),
      close: () => this.onClose(c)
    };
  }
  send(c, data) {
    try { c.sock.send(data); } catch (e) { this.onClose(c); }
  }
  onMessage(c, data) {
    const now = Date.now();
    if (now - c.window > 1000) { c.window = now; c.msgs = 0; }
    if (++c.msgs > 40) return; // flood guard
    let m;
    try { m = JSON.parse(typeof data === "string" ? data : new TextDecoder().decode(data)); } catch (e) { return; }
    if (!m || typeof m.t !== "string") return;
    if (m.t === "join") {
      if (c.snake && this.sim.snakes.has(c.snake)) return;
      if (this.humans() >= MAX_HUMANS) { this.send(c, JSON.stringify({ t: "full" })); return; }
      c.name = cleanName(m.name);
      c.skin = (m.skin | 0) >>> 0;
      c.snake = this.sim.addPlayer(c.name, c.skin);
      this.send(c, JSON.stringify({ t: "you", id: c.snake }));
    } else if (m.t === "in") {
      if (c.snake) this.sim.setInput(c.snake, +m.a, !!m.b);
    } else if (m.t === "ping") {
      this.send(c, JSON.stringify({ t: "pong", c: m.c }));
    } else if (m.t === "leave") {
      if (c.snake) { this.sim.removePlayer(c.snake); c.snake = 0; }
    }
  }
  onClose(c) {
    if (!this.conns.has(c)) return;
    this.conns.delete(c);
    if (c.snake) this.sim.removePlayer(c.snake);
    c.snake = 0;
  }
  ensureTicking() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), 1000 / TICK_HZ);
  }
  tick() {
    if (!this.conns.size) {
      // nobody watching: stop the clock so the room can sleep
      if (++this.idleTicks > TICK_HZ * 5) { clearInterval(this.timer); this.timer = null; this.idleTicks = 0; }
      return;
    }
    this.idleTicks = 0;
    const ev = this.sim.step();
    for (const d of ev.del) {
      for (const c of this.conns) if (c.snake === d[0]) c.snake = 0;
    }
    const frame = encodeFrame(ev);
    for (const c of this.conns) this.send(c, frame);
    if (this.sim.tick % (TICK_HZ * 2) === 0) {
      const info = JSON.stringify({ t: "info", online: this.humans(), watching: this.conns.size });
      for (const c of this.conns) this.send(c, info);
    }
  }
}
