/* PromptArcade 3 — site behaviour. Progressive: every page works without this file. */
(() => {
  "use strict";
  const D = document, W = window;
  const $ = (s, el = D) => el.querySelector(s);
  const $$ = (s, el = D) => [...el.querySelectorAll(s)];
  const DATA = W.PA_DATA || { games: [], quests: [] };
  const GAME = Object.fromEntries(DATA.games.map((g) => [g.slug, g]));
  const reduce = W.matchMedia && W.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const fmt = (n) => Number(n || 0).toLocaleString();
  const ago = (t) => { const s = Math.max(1, (Date.now() - t) / 1000); if (s < 60) return "just now"; if (s < 3600) return Math.floor(s / 60) + "m ago"; if (s < 86400) return Math.floor(s / 3600) + "h ago"; return Math.floor(s / 86400) + "d ago"; };
  const store = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (e) { return d; } };
  const dayNum = (d = new Date()) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
  const xpFor = (L) => Math.round(60 * Math.pow(L - 1, 1.6));
  const levelOf = (xp) => { let L = 1; while (xpFor(L + 1) <= xp) L++; return L; };
  const pass = () => store("pa_pass_v1", null) || { xp: 0, runs: 0, plays: {}, best: {}, badges: {}, days: { last: null, streak: 0, best: 0 }, quests: { day: null, total: 0 }, recent: [], dayList: [] };
  const liveStreak = (p) => (p.days && p.days.last != null && p.days.last >= dayNum() - 1 ? p.days.streak : 0);
  const todaysQuest = () => DATA.quests.length ? DATA.quests[((dayNum() % DATA.quests.length) + DATA.quests.length) % DATA.quests.length] : null;
  D.documentElement.classList.remove("js-off");

  /* ---------- toast ---------- */
  let toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = D.createElement("div"); toastEl.className = "toast"; toastEl.setAttribute("role", "status"); D.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add("on");
    clearTimeout(toast.t); toast.t = setTimeout(() => toastEl.classList.remove("on"), 2200);
  }

  /* ---------- nav ---------- */
  const nav = $(".nav");
  const onScroll = () => nav && nav.classList.toggle("scrolled", scrollY > 8);
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  const menuBtn = $(".menu-btn"), links = $(".nav-links");
  if (menuBtn) menuBtn.addEventListener("click", () => { const o = links.classList.toggle("open"); menuBtn.setAttribute("aria-expanded", o); });
  D.addEventListener("click", (e) => { if (links && links.classList.contains("open") && !e.target.closest(".nav-links,.menu-btn")) links.classList.remove("open"); });

  function paintPassChip() {
    const el = $(".pass-chip"); if (!el) return;
    const p = pass(), L = levelOf(p.xp), a = xpFor(L), b = xpFor(L + 1);
    el.querySelector(".lv").style.setProperty("--p", Math.round((p.xp - a) / (b - a) * 100) + "%");
    el.querySelector(".lv span").textContent = L;
    const s = liveStreak(p);
    el.querySelector(".fl").textContent = s > 1 ? "🔥" + s : "";
    el.title = `Arcade Pass level ${L} · ${fmt(p.xp)} XP` + (s ? ` · ${s}-day streak` : "");
  }
  paintPassChip();
  addEventListener("storage", (e) => { if (e.key === "pa_pass_v1") { paintPassChip(); paintBests(); } });
  addEventListener("message", (e) => { if (e.origin === location.origin && e.data && (e.data.type === "pa-pass" || e.data.type === "pa-score")) { setTimeout(() => { paintPassChip(); paintBests(); }, 60); } });

  /* ---------- reveal on scroll ---------- */
  if ("IntersectionObserver" in W && !reduce) {
    const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    $$(".reveal").forEach((el, i) => { el.style.transitionDelay = Math.min(6, i % 8) * 55 + "ms"; io.observe(el); });
  } else $$(".reveal").forEach((el) => el.classList.add("in"));

  /* ---------- card tilt + spotlight ---------- */
  if (!reduce && W.matchMedia("(hover: hover)").matches) {
    D.addEventListener("pointermove", (e) => {
      const c = e.target.closest && e.target.closest(".card");
      if (!c) return;
      const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c.style.setProperty("--mx", x * 100 + "%"); c.style.setProperty("--my", y * 100 + "%");
      c.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 6}deg) rotateY(${(x - 0.5) * 8}deg) translateY(-4px)`;
    });
    D.addEventListener("pointerout", (e) => { const c = e.target.closest && e.target.closest(".card"); if (c && !c.contains(e.relatedTarget)) c.style.transform = ""; });
  }

  /* ---------- personal bests on cards ---------- */
  function paintBests() {
    const p = pass();
    $$(".card[data-slug]").forEach((c) => {
      const b = p.best && p.best[c.dataset.slug];
      let el = c.querySelector(".card-best");
      if (b) { if (!el) { el = D.createElement("span"); el.className = "card-best"; c.appendChild(el); } el.textContent = "Best " + fmt(b); }
    });
  }
  paintBests();

  /* ---------- search palette (press / or Ctrl K) ---------- */
  let pal;
  function openPalette() {
    if (!pal) {
      pal = D.createElement("div"); pal.className = "palette"; pal.hidden = true;
      pal.innerHTML = '<div class="box" role="dialog" aria-label="Search games"><input type="search" placeholder="Search games, genres, models…" aria-label="Search games" autocomplete="off"/><ul></ul></div>';
      D.body.appendChild(pal);
      const inp = $("input", pal), ul = $("ul", pal);
      let sel = 0;
      const paint = () => {
        const q = inp.value.trim().toLowerCase();
        const hits = DATA.games.filter((g) => !q || (g.title + " " + g.genre + " " + g.tags.join(" ") + " " + g.maker + " " + (g.model || "") + " " + g.tagline).toLowerCase().includes(q));
        sel = Math.min(sel, Math.max(0, hits.length - 1));
        ul.innerHTML = hits.map((g, i) => `<li><a href="/games/${g.slug}/" class="${i === sel ? "sel" : ""}"><img src="/shots/${g.slug}.webp" alt="" width="64" height="40"/><div><b>${esc(g.title)}</b><span>${esc(g.genre)} · ${esc(g.model || g.maker)}</span></div></a></li>`).join("") || '<li style="padding:18px;color:var(--muted)">No games match.</li>';
      };
      inp.addEventListener("input", () => { sel = 0; paint(); });
      inp.addEventListener("keydown", (e) => {
        const items = $$("a", ul);
        if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(items.length - 1, sel + 1); paint(); }
        if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(0, sel - 1); paint(); }
        if (e.key === "Enter" && items[sel]) { location.href = items[sel].href; }
        if (e.key === "Escape") pal.hidden = true;
      });
      pal.addEventListener("click", (e) => { if (e.target === pal) pal.hidden = true; });
      pal.paint = paint;
    }
    pal.hidden = false; $("input", pal).value = ""; pal.paint(); setTimeout(() => $("input", pal).focus(), 20);
  }
  $$(".search-btn").forEach((b) => b.addEventListener("click", openPalette));
  D.addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("input,textarea,select,[contenteditable]")) return;
    if (e.key === "/" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) { e.preventDefault(); openPalette(); }
  });

  /* ---------- leaderboard helpers ---------- */
  const scores = W.paScores;
  const meId = () => (W.paPlayer && W.paPlayer.id && W.paPlayer.id()) || null;
  function boardHtml(rows, max, slug) {
    rows = (rows || []).slice(0, max || 10);
    if (!rows.length) return '<li class="wait">No scores yet — the top spot is open.</li>';
    const me = meId(), myName = (W.paPlayer && W.paPlayer.getName && W.paPlayer.getName()) || "";
    return rows.map((r, i) => `<li class="${(me && r.pid === me) || (!r.pid && myName && r.name === myName) ? "me" : ""}"><span class="r">${i + 1}</span><span class="n">${esc(r.name)}</span><span class="s">${fmt(r.score)}</span></li>`).join("");
  }

  /* ---------- live score ticker ---------- */
  const ticker = $(".ticker");
  if (ticker && scores) {
    scores.fetchAll(DATA.games.map((g) => g.slug)).then((d) => {
      const items = [];
      for (const [slug, rows] of Object.entries(d.games || {})) {
        if (!GAME[slug]) continue;
        (rows || []).forEach((r, i) => items.push({ slug, r, rank: i + 1 }));
      }
      items.sort((a, b) => (b.r.at || 0) - (a.r.at || 0));
      const top = items.slice(0, 24);
      if (top.length < 3) { ticker.hidden = true; return; }
      const html = top.map((x) => `<span class="item">${x.rank === 1 ? "👑" : "⚡"} <b>${esc(x.r.name)}</b> <i>${fmt(x.r.score)}</i> in <a href="/games/${x.slug}/">${esc(GAME[x.slug].title)}</a> · ${x.r.at ? ago(x.r.at) : "#" + x.rank}</span>`).join("");
      ticker.querySelector(".track").innerHTML = html + html;
      ticker.hidden = false;
    });
  }

  /* ---------- today panels ---------- */
  function countdown(el) {
    const tick = () => {
      const n = new Date(), m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1), s = Math.max(0, Math.floor((m - n) / 1000));
      el.textContent = `Resets in ${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    };
    tick(); setInterval(tick, 1000);
  }
  $$("[data-countdown]").forEach(countdown);
  const q = todaysQuest();
  $$("[data-quest]").forEach((el) => {
    if (!q) return;
    const p = pass(), done = p.quests && p.quests.day === dayNum(), g = GAME[q.game];
    el.style.setProperty("--a", (g && g.accent ? g.accent : "#5ef2ff") + "55");
    el.href = "/games/" + q.game + "/";
    $(".q-text", el).textContent = q.text;
    $(".q-game", el).textContent = g ? g.title : "";
    const st = $(".status", el); st.textContent = done ? "Completed today ✓" : "Not done yet"; st.className = "status " + (done ? "done" : "todo");
    const best = (p.best && p.best[q.game]) || 0;
    if (q.stat === "score") { $(".qbar i", el).style.setProperty("--w", Math.min(100, best / q.min * 100) + "%"); $(".q-best", el).textContent = best ? `Your best: ${fmt(best)} / ${fmt(q.min)}` : "Your first run counts"; }
    else { $(".qbar", el).style.display = "none"; $(".q-best", el).textContent = ""; }
    if (done) $(".qbar i", el).style.setProperty("--w", "100%");
  });
  $$("[data-wordglow]").forEach((el) => {
    const wg = store("wg_v1", {}), epoch = new Date(2026, 9, 11), n = new Date(), today = Math.round((new Date(n.getFullYear(), n.getMonth(), n.getDate()) - epoch) / 864e5);
    $(".big", el).textContent = "#" + (today + 1);
    const st = $(".status", el), d = wg.daily && wg.daily.day === today ? wg.daily : null;
    if (d && d.result != null) { st.textContent = d.result ? `Solved in ${d.result}/6 ✓` : "Missed today"; st.className = "status done"; }
    else { st.textContent = d && d.rows && d.rows.length ? `In progress · ${d.rows.length}/6` : "Not played yet"; st.className = "status todo"; }
    const s = wg.stats && wg.stats.lastWin != null && wg.stats.lastWin >= today - 1 ? wg.stats.streak : 0;
    $(".streak", el).textContent = s ? `🔥 ${s}-day streak` : "Start a streak";
  });
  $$("[data-delve]").forEach((el) => {
    const n = new Date(), seed = n.getFullYear() * 10000 + (n.getMonth() + 1) * 100 + n.getDate();
    const done = (() => { try { return localStorage.getItem("dd_daily") === String(seed); } catch (e) { return false; } })();
    const st = $(".status", el); st.textContent = done ? "Delved today ✓" : "Today's dungeon is waiting"; st.className = "status " + (done ? "done" : "todo");
    $(".seed", el).textContent = "Seed " + seed;
  });

  /* ---------- continue playing ---------- */
  $$("[data-continue]").forEach((sec) => {
    const p = pass(), recent = (p.recent || []).filter((s) => GAME[s]).slice(0, 6);
    if (!recent.length) return;
    sec.hidden = false;
    $(".shelf", sec).innerHTML = recent.map((s) => { const c = D.querySelector(`template[data-card="${s}"]`); return c ? c.innerHTML : ""; }).join("");
    paintBests();
  });

  /* ---------- hero fan ---------- */
  const fan = $(".fan");
  if (fan) {
    const cards = $$("a", fan);
    let i = 0;
    const lay = () => {
      cards.forEach((c, k) => {
        const o = ((k - i) % cards.length + cards.length) % cards.length;
        const pos = o > cards.length / 2 ? o - cards.length : o;
        const x = pos * 120, z = -Math.abs(pos) * 140, ry = -pos * 16, s = 1 - Math.abs(pos) * 0.08;
        c.style.transform = `translate3d(${x}px,${Math.abs(pos) * 12}px,${z}px) rotateY(${ry}deg) scale(${s})`;
        c.style.zIndex = 10 - Math.abs(pos);
        c.style.opacity = Math.abs(pos) > 2 ? 0 : 1;
        c.style.filter = pos === 0 ? "none" : `brightness(${0.75 - Math.abs(pos) * 0.12})`;
        c.tabIndex = pos === 0 ? 0 : -1;
      });
    };
    lay();
    let timer = reduce ? 0 : setInterval(() => { i = (i + 1) % cards.length; lay(); }, 3400);
    fan.addEventListener("pointerenter", () => clearInterval(timer));
    fan.addEventListener("pointerleave", () => { if (!reduce) timer = setInterval(() => { i = (i + 1) % cards.length; lay(); }, 3400); });
    cards.forEach((c, k) => c.addEventListener("click", (e) => { const o = ((k - i) % cards.length + cards.length) % cards.length; if (o !== 0) { e.preventDefault(); i = k; lay(); } }));
  }

  /* ---------- count-up numbers ---------- */
  $$("[data-count]").forEach((el) => {
    const to = +el.dataset.count, suf = el.dataset.suffix || "";
    if (reduce || !("IntersectionObserver" in W)) { el.textContent = fmt(to) + suf; return; }
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return; io.disconnect();
      const t0 = performance.now(), dur = 1400;
      const step = () => { const k = Math.min(1, (performance.now() - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(Math.round(to * e)) + suf; if (k < 1) requestAnimationFrame(step); };
      step();
    });
    io.observe(el);
  });

  /* ---------- all games: filters ---------- */
  const lib = $("#library");
  if (lib) {
    const cards = $$(".card", lib), inp = $("#f-q"), sortSel = $("#f-sort"), empty = $("#f-empty");
    const state = { genre: "all", maker: "all", q: "" };
    const params = new URLSearchParams(location.search);
    if (params.get("q")) { state.q = params.get("q"); inp.value = state.q; }
    if (params.get("genre")) state.genre = params.get("genre");
    const apply = () => {
      let n = 0;
      const q = state.q.toLowerCase();
      cards.forEach((c) => {
        const ok = (state.genre === "all" || c.dataset.genre === state.genre || c.dataset.tags.split(" ").includes(state.genre)) && (state.maker === "all" || c.dataset.maker === state.maker) && (!q || c.dataset.search.includes(q));
        c.hidden = !ok; if (ok) n++;
      });
      empty.hidden = n > 0;
      $$(".fchip[data-genre]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.genre === state.genre));
      $$(".fchip[data-maker]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.maker === state.maker));
      const u = new URL(location.href);
      state.q ? u.searchParams.set("q", state.q) : u.searchParams.delete("q");
      state.genre !== "all" ? u.searchParams.set("genre", state.genre) : u.searchParams.delete("genre");
      history.replaceState(null, "", u);
    };
    const sort = () => {
      const k = sortSel.value;
      const arr = cards.slice().sort((a, b) => k === "az" ? a.dataset.title.localeCompare(b.dataset.title) : k === "new" ? b.dataset.added.localeCompare(a.dataset.added) || (+a.dataset.order - +b.dataset.order) : k === "played" ? ((pass().plays[b.dataset.slug] || 0) - (pass().plays[a.dataset.slug] || 0)) : (+a.dataset.order - +b.dataset.order));
      const run = () => arr.forEach((c) => lib.appendChild(c));
      D.startViewTransition && !reduce ? D.startViewTransition(run) : run();
    };
    $$(".fchip[data-genre]").forEach((b) => b.addEventListener("click", () => { state.genre = b.dataset.genre; D.startViewTransition && !reduce ? D.startViewTransition(apply) : apply(); }));
    $$(".fchip[data-maker]").forEach((b) => b.addEventListener("click", () => { state.maker = state.maker === b.dataset.maker ? "all" : b.dataset.maker; apply(); }));
    inp.addEventListener("input", () => { state.q = inp.value.trim(); apply(); });
    sortSel.addEventListener("change", sort);
    apply();
  }

  /* ---------- game page ---------- */
  const player = $(".player");
  if (player) {
    const slug = player.dataset.slug, frame = $("iframe", player), poster = $(".player-poster", player);
    const start = () => {
      if (!frame.src) frame.src = frame.dataset.src;
      poster && poster.remove();
      setTimeout(() => { try { frame.focus(); frame.contentWindow.focus(); } catch (e) {} }, 120);
    };
    // on phones the game gets the whole screen: open the play page itself
    const phone = () => W.matchMedia("(pointer: coarse)").matches && Math.min(innerWidth, innerHeight) < 700;
    if (poster) poster.addEventListener("click", () => { if (phone()) location.href = frame.dataset.src; else start(); });
    if (location.hash === "#play") { if (phone()) location.replace(frame.dataset.src); else start(); }
    const fsBtn = $("#fs-btn");
    if (fsBtn) fsBtn.addEventListener("click", () => {
      start();
      const el = player;
      (el.requestFullscreen || el.webkitRequestFullscreen || (() => { location.href = frame.dataset.src; })).call(el);
    });
    const shareBtn = $("#share-btn");
    if (shareBtn) shareBtn.addEventListener("click", async () => {
      const g = GAME[slug], url = location.origin + "/games/" + slug + "/";
      const text = `${g.title} — a game made entirely by AI. Play it free:`;
      try { if (navigator.share) { await navigator.share({ title: g.title, text, url }); return; } } catch (e) { return; }
      try { await navigator.clipboard.writeText(text + " " + url); toast("Link copied"); } catch (e) { toast(url); }
    });
    // challenge banner
    const beat = new URLSearchParams(location.search).get("beat");
    const bb = $("#beat");
    if (beat && bb && /^\d{1,10}$/.test(beat)) { bb.hidden = false; $("b", bb).textContent = fmt(beat); }
    // leaderboard + personal best
    const list = $("#board");
    const paint = () => {
      if (!list || !scores) return;
      scores.fetchTop(slug).then((d) => {
        list.innerHTML = boardHtml(d.top, 10, slug);
        const src = $("#board-src"); if (src) src.textContent = d.source === "global" ? "Global" : "This device";
      });
      const p = pass();
      const best = $("#my-best"); if (best) best.textContent = p.best && p.best[slug] ? fmt(p.best[slug]) : "–";
      const plays = $("#my-plays"); if (plays) plays.textContent = fmt((p.plays && p.plays[slug]) || 0);
    };
    paint();
    addEventListener("message", (e) => { if (e.origin === location.origin && e.data && (e.data.type === "pa-score" || e.data.type === "pa-name")) setTimeout(paint, 600); });
    const nameEl = $("#my-name"); if (nameEl && W.paPlayer) W.paPlayer.chip(nameEl, "Playing as");
  }

  /* ---------- hall of fame ---------- */
  const hof = $("#hof");
  if (hof && scores) {
    scores.fetchAll(DATA.games.map((g) => g.slug)).then((d) => {
      const games = d.games || {};
      $$(".panel[data-slug]", hof).forEach((p) => { const ol = $(".board", p); ol.innerHTML = boardHtml(games[p.dataset.slug], 5, p.dataset.slug); });
      const src = $("#hof-src"); if (src) src.textContent = d.source === "global" ? "Live global boards" : "Boards on this device (the global service didn't answer)";
      // champions: most #1s, most top-5 placements
      const tally = {};
      for (const [slug, rows] of Object.entries(games)) {
        if (!GAME[slug]) continue;
        (rows || []).slice(0, 5).forEach((r, i) => { const k = r.pid || r.name; tally[k] = tally[k] || { name: r.name, wins: 0, podium: 0, games: new Set() }; if (i === 0) tally[k].wins++; tally[k].podium++; tally[k].games.add(slug); });
      }
      const champs = Object.values(tally).sort((a, b) => b.wins - a.wins || b.podium - a.podium).slice(0, 6);
      const box = $("#champs");
      if (box) box.innerHTML = champs.length ? champs.map((c, i) => `<div class="champ reveal in"><span class="medal">${["🥇", "🥈", "🥉", "🏅", "🏅", "🏅"][i]}</span><div><b>${esc(c.name)}</b><span>${c.wins} first place${c.wins === 1 ? "" : "s"} · top 5 in ${c.games.size} game${c.games.size === 1 ? "" : "s"}</span></div></div>`).join("") : '<p class="empty" style="padding:10px 0">No champions yet — every throne is empty.</p>';
    });
  }

  /* ---------- my arcade ---------- */
  const me = $("#me");
  if (me) {
    const p = pass(), L = levelOf(p.xp), a = xpFor(L), b = xpFor(L + 1);
    $(".ring", me).style.setProperty("--p", Math.round((p.xp - a) / (b - a) * 100) + "%");
    $("#me-level").textContent = L;
    $("#me-xp").textContent = `${fmt(p.xp)} XP · ${fmt(b - p.xp)} to level ${L + 1}`;
    $("#me-streak").textContent = liveStreak(p);
    $("#me-runs").textContent = fmt(p.runs);
    $("#me-games").textContent = Object.keys(p.plays || {}).length + " / " + DATA.games.length;
    $("#me-quests").textContent = fmt((p.quests && p.quests.total) || 0);
    const nameEl = $("#me-name"); if (nameEl && W.paPlayer) W.paPlayer.chip(nameEl, "Player");
    // badges
    const B = DATA.badges || {};
    $("#me-badges").innerHTML = Object.entries(B).map(([id, x]) => `<div class="badge ${p.badges && p.badges[id] ? "got" : ""}" title="${esc(x[1])}"><div class="ic">${x[2]}</div><b>${esc(x[0])}</b><span>${esc(x[1])}</span></div>`).join("");
    $("#me-badge-count").textContent = Object.keys(p.badges || {}).filter((k) => B[k]).length + " / " + Object.keys(B).length;
    // calendar
    const today = dayNum(), set = new Set(p.dayList || []);
    $("#me-days").innerHTML = Array.from({ length: 30 }, (_, i) => { const d = today - 29 + i; return `<i class="${set.has(d) ? "on" : ""} ${d === today ? "today" : ""}" title="${new Date(d * 864e5).toISOString().slice(0, 10)}"></i>`; }).join("");
    // per-game
    const rows = DATA.games.map((g) => ({ g, best: (p.best || {})[g.slug] || 0, plays: (p.plays || {})[g.slug] || 0 })).sort((x, y) => y.plays - x.plays);
    $("#me-stats").innerHTML = rows.map(({ g, best, plays }) => `<a class="stat" href="/games/${g.slug}/"><img src="/shots/${g.slug}.webp" alt="" loading="lazy" width="72" height="45"/><div><b>${esc(g.title)}</b><span>${best ? "Best " + fmt(best) : "Not played yet"}</span><small>${plays ? plays + " run" + (plays === 1 ? "" : "s") : "Try it"}</small></div></a>`).join("");
    const reset = $("#me-reset");
    if (reset) reset.addEventListener("click", () => {
      if (!confirm("Reset your Arcade Pass on this device? XP, badges and streaks will be cleared. Leaderboard scores stay.")) return;
      try { localStorage.removeItem("pa_pass_v1"); } catch (e) {}
      location.reload();
    });
  }

  /* ---------- account (email sign-in) on my arcade ---------- */
  const acct = $("#account");
  if (acct && W.paPlayer && W.paPlayer.startSignIn) {
    const P = W.paPlayer, msg = $("#acct-msg");
    const views = { out: $("#acct-out"), code: $("#acct-code"), in: $("#acct-in") };
    let pending = "";
    const say = (t, kind) => { msg.textContent = t || ""; msg.className = "acct-msg" + (kind ? " " + kind : ""); };
    const show = (v) => { for (const k in views) views[k].hidden = k !== v; const tag = $("#acct-tag"); tag.textContent = v === "in" ? "Signed in" : "Optional"; tag.classList.toggle("on", v === "in"); };
    const busy = (btn, on, label) => { btn.disabled = on; if (label) btn.textContent = label; };
    const render = () => { const e = P.email(); if (e) { $("#acct-who").textContent = e; show("in"); } else if (!pending) show("out"); };
    const send = (email) => {
      const btn = $("#acct-send"); busy(btn, true, "Sending…"); say("");
      return P.startSignIn(email).then((r) => {
        busy(btn, false, "Email me a code");
        if (!r.ok) { say(r.error, "err"); return; }
        pending = email; $("#acct-code-to").textContent = email; show("code"); say("Check your inbox (and spam folder) for the code.");
        setTimeout(() => { try { $("#acct-code-input").focus(); } catch (e) {} }, 30);
      });
    };
    const verify = (email, code) => {
      const btn = $("#acct-verify"); if (btn.disabled) return Promise.resolve(false); busy(btn, true, "Checking…"); say("");
      return P.verifyCode(email, code).then((r) => {
        busy(btn, false, "Sign in");
        if (!r.ok) { if (views.out.hidden && views.code.hidden) show("out"); say(r.error, "err"); return false; }
        pending = ""; render();
        say(r.existing ? "Signed in. Your progress from this device was added to your account." : "Signed in. You can now sign in with this email on any device.", "ok");
        setTimeout(() => location.reload(), 1600);
        return true;
      });
    };
    $("#acct-email-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const v = $("#acct-email").value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { say("Enter your email address.", "err"); $("#acct-email").focus(); return; }
      send(v);
    });
    $("#acct-code-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const c = $("#acct-code-input").value.replace(/\D/g, "");
      if (c.length !== 6) { say("Enter the 6-digit code from the email.", "err"); return; }
      verify(pending, c);
    });
    $("#acct-code-input").addEventListener("input", (e) => { const c = e.target.value.replace(/\D/g, "").slice(0, 6); e.target.value = c; if (c.length === 6) verify(pending, c); });
    $("#acct-back").addEventListener("click", () => { pending = ""; show("out"); say(""); $("#acct-email").focus(); });
    $("#acct-resend").addEventListener("click", () => pending && send(pending));
    $("#acct-sync").addEventListener("click", () => {
      const btn = $("#acct-sync"); busy(btn, true, "Syncing…");
      P.sync(true).then((r) => {
        busy(btn, false, "Sync now");
        if (r.ok && r.changed.length) { say("Synced. Loading your latest progress…", "ok"); setTimeout(() => location.reload(), 900); }
        else say(r.ok ? "Everything is up to date." : r.error === "signed-out" ? "You were signed out. Sign in again to sync." : r.error, r.ok ? "ok" : "err");
        render();
      });
    });
    $("#acct-signout").addEventListener("click", () => {
      if (!confirm("Sign out on this device? Your progress stays saved on your account, and stays here too.")) return;
      P.signOut().then(() => { render(); say("Signed out on this device."); });
    });
    W.addEventListener("pa:account", render);
    render();
    // One-tap link from the email: /me/?signin=CODE&email=ADDRESS
    const q = new URLSearchParams(location.search), qc = (q.get("signin") || "").replace(/\D/g, ""), qe = (q.get("email") || "").trim();
    if (qc.length === 6 && qe) {
      history.replaceState(null, "", location.pathname + "#account");
      if (P.email() && P.email() === qe.toLowerCase()) say("You're already signed in.", "ok");
      else { pending = qe; $("#acct-code-to").textContent = qe; $("#acct-code-input").value = qc; show("code"); acct.scrollIntoView({ block: "center" }); verify(qe, qc); }
    } else if (location.hash === "#account" && !P.email()) setTimeout(() => { try { $("#acct-email").focus(); } catch (e) {} }, 300);
  }

  /* ---------- daily page streak calendar ---------- */
  const cal = $("#daily-days");
  if (cal) {
    const p = pass(), today = dayNum(), set = new Set(p.dayList || []);
    cal.innerHTML = Array.from({ length: 30 }, (_, i) => { const d = today - 29 + i; return `<i class="${set.has(d) ? "on" : ""} ${d === today ? "today" : ""}"></i>`; }).join("");
    const s = $("#daily-streak"); if (s) s.textContent = liveStreak(p);
  }
})();
