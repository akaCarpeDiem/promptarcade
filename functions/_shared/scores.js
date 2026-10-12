// Shared helpers for the /api/scores Pages Functions.
//
// Storage: Cloudflare D1 (binding SCORES, preferred) or Workers KV (binding SCORES_KV).
// The first binding found wins; with neither bound every endpoint answers 503 and the
// client keeps scores in localStorage (see overlay/games/play/pa-score.js).
import { GAMES } from "./games.js";

export const TOP_N = 10;
const KV_KEEP = 50;                       // rows kept per game in KV (Top 10 is shown)
const NAME_RE = /^[\p{L}\p{N} _.\-']{1,16}$/u;
// Profanity-light filter. BLOCKED matches anywhere in the folded name; BLOCKED_WORDS only as a
// whole word (or the whole name), so "Hancock", "grape" or "spicy" stay allowed.
const BLOCKED = [
  "fuck", "shit", "cunt", "nigg", "nigger", "fagg", "hitler", "whore", "slut", "bitch",
  "pussy", "porn", "retard", "asshole", "twat",
];
const BLOCKED_WORDS = [
  "fuk", "nigr", "rape", "rapist", "dick", "cock", "penis", "vagina", "kike", "spic", "chink",
  "nazi", "kkk", "heil", "wank", "fag", "cum", "anal",
];
// Leetspeak folding before the blocklist check (n1gg3r → nigger, 5hit → shit).
const LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "9": "g", "$": "s", "@": "a", "!": "i" };
// Per client (salted daily IP hash): at most one saved score every MIN_GAP_MS,
// and BURST_MAX saved scores per BURST_WINDOW_MS.
const MIN_GAP_MS = 3000;
const BURST_MAX = 30;
const BURST_WINDOW_MS = 10 * 60 * 1000;

export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...extra,
    },
  });
}

export function fail(status, error, extra) {
  return json({ ok: false, error }, status, extra);
}

export function gameFor(slug) {
  return Object.prototype.hasOwnProperty.call(GAMES, slug) ? GAMES[slug] : null;
}

export function allSlugs() {
  return Object.keys(GAMES);
}

export function cleanName(raw) {
  const name = String(raw ?? "").normalize("NFC").replace(/\s+/g, " ").trim();
  if (!NAME_RE.test(name) || !/[\p{L}\p{N}]/u.test(name)) return null;
  const folded = name.toLowerCase().replace(/[0-9$@!]/g, (c) => LEET[c] || c);
  const flat = folded.replace(/[^a-z]/g, "");
  if (BLOCKED.some((w) => flat.includes(w))) return null;
  const words = folded.split(/[^a-z]+/).filter(Boolean).concat([flat]);
  if (words.some((w) => BLOCKED_WORDS.includes(w))) return null;
  return name;
}

export function cleanScore(raw, cap) {
  if (typeof raw !== "number" || !Number.isFinite(raw) || !Number.isInteger(raw)) return null;
  if (raw < 0 || raw > cap) return null;
  return raw;
}

