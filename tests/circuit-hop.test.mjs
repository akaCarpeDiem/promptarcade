import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../src/play/circuit-hop.html", import.meta.url), "utf8");
const LEVELS = new Function("return " + html.match(/const LEVELS = (\[[\s\S]*?\n  \]);/)[1])();

/* A conservative tile model of the player: jumps reach 2 tiles up and 5 across (3 when climbing 2),
 * and a shaft 1–3 tiles wide between two walls can be wall-jumped to its top. The real jump is
 * higher and longer, so anything this model reaches, a player can reach. */
function unreachable(rows) {
  const H = rows.length, W = rows[0].length;
  const at = (x, y) => (x < 0 || x >= W || y < 0 ? "#" : y >= H ? "." : rows[y][x]);
  const solid = (x, y) => at(x, y) === "#";
  const open = (x, y) => y < H && !solid(x, y);
  const deadly = (x, y) => y >= H || at(x, y) === "^";
  const key = (x, y) => x + "," + y, seen = new Set(), touched = new Set(), q = [];
  function settle(x, y, path) {
    while (true) {
      if (deadly(x, y)) return;
      path.push([x, y]);
      if (solid(x, y + 1)) break;
      y++;
    }
    for (const [a, b] of path) touched.add(key(a, b));
    if (!seen.has(key(x, y))) { seen.add(key(x, y)); q.push([x, y]); }
  }
  rows.forEach((r, y) => { const x = r.indexOf("@"); if (x >= 0) settle(x, y, []); });
  while (q.length) {
    const [x, y] = q.shift();
    for (const d of [-1, 1]) {
      if (open(x + d, y)) settle(x + d, y, []);
      for (let h = 1; h <= 2; h++) {
        const path = [];
        let ok = true;
        for (let k = 1; k <= h; k++) { if (!open(x, y - k)) ok = false; path.push([x, y - k]); }
        if (!ok) continue;
        for (let dx = 1; dx <= 5; dx++) {
          const X = x + d * dx, A = y - h;
          if (!open(X, A) || deadly(X, A)) break;
          path.push([X, A]);
          let ly = A;
          const p2 = path.slice();
          while (!solid(X, ly + 1) && !deadly(X, ly)) { ly++; p2.push([X, ly]); }
          if (deadly(X, ly) || dx > (y - ly >= 2 ? 3 : y - ly === 1 ? 4 : 5)) continue;
          settle(X, ly, p2);
        }
      }
      // wall-jump shaft
      if (!solid(x + d, y - 2)) continue;
      let w = 0;
      while (w < 4 && open(x - d * (w + 1), y - 2)) w++;
      if (w > 2 || !solid(x - d * (w + 1), y - 2)) continue;
      const cols = [];
      for (let i = 0; i <= w; i++) cols.push(x - d * i);
      const lo = Math.min(...cols), hi = Math.max(...cols);
      if (!cols.every((c) => open(c, y - 1))) continue;
      const climb = cols.map((c) => [c, y - 1]);
      let top = y - 2;
      while (top > 0 && cols.every((c) => open(c, top))) {
        cols.forEach((c) => climb.push([c, top]));
        if (!solid(lo - 1, top) || !solid(hi + 1, top)) break;
        top--;
      }
      if (!cols.every((c) => open(c, top))) continue;
      for (const side of [lo - 1, hi + 1]) for (const r of [top, top - 1]) {
        if (open(side, r) && cols.every((c) => open(c, r))) settle(side, r, climb.slice());
      }
    }
  }
  const out = [];
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if ("CEK".includes(ch) && !touched.has(key(x, y))) out.push(ch + "@" + x + "," + y); }));
  return out;
}

test("circuit hop sectors are well formed", () => {
  assert.ok(LEVELS.length >= 6, "at least six sectors");
  for (const L of LEVELS) {
    const W = L.rows[0].length, all = L.rows.join("");
    L.rows.forEach((r, i) => assert.equal(r.length, W, `${L.name} row ${i} width`));
    assert.match(all, /^[#.@CEMKHV^]+$/, L.name + " uses only known tiles");
    assert.equal(all.split("@").length - 1, 1, L.name + " has one spawn");
    assert.equal(all.split("E").length - 1, 1, L.name + " has one exit");
    assert.ok(/^#+$/.test(L.rows[0]), L.name + " top border is closed");
    L.rows.forEach((r, i) => assert.ok(r[0] === "#" && r[W - 1] === "#", `${L.name} side border closed on row ${i}`));
    L.rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === "M") assert.equal(L.rows[y + 1][x], "#", `${L.name} bot at ${x},${y} stands on a floor`); }));
  }
});

test("every chip, checkpoint and exit can be reached", () => {
  for (const L of LEVELS) assert.deepEqual(unreachable(L.rows), [], L.name);
});
