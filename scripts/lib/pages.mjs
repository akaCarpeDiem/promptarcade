// Page templates. Each returns { path, html }.
import { SITE, GAMES, NEWS } from "../../src/catalog.mjs";
import { layout, card, esc, fmt, ICON, makerClass, creditLabel } from "./html.mjs";
import { highlight } from "./highlight.mjs";

const isNew = (g, now) => (now - new Date(g.added)) / 864e5 <= 21;
const featured = () => GAMES.filter((g) => g.featured).sort((a, b) => a.featured - b.featured);
const byOrder = () => [...featured(), ...GAMES.filter((g) => !g.featured)];
const genres = () => [...new Set(GAMES.map((g) => g.genre))];
const playUrl = (g) => `/games/play/${g.slug}`;

export function home(ctx) {
  const now = ctx.now;
  const f = featured();
  const fan = f.slice(0, 6);
  const totals = ctx.totals;
  const flagship = GAMES.find((g) => g.slug === "glowline-arena");
  const second = GAMES.find((g) => g.slug === "ember-swarm");
  const shelves = [
    ["Action & arcade", (g) => ["Shooter", "Arcade", "Racing", "Platformer", "Roguelite", "Multiplayer"].includes(g.genre)],
    ["Puzzles & brain teasers", (g) => ["Puzzle", "Daily"].includes(g.genre)],
    ["Strategy, 3D & deep dives", (g) => ["3D", "Roguelike"].includes(g.genre)]
  ];
  const newOnes = GAMES.filter((g) => isNew(g, now));
  const body = `
<section class="hero" aria-labelledby="hero-h">
  <canvas id="hero-gl" aria-hidden="true"></canvas>
  <div class="wrap">
    <div>
      <span class="kicker">${GAMES.length} free games · every one made by AI</span>
      <h1 id="hero-h">Games built<br/>from a <span class="glow">sentence.</span></h1>
      <p class="lede">Every game in this arcade was written by an AI model from plain-English prompts — the code, the art, the music, the physics. Play a live multiplayer arena, survive a roguelite swarm, crack the daily word, then see exactly how each one was made.</p>
      <div class="ctas">
        <a class="btn" href="/games/${flagship.slug}/#play">${ICON.play} Play ${esc(flagship.title)}</a>
        <a class="btn ghost" href="/games/">Browse all ${GAMES.length} games ${ICON.arrow}</a>
      </div>
      <div class="hero-stats">
        <div><b data-count="${GAMES.length}">${GAMES.length}</b><span>games</span></div>
        <div><b data-count="${totals.lines}">${fmt(totals.lines)}</b><span>lines of AI-written code</span></div>
        <div><b>0</b><span>accounts needed</span></div>
      </div>
    </div>
    <div class="fan" aria-label="Featured games">
      ${fan.map((g) => `<a href="/games/${g.slug}/" style="--a:${g.accent}"><img src="/shots/${g.slug}.webp" alt="${esc(g.title)}" width="800" height="500" ${g === fan[0] ? 'fetchpriority="high"' : 'loading="lazy"'}/><span>${esc(g.title)}</span></a>`).join("")}
    </div>
  </div>
</section>
<div class="ticker" hidden aria-label="Latest high scores"><div class="track"></div></div>

<section aria-labelledby="today-h"><div class="wrap">
  <div class="sec-head reveal"><div><span class="kicker">Today</span><h2 id="today-h">Something new every day</h2><p>A daily quest across the arcade, a word to crack and a dungeon everyone delves together. Keep your streak alive.</p></div><a class="more" href="/daily/">Daily hub ${ICON.arrow}</a></div>
  <div class="today">
    <a class="tcard reveal" data-quest href="/daily/">
      <span class="kicker" style="color:var(--gold)">Daily quest · +100 XP</span>
      <h3 class="q-text">Today's quest</h3>
      <p class="q-game"></p>
      <div class="qbar"><i></i></div>
      <div class="row"><span class="status todo">Loading…</span><span class="countdown" data-countdown></span></div>
      <p class="q-best" style="font-size:13px"></p>
    </a>
    <a class="tcard reveal" data-wordglow href="/games/wordglow/#play" style="--a:rgba(46,230,197,.35)">
      <span class="kicker" style="color:#2ee6c5">Wordglow daily</span>
      <span class="big">#1</span>
      <p>Five letters, six tries, same word for everyone.</p>
      <div class="row"><span class="status todo">Not played yet</span><span class="streak countdown"></span></div>
    </a>
    <a class="tcard reveal" data-delve href="/games/deepdelve/#play" style="--a:rgba(255,207,112,.35)">
      <span class="kicker" style="color:#ffcf70">Daily Delve</span>
      <h3>Today's dungeon</h3>
      <p>One seeded dungeon for every player. How deep can you get?</p>
      <div class="row"><span class="status todo">Today's dungeon is waiting</span><span class="seed countdown"></span></div>
    </a>
  </div>
</div></section>

<section data-continue hidden><div class="wrap">
  <div class="sec-head"><div><span class="kicker">Pick up where you left off</span><h2>Continue playing</h2></div><a class="more" href="/me/">My Arcade ${ICON.arrow}</a></div>
  <div class="shelf"></div>
</div></section>
${GAMES.map((g) => `<template data-card="${g.slug}">${card(g)}</template>`).join("")}

<section aria-labelledby="feat-h"><div class="wrap">
  <div class="sec-head reveal"><div><span class="kicker">Flagships</span><h2 id="feat-h">The big ones</h2><p>The most ambitious builds in the arcade — each one a single AI session of a few prompts.</p></div></div>
  <div class="grid">
    ${card(flagship, { feature: true, isNew: isNew(flagship, now) })}
    ${card(second, { feature: true, isNew: isNew(second, now) })}
  </div>
</div></section>

${newOnes.length ? `<section aria-labelledby="new-h"><div class="wrap">
  <div class="sec-head reveal"><div><span class="kicker">Fresh drops</span><h2 id="new-h">New this month</h2></div><a class="more" href="/new/">What's new ${ICON.arrow}</a></div>
  <div class="shelf">${newOnes.filter((g) => g !== flagship && g !== second).map((g) => card(g, { isNew: true })).join("")}</div>
</div></section>` : ""}

${shelves.map(([title, fn], k) => { const list = byOrder().filter(fn); return list.length ? `<section aria-labelledby="sh-${k}"><div class="wrap">
  <div class="sec-head reveal"><div><h2 id="sh-${k}">${esc(title)}</h2></div><a class="more" href="/games/">All games ${ICON.arrow}</a></div>
  <div class="shelf">${list.map((g) => card(g, { isNew: isNew(g, now) })).join("")}</div>
</div></section>` : ""; }).join("")}

<section aria-labelledby="lab-h"><div class="wrap">
  <div class="sec-head reveal"><div><span class="kicker">For the curious</span><h2 id="lab-h">Open the hood</h2><p>Every game page shows the model that made it, the brief it was given, what's technically interesting inside — and the full source, syntax-highlighted.</p></div><a class="more" href="/lab/">The Lab ${ICON.arrow}</a></div>
  <div class="bignums">
    <div class="bignum reveal"><b data-count="${totals.lines}">${fmt(totals.lines)}</b><span>lines of AI-written game code</span></div>
    <div class="bignum reveal"><b data-count="${Math.round(totals.bytes / 1024)}" data-suffix=" KB">${fmt(Math.round(totals.bytes / 1024))} KB</b><span>of games — no engines, no image files for most</span></div>
    <div class="bignum reveal"><b>20 Hz</b><span>authoritative multiplayer ticks on a Durable Object</span></div>
    <div class="bignum reveal"><b data-count="${GAMES.length}">${GAMES.length}</b><span>games, each credited to the model that made it</span></div>
  </div>
</div></section>`;
  return {
    path: "/",
    html: layout({
      title: SITE.name, description: SITE.description, path: "/", v: ctx.v, body, og: "/og/home.png",
      scripts: `<script src="/assets/hero.js?v=${ctx.v("assets/hero.js")}" defer></script>`,
      schema: [{ "@context": "https://schema.org", "@type": "WebSite", name: SITE.name, url: SITE.url + "/", potentialAction: { "@type": "SearchAction", target: SITE.url + "/games/?q={q}", "query-input": "required name=q" } },
        { "@context": "https://schema.org", "@type": "ItemList", name: "PromptArcade games", itemListElement: byOrder().map((g, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE.url}/games/${g.slug}/`, name: g.title })) }]
    })
  };
}

export function library(ctx) {
  const makers = [...new Set(GAMES.map((g) => makerClass(g.credit)))];
  const tagsF = ["multiplayer", "daily", "3d", "physics"];
  const body = `<div class="wrap" style="padding-top:34px">
  <div class="sec-head"><div><span class="kicker">The arcade</span><h2 style="font-size:clamp(32px,4.6vw,56px)">All ${GAMES.length} games</h2><p>Every one free, no account needed, playable on desktop and phone — and every one written by an AI model.</p></div></div>
  <div class="filters" role="search">
    <input id="f-q" type="search" placeholder="Search by name, genre or model…" aria-label="Search games"/>
    <div class="fchips" aria-label="Genre">
      <button class="fchip" type="button" data-genre="all" aria-pressed="true">All</button>
      ${genres().map((x) => `<button class="fchip" type="button" data-genre="${esc(x.toLowerCase())}" aria-pressed="false">${esc(x)}</button>`).join("")}
      ${tagsF.filter((t) => GAMES.some((g) => g.tags.includes(t)) && !genres().map((x) => x.toLowerCase()).includes(t)).map((t) => `<button class="fchip" type="button" data-genre="${t}" aria-pressed="false">${t === "3d" ? "3D" : t[0].toUpperCase() + t.slice(1)}</button>`).join("")}
    </div>
    ${makers.length > 1 ? `<div class="fchips" aria-label="Made by">${makers.map((m) => `<button class="fchip" type="button" data-maker="${m}" aria-pressed="false">Made by ${m[0].toUpperCase() + m.slice(1)}</button>`).join("")}</div>` : ""}
    <select id="f-sort" aria-label="Sort"><option value="featured">Featured</option><option value="new">Newest</option><option value="az">A–Z</option><option value="played">Most played by you</option></select>
  </div>
  <div class="grid" id="library">${byOrder().map((g, i) => card(g, { isNew: isNew(g, ctx.now), order: i, vt: true })).join("")}</div>
  <p class="empty" id="f-empty" hidden>No games match that. Try another search.</p>
</div>`;
  return { path: "/games/", html: layout({ title: "All games", description: `Browse all ${GAMES.length} free AI-made browser games on PromptArcade: multiplayer, roguelites, puzzles, daily challenges and 3D.`, path: "/games/", v: ctx.v, body }) };
}

export function game(ctx, g) {
  const st = ctx.stats[g.slug];
  const related = GAMES.filter((x) => x !== g && (x.genre === g.genre || x.tags.some((t) => g.tags.includes(t)))).slice(0, 3);
  while (related.length < 3) { const x = GAMES.find((y) => y !== g && !related.includes(y)); if (!x) break; related.push(x); }
  const tall = ["wordglow", "nebula-drop", "block-bloom"].includes(g.slug);
  const c = g.credit;
  const modelLine = c.model ? `${esc(c.model)}` : `${esc(c.maker)} <span class="note" style="display:inline">(model version not recorded)</span>`;
  const desc = `${g.tagline} Play ${g.title} free in your browser — made by ${c.model || c.maker} from prompts. Global Top 10, no account needed.`;
  const body = `<div class="ghead" style="--a:${g.accent};--b:${g.accent2}"><div class="wrap">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Arcade</a><span>/</span><a href="/games/">Games</a><span>/</span><span>${esc(g.title)}</span></nav>
  <h1>${esc(g.title)}</h1>
  <p class="tagline">${esc(g.tagline)}</p>
  <div class="chips"><span class="chip maker ${makerClass(c)}">Made with ${esc(creditLabel(c))}</span><span class="chip">${esc(g.genre)}</span><span class="chip">${esc(g.difficulty)}</span>${g.tags.includes("multiplayer") ? '<span class="chip live">Live multiplayer</span>' : ""}${g.daily ? '<span class="chip daily">Daily mode</span>' : ""}${isNew(g, ctx.now) ? '<span class="chip new">NEW</span>' : ""}</div>
</div></div>
<div class="wrap" style="--a:${g.accent};--b:${g.accent2}">
  <div class="beat" id="beat" hidden>🏁 A friend scored <b>0</b> — think you can beat it?</div>
  <div class="gmain">
    <div>
      <div class="player${tall ? " tall" : ""}" data-slug="${g.slug}">
        <iframe data-src="${playUrl(g)}" title="${esc(g.title)}" allow="fullscreen; autoplay; gamepad" allowfullscreen loading="lazy"></iframe>
        <button class="player-poster" type="button" aria-label="Play ${esc(g.title)}"><img src="/shots/${g.slug}.webp" alt="" width="800" height="500" style="view-transition-name:shot-${g.slug}"/><span class="go"><i>${ICON.play}</i><b>Play ${esc(g.title)}</b></span></button>
      </div>
      <div class="ptools">
        <button class="btn ghost small" type="button" id="fs-btn">${ICON.full} Fullscreen</button>
        <a class="btn ghost small" href="${playUrl(g)}">${ICON.open} Open on its own</a>
        <button class="btn ghost small" type="button" id="share-btn">${ICON.share} Share</button>
        <a class="btn ghost small" href="/games/${g.slug}/source/">${ICON.code} Read the source</a>
      </div>
    </div>
    <aside>
      <div class="panel"><h2>Top 10 <span id="board-src" class="chip">Loading</span></h2><ol class="board" id="board"><li class="wait">Loading scores…</li></ol></div>
      <div class="panel"><h2>You</h2><div class="mine"><div><b id="my-best">–</b><span>Your best</span></div><div><b id="my-plays">0</b><span>Runs</span></div></div><p id="my-name" style="margin:.8em 0 0;font-size:13.5px"></p></div>
      <div class="panel"><h2>Controls</h2><dl class="controls">${(st.controls || []).map(([k, d]) => `<dt>${esc(k)}</dt><dd>${esc(d)}</dd>`).join("")}<dt>Esc</dt><dd>Pause menu</dd></dl></div>
    </aside>
  </div>
  <div class="made">
    <div class="panel reveal">
      <span class="kicker">About the game</span>
      <h2>${esc(g.title)}</h2>
      <p style="color:#d4d6f5;margin:0 0 12px">${esc(g.about)}</p>
      <p class="note">Scores save automatically to the global Top 10 under your player name. Scored in ${esc(g.unit)}.</p>
    </div>
    <div class="panel reveal">
      <span class="kicker">How it was made</span>
      <div class="credit"><span class="mark ${makerClass(c)}">${esc(c.maker[0])}</span><div><b>${modelLine}</b><span>${esc(c.via)} · ${c.method === "single-prompt" ? "one prompt" : c.method === "agentic" ? "agentic build session" : "multi-prompt build"}</span></div></div>
      <div class="brief">${esc(g.brief)}</div>
      ${g.process ? `<p style="color:var(--muted);font-size:14px">${esc(g.process)}</p>` : ""}
      <ul class="tech">${(g.tech || []).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
      <div class="codestats"><div><b>${fmt(st.lines)}</b><span>lines of code</span></div><div><b>${fmt(Math.round(st.bytes / 1024))} KB</b><span>${st.files} file${st.files === 1 ? "" : "s"}</span></div><div><b>${st.deps}</b><span>libraries</span></div></div>
      <a class="btn small" href="/games/${g.slug}/source/">${ICON.code} Read the source</a>
    </div>
  </div>
  <section style="padding-top:44px"><div class="sec-head"><div><h2>More like this</h2></div><a class="more" href="/games/">All games ${ICON.arrow}</a></div>
  <div class="grid">${related.map((x) => card(x, { isNew: isNew(x, ctx.now) })).join("")}</div></section>
</div>`;
  return {
    path: `/games/${g.slug}/`,
    html: layout({
      title: `${g.title} — play free`, description: desc, path: `/games/${g.slug}/`, v: ctx.v, body, og: `/og/${g.slug}.png`,
      head: `<link rel="preload" as="image" href="/shots/${g.slug}.webp"/>`,
      schema: { "@context": "https://schema.org", "@type": "VideoGame", name: g.title, url: `${SITE.url}/games/${g.slug}/`, description: g.about, genre: g.genre, image: `${SITE.url}/og/${g.slug}.png`, gamePlatform: "Web browser", applicationCategory: "Game", operatingSystem: "Any", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, author: { "@type": "Organization", name: SITE.name }, isAccessibleForFree: true }
    })
  };
}

export function source(ctx, g) {
  const st = ctx.stats[g.slug];
  const body = `<div class="wrap" style="padding-top:34px;--a:${g.accent};--b:${g.accent2}">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/games/">Games</a><span>/</span><a href="/games/${g.slug}/">${esc(g.title)}</a><span>/</span><span>Source</span></nav>
  <div class="sec-head"><div><span class="kicker">Source code</span><h2>${esc(g.title)}</h2><p>Exactly what your browser runs — written by ${esc(g.credit.model || g.credit.maker)}. ${fmt(st.lines)} lines across ${st.files} file${st.files === 1 ? "" : "s"}${st.shared ? ", plus the shared arcade kit (pause menu, audio, scores) every game loads" : ""}.</p></div><a class="btn small" href="/games/${g.slug}/#play">${ICON.play} Play it</a></div>
  ${st.sources.map((f) => `<h3 style="font:700 13px var(--mono);color:var(--muted);margin:22px 0 8px">${esc(f.name)} · ${fmt(f.lines)} lines</h3><div class="src"><pre><code>${highlight(f.text)}</code></pre></div>`).join("")}
</div>`;
  return { path: `/games/${g.slug}/source/`, html: layout({ title: `${g.title} source code`, description: `Read the full, syntax-highlighted source of ${g.title}, a browser game written by ${g.credit.model || g.credit.maker}.`, path: `/games/${g.slug}/source/`, v: ctx.v, body, og: `/og/${g.slug}.png` }) };
}

export function daily(ctx) {
  const body = `<div class="wrap" style="padding-top:34px">
  <div class="sec-head"><div><span class="kicker">Daily</span><h2 style="font-size:clamp(32px,4.6vw,56px)">Today in the arcade</h2><p>Three things change every day at your local midnight. Play any game on consecutive days to grow your streak — it's tracked on your Arcade Pass.</p></div><span class="countdown" data-countdown style="font-size:15px"></span></div>
  <div class="today">
    <a class="tcard reveal" data-quest href="/games/">
      <span class="kicker" style="color:var(--gold)">Daily quest · +100 XP</span>
      <h3 class="q-text">Today's quest</h3><p class="q-game"></p>
      <div class="qbar"><i></i></div>
      <div class="row"><span class="status todo">Loading…</span></div>
      <p class="q-best" style="font-size:13px"></p>
    </a>
    <a class="tcard reveal" data-wordglow href="/games/wordglow/#play" style="--a:rgba(46,230,197,.35)">
      <span class="kicker" style="color:#2ee6c5">Wordglow daily</span><span class="big">#1</span>
      <p>Guess today's five-letter word in six tries. Share your grid.</p>
      <div class="row"><span class="status todo">Not played yet</span><span class="streak countdown"></span></div>
    </a>
    <a class="tcard reveal" data-delve href="/games/deepdelve/#play" style="--a:rgba(255,207,112,.35)">
      <span class="kicker" style="color:#ffcf70">Daily Delve</span><h3>Today's dungeon</h3>
      <p>Everyone gets the same procedurally generated dungeon today.</p>
      <div class="row"><span class="status todo">Today's dungeon is waiting</span><span class="seed countdown"></span></div>
    </a>
  </div>
  <section><div class="panel reveal" style="padding:24px">
    <h2>Your streak · <span id="daily-streak">0</span> days</h2>
    <p style="color:var(--muted);margin:0">Each lit square is a day you finished at least one run, over the last 30 days.</p>
    <div class="days" id="daily-days"></div>
  </div></section>
</div>`;
  return { path: "/daily/", html: layout({ title: "Daily challenges", description: "Today's PromptArcade quest, the Wordglow daily word and the Daily Delve dungeon — new every day, with streaks.", path: "/daily/", v: ctx.v, body }) };
}

export function hallOfFame(ctx) {
  const body = `<div class="wrap" style="padding-top:34px">
  <div class="sec-head"><div><span class="kicker">Hall of Fame</span><h2 style="font-size:clamp(32px,4.6vw,56px)">The best players in the arcade</h2><p id="hof-src">Loading the global boards…</p></div></div>
  <h3 style="font:800 13px var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--muted)">Arcade champions</h3>
  <div class="champs" id="champs"></div>
  <div class="hof" id="hof">${byOrder().map((g) => `<div class="panel reveal" data-slug="${g.slug}" style="--a:${g.accent}"><h3><a href="/games/${g.slug}/">${esc(g.title)}</a><span class="chip">${esc(g.unit)}</span></h3><ol class="board"><li class="wait">Loading…</li></ol></div>`).join("")}</div>
</div>`;
  return { path: "/hall-of-fame/", html: layout({ title: "Hall of Fame", description: "Top scores on every PromptArcade game and the arcade's overall champions.", path: "/hall-of-fame/", v: ctx.v, body }) };
}

export function me(ctx) {
  const body = `<div class="wrap" style="padding-top:34px" id="me">
  <div class="passcard reveal">
    <div class="ring"><div><b id="me-level">1</b><span>LEVEL</span></div></div>
    <div><span class="kicker" style="color:var(--gold)">Arcade Pass</span><h1>My Arcade</h1><p id="me-xp">0 XP</p><p id="me-name" style="margin-top:10px;font-size:14px"></p></div>
    <div class="streak"><b id="me-streak">0</b><span>day streak 🔥</span></div>
  </div>
  <div class="bignums">
    <div class="bignum"><b id="me-runs">0</b><span>runs finished</span></div>
    <div class="bignum"><b id="me-games">0</b><span>games played</span></div>
    <div class="bignum"><b id="me-quests">0</b><span>daily quests done</span></div>
    <div class="bignum"><b id="me-badge-count">0</b><span>badges</span></div>
  </div>
  <section style="padding:20px 0" id="account"><div class="panel acct">
    <h2>Account <span class="acct-tag" id="acct-tag">Optional</span></h2>
    <div id="acct-out">
      <p class="acct-lead">Sign in with your email to keep your name, scores, XP and badges on every device. No password: we email you a 6-digit code.</p>
      <form class="acct-row" id="acct-email-form" novalidate><input type="email" id="acct-email" placeholder="Your email address" autocomplete="email" inputmode="email" required aria-label="Email address"/><button class="btn small" type="submit" id="acct-send">Email me a code</button></form>
    </div>
    <div id="acct-code" hidden>
      <p class="acct-lead">We sent a code to <b id="acct-code-to"></b>. It works for 15 minutes.</p>
      <form class="acct-row" id="acct-code-form" novalidate><input id="acct-code-input" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="123456" aria-label="6-digit code"/><button class="btn small" type="submit" id="acct-verify">Sign in</button></form>
      <p class="note"><button class="linkbtn" type="button" id="acct-back">Use a different email</button> · <button class="linkbtn" type="button" id="acct-resend">Send a new code</button></p>
    </div>
    <div id="acct-in" hidden>
      <p class="acct-lead">Signed in as <b id="acct-who"></b>. Your progress syncs on its own when you finish a run or leave the page.</p>
      <div class="acct-row"><button class="btn small" type="button" id="acct-sync">Sync now</button><button class="btn ghost small" type="button" id="acct-signout">Sign out on this device</button></div>
    </div>
    <p class="acct-msg" id="acct-msg" role="status"></p>
  </div></section>
  <section style="padding:20px 0"><div class="panel"><h2>Last 30 days</h2><div class="days" id="me-days"></div></div></section>
  <section style="padding:20px 0"><div class="sec-head"><div><h2>Badges</h2><p>Earn XP from every run, +100 for the daily quest, +50 for every badge.</p></div></div><div class="badges" id="me-badges"></div></section>
  <section style="padding:20px 0"><div class="sec-head"><div><h2>Your games</h2></div></div><div class="statgrid" id="me-stats"></div></section>
  <p class="note">Without an account your pass lives in this browser only. <button class="btn ghost small" type="button" id="me-reset" style="margin-left:8px">Reset my pass</button></p>
</div>`;
  return { path: "/me/", html: layout({ title: "My Arcade Pass", description: "Your PromptArcade level, XP, badges, streak and personal bests. Sign in to sync them across devices.", path: "/me/", v: ctx.v, body, noindex: true }) };
}

export function lab(ctx) {
  const t = ctx.totals;
  const rows = byOrder().map((g) => { const s = ctx.stats[g.slug]; return `<tr><td><a href="/games/${g.slug}/">${esc(g.title)}</a></td><td><span class="chip maker ${makerClass(g.credit)}">${esc(g.credit.model || g.credit.maker)}</span></td><td>${esc(g.credit.via)}</td><td>${g.credit.method === "agentic" ? "Agentic session" : g.credit.method === "single-prompt" ? "Single prompt" : "Multi-prompt"}</td><td class="num">${fmt(s.lines)}</td><td class="num">${fmt(Math.round(s.bytes / 1024))} KB</td><td><a href="/games/${g.slug}/source/" style="color:var(--cyan);font-weight:700">Source</a></td></tr>`; }).join("");
  const body = `<div class="wrap lab-hero" style="padding-top:34px">
  <span class="kicker">The Lab</span>
  <h1>How a sentence<br/>becomes a game.</h1>
  <p style="max-width:720px;color:#d2d3f0;font-size:18px">Nothing in this arcade was hand-coded. Every game was produced by an AI model from written prompts — then played, critiqued and refined by prompting again. Here's the process, the credits and the numbers.</p>
  <div class="bignums">
    <div class="bignum reveal"><b data-count="${t.lines}">${fmt(t.lines)}</b><span>lines of game code, all AI-written</span></div>
    <div class="bignum reveal"><b data-count="${GAMES.length}">${GAMES.length}</b><span>games live today</span></div>
    <div class="bignum reveal"><b data-count="${t.claudeNew}">${t.claudeNew}</b><span>built by Claude Opus 5.5 in one session</span></div>
    <div class="bignum reveal"><b>1</b><span>shared simulation for client and server multiplayer</span></div>
  </div>
  <section><div class="sec-head"><div><h2>The process</h2></div></div>
  <div class="steps">
    <div class="reveal"><h3>A one-paragraph brief</h3><p>Each game starts as a plain description: the genre, the hook, what should make it fun. Every game page shows its brief.</p></div>
    <div class="reveal"><h3>The model writes everything</h3><p>Game loop, physics, AI opponents, procedural art and sound, touch controls — usually as a single self-contained HTML file with no engine.</p></div>
    <div class="reveal"><h3>Play-test, prompt, repeat</h3><p>The build is played in a real (headless) browser, screenshots are reviewed, and bugs or feel problems go back as new prompts.</p></div>
    <div class="reveal"><h3>Plug into the arcade</h3><p>A shared kit adds the pause menu, music, name gate, global leaderboard and the Arcade Pass to every game.</p></div>
  </div></section>
  <section><div class="sec-head"><div><h2>Inside Glowline Arena</h2><p>The live multiplayer game runs the exact same simulation file in two places. When the server is reachable, a Cloudflare Durable Object is the authority; when it isn't, your browser runs the match locally against bots — same rules, same bots.</p></div></div>
  <div class="diagram reveal">${ARCH_SVG}</div></section>
  <section><div class="sec-head"><div><h2>Credits for every game</h2><p>Which model made what, how, and how big it is. “Version not recorded” means we know the model family but not the exact release used at the time.</p></div></div>
  <div class="ctable-wrap"><table class="ctable"><thead><tr><th>Game</th><th>Model</th><th>Built in</th><th>Method</th><th style="text-align:right">Lines</th><th style="text-align:right">Size</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></section>
  <section><div class="panel"><h2>The fine print</h2><p style="color:var(--muted);margin:0">Some games are inspired by well-known genres — survivors-likes, merge puzzles, word games, twin-stick shooters. Game mechanics are free for anyone to use; every name, look and line of code here is original. ${SITE.name} is an independent project and isn't affiliated with Anthropic, xAI or any other AI lab, or with any game publisher.</p></div></section>
</div>`;
  return { path: "/lab/", html: layout({ title: "The Lab — how the games are made", description: "How PromptArcade's games are built by AI from prompts: the process, model credits, code stats and the multiplayer architecture.", path: "/lab/", v: ctx.v, body }) };
}

const ARCH_SVG = `<svg viewBox="0 0 960 300" role="img" aria-label="Glowline Arena architecture diagram"><defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#a9abd6"/></marker></defs>
<g font-family="Manrope,sans-serif" font-size="14" fill="#f3f1ff">
<rect x="20" y="40" width="250" height="220" rx="18" fill="rgba(94,242,255,.07)" stroke="rgba(94,242,255,.5)"/><text x="40" y="72" font-weight="800" font-size="16">Your browser</text>
<rect x="40" y="90" width="210" height="44" rx="10" fill="#12123a" stroke="rgba(170,175,255,.3)"/><text x="56" y="117">Renderer · interpolation</text>
<rect x="40" y="146" width="210" height="44" rx="10" fill="#12123a" stroke="rgba(170,175,255,.3)"/><text x="56" y="173">Input → {angle, boost}</text>
<rect x="40" y="202" width="210" height="44" rx="10" fill="rgba(255,211,107,.12)" stroke="rgba(255,211,107,.6)"/><text x="56" y="229">sim.js (offline fallback)</text>
<rect x="355" y="95" width="250" height="110" rx="18" fill="rgba(167,139,250,.08)" stroke="rgba(167,139,250,.5)"/><text x="375" y="127" font-weight="800" font-size="16">WebSocket</text><text x="375" y="152" fill="#a9abd6">binary frames · ~400 B / tick</text><text x="375" y="176" fill="#a9abd6">heads only; bodies rebuilt</text>
<rect x="690" y="40" width="250" height="220" rx="18" fill="rgba(255,92,168,.07)" stroke="rgba(255,92,168,.5)"/><text x="710" y="72" font-weight="800" font-size="16">Durable Object</text>
<rect x="710" y="90" width="210" height="44" rx="10" fill="#12123a" stroke="rgba(170,175,255,.3)"/><text x="726" y="117">room.js · 20 Hz clock</text>
<rect x="710" y="146" width="210" height="44" rx="10" fill="rgba(255,211,107,.12)" stroke="rgba(255,211,107,.6)"/><text x="726" y="173">sim.js (authoritative)</text>
<rect x="710" y="202" width="210" height="44" rx="10" fill="#12123a" stroke="rgba(170,175,255,.3)"/><text x="726" y="229">Bots fill empty seats</text>
<path d="M270 125 L350 125" stroke="#a9abd6" stroke-width="2" marker-end="url(#ar)"/><path d="M605 125 L685 125" stroke="#a9abd6" stroke-width="2" marker-end="url(#ar)"/>
<path d="M685 180 L605 180" stroke="#a9abd6" stroke-width="2" marker-end="url(#ar)"/><path d="M350 180 L270 180" stroke="#a9abd6" stroke-width="2" marker-end="url(#ar)"/>
<text x="480" y="270" text-anchor="middle" fill="#ffd36b" font-weight="700">same file, two places</text>
<path d="M250 236 C 420 300, 540 300, 710 176" stroke="rgba(255,211,107,.55)" stroke-width="1.6" stroke-dasharray="5 6" fill="none"/>
</g></svg>`;

export function news(ctx) {
  const body = `<div class="wrap prose" style="padding-top:34px"><span class="kicker">Changelog</span><h1>What's new</h1>
  <div class="news">${NEWS.map((n) => `<article class="reveal"><time datetime="${n.date}">${new Date(n.date + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</time><h2>${esc(n.title)}</h2><p>${esc(n.body)}</p></article>`).join("")}</div></div>`;
  return { path: "/new/", html: layout({ title: "What's new", description: "New games and updates on PromptArcade.", path: "/new/", v: ctx.v, body }) };
}

function prose(ctx, path, title, description, inner) {
  return { path, html: layout({ title, description, path, v: ctx.v, body: `<div class="wrap prose" style="padding-top:34px">${inner}</div>` }) };
}
export function about(ctx) {
  return prose(ctx, "/about/", "About", "What PromptArcade is and how its AI-made games work.", `<span class="kicker">About</span><h1>An arcade written by AI</h1>
<p>${SITE.name} is a growing collection of browser games that were all made by AI models from written prompts. The point is simple: to show — and let you play — what today's models can build from a few sentences of direction.</p>
<h2>What “made with prompts” means</h2>
<p>Each game was generated and refined by an AI model. Some came from a single agentic session where the model wrote, play-tested and fixed the game itself; others from multi-step prompting in a coding tool. Every game page names the model, how it was built and the brief it was given — and links to the full source.</p>
<h2>Scores, the Arcade Pass and multiplayer</h2>
<p>Before a game starts you type a player name. When a run ends, the score saves automatically to that game's global Top 10. Your XP, badges and streaks (the Arcade Pass) are kept in your browser. Glowline Arena connects to a live multiplayer server when it's available and plays offline against bots when it isn't.</p>
<h2>New games</h2>
<p>New games are added regularly — check <a href="/new/">What's new</a>, or look for the NEW badge.</p>
<h2>Inspired by classics</h2>
<p>Some games borrow well-loved genres and mechanics. Every name, piece of art and line of code is original, and none of them are affiliated with or endorsed by the owners of any other game.</p>
<p>${SITE.name} is an independent project and is not affiliated with Anthropic, xAI, OpenAI, Google or any other AI lab.</p>
<p>Contact: <a href="mailto:${SITE.email}">${SITE.email}</a></p>`);
}
export function privacy(ctx) {
  return prose(ctx, "/privacy/", "Privacy", "How PromptArcade handles your data.", `<span class="kicker">Privacy</span><h1>Privacy</h1>
<p>${SITE.name} works without an account and collects as little as possible. Signing in is optional.</p>
<h2>On your device</h2>
<p>Your player name, scores, Arcade Pass (XP, badges, streaks), game progress (for example your Wordglow stats and Ember Swarm upgrades) and sound preferences are stored in your browser's localStorage so the site remembers them. Clearing site data removes them.</p>
<h2>Optional account</h2>
<p>If you sign in on the My Arcade page, we store your email address so we can email you one-time sign-in codes, and we link it to your player. While you're signed in, your player name, scores, Arcade Pass and game progress are copied to our database on Cloudflare so they appear on your other devices. We use your email only for sign-in codes — no newsletters — and it is never shown publicly. Codes are sent through our email provider, Resend. To delete your account and its saved progress, email <a href="mailto:${SITE.email}">${SITE.email}</a> from that address.</p>
<h2>Shared leaderboards</h2>
<p>When a run ends, the game sends your player name and score to our leaderboard service on Cloudflare, where it is shown publicly on that game's Top 10 and the Hall of Fame. To limit spam we store a short salted hash derived from your IP address and the date — not the IP address itself.</p>
<h2>Multiplayer</h2>
<p>When you play Glowline Arena online, your player name, chosen skin and in-game movements are sent to our game server on Cloudflare so other players can see you. Matches are not recorded; nothing is kept after you leave.</p>
<h2>Hosting and analytics</h2>
<p>The site is hosted on Cloudflare, which processes standard request data to serve pages and may provide privacy-friendly, cookie-free visit counts.</p>
<p>We use Google Analytics to understand how the site is used (for example which pages and games are visited, roughly where visitors come from, and what device and browser they use). Google Analytics sets cookies (such as <code>_ga</code>) and receives your IP address and browsing data from your visit; we don't send it your player name. See <a href="https://policies.google.com/technologies/partner-sites">how Google uses information from sites that use its services</a> and the <a href="https://policies.google.com/privacy">Google Privacy Policy</a>. You can opt out with the <a href="https://tools.google.com/dlpage/gaoptout">Google Analytics opt-out browser add-on</a>.</p>
<h2>Advertising</h2>
<p>We use Google AdSense to show ads. Google and its partners may use cookies to show ads based on your visits to this and other sites, and to measure them; where required you will be asked for consent first. See <a href="https://policies.google.com/technologies/ads">how Google uses information in ads</a>; you can turn off personalised ads in <a href="https://adssettings.google.com/">Google's Ad Settings</a>.</p>
<h2>Requests</h2>
<p>To remove a name or score, or for any privacy question, contact <a href="mailto:${SITE.email}">${SITE.email}</a>. We don't sell personal data.</p>`);
}
export function terms(ctx) {
  return prose(ctx, "/terms/", "Terms of use", "The terms for using PromptArcade.", `<span class="kicker">Terms</span><h1>Terms of use</h1>
<p>By using ${SITE.name} you agree to these terms.</p>
<h2>The games</h2><p>Games are provided free, as-is, for entertainment, without warranties of any kind. Some are inspired by classic genres; they are original works and are not affiliated with or endorsed by the owners of any other game.</p>
<h2>Player names and leaderboards</h2><p>Player names must not be offensive, impersonate others or contain personal information. We may remove names or scores that break these rules or that look automated or tampered with, and we may reset leaderboards.</p>
<h2>Fair play</h2><p>Don't attack the site or the multiplayer server, automate score submissions or interfere with other players.</p>
<h2>Advertising</h2><p>The site may show clearly labelled ads to cover hosting. Ads are never disguised as game controls or content.</p>
<h2>Changes</h2><p>We may update these terms; the current version is always on this page.</p>
<p>Questions: <a href="mailto:${SITE.email}">${SITE.email}</a></p>`);
}
export function contact(ctx) {
  return prose(ctx, "/contact/", "Contact", "Contact PromptArcade.", `<span class="kicker">Contact</span><h1>Contact</h1>
<p>Questions, bug reports, game ideas, leaderboard issues or takedown requests — one address handles everything.</p>
<p style="font:800 clamp(20px,3vw,30px) var(--display)"><a href="mailto:${SITE.email}">${SITE.email}</a></p>
<h2>Helpful details</h2><ul><li>The game and what you were doing when something went wrong.</li><li>Your browser and device.</li><li>For leaderboard problems: the game, the player name and the approximate time.</li></ul>`);
}
export function notFound(ctx) {
  const body = `<div class="wrap" style="padding:90px 0 40px;text-align:center"><span class="kicker">404</span><h1 style="font:800 clamp(40px,7vw,90px)/1 var(--display);letter-spacing:-.04em;margin:.3em 0">Game over.</h1><p style="color:var(--muted);font-size:18px">That page doesn't exist — but these do.</p><div class="ctas" style="justify-content:center;display:flex;gap:12px;margin:24px 0 40px"><a class="btn" href="/games/">${ICON.play} Browse games</a><a class="btn ghost" href="/">Home</a></div>
  <div class="grid" style="text-align:left">${featured().slice(0, 3).map((g) => card(g)).join("")}</div></div>`;
  return { path: "/404.html", html: layout({ title: "Page not found", description: "This page doesn't exist.", path: "/404.html", v: ctx.v, body, noindex: true }) };
}
