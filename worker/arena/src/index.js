/* Glowline Arena — Cloudflare Worker + Durable Object.
 * One DO instance ("lobby") runs the authoritative 20 Hz simulation for everyone connected.
 * The game client connects to wss://arena.promptarcade.games/room and falls back to an
 * offline bot match by itself if this Worker is missing, full or unreachable.
 * Clients that ask for /room?v=2 get a separate DO ("lobby2") running the upgraded rules and
 * nearby-only frames; everyone else stays in the original "lobby", unchanged.
 */
import { Room } from "../../../src/play/arena/room.js";
import { regexCheck } from "../../../functions/_shared/namemod.js";

const nameBlocked = (n) => regexCheck(n).block;

const ALLOWED = [/^https:\/\/(www\.)?promptarcade\.games$/, /^https:\/\/[a-z0-9-]+\.promptarcade\.pages\.dev$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];

export class ArenaRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.room = null;
  }
  async fetch(request) {
    if (request.headers.get("Upgrade") !== "websocket") return new Response("Expected WebSocket", { status: 426 });
    if (!this.room) {
      const v2 = new URL(request.url).searchParams.get("v") === "2";
      this.room = new Room({ bots: Number(this.env.ARENA_BOTS || 14), proto: v2 ? 2 : 1, nameBlocked });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    const h = this.room.connect({
      send: (d) => server.send(d),
      close: (code, reason) => { try { server.close(code || 1000, reason || ""); } catch (e) {} }
    });
    server.addEventListener("message", (e) => h.message(e.data));
    server.addEventListener("close", () => h.close());
    server.addEventListener("error", () => h.close());
    return new Response(null, { status: 101, webSocket: client });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") return new Response("ok", { headers: { "content-type": "text/plain" } });
    if (url.pathname !== "/room") return new Response("Not found", { status: 404 });
    const origin = request.headers.get("Origin") || "";
    if (origin && !ALLOWED.some((r) => r.test(origin))) return new Response("Forbidden", { status: 403 });
    const id = env.ARENA.idFromName(url.searchParams.get("v") === "2" ? "lobby2" : "lobby");
    return env.ARENA.get(id).fetch(request);
  }
};
