/* Glowline Arena wire format. One binary frame per server tick; rare events ride along as JSON.
 * v1 (legacy room, everyone gets everything):
 * frame: u8 kind(1) | u32 tick | u16 nHeads × [u16 id, f32 x, f32 y, i16 angle*1e4, f32 mass, u8 flags]
 *        | u16 nEat × [u32 food, u16 eater] | u16 nFood × [u32 id, i16 x, i16 y, u8 value, u8 color]
 *        | u32 jsonBytes | utf8 JSON {add, del, lb}
 * v2 (upgrade room, each player gets only the snakes near them):
 * frame: u8 kind(2) | u32 tick | u16 nHeads × [u16 id, i16 x*8, i16 y*8, i16 angle*1e4, u16 mass*2, u8 flags]
 *        | eat and food as v1 | u32 jsonBytes | utf8 JSON {add, enter, leave, del, lb, map, x, me}
 *   add   = metadata of new snakes (everyone), enter = full bodies of snakes coming into view,
 *   leave = ids leaving view, map = [id, x, y, mass] of every snake for the minimap (every 10 ticks),
 *   x = rare events (evolutions, portals, abilities…), me = the owner's own timers when they change.
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

/* ---------------- v2: interest management ---------------- */
export const VIEW_R = 1900;        // heads within this distance of you are sent…
export const VIEW_R_WIDE = 2500;   // …further while you hold a Lens or are a Firefly
const HYST = 300;                  // and they stay until they are this much further away

export function makeViewer() { return { known: new Set(), cx: 0, cy: 0, last: "" }; }

/** Build the frame one player should see from the tick's events. Pure: also used by offline play. */
export function viewFor(sim, ev, vw, meId) {
  const me = meId ? sim.snakes.get(meId) : null;
  const cx = me ? me.x : vw.cx, cy = me ? me.y : vw.cy;
  const wide = me && (me.lensUntil > sim.tick || me.evo === 7);
  const R = wide ? VIEW_R_WIDE : VIEW_R;
  const out = { tick: ev.tick, heads: [], eat: ev.eat, food: ev.food, add: [], enter: [], leave: [], del: ev.del, lb: ev.lb, map: null, x: ev.x || [], me: null };
  for (const d of ev.add) { const m = Object.assign({}, d); delete m.pts; delete m.a; out.add.push(m); }
  for (const d of ev.del) vw.known.delete(d[0]);
  for (const s of sim.snakes.values()) {
    const dd = (s.x - cx) ** 2 + (s.y - cy) ** 2;
    const known = vw.known.has(s.id);
    const lim = known ? R + HYST : R;
    if (dd < lim * lim || s.id === meId) {
      if (!known) { vw.known.add(s.id); out.enter.push(sim.describe(s)); }
    } else if (known) { vw.known.delete(s.id); out.leave.push(s.id); }
  }
  for (const h of ev.heads) if (vw.known.has(h[0])) out.heads.push(h);
  if (ev.tick % 10 === 0) {
    out.map = [];
    for (const s of sim.snakes.values()) out.map.push([s.id, Math.round(s.x), Math.round(s.y), Math.round(s.m)]);
  }
  if (me && sim.status) {
    const st = sim.status(me), key = st.join(",");
    if (key !== vw.last) { vw.last = key; out.me = st; }
  } else if (!me) vw.last = "";
  return out;
}

const clampI16 = (v) => Math.max(-32768, Math.min(32767, Math.round(v)));

export function encodeFrame2(vf) {
  const extra = {};
  for (const k of ["add", "enter", "leave", "del", "x"]) if (vf[k] && vf[k].length) extra[k] = vf[k];
  if (vf.lb) extra.lb = vf.lb;
  if (vf.map) extra.map = vf.map;
  if (vf.me) extra.me = vf.me;
  const js = Object.keys(extra).length ? enc.encode(JSON.stringify(extra)) : new Uint8Array(0);
  const size = 1 + 4 + 2 + vf.heads.length * 11 + 2 + vf.eat.length * 6 + 2 + vf.food.length * 10 + 4 + js.length;
  const buf = new ArrayBuffer(size);
  const v = new DataView(buf);
  let o = 0;
  v.setUint8(o, 2); o += 1;
  v.setUint32(o, vf.tick); o += 4;
  v.setUint16(o, vf.heads.length); o += 2;
  for (const h of vf.heads) {
    v.setUint16(o, h[0]); v.setInt16(o + 2, clampI16(h[1] * 8)); v.setInt16(o + 4, clampI16(h[2] * 8));
    v.setInt16(o + 6, Math.round(h[3] * 10000)); v.setUint16(o + 8, Math.min(65535, Math.round(h[4] * 2))); v.setUint8(o + 10, h[5]);
    o += 11;
  }
  v.setUint16(o, vf.eat.length); o += 2;
  for (const e of vf.eat) { v.setUint32(o, e[0]); v.setUint16(o + 4, e[1]); o += 6; }
  v.setUint16(o, vf.food.length); o += 2;
  for (const f of vf.food) {
    v.setUint32(o, f[0]); v.setInt16(o + 4, f[1]); v.setInt16(o + 6, f[2]); v.setUint8(o + 8, Math.min(255, f[3])); v.setUint8(o + 9, f[4]);
    o += 10;
  }
  v.setUint32(o, js.length); o += 4;
  new Uint8Array(buf, o, js.length).set(js);
  return buf;
}

export function decodeFrame2(buf) {
  const v = new DataView(buf);
  let o = 0;
  if (v.getUint8(o) !== 2) return null;
  o += 1;
  const vf = { tick: v.getUint32(o), heads: [], eat: [], food: [], add: [], enter: [], leave: [], del: [], lb: null, map: null, x: [], me: null };
  o += 4;
  const nh = v.getUint16(o); o += 2;
  for (let i = 0; i < nh; i++) {
    vf.heads.push([v.getUint16(o), v.getInt16(o + 2) / 8, v.getInt16(o + 4) / 8, v.getInt16(o + 6) / 10000, v.getUint16(o + 8) / 2, v.getUint8(o + 10)]);
    o += 11;
  }
  const ne = v.getUint16(o); o += 2;
  for (let i = 0; i < ne; i++) { vf.eat.push([v.getUint32(o), v.getUint16(o + 4)]); o += 6; }
  const nf = v.getUint16(o); o += 2;
  for (let i = 0; i < nf; i++) {
    vf.food.push([v.getUint32(o), v.getInt16(o + 4), v.getInt16(o + 6), v.getUint8(o + 8), v.getUint8(o + 9)]);
    o += 10;
  }
  const jl = v.getUint32(o); o += 4;
  if (jl) Object.assign(vf, JSON.parse(dec.decode(new Uint8Array(buf, o, jl))));
  return vf;
}
