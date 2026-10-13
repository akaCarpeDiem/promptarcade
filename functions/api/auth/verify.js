// POST /api/auth/verify  ← { email, code, playerId?, playerToken?, name? }
//   → { ok, playerId, playerToken, name, email, merged, created, existing }
// Signs this device in. If the browser already had a player, that player becomes the account
// (first sign-in) or its scores move onto the account (signing in to an existing account).
import { verifyLogin } from "../../_shared/auth.js";
import { clientHash, readJson } from "../../_shared/players.js";
import { json, fail } from "../../_shared/scores.js";

export async function onRequestPost({ env, request }) {
  const DB = env.SCORES;
  if (!DB || typeof DB.prepare !== "function") return fail(503, "auth-unavailable");
  const parsed = await readJson(request);
  if (!parsed.ok) return json({ ok: false, error: parsed.error, message: parsed.message }, parsed.status);
  const b = parsed.body;
  const r = await verifyLogin(env, DB, { email: b.email, code: b.code, playerId: b.playerId, playerToken: b.playerToken, name: b.name, ipHash: await clientHash(request, env) });
  if (!r.ok) return json({ ok: false, error: r.error, message: r.message }, r.status);
  const { status, ok, ...out } = r;
  return json({ ok: true, ...out });
}

export function onRequest() {
  return fail(405, "method-not-allowed", { allow: "POST" });
}
