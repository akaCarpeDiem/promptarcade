import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { startLogin, verifyLogin, signOut, syncState, accountFor, mergeState, cleanEmail, CODE_ATTEMPTS } from "../functions/_shared/auth.js";
import { createPlayer, authPlayer, renamePlayer } from "../functions/_shared/players.js";

/* a tiny stand-in for Cloudflare D1 on top of node:sqlite (one database for the whole file,
 * because the shared modules create their tables once per process) */
class Stmt {
  constructor(db, sql) { this.db = db; this.sql = sql; this.args = []; }
  bind(...a) { this.args = a; return this; }
  async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; }
  async run() { return this._run(); }
  _run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; }
}
const sqlite = new DatabaseSync(":memory:");
sqlite.exec("CREATE TABLE scores (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT, name TEXT, score INTEGER, created_at INTEGER, ip_hash TEXT, player_id TEXT, hidden INTEGER DEFAULT 0)");
const DB = { prepare: (sql) => new Stmt(sqlite, sql), batch: async (list) => list.map((s) => s._run()) };
const env = { RESEND_API_KEY: "test", SCORE_SALT: "salt" };
const outbox = [];
const send = async (_env, m) => { outbox.push(m); return { ok: true }; };
const lastCode = (email) => outbox.filter((m) => m.email === email).pop().code;
let ip = 0;
const newPlayer = async (name) => createPlayer(env, DB, { name, ipHash: "ip" + ++ip });

test("emails are cleaned and checked", () => {
  assert.equal(cleanEmail("  Logan@Example.COM "), "logan@example.com");
  assert.equal(cleanEmail("nope"), "");
  assert.equal(cleanEmail("a@b"), "");
  assert.equal(cleanEmail("x<script>@evil.com"), "");
});

test("first sign-in turns this browser's player into the account and gives a device key", async () => {
  const p = await newPlayer("Logan");
  assert.ok(p.ok, JSON.stringify(p));
  sqlite.prepare("INSERT INTO scores (slug, name, score, player_id) VALUES ('glowline-arena', 'Logan', 500, ?)").run(p.playerId);
  const s = await startLogin(env, DB, { email: "logan@example.com", ipHash: "ipA", origin: "https://promptarcade.games" }, send);
  assert.ok(s.ok);
  assert.match(lastCode("logan@example.com"), /^\d{6}$/);
  const v = await verifyLogin(env, DB, { email: "LOGAN@example.com", code: lastCode("logan@example.com"), playerId: p.playerId, playerToken: p.playerToken, ipHash: "ipA" });
  assert.ok(v.ok, JSON.stringify(v));
  assert.equal(v.playerId, p.playerId);
  assert.equal(v.existing, false);
  assert.notEqual(v.playerToken, p.playerToken);
  assert.ok(await authPlayer(DB, v.playerId, v.playerToken), "device key works");
  assert.equal(await authPlayer(DB, p.playerId, p.playerToken), null, "old browser key retired");
  assert.equal(await accountFor(DB, p.playerId), "logan@example.com");
  // a used code can't be used twice
  const again = await verifyLogin(env, DB, { email: "logan@example.com", code: lastCode("logan@example.com"), ipHash: "ipA" });
  assert.equal(again.ok, false);
});

test("a second device signs in to the same player, its scores move over, renames work, sign-out forgets only that device", async () => {
  const phone = await newPlayer("PhoneGuy");
  sqlite.prepare("INSERT INTO scores (slug, name, score, player_id) VALUES ('block-bloom', 'PhoneGuy', 900, ?)").run(phone.playerId);
  await startLogin(env, DB, { email: "logan@example.com", ipHash: "ipB" }, send);
  const v = await verifyLogin(env, DB, { email: "logan@example.com", code: lastCode("logan@example.com"), playerId: phone.playerId, playerToken: phone.playerToken, ipHash: "ipB" });
  assert.ok(v.ok && v.existing && v.merged);
  assert.equal(v.name, "Logan");
  const acct = sqlite.prepare("SELECT player_id FROM accounts WHERE email = 'logan@example.com'").get().player_id;
  assert.equal(v.playerId, acct);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM scores WHERE player_id = ?").get(acct).n, 2, "phone score joined the account");
  const r = await renamePlayer(env, DB, { id: v.playerId, token: v.playerToken, name: "Carpe", ipHash: "ipB" });
  assert.ok(r.ok, JSON.stringify(r));
  await signOut(DB, v.playerId, v.playerToken);
  assert.equal(await authPlayer(DB, v.playerId, v.playerToken), null);
});

