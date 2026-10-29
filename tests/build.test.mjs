import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { GAMES, RETIRED, QUESTS, SITE } from "../src/catalog.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), "pa-build-"));
execFileSync(process.execPath, [path.join(ROOT, "scripts/build.mjs")], { env: { ...process.env, OUT_DIR: OUT }, cwd: ROOT, stdio: "ignore" });
// build.mjs resolves OUT_DIR relative to the repo root; an absolute path works too
const out = (p) => path.join(OUT, p);
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk(OUT);
const html = files.filter((f) => f.endsWith(".html"));

test("every catalog game has its play file, screenshot, OG image, page and source page", () => {
  for (const g of GAMES) {
    for (const f of [`games/play/${g.slug}.html`, `shots/${g.slug}.webp`, `og/${g.slug}.png`, `games/${g.slug}/index.html`, `games/${g.slug}/source/index.html`]) assert.ok(fs.existsSync(out(f)), `${g.slug}: missing ${f}`);
  }
});

test("catalog entries are complete and credit a model", () => {
  const slugs = new Set();
  for (const g of GAMES) {
    assert.ok(!slugs.has(g.slug), "duplicate slug " + g.slug); slugs.add(g.slug);
    for (const k of ["title", "genre", "tagline", "about", "brief", "unit", "accent", "accent2", "added"]) assert.ok(g[k], `${g.slug}.${k}`);
    assert.ok(g.credit && g.credit.maker && g.credit.via && g.credit.method, `${g.slug} credit`);
    assert.ok(g.original ? !g.classic && !g.twist : g.classic && g.twist, `${g.slug}: needs classic + twist, or original: true`);
    assert.ok(!RETIRED[g.slug] && !(g.slug in RETIRED), `${g.slug} is both live and retired`);
  }
  for (const q of QUESTS) assert.ok(slugs.has(q.game), "quest for unknown game " + q.game);
});

test("all internal links and assets resolve", () => {
  const missing = [];
  for (const f of html) {
    const s = fs.readFileSync(f, "utf8");
    for (const m of s.matchAll(/(?:href|src|data-src)="(\/[^"#?]*)[^"]*"/g)) {
      let u = m[1];
      if (u.startsWith("/api/") || u.startsWith("//")) continue;
      let p = out(u);
      if (u.endsWith("/")) p = path.join(p, "index.html");
      // Pages serves /x from x.html (pretty URL), so an extensionless link to an .html file resolves.
      if (!fs.existsSync(p) && !path.extname(u) && fs.existsSync(p + ".html")) p += ".html";
      if (!fs.existsSync(p)) missing.push(path.relative(OUT, f) + " → " + u);
    }
  }
  assert.deepEqual([...new Set(missing)], []);
});

test("module imports inside games resolve", () => {
  for (const f of files.filter((x) => x.includes(path.join("games", "play")) && /\.(html|js)$/.test(x))) {
    const s = fs.readFileSync(f, "utf8");
    for (const m of s.matchAll(/(?:import\s[^"']*?from\s*|import\()\s*["'](\/[^"']+)["']/g)) assert.ok(fs.existsSync(out(m[1])), `${path.relative(OUT, f)} imports missing ${m[1]}`);
  }
});

test("pages have titles, descriptions and canonical links", () => {
  for (const f of html.filter((x) => !x.includes(path.join("games", "play")))) {
    const s = fs.readFileSync(f, "utf8");
    assert.match(s, /<title>[^<]{3,}<\/title>/, f);
    assert.match(s, /<meta name="description" content="[^"]{20,}"/, f);
    assert.match(s, /<link rel="canonical" href="https:\/\/promptarcade\.games\//, f);
  }
});

test("retired games redirect and are gone from the site", () => {
  const red = fs.readFileSync(out("_redirects"), "utf8");
  for (const slug of Object.keys(RETIRED)) {
    assert.match(red, new RegExp(`^/games/${slug}/ /games/`, "m"), slug);
    assert.match(red, new RegExp(`^/games/play/${slug} /games/`, "m"), slug);
    assert.ok(!fs.existsSync(out(`games/play/${slug}.html`)), slug + " play file still shipped");
  }
  // Trademark block-game names must not ship as user-facing text or as a redirect path.
  const trademark = /Neon Tetris|neon-tetris|Tetris/;
  assert.ok(!trademark.test(red), "trademark slug in _redirects");
  for (const rel of ["src/catalog.mjs", "functions/_shared/games.js", "DEPLOY.md"]) {
    assert.ok(!trademark.test(fs.readFileSync(path.join(ROOT, rel), "utf8")), "trademark name in " + rel);
  }
  for (const f of files.filter((x) => /\.(html|js|txt|xml|json|webmanifest)$/.test(x))) {
    const s = fs.readFileSync(f, "utf8");
    assert.ok(!trademark.test(s), "trademark name in " + path.relative(OUT, f));
    if (f.endsWith(".html")) assert.ok(!/Pellet Panic/.test(s), "retired name in " + path.relative(OUT, f));
  }
});

test("sitemap lists every game and robots points at it", () => {
  const sm = fs.readFileSync(out("sitemap.xml"), "utf8");
  for (const g of GAMES) assert.ok(sm.includes(`${SITE.url}/games/${g.slug}/</loc>`), g.slug);
  assert.match(fs.readFileSync(out("robots.txt"), "utf8"), /Sitemap: https:\/\/promptarcade\.games\/sitemap\.xml/);
});

test("only the support address is published", () => {
  for (const f of files.filter((x) => /\.(html|js|txt|xml|json|webmanifest)$/.test(x))) {
    const s = fs.readFileSync(f, "utf8");
    for (const m of s.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/g)) assert.equal(m[0], SITE.email, `${path.relative(OUT, f)} has ${m[0]}`);
  }
});

test("game pages ship the shared kit with cache-busting and no stale beacons", () => {
  for (const g of GAMES) {
    const s = fs.readFileSync(out(`games/play/${g.slug}.html`), "utf8");
    for (const k of ["pa-score", "pa-gate", "pa-kit"]) assert.match(s, new RegExp(`/games/play/${k}\\.js\\?v=[0-9a-f]{10}`), `${g.slug} ${k}`);
    assert.ok(!s.includes("cloudflareinsights"), g.slug);
    assert.match(s, new RegExp(`slug:\\s*"${g.slug}"`), `${g.slug} paConfig slug`);
  }
});

test("pa-data.js is valid and lists every game", () => {
  const src = fs.readFileSync(out("games/play/pa-data.js"), "utf8");
  const w = {}; Function("window", src)(w);
  assert.equal(w.PA_DATA.games.length, GAMES.length);
  assert.ok(Object.keys(w.PA_DATA.badges).length >= 20);
  assert.ok(w.PA_DATA.quests.length >= 7);
});

test("no secrets or local paths leak into the build", () => {
  for (const f of files.filter((x) => /\.(html|js|txt|json)$/.test(x))) {
    const s = fs.readFileSync(f, "utf8");
    assert.ok(!/\/home\/claude|\/workspace\/|BEGIN (RSA|OPENSSH) PRIVATE KEY|api[_-]?token\s*[:=]/i.test(s), path.relative(OUT, f));
  }
});
