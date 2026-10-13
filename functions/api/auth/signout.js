// POST /api/auth/signout  ← { playerId, playerToken }  → { ok }
// Forgets this device's key. Progress stays saved on the account.
import { signOut } from "../../_shared/auth.js";
import { readJson } from "../../_shared/players.js";
import { json, fail } from "../../_shared/scores.js";

export async function onRequestPost({ env, request }) {
  const DB = env.SCORES;
  if (!DB || typeof DB.prepare !== "function") return fail(503, "auth-unavailable");
  const parsed = await readJson(request);
  if (!parsed.ok) return json({ ok: false, error: parsed.error }, parsed.status);
  await signOut(DB, parsed.body.playerId, parsed.body.playerToken);
  return json({ ok: true });
}

export function onRequest() {
  return fail(405, "method-not-allowed", { allow: "POST" });
}
