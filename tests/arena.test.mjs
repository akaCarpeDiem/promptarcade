import { test } from "node:test";
import assert from "node:assert/strict";
import { Sim, lengthFor, radiusFor } from "../src/play/arena/sim.js";
import { encodeFrame, decodeFrame } from "../src/play/arena/proto.js";
import { Room, cleanName } from "../src/play/arena/room.js";
import { regexCheck } from "../functions/_shared/namemod.js";

test("bots play a long match without errors and keep the arena populated", () => {
  const s = new Sim({ bots: 16, seed: 7 });
  let deaths = 0;
  for (let i = 0; i < 3000; i++) { const ev = s.step(); deaths += ev.del.length; }
  assert.ok(s.snakes.size >= 12, "snakes " + s.snakes.size);
  assert.ok(deaths > 10, "bots should fight and die sometimes");
  assert.ok(s.food.size > 500);
  for (const sn of s.snakes.values()) assert.ok(Math.hypot(sn.x, sn.y) < s.worldR, "inside arena");
});

test("a joining player appears in the next frame and can leave", () => {
  const s = new Sim({ bots: 4, seed: 3 });
  s.step();
  const id = s.addPlayer("Ada", 2);
  let ev = s.step();
  assert.ok(ev.add.some((a) => a.id === id && a.name === "Ada"), "add event");
  assert.ok(ev.heads.some((h) => h[0] === id), "head");
  s.setInput(id, 1.2, true);
  s.removePlayer(id);
  ev = s.step();
  assert.ok(ev.del.some((d) => d[0] === id && d[2] === "left"));
});

test("eating grows a snake and length/radius scale with mass", () => {
  assert.ok(lengthFor(100) > lengthFor(10));
  assert.ok(radiusFor(900) > radiusFor(10));
  const s = new Sim({ bots: 0, seed: 1 });
  const id = s.addPlayer("Eater", 0);
  const sn = s.snakes.get(id);
  s.spawnFood(sn.x + Math.cos(sn.a) * 20, sn.y + Math.sin(sn.a) * 20, 10, 1);
  s.step();
  assert.ok(sn.m > 12, "mass " + sn.m);
});

test("binary frames round-trip", () => {
  const s = new Sim({ bots: 10, seed: 9 });
  for (let i = 0; i < 50; i++) {
    const ev = s.step();
    const back = decodeFrame(encodeFrame(ev));
    assert.equal(back.tick, ev.tick);
    assert.equal(back.heads.length, ev.heads.length);
    ev.heads.forEach((h, k) => { assert.equal(back.heads[k][0], h[0]); assert.ok(Math.abs(back.heads[k][1] - h[1]) < 0.01); assert.ok(Math.abs(back.heads[k][3] - h[3]) < 0.001); });
    assert.deepEqual(back.eat, ev.eat);
    assert.deepEqual(back.food, ev.food);
    assert.deepEqual(back.del, ev.del);
  }
});

test("room: snapshot on connect, you on join, frames to everyone, flood guard", async () => {
  const room = new Room({ bots: 3, seed: 5 });
  const got = [];
  const sock = { send: (d) => got.push(d), close() {} };
  const h = room.connect(sock);
  const snap = JSON.parse(got[0]);
  assert.equal(snap.t, "snap");
  assert.ok(snap.snap.snakes.length >= 3);
  h.message(JSON.stringify({ t: "join", name: "Grace", skin: 4 }));
  const you = got.map((d) => (typeof d === "string" ? JSON.parse(d) : null)).find((m) => m && m.t === "you");
  assert.ok(you && you.id > 0);
  room.tick();
  const frame = got.find((d) => typeof d !== "string");
  assert.ok(frame instanceof ArrayBuffer);
  assert.ok(decodeFrame(frame).add.some((a) => a.id === you.id));
  for (let i = 0; i < 100; i++) h.message(JSON.stringify({ t: "in", a: 0.5, b: false }));
  h.close();
  assert.equal(room.conns.size, 0);
  clearInterval(room.timer);
});

test("names are cleaned and slurs blocked", () => {
  assert.equal(cleanName("  Neo  "), "Neo");
  assert.equal(cleanName("<script>"), "script");
  assert.equal(cleanName("a".repeat(40)).length, 16);
  assert.equal(cleanName(""), "Player");
  assert.equal(cleanName("n1gger"), "Player");
  // With the server filter passed in (as the Worker does), the full name list applies too.
  const blocked = (n) => regexCheck(n).block;
  assert.equal(cleanName("Fuck3r", blocked), "Player");
  assert.equal(cleanName("xXpornXx", blocked), "Player");
  assert.equal(cleanName("Admin", blocked), "Player");
  assert.equal(cleanName("Hancock", blocked), "Hancock");
  assert.equal(cleanName("Neo", blocked), "Neo");
});

