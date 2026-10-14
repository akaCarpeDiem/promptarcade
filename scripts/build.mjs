// PromptArcade static site generator: src/ → dist/  (node scripts/build.mjs)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { SITE, GAMES, RETIRED, QUESTS } from "../src/catalog.mjs";
import * as P from "./lib/pages.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const OUT = path.resolve(ROOT, process.env.OUT_DIR || "dist");

const read = (p) => fs.readFileSync(p, "utf8");
const write = (rel, data) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, data); };
const copyDir = (from, to) => {
  if (!fs.existsSync(from)) return;
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) copyDir(a, b);
    else { fs.mkdirSync(path.dirname(b), { recursive: true }); fs.copyFileSync(a, b); }
  }
};
const hash = (buf) => crypto.createHash("sha1").update(buf).digest("hex").slice(0, 10);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

/* ---------- static assets ---------- */
copyDir(path.join(SRC, "fonts"), path.join(OUT, "fonts"));
copyDir(path.join(SRC, "vendor"), path.join(OUT, "vendor"));
copyDir(path.join(SRC, "shots"), path.join(OUT, "shots"));
copyDir(path.join(SRC, "og"), path.join(OUT, "og"));
copyDir(path.join(SRC, "icons"), path.join(OUT, "icons"));
copyDir(path.join(SRC, "assets"), path.join(OUT, "assets"));
copyDir(path.join(SRC, "static"), OUT);

/* ---------- game data for the kit + site (pa-data.js) ---------- */
const kitSrc = read(path.join(SRC, "play/pa-kit.js"));
const badgeBlock = kitSrc.match(/var BADGES = (\{[\s\S]*?\n {4}\});/);
if (!badgeBlock) throw new Error("Could not find BADGES in pa-kit.js");
const BADGES = Function(`"use strict";return (${badgeBlock[1]});`)();
const data = {
  games: GAMES.map((g) => ({ slug: g.slug, title: g.title, genre: g.genre, tags: g.tags, accent: g.accent, tagline: g.tagline, maker: g.credit.maker, model: g.credit.model, unit: g.unit })),
  quests: QUESTS.filter((q) => GAMES.some((g) => g.slug === q.game)),
  badges: BADGES
};
fs.mkdirSync(path.join(OUT, "games/play"), { recursive: true });
fs.writeFileSync(path.join(OUT, "games/play/pa-data.js"), "/* generated from src/catalog.mjs — do not edit */\nwindow.PA_DATA=" + JSON.stringify(data) + ";\n");

/* Google AdSense loader: in every page head (layout pages get it from html.mjs). */
const ADSENSE_TAG = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4059575347806121" crossorigin="anonymous"></script>';

/* Google Analytics 4 tag: right after <head> on every page (layout pages get it from html.mjs). */
const GA_TAG = `<!-- Google tag (gtag.js) --><script async src="https://www.googletagmanager.com/gtag/js?id=G-L394D0L4NL"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-L394D0L4NL');</script>`;

/* ---------- play files: copy, cache-bust kit scripts, drop stale injected beacons ---------- */
copyDir(path.join(SRC, "play"), path.join(OUT, "games/play"));
const ver = {};
const v = (rel) => {
  if (ver[rel]) return ver[rel];
  const f = path.join(OUT, rel);
  return (ver[rel] = fs.existsSync(f) ? hash(fs.readFileSync(f)) : "0");
};
for (const f of fs.readdirSync(path.join(OUT, "games/play"))) {
  if (!f.endsWith(".html")) continue;
  const p = path.join(OUT, "games/play", f);
  let h = read(p);
  h = h.replace(/<script[^>]*static\.cloudflareinsights\.com[^>]*><\/script>/g, "");
  h = h.replace(/(src|href)="(\/games\/play\/pa-(?:score|gate|kit|data)\.js)(?:\?v=[^"]*)?"/g, (m, a, u) => `${a}="${u}?v=${v(u.slice(1))}"`);
  // Play files only run inside the iframe on /games/<slug>/, which already carries GA, so no
  // second GA tag here (it double-counted page views). They are noindexed and point search
  // engines at the game page instead.
  h = h.replace(/<!-- Google tag \(gtag\.js\) -->/g, "").replace(/<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-L394D0L4NL"><\/script><script>window\.dataLayer[^<]*<\/script>/g, "");
  const game = GAMES.find((g) => g.slug === f.replace(/\.html$/, ""));
  if (game && !h.includes('rel="canonical"')) {
    const attr = (t) => String(t).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    const head = [
      `<meta name="robots" content="noindex"/>`,
      `<link rel="canonical" href="${SITE.url}/games/${game.slug}/"/>`,
      `<meta name="description" content="${attr(game.tagline)}"/>`,
      `<link rel="icon" href="/favicon.svg" type="image/svg+xml"/>`,
      `<link rel="icon" href="/icons/icon-32.png" sizes="32x32" type="image/png"/>`,
    ].join("\n");
    h = h.replace(/<\/title>/i, (m) => m + "\n" + head);
  }
  if (!h.includes(ADSENSE_TAG)) h = h.replace(/<\/head>/i, ADSENSE_TAG + "\n</head>");
  fs.writeFileSync(p, h);
}

