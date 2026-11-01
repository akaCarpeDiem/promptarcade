import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const html = fs.readFileSync(new URL("../src/play/fusion-2048.html", import.meta.url), "utf8");

test("fusion module parses, keeps rewind, and has no vent", () => {
  assert.match(html, /if \(!canMove\(\)\) endGame\(\)/);
  assert.match(html, /KeyZ/);
  assert.match(html, /id="t-undo"/);
  assert.equal(html.includes("KeyX"), false);
  assert.equal(html.includes("t-vent"), false);
  assert.equal(html.includes("toggleVent"), false);
  assert.equal(/\bvent/i.test(html), false);
  const mod = html.match(/<script type="module">([\s\S]*?)<\/script>/);
  assert.ok(mod, "module script");
  const src = mod[1].replace(/import \* as THREE from [^;]+;/, "const THREE = globalThis.THREE;");
  const file = path.join(os.tmpdir(), "fusion-2048-check.mjs");
  fs.writeFileSync(file, src);
  execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
});

function boardApi() {
  const start = html.indexOf("const emptyGrid");
  const end = html.indexOf("function spawnRandom");
  assert.ok(start > 0 && end > start);
  const factory = new Function("SIZE", `${html.slice(start, end)}
    return { canMove, set(g, l) { grid = g; lead = l; } };`);
  return factory(4);
}

const row = (...cells) => cells;

test("a full board with no pairs has no move and would end", () => {
  const api = boardApi();
  api.set([
    row(2, 4, 2, 4),
    row(4, 2, 4, 2),
    row(2, 4, 2, 4),
    row(4, 2, 4, 2)
  ], [
    row(0, 0, 0, 0),
    row(0, 0, 0, 0),
    row(0, 0, 0, 0),
    row(0, 0, 0, 0)
  ]);
  assert.equal(api.canMove(), false);
});

test("an open cell or a matching pair is still a move", () => {
  const api = boardApi();
  api.set([
    row(2, 4, 8, 16),
    row(4, 2, 4, 8),
    row(8, 4, 2, 4),
    row(16, 8, 4, 0)
  ], [
    row(0, 0, 0, 0),
    row(0, 0, 0, 0),
    row(0, 0, 0, 0),
    row(0, 0, 0, 0)
  ]);
  assert.equal(api.canMove(), true);
  api.set([
    row(2, 2, 4, 8),
    row(4, 8, 16, 32),
    row(8, 16, 32, 64),
    row(16, 32, 64, 128)
  ], [
    row(0, 0, 0, 0),
    row(0, 0, 0, 0),
    row(0, 0, 0, 0),
    row(0, 0, 0, 0)
  ]);
  assert.equal(api.canMove(), true);
});

test("lead can trap an empty cell so the board is still stuck", () => {
  const api = boardApi();
  // Top two rows cannot merge. Lead seals the empty cell off from every tile.
  api.set([
    row(2, 4, 2, 4),
    row(4, 2, 4, 2),
    row(0, 0, 0, 0),
    row(0, 0, 0, 0)
  ], [
    row(0, 0, 0, 0),
    row(0, 0, 0, 0),
    row(1, 1, 1, 1),
    row(1, 1, 1, 0)
  ]);
  assert.equal(api.canMove(), false);
});
