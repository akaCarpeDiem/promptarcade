// The home page arcade cabinet: an SVG cabinet with a live HTML screen laid over it.
// The screen cycles through the games (src/assets/hero.js drives it); the joystick picks a game
// and the buttons play it. The SVG's viewBox is 600×1000, and the screen sits at
// x 196–524, y 176–422, which is where the CSS places .cab-screen.
import { esc } from "./html.mjs";

const BULBS = (y) => Array.from({ length: 17 }, (_, i) => `<circle class="bulb b${i % 3}" cx="${176 + i * 23}" cy="${y}" r="4"/>`).join("");
// Side panel perspective: u runs from the back edge (0) to the front edge (1), v from top (0) to bottom (1).
const side = (u, v) => { const x = 60 + 100 * u, top = 46 - 28 * u, bot = 955 + 20 * u; return [x, top + v * (bot - top)]; };
const pt = ([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`;
const quad = (u, v, du, dv) => [side(u, v), side(u + du, v), side(u + du, v + dv), side(u, v + dv)].map(pt).join(" ");
const GEM = { pink: ["#ff7eb6", "#ffc2dc"], gold: ["#ffd36b", "#fff0b8"], violet: ["#a78bfa", "#dcd0ff"], mint: ["#7dffb0", "#d4ffe6"], cyan: ["#5ef2ff", "#d4fbff"] };
// a Block Bloom gem on the side panel (cell in side space) or on the front (plain square)
const sideGem = (u, v, c) => `<polygon points="${quad(u, v, 0.15, 0.019)}" fill="${GEM[c][0]}"/><polygon points="${quad(u + 0.025, v + 0.003, 0.1, 0.006)}" fill="${GEM[c][1]}" opacity=".7"/>`;
const gem = (x, y, c, s = 22) => `<rect x="${x}" y="${y}" width="${s - 2}" height="${s - 2}" rx="5" fill="${GEM[c][0]}"/><rect x="${x + 4}" y="${y + 3}" width="${s - 10}" height="5" rx="2.5" fill="${GEM[c][1]}" opacity=".75"/>`;
// Gridstorm's warped grid: lines bend away from a ripple centre
function sideGrid() {
  const out = [];
  const warp = (u, v) => { const du = u - 0.55, dv = (v - 0.3) * 3, d = Math.hypot(du, dv) + 0.001, k = 0.05 * Math.exp(-d * d * 18) / d; return side(u + du * k, v + (dv * k) / 3); };
  for (let i = 0; i <= 5; i++) out.push(Array.from({ length: 41 }, (_, j) => pt(warp(i / 5, j / 40))).join(" "));
  for (let j = 0; j <= 40; j++) out.push(Array.from({ length: 11 }, (_, i) => pt(warp(i / 10, j / 40))).join(" "));
  return out.map((d) => `<polyline points="${d}"/>`).join("");
}
// Glowline Arena's snake, as a polyline through the given points, with travelling stripes and a head
const snake = (pts, w, head, ang) => {
  const d = pts.map(pt).join(" ");
  const [hx, hy] = head;
  return `<g class="art-snake"><polyline points="${d}" fill="none" stroke="url(#cab-snake)" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" filter="url(#cab-glow)"/><polyline class="snake-stripes" points="${d}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="${w * 0.42}" stroke-linecap="round" stroke-dasharray="${w * 0.5} ${w * 1.1}"/><g transform="translate(${hx} ${hy}) rotate(${ang})"><ellipse rx="${w * 0.72}" ry="${w * 0.62}" fill="#7af6ff"/><circle cx="${w * 0.25}" cy="${-w * 0.25}" r="${w * 0.18}" fill="#fff"/><circle cx="${w * 0.25}" cy="${w * 0.25}" r="${w * 0.18}" fill="#fff"/><circle cx="${w * 0.3}" cy="${-w * 0.25}" r="${w * 0.09}" fill="#05051a"/><circle cx="${w * 0.3}" cy="${w * 0.25}" r="${w * 0.09}" fill="#05051a"/></g></g>`;
};
const sideSnakePts = Array.from({ length: 34 }, (_, k) => side(0.5 + 0.28 * Math.sin(k * 0.55), 0.17 + k * 0.0135));
const SIDE_ART = `<g clip-path="url(#cab-sideclip)">
  <g class="art-grid" fill="none" stroke-width="1">${sideGrid()}</g>
  ${snake(sideSnakePts, 13, sideSnakePts[sideSnakePts.length - 1], 80)}
  ${sideGem(0.08, 0.74, "pink")}${sideGem(0.23, 0.74, "pink")}${sideGem(0.38, 0.74, "pink")}${sideGem(0.23, 0.721, "pink")}
  ${sideGem(0.6, 0.74, "gold")}${sideGem(0.75, 0.74, "gold")}${sideGem(0.75, 0.721, "gold")}${sideGem(0.75, 0.702, "gold")}
  ${[0, 1, 2, 3, 4, 5].map((k) => sideGem(0.02 + k * 0.155, 0.759, ["violet", "mint", "cyan", "pink", "gold", "violet"][k])).join("")}
  ${[0, 1, 2, 3, 4, 5].map((k) => sideGem(0.02 + k * 0.155, 0.778, ["mint", "mint", "mint", "mint", "mint", "mint"][k])).join("")}
  <polygon points="${[side(0.34, 0.13), side(0.62, 0.145), side(0.34, 0.16), side(0.42, 0.145)].map(pt).join(" ")}" fill="none" stroke="#ffe68a" stroke-width="2.5" stroke-linejoin="round" filter="url(#cab-glow)"/>
</g>`;
const frontSnake = [[548, 690], [520, 700], [500, 728], [508, 760], [536, 780], [540, 812], [512, 836], [474, 846], [452, 868]];
const FRONT_ART = `<g clip-path="url(#cab-lowclip)">
  <g class="art-grid" fill="none" stroke-width="1">${Array.from({ length: 11 }, (_, i) => `<path d="M${160 + i * 40} 650 Q ${160 + i * 40 + (i - 5) * 6} 790 ${160 + i * 40} 935"/>`).join("")}${Array.from({ length: 8 }, (_, j) => `<path d="M160 ${660 + j * 36} Q 360 ${660 + j * 36 + (j - 3.5) * 8} 560 ${660 + j * 36}"/>`).join("")}</g>
  <g class="art-gems">${gem(188, 700, "violet")}${gem(210, 700, "violet")}${gem(232, 700, "violet")}${gem(210, 722, "violet")}${gem(180, 818, "pink")}${gem(202, 818, "pink")}${gem(224, 818, "gold")}${gem(246, 818, "gold")}${gem(246, 796, "gold")}${gem(180, 840, "mint")}${gem(202, 840, "cyan")}${gem(224, 840, "pink")}${gem(246, 840, "violet")}</g>
  ${snake(frontSnake, 15, frontSnake[frontSnake.length - 1], 155)}
  <g class="art-storm" fill="none" stroke-width="2.5" stroke-linejoin="round" filter="url(#cab-glow)">
    <path d="M300 664 l10 10 -10 10 -10 -10z" stroke="#5ef2ff"/><path d="M352 668 l8 -8 8 8 -8 8z M352 668 h16 M360 660 v16" stroke="#ff5ca8"/>
    <path d="M410 684 l22 -8 -22 -8 6 8z" stroke="#ffe68a"/><path d="M440 676 h14 M462 676 h10" stroke="#ffe68a" stroke-dasharray="4 4"/>
  </g>
</g>`;

const BUTTONS = [[364, 584, "c1"], [404, 580, "c2"], [444, 584, "c3"], [376, 606, "c4"], [416, 602, "c5"], [456, 606, "c6"]];

const SVG = `<svg class="cab-svg" viewBox="0 0 600 1000" aria-hidden="true" focusable="false">
<defs>
  <linearGradient id="cab-front" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#17173f"/><stop offset=".5" stop-color="#1d1d4d"/><stop offset="1" stop-color="#121236"/></linearGradient>
  <linearGradient id="cab-side" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#07071a"/><stop offset="1" stop-color="#0f0f2c"/></linearGradient>
  <linearGradient id="cab-mq" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b1f7a"/><stop offset=".5" stop-color="#7a2a8f"/><stop offset="1" stop-color="#2a1a6a"/></linearGradient>
  <linearGradient id="cab-deck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2a66"/><stop offset="1" stop-color="#1a1a48"/></linearGradient>
  <linearGradient id="cab-bez" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c0c26"/><stop offset="1" stop-color="#05051a"/></linearGradient>
  <radialGradient id="cab-ball" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#ffb3c8"/><stop offset=".35" stop-color="#ff3d6e"/><stop offset="1" stop-color="#8a0f33"/></radialGradient>
  <radialGradient id="cab-floor" cx=".5" cy=".5" r=".5"><stop offset="0" class="acc-stop" stop-opacity=".55"/><stop offset="1" class="acc-stop" stop-opacity="0"/></radialGradient>
  <linearGradient id="cab-snake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5ef2ff"/><stop offset=".6" stop-color="#a78bfa"/><stop offset="1" stop-color="#ff5ca8"/></linearGradient>
  <clipPath id="cab-sideclip"><polygon points="60,154 160,140 160,560 132,612 132,642 160,650 160,975 60,955"/></clipPath>
  <clipPath id="cab-lowclip"><rect x="160" y="650" width="400" height="285"/></clipPath>
  <filter id="cab-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<ellipse cx="320" cy="978" rx="300" ry="24" fill="url(#cab-floor)"/>

<!-- side panel, seen from the front left -->
<polygon points="60,46 160,18 160,560 132,612 132,642 160,650 160,975 60,955" fill="url(#cab-side)"/>
<polygon points="60,46 160,18 160,140 60,154" fill="#0d0d2a"/>
${SIDE_ART}
<path class="acc-stroke" d="M160 18 L60 46 L60 955 L160 975" fill="none" stroke-width="2" opacity=".5"/>

<!-- front body -->
<rect x="160" y="18" width="400" height="957" fill="url(#cab-front)"/>

<!-- marquee -->
<rect x="160" y="18" width="400" height="122" fill="#0b0b24"/>
<rect class="mq-panel" x="176" y="34" width="368" height="92" rx="6" fill="url(#cab-mq)"/>
<rect x="176" y="34" width="368" height="92" rx="6" fill="none" stroke="rgba(255,255,255,.18)"/>
<text x="360" y="93" text-anchor="middle" class="mq-title">Prompt<tspan class="mq-arc">Arcade</tspan></text>
<g class="bulbs">${BULBS(26)}${BULBS(134)}</g>

<!-- bezel and screen surround -->
<rect x="160" y="140" width="400" height="380" fill="#08081c"/>
<polygon points="176,154 544,154 532,510 188,510" fill="url(#cab-bez)" stroke="rgba(170,175,255,.16)"/>
<rect class="scr-glow" x="196" y="176" width="328" height="246" rx="18" filter="url(#cab-glow)"/>
<text x="360" y="462" text-anchor="middle" class="bz-text">JOYSTICK TO PICK · BUTTON TO PLAY</text>
<text x="360" y="488" text-anchor="middle" class="bz-coin">INSERT COIN</text>

<!-- speaker grille -->
<rect x="160" y="520" width="400" height="40" fill="#0c0c26"/>
${Array.from({ length: 12 }, (_, i) => `<rect x="${292 + i * 12}" y="530" width="5" height="20" rx="2.5" fill="#05051a"/>`).join("")}

<!-- control panel -->
<polygon points="160,560 160,650 132,642 132,612" fill="#0a0a22"/>
<polygon points="160,560 560,560 532,612 132,612" fill="url(#cab-deck)"/>
<path class="acc-fill" d="M190 600 L520 600 L516 606 L186 606 Z" opacity=".35"/>
<polygon points="132,612 532,612 532,642 132,642" fill="#121236"/>
<path class="acc-stroke tm" d="M132 612 L532 612 M132 642 L532 642" stroke-width="3" fill="none" filter="url(#cab-glow)"/>

<ellipse cx="250" cy="590" rx="32" ry="10" fill="#07071a"/>
<ellipse cx="250" cy="588" rx="20" ry="6.5" fill="#20204e"/>
<g class="stick"><rect x="246.5" y="548" width="7" height="40" rx="3.5" fill="#c9cbe8"/><circle cx="250" cy="544" r="17" fill="url(#cab-ball)"/><ellipse cx="244" cy="537" rx="6" ry="4" fill="#fff" opacity=".45"/></g>

${BUTTONS.map(([x, y, c], i) => `<g class="cbtn ${c}" data-b="${i}"><ellipse cx="${x}" cy="${y + 2}" rx="15" ry="6" fill="#07071a"/><g class="cap"><ellipse cx="${x}" cy="${y}" rx="13" ry="5.2" class="cap-side"/><ellipse cx="${x}" cy="${y - 2.5}" rx="13" ry="5.2" class="cap-top"/></g></g>`).join("")}
<g class="start"><circle cx="500" cy="576" r="7" fill="#e9ebff"/><circle cx="526" cy="576" r="7" fill="#e9ebff"/><text x="500" y="595" class="st-label" text-anchor="middle">1P</text><text x="526" y="595" class="st-label" text-anchor="middle">2P</text></g>

<!-- lower cabinet: game art, coin door and kick plate -->
${FRONT_ART}
<rect x="290" y="700" width="140" height="160" rx="8" fill="#0a0a20" stroke="#34366c"/>
<rect x="312" y="726" width="40" height="44" rx="5" fill="#16163a" stroke="#3d3f78"/>
<rect x="368" y="726" width="40" height="44" rx="5" fill="#16163a" stroke="#3d3f78"/>
<rect class="coin-slot" x="329" y="736" width="6" height="24" rx="3"/>
<rect class="coin-slot" x="385" y="736" width="6" height="24" rx="3"/>
<text x="332" y="787" text-anchor="middle" class="coin-label">25¢</text>
<text x="388" y="787" text-anchor="middle" class="coin-label">25¢</text>
<rect x="326" y="806" width="68" height="38" rx="5" fill="#16163a" stroke="#3d3f78"/>
<path class="acc-fill" d="M160 884 L560 884 L560 894 L160 894 Z" opacity=".6"/>
<path d="M160 900 L560 900 L560 905 L160 905 Z" fill="#ff5ca8" opacity=".5"/>
<rect x="160" y="935" width="400" height="40" fill="#0a0a22"/>
<path class="acc-stroke" d="M160 975 L560 975" stroke-width="3" filter="url(#cab-glow)"/>
<path class="acc-stroke" d="M560 18 L560 975" stroke-width="2.5" opacity=".7" filter="url(#cab-glow)"/>
<path class="acc-stroke" d="M160 18 L160 560 M160 650 L160 975" stroke-width="2" opacity=".55"/>
</svg>`;

/** Arcade cabinet markup for the given games (first one is on screen when the page loads). */
export function cabinet(list) {
  const first = list[0];
  return `<div class="cab" style="--a:${first.accent};--b:${first.accent2}" data-cab>
  ${SVG}
  <div class="cab-screen">
    ${list.map((g, i) => `<a class="cab-slide${i === 0 ? " on" : ""}" href="/games/${g.slug}/" data-i="${i}" data-title="${esc(g.title)}" data-classic="${esc(g.classic || "")}" data-a="${g.accent}" data-b="${g.accent2}"${i === 0 ? "" : ' tabindex="-1" aria-hidden="true"'}><img src="/shots/${g.slug}.webp" alt="${esc(g.title)}" width="800" height="500" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}/></a>`).join("")}
    <canvas class="cab-static" width="96" height="72" aria-hidden="true"></canvas>
    <div class="cab-hud" aria-hidden="true"><span>1UP <b data-cab-score>000000</b></span><span>GAME <b data-cab-n>01</b>/${String(list.length).padStart(2, "0")}</span></div>
    <div class="cab-osd" aria-live="polite"><b data-cab-title>${esc(first.title)}</b><span data-cab-classic>${first.classic ? `Twist on ${esc(first.classic.toLowerCase())}` : "Arcade original"}</span></div>
  </div>
  <button class="cab-hit cab-left" type="button" aria-label="Next game"></button>
  <button class="cab-hit cab-right" type="button" aria-label="Previous game"></button>
  <a class="cab-hit cab-play" href="/games/${first.slug}/#play" aria-label="Play ${esc(first.title)}" data-cab-play></a>
</div>`;
}
