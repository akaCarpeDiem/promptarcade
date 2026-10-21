// The home page arcade cabinet: an SVG cabinet with a live HTML screen laid over it.
// The screen cycles through the games (src/assets/hero.js drives it); the joystick picks a game
// and the buttons play it. The cabinet is drawn on a 600×1000 canvas, but the viewBox shows only
// the top 680 (marquee, screen and control panel) so the screen can be big; the CSS fades out the
// cut edge just under the control panel. The screen sits at x 196–524, y 176–422, which is where the CSS places .cab-screen.
import { esc } from "./html.mjs";

const BULBS = (y) => Array.from({ length: 17 }, (_, i) => `<circle class="bulb b${i % 3}" cx="${176 + i * 23}" cy="${y}" r="4"/>`).join("");
// Side panel perspective: u runs from the back edge (0) to the front edge (1), v from top (0) to bottom (1).
const side = (u, v) => { const x = 60 + 100 * u, top = 46 - 28 * u, bot = 955 + 20 * u; return [x, top + v * (bot - top)]; };
const pt = ([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`;
// Place a small drawing (centred on 0,0) on the side panel at (u, v): squashed across the panel's depth and
// sheared to follow its slope, so it reads as painted on the side.
const onSide = (u, v, body, s = 1) => { const [x, y] = side(u, v), k = (-28 + 48 * v) / 100; return `<g transform="matrix(${(0.55 * s).toFixed(3)} ${(0.55 * s * k).toFixed(3)} 0 ${s} ${x.toFixed(1)} ${y.toFixed(1)})">${body}</g>`; };

// Ember Swarm side art: the ember spirit in its arc ward, chain lightning, the bat swarm, embers and shards.
const BAT = `<path d="M-9 -2 L-22 -9 L-18 1 L-24 6 L-9 5 Z M9 -2 L22 -9 L18 1 L24 6 L9 5 Z" fill="#3b1a63"/><circle r="10" fill="url(#cab-bat)"/><circle cx="-3.6" cy="-1" r="2" fill="#ff7eb6"/><circle cx="3.6" cy="-1" r="2" fill="#ff7eb6"/>`;
const SPIRIT = `<circle r="34" fill="url(#cab-aura)"/><path d="M-30 -2 Q-30 26 0 26 Q30 26 30 -2" fill="none" stroke="#ff9a3c" stroke-width="3" stroke-linecap="round" opacity=".9"/><circle r="15" fill="url(#cab-spirit)" filter="url(#cab-glow)"/><circle cx="-5" cy="-1" r="2.6" fill="#a3123f"/><circle cx="5" cy="-1" r="2.6" fill="#a3123f"/><circle cx="-6" cy="-7" r="4" fill="#fff" opacity=".35"/>`;
const SHARD = `<path d="M0 -11 L4 0 L0 11 L-4 0 Z" fill="#efe6ff" filter="url(#cab-glow)"/>`;
const EMBER = `<circle class="ember" r="5" fill="#7af6ff" filter="url(#cab-glow)"/>`;
const BATS = [[0.24, 0.045], [0.66, 0.035], [0.88, 0.085], [0.44, 0.1], [0.16, 0.125], [0.3, 0.17], [0.62, 0.155], [0.82, 0.19], [0.48, 0.215], [0.2, 0.25], [0.86, 0.325], [0.14, 0.47], [0.3, 0.56], [0.62, 0.585], [0.84, 0.545], [0.46, 0.63], [0.18, 0.635], [0.74, 0.65]];
const EMBERS = [[0.42, 0.055], [0.78, 0.13], [0.6, 0.075], [0.56, 0.27], [0.4, 0.3], [0.7, 0.45], [0.74, 0.49], [0.3, 0.42], [0.5, 0.505], [0.54, 0.535], [0.9, 0.4], [0.12, 0.36], [0.4, 0.6]];
// Sparks run the full height of the art, from just under the top edge down to the deck.
const SPARKS = Array.from({ length: 30 }, (_, k) => [((k * 37) % 100) / 100, 0.012 + ((k * 53) % 100) / 154]);
const BOLT = [side(0.6, 0.392), side(0.66, 0.36), side(0.72, 0.365), side(0.86, 0.33)].map(pt).join(" ");
const SIDE_ART = `<g clip-path="url(#cab-sideclip)">
  <rect x="60" y="18" width="100" height="660" fill="url(#cab-ember)"/>
  ${SPARKS.map(([u, v], k) => { const [x, y] = side(u, v); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${k % 3 ? 1.2 : 1.8}" fill="#ffb070" opacity="${k % 2 ? 0.5 : 0.8}"/>`; }).join("")}
  ${BATS.map(([u, v], k) => onSide(u, v, BAT, k % 4 === 1 ? 1.15 : 1)).join("")}
  <polyline points="${BOLT}" fill="none" stroke="#dffcff" stroke-width="2" stroke-linejoin="round" filter="url(#cab-glow)"/>
  ${EMBERS.map(([u, v]) => onSide(u, v, EMBER)).join("")}
  ${[[0.52, 0.02], [0.82, 0.27], [0.24, 0.35], [0.8, 0.6]].map(([u, v]) => onSide(u, v, SHARD)).join("")}
  ${onSide(0.55, 0.4, SPIRIT, 1.15)}
</g>`;

// Two rows of three, the top row on a slight arc, set well back from the front edge of the panel.
const BUTTONS = [[358, 552, "c1"], [402, 548, "c2"], [446, 552, "c3"], [370, 578, "c4"], [414, 574, "c5"], [458, 578, "c6"]];
const button = ([x, y, c], i) => `<g class="cbtn ${c}" data-b="${i}">
  <ellipse cx="${x}" cy="${y + 1.5}" rx="18" ry="8" fill="#030309"/><ellipse cx="${x}" cy="${y}" rx="17" ry="7.4" fill="url(#cab-ring)"/><ellipse cx="${x}" cy="${y + 0.6}" rx="13" ry="5.4" fill="#000"/>
  <g class="cap"><ellipse cx="${x}" cy="${y}" rx="11.6" ry="4.9" class="cap-side"/><rect x="${x - 11.6}" y="${y - 3}" width="23.2" height="3" class="cap-side"/><ellipse cx="${x}" cy="${y - 3}" rx="11.6" ry="4.9" class="cap-top"/><ellipse cx="${x}" cy="${y - 2.6}" rx="7.6" ry="3" class="cap-dish"/><ellipse cx="${x - 4}" cy="${y - 5}" rx="4" ry="1.4" fill="#fff" opacity=".45"/></g>
</g>`;

const SVG = `<svg class="cab-svg" viewBox="0 0 600 680" aria-hidden="true" focusable="false">
<defs>
  <linearGradient id="cab-front" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#17173f"/><stop offset=".5" stop-color="#1d1d4d"/><stop offset="1" stop-color="#121236"/></linearGradient>
  <linearGradient id="cab-side" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#07071a"/><stop offset="1" stop-color="#0f0f2c"/></linearGradient>
  <linearGradient id="cab-mq" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b1f7a"/><stop offset=".5" stop-color="#7a2a8f"/><stop offset="1" stop-color="#2a1a6a"/></linearGradient>
  <linearGradient id="cab-deck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c1c4a"/><stop offset="1" stop-color="#2c2c68"/></linearGradient>
  <linearGradient id="cab-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".14"/><stop offset=".33" stop-color="#fff" stop-opacity=".035"/><stop offset=".36" stop-color="#fff" stop-opacity="0"/><stop offset=".58" stop-color="#fff" stop-opacity="0"/><stop offset=".62" stop-color="#fff" stop-opacity=".08"/><stop offset=".66" stop-color="#fff" stop-opacity=".03"/><stop offset=".72" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="cab-glass-v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".06"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#02020a" stop-opacity=".28"/></linearGradient>
  <clipPath id="cab-deckclip"><polygon points="160,528 560,528 570,606 150,606"/></clipPath>
  <radialGradient id="cab-sheen" cx=".5" cy="0" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".07"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <linearGradient id="cab-lip" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#25255a"/><stop offset=".25" stop-color="#16163c"/><stop offset="1" stop-color="#0c0c26"/></linearGradient>
  <linearGradient id="cab-shadow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#02020a" stop-opacity=".85"/><stop offset="1" stop-color="#02020a" stop-opacity="0"/></linearGradient>
  <linearGradient id="cab-bez" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c0c26"/><stop offset="1" stop-color="#05051a"/></linearGradient>
  <linearGradient id="cab-ring" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3a48"/><stop offset=".45" stop-color="#121218"/><stop offset="1" stop-color="#050508"/></linearGradient>
  <radialGradient id="cab-ball" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#ffb3c8"/><stop offset=".35" stop-color="#ff3d6e"/><stop offset="1" stop-color="#8a0f33"/></radialGradient>
  <radialGradient id="cab-ember" cx=".55" cy=".42" r=".7"><stop offset="0" stop-color="#4a1d1c"/><stop offset=".55" stop-color="#22101e"/><stop offset="1" stop-color="#0c0818"/></radialGradient>
  <radialGradient id="cab-aura" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff9a3c" stop-opacity=".55"/><stop offset="1" stop-color="#ff9a3c" stop-opacity="0"/></radialGradient>
  <radialGradient id="cab-spirit" cx=".38" cy=".32" r=".7"><stop offset="0" stop-color="#ffe0b0"/><stop offset=".45" stop-color="#ff8a4c"/><stop offset="1" stop-color="#d9481f"/></radialGradient>
  <radialGradient id="cab-bat" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#8a45c4"/><stop offset="1" stop-color="#4b2378"/></radialGradient>
  <clipPath id="cab-sideclip"><polygon points="60,46 160,18 160,528 150,606 150,632 160,642 160,975 60,955"/></clipPath>
  <filter id="cab-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>

<!-- side panel, seen from the front left -->
<polygon points="60,46 160,18 160,975 60,955" fill="url(#cab-side)"/>
${SIDE_ART}
<path class="acc-stroke" d="M160 18 L60 46 L60 955" fill="none" stroke-width="2" opacity=".5"/>

<!-- front body -->
<rect x="160" y="18" width="400" height="957" fill="url(#cab-front)"/>

<!-- marquee -->
<rect x="160" y="18" width="400" height="122" fill="#0b0b24"/>
<rect class="mq-panel" x="176" y="34" width="368" height="92" rx="6" fill="url(#cab-mq)"/>
<rect x="176" y="34" width="368" height="92" rx="6" fill="none" stroke="rgba(255,255,255,.18)"/>
<text x="360" y="93" text-anchor="middle" class="mq-title">Prompt<tspan class="mq-arc">Arcade</tspan></text>
<g class="bulbs">${BULBS(26)}${BULBS(134)}</g>

<!-- bezel and screen surround -->
<rect x="160" y="140" width="400" height="388" fill="#08081c"/>
<polygon points="176,154 544,154 532,510 188,510" fill="url(#cab-bez)" stroke="rgba(170,175,255,.16)"/>
<rect class="scr-glow" x="196" y="176" width="328" height="246" rx="18" filter="url(#cab-glow)"/>
<text x="360" y="462" text-anchor="middle" class="bz-text">JOYSTICK TO PICK · BUTTON TO PLAY</text>
<text x="360" y="488" text-anchor="middle" class="bz-coin">INSERT COIN</text>

<!-- control panel: a sloped deck that overhangs the body a little, with a rounded front lip -->
<polygon points="160,528 150,606 150,632 160,642" fill="#0b0b24"/>
<polygon points="160,528 560,528 570,606 150,606" fill="url(#cab-deck)"/>
<!-- glass-topped deck: a faint neon perspective grid under a translucent sheen with a bevelled edge -->
<g clip-path="url(#cab-deckclip)">
  <path class="deck-grid" d="M126.0 528 L60.0 606 M149.4 528 L90.0 606 M172.8 528 L120.0 606 M196.2 528 L150.0 606 M219.6 528 L180.0 606 M243.0 528 L210.0 606 M266.4 528 L240.0 606 M289.8 528 L270.0 606 M313.2 528 L300.0 606 M336.6 528 L330.0 606 M360.0 528 L360.0 606 M383.4 528 L390.0 606 M406.8 528 L420.0 606 M430.2 528 L450.0 606 M453.6 528 L480.0 606 M477.0 528 L510.0 606 M500.4 528 L540.0 606 M523.8 528 L570.0 606 M547.2 528 L600.0 606 M570.6 528 L630.0 606 M594.0 528 L660.0 606 M140 531.5 L580 531.5 M140 538.5 L580 538.5 M140 548.1 L580 548.1 M140 559.9 L580 559.9 M140 573.5 L580 573.5 M140 589.0 L580 589.0" fill="none" stroke-width="1"/>
  <polygon points="160,528 560,528 570,606 150,606" fill="url(#cab-glass-v)"/>
  <polygon points="160,528 560,528 570,606 150,606" fill="url(#cab-glass)"/>
</g>
<polygon points="160,528 560,528 570,606 150,606" fill="url(#cab-sheen)"/>
<polygon class="deck-bevel" points="161.5,530 558.5,530 568,604.5 152,604.5" fill="none"/>
<path d="M162 530.2 L558 530.2" stroke="#fff" stroke-opacity=".22" stroke-width="1"/>
<path d="M160 528 L560 528" stroke="#03030c" stroke-width="2"/>
<path d="M150 606 L570 606 L570 626 Q570 634 562 634 L158 634 Q150 634 150 626 Z" fill="url(#cab-lip)"/>
<rect x="160" y="634" width="400" height="26" fill="url(#cab-shadow)"/>

<ellipse cx="258" cy="567" rx="26" ry="9" fill="#030309"/>
<ellipse cx="258" cy="566" rx="24" ry="8" fill="url(#cab-ring)"/>
<ellipse cx="258" cy="566" rx="9" ry="3.2" fill="#000"/>
<g class="stick"><rect x="254.5" y="526" width="7" height="40" rx="3.5" fill="#c9cbe8"/><circle cx="258" cy="522" r="17" fill="url(#cab-ball)"/><ellipse cx="252" cy="515" rx="6" ry="4" fill="#fff" opacity=".45"/></g>

${BUTTONS.map(button).join("")}

<path class="acc-stroke" d="M560 18 L560 528 M560 642 L560 975" stroke-width="2.5" opacity=".7" filter="url(#cab-glow)"/>
<path class="acc-stroke" d="M160 18 L160 528 M160 642 L160 975" stroke-width="2" opacity=".55"/>
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
