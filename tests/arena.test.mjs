import { test } from "node:test";
import assert from "node:assert/strict";
import { Sim, lengthFor, radiusFor } from "../src/play/arena/sim.js";
import { encodeFrame, decodeFrame } from "../src/play/arena/proto.js";
import { Room, cleanName } from "../src/play/arena/room.js";

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
});
