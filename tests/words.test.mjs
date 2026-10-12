import { test } from "node:test";
import assert from "node:assert/strict";
import { ANSWERS, VALID } from "../src/play/wordglow/words.js";

test("word lists are well formed", () => {
  assert.equal(ANSWERS.length % 5, 0);
  assert.equal(VALID.length % 5, 0);
  assert.match(ANSWERS, /^[a-z]+$/);
  const a = new Set(), v = new Set();
  for (let i = 0; i < VALID.length; i += 5) v.add(VALID.slice(i, i + 5));
  for (let i = 0; i < ANSWERS.length; i += 5) { const w = ANSWERS.slice(i, i + 5); assert.ok(!a.has(w), "duplicate " + w); a.add(w); assert.ok(v.has(w), w + " not a valid guess"); }
  assert.ok(a.size > 1500, "enough dailies for years");
});
