// Shared HTML helpers: escaping, layout shell, nav, footer, game cards.
import { SITE } from "../../src/catalog.mjs";

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const fmt = (n) => Number(n || 0).toLocaleString("en-US");

export const ICON = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.53.85l12-7.5a1 1 0 0 0 0-1.7l-12-7.5A1 1 0 0 0 7 4.5z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v14"/></svg>',
  code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/></svg>',
  open: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>'
};

export const LOGO = `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5ef2ff"/><stop offset=".55" stop-color="#a78bfa"/><stop offset="1" stop-color="#ff5ca8"/></linearGradient></defs><rect x="2" y="2" width="60" height="60" rx="18" fill="url(#lg)"/><rect x="5" y="5" width="54" height="54" rx="15" fill="#0b0a2a"/><path d="M17 22l11 10-11 10" fill="none" stroke="url(#lg)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><rect x="32" y="39" width="16" height="6" rx="3" fill="#5ef2ff"><animate attributeName="opacity" values="1;.15;1" dur="1.1s" repeatCount="indefinite"/></rect></svg>`;

const NAV = [
  ["/games/", "Games"], ["/daily/", "Daily"], ["/hall-of-fame/", "Hall of Fame"], ["/lab/", "The Lab"], ["/new/", "What's new"]
];

export function makerClass(credit) { return credit.maker.toLowerCase().replace(/[^a-z]/g, ""); }
export function creditLabel(credit) { return credit.model || `${credit.maker} · ${credit.via}`; }

export function layout({ title, description, path, body, og = "/og/home.png", head = "", scripts = "", v, bodyClass = "", noindex = false, schema }) {
  const canonical = SITE.url + path;
  const fullTitle = path === "/" ? `${SITE.name} — ${SITE.tagline}` : `${title} · ${SITE.name}`;
  const cur = (href) => (path === href || (href !== "/" && path.startsWith(href)) ? ' aria-current="page"' : "");
  return `<!DOCTYPE html>
<html lang="en" class="js-off">
<head>
<!-- Google tag (gtag.js) --><script async src="https://www.googletagmanager.com/gtag/js?id=G-L394D0L4NL"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-L394D0L4NL');</script>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4059575347806121" crossorigin="anonymous"></script>
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}"/>
<link rel="canonical" href="${canonical}"/>
${noindex ? '<meta name="robots" content="noindex"/>' : ""}
<meta name="theme-color" content="#05051a"/>
<meta name="color-scheme" content="dark"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="${SITE.name}"/>
<meta property="og:title" content="${esc(path === "/" ? fullTitle : title)}"/>
<meta property="og:description" content="${esc(description)}"/>
<meta property="og:url" content="${canonical}"/>
<meta property="og:image" content="${SITE.url}${og}"/>
<meta property="og:image:width" content="1200"/><meta property="og:image:height" content="630"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(path === "/" ? fullTitle : title)}"/>
<meta name="twitter:description" content="${esc(description)}"/>
<meta name="twitter:image" content="${SITE.url}${og}"/>
<link rel="icon" href="/favicon.svg" type="image/svg+xml"/>
<link rel="icon" href="/icons/icon-32.png" sizes="32x32" type="image/png"/>
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png"/>
<link rel="manifest" href="/manifest.webmanifest"/>
<link rel="preload" href="/fonts/unbounded.woff2" as="font" type="font/woff2" crossorigin/>
<link rel="preload" href="/fonts/manrope.woff2" as="font" type="font/woff2" crossorigin/>
<link rel="stylesheet" href="/assets/site.css?v=${v("assets/site.css")}"/>
${schema ? `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>` : ""}
${head}
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">Skip to content</a>
<header class="nav"><div class="wrap">
  <a class="logo" href="/" aria-label="${SITE.name} home">${LOGO}<span class="logo-txt"><span>Prompt<b>Arcade</b></span><small>${esc(SITE.tagline)}</small></span></a>
  <nav class="nav-links" aria-label="Main">${NAV.map(([h, t]) => `<a href="${h}"${cur(h)}>${t}</a>`).join("")}</nav>
  <div class="nav-right">
    <button class="search-btn" type="button" aria-label="Search games">${ICON.search}<span>Search</span><kbd>/</kbd></button>
    <div class="pass-wrap">
      <a class="pass-chip" href="/me/" aria-label="My Arcade Pass" aria-describedby="pass-pop"><span class="lv"><span>1</span></span><span class="txt">My Arcade</span><span class="fl"></span></a>
      <div class="pass-pop" id="pass-pop" role="tooltip">
        <div class="pp-head"><span class="pp-k">Arcade Pass</span><span class="pp-lv">Level <b>1</b></span></div>
        <div class="pp-bar"><i></i></div>
        <div class="pp-xp">0 XP</div>
        <p class="pp-sync">Sign in to sync your progress and play across multiple devices. <a href="/me/#account">Sign in on My Arcade</a></p>
      </div>
    </div>
    <button class="menu-btn" type="button" aria-label="Menu" aria-expanded="false">${ICON.menu}</button>
  </div>
</div></header>
<main id="main">
${body}
</main>
<footer><div class="wrap">
  <div>
    <a class="logo" href="/">${LOGO}<span>Prompt<b>Arcade</b></span></a>
    <p style="max-width:380px;margin:.9em 0 0">${esc(SITE.tagline)}. Well-known games remade by AI models from plain-English prompts, each with a twist of its own, plus a few originals. New ones land regularly.</p>
  </div>
  <div><h4>Play</h4><ul><li><a href="/games/">All games</a></li><li><a href="/daily/">Daily challenges</a></li><li><a href="/hall-of-fame/">Hall of Fame</a></li><li><a href="/me/">My Arcade Pass</a></li></ul></div>
  <div><h4>Learn</h4><ul><li><a href="/lab/">The Lab — how they're made</a></li><li><a href="/new/">What's new</a></li><li><a href="/about/">About</a></li></ul></div>
  <div><h4>Site</h4><ul><li><a href="/contact/">Contact</a></li><li><a href="/privacy/">Privacy</a></li><li><a href="/terms/">Terms</a></li></ul></div>
  <div class="fine"><span>© ${new Date(SITE.launched).getFullYear()} ${SITE.name} · an independent project, not affiliated with any AI lab or game publisher.</span><span><a href="mailto:${SITE.email}">${SITE.email}</a></span></div>
</div></footer>
<script src="/games/play/pa-data.js?v=${v("games/play/pa-data.js")}" defer></script>
<script src="/games/play/pa-score.js?v=${v("games/play/pa-score.js")}" defer></script>
<script src="/assets/site.js?v=${v("assets/site.js")}" defer></script>
${scripts}
</body>
</html>
`;
}

