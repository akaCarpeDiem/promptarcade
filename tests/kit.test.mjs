import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

for (const f of ["pa-kit.js", "pa-score.js", "pa-gate.js"]) {
  test(f + " parses", () => { new Function(fs.readFileSync(new URL("../src/play/" + f, import.meta.url), "utf8")); });
}
test("site scripts parse", () => {
  for (const f of ["site.js", "hero.js"]) new Function(fs.readFileSync(new URL("../src/assets/" + f, import.meta.url), "utf8"));
});
test("every play file's inline classic scripts parse", () => {
  const dir = new URL("../src/play/", import.meta.url);
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".html"))) {
    const s = fs.readFileSync(new URL(f, dir), "utf8");
    for (const m of s.matchAll(/<script(?![^>]*type="module")(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)) {
      try { new Function(m[1]); } catch (e) { assert.fail(`${f}: ${e.message}`); }
    }
  }
});
