// POST /api/players/me  ← { playerId, playerToken }  → { ok, playerId, name } | 401
import { authPlayer, ensureIdentityTables, readJson } from "../../_shared/players.js";
import { json, fail } from "../../_shared/scores.js";

export async function onRequestPost({ env, request }) {
  const DB = env.SCORES;
  if (!DB || typeof DB.prepare !== "function") return fail(503, "players-unavailable");
  const parsed = await readJson(request);
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, parsed.status);
  await ensureIdentityTables(DB);
  const p = await authPlayer(DB, parsed.body.playerId, parsed.body.playerToken);
  if (!p) return json({ ok: false, error: "bad-player" }, 401);
  return json({ ok: true, playerId: p.id, name: p.display_name });
}

export function onRequest() {
  return fail(405, "method-not-allowed", { allow: "POST" });
}