/* ---------------- 2026-10 upgrade (features on, v2 frames) ---------------- */
import { EVO, PK, T, EVO_CAP, modifierFor } from "../src/play/arena/sim.js";
import { viewFor, makeViewer, encodeFrame2, decodeFrame2, VIEW_R } from "../src/play/arena/proto.js";

const quiet = (opts = {}) => new Sim(Object.assign({ bots: 0, seed: 5, features: true, modifier: null }, opts));
function place(sim, s, x, y, a = 0) {
  const dx = x - s.x, dy = y - s.y;
  for (let i = 0; i < s.pts.length; i += 2) { s.pts[i] += dx; s.pts[i + 1] += dy; }
  s.x = x; s.y = y; s.a = s.want = a;
}

test("legacy rules are untouched: no upgrade events, flags only carry boost", () => {
  const s = new Sim({ bots: 12, seed: 4 });
  for (let i = 0; i < 1500; i++) {
    const ev = s.step();
    assert.equal(ev.x.length, 0);
    for (const h of ev.heads) assert.ok(h[5] === 0 || h[5] === 1);
    for (const f of ev.food) assert.ok(f[4] < 8, "no pellet kinds in legacy food");
  }
  assert.equal(s.portals.size, 0);
});

test("upgrade match runs long with bots, portals, power pellets and evolutions", () => {
  const s = new Sim({ bots: 16, seed: 21, features: true, modifier: "venom" });
  const seen = {};
  for (let i = 0; i < 6000; i++) for (const x of s.step().x) seen[x[0]] = (seen[x[0]] || 0) + 1;
  assert.ok(seen.po > 0 && seen.pu > 0, JSON.stringify(seen));
  assert.ok(s.evolvedCount() <= EVO_CAP);
  for (const sn of s.snakes.values()) assert.ok(Number.isFinite(sn.x) && Number.isFinite(sn.m) && sn.m >= 12 - 1e-9);
});

test("v2 frames: only nearby heads, every snake on the map, round-trips through binary", () => {
  const s = quiet();
  const me = s.addPlayer("Me", 0), far = s.addPlayer("Far", 1), near = s.addPlayer("Near", 2);
  place(s, s.snakes.get(me), 0, 0); place(s, s.snakes.get(near), 300, 0); place(s, s.snakes.get(far), 0, VIEW_R + 500);
  const vw = makeViewer();
  let got = null;
  for (let i = 0; i < 10; i++) got = viewFor(s, s.step(), vw, me);
  const ids = got.heads.map((h) => h[0]);
  assert.ok(ids.includes(me) && ids.includes(near) && !ids.includes(far));
  assert.ok(got.map && got.map.some((m) => m[0] === far), "far snake still on the minimap");
  const back = decodeFrame2(encodeFrame2(got));
  assert.equal(back.heads.length, got.heads.length);
  back.heads.forEach((h, k) => { assert.ok(Math.abs(h[1] - got.heads[k][1]) <= 0.07); assert.ok(Math.abs(h[4] - got.heads[k][4]) <= 0.26); assert.equal(h[5], got.heads[k][5]); });
  assert.deepEqual(back.map, got.map);
  // a snake that comes close arrives with its full body
  place(s, s.snakes.get(far), 0, 400);
  const v2 = viewFor(s, s.step(), vw, me);
  assert.ok(v2.enter.some((d) => d.id === far && d.pts.length > 4));
});

test("portals teleport you somewhere safe, cost mass, and refuse when you're circled", () => {
  const s = quiet();
  const id = s.addPlayer("Port", 0), sn = s.snakes.get(id);
  for (let k = 0; k < 6; k++) { const o = s.snakes.get(s.addPlayer("B" + k, 1)); place(s, o, -1500 + k * 600, 1500); }
  place(s, sn, 0, 0, 0); sn.m = 100; sn.protUntil = 0;
  s.portals.set(99, { id: 99, x: 40, y: 0, uses: 3, exp: 9999 });
  let pf = null, tp = null;
  for (let i = 0; i < 30 && !tp; i++) for (const x of s.step().x) { if (x[0] === "pf") pf = x; if (x[0] === "tp") tp = x; }
  assert.ok(pf && tp, "flare then teleport");
  assert.ok(sn.m < 100 && sn.m >= 94, "5% cost: " + sn.m);
  assert.ok(s.tick < sn.protUntil, "arrival protection");
  for (const o of s.snakes.values()) if (o !== sn) assert.ok(Math.hypot(o.x - sn.x, o.y - sn.y) > 650, "no head near the landing");
  // circled: a ring of body all around → refused, no cost
  const t = quiet(), me = t.snakes.get(t.addPlayer("Trapped", 0)), ring = t.snakes.get(t.addPlayer("Ring", 1));
  place(t, me, 0, 0); me.m = 50; me.protUntil = 0;
  ring.pts = []; for (let a = 0; a < Math.PI * 2; a += 0.05) ring.pts.push(Math.cos(a) * 220, Math.sin(a) * 220);
  ring.m = 2000; ring.x = ring.pts[ring.pts.length - 2]; ring.y = ring.pts[ring.pts.length - 1]; ring.protUntil = 0;
  t.portals.set(1, { id: 1, x: 0, y: 0, uses: 3, exp: 9999 });
  t.buildBodyGrid();
  assert.ok(t.enclosed(me));
});

