/* Glowline Arena wire format. One binary frame per server tick; rare events ride along as JSON.
 * frame: u8 kind(1) | u32 tick | u16 nHeads × [u16 id, f32 x, f32 y, i16 angle*1e4, f32 mass, u8 flags]
 *        | u16 nEat × [u32 food, u16 eater] | u16 nFood × [u32 id, i16 x, i16 y, u8 value, u8 color]
 *        | u32 jsonBytes | utf8 JSON {add, del, lb}
 */
const enc = new TextEncoder();
const dec = new TextDecoder();

export function encodeFrame(ev) {
  const extra = {};
  if (ev.add.length) extra.add = ev.add;
  if (ev.del.length) extra.del = ev.del;
  if (ev.lb) extra.lb = ev.lb;
  const js = Object.keys(extra).length ? enc.encode(JSON.stringify(extra)) : new Uint8Array(0);
  const size = 1 + 4 + 2 + ev.heads.length * 17 + 2 + ev.eat.length * 6 + 2 + ev.food.length * 10 + 4 + js.length;
  const buf = new ArrayBuffer(size);
  const v = new DataView(buf);
  let o = 0;
  v.setUint8(o, 1); o += 1;
  v.setUint32(o, ev.tick); o += 4;
  v.setUint16(o, ev.heads.length); o += 2;
  for (const h of ev.heads) {
    v.setUint16(o, h[0]); v.setFloat32(o + 2, h[1]); v.setFloat32(o + 6, h[2]);
    v.setInt16(o + 10, Math.round(h[3] * 10000)); v.setFloat32(o + 12, h[4]); v.setUint8(o + 16, h[5]);
    o += 17;
  }
  v.setUint16(o, ev.eat.length); o += 2;
  for (const e of ev.eat) { v.setUint32(o, e[0]); v.setUint16(o + 4, e[1]); o += 6; }
  v.setUint16(o, ev.food.length); o += 2;
  for (const f of ev.food) {
    v.setUint32(o, f[0]); v.setInt16(o + 4, f[1]); v.setInt16(o + 6, f[2]); v.setUint8(o + 8, f[3]); v.setUint8(o + 9, f[4]);
    o += 10;
  }
  v.setUint32(o, js.length); o += 4;
  new Uint8Array(buf, o, js.length).set(js);
  return buf;
}

export function decodeFrame(buf) {
  const v = new DataView(buf);
  let o = 0;
  if (v.getUint8(o) !== 1) return null;
  o += 1;
  const ev = { tick: v.getUint32(o), heads: [], eat: [], food: [], add: [], del: [], lb: null };
  o += 4;
  const nh = v.getUint16(o); o += 2;
  for (let i = 0; i < nh; i++) {
    ev.heads.push([v.getUint16(o), v.getFloat32(o + 2), v.getFloat32(o + 6), v.getInt16(o + 10) / 10000, v.getFloat32(o + 12), v.getUint8(o + 16)]);
    o += 17;
  }
  const ne = v.getUint16(o); o += 2;
  for (let i = 0; i < ne; i++) { ev.eat.push([v.getUint32(o), v.getUint16(o + 4)]); o += 6; }
  const nf = v.getUint16(o); o += 2;
  for (let i = 0; i < nf; i++) {
    ev.food.push([v.getUint32(o), v.getInt16(o + 4), v.getInt16(o + 6), v.getUint8(o + 8), v.getUint8(o + 9)]);
    o += 10;
  }
  const jl = v.getUint32(o); o += 4;
  if (jl) {
    const extra = JSON.parse(dec.decode(new Uint8Array(buf, o, jl)));
    if (extra.add) ev.add = extra.add;
    if (extra.del) ev.del = extra.del;
    if (extra.lb) ev.lb = extra.lb;
  }
  return ev;
}
