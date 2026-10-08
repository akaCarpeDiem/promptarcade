/* Username gate + Start before any play. Persists name in localStorage. */
(function () {
  var NAME_KEY = "pa_player_name";
  var started = false;

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

  var style = document.createElement("style");
  style.textContent =
    "#pa-gate{position:absolute;inset:0;z-index:40;display:grid;place-items:center;background:rgba(4,8,18,.78);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-family:system-ui,sans-serif;color:#f4f1ff}" +
    "#pa-gate[hidden]{display:none!important}" +
    "#pa-gate .pa-gate-card{background:linear-gradient(165deg,#14182c,#0e1220);border:1px solid rgba(142,233,255,.35);border-radius:18px;padding:1.15rem 1.25rem 1.2rem;width:min(20.5rem,calc(100% - 2rem));text-align:center;box-shadow:0 18px 48px rgba(0,0,0,.45),0 0 32px rgba(196,166,255,.12)}" +
    "#pa-gate h2{margin:0 0 .35rem;font-size:1.15rem;font-weight:750;letter-spacing:-.01em;background:linear-gradient(90deg,#8ee9ff,#c4a6ff);-webkit-background-clip:text;background-clip:text;color:transparent}" +
    "#pa-gate p{margin:0 0 .85rem;color:#c8c3d8;font-size:.9rem;line-height:1.35}" +
    "#pa-gate label{display:grid;gap:.3rem;text-align:left;font-size:.78rem;color:#a8a3b8;margin-bottom:.75rem}" +
    "#pa-gate input{font:inherit;color:#f4f1ff;background:#0a0e1a;border:1px solid rgba(244,241,255,.18);border-radius:12px;min-height:44px;padding:.45rem .75rem}" +
    "#pa-gate input:focus{outline:2px solid #8ee9ff;outline-offset:1px}" +
    "#pa-gate .pa-gate-err{color:#ffb4a8;font-size:.82rem;margin:-.35rem 0 .65rem;min-height:1.1em}" +
    "#pa-gate .pa-gate-actions{display:flex;flex-direction:column;gap:.55rem}" +
    "#pa-gate button{font:inherit;border:0;border-radius:999px;padding:.65rem 1.1rem;font-weight:800;min-height:46px;cursor:pointer}" +
    "#pa-gate #pa-gate-save{background:#d7c6ff;color:#1a1030}" +
    "#pa-gate #pa-gate-start{background:linear-gradient(135deg,#8ee9ff,#7ee7f5);color:#0c1520;box-shadow:0 0 24px rgba(142,233,255,.35)}" +
    "#pa-gate #pa-gate-start[hidden],#pa-gate #pa-gate-save[hidden],#pa-gate .pa-gate-name-wrap[hidden]{display:none!important}" +
    "#pa-gate .pa-gate-who{margin:0 0 .7rem;font-size:.92rem;color:#b7ecff}" +
    ".ps-stopwatch{display:inline-flex;align-items:center;justify-content:center;pointer-events:none;margin-left:.35rem}" +
    ".ps-sw-body{position:relative;width:54px;height:54px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff8e8,#e8d4a8 55%,#b8965a);box-shadow:inset 0 1px 0 rgba(255,255,255,.55),0 2px 8px rgba(0,0,0,.35);border:2px solid rgba(255,255,255,.35)}" +
    ".ps-sw-body::before{content:\"\";position:absolute;top:-7px;left:50%;width:10px;height:8px;margin-left:-5px;border-radius:3px 3px 2px 2px;background:#d7c49a;box-shadow:0 -2px 0 #c4ae7a}" +
    ".ps-sw-body::after{content:\"\";position:absolute;top:4px;right:6px;width:6px;height:6px;border-radius:50%;background:#8ee9ff;box-shadow:0 0 6px #8ee9ff}" +
    ".ps-sw-face{position:absolute;inset:7px;border-radius:50%;background:radial-gradient(circle at 50% 40%,#1a2230,#0c121c);display:grid;place-items:center;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.12)}" +
    ".ps-sw-digits{font-variant-numeric:tabular-nums;font-weight:800;font-size:11px;letter-spacing:.02em;color:#f6efe4;text-shadow:0 1px 2px #000;line-height:1}" +
    "#hud{box-sizing:border-box}" +
    "body.ps-has-timer #hud{top:16px!important;left:18px!important;right:18px!important;padding-right:4px}";
  document.head.appendChild(style);

  var gate = document.createElement("div");
  gate.id = "pa-gate";
  gate.innerHTML =
    '<div class="pa-gate-card">' +
      "<h2>High score name</h2>" +
      "<p>Enter a short name for the leaderboard, then press Start.</p>" +
      '<p class="pa-gate-who" id="pa-gate-who" hidden></p>' +
      '<div class="pa-gate-name-wrap" id="pa-gate-name-wrap">' +
        '<label>Display name<input id="pa-gate-input" maxlength="16" autocomplete="nickname" placeholder="Initials or a short name"/></label>' +
        '<div class="pa-gate-err" id="pa-gate-err"></div>' +
      "</div>" +
      '<div class="pa-gate-actions">' +
        '<button type="button" id="pa-gate-save">Continue</button>' +
        '<button type="button" id="pa-gate-start" hidden>Start</button>' +
      "</div>" +
    "</div>";
  document.body.appendChild(gate);

  var input = document.getElementById("pa-gate-input");
  var err = document.getElementById("pa-gate-err");
  var who = document.getElementById("pa-gate-who");
  var wrap = document.getElementById("pa-gate-name-wrap");
  var saveBtn = document.getElementById("pa-gate-save");
  var startBtn = document.getElementById("pa-gate-start");

  function showStart(name) {
    wrap.hidden = true;
    saveBtn.hidden = true;
    who.hidden = false;
    who.textContent = "Playing as " + name;
    startBtn.hidden = false;
    startBtn.focus();
  }
  function showNameForm(prefill) {
    wrap.hidden = false;
    saveBtn.hidden = false;
    who.hidden = true;
    startBtn.hidden = true;
    input.value = prefill || "";
    err.textContent = "";
    setTimeout(function () { try { input.focus(); } catch (e) {} }, 30);
  }

  var existing = getName();
  if (existing) showStart(existing);
  else showNameForm("");

  saveBtn.addEventListener("click", function () {
    var v = clean(input.value);
    if (!v) {
      err.textContent = "Add a name to save high scores.";
      input.focus();
      return;
    }
    setName(v);
    showStart(v);
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); saveBtn.click(); }
  });

  function begin() {
    if (started) return;
    var n = getName();
    if (!n) { showNameForm(""); return; }
    started = true;
    gate.hidden = true;
    try {
      if (typeof window.psBeginGame === "function") window.psBeginGame();
      if (typeof window.paBeginGame === "function") window.paBeginGame();
    } catch (e) {}
  }
  startBtn.addEventListener("click", begin);

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
    var desc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "textContent") ||
               Object.getOwnPropertyDescriptor(Node.prototype, "textContent");
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
  wrapTimer(document.getElementById("time"));
  wrapTimer(document.getElementById("clock"));

  window.psGate = window.paGate = {
    getName: getName,
    setName: setName,
    reopen: function () {
      started = false;
      gate.hidden = false;
      var n = getName();
      if (n) showStart(n);
      else showNameForm("");
    }
  };
})();
