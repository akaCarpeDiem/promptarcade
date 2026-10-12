// GET  /api/scores/:slug  → { ok, game, top: [{id, pid?, name, score, at}], total }
// POST /api/scores/:slug  ← { score, playerId?, playerToken?, name? }  → { ok, id, rank, top, saved, name }
// With a valid player the run is stored under that player (the board shows the player's
// current name). Without one (older cached clients) the typed name is moderated and stored as
// an anonymous legacy row. Storage: D1 (SCORES) or KV (SCORES_KV); see _shared/scores.js.
import { json, fail, gameFor, store, cleanScore, clientHash } from "../../_shared/scores.js";
import { authPlayer, ensureIdentityTables, readJson } from "../../_shared/players.js";
import { moderateName, regexCheck, cleanDisplayName, BLOCKED_MESSAGE } from "../../_shared/namemod.js";

export async function onRequestGet({ params, env }) {
  const slug = String(params.slug || "");
  if (!gameFor(slug)) return fail(404, "unknown-game");
  const S = store(env);
  if (!S) return fail(503, "scores-unavailable");
  const { top, total } = await S.top(slug);
  return json({ ok: true, game: slug, top, total }, 200, { "cache-control": "no-store", "x-pa-store": S.kind });
}

export async function onRequestPost({ params, env, request }) {
  const slug = String(params.slug || "");
  const game = gameFor(slug);
  if (!game) return fail(404, "unknown-game");
  const S = store(env);
  if (!S) return fail(503, "scores-unavailable");

  const parsed = await readJson(request);
  if (!parsed.ok) return fail(parsed.status, parsed.error);
  const body = parsed.body;
  const score = cleanScore(body.score, game.cap);
  if (score === null) return fail(422, "bad-score");
  const hash = await clientHash(request, env);

  let name, playerId = null, hidden = 0;
  if (body.playerId && S.kind === "d1") {
    await ensureIdentityTables(S.db);
    const player = await authPlayer(S.db, body.playerId, body.playerToken);
    if (!player) return json({ ok: false, error: "bad-player" }, 401, { "x-pa-store": S.kind });
    name = player.display_name;
    playerId = player.id;
    hidden = player.hidden ? 1 : 0;
  } else if (S.kind === "d1") {
    await ensureIdentityTables(S.db);
    const mod = await moderateName(env, S.db, body.name, { ipHash: hash });
    if (!mod.ok) return json({ ok: false, error: mod.error, message: mod.message }, mod.status, { "x-pa-store": S.kind });
    name = mod.name;
  } else {
    name = cleanDisplayName(body.name);
    if (!name) return fail(422, "bad-name");
    if (regexCheck(name).block) return json({ ok: false, error: "name-blocked", message: BLOCKED_MESSAGE }, 422);
  }

  const r = await S.submit({ slug, name, score, hash, now: Date.now(), playerId, hidden });
  if (r.limited) return fail(429, "slow-down", { "retry-after": "5", "x-pa-store": S.kind });
  return json({ ok: true, game: slug, id: r.id, rank: r.rank, top: r.top, saved: r.saved, name, pid: playerId || undefined },
    r.saved ? 201 : 200, { "x-pa-store": S.kind });
}

export function onRequest({ request }) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { allow: "GET, POST, OPTIONS" } });
  return fail(405, "method-not-allowed", { allow: "GET, POST, OPTIONS" });
}
