/* Glowline Arena — shared drawing: palettes, body strokes, pellet sprites and the animated guides.
 * The game and the guide loops both draw with strokeBody(), so a guide looks exactly like a match.
 */
const TAU = Math.PI * 2;

/* 12 original skins (always unlocked) + 8 unlockable ones. None reuses an evolution palette. */
export const SKIN = [
  ["#5ef2ff", "#1b6dff", "#bff9ff"], ["#ff5ca8", "#8a2be2", "#ffc2e0"], ["#ffd84d", "#ff7a1a", "#fff3b8"],
  ["#5dff9e", "#00a37a", "#c9ffe0"], ["#c77dff", "#3b1dff", "#ead4ff"], ["#ff6b6b", "#7a1030", "#ffd0d0"],
  ["#ffffff", "#5ef2ff", "#ffffff"], ["#ff9f43", "#2e1a47", "#ffd9b0"], ["#00ffd5", "#ff00a0", "#c9fff5"],
  ["#a3ff3c", "#1f5f00", "#e6ffc9"], ["#6ea8ff", "#ffffff", "#d6e5ff"], ["#ff3df2", "#00e1ff", "#ffd0fb"],
  ["#3fd0c9", "#0d2f5a", "#c8fbf6"], ["#8affc1", "#9b5cff", "#e3fff1"], ["#d6e2ff", "#2c3e8f", "#ffffff"], ["#ff8fa3", "#ffe3ea", "#fff1f4"],
  ["#4de1ff", "#ff9ef0", "#e4fbff"], ["#b9f3ff", "#5f8dff", "#ffffff"], ["#f6c1ff", "#4b2a7a", "#fff0ff"], ["#9cf0ff", "#123e3a", "#e6fffd"]
];
export const SKIN_NAMES = ["Glacier", "Orchid", "Sunrise", "Mint", "Ultraviolet", "Ruby", "Whiteout", "Dusk", "Arcade", "Lime", "Sky", "Prism",
  "Tide", "Aurora", "Frost", "Rose", "Cotton Candy", "Glass", "Lilac", "Lagoon"];
export const SKIN_XP = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000];
export const TRAILS = [["None", 0], ["Sparks", 2500], ["Petals", 5000], ["Pixels", 7500]];
export const BURSTS = [["Classic", 0], ["Firework", 4000], ["Glitch", 8000], ["Bloom", 12000]];
export const FRAMES = [["None", 0], ["Bronze", 5000], ["Silver", 15000], ["Gold", 40000], ["Neon", 100000]];
export const BOOSTS = [["Classic", 0], ["Synth whoosh", 3000], ["Chime", 6000], ["Bass drop", 9000]];
export const FRAME_COL = ["", "#d08a4a", "#cfd8e6", "#ffd84d", "#ff3df2"];

/* evolutions: reserved palettes + a shape cue each */
export const EVO_PAL = [null,
  ["#9dff3c", "#6a1fd1", "#e8ffc4"], // Viper: green-violet scales
  ["#d9a441", "#5a3410", "#ffe6a8"], // Constrictor: wide bands
  ["#7ff3ff", "#1a3d8f", "#e0fdff"], // Eel: ripple
  ["#ff7ad9", "#4a0f5c", "#ffd6f3"], // Split-tail: forked tail
  ["#ff4d4d", "#3d4dff", "#ffd6d6"], // Magnet: field ring
  ["#ffb347", "#ff3d00", "#fff0c2"], // Comet: flame streak
  ["#fff59a", "#3a7a1f", "#ffffe0"]  // Firefly: soft glow
];
export const EVO_GLYPH = ["", "◆", "■", "≈", "Ψ", "◎", "»", "✦"];
export const EVO_NAMES = ["", "Viper", "Constrictor", "Eel", "Split-tail", "Magnet", "Comet", "Firefly"];
export const EVO_TEXT = ["",
  "Boosting leaves a poison trail that slows and drains.",
  "A thicker body for deadly circles. Turns slower.",
  "Double-tap boost to phase through bodies for a moment.",
  "Double-tap boost to drop your tail as a decoy.",
  "Pulls food from further away. Power-ups won't come.",
  "Double-tap boost for a straight-line dash.",
  "You see further, but you blink on everyone's map."
];
export const PK_NAMES = ["", "Surge", "Ward", "Lens", "Key", "Evolution", "Bounty"];
export const PK_TEXT = ["", "Free boost for four seconds", "One free bump", "See further for a while", "Your next portal is free", "Triggers a random evolution", "The fallen leader's prize"];
export const PK_COL = ["", "#ffe14d", "#5ef2ff", "#b98cff", "#ffc94d", "#ffffff", "#ff4d6d"];