test("wrong codes count down, then the code is dead", async () => {
  await startLogin(env, DB, { email: "guess@example.com", ipHash: "ipC" }, send);
  const real = lastCode("guess@example.com");
  const wrong = real === "000000" ? "111111" : "000000";
  for (let i = 0; i < CODE_ATTEMPTS; i++) {
    const v = await verifyLogin(env, DB, { email: "guess@example.com", code: wrong, ipHash: "ipC" });
    assert.equal(v.ok, false);
  }
  const late = await verifyLogin(env, DB, { email: "guess@example.com", code: real, ipHash: "ipC" });
  assert.equal(late.ok, false, "locked after too many tries");
});

test("signing in with no player on this browser creates one", async () => {
  await startLogin(env, DB, { email: "fresh@example.com", ipHash: "ipD" }, send);
  const v = await verifyLogin(env, DB, { email: "fresh@example.com", code: lastCode("fresh@example.com"), name: "Newbie", ipHash: "ipD" });
  assert.ok(v.ok && v.created);
  assert.equal(v.name, "Newbie");
});

test("codes are rate limited per email, and sign-in is off without a Resend key", async () => {
  let last;
  for (let i = 0; i < 7; i++) last = await startLogin(env, DB, { email: "spam@example.com", ipHash: "ip" + i }, send);
  assert.equal(last.status, 429);
  const off = await startLogin({}, DB, { email: "x@example.com", ipHash: "z" }, send);
  assert.equal(off.status, 503);
});

test("progress merges so two devices never overwrite each other", async () => {
  const laptop = {
    pa_pass_v1: { xp: 900, runs: 30, plays: { "glowline-arena": 20 }, best: { "glowline-arena": 640 }, badges: { "first-run": 100 }, days: { last: 20740, streak: 3, best: 5 }, recent: [{ g: "glowline-arena", s: 640, t: 1 }], first: 50 },
    ga_xp: 1200, pa_scores_neon: [{ name: "L", score: 10, at: 1 }], evil_key: "x"
  };
  const phone = {
    pa_pass_v1: { xp: 400, runs: 50, plays: { "block-bloom": 9, "glowline-arena": 3 }, best: { "block-bloom": 2100 }, badges: { "bloom-2000": 200 }, days: { last: 20741, streak: 1, best: 2 }, recent: [{ g: "block-bloom", s: 2100, t: 2 }], first: 10 },
    ga_xp: 300, pa_scores_neon: [{ name: "L", score: 30, at: 2 }]
  };
  const m = mergeState(mergeState({}, laptop), phone);
  assert.equal(m.evil_key, undefined, "only progress keys sync");
  assert.equal(m.pa_pass_v1.xp, 900); assert.equal(m.pa_pass_v1.runs, 50);
  assert.deepEqual(m.pa_pass_v1.plays, { "glowline-arena": 20, "block-bloom": 9 });
  assert.deepEqual(Object.keys(m.pa_pass_v1.badges).sort(), ["bloom-2000", "first-run"]);
  assert.equal(m.pa_pass_v1.first, 10);
  assert.equal(m.ga_xp, 1200);
  assert.deepEqual(m.pa_scores_neon.map((r) => r.score), [30, 10]);
  // stored through the endpoint helper too
  const acct = sqlite.prepare("SELECT player_id FROM accounts WHERE email = 'logan@example.com'").get().player_id;
  await syncState(DB, acct, laptop);
  const r = await syncState(DB, acct, phone);
  assert.equal(r.state.pa_pass_v1.runs, 50);
  assert.equal(r.state.ga_xp, 1200);
});
