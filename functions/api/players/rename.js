// POST /api/players/rename  ← { playerId, playerToken, name }  → { ok, name, previous }
// Every score that player owns shows the new name immediately (boards JOIN players).
import { renamePlayer, clientHash, readJson } from "../../_shared/players.js";
import { json, fail } from "../../_shared/scores.js";

export async function onRequestPost({ env, request }) {
  const DB = env.SCORES;
  if (!DB || typeof DB.prepare !== "function") return fail(503, "players-unavailable");
  const parsed = await readJson(request);
  if (!parsed.ok) return json({ ok: false, error: parsed.error, message: parsed.message }, parsed.status);
  const b = parsed.body;
  const r = await renamePlayer(env, DB, { id: b.playerId, token: b.playerToken, name: b.name, ipHash: await clientHash(request, env) });
  if (!r.ok) return json({ ok: false, error: r.error, message: r.message }, r.status);
  return json({ ok: true, name: r.name, previous: r.previous || r.name, unchanged: !!r.unchanged });
}

export function onRequest() {
  return fail(405, "method-not-allowed", { allow: "POST" });
}