/** Stroke a body polyline (head first: [x0,y0,x1,y1,...]) in the game's style. */
export function strokeBody(g, path, pal, r, o = {}) {
  if (path.length < 4) return;
  const evo = o.evo || 0, t = o.t || 0;
  g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath();
  g.moveTo(path[path.length - 2], path[path.length - 1]);
  for (let i = path.length - 4; i >= 0; i -= 2) g.lineTo(path[i], path[i + 1]);
  const a0 = o.alpha == null ? 1 : o.alpha;
  if (o.glow !== false) {
    g.globalCompositeOperation = "lighter";
    g.strokeStyle = pal[0];
    let ga = o.boost ? 0.32 + Math.sin(t * 30) * 0.08 : 0.12;
    if (evo === 7) ga = 0.22 + Math.sin(t * 3) * 0.12;
    g.globalAlpha = ga * a0;
    g.lineWidth = r * (o.boost ? 3.4 : evo === 7 ? 3.8 : 2.8);
    g.stroke();
    g.globalCompositeOperation = "source-over";
  }
  if (o.dashed) {
    g.globalAlpha = 0.8 * a0;
    g.setLineDash([r * 0.9, r * 0.7]); g.strokeStyle = pal[0]; g.lineWidth = 2.5;
    g.lineDashOffset = -t * 40;
    // outline only: two thin strokes either side read as a hollow body
    g.lineWidth = r * 2; g.globalAlpha = 0.18 * a0; g.setLineDash([]); g.stroke();
    g.globalAlpha = 0.9 * a0; g.lineWidth = 3; g.setLineDash([r * 0.8, r * 0.6]); g.stroke();
    g.setLineDash([]); g.globalAlpha = 1;
    return;
  }
  g.globalAlpha = a0;
  g.strokeStyle = "rgba(0,0,0,.55)"; g.lineWidth = r * 2 + 3; g.stroke();
  g.strokeStyle = pal[0]; g.lineWidth = r * 2; g.stroke();
  // pattern: travelling stripes, shaped per evolution so evolved snakes read at a glance
  const off = -(o.offset || 0);
  if (evo === 1) { g.setLineDash([r * 0.55, r * 0.45]); g.lineWidth = r * 1.2; }        // scales
  else if (evo === 2) { g.setLineDash([r * 0.7, r * 1.1]); g.lineWidth = r * 2; }       // full-width bands
  else if (evo === 3) { g.setLineDash([r * 2.2, r * 0.6]); g.lineWidth = r * 0.9; }     // long ripples
  else if (evo === 7) { g.setLineDash([r * 0.35, r * 1.6]); g.lineWidth = r * 1.5; }    // spots
  else { g.setLineDash([r * 1.1, r * 1.3]); g.lineWidth = r * 1.35; }
  g.lineDashOffset = off + (evo === 3 ? Math.sin(t * 6) * r : 0);
  g.strokeStyle = pal[1]; g.globalAlpha = 0.85 * a0; g.stroke();
  g.setLineDash([]);
  g.globalAlpha = 0.5 * a0; g.strokeStyle = pal[2]; g.lineWidth = r * 0.35; g.stroke();
  g.globalAlpha = 1;
  if (evo === 4) {
    // forked tail
    const n = path.length, tx = path[n - 2], ty = path[n - 1], px = path[Math.max(0, n - 6)], py = path[Math.max(1, n - 5)];
    const a = Math.atan2(ty - py, tx - px);
    g.strokeStyle = pal[0]; g.lineWidth = r * 0.7; g.globalAlpha = a0;
    for (const s of [-0.6, 0.6]) { g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx + Math.cos(a + s) * r * 2, ty + Math.sin(a + s) * r * 2); g.stroke(); }
    g.globalAlpha = 1;
  }
}

