// Local Glowline Arena server for development and tests — the same Room the Durable Object runs,
// behind a tiny dependency-free WebSocket implementation (RFC 6455, unfragmented frames only).
// usage: node scripts/arena-dev.mjs [port]
import http from "node:http";
import crypto from "node:crypto";
import { Room } from "../src/play/arena/room.js";

const port = +(process.argv[2] || 5191);
const room = new Room({ bots: +(process.env.BOTS || 14) });
const room2 = new Room({ bots: +(process.env.BOTS || 14), proto: 2, modifier: process.env.MOD === undefined ? undefined : process.env.MOD || null });

function frame(data) {
  const bin = typeof data !== "string";
  const payload = bin ? Buffer.from(data) : Buffer.from(data, "utf8");
  const n = payload.length;
  const head = n < 126 ? Buffer.from([bin ? 0x82 : 0x81, n]) : n < 65536 ? Buffer.from([bin ? 0x82 : 0x81, 126, n >> 8, n & 255]) : (() => { const b = Buffer.alloc(10); b[0] = bin ? 0x82 : 0x81; b[1] = 127; b.writeBigUInt64BE(BigInt(n), 2); return b; })();
  return Buffer.concat([head, payload]);
}

const server = http.createServer((req, res) => { res.writeHead(200, { "content-type": "text/plain" }); res.end("glowline arena dev\n"); });
server.on("upgrade", (req, socket) => {
  const key = req.headers["sec-websocket-key"];
  const accept = crypto.createHash("sha1").update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
  socket.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + accept + "\r\n\r\n");
  let closed = false;
  const sock = {
    send(d) { if (!closed) socket.write(frame(d)); },
    close() { if (!closed) { closed = true; try { socket.end(Buffer.from([0x88, 0])); } catch (e) {} } }
  };
  const h = (/[?&]v=2\b/.test(req.url) ? room2 : room).connect(sock);
  let buf = Buffer.alloc(0);
  socket.on("data", (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length >= 2) {
      const op = buf[0] & 15, masked = buf[1] & 128;
      let len = buf[1] & 127, off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
      const need = off + (masked ? 4 : 0) + len;
      if (buf.length < need) return;
      let payload = buf.subarray(off + (masked ? 4 : 0), need);
      if (masked) { const m = buf.subarray(off, off + 4); payload = Buffer.from(payload.map((b, i) => b ^ m[i & 3])); }
      buf = buf.subarray(need);
      if (op === 8) { closed = true; socket.end(); h.close(); return; }
      if (op === 9) { socket.write(Buffer.concat([Buffer.from([0x8a, payload.length]), payload])); continue; }
      if (op === 1) h.message(payload.toString("utf8"));
      else if (op === 2) h.message(payload);
    }
  });
  socket.on("close", () => { closed = true; h.close(); });
  socket.on("error", () => { closed = true; h.close(); });
});
server.listen(port, "127.0.0.1", () => console.log("arena dev server ws://127.0.0.1:" + port));
