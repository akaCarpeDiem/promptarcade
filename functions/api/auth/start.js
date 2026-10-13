// POST /api/auth/start  ← { email }  → { ok }
// Emails a 6-digit sign-in code (and a one-tap link). Same answer whether or not the email has an account.
import { startLogin } from "../../_shared/auth.js";
import { clientHash, readJson } from "../../_shared/players.js";
import { json, fail } from "../../_shared/scores.js";

export async function onRequestPost({ env, request }) {
  const DB = env.SCORES;
  if (!DB || typeof DB.prepare !== "function") return fail(503, "auth-unavailable");
  const parsed = await readJson(request);
  if (!parsed.ok) return json({ ok: false, error: parsed.error, message: parsed.message }, parsed.status);
  const origin = new URL(request.url).origin;
  const r = await startLogin(env, DB, { email: parsed.body.email, ipHash: await clientHash(request, env), origin });
  if (!r.ok) return json({ ok: false, error: r.error, message: r.message }, r.status);
  return json({ ok: true });
}

export function onRequest() {
  return fail(405, "method-not-allowed", { allow: "POST" });
}
