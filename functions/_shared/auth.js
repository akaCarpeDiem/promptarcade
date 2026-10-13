// Email sign-in for PromptArcade players, so one player can be used on several devices.
// A player signs in with a 6-digit code emailed through Resend (the email also carries a
// one-tap link with the same code). Signing in gives this device its own key in player_tokens;
// the browser's old player (if any) has its scores moved onto the account.
// Nothing here stores a password. Codes and keys are stored only as SHA-256 hashes.
import { ensureIdentityTables, authPlayer, createPlayer, sha256Hex } from "./players.js";

const MIN = 60000, HOUR = 3600000, DAY = 86400000;
export const CODE_TTL = 15 * MIN;
export const CODE_ATTEMPTS = 5;
export const CODES_PER_EMAIL_HOUR = 5;
export const CODES_PER_IP_DAY = 30;
export const STATE_MAX = 48 * 1024;
const EMAIL_RE = /^[^\s@<>()",;:]{1,64}@[a-z0-9.-]{1,190}\.[a-z]{2,24}$/;

export const AUTH_SQL = [
  `CREATE TABLE IF NOT EXISTS accounts (
     player_id  TEXT PRIMARY KEY,
     email      TEXT NOT NULL UNIQUE,
     created_at INTEGER NOT NULL,
     last_login INTEGER NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS login_codes (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     email      TEXT NOT NULL,
     code_hash  TEXT NOT NULL,
     attempts   INTEGER NOT NULL DEFAULT 0,
     expires_at INTEGER NOT NULL,
     used_at    INTEGER,
     ip_hash    TEXT,
     created_at INTEGER NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_login_codes_email ON login_codes (email, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_login_codes_ip ON login_codes (ip_hash, created_at)`,
  `CREATE TABLE IF NOT EXISTS player_tokens (
     token_hash TEXT PRIMARY KEY,
     player_id  TEXT NOT NULL,
     created_at INTEGER NOT NULL,
     last_used  INTEGER NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_player_tokens_player ON player_tokens (player_id)`,
  `CREATE TABLE IF NOT EXISTS player_state (
     player_id  TEXT PRIMARY KEY,
     data       TEXT NOT NULL,
     updated_at INTEGER NOT NULL
   )`,
];

let ready = false;
export async function ensureAuthTables(DB) {
  if (ready) return;
  await ensureIdentityTables(DB);
  await DB.batch(AUTH_SQL.map((sql) => DB.prepare(sql)));
  ready = true;
}

const err = (status, error, message) => ({ ok: false, status, error, message });
export function cleanEmail(raw) {
  const e = String(raw || "").trim().toLowerCase();
  return e.length <= 254 && EMAIL_RE.test(e) ? e : "";
}
function randomHex(n) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function sixDigits() {
  const a = new Uint32Array(1);
  // rejection sampling keeps every code equally likely
  do crypto.getRandomValues(a); while (a[0] >= 4294000000);
  return String(a[0] % 1000000).padStart(6, "0");
}
const codeHash = (email, code, env) => sha256Hex(`${(env && env.SCORE_SALT) || "promptarcade"}|login|${email}|${code}`);

/** Email a fresh code. Always answers the same way whether or not the email has an account. */
export async function startLogin(env, DB, { email, ipHash, origin }, send = sendCodeEmail) {
  email = cleanEmail(email);
  if (!email) return err(422, "bad-email", "That doesn't look like an email address.");
  if (!env.RESEND_API_KEY) return err(503, "email-unavailable", "Sign-in isn't switched on yet. Please try again later.");
  await ensureAuthTables(DB);
  const now = Date.now();
  const [byEmail, byIp] = await Promise.all([
    DB.prepare("SELECT COUNT(*) AS n FROM login_codes WHERE email = ?1 AND created_at > ?2").bind(email, now - HOUR).first(),
    DB.prepare("SELECT COUNT(*) AS n FROM login_codes WHERE ip_hash = ?1 AND created_at > ?2").bind(ipHash, now - DAY).first(),
  ]);
  if ((byEmail && byEmail.n >= CODES_PER_EMAIL_HOUR) || (byIp && byIp.n >= CODES_PER_IP_DAY)) {
    return err(429, "slow-down", "Too many codes requested. Please wait a while and try again.");
  }
  const code = sixDigits();
  // a new code replaces any earlier one still waiting
  await DB.batch([
    DB.prepare("UPDATE login_codes SET used_at = ?2 WHERE email = ?1 AND used_at IS NULL").bind(email, now),
    DB.prepare("INSERT INTO login_codes (email, code_hash, attempts, expires_at, ip_hash, created_at) VALUES (?1, ?2, 0, ?3, ?4, ?5)")
      .bind(email, await codeHash(email, code, env), now + CODE_TTL, ipHash, now),
  ]);
  const sent = await send(env, { email, code, origin });
  if (!sent.ok) return err(502, "email-failed", "We couldn't send the email just now. Please try again in a minute.");
  return { ok: true, status: 200 };
}

/** Check a code and sign this device in. Returns a new device key for the account's player. */
export async function verifyLogin(env, DB, { email, code, playerId, playerToken, name, ipHash }) {
  email = cleanEmail(email);
  code = String(code || "").replace(/\D/g, "");
  if (!email || code.length !== 6) return err(422, "bad-code", "Enter the 6-digit code from the email.");
  await ensureAuthTables(DB);
  const now = Date.now();
  const row = await DB.prepare("SELECT id, code_hash, attempts, expires_at FROM login_codes WHERE email = ?1 AND used_at IS NULL ORDER BY id DESC LIMIT 1").bind(email).first();
  if (!row || row.expires_at < now || row.attempts >= CODE_ATTEMPTS) return err(401, "code-expired", "That code has expired. Ask for a new one.");
  if (row.code_hash !== await codeHash(email, code, env)) {
    await DB.prepare("UPDATE login_codes SET attempts = attempts + 1 WHERE id = ?1").bind(row.id).run();
    const left = CODE_ATTEMPTS - row.attempts - 1;
    return err(401, "wrong-code", left > 0 ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.` : "That code isn't right. Ask for a new one.");
  }
  const used = await DB.prepare("UPDATE login_codes SET used_at = ?2 WHERE id = ?1 AND used_at IS NULL").bind(row.id, now).run();
  if (used && used.meta && used.meta.changes === 0) return err(401, "code-expired", "That code was already used. Ask for a new one.");

  const here = playerId ? await authPlayer(DB, playerId, playerToken) : null;
  const account = await DB.prepare("SELECT player_id FROM accounts WHERE email = ?1").bind(email).first();
  let target, merged = false, created = false;
  if (account) {
    target = account.player_id;
    if (here && here.id !== target) {
      // this browser played before signing in: its scores join the account
      await DB.prepare("UPDATE scores SET player_id = ?2 WHERE player_id = ?1").bind(here.id, target).run().catch(() => {});
      merged = true;
    }
    await DB.prepare("UPDATE accounts SET last_login = ?2 WHERE player_id = ?1").bind(target, now).run();
  } else {
    if (here) target = here.id;
    else {
      const made = await createPlayer(env, DB, { name: name || "Player", ipHash });
      if (!made.ok) return made;
      target = made.playerId; created = true;
    }
    await DB.prepare("INSERT INTO accounts (player_id, email, created_at, last_login) VALUES (?1, ?2, ?3, ?3)").bind(target, email, now).run();
  }
  const token = randomHex(32);
  const stmts = [DB.prepare("INSERT INTO player_tokens (token_hash, player_id, created_at, last_used) VALUES (?1, ?2, ?3, ?3)").bind(await sha256Hex(token), target, now)];
  // the browser's original key is retired now that it has a device key
  if (here && here.id === target) stmts.push(DB.prepare("UPDATE players SET token_hash = ?2 WHERE id = ?1").bind(target, randomHex(32)));
  await DB.batch(stmts);
  const p = await DB.prepare("SELECT display_name FROM players WHERE id = ?1").bind(target).first();
  return { ok: true, status: 200, playerId: target, playerToken: token, name: p ? p.display_name : "Player", email, merged, created, existing: !!account };
}

/** Which email (if any) this player is signed in with. */
export async function accountFor(DB, playerId) {
  await ensureAuthTables(DB);
  const a = await DB.prepare("SELECT email FROM accounts WHERE player_id = ?1").bind(playerId).first();
  return a ? a.email : null;
}

/** Forget this device's key. */
export async function signOut(DB, playerId, playerToken) {
  await ensureAuthTables(DB);
  await DB.prepare("DELETE FROM player_tokens WHERE token_hash = ?1 AND player_id = ?2").bind(await sha256Hex(String(playerToken || "")), String(playerId || "")).run();
  return { ok: true, status: 200 };
}

/* ---------------- progress sync ----------------
 * Saved progress is a map of localStorage keys → values. Everything synced only ever grows
 * (XP, runs, bests, badges, score lists), so merging takes the larger number, the union of
 * lists and merges objects key by key. That way two devices never overwrite each other.
 */
export const SYNC_KEY_RE = /^(pa_pass_v1|ga_xp|es_meta_v1|wg_v1|nd_best|bb_best|dd_daily|pa_scores_[a-z0-9-]{1,40})$/;
const LIST_CAP = 60;

export function mergeValue(a, b) {
  if (a === undefined || a === null) return b;
  if (b === undefined || b === null) return a;
  if (typeof a === "number" && typeof b === "number") return Math.max(a, b);
  if (Array.isArray(a) && Array.isArray(b)) {
    const seen = new Set(), out = [];
    for (const v of [...a, ...b]) { const k = JSON.stringify(v); if (!seen.has(k)) { seen.add(k); out.push(v); } }
    if (out.length && out.every((v) => v && typeof v === "object" && typeof v.score === "number")) out.sort((x, y) => y.score - x.score);
    else if (out.every((v) => typeof v === "number")) out.sort((x, y) => x - y);
    return out.length > LIST_CAP ? (out.every((v) => typeof v === "number") ? out.slice(-LIST_CAP) : out.slice(0, LIST_CAP)) : out;
  }
  if (typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    const out = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out[k] = mergeValue(a[k], b[k]);
    return out;
  }
  return b; // different shapes or strings: the incoming device wins
}
export function mergeState(server, incoming) {
  const out = Object.assign({}, server);
  for (const [k, v] of Object.entries(incoming || {})) if (SYNC_KEY_RE.test(k)) out[k] = mergeValue(server[k], v);
  // the pass's "first played" is the earliest, not the latest
  if (server.pa_pass_v1 && incoming && incoming.pa_pass_v1 && out.pa_pass_v1) {
    const f = [server.pa_pass_v1.first, incoming.pa_pass_v1.first].filter((x) => typeof x === "number");
    if (f.length) out.pa_pass_v1.first = Math.min(...f);
  }
  return out;
}
export async function syncState(DB, playerId, incoming) {
  await ensureAuthTables(DB);
  const row = await DB.prepare("SELECT data FROM player_state WHERE player_id = ?1").bind(playerId).first();
  let server = {};
  try { server = row ? JSON.parse(row.data) || {} : {}; } catch { server = {}; }
  const merged = mergeState(server, incoming);
  const data = JSON.stringify(merged);
  if (data.length > STATE_MAX) return err(413, "too-large", "Saved progress is too large to sync.");
  if (!row || row.data !== data) {
    await DB.prepare("INSERT INTO player_state (player_id, data, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(player_id) DO UPDATE SET data = ?2, updated_at = ?3")
      .bind(playerId, data, Date.now()).run();
  }
  return { ok: true, status: 200, state: merged };
}

/* ---------------- the email ---------------- */
export async function sendCodeEmail(env, { email, code, origin }) {
  const site = /^https:\/\/([a-z0-9-]+\.)*promptarcade\.(games|pages\.dev)$/.test(origin || "") ? origin : "https://promptarcade.games";
  const link = `${site}/me/?signin=${code}&email=${encodeURIComponent(email)}`;
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:460px;margin:0 auto;padding:24px;color:#14142b">
<p style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#6b6b8a;margin:0 0 12px">PromptArcade</p>
<h1 style="font-size:22px;margin:0 0 12px">Your sign-in code</h1>
<p style="font-size:34px;font-weight:800;letter-spacing:.2em;margin:8px 0 18px">${code}</p>
<p style="margin:0 0 18px">Type it into PromptArcade, or tap the button to sign in on this device.</p>
<p style="margin:0 0 22px"><a href="${link}" style="display:inline-block;background:#5ef2ff;color:#05051a;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px">Sign in to PromptArcade</a></p>
<p style="font-size:13px;color:#6b6b8a;margin:0">The code works for 15 minutes. If you didn't ask for it, you can ignore this email.</p>
</div>`;
  const text = `Your PromptArcade sign-in code is ${code}\n\nOr open this link to sign in: ${link}\n\nThe code works for 15 minutes. If you didn't ask for it, you can ignore this email.`;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: env.AUTH_FROM || "PromptArcade <login@promptarcade.games>", to: [email], subject: `${code} is your PromptArcade code`, html, text })
    });
    if (!r.ok) console.error("resend", r.status, (await r.text()).slice(0, 300));
    return { ok: r.ok };
  } catch (e) {
    console.error("resend", e && e.message);
    return { ok: false };
  }
}
