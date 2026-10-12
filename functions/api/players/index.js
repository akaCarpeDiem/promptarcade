// POST /api/players  ← { name }  → 201 { ok, playerId, playerToken, name }
// Creates a player identity for this browser. The token is shown once; only its hash is stored.
import { createPlayer, clientHash, readJson } from "../../_shared/players.js";
import { json, fail } from "../../_shared/scores.js";

export async function onRequestPost({ env, request }) {
  const DB = env.SCORES;
  if (!DB || typeof DB.prepare !== "function") return fail(503, "players-unavailable");
  const parsed = await readJson(request);
  if (!parsed.ok) return json({ ok: false, error: parsed.error, message: parsed.message }, parsed.status);
  const r = await createPlayer(env, DB, { name: parsed.body.name, ipHash: await clientHash(request, env) });
  if (!r.ok) return json({ ok: false, error: r.error, message: r.message }, r.status);
  return json({ ok: true, playerId: r.playerId, playerToken: r.playerToken, name: r.name }, 201);
}

export function onRequest() {
  return fail(405, "method-not-allowed", { allow: "POST" });
}