test("a Ward turns a fatal touch into a bounce, once", () => {
  const s = quiet();
  const a = s.snakes.get(s.addPlayer("Warded", 0)), wall = s.snakes.get(s.addPlayer("Wall", 1));
  wall.pts = []; for (let y = -400; y <= 400; y += 8) wall.pts.push(60, y);
  wall.x = 60; wall.y = 400; wall.a = wall.want = Math.PI / 2; wall.protUntil = 0; wall.m = 400;
  place(s, a, 0, 0, 0); a.protUntil = 0; a.wardUntil = s.tick + T.WARD;
  let ward = false, died = false;
  for (let i = 0; i < 12; i++) { const ev = s.step(); if (ev.x.some((x) => x[0] === "ward")) ward = true; if (ev.del.some((d) => d[0] === a.id)) died = true; }
  assert.ok(ward && !died, "bounced");
  assert.equal(a.wardUntil, 0);
});

test("an Eel phases through bodies; a Constrictor is wider; evolutions cap at four", () => {
  const s = quiet();
  const eel = s.snakes.get(s.addPlayer("Eel", 0)), wall = s.snakes.get(s.addPlayer("Wall", 1));
  // the wall is reached mid-phase (after the 0.3 s tell), and cleared before the phase ends
  wall.pts = []; for (let y = -400; y <= 400; y += 8) wall.pts.push(160, y);
  wall.x = 160; wall.y = 400; wall.a = wall.want = Math.PI / 2; wall.protUntil = 0; wall.m = 400;
  place(s, eel, 0, 0, 0); eel.protUntil = 0; eel.evo = EVO.EEL; eel.m = 80;
  assert.ok(s.useAbility(eel.id));
  let died = false;
  for (let i = 0; i < 32; i++) if (s.step().del.some((d) => d[0] === eel.id)) died = true;
  assert.ok(!died && eel.x > 220, "passed through, now at x=" + eel.x);
  assert.ok(!s.useAbility(eel.id), "cooldown");
  const c = s.snakes.get(s.addPlayer("C", 2)); c.m = 400; const r0 = s.rad(c); c.evo = EVO.CONSTRICTOR;
  assert.ok(Math.abs(s.rad(c) / r0 - 1.35) < 1e-9);
  for (let i = 0; i < 6; i++) { const x = s.snakes.get(s.addPlayer("E" + i, 0)); if (s.evolvedCount() < EVO_CAP) s.evolve(x); }
  assert.equal(s.evolvedCount(), EVO_CAP);
  const e = s.snakes.get(s.addPlayer("Late", 0)); const m0 = e.m;
  s.spawnFood(e.x + Math.cos(e.a) * 15, e.y + Math.sin(e.a) * 15, 1, 7, 0, PK.EVO);
  s.step();
  assert.equal(e.evo, 0); assert.ok(e.m >= m0 + 39, "full room: +40 mass instead");
});

test("daily modifier follows the UTC weekday and Sunday is plain", () => {
  assert.equal(modifierFor(new Date(Date.UTC(2026, 9, 11))), null); // Sunday
  assert.equal(modifierFor(new Date(Date.UTC(2026, 9, 12))), "rift");
  assert.equal(modifierFor(new Date(Date.UTC(2026, 9, 16))), "gold");
});

test("room v2: per-player frames, ability and camera messages", () => {
  const room = new Room({ bots: 4, seed: 6, proto: 2, modifier: null });
  const got = [];
  const h = room.connect({ send: (d) => got.push(d), close() {} });
  const snap = JSON.parse(got[0]);
  assert.equal(snap.v, 2); assert.equal(snap.snap.v, 2);
  assert.ok(snap.snap.snakes.every((s) => !s.pts), "snapshot is metadata only");
  h.message(JSON.stringify({ t: "cam", x: 100, y: -50 }));
  h.message(JSON.stringify({ t: "join", name: "Kay", skin: 17, cos: [1, 2, 3] }));
  const you = got.map((d) => (typeof d === "string" ? JSON.parse(d) : null)).find((m) => m && m.t === "you");
  const sn = room.sim.snakes.get(you.id);
  assert.equal(sn.skin, 17); assert.deepEqual(sn.cos, [1, 2, 3]);
  sn.evo = EVO.COMET; sn.m = 100;
  h.message(JSON.stringify({ t: "ab" }));
  assert.ok(sn.abUntil > room.sim.tick);
  room.tick();
  const f = decodeFrame2(got.find((d) => typeof d !== "string"));
  assert.ok(f.enter.some((d) => d.id === you.id));
  assert.ok(f.me && f.me.length === 8);
  h.close(); clearInterval(room.timer);
});
