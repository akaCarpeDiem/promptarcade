/* PromptArcade scores: one shared module for every game and every page.
 *
 * - Games call paReport(slug, score) once at game over (psReport is a legacy alias).
 * - Scores are POSTed to /api/scores/<slug> (Cloudflare Pages Function + D1).
 * - When the API is missing or fails, the score is kept in localStorage (pa_scores_<slug>)
 *   so the site works on plain static hosting. Local is always written as a personal record.
 * - Results are broadcast to the parent page (postMessage "pa-score") and in-frame ("pa:score").
 * - Player identity (window.paPlayer): the first name entry creates a player on the server
 *   ({playerId, playerToken} in localStorage). Renaming updates every score that player owns.
 *   Signing in with email (code sent by /api/auth/start) links the player to an account so other
 *   devices can sign in to the same player; signed-in browsers merge progress via /api/account/sync.
 */
(function () {
  var NAME_KEY = "pa_player_name";
  var PREFIX = "pa_scores_";
  var LAST_PREFIX = "pa_last_";
  var API = "/api/scores/";
  var API_TIMEOUT = 4500;
  var sent = false;
  var startedAt = Date.now();
  var lastResult = null;

  function cleanName(v) {
    v = String(v || "").replace(/[^\p{L}\p{N} _.\-']/gu, "").replace(/\s+/g, " ").trim().slice(0, 16);
    return v || "Guest";
  }
  function clampScore(score) {
    var n = Math.round(Number(score) || 0);
    if (!isFinite(n) || n < 0) n = 0;
    if (n > 1000000000) n = 1000000000;
    return n;
  }
  function uid() {
    return "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  function getName() {
    try { return localStorage.getItem(NAME_KEY) || ""; } catch (e) { return ""; }
  }
  function sortRows(rows) {
    return rows.sort(function (a, b) { return (b.score || 0) - (a.score || 0) || (a.at || 0) - (b.at || 0); });
  }
  function readLocal(slug) {
    try {
      var raw = localStorage.getItem(PREFIX + slug);
      var rows = raw ? JSON.parse(raw) : [];
      return Array.isArray(rows) ? sortRows(rows.filter(function (r) { return r && typeof r.score === "number"; })) : [];
    } catch (e) { return []; }
  }
  function writeLocal(slug, rows) {
    try { localStorage.setItem(PREFIX + slug, JSON.stringify(rows.slice(0, 50))); } catch (e) {}
  }
  function appendLocal(slug, entry) {
    var rows = readLocal(slug);
    rows.push(entry);
    sortRows(rows);
    writeLocal(slug, rows);
    return rows;
  }
  function publicRow(r) {
    return { id: r.id || "", name: r.name || "Guest", score: r.score || 0, at: r.at || 0 };
  }
  function localBest(slug, name) {
    var best = 0;
    readLocal(slug).forEach(function (r) {
      if ((!name || r.name === name) && r.score > best) best = r.score;
    });
    return best;
  }
  function setLast(slug, id) {
    try { localStorage.setItem(LAST_PREFIX + slug, id); } catch (e) {}
  }
  function getLast(slug) {
    try { return localStorage.getItem(LAST_PREFIX + slug) || ""; } catch (e) { return ""; }
  }

  /* ---------------- player identity ---------------- */
  var ID_KEY = "pa_player_id", TOKEN_KEY = "pa_player_token";
  var BLOCKED_MSG = "That name isn't allowed — try another.";
  var OFFLINE_MSG = "Couldn't reach the leaderboard — try again in a moment.";
  function lsGet(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
  function lsSet(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} }
  function playerId() { return lsGet(ID_KEY); }
  function playerToken() { return lsGet(TOKEN_KEY); }
  function hasPlayer() { return !!(playerId() && playerToken()); }
  function clearPlayer() { lsSet(ID_KEY, ""); lsSet(TOKEN_KEY, ""); }
  function postJson(url, body) {
    return withTimeout(fetch(url, {
      method: "POST", credentials: "same-origin", cache: "no-store",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body)
    }), API_TIMEOUT).then(function (res) {
      var ct = res.headers.get("content-type") || "";
      var p = ct.indexOf("application/json") >= 0 ? res.json().catch(function () { return {}; }) : Promise.resolve({});
      return p.then(function (d) { return { status: res.status, ok: res.ok && !!(d && d.ok), data: d || {} }; });
    });
  }
  /** Rename this browser's local records too, so "your best" follows the new name. */
  function renameLocal(oldName, newName) {
    if (!oldName || oldName === newName) return;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf(PREFIX) !== 0) continue;
        var rows = JSON.parse(localStorage.getItem(k) || "[]");
        if (!Array.isArray(rows)) continue;
        var changed = false;
        rows.forEach(function (r) { if (r && r.name === oldName) { r.name = newName; changed = true; } });
        if (changed) localStorage.setItem(k, JSON.stringify(rows));
      }
    } catch (e) {}
  }
  function applyName(newName) {
    var old = getName();
    renameLocal(old, newName);
    lsSet(NAME_KEY, newName);
    try { window.dispatchEvent(new CustomEvent("pa:name", { detail: { name: newName, previous: old } })); } catch (e) {}
    try { if (parent && parent !== window) parent.postMessage({ type: "pa-name", name: newName }, location.origin); } catch (e) {}
    return newName;
  }
  function register(name) {
    return postJson("/api/players", { name: name }).then(function (r) {
      if (r.ok) {
        lsSet(ID_KEY, r.data.playerId); lsSet(TOKEN_KEY, r.data.playerToken);
        return { ok: true, name: applyName(r.data.name) };
      }
      if (r.status === 404 || r.status === 405 || r.status >= 500) return { ok: true, name: applyName(name), offline: true };
      return { ok: false, error: r.data.message || BLOCKED_MSG, code: r.data.error || "" };
    }, function () { return { ok: true, name: applyName(name), offline: true }; });
  }
  function rename(name) {
    if (!hasPlayer()) return register(name);
    return postJson("/api/players/rename", { playerId: playerId(), playerToken: playerToken(), name: name }).then(function (r) {
      if (r.ok) return { ok: true, name: applyName(r.data.name) };
      if (r.status === 401) { clearPlayer(); return register(name); }
      if (r.status >= 500) return { ok: false, error: OFFLINE_MSG };
      return { ok: false, error: r.data.message || BLOCKED_MSG, code: r.data.error || "" };
    }, function () { return { ok: false, error: OFFLINE_MSG }; });
  }
  /** Set or change the player name (server-checked). Resolves {ok, name} or {ok:false, error}. */
  function setPlayerName(name) {
    name = cleanName(name);
    return hasPlayer() ? rename(name) : register(name);
  }
  /** Make sure this browser has a player before a score is sent. */
  function ensurePlayer() {
    if (hasPlayer()) return Promise.resolve(true);
    var n = getName();
    if (!n) return Promise.resolve(false);
    return register(n).then(function (r) { return !!(r.ok && hasPlayer()); });
  }
  /** Pick up a rename made in another tab and drop a key the server no longer knows. */
  function syncPlayer() {
    if (!hasPlayer() || typeof fetch !== "function") return;
    try {
      var last = Number(sessionStorage.getItem("pa_player_sync") || 0);
      if (Date.now() - last < 5 * 60 * 1000) return;
      sessionStorage.setItem("pa_player_sync", String(Date.now()));
    } catch (e) {}
    postJson("/api/players/me", { playerId: playerId(), playerToken: playerToken() }).then(function (r) {
      if (r.status === 401) clearPlayer();
      else if (r.ok && r.data.name && r.data.name !== getName()) applyName(r.data.name);
    }, function () {});
  }
  window.addEventListener("storage", function (e) {
    if (e.key === NAME_KEY) {
      try { window.dispatchEvent(new CustomEvent("pa:name", { detail: { name: e.newValue || "", previous: e.oldValue || "" } })); } catch (x) {}
    }
  });

  /* ---------------- rename dialog (hub pages + game pages) ---------------- */
  var dlg = null;
  function injectDialogCss() {
    if (document.getElementById("pa-rename-css")) return;
    var st = document.createElement("style");
    st.id = "pa-rename-css";
    st.textContent =
      "#pa-rename{position:fixed;inset:0;z-index:80;display:grid;place-items:center;padding:14px;background:radial-gradient(120% 90% at 50% 0%,rgba(40,30,90,.5),rgba(4,6,16,.84));backdrop-filter:blur(10px) saturate(1.2);-webkit-backdrop-filter:blur(10px) saturate(1.2);font-family:Manrope,system-ui,sans-serif;color:#f4f1ff;animation:paRnIn .25s ease both}" +
      "#pa-rename[hidden]{display:none!important}" +
      "@keyframes paRnIn{from{opacity:0}to{opacity:1}}@keyframes paRnCard{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}" +
      "#pa-rename .pa-rn-card{position:relative;width:min(23rem,100%);padding:1.2rem 1.25rem 1.1rem;border-radius:22px;text-align:left;background:linear-gradient(165deg,rgba(26,30,58,.95),rgba(12,15,30,.97));border:1px solid rgba(142,233,255,.32);box-shadow:0 24px 70px rgba(0,0,0,.55),0 0 50px rgba(196,166,255,.16),inset 0 1px 0 rgba(255,255,255,.08);animation:paRnCard .35s cubic-bezier(.2,.9,.25,1.2) both}" +
      "#pa-rename .pa-rn-k{font:600 .66rem/1 ui-monospace,'JetBrains Mono',monospace;letter-spacing:.22em;text-transform:uppercase;color:#8ee9ff;opacity:.85}" +
      "#pa-rename h2{margin:.45rem 0 .25rem;font-size:1.35rem;font-weight:600;letter-spacing:-.02em;background:linear-gradient(95deg,#fff 10%,#8ee9ff 55%,#c4a6ff);-webkit-background-clip:text;background-clip:text;color:transparent}" +
      "#pa-rename p{margin:0 0 .85rem;color:#b9b4cc;font-size:.86rem;line-height:1.4}" +
      "#pa-rename label{display:grid;gap:.35rem;font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:#a8a3b8;margin-bottom:.5rem}" +
      "#pa-rename input{font:500 1.05rem Manrope,system-ui,sans-serif;color:#f4f1ff;background:rgba(6,9,20,.85);border:1px solid rgba(244,241,255,.18);border-radius:14px;min-height:48px;padding:.5rem .85rem;text-transform:none;letter-spacing:.01em}" +
      "#pa-rename input:focus{outline:none;border-color:#8ee9ff;box-shadow:0 0 0 3px rgba(142,233,255,.2),0 0 24px rgba(142,233,255,.2)}" +
      "#pa-rename .pa-rn-err{min-height:1.15em;margin:0 0 .6rem;color:#ffb4a8;font-size:.8rem}" +
      "#pa-rename .pa-rn-btns{display:flex;gap:.55rem}" +
      "#pa-rename button{flex:1;font:700 .98rem Manrope,system-ui,sans-serif;border:0;border-radius:999px;min-height:46px;padding:.6rem 1rem;cursor:pointer;transition:transform .12s,filter .12s}" +
      "#pa-rename button:hover{filter:brightness(1.08)}#pa-rename button:active{transform:scale(.97)}#pa-rename button:focus-visible{outline:2px solid #fff;outline-offset:3px}" +
      "#pa-rename button[disabled]{opacity:.6;cursor:progress}" +
      "#pa-rename .pa-rn-save{background:linear-gradient(135deg,#8ee9ff,#7ee7f5 45%,#c4a6ff);color:#0a1220}" +
      "#pa-rename .pa-rn-cancel{background:rgba(244,241,255,.06);color:#d8d4ea;border:1px solid rgba(244,241,255,.16)}" +
      "#pa-rename .pa-rn-fine{margin:.75rem 0 0;font-size:.72rem;color:#7a7694}" +
      ".pa-name-chip{display:inline-flex;align-items:center;gap:.45rem;flex-wrap:wrap}" +
      ".pa-name-chip strong{font-weight:700;color:#fff;background:rgba(142,233,255,.12);border:1px solid rgba(142,233,255,.3);border-radius:999px;padding:.1rem .55rem;max-width:12rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".pa-name-change{font:600 .74rem Manrope,system-ui,sans-serif;letter-spacing:.02em;min-height:28px;padding:.15rem .6rem;border-radius:999px;cursor:pointer;background:transparent;color:#a8e9ff;border:1px solid rgba(142,233,255,.35);transition:background .15s,color .15s}" +
      ".pa-name-change:hover{background:rgba(142,233,255,.12);color:#fff}.pa-name-change:focus-visible{outline:2px solid #fff;outline-offset:2px}";
    document.head.appendChild(st);
  }
  /** Open the "Change your name" dialog. opts.onDone(name) runs after a successful save. */
  function openRename(opts) {
    opts = opts || {};
    injectDialogCss();
    if (!dlg) {
      dlg = document.createElement("div");
      dlg.id = "pa-rename";
      dlg.setAttribute("role", "dialog");
      dlg.setAttribute("aria-modal", "true");
      dlg.setAttribute("aria-labelledby", "pa-rn-h");
      dlg.innerHTML = '<form class="pa-rn-card" novalidate>' +
        '<div class="pa-rn-k">Player</div><h2 id="pa-rn-h">Change your name</h2>' +
        '<p id="pa-rn-sub">Your new name replaces the old one on every score you’ve set from this browser.</p>' +
        '<label for="pa-rn-input">Player name<input id="pa-rn-input" maxlength="16" autocomplete="nickname" spellcheck="false" placeholder="Up to 16 characters" enterkeyhint="done"/></label>' +
        '<div class="pa-rn-err" id="pa-rn-err" role="alert"></div>' +
        '<div class="pa-rn-btns"><button type="button" class="pa-rn-cancel" id="pa-rn-cancel">Cancel</button><button type="submit" class="pa-rn-save" id="pa-rn-save">Save name</button></div>' +
        '<p class="pa-rn-fine">Names are checked automatically. 5 changes a day.</p></form>';
      document.body.appendChild(dlg);
      var form = dlg.querySelector("form");
      ["keydown", "keyup", "keypress"].forEach(function (t) { dlg.addEventListener(t, function (e) { e.stopPropagation(); if (t === "keydown" && e.key === "Escape") close(); }); });
      dlg.addEventListener("click", function (e) { if (e.target === dlg) close(); });
      dlg.querySelector("#pa-rn-cancel").addEventListener("click", close);
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var input = dlg.querySelector("#pa-rn-input"), errEl = dlg.querySelector("#pa-rn-err"), save = dlg.querySelector("#pa-rn-save");
        var v = String(input.value || "").replace(/\s+/g, " ").trim();
        if (!v || !/^[\p{L}\p{N} _.\-']{1,16}$/u.test(v) || !/[\p{L}\p{N}]/u.test(v)) { errEl.textContent = "Use 1–16 letters, numbers, spaces or - _ . '"; input.focus(); return; }
        save.disabled = true; save.textContent = "Checking…"; errEl.textContent = "";
        setPlayerName(v).then(function (r) {
          save.disabled = false; save.textContent = "Save name";
          if (!r.ok) { errEl.textContent = r.error || BLOCKED_MSG; input.focus(); input.select(); return; }
          var cb = dlg._onDone; close();
          if (typeof cb === "function") cb(r.name);
        });
      });
    }
    function close() { dlg.hidden = true; if (dlg._return) try { dlg._return.focus(); } catch (e) {} }
    dlg._onDone = opts.onDone;
    dlg._return = document.activeElement;
    dlg.querySelector("#pa-rn-h").textContent = getName() ? "Change your name" : "Pick a player name";
    dlg.querySelector("#pa-rn-input").value = getName();
    dlg.querySelector("#pa-rn-err").textContent = "";
    dlg.hidden = false;
    setTimeout(function () { try { var i = dlg.querySelector("#pa-rn-input"); i.focus(); i.select(); } catch (e) {} }, 40);
  }
  /** Fill an element with "Playing as NAME · Change". */
  function nameChip(el, label) {
    if (!el) return;
    injectDialogCss();
    var n = getName();
    el.classList.add("pa-name-chip");
    el.innerHTML = "";
    var span = document.createElement("span"); span.textContent = n ? (label || "Playing as") : "No player name yet";
    el.appendChild(span);
    if (n) { var s = document.createElement("strong"); s.textContent = n; el.appendChild(s); }
    var b = document.createElement("button"); b.type = "button"; b.className = "pa-name-change"; b.textContent = n ? "Change" : "Set name";
    b.addEventListener("click", function () { openRename(); });
    el.appendChild(b);
  }

  function withTimeout(p, ms) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(new Error("timeout")); }, ms);
      p.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
    });
  }
  function json(res) {
    var ct = res.headers.get("content-type") || "";
    if (!res.ok || ct.indexOf("application/json") < 0) return Promise.reject(new Error("no-api"));
    return res.json().then(function (d) { return d && d.ok ? d : Promise.reject(new Error("bad-api")); });
  }

  /** Top 10 for a game: global board when the API answers, else this device's board. */
  function fetchTop(slug) {
    var local = { source: "local", top: readLocal(slug).slice(0, 10).map(publicRow) };
    if (typeof fetch !== "function") return Promise.resolve(local);
    return withTimeout(fetch(API + encodeURIComponent(slug), { credentials: "same-origin", cache: "no-store", headers: { accept: "application/json" } }), API_TIMEOUT)
      .then(json)
      .then(function (d) { return { source: "global", top: (d.top || []).slice(0, 10).map(publicRow), total: d.total || 0 }; })
      .catch(function () { return local; });
  }

  /** Every game's leaders in one call (Hall of Fame). Falls back to local boards for the given slugs. */
  function fetchAll(slugs) {
    function localAll() {
      var games = {};
      (slugs || []).forEach(function (s) { games[s] = readLocal(s).slice(0, 10).map(publicRow); });
      return { source: "local", games: games };
    }
    if (typeof fetch !== "function") return Promise.resolve(localAll());
    return withTimeout(fetch("/api/scores", { credentials: "same-origin", cache: "no-store", headers: { accept: "application/json" } }), API_TIMEOUT)
      .then(json)
      .then(function (d) { return { source: "global", games: d.games || {}, total: d.total || 0 }; })
      .catch(localAll);
  }

  function emit(result) {
    lastResult = result;
    try { window.dispatchEvent(new CustomEvent("pa:score", { detail: result })); } catch (e) {}
    try {
      if (parent && parent !== window) {
        parent.postMessage({
          type: "pa-score", game: result.game, score: result.score, top: result.top,
          you: { id: result.id, name: result.name, score: result.score }, rank: result.rank,
          source: result.source, isBest: result.isBest
        }, location.origin);
      }
    } catch (e) {}
  }

  /** Save a finished run. Safe to call more than once; only the first call per run counts. */
  function report(slug, score) {
    if (sent) return Promise.resolve(lastResult);
    sent = true;
    var n = clampScore(score);
    var name = cleanName(getName());
    var prevBest = localBest(slug, name);
    var entry = { id: uid(), name: name, score: n, at: Date.now() };
    var rows = appendLocal(slug, entry);
    var localRank = rows.indexOf(entry) + 1;
    var result = {
      game: slug, score: n, name: name, id: entry.id,
      top: rows.slice(0, 10).map(publicRow), rank: localRank,
      source: "local", best: Math.max(prevBest, n), isBest: n > prevBest && n > 0
    };
    setLast(slug, entry.id);
    try { window.dispatchEvent(new CustomEvent("pa:report", { detail: { game: slug, score: n } })); } catch (e) {}

    if (typeof fetch !== "function") { emit(result); return Promise.resolve(result); }
    var ms = Date.now() - startedAt;
    function send() {
      var body = { name: name, score: n, ms: ms };
      if (hasPlayer()) { body.playerId = playerId(); body.playerToken = playerToken(); }
      return postJson(API + encodeURIComponent(slug), body);
    }
    return ensurePlayer()
      .then(send)
      .then(function (r) {
        if (r.status !== 401) return r;
        clearPlayer();
        return ensurePlayer().then(send);
      })
      .then(function (r) { return r.ok ? r.data : Promise.reject(new Error("no-api")); })
      .then(function (d) {
        result.source = "global";
        if (d.name) result.name = d.name;
        if (d.id) { result.id = String(d.id); setLast(slug, result.id); }
        if (Array.isArray(d.top)) result.top = d.top.slice(0, 10).map(publicRow);
        // Global rank; 0 means the run did not reach the stored board (no false "#N worldwide").
        result.rank = d.rank || 0;
        emit(result);
        return result;
      })
      .catch(function () { emit(result); return result; });
  }

  function arm() { sent = false; startedAt = Date.now(); }

  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("#again,#begin,#restart") : null;
    if (t) arm();
  }, true);
  window.addEventListener("pa:start", arm);


  /* ---------------- email sign-in + progress sync ---------------- */
  var EMAIL_KEY = "pa_account_email";
  var SYNC_RE = /^(pa_pass_v1|ga_xp|es_meta_v1|wg_v1|nd_best|bb_best|dd_daily|pa_scores_[a-z0-9-]{1,40})$/;
  function accountEmail() { return hasPlayer() ? lsGet(EMAIL_KEY) : ""; }
  function authError(r, fallback) {
    if (r.status === 404 || r.status === 405) return "Sign-in isn't available on this copy of the site.";
    return (r.data && r.data.message) || fallback || OFFLINE_MSG;
  }
  /** Email a sign-in code. Resolves {ok} or {ok:false, error}. */
  function startSignIn(email) {
    return postJson("/api/auth/start", { email: String(email || "").trim() }).then(function (r) {
      return r.ok ? { ok: true } : { ok: false, error: authError(r) };
    }, function () { return { ok: false, error: OFFLINE_MSG }; });
  }
  /** Check the emailed code and sign this browser in. Resolves {ok, email, name, merged, existing}. */
  function verifyCode(email, code) {
    var body = { email: String(email || "").trim(), code: String(code || "").replace(/\D/g, "") };
    if (hasPlayer()) { body.playerId = playerId(); body.playerToken = playerToken(); }
    if (getName()) body.name = getName();
    return postJson("/api/auth/verify", body).then(function (r) {
      if (!r.ok) return { ok: false, error: authError(r) };
      var d = r.data;
      lsSet(ID_KEY, d.playerId); lsSet(TOKEN_KEY, d.playerToken); lsSet(EMAIL_KEY, d.email);
      if (d.name) applyName(d.name);
      announceAccount();
      return syncProgress(true).then(function () {
        return { ok: true, email: d.email, name: d.name, merged: d.merged || 0, existing: !!d.existing };
      });
    }, function () { return { ok: false, error: OFFLINE_MSG }; });
  }
  /** Sign this browser out. Progress stays here and on the account; the next score makes a fresh guest player. */
  function signOut() {
    var body = { playerId: playerId(), playerToken: playerToken() };
    var done = function () { clearPlayer(); lsSet(EMAIL_KEY, ""); announceAccount(); return { ok: true }; };
    return postJson("/api/auth/signout", body).then(done, done);
  }
  function announceAccount() {
    try { window.dispatchEvent(new CustomEvent("pa:account", { detail: { email: accountEmail() } })); } catch (e) {}
  }
  function collectState() {
    var out = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || !SYNC_RE.test(k)) continue;
        var raw = localStorage.getItem(k);
        try { out[k] = JSON.parse(raw); } catch (e) { out[k] = raw; }
      }
    } catch (e) {}
    return out;
  }
  function writeState(state) {
    var changed = [];
    Object.keys(state || {}).forEach(function (k) {
      if (!SYNC_RE.test(k)) return;
      var v = state[k];
      var raw = typeof v === "string" ? v : JSON.stringify(v);
      if (lsGet(k) !== raw) { try { localStorage.setItem(k, raw); changed.push(k); } catch (e) {} }
    });
    return changed;
  }
  var syncing = null;
  /** Merge this browser's progress with the account. force skips the 2-minute throttle. */
  function syncProgress(force) {
    if (!hasPlayer() || !lsGet(EMAIL_KEY) || typeof fetch !== "function") return Promise.resolve({ ok: false, skipped: true });
    if (syncing) return syncing;
    if (!force) {
      try {
        var last = Number(sessionStorage.getItem("pa_account_sync") || 0);
        if (Date.now() - last < 2 * 60 * 1000) return Promise.resolve({ ok: false, skipped: true });
      } catch (e) {}
    }
    try { sessionStorage.setItem("pa_account_sync", String(Date.now())); } catch (e) {}
    syncing = postJson("/api/account/sync", { playerId: playerId(), playerToken: playerToken(), state: collectState() }).then(function (r) {
      syncing = null;
      if (r.status === 401) { clearPlayer(); lsSet(EMAIL_KEY, ""); announceAccount(); return { ok: false, error: "signed-out" }; }
      if (!r.ok) return { ok: false, error: authError(r) };
      if (!r.data.email) { lsSet(EMAIL_KEY, ""); announceAccount(); return { ok: false, error: "signed-out" }; }
      if (r.data.email !== lsGet(EMAIL_KEY)) lsSet(EMAIL_KEY, r.data.email);
      if (r.data.name && r.data.name !== getName()) applyName(r.data.name);
      var changed = writeState(r.data.state);
      try { window.dispatchEvent(new CustomEvent("pa:synced", { detail: { changed: changed } })); } catch (e) {}
      return { ok: true, changed: changed };
    }, function () { syncing = null; return { ok: false, error: OFFLINE_MSG }; });
    return syncing;
  }
  window.addEventListener("pa:score", function () { if (lsGet(EMAIL_KEY)) setTimeout(function () { syncProgress(true); }, 400); });
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden" && lsGet(EMAIL_KEY)) syncProgress(); });
  window.addEventListener("storage", function (e) { if (e.key === EMAIL_KEY) announceAccount(); });

  window.paPlayer = {
    id: playerId,
    hasPlayer: hasPlayer,
    getName: getName,
    setName: setPlayerName,
    ensure: ensurePlayer,
    openRename: openRename,
    chip: nameChip,
    email: accountEmail,
    startSignIn: startSignIn,
    verifyCode: verifyCode,
    signOut: signOut,
    sync: syncProgress
  };
  setTimeout(function () { syncPlayer(); syncProgress(); }, 1200);

  window.paReport = window.psReport = report;
  window.paScores = {
    report: report,
    arm: arm,
    fetchTop: fetchTop,
    fetchAll: fetchAll,
    read: function (slug) { return readLocal(slug).slice(0, 10).map(publicRow); },
    best: localBest,
    lastId: getLast,
    cleanName: cleanName,
    getName: getName
  };
})();
