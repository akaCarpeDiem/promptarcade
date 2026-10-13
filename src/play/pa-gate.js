/* PromptArcade gate: every game starts here. Player name first, then Start.
 * The name is remembered in localStorage (pa_player_name) across all games.
 * On Start it calls window.psBeginGame / window.paBeginGame and fires "pa:start".
 * Optional per-game config: window.paConfig = { slug, title, controls: [["Keys", "Action"], ...] }.
 */
(function () {
  var NAME_KEY = "pa_player_name";
  var NAME_RE = /^[\p{L}\p{N} _.\-']{1,16}$/u;
  var started = false;
  var cfg = window.paConfig || {};
  var slug = cfg.slug || ((location.pathname.match(/\/games\/play\/([a-z0-9-]+)/) || [])[1] || "");
  var title = cfg.title || (document.title || "PromptArcade").split(/\s[—|-]\s/)[0];

  function clean(v) {
    return String(v || "").replace(/\s+/g, " ").trim().slice(0, 16);
  }
  function getName() {
    try { return clean(localStorage.getItem(NAME_KEY) || ""); } catch (e) { return ""; }
  }
  function setName(v) {
    v = clean(v);
    try { localStorage.setItem(NAME_KEY, v); } catch (e) {}
    try {
      if (parent && parent !== window) parent.postMessage({ type: "pa-name", name: v }, location.origin);
    } catch (e) {}
    return v;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }

  var css =
    "@font-face{font-family:Manrope;font-style:normal;font-weight:200 800;font-display:swap;src:url(/fonts/manrope.woff2) format('woff2')}" +
    "#pa-gate{position:fixed;inset:0;z-index:60;display:grid;place-items:center;padding:12px;background:radial-gradient(120% 90% at 50% 0%,rgba(40,30,90,.55),rgba(4,6,16,.82));backdrop-filter:blur(10px) saturate(1.2);-webkit-backdrop-filter:blur(10px) saturate(1.2);font-family:Manrope,system-ui,sans-serif;color:#f4f1ff;animation:paGateIn .35s ease both}" +
    "@keyframes paGateIn{from{opacity:0}to{opacity:1}}" +
    "@keyframes paCardIn{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}" +
    "@keyframes paPulse{0%,100%{box-shadow:0 0 0 0 rgba(142,233,255,.55),0 10px 30px rgba(142,233,255,.25)}50%{box-shadow:0 0 0 10px rgba(142,233,255,0),0 10px 40px rgba(196,166,255,.35)}}" +
    "@keyframes paSheen{from{background-position:200% 0}to{background-position:-200% 0}}" +
    "#pa-gate[hidden]{display:none!important}" +
    "#pa-gate .pa-gate-card{position:relative;width:min(23rem,100%);max-height:calc(100% - 8px);overflow:auto;padding:1.25rem 1.3rem 1.2rem;border-radius:22px;text-align:center;background:linear-gradient(165deg,rgba(26,30,58,.94),rgba(12,15,30,.96));border:1px solid rgba(142,233,255,.32);box-shadow:0 24px 70px rgba(0,0,0,.55),0 0 50px rgba(196,166,255,.16),inset 0 1px 0 rgba(255,255,255,.08);animation:paCardIn .45s cubic-bezier(.2,.9,.25,1.2) both}" +
    "#pa-gate .pa-gate-card::before{content:'';position:absolute;inset:-1px;border-radius:inherit;padding:1px;background:linear-gradient(120deg,transparent 30%,rgba(142,233,255,.8),rgba(255,126,182,.7),transparent 70%) 0 0/200% 100%;-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:paSheen 4s linear infinite;pointer-events:none}" +
    "#pa-gate .pa-gate-kicker{font:600 .66rem/1 ui-monospace,'JetBrains Mono',monospace;letter-spacing:.22em;text-transform:uppercase;color:#8ee9ff;opacity:.85}" +
    "#pa-gate h2{margin:.45rem 0 .2rem;font-size:1.55rem;font-weight:600;letter-spacing:-.02em;line-height:1.1;background:linear-gradient(95deg,#fff 10%,#8ee9ff 50%,#c4a6ff);-webkit-background-clip:text;background-clip:text;color:transparent}" +
    "#pa-gate .pa-gate-sub{margin:0 0 .9rem;color:#b9b4cc;font-size:.88rem;line-height:1.35}" +
    "#pa-gate .pa-gate-keys{display:flex;flex-wrap:wrap;justify-content:center;gap:.3rem .4rem;margin:0 0 .95rem;padding:0;list-style:none}" +
    "#pa-gate .pa-gate-keys li{display:inline-flex;align-items:center;gap:.35rem;font-size:.74rem;color:#c9c4dc;background:rgba(8,12,26,.6);border:1px solid rgba(244,241,255,.1);border-radius:999px;padding:.2rem .55rem .2rem .25rem}" +
    "#pa-gate .pa-gate-keys kbd{font:600 .7rem/1 ui-monospace,'JetBrains Mono',monospace;color:#0c1520;background:linear-gradient(135deg,#8ee9ff,#c4a6ff);border-radius:999px;padding:.22rem .45rem}" +
    "#pa-gate label{display:grid;gap:.35rem;text-align:left;font-size:.74rem;letter-spacing:.06em;text-transform:uppercase;color:#a8a3b8;margin-bottom:.6rem}" +
    "#pa-gate input{font:500 1.05rem Manrope,system-ui,sans-serif;letter-spacing:.01em;color:#f4f1ff;background:rgba(6,9,20,.85);border:1px solid rgba(244,241,255,.18);border-radius:14px;min-height:48px;padding:.5rem .85rem;text-transform:none;transition:border-color .15s,box-shadow .15s}" +
    "#pa-gate input:focus{outline:none;border-color:#8ee9ff;box-shadow:0 0 0 3px rgba(142,233,255,.2),0 0 24px rgba(142,233,255,.2)}" +
    "#pa-gate .pa-gate-err{color:#ffb4a8;font-size:.8rem;margin:-.25rem 0 .55rem;min-height:1.1em;text-align:left}" +
    "#pa-gate .pa-gate-actions{display:flex;flex-direction:column;gap:.55rem}" +
    "#pa-gate button[disabled]{opacity:.65;cursor:progress}" +
    "#pa-gate button{font:700 1rem Manrope,system-ui,sans-serif;border:0;border-radius:999px;padding:.7rem 1.1rem;min-height:48px;cursor:pointer;transition:transform .12s,filter .12s}" +
    "#pa-gate button:hover{filter:brightness(1.08)}#pa-gate button:active{transform:scale(.97)}" +
    "#pa-gate button:focus-visible{outline:2px solid #fff;outline-offset:3px}" +
    "#pa-gate #pa-gate-save{background:linear-gradient(135deg,#d7c6ff,#b8a0ff);color:#1a1030}" +
    "#pa-gate #pa-gate-start{font-size:1.15rem;letter-spacing:.06em;text-transform:uppercase;min-height:54px;background:linear-gradient(135deg,#8ee9ff,#7ee7f5 45%,#c4a6ff);color:#0a1220;animation:paPulse 1.8s ease-in-out infinite}" +
    "#pa-gate [hidden]{display:none!important}" +
    "#pa-gate .pa-gate-who{display:flex;align-items:center;justify-content:center;gap:.5rem;margin:0 0 .8rem;font-size:.95rem;color:#d8f6ff}" +
    "#pa-gate .pa-gate-who strong{font-weight:700;color:#fff;background:rgba(142,233,255,.12);border:1px solid rgba(142,233,255,.3);border-radius:999px;padding:.15rem .6rem;max-width:12rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    "#pa-gate #pa-gate-change{font-size:.78rem;font-weight:600;min-height:32px;padding:.2rem .6rem;background:transparent;color:#a8a3c0;border:1px solid rgba(244,241,255,.14)}" +
    "#pa-gate .pa-gate-meta{display:flex;justify-content:center;gap:.5rem;flex-wrap:wrap;margin:.8rem 0 0;font-size:.76rem;color:#8f8aa6}" +
    "#pa-gate .pa-gate-meta span{white-space:nowrap}#pa-gate .pa-gate-meta b{color:#ffd27a;font-weight:700}" +
    "#pa-gate .pa-gate-acct{margin:.6rem 0 0;font-size:.74rem;color:#8f8aa6}#pa-gate .pa-gate-acct a{color:#a8e9ff;text-underline-offset:2px}" +
    "#pa-gate .pa-gate-hint{margin:.55rem 0 0;font-size:.72rem;color:#7a7694;letter-spacing:.04em}" +
    "@media (max-height:430px){#pa-gate .pa-gate-keys,#pa-gate .pa-gate-sub{display:none}#pa-gate .pa-gate-card{padding:.9rem 1rem}}" +
    "@media (prefers-reduced-motion:reduce){#pa-gate,#pa-gate .pa-gate-card,#pa-gate .pa-gate-card::before,#pa-gate #pa-gate-start{animation:none}}" +
    ".ps-stopwatch{display:inline-flex;align-items:center;justify-content:center;pointer-events:none;margin-left:.35rem}" +
    ".ps-sw-body{position:relative;width:54px;height:54px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff8e8,#e8d4a8 55%,#b8965a);box-shadow:inset 0 1px 0 rgba(255,255,255,.55),0 2px 8px rgba(0,0,0,.35);border:2px solid rgba(255,255,255,.35)}" +
    ".ps-sw-body::before{content:\"\";position:absolute;top:-7px;left:50%;width:10px;height:8px;margin-left:-5px;border-radius:3px 3px 2px 2px;background:#d7c49a;box-shadow:0 -2px 0 #c4ae7a}" +
    ".ps-sw-body::after{content:\"\";position:absolute;top:4px;right:6px;width:6px;height:6px;border-radius:50%;background:#8ee9ff;box-shadow:0 0 6px #8ee9ff}" +
    ".ps-sw-face{position:absolute;inset:7px;border-radius:50%;background:radial-gradient(circle at 50% 40%,#1a2230,#0c121c);display:grid;place-items:center;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.12)}" +
    ".ps-sw-digits{font-variant-numeric:tabular-nums;font-weight:800;font-size:11px;letter-spacing:.02em;color:#f6efe4;text-shadow:0 1px 2px #000;line-height:1}" +
    "#hud{box-sizing:border-box}" +
    "body.ps-has-timer #hud{top:16px!important;left:18px!important;right:18px!important;padding-right:4px}";
  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  var controls = Array.isArray(cfg.controls) ? cfg.controls : [];
  var keysHtml = controls.length
    ? '<ul class="pa-gate-keys" aria-label="Controls">' + controls.slice(0, 5).map(function (c) {
        return "<li><kbd>" + escapeHtml(c[0]) + "</kbd>" + escapeHtml(c[1]) + "</li>";
      }).join("") + "</ul>"
    : "";

  var gate = document.createElement("div");
  gate.id = "pa-gate";
  gate.setAttribute("role", "dialog");
  gate.setAttribute("aria-modal", "true");
  gate.setAttribute("aria-labelledby", "pa-gate-title");
  gate.innerHTML =
    '<div class="pa-gate-card">' +
      '<div class="pa-gate-kicker">PromptArcade</div>' +
      '<h2 id="pa-gate-title">' + escapeHtml(title) + "</h2>" +
      '<p class="pa-gate-sub" id="pa-gate-sub">Pick a player name for the leaderboard, then press Start.</p>' +
      keysHtml +
      '<p class="pa-gate-who" id="pa-gate-who" hidden><span>Playing as</span><strong id="pa-gate-who-name"></strong><button type="button" id="pa-gate-change">Change</button></p>' +
      '<div class="pa-gate-name-wrap" id="pa-gate-name-wrap">' +
        '<label for="pa-gate-input">Player name<input id="pa-gate-input" maxlength="16" autocomplete="nickname" spellcheck="false" placeholder="Up to 16 characters" enterkeyhint="go"/></label>' +
        '<div class="pa-gate-err" id="pa-gate-err" role="alert"></div>' +
      "</div>" +
      '<div class="pa-gate-actions">' +
        '<button type="button" id="pa-gate-save">Continue</button>' +
        '<button type="button" id="pa-gate-start" hidden>Start</button>' +
      "</div>" +
      '<p class="pa-gate-hint" id="pa-gate-hint" hidden>Press Enter or Space to start</p>' +
      '<div class="pa-gate-meta" id="pa-gate-meta"></div>' +
      '<p class="pa-gate-acct" id="pa-gate-acct" hidden></p>' +
    "</div>";
  document.body.appendChild(gate);

  var input = document.getElementById("pa-gate-input");
  var err = document.getElementById("pa-gate-err");
  var who = document.getElementById("pa-gate-who");
  var whoName = document.getElementById("pa-gate-who-name");
  var wrap = document.getElementById("pa-gate-name-wrap");
  var saveBtn = document.getElementById("pa-gate-save");
  var startBtn = document.getElementById("pa-gate-start");
  var hint = document.getElementById("pa-gate-hint");
  var sub = document.getElementById("pa-gate-sub");
  var meta = document.getElementById("pa-gate-meta");
  var mode = "name";
  var acctEl = document.getElementById("pa-gate-acct");
  function paintAccount() {
    var P = window.paPlayer;
    if (!P || !P.email) return;
    var e = P.email();
    acctEl.hidden = false;
    acctEl.innerHTML = e
      ? "Progress syncs to " + escapeHtml(e)
      : '<a href="/me/#account" target="_top">Sign in</a> to keep your progress on every device';
  }
  paintAccount();
  window.addEventListener("pa:account", paintAccount);

  function paintMeta() {
    if (!slug || !window.paScores) return;
    var name = getName();
    var best = name ? window.paScores.best(slug, name) : 0;
    var parts = [];
    if (best > 0) parts.push("<span>Your best <b>" + best.toLocaleString() + "</b></span>");
    meta.innerHTML = parts.join("");
    window.paScores.fetchTop(slug).then(function (d) {
      if (!d.top || !d.top.length) return;
      var lead = d.top[0];
      meta.innerHTML = parts.concat("<span>" + (d.source === "global" ? "World #1 " : "#1 here ") +
        escapeHtml(lead.name) + " <b>" + Number(lead.score).toLocaleString() + "</b></span>").join("");
    });
  }

  function showStart(name) {
    mode = "start";
    wrap.hidden = true;
    saveBtn.hidden = true;
    who.hidden = false;
    whoName.textContent = name;
    startBtn.hidden = false;
    hint.hidden = false;
    sub.textContent = "Your score saves to this game's Top 10 automatically.";
    paintMeta();
    setTimeout(function () { try { startBtn.focus(); } catch (e) {} }, 30);
  }
  function showNameForm(prefill) {
    mode = "name";
    wrap.hidden = false;
    saveBtn.hidden = false;
    who.hidden = true;
    startBtn.hidden = true;
    hint.hidden = true;
    sub.textContent = prefill
      ? "Change your name — it updates on every score you've already set."
      : "Pick a player name for the leaderboard, then press Start.";
    input.value = prefill || "";
    err.textContent = "";
    setTimeout(function () { try { input.focus(); input.select(); } catch (e) {} }, 30);
  }

  var existing = getName();
  if (existing) showStart(existing);
  else showNameForm("");

  var saving = false;
  saveBtn.addEventListener("click", function () {
    if (saving) return;
    var v = clean(input.value);
    if (!v) { err.textContent = "Add a name to save high scores."; input.focus(); return; }
    if (!NAME_RE.test(v) || !/[\p{L}\p{N}]/u.test(v)) {
      err.textContent = "Letters, numbers, spaces and - _ . ' only.";
      input.focus();
      return;
    }
    if (!window.paPlayer) { setName(v); showStart(v); return; }
    // Server-checked: creates this browser's player, or renames it (every score follows).
    saving = true;
    saveBtn.disabled = true;
    saveBtn.textContent = "Checking name…";
    err.textContent = "";
    window.paPlayer.setName(v).then(function (r) {
      saving = false;
      saveBtn.disabled = false;
      saveBtn.textContent = "Continue";
      if (!r || !r.ok) {
        err.textContent = (r && r.error) || "That name isn't allowed — try another.";
        try { input.focus(); input.select(); } catch (e) {}
        return;
      }
      showStart(r.name);
    });
  });
  window.addEventListener("pa:name", function (e) {
    var n = clean(e.detail && e.detail.name);
    if (n && mode === "start") whoName.textContent = n;
  });
  input.addEventListener("keydown", function (e) {
    e.stopPropagation();
    if (e.key === "Enter") { e.preventDefault(); saveBtn.click(); }
  });
  input.addEventListener("keyup", function (e) { e.stopPropagation(); });
  document.getElementById("pa-gate-change").addEventListener("click", function () { showNameForm(getName()); });

  function begin() {
    if (started) return;
    var n = getName();
    if (!n) { showNameForm(""); return; }
    started = true;
    gate.hidden = true;
    try { window.dispatchEvent(new CustomEvent("pa:start", { detail: { name: n, first: true } })); } catch (e) {}
    try {
      if (typeof window.psBeginGame === "function") window.psBeginGame();
      if (typeof window.paBeginGame === "function") window.paBeginGame();
    } catch (e) { if (window.console) console.error(e); }
    try { window.focus(); } catch (e) {}
  }
  startBtn.addEventListener("click", begin);

  document.addEventListener("keydown", function (e) {
    if (gate.hidden || mode !== "start") return;
    if (e.key === "Enter" || e.key === " " || e.code === "Space") {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!e.repeat) begin();
    }
  }, true);

  var nativeStart = document.getElementById("start");
  if (nativeStart) nativeStart.style.display = "none";

  function wrapTimer(el) {
    if (!el || el.classList.contains("ps-stopwatch")) return;
    document.body.classList.add("ps-has-timer");
    var digits = document.createElement("span");
    digits.className = "ps-sw-digits";
    digits.textContent = el.textContent || "";
    var face = document.createElement("span");
    face.className = "ps-sw-face";
    face.appendChild(digits);
    var body = document.createElement("span");
    body.className = "ps-sw-body";
    body.appendChild(face);
    el.classList.add("ps-stopwatch");
    el.textContent = "";
    el.appendChild(body);
    Object.defineProperty(el, "textContent", {
      configurable: true,
      get: function () { return digits.textContent; },
      set: function (v) { digits.textContent = v == null ? "" : String(v); }
    });
    Object.defineProperty(el, "innerHTML", {
      configurable: true,
      get: function () { return digits.textContent; },
      set: function (v) {
        var tmp = document.createElement("div");
        tmp.innerHTML = v == null ? "" : String(v);
        digits.textContent = tmp.textContent || "";
      }
    });
  }
  if (!cfg.native) {
    wrapTimer(document.getElementById("time"));
    wrapTimer(document.getElementById("clock"));
  }

  window.psGate = window.paGate = {
    getName: getName,
    setName: setName,
    isOpen: function () { return !gate.hidden; },
    reopen: function (askName) {
      started = false;
      gate.hidden = false;
      var n = getName();
      if (n && !askName) showStart(n);
      else showNameForm(n);
    }
  };
})();
