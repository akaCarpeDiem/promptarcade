// The home page arcade cabinet: an SVG cabinet with a live HTML screen laid over it.
// The screen cycles through the games (src/assets/hero.js drives it); the joystick picks a game
// and the buttons play it. The SVG's viewBox is 600×1000, and the screen sits at
// x 196–524, y 176–422, which is where the CSS places .cab-screen.
import { esc } from "./html.mjs";

const BULBS = (y) => Array.from({ length: 17 }, (_, i) => `<circle class="bulb b${i % 3}" cx="${176 + i * 23}" cy="${y}" r="4"/>`).join("");
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
  <filter id="cab-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<ellipse cx="320" cy="978" rx="300" ry="24" fill="url(#cab-floor)"/>

<!-- side panel, seen from the front left -->
<polygon points="60,46 160,18 160,560 132,612 132,642 160,650 160,975 60,955" fill="url(#cab-side)"/>
<polygon points="60,46 160,18 160,140 60,154" fill="#0d0d2a"/>
<path class="acc-fill" d="M60 600 L160 470 L160 520 L60 660 Z" opacity=".55"/>
<path d="M60 690 L160 560 L160 590 L60 726 Z" fill="#ff5ca8" opacity=".45"/>
<path class="acc-stroke" d="M160 18 L60 46 L60 955 L160 975" fill="none" stroke-width="2" opacity=".5"/>

<!-- front body -->
<rect x="160" y="18" width="400" height="957" fill="url(#cab-front)"/>

<!-- marquee -->
<rect x="160" y="18" width="400" height="122" fill="#0b0b24"/>
<rect class="mq-panel" x="176" y="34" width="368" height="92" rx="6" fill="url(#cab-mq)"/>
<rect x="176" y="34" width="368" height="92" rx="6" fill="none" stroke="rgba(255,255,255,.18)"/>
<text x="360" y="88" text-anchor="middle" class="mq-title">Prompt<tspan class="mq-arc">Arcade</tspan></text>
<text x="360" y="114" text-anchor="middle" class="mq-sub">CLASSICS WITH A TWIST</text>
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

<!-- lower cabinet: coin door and kick plate -->
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
<g class="decal" opacity=".85"><path class="acc-fill" d="M214 760 l6 14 15 1 -11 10 4 15 -14 -8 -14 8 4 -15 -11 -10 15 -1z" opacity=".8"/><path d="M492 790 l5 11 12 1 -9 8 3 12 -11 -6 -11 6 3 -12 -9 -8 12 -1z" fill="#ffd36b" opacity=".75"/></g>
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