export function card(g, { feature = false, isNew = false, order = 0, vt = false, twist = false } = {}) {
  const live = g.tags.includes("multiplayer");
  const shelf = g.original ? "original" : "classic";
  const kind = g.original ? "An arcade original" : `Twist on ${g.classic.toLowerCase()}`;
  const daily = g.daily;
  const search = [g.title, g.genre, g.tags.join(" "), g.classic || "original", g.credit.maker, g.credit.model || "", g.tagline].join(" ").toLowerCase();
  return `<a class="card${feature ? " feature" : ""} reveal" href="/games/${g.slug}/" data-slug="${g.slug}" data-genre="${esc(g.genre.toLowerCase())}" data-tags="${esc([...g.tags, shelf].join(" "))}" data-maker="${makerClass(g.credit)}" data-title="${esc(g.title)}" data-added="${g.added}" data-order="${order}" data-search="${esc(search)}" style="--a:${g.accent};--b:${g.accent2}">
  <div class="card-media"><img src="/shots/${g.slug}.webp" alt="${esc(g.title)} gameplay" loading="lazy" decoding="async" width="800" height="500"${vt ? ` style="view-transition-name:shot-${g.slug}"` : ""}/>
    <div class="card-badges">${isNew ? '<span class="chip new">NEW</span>' : ""}${live ? '<span class="chip live">LIVE MULTIPLAYER</span>' : ""}${daily ? '<span class="chip daily">DAILY</span>' : ""}</div>
    <span class="card-play">${ICON.play}</span></div>
  <div class="card-body">
    <span class="card-kind ${shelf}">${esc(kind)}</span>
    <h3>${esc(g.title)}</h3>
    ${twist && !g.original ? `<p class="twist"><b>The twist</b> ${esc(g.twist)}</p>` : `<p>${esc(g.tagline)}</p>`}
    <div class="card-meta"><span class="chip maker ${makerClass(g.credit)}">${esc(creditLabel(g.credit))}</span><span class="chip">${esc(g.genre)}</span></div>
  </div>
</a>`;
}