/** Draw a head at (x,y) facing a. */
export function drawHead(g, x, y, a, r, pal, look = 0, alpha = 1) {
  g.save();
  g.translate(x, y); g.rotate(a); g.globalAlpha = alpha;
  g.fillStyle = pal[0];
  g.beginPath(); g.ellipse(r * 0.15, 0, r * 1.12, r * 1.02, 0, 0, TAU); g.fill();
  for (const side of [-1, 1]) {
    const ex = r * 0.45, ey = side * r * 0.48;
    g.fillStyle = "#fff"; g.beginPath(); g.arc(ex, ey, r * 0.38, 0, TAU); g.fill();
    g.fillStyle = "#0a0a14"; g.beginPath(); g.arc(ex + Math.cos(look) * r * 0.16, ey + Math.sin(look) * r * 0.16, r * 0.2, 0, TAU); g.fill();
  }
  g.restore();
}

/** One 64×64 sprite per pellet kind (index = kind), drawn once and stamped every frame. */
export function pelletSprites() {
  const out = [null];
  for (let k = 1; k <= 6; k++) {
    const s = document.createElement("canvas"); s.width = s.height = 64;
    const g = s.getContext("2d"), c = PK_COL[k];
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, c + "aa"); gr.addColorStop(0.5, c + "33"); gr.addColorStop(1, c + "00");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    g.translate(32, 32);
    g.strokeStyle = c; g.fillStyle = c; g.lineWidth = 3.5; g.lineJoin = "round"; g.lineCap = "round";
    if (k === 1) { // Surge: double chevron
      for (const dx of [-6, 5]) { g.beginPath(); g.moveTo(dx - 6, -10); g.lineTo(dx + 4, 0); g.lineTo(dx - 6, 10); g.stroke(); }
    } else if (k === 2) { // Ward: hexagon ring
      g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.lineTo(Math.cos(a) * 12, Math.sin(a) * 12); } g.closePath(); g.stroke();
      g.globalAlpha = 0.35; g.fill(); g.globalAlpha = 1;
    } else if (k === 3) { // Lens: eye
      g.beginPath(); g.moveTo(-14, 0); g.quadraticCurveTo(0, -12, 14, 0); g.quadraticCurveTo(0, 12, -14, 0); g.stroke();
      g.beginPath(); g.arc(0, 0, 4.5, 0, TAU); g.fill();
    } else if (k === 4) { // Key: keyhole
      g.beginPath(); g.arc(0, -4, 6, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(-4, 0); g.lineTo(4, 0); g.lineTo(6, 11); g.lineTo(-6, 11); g.closePath(); g.fill();
    } else if (k === 5) { // Evolution: prism
      g.fillStyle = "#ffffff";
      g.beginPath(); g.moveTo(0, -16); g.lineTo(12, 0); g.lineTo(0, 16); g.lineTo(-12, 0); g.closePath(); g.fill();
      g.fillStyle = "#b98cff"; g.globalAlpha = 0.6; g.beginPath(); g.moveTo(0, -16); g.lineTo(12, 0); g.lineTo(0, 0); g.closePath(); g.fill();
      g.fillStyle = "#5ef2ff"; g.beginPath(); g.moveTo(0, 16); g.lineTo(-12, 0); g.lineTo(0, 0); g.closePath(); g.fill(); g.globalAlpha = 1;
    } else if (k === 6) { // Bounty: star cluster
      const star = (cx, cy, R) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? R * 0.45 : R; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath(); g.fill(); };
      star(0, -2, 12); star(-11, 9, 5); star(11, 9, 5);
    }
    out.push(s);
  }
  return out;
}

