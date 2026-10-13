// POST /api/account/sync  ← { playerId, playerToken, state? }  → { ok, email, name, state }
// For a signed-in player: merges this device's progress with the account's and returns the result.
// Without an email on the player it only answers who you are (email: null).
import { accountFor, syncState, STATE_MAX } from "../../_shared/auth.js";
import { authPlayer, readJson } from "../../_shared/players.js";
import { json, fail } from "../../_shared/scores.js";

export async function onRequestPost({ env, request }) {
  const DB = env.SCORES;
  if (!DB || typeof DB.prepare !== "function") return fail(503, "auth-unavailable");
  const parsed = await readJson(request, STATE_MAX + 1024);
  if (!parsed.ok) return json({ ok: false, error: parsed.error, message: parsed.message }, parsed.status);
  const b = parsed.body;
  const p = await authPlayer(DB, b.playerId, b.playerToken);
  if (!p) return json({ ok: false, error: "bad-player" }, 401);
  const email = await accountFor(DB, p.id);
  if (!email) return json({ ok: true, email: null, name: p.display_name });
  const incoming = b.state && typeof b.state === "object" && !Array.isArray(b.state) ? b.state : {};
  const r = await syncState(DB, p.id, incoming);
  if (!r.ok) return json({ ok: false, error: r.error, message: r.message }, r.status);
  return json({ ok: true, email, name: p.display_name, state: r.state });
}

export function onRequest() {
  return fail(405, "method-not-allowed", { allow: "POST" });
}
