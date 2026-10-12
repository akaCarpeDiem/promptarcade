// GET /api/scores → { ok, games: { slug: [top 10] }, total }  (Hall of Fame)
// Not edge-cached: a rename must show on every board immediately.
import { json, fail, store } from "../../_shared/scores.js";

export async function onRequestGet({ env }) {
  const S = store(env);
  if (!S) return fail(503, "scores-unavailable");
  const { games, total } = await S.all();
  return json({ ok: true, games, total }, 200, { "cache-control": "no-store", "x-pa-store": S.kind });
}

export function onRequest({ request }) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { allow: "GET, OPTIONS" } });
  return fail(405, "method-not-allowed", { allow: "GET, OPTIONS" });
}