/* ---------------- animated guides ----------------
 * Each guide is a 5.5 s loop of three beats drawn with the same strokeBody/drawHead as the game.
 * Actors are snakes whose body is their own head path sampled back in time.
 */
const DUR = 5.5;
const P = (i) => SKIN[i];
function body(g, head, t, len, pal, r, o = {}) {
  const path = [];
  for (let k = 0; k <= len; k += 0.04) { const p = head(t - k); path.push(p[0], p[1]); }
  strokeBody(g, path, pal, r, Object.assign({ t, offset: t * 60 }, o));
  const a = head(t), b = head(t - 0.03);
  if (o.dashed) return path;
  drawHead(g, a[0], a[1], Math.atan2(a[1] - b[1], a[0] - b[0]), r, pal, 0, o.alpha == null ? 1 : o.alpha);
  return path;
}
function dots(g, t, seed = 1, n = 14) {
  for (let i = 0; i < n; i++) {
    const x = ((i * 73 + seed * 31) % 260) - 20, y = ((i * 47 + seed * 17) % 140) - 10;
    g.globalCompositeOperation = "lighter";
    g.fillStyle = SKIN[i % 12][0]; g.globalAlpha = 0.5 + Math.sin(t * 3 + i) * 0.2;
    g.beginPath(); g.arc(x, y, 2.4, 0, TAU); g.fill();
  }
  g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
}
function pellet(g, sprites, k, x, y, s = 18) { if (sprites[k]) g.drawImage(sprites[k], x - s, y - s, s * 2, s * 2); }
function ring(g, x, y, r, c, a = 1, w = 3) { g.strokeStyle = c; g.globalAlpha = a; g.lineWidth = w; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.globalAlpha = 1; }
function burst(g, x, y, k, c) {
  g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, d = 6 + k * 30; g.fillStyle = c; g.globalAlpha = 1 - k; g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 3, 0, TAU); g.fill(); }
  g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
}
export function drawPortal(g, x, y, R, t, o = {}) {
  g.save(); g.translate(x, y);
  g.globalCompositeOperation = "lighter";
  const c1 = o.refused ? "#ff4d6d" : "#9b7bff", c2 = "#5ef2ff";
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, R * 1.4);
  gr.addColorStop(0, c1 + "55"); gr.addColorStop(0.6, c2 + "22"); gr.addColorStop(1, c2 + "00");
  g.fillStyle = gr; g.globalAlpha = o.alpha == null ? 1 : o.alpha;
  g.beginPath(); g.arc(0, 0, R * 1.4, 0, TAU); g.fill();
  g.lineWidth = Math.max(2, R * 0.08);
  for (let i = 0; i < 3; i++) {
    g.strokeStyle = i % 2 ? c2 : c1;
    const a0 = (o.still ? 0 : t * (1.2 + i * 0.5)) + i * 2.1;
    g.beginPath(); g.arc(0, 0, R * (0.55 + i * 0.2), a0, a0 + 4.2); g.stroke();
  }
  g.globalCompositeOperation = "source-over";
  if (o.uses != null) for (let i = 0; i < 3; i++) {
    g.fillStyle = i < o.uses ? "#ffffff" : "rgba(255,255,255,.18)";
    g.beginPath(); g.arc((i - 1) * R * 0.28, R * 1.18, Math.max(2, R * 0.06), 0, TAU); g.fill();
  }
  g.restore();
}

const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const line = (x0, y0, x1, y1, k) => [lerp(x0, x1, k), lerp(y0, y1, k)];