/* ---------- per-game code stats + sources for the source pages ---------- */
const countLines = (t) => t.split("\n").filter((l) => l.trim()).length;
const stats = {};
const DEPS = { "glowline-arena": ["arena/sim.js", "arena/proto.js", "arena/room.js", "arena/art.js"], "wordglow": [] };
const LIBS = { "skystack": 1, "hyperlane-3d": 1 };
for (const g of GAMES) {
  const file = path.join(SRC, "play", g.slug + ".html");
  if (!fs.existsSync(file)) throw new Error("Missing play file for " + g.slug);
  const main = read(file);
  const sources = [{ name: `games/play/${g.slug}.html`, text: main, lines: countLines(main) }];
  for (const d of DEPS[g.slug] || []) { const t = read(path.join(SRC, "play", d)); sources.push({ name: "games/play/" + d, text: t, lines: countLines(t) }); }
  const cm = main.match(/controls:\s*(\[[\s\S]*?\]\s*\])/);
  let controls = [];
  if (cm) { try { controls = JSON.parse(cm[1]); } catch (e) { controls = []; } }
  stats[g.slug] = {
    lines: sources.reduce((s, x) => s + x.lines, 0),
    bytes: sources.reduce((s, x) => s + Buffer.byteLength(x.text), 0),
    files: sources.length, deps: LIBS[g.slug] ? "three.js" : "none", sources, controls, shared: true
  };
}
const kitLines = ["pa-kit.js", "pa-score.js", "pa-gate.js"].reduce((s, f) => s + countLines(read(path.join(SRC, "play", f))), 0);
const totals = {
  kitLines,
  lines: Object.values(stats).reduce((s, x) => s + x.lines, 0) + kitLines,
  bytes: Object.values(stats).reduce((s, x) => s + x.bytes, 0),
  claudeNew: GAMES.filter((g) => g.credit.model === "Claude Opus 5.5").length
};

/* ---------- pages ---------- */
const ctx = { v, stats, totals, now: new Date(process.env.BUILD_DATE || Date.now()) };
const pages = [P.home(ctx), P.library(ctx), P.daily(ctx), P.hallOfFame(ctx), P.me(ctx), P.lab(ctx), P.news(ctx), P.about(ctx), P.privacy(ctx), P.terms(ctx), P.contact(ctx), P.notFound(ctx)];
for (const g of GAMES) { pages.push(P.game(ctx, g)); pages.push(P.source(ctx, g)); }
for (const pg of pages) write(pg.path.endsWith(".html") ? pg.path : pg.path + "index.html", pg.html);

/* ---------- redirects for retired games ---------- */
const red = ["# Retired games keep working: old links land on the closest replacement (or the library)."];
for (const [slug, to] of Object.entries(RETIRED)) {
  const dest = to ? `/games/${to}/` : "/games/";
  red.push(`/games/${slug}/ ${dest} 301`, `/games/${slug} ${dest} 301`, `/games/play/${slug} ${dest} 301`, `/games/play/${slug}.html ${dest} 301`);
}
red.push("/games/posters/* /games/ 301", "/hall-of-fame /hall-of-fame/ 301", "/arcade /games/ 301", "/play/:slug /games/:slug/ 301");
write("_redirects", red.join("\n") + "\n");

/* ---------- headers ---------- */
write("_headers", `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
/fonts/*
  Cache-Control: public, max-age=31536000, immutable
/vendor/*
  Cache-Control: public, max-age=31536000, immutable
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/shots/*
  Cache-Control: public, max-age=86400
/og/*
  Cache-Control: public, max-age=86400
/games/play/*
  Cache-Control: public, max-age=0, must-revalidate
`);

/* ---------- sitemap, robots, manifest ---------- */
const urls = ["/", "/games/", "/daily/", "/hall-of-fame/", "/lab/", "/new/", "/about/", "/privacy/", "/terms/", "/contact/", ...GAMES.map((g) => `/games/${g.slug}/`), ...GAMES.map((g) => `/games/${g.slug}/source/`)];
const today = ctx.now.toISOString().slice(0, 10);
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE.url}${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`);
write("ads.txt", "google.com, pub-4059575347806121, DIRECT, f08c47fec0942fa0\n");
write("robots.txt", `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /me/\n\nSitemap: ${SITE.url}/sitemap.xml\n`);
write("manifest.webmanifest", JSON.stringify({
  name: SITE.name, short_name: "PromptArcade", description: SITE.description, start_url: "/", scope: "/", display: "standalone", background_color: "#05051a", theme_color: "#05051a",
  icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }, { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }]
}, null, 2));

const count = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(path.join(dir, e.name)) : 1), 0);
console.log(`Built ${pages.length} pages, ${count(OUT)} files → ${path.relative(ROOT, OUT)}/  (${GAMES.length} games, ${totals.lines.toLocaleString()} lines of game code)`);