export async function clientHash(request, env) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "local";
  const day = new Date().toISOString().slice(0, 10);
  const salt = (env && (env.SCORE_SALT || env.SCORES_SALT)) || "promptarcade";
  const data = new TextEncoder().encode(`${salt}|${day}|${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function byRank(a, b) {
  return (b.score - a.score) || (a.at - b.at);
}

function publicRow(r) {
  return { id: String(r.id), name: r.name, score: r.score, at: r.at };
}

// ---------------------------------------------------------------- D1 store
// Boards JOIN players so a rename shows on every row at once; s.name keeps the name used at
// the time of the run (history / legacy rows without a player).
const BOARD_COLS = `s.id, s.player_id AS pid, COALESCE(p.display_name, s.name) AS name, s.score, s.created_at AS at`;
const VISIBLE = `s.hidden = 0 AND (p.hidden IS NULL OR p.hidden = 0)`;
function d1Row(r) {
  const row = publicRow(r);
  if (r.pid) row.pid = r.pid;
  return row;
}
function d1Store(DB) {
  async function topFor(slug, limit = TOP_N) {
    const { results } = await DB.prepare(
      `SELECT ${BOARD_COLS} FROM scores s LEFT JOIN players p ON p.id = s.player_id
       WHERE s.slug = ?1 AND ${VISIBLE} ORDER BY s.score DESC, s.created_at ASC LIMIT ?2`
    ).bind(slug, limit).all();
    return (results || []).map(d1Row);
  }
  return {
    kind: "d1",
    db: DB,
    async top(slug) {
      const top = await topFor(slug);
      const count = await DB.prepare("SELECT COUNT(*) AS n FROM scores WHERE slug = ?1 AND hidden = 0").bind(slug).first();
      return { top, total: (count && count.n) || 0 };
    },
    async all() {
      const { results } = await DB.prepare(
        `SELECT id, pid, slug, name, score, at FROM (
           SELECT ${BOARD_COLS}, s.slug AS slug,
                  ROW_NUMBER() OVER (PARTITION BY s.slug ORDER BY s.score DESC, s.created_at ASC) AS rn
           FROM scores s LEFT JOIN players p ON p.id = s.player_id
           WHERE ${VISIBLE}
         ) WHERE rn <= ?1 ORDER BY slug, rn`
      ).bind(TOP_N).all();
      const known = new Set(allSlugs());
      const games = {};
      for (const r of results || []) {
        if (!known.has(r.slug)) continue;
        (games[r.slug] ||= []).push(d1Row(r));
      }
      const count = await DB.prepare("SELECT COUNT(*) AS n FROM scores WHERE hidden = 0").first();
      return { games, total: (count && count.n) || 0 };
    },
    async submit({ slug, name, score, hash, now, playerId = null, hidden = 0 }) {
      const row = await DB.prepare(
        "SELECT COUNT(*) AS n, MAX(created_at) AS last FROM scores WHERE ip_hash = ?1 AND created_at > ?2"
      ).bind(hash, now - BURST_WINDOW_MS).first();
      if (row && ((row.last && now - row.last < MIN_GAP_MS) || (row.n || 0) >= BURST_MAX)) return { limited: true };
      const ins = await DB.prepare(
        "INSERT INTO scores (slug, name, score, created_at, ip_hash, player_id, hidden) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) RETURNING id"
      ).bind(slug, name, score, now, hash, playerId, hidden ? 1 : 0).first();
      const better = await DB.prepare(
        `SELECT COUNT(*) AS n FROM scores s LEFT JOIN players p ON p.id = s.player_id
         WHERE s.slug = ?1 AND ${VISIBLE} AND (s.score > ?2 OR (s.score = ?2 AND s.created_at < ?3))`
      ).bind(slug, score, now).first();
      return { id: ins ? String(ins.id) : "", rank: ((better && better.n) || 0) + 1, top: await topFor(slug), saved: true };
    },
  };
}

// ---------------------------------------------------------------- KV store
// board:<slug> → { rows: [{id,name,score,at}] (best KV_KEEP), total, updated }
// rl:<hash>    → { start, n, last }  (expires after the burst window)
// Only scores that make a game's kept rows are written, so KV writes stay low.
function kvStore(KV) {
  async function board(slug) {
    const b = await KV.get("board:" + slug, { type: "json" });
    return b && Array.isArray(b.rows) ? b : { rows: [], total: 0 };
  }
  return {
    kind: "kv",
    async top(slug) {
      const b = await board(slug);
      return { top: b.rows.slice(0, TOP_N).map(publicRow), total: b.total || b.rows.length };
    },
    async all() {
      const slugs = allSlugs();
      const boards = await Promise.all(slugs.map(board));
      const games = {};
      let total = 0;
      boards.forEach((b, i) => {
        total += b.total || b.rows.length;
        if (b.rows.length) games[slugs[i]] = b.rows.slice(0, TOP_N).map(publicRow);
      });
      return { games, total };
    },
    async submit({ slug, name, score, hash, now }) {
      const b = await board(slug);
      const ahead = b.rows.filter((r) => r.score > score || (r.score === score && r.at <= now)).length;
      const rank = ahead + 1;
      if (score <= 0 || rank > KV_KEEP) {
        // Not a board score: nothing to store. rank 0 = "outside the kept board".
        return { id: "", rank: 0, top: b.rows.slice(0, TOP_N).map(publicRow), saved: false };
      }
      const rlKey = "rl:" + hash;
      const rl = await KV.get(rlKey, { type: "json" });
      const inWindow = rl && now - rl.start < BURST_WINDOW_MS;
      if (rl && (now - rl.last < MIN_GAP_MS || (inWindow && rl.n >= BURST_MAX))) return { limited: true };
      const nextRl = inWindow ? { start: rl.start, n: rl.n + 1, last: now } : { start: now, n: 1, last: now };
      await KV.put(rlKey, JSON.stringify(nextRl), { expirationTtl: Math.ceil(BURST_WINDOW_MS / 1000) + 60 });

      const id = now.toString(36) + Math.random().toString(36).slice(2, 8);
      const rows = b.rows.concat([{ id, name, score, at: now }]).sort(byRank).slice(0, KV_KEEP);
      await KV.put("board:" + slug, JSON.stringify({ rows, total: (b.total || b.rows.length) + 1, updated: now }));
      return { id, rank, top: rows.slice(0, TOP_N).map(publicRow), saved: true };
    },
  };
}

/** The scores store for this request's bindings, or null when none is bound. */
export function store(env) {
  if (env && env.SCORES && typeof env.SCORES.prepare === "function") return d1Store(env.SCORES);
  if (env && env.SCORES_KV && typeof env.SCORES_KV.get === "function") return kvStore(env.SCORES_KV);
  return null;
}