/** guide id → {title, caption, draw(g, t, sprites)} on a 220×130 canvas */
export const GUIDES = {
  basics: {
    title: "Basics", caption: "Hit bodies with your side",
    draw(g, t, sp) {
      dots(g, t, 2);
      const A = (s) => [20 + clamp01(s / 3) * 130, 40 + Math.sin(s * 2) * 6];
      const B = (s) => s < 3 ? [190, 120 - s * 25] : [190 - (s - 3) * 40, 45];
      body(g, A, Math.min(t, 3), 0.9, P(0), 6);
      if (t < 3.6) body(g, B, t, 0.8, P(1), 5);
      else burst(g, 150, 45, clamp01((t - 3.6) / 1), P(1)[0]);
    }
  },
  boost: {
    title: "Boost", caption: "Boost costs mass, wins fights",
    draw(g, t) {
      dots(g, t, 3);
      const A = (s) => [10 + (s < 1.6 ? s * 40 : 64 + (s - 1.6) * 95), 80 - clamp01((s - 1.6) / 1.2) * 40];
      const B = (s) => [10 + s * 48, 45];
      const crash = t > 3.4;
      body(g, A, t, t > 1.6 ? 0.55 : 0.8, P(2), 6, { boost: t > 1.6 && t < 3.6 });
      if (!crash) body(g, B, t, 0.9, P(4), 6);
      else burst(g, B(3.4)[0], 45, clamp01((t - 3.4) / 1), P(4)[0]);
    }
  },
  surge: {
    title: "Surge", caption: "Free boost for four seconds",
    draw(g, t, spr) {
      dots(g, t, 4);
      const A = (s) => [20 + s * (s > 1.5 ? 70 : 40), 65 + Math.sin(s * 3) * 10];
      if (t < 1.5) pellet(g, spr, 1, 80, 65, 16);
      body(g, A, t, 0.9, P(3), 6, { boost: t > 1.5 });
      const C = (s) => [Math.max(-40, 10 + s * 38), 30];
      body(g, C, t, 0.8, P(5), 5);
    }
  },
  ward: {
    title: "Ward", caption: "One free bump",
    draw(g, t, spr) {
      dots(g, t, 5);
      strokeBody(g, [150, 0, 150, 130], P(1), 7, { t, offset: t * 30 });
      const hitT = 2.6;
      const A = (s) => s < hitT ? [20 + s * 47, 70] : [142 - (s - hitT) * 45, 70 - (s - hitT) * 18];
      if (t < 1.3) pellet(g, spr, 2, 80, 70, 16);
      body(g, A, t, 0.8, P(0), 6);
      if (t > 1.3 && t < hitT) { const h = A(t); ring(g, h[0], h[1], 14, "#5ef2ff", 0.9); }
      if (t > hitT && t < hitT + 0.6) ring(g, 142, 70, 10 + (t - hitT) * 50, "#5ef2ff", 1 - (t - hitT) / 0.6);
    }
  },
  lens: {
    title: "Lens", caption: "See further for a while",
    draw(g, t, spr) {
      const z = t > 1.6 ? lerp(1, 0.6, clamp01((t - 1.6) / 0.8)) : 1;
      g.save(); g.translate(110, 65); g.scale(z, z); g.translate(-110, -65);
      dots(g, t, 6, 22);
      const A = (s) => [40 + s * 30, 65];
      if (t < 1.6) pellet(g, spr, 3, 88, 65, 16);
      body(g, A, t, 0.8, P(4), 6);
      if (t > 2.6) drawPortal(g, 250, 20, 22, t);
      g.restore();
      g.fillStyle = "rgba(255,255,255,.12)"; g.beginPath(); g.arc(196, 22, 16, 0, TAU); g.fill();
      if (t > 2.6) ring(g, 196 + 8, 22 - 6, 3, "#9b7bff", 1, 2);
    }
  },
  portals: {
    title: "Portals", caption: "Glide through slowly, don't boost",
    draw(g, t) {
      dots(g, t, 7);
      drawPortal(g, 60, 65, 26, t, { uses: t > 2.2 ? 2 : 3 });
      const A = (s) => s < 1.2 ? [10 + s * 40, 65] : [58 + Math.cos((s - 1.2) * 3) * 6, 65 + Math.sin((s - 1.2) * 3) * 6];
      const arrive = 2.6;
      if (t < arrive) {
        body(g, A, t, 0.6, P(8), 6);
        if (t > 1.2) ring(g, 60, 65, lerp(30, 10, clamp01((t - 1.2) / 1)), "#ffffff", 0.8, 2);
        if (t > 2.0) ring(g, 175, 50, 4 + (t - 2) * 20, "#5ef2ff", 1 - (t - 2) / 0.6);
      } else {
        const B = (s) => [175 + (s - arrive) * 40, 50 + Math.sin(s * 3) * 4];
        body(g, B, t, 0.6, P(8), 6, { alpha: t < arrive + 1 ? 0.5 : 1 });
      }
    }
  },
  refused: {
    title: "Portal refused", caption: "No escape when trapped",
    draw(g, t) {
      dots(g, t, 8);
      drawPortal(g, 110, 65, 24, t, { refused: t > 1.6 && t < 2.6 });
      const C = (s) => [110 + Math.cos(s * 1.6) * 55, 65 + Math.sin(s * 1.6) * 48];
      body(g, C, t + 3, 3.9, P(5), 6);
      const A = (s) => t < 2.6 ? [110 + Math.cos(s * 4) * 6, 65 + Math.sin(s * 4) * 6] : [110 + (s - 2.6) * 25, 65];
      body(g, A, t, 0.3, P(10), 5);
      if (t > 1.6 && t < 2.6) { g.fillStyle = "#ff4d6d"; g.font = "700 13px Manrope,sans-serif"; g.textAlign = "center"; g.fillText("✕", 110, 32); }
    }
  },
  evo: {
    title: "Evolution", caption: "Rare, random, lasts all life",
    draw(g, t, spr) {
      dots(g, t, 9);
      const A = (s) => [20 + s * 36, 70 + Math.sin(s * 2) * 12];
      if (t < 1.8) pellet(g, spr, 5, 85, 75, 18 + Math.sin(t * 5) * 2);
      const evolved = t > 1.8;
      body(g, A, t, 1.1, evolved ? EVO_PAL[1] : P(0), 6, { evo: evolved ? 1 : 0 });
      if (t > 1.8 && t < 2.8) burst(g, A(1.8)[0], A(1.8)[1], clamp01((t - 1.8)), "#ffffff");
      if (t > 2.6) { g.fillStyle = "#e8ffc4"; g.font = "800 12px Manrope,sans-serif"; g.textAlign = "center"; g.fillText("◆ Viper", A(t)[0], A(t)[1] - 16); }
    }
  },
  viper: {
    title: "Viper", caption: "Avoid the boosting Viper",
    draw(g, t) {
      dots(g, t, 10);
      const A = (s) => [10 + s * 60, 40];
      const trail = [];
      for (let k = 0; k < 2.6; k += 0.18) { const s = Math.min(t, 2.4) - k; if (s > 0) trail.push(A(s)); }
      g.globalCompositeOperation = "lighter";
      for (const p of trail) { g.fillStyle = "#9dff3c"; g.globalAlpha = 0.35; g.beginPath(); g.arc(p[0], p[1], 6, 0, TAU); g.fill(); }
      g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
      body(g, A, t, 0.8, EVO_PAL[1], 6, { evo: 1, boost: t < 2.4 });
      const slow = t > 2.8;
      const B = (s) => [100, 120 - (s < 2.8 ? s * 26 : 72.8 + (s - 2.8) * 9)];
      body(g, B, t, 0.8, P(2), 5, { alpha: slow ? 0.8 : 1 });
      if (slow) { g.fillStyle = "#9dff3c"; g.font = "700 11px Manrope,sans-serif"; g.textAlign = "center"; g.fillText("slowed", 128, B(t)[1]); }
    }
  },
  constrictor: {
    title: "Constrictor", caption: "Big, slow, deadly circles",
    draw(g, t) {
      dots(g, t, 11);
      const k = clamp01(t / 4);
      const C = (s) => { const a = s * 1.7; const R = lerp(55, 32, clamp01(s / 4)); return [110 + Math.cos(a) * R, 65 + Math.sin(a) * R * 0.9]; };
      body(g, C, t, 3.4, EVO_PAL[2], 8, { evo: 2 });
      const B = (s) => [110 + Math.cos(s * 3) * 10 * (1 - k), 65 + Math.sin(s * 3) * 10 * (1 - k)];
      if (t < 4.4) body(g, B, t, 0.35, P(11), 4);
      else burst(g, 110, 65, clamp01((t - 4.4) / 0.8), P(11)[0]);
    }
  },
  eel: {
    title: "Eel", caption: "Watch for the shimmer",
    draw(g, t) {
      dots(g, t, 12);
      strokeBody(g, [110, 0, 110, 130], P(3), 7, { t, offset: t * 30 });
      const A = (s) => [10 + s * 42, 65];
      const tell = t > 1.4 && t < 1.8, phased = t >= 1.8 && t < 3.2;
      body(g, A, t, 0.8, EVO_PAL[3], 6, { evo: 3, alpha: phased ? 0.35 : 1 });
      if (tell) { const h = A(t); ring(g, h[0], h[1], 12 + Math.sin(t * 60) * 2, "#ffffff", 0.9, 2); }
    }
  },
  split: {
    title: "Split-tail", caption: "Dashed outline means decoy",
    draw(g, t) {
      dots(g, t, 13);
      const A = (s) => [20 + s * 40, 50 + (s > 1.6 ? -(s - 1.6) * 12 : 0)];
      if (t > 1.6) {
        const D = [];
        for (let k = 0; k < 0.5; k += 0.04) { const p = A(1.6 - 0.55 - k); D.push(p[0], p[1]); }
        if (t < 4.2) strokeBody(g, D, EVO_PAL[4], 6, { dashed: true, t });
        else burst(g, D[0], D[1], clamp01((t - 4.2) / 0.8), EVO_PAL[4][0]);
      }
      body(g, A, t, t > 1.6 ? 0.55 : 1.1, EVO_PAL[4], 6, { evo: 4 });
      const B = (s) => [10 + s * 30, 90 - clamp01((s - 2) / 1.5) * 30];
      body(g, B, t, 0.8, P(5), 5);
    }
  },
  magnet: {
    title: "Magnet", caption: "Pulls food, not power-ups",
    draw(g, t, spr) {
      const A = (s) => [20 + s * 35, 65];
      const h = A(t);
      g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 10; i++) {
        const q = ((t * 0.8 + i / 10) % 1), a = i * 2.4;
        const x = h[0] + Math.cos(a) * 50 * (1 - q), y = h[1] + Math.sin(a) * 50 * (1 - q);
        g.fillStyle = SKIN[i % 12][0]; g.globalAlpha = 0.8; g.beginPath(); g.arc(x, y, 2.5, 0, TAU); g.fill();
      }
      g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
      ring(g, h[0], h[1], 34 + Math.sin(t * 5) * 3, "#ff4d4d", 0.5, 2);
      body(g, A, t, 0.9, EVO_PAL[5], 6, { evo: 5 });
      const px = 140 + clamp01((t - 1.8) / 2) * 40;
      pellet(g, spr, 1, px, 30, 14);
      const B = (s) => [210 - s * 12, 10 + s * 5];
      if (t > 2.6 && t < 4.6) body(g, B, t, 0.6, P(1), 5);
    }
  },
  comet: {
    title: "Comet", caption: "Dodge sideways, not back",
    draw(g, t) {
      dots(g, t, 14);
      const dash = (s) => s < 1.6 ? 10 + s * 30 : s < 2.0 ? 58 + (s - 1.6) * 260 : 162 + (s - 2) * 30;
      const A = (s) => [dash(s), 65];
      if (t > 1.6 && t < 2.1) {
        g.globalCompositeOperation = "lighter";
        const h = A(t); const gr = g.createLinearGradient(h[0] - 60, 0, h[0], 0);
        gr.addColorStop(0, "#ff3d0000"); gr.addColorStop(1, "#ffb347cc");
        g.strokeStyle = gr; g.lineWidth = 10; g.beginPath(); g.moveTo(h[0] - 60, 65); g.lineTo(h[0], 65); g.stroke();
        g.globalCompositeOperation = "source-over";
      }
      body(g, A, t, 0.5, EVO_PAL[6], 6, { evo: 6, boost: t > 1.6 && t < 2.0 });
      const B = (s) => [140, s < 1.4 ? 65 : 65 - clamp01((s - 1.4) / 0.4) * 30 - (s - 1.8) * 4];
      body(g, B, t, 0.5, P(9), 5);
    }
  },
  firefly: {
    title: "Firefly", caption: "It sees you, you see it",
    draw(g, t) {
      dots(g, t, 15);
      const A = (s) => [30 + s * 20, 65 + Math.sin(s * 2) * 14];
      body(g, A, t, 1, EVO_PAL[7], 6, { evo: 7 });
      g.fillStyle = "rgba(6,9,22,.7)"; g.strokeStyle = "rgba(142,233,255,.3)"; g.lineWidth = 1;
      g.beginPath(); g.arc(186, 32, 24, 0, TAU); g.fill(); g.stroke();
      if (Math.sin(t * 8) > 0) { g.fillStyle = "#fff59a"; g.beginPath(); g.arc(178, 34, 3.5, 0, TAU); g.fill(); }
      g.fillStyle = "#ffe08a"; g.beginPath(); g.arc(195, 26, 3, 0, TAU); g.fill();
      if (t > 2.4) { const B = (s) => [220 - (s - 2.4) * 40, 110 - (s - 2.4) * 10]; body(g, B, t, 0.6, P(2), 5); }
    }
  }
};
export const GUIDE_ORDER = ["basics", "boost", "surge", "ward", "lens", "portals", "refused", "evo", "viper", "constrictor", "eel", "split", "magnet", "comet", "firefly"];
export const EVO_GUIDE = ["", "viper", "constrictor", "eel", "split", "magnet", "comet", "firefly"];
export const PK_GUIDE = ["", "surge", "ward", "lens", "portals", "evo", "basics"];
export const GUIDE_DUR = DUR;

/** Run a guide on a canvas until stop() is called. Pauses itself when the canvas is hidden. */
export function playGuide(canvas, id, sprites, reduced) {
  const g = canvas.getContext("2d"), G = GUIDES[id];
  let raf = 0, t0 = performance.now(), live = true;
  const w = canvas.width, h = canvas.height, sx = w / 220, sy = h / 130;
  function frame(now) {
    if (!live) return;
    raf = requestAnimationFrame(frame);
    if (!canvas.isConnected || canvas.offsetParent === null) return;
    const t = reduced ? 2.9 : ((now - t0) / 1000) % DUR;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#070a1c"; g.fillRect(0, 0, w, h);
    g.setTransform(sx, 0, 0, sy, 0, 0);
    try { G.draw(g, t, sprites); } catch (e) { /* a guide must never break the game */ }
  }
  raf = requestAnimationFrame(frame);
  return { stop() { live = false; cancelAnimationFrame(raf); } };
}
