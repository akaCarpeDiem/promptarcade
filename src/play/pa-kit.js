/* PromptArcade game kit — loaded by every play page after pa-score.js and pa-gate.js.
 *
 * Works for every game automatically:
 *   - Pause (Esc / P / toolbar / tab hidden) by time-shifting requestAnimationFrame, so loops freeze cleanly.
 *   - Pause menu with Resume, Restart, sound effects, music, change player.
 *   - Procedural WebAudio music + sound effects (prefs shared across games).
 *   - "Score saved · #N" toast after every run.
 *
 * Native games (window.paConfig.native = true) also get:
 *   PA.onStart(fn), PA.gameOver(score, {stats, title, unit}), PA.restart(), PA.state
 *   PA.loop(update, render), PA.canvas(el, opts), PA.sfx(name, opts), PA.tone(o), PA.noise(o)
 *   PA.shake(mag, dur), PA.shakeOffset(), PA.hitstop(ms), PA.flash(color, ms)
 *   new PA.Particles(), new PA.Texts(), PA.down(code...), PA.onKey(fn), PA.touchControls(spec), PA.swipe(el, fn)
 */
(function () {
  "use strict";
  var W = window, D = document;
  var cfg = W.paConfig || {};
  var slug = cfg.slug || ((location.pathname.match(/\/games\/play\/([a-z0-9-]+)/) || [])[1] || "game");
  var native = !!cfg.native;
  var hudSel = cfg.hud || "#score,#sc";

  function pref(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v === "1"; } catch (e) { return d; } }
  function setPref(k, v) { try { localStorage.setItem(k, v ? "1" : "0"); } catch (e) {} }

  var PA = W.PA = {
    slug: slug,
    config: cfg,
    state: "gate",
    isTouch: (W.matchMedia && W.matchMedia("(pointer: coarse)").matches) || "ontouchstart" in W,
    sfxOn: pref("pa_sfx", true),
    musicOn: pref("pa_music", false)
  };

  /* ---------------- math helpers ---------------- */
  PA.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  PA.lerp = function (a, b, t) { return a + (b - a) * t; };
  PA.rand = function (a, b) { return b === undefined ? Math.random() * a : a + Math.random() * (b - a); };
  PA.randInt = function (a, b) { return Math.floor(PA.rand(a, b + 1)); };
  PA.choice = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  PA.dist = function (ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); };
  PA.ease = {
    outCubic: function (t) { return 1 - Math.pow(1 - t, 3); },
    outBack: function (t) { var c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    inOut: function (t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  };

  /* ---------------- pause via rAF time shift ---------------- */
  var raf0 = W.requestAnimationFrame.bind(W);
  var paused = false, pauseAt = 0, offset = 0, held = [];
  W.requestAnimationFrame = function (cb) {
    if (paused) { held.push(cb); return 0; }
    return raf0(function (ts) {
      if (paused) { held.push(cb); return; }
      cb(ts - offset);
    });
  };
  PA.now = function () { return performance.now() - offset - (paused ? performance.now() - pauseAt : 0); };

  /* ---------------- styles ---------------- */
  var css =
    "@font-face{font-family:Manrope;font-style:normal;font-weight:200 800;font-display:swap;src:url(/fonts/manrope.woff2) format('woff2')}" +
    "@font-face{font-family:'JetBrains Mono';font-style:normal;font-weight:100 800;font-display:swap;src:url(/fonts/jetbrains-mono.woff2) format('woff2')}" +
    ".pa-tb{position:fixed;top:10px;right:10px;z-index:45;display:flex;gap:6px}" +
    ".pa-tb button,.pa-ibtn{width:38px;height:38px;display:grid;place-items:center;padding:0;border-radius:12px;cursor:pointer;color:#e8f9ff;background:rgba(10,14,30,.55);border:1px solid rgba(142,233,255,.28);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 4px 14px rgba(0,0,0,.3);transition:background .15s,transform .1s,border-color .15s}" +
    ".pa-tb button:hover{background:rgba(30,40,80,.75);border-color:rgba(142,233,255,.6)}.pa-tb button:active{transform:scale(.92)}" +
    ".pa-home{width:38px;height:38px;display:grid;place-items:center;border-radius:12px;color:#e8f9ff;background:rgba(10,14,30,.55);border:1px solid rgba(142,233,255,.28);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}.pa-home svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}" +
    "#pa-pass-toast{position:fixed;left:50%;bottom:22px;transform:translate(-50%,20px);z-index:80;display:flex;flex-direction:column;gap:6px;align-items:center;pointer-events:none}" +
    "#pa-pass-toast div{font:700 13px Manrope,system-ui,sans-serif;color:#fff;background:linear-gradient(90deg,rgba(20,24,60,.95),rgba(40,20,70,.95));border:1px solid rgba(180,160,255,.35);padding:.5rem .9rem;border-radius:999px;box-shadow:0 8px 30px rgba(0,0,0,.4);animation:paPass 4.2s forwards}" +
    "#pa-pass-toast div b{color:#ffe08a}" +
    "@keyframes paPass{0%{opacity:0;transform:translateY(16px) scale(.96)}8%{opacity:1;transform:none}85%{opacity:1}100%{opacity:0;transform:translateY(-6px)}}" +
    ".pa-xpline{font:600 12px Manrope,system-ui,sans-serif;color:#cdd3ff;margin:.2rem 0 .1rem}.pa-xpline b{color:#ffe08a}" +
    ".pa-tb svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}" +
    ".pa-tb button[aria-pressed=false]{color:#7a7694}" +
    "body.pa-ported #hud{right:110px!important}" +
    ".pa-layer{position:fixed;inset:0;z-index:55;display:grid;place-items:center;padding:12px;background:rgba(4,6,16,.66);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-family:Manrope,system-ui,sans-serif;color:#f4f1ff;animation:paFade .25s ease both}" +
    ".pa-layer[hidden]{display:none!important}" +
    "@keyframes paFade{from{opacity:0}to{opacity:1}}" +
    "@keyframes paPop{from{opacity:0;transform:translateY(16px) scale(.96)}to{opacity:1;transform:none}}" +
    "@keyframes paBadge{0%{transform:scale(.4) rotate(-8deg);opacity:0}60%{transform:scale(1.12) rotate(2deg);opacity:1}100%{transform:scale(1) rotate(0)}}" +
    ".pa-card{position:relative;width:min(24rem,100%);max-height:calc(100% - 8px);overflow:auto;text-align:center;padding:1.2rem 1.25rem 1.1rem;border-radius:22px;background:linear-gradient(165deg,rgba(26,30,58,.95),rgba(12,15,30,.97));border:1px solid rgba(142,233,255,.3);box-shadow:0 24px 70px rgba(0,0,0,.55),0 0 50px rgba(196,166,255,.14),inset 0 1px 0 rgba(255,255,255,.08);animation:paPop .4s cubic-bezier(.2,.9,.25,1.15) both}" +
    ".pa-kicker{font:500 .66rem/1 'JetBrains Mono',ui-monospace,monospace;letter-spacing:.22em;text-transform:uppercase;color:#8ee9ff}" +
    ".pa-card h2{margin:.45rem 0 .5rem;font-size:1.5rem;font-weight:600;letter-spacing:-.02em;background:linear-gradient(95deg,#fff 10%,#8ee9ff 55%,#c4a6ff);-webkit-background-clip:text;background-clip:text;color:transparent}" +
    ".pa-btns{display:flex;flex-direction:column;gap:.5rem;margin-top:.6rem}" +
    ".pa-btn{font:700 1rem Manrope,system-ui,sans-serif;min-height:46px;border-radius:999px;cursor:pointer;color:#f4f1ff;background:rgba(18,24,48,.85);border:1px solid rgba(244,241,255,.16);padding:.55rem 1rem;transition:transform .1s,filter .15s,border-color .15s}" +
    ".pa-btn:hover{border-color:rgba(142,233,255,.55)}.pa-btn:active{transform:scale(.97)}.pa-btn:focus-visible{outline:2px solid #fff;outline-offset:3px}" +
    ".pa-btn-primary{border:0;color:#0a1220;background:linear-gradient(135deg,#8ee9ff,#7ee7f5 45%,#c4a6ff);box-shadow:0 8px 30px rgba(142,233,255,.3)}" +
    ".pa-row2{display:grid;grid-template-columns:1fr 1fr;gap:.5rem}" +
    ".pa-toggle[aria-pressed=true]{border-color:rgba(126,231,168,.55);color:#bdf7d3}.pa-toggle[aria-pressed=false]{color:#8f8aa6}" +
    ".pa-hint{margin:.6rem 0 0;font-size:.72rem;color:#7a7694;letter-spacing:.04em}" +
    ".pa-score-big{font:600 clamp(2.4rem,9vw,3.4rem)/1 'JetBrains Mono',ui-monospace,monospace;letter-spacing:-.02em;color:#fff;text-shadow:0 0 24px rgba(142,233,255,.55),0 0 2px #fff;margin:.2rem 0 .1rem}" +
    ".pa-unit{display:block;font-size:.74rem;letter-spacing:.18em;text-transform:uppercase;color:#a8a3c0;margin-bottom:.4rem}" +
    ".pa-best{display:inline-block;margin:.2rem 0 .3rem;font-weight:700;font-size:.8rem;letter-spacing:.08em;text-transform:uppercase;color:#1a1030;background:linear-gradient(135deg,#ffd27a,#ff9ec4);border-radius:999px;padding:.3rem .75rem;box-shadow:0 0 24px rgba(255,210,122,.45);animation:paBadge .6s cubic-bezier(.2,.9,.25,1.3) both}" +
    ".pa-stats{display:flex;justify-content:center;flex-wrap:wrap;gap:.35rem;margin:.35rem 0 .2rem;padding:0;list-style:none}" +
    ".pa-stats li{font-size:.78rem;color:#c9c4dc;background:rgba(8,12,26,.6);border:1px solid rgba(244,241,255,.1);border-radius:999px;padding:.2rem .6rem}.pa-stats b{color:#fff}" +
    ".pa-rank{margin:.55rem 0 .35rem;font-size:.9rem;color:#d8f6ff;min-height:1.3em}" +
    ".pa-over-who{margin:-.15rem 0 .4rem;font-size:.78rem;letter-spacing:.04em;color:#a8a3c0}.pa-over-who:empty{display:none}" +
    ".pa-board{list-style:none;margin:0 0 .3rem;padding:0;display:grid;gap:3px;text-align:left}" +
    ".pa-board li{display:grid;grid-template-columns:1.8rem 1fr auto;gap:.4rem;align-items:center;font-size:.86rem;padding:.3rem .55rem;border-radius:10px;background:rgba(8,12,26,.45)}" +
    ".pa-board li .r{color:#6e6a84;font-family:'JetBrains Mono',monospace}.pa-board li .n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pa-board li .s{font-family:'JetBrains Mono',monospace;color:#8ee9ff}" +
    ".pa-board li.me{background:linear-gradient(90deg,rgba(142,233,255,.25),rgba(196,166,255,.18));box-shadow:inset 0 0 0 1px rgba(142,233,255,.55)}.pa-board li.me .n{color:#fff;font-weight:700}" +
    ".pa-board li.gap{background:none;justify-content:center;display:block;text-align:center;color:#6e6a84;padding:0}" +
    "#pa-toast{position:fixed;left:50%;top:12px;z-index:70;transform:translate(-50%,-140%);transition:transform .45s cubic-bezier(.2,.9,.25,1.2);font:600 .88rem Manrope,system-ui,sans-serif;color:#0a1220;background:linear-gradient(135deg,#8ee9ff,#c4a6ff);border-radius:999px;padding:.5rem 1rem;box-shadow:0 10px 30px rgba(0,0,0,.4),0 0 30px rgba(142,233,255,.35);white-space:nowrap;pointer-events:none}" +
    "#pa-toast:not(.on){visibility:hidden;transition:transform .45s,visibility 0s .45s}#pa-toast.on{transform:translate(-50%,0)}" +
    "#pa-flash{position:fixed;inset:0;z-index:44;pointer-events:none;opacity:0}" +
    ".pa-touch{position:fixed;bottom:max(12px,env(safe-area-inset-bottom));z-index:42;display:flex;flex-wrap:wrap;gap:8px;max-width:min(46vw,220px);touch-action:none;user-select:none;-webkit-user-select:none}" +
    ".pa-touch.l{left:max(8px,env(safe-area-inset-left))}.pa-touch.r{right:max(8px,env(safe-area-inset-right));max-width:min(42vw,200px);justify-content:flex-end}" +
    ".pa-touch.c{left:50%;transform:translateX(-50%);max-width:min(72vw,280px);justify-content:center;bottom:calc(max(12px,env(safe-area-inset-bottom)) + 4px)}" +
    ".pa-touch button{width:56px;height:56px;border-radius:50%;font:700 1.05rem Manrope,system-ui,sans-serif;color:#e8f9ff;background:rgba(14,20,44,.5);border:1.5px solid rgba(142,233,255,.4);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);box-shadow:0 0 18px rgba(142,233,255,.15);touch-action:none;-webkit-tap-highlight-color:transparent;padding:0;flex:0 0 auto}" +
    ".pa-touch button.wide{width:auto;min-width:56px;padding:0 .85rem;border-radius:28px;font-size:.82rem;letter-spacing:.04em}" +
    "@media (max-width:420px),(max-height:740px){.pa-touch{gap:6px}.pa-touch button{width:50px;height:50px;font-size:.95rem}.pa-touch button.wide{min-width:50px;font-size:.75rem;padding:0 .65rem}.pa-touch.c{bottom:calc(max(10px,env(safe-area-inset-bottom)) + 2px)}}" +
    ".pa-touch button.on{background:rgba(142,233,255,.35);border-color:#8ee9ff;transform:scale(.94)}" +
    ".pa-touch[hidden]{display:none!important}" +
    ".pa-hud{position:fixed;top:10px;left:10px;right:100px;z-index:30;display:flex;flex-wrap:wrap;gap:6px;pointer-events:none;font-family:Manrope,system-ui,sans-serif}" +
    ".pa-stat{display:flex;flex-direction:column;justify-content:center;min-width:64px;padding:.28rem .7rem .32rem;border-radius:12px;background:rgba(8,12,28,.55);border:1px solid rgba(142,233,255,.2);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}" +
    ".pa-stat small{font:500 .58rem/1.1 'JetBrains Mono',ui-monospace,monospace;letter-spacing:.16em;text-transform:uppercase;color:#8ee9ff;opacity:.85}" +
    ".pa-stat b{font:600 1.05rem/1.15 'JetBrains Mono',ui-monospace,monospace;color:#fff;font-variant-numeric:tabular-nums;text-shadow:0 0 12px rgba(142,233,255,.45)}" +
    ".pa-stat.bump b{animation:paBump .25s ease}" +
    "@keyframes paBump{0%{transform:scale(1)}40%{transform:scale(1.25);color:#ffd27a}100%{transform:scale(1)}}" +
    "@media (prefers-reduced-motion:reduce){.pa-layer,.pa-card,.pa-best{animation:none}}";
  var st = D.createElement("style");
  st.textContent = css;
  D.head.appendChild(st);
  if (!native) D.body.classList.add("pa-ported");

  /* ---------------- audio ---------------- */
  var AC = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
  function ac() {
    if (!AC) {
      var C = W.AudioContext || W.webkitAudioContext;
      if (!C) return null;
      try { AC = new C(); } catch (e) { return null; }
      master = AC.createDynamicsCompressor();
      master.threshold.value = -14; master.ratio.value = 4;
      master.connect(AC.destination);
      sfxBus = AC.createGain(); sfxBus.gain.value = .8; sfxBus.connect(master);
      musicBus = AC.createGain(); musicBus.gain.value = .0001; musicBus.connect(master);
      noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (AC.state === "suspended") { try { AC.resume(); } catch (e) {} }
    return AC;
  }
  PA.audio = ac;
  ["pointerdown", "keydown", "touchstart"].forEach(function (ev) {
    W.addEventListener(ev, function () { if (PA.sfxOn || PA.musicOn) ac(); }, { capture: true, passive: true });
  });

  /** Low-level tone: {freq, to, type, dur, vol, attack, delay, music} */
  PA.tone = function (o) {
    var a = ac();
    if (!a || (!o.music && !PA.sfxOn)) return;
    var t = a.currentTime + (o.delay || 0) + (o.at || 0);
    var osc = a.createOscillator(), g = a.createGain();
    osc.type = o.type || "square";
    osc.frequency.setValueAtTime(Math.max(1, o.freq), t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t + o.dur);
    if (o.detune) osc.detune.value = o.detune;
    var v = o.vol == null ? .15 : o.vol;
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(.0002, v), t + (o.attack || .005));
    g.gain.exponentialRampToValueAtTime(.0001, t + o.dur);
    osc.connect(g);
    if (o.filter) {
      var f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = o.filter; f.Q.value = o.q || 1;
      g.connect(f); f.connect(o.music ? musicBus : sfxBus);
    } else g.connect(o.music ? musicBus : sfxBus);
    osc.start(t); osc.stop(t + o.dur + .03);
  };
  /** Filtered noise burst: {dur, vol, freq, to, type, delay, music} */
  PA.noise = function (o) {
    var a = ac();
    if (!a || (!o.music && !PA.sfxOn)) return;
    var t = a.currentTime + (o.delay || 0) + (o.at || 0);
    var src = a.createBufferSource(); src.buffer = noiseBuf;
    var f = a.createBiquadFilter(); f.type = o.type || "lowpass"; f.Q.value = o.q || .8;
    f.frequency.setValueAtTime(o.freq || 2000, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + o.dur);
    var g = a.createGain(), v = o.vol == null ? .2 : o.vol;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + o.dur);
    src.connect(f); f.connect(g); g.connect(o.music ? musicBus : sfxBus);
    src.start(t, Math.random() * .5); src.stop(t + o.dur + .02);
  };
  function arp(notes, step, type, vol, p) {
    notes.forEach(function (n, i) { PA.tone({ freq: n * p, type: type || "square", dur: step * 1.6, vol: vol || .1, delay: i * step }); });
  }
  var SFX = {
    blip: function (p) { PA.tone({ freq: 620 * p, to: 940 * p, type: "square", dur: .06, vol: .07 }); },
    click: function (p) { PA.tone({ freq: 1200 * p, type: "triangle", dur: .04, vol: .08 }); },
    select: function (p) { PA.tone({ freq: 520 * p, type: "triangle", dur: .07, vol: .1 }); PA.tone({ freq: 780 * p, type: "triangle", dur: .1, vol: .1, delay: .05 }); },
    coin: function (p) { PA.tone({ freq: 988 * p, type: "square", dur: .06, vol: .08 }); PA.tone({ freq: 1319 * p, type: "square", dur: .18, vol: .08, delay: .06 }); },
    jump: function (p) { PA.tone({ freq: 260 * p, to: 640 * p, type: "square", dur: .14, vol: .08, filter: 3000 }); },
    flap: function (p) { PA.noise({ dur: .09, vol: .14, freq: 1400 * p, to: 500, type: "bandpass", q: 2 }); PA.tone({ freq: 380 * p, to: 560 * p, type: "triangle", dur: .08, vol: .06 }); },
    laser: function (p) { PA.tone({ freq: 1500 * p, to: 260 * p, type: "sawtooth", dur: .11, vol: .05, filter: 4000 }); },
    shoot: function (p) { PA.tone({ freq: 880 * p, to: 440 * p, type: "square", dur: .07, vol: .05 }); PA.noise({ dur: .05, vol: .05, freq: 5000, type: "highpass" }); },
    hit: function (p) { PA.noise({ dur: .12, vol: .22, freq: 2400 * p, to: 300, type: "lowpass" }); PA.tone({ freq: 200 * p, to: 70, type: "sawtooth", dur: .12, vol: .1 }); },
    bounce: function (p) { PA.tone({ freq: 440 * p, type: "sine", dur: .08, vol: .14 }); PA.tone({ freq: 880 * p, type: "triangle", dur: .05, vol: .04 }); },
    brick: function (p) { PA.tone({ freq: 660 * p, type: "square", dur: .05, vol: .07 }); PA.noise({ dur: .06, vol: .08, freq: 6000, type: "highpass" }); },
    explode: function (p) { PA.noise({ dur: .55, vol: .38, freq: 1600 * p, to: 90, type: "lowpass" }); PA.tone({ freq: 110 * p, to: 30, type: "sine", dur: .5, vol: .32 }); },
    boom: function (p) { PA.noise({ dur: 1.1, vol: .45, freq: 900 * p, to: 50, type: "lowpass" }); PA.tone({ freq: 70 * p, to: 25, type: "sine", dur: 1, vol: .4 }); },
    thud: function (p) { PA.tone({ freq: 150 * p, to: 60, type: "sine", dur: .14, vol: .25 }); },
    pop: function (p) { PA.tone({ freq: 300 * p, to: 900 * p, type: "sine", dur: .07, vol: .14 }); },
    power: function (p) { arp([523, 659, 784, 1047, 1319], .05, "square", .07, p); },
    levelup: function (p) { arp([392, 523, 659, 784, 1047], .08, "triangle", .12, p); arp([196, 262, 330, 392], .1, "square", .04, p); },
    lose: function (p) { arp([392, 330, 262, 196, 147], .13, "triangle", .14, p); },
    gameover: function (p) { arp([523, 415, 349, 262], .18, "triangle", .14, p); PA.tone({ freq: 131 * p, type: "sawtooth", dur: .9, vol: .06, delay: .5, filter: 900 }); },
    combo: function (p) { PA.tone({ freq: 660 * p, type: "square", dur: .07, vol: .07 }); PA.tone({ freq: 990 * p, type: "square", dur: .1, vol: .06, delay: .05 }); },
    whoosh: function (p) { PA.noise({ dur: .3, vol: .14, freq: 400 * p, to: 3000 * p, type: "bandpass", q: 1.5 }); },
    engine: function (p) { PA.tone({ freq: 70 * p, type: "sawtooth", dur: .12, vol: .03, filter: 500 }); }
  };
  /** PA.sfx(name, {pitch, vary}) — plays a preset. Unknown names fall back to blip. */
  PA.sfx = function (name, o) {
    if (!PA.sfxOn) return;
    o = o || {};
    var p = (o.pitch || 1) * (o.vary ? 1 + (Math.random() - .5) * o.vary : 1);
    try { (SFX[name] || SFX.blip)(p); } catch (e) {}
  };
  PA.sfxPresets = SFX;

  /* ---------------- procedural music ---------------- */
  var N = function (semi) { return 440 * Math.pow(2, (semi - 9) / 12) / 4; }; // semitone above C (octave 2-ish)
  var TRACKS = {
    synth: { bpm: 112, prog: [[9, 12, 16], [5, 9, 12], [0, 4, 7], [7, 11, 14]], lead: "square", bass: "sawtooth" },
    drive: { bpm: 128, prog: [[4, 7, 11], [0, 4, 7], [2, 6, 9], [11, 14, 18]], lead: "sawtooth", bass: "sawtooth" },
    chill: { bpm: 92, prog: [[2, 5, 9, 12], [7, 11, 14, 17], [0, 4, 7, 11], [9, 12, 16, 19]], lead: "triangle", bass: "triangle" },
    tense: { bpm: 120, prog: [[0, 3, 7], [8, 12, 15], [5, 8, 12], [7, 11, 14]], lead: "square", bass: "square" },
    retro: { bpm: 140, prog: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]], lead: "square", bass: "triangle" },
    space: { bpm: 100, prog: [[2, 5, 9], [10, 14, 17], [7, 10, 14], [9, 13, 16]], lead: "triangle", bass: "sawtooth" }
  };
  var music = { track: TRACKS[cfg.music] || TRACKS.synth, timer: 0, step: 0, next: 0, playing: false, intensity: 0 };
  function scheduleStep(t, step) {
    var tr = music.track, spb = 60 / tr.bpm / 4;
    var bar = Math.floor(step / 16) % tr.prog.length, s = step % 16, ch = tr.prog[bar];
    var root = ch[0];
    if (s % 4 === 0) PA.noise({ music: true, at: t - AC.currentTime, dur: .16, vol: .32, freq: 160, to: 40 });
    if (s % 8 === 4) PA.noise({ music: true, at: t - AC.currentTime, dur: .14, vol: .12, freq: 2400, type: "bandpass", q: .6 });
    if (s % 2 === 1) PA.noise({ music: true, at: t - AC.currentTime, dur: .04, vol: .05, freq: 8000, type: "highpass" });
    if (s % 2 === 0) PA.tone({ music: true, at: t - AC.currentTime, freq: N(root) * (s % 4 === 2 ? 2 : 1), type: tr.bass, dur: spb * 1.8, vol: .09, filter: 700 });
    var arpN = ch[(s * 3 + Math.floor(s / 4)) % ch.length];
    PA.tone({ music: true, at: t - AC.currentTime, freq: N(arpN) * 4, type: tr.lead, dur: spb * .9, vol: .028 + music.intensity * .02, filter: 2600 + music.intensity * 2000 });
    if (s === 0 || s === 10) PA.tone({ music: true, at: t - AC.currentTime, freq: N(ch[ch.length - 1]) * 8, type: "triangle", dur: spb * 5, vol: .025, attack: .04 });
  }
  function musicTick() {
    if (!AC || !music.playing) return;
    var spb = 60 / music.track.bpm / 4;
    while (music.next < AC.currentTime + .15) {
      scheduleStep(music.next, music.step);
      music.next += spb;
      music.step++;
    }
  }
  function musicStart() {
    var a = ac();
    if (!a || music.playing) return;
    music.playing = true;
    music.next = a.currentTime + .08;
    musicBus.gain.cancelScheduledValues(a.currentTime);
    musicBus.gain.setTargetAtTime(.55, a.currentTime, .3);
    music.timer = setInterval(musicTick, 40);
  }
  function musicStop() {
    if (!music.playing) return;
    music.playing = false;
    clearInterval(music.timer);
    if (AC) { musicBus.gain.cancelScheduledValues(AC.currentTime); musicBus.gain.setTargetAtTime(.0001, AC.currentTime, .08); }
  }
  function syncMusic() {
    if (PA.musicOn && PA.state === "play" && !paused) musicStart(); else musicStop();
  }
  PA.music = {
    set: function (name) { if (TRACKS[name]) music.track = TRACKS[name]; },
    intensity: function (v) { music.intensity = PA.clamp(v, 0, 1); },
    tracks: TRACKS
  };

  /* ---------------- toolbar + pause menu ---------------- */
  var ICON = {
    pause: '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>',
    sound: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
    mute: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>'
  };
  var tb = D.createElement("div");
  tb.className = "pa-tb";
  var framed = (function () { try { return W.self !== W.top; } catch (e) { return true; } })();
  tb.innerHTML = (framed ? "" : '<a class="pa-home" href="/games/' + slug + '/" aria-label="Back to PromptArcade" title="Back to PromptArcade"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></a>') +
    '<button type="button" id="pa-tb-sound" aria-label="Sound effects" title="Sound (M)"></button>' +
    '<button type="button" id="pa-tb-pause" aria-label="Pause" title="Pause (Esc / P)">' + ICON.pause + "</button>";
  D.body.appendChild(tb);
  var soundBtn = tb.querySelector("#pa-tb-sound");
  function paintSound() {
    soundBtn.innerHTML = PA.sfxOn ? ICON.sound : ICON.mute;
    soundBtn.setAttribute("aria-pressed", PA.sfxOn ? "true" : "false");
  }
  paintSound();

  var pauseLayer = D.createElement("div");
  pauseLayer.className = "pa-layer";
  pauseLayer.hidden = true;
  pauseLayer.innerHTML = '<div class="pa-card" role="dialog" aria-modal="true" aria-labelledby="pa-pause-h">' +
    '<div class="pa-kicker">' + (cfg.title || "PromptArcade") + "</div><h2 id=\"pa-pause-h\">Paused</h2>" +
    '<div class="pa-btns"><button type="button" class="pa-btn pa-btn-primary" id="pa-resume">Resume</button>' +
    '<button type="button" class="pa-btn" id="pa-restart">Restart run</button>' +
    '<div class="pa-row2"><button type="button" class="pa-btn pa-toggle" id="pa-tg-sfx">Sound FX</button>' +
    '<button type="button" class="pa-btn pa-toggle" id="pa-tg-music">Music</button></div>' +
    '<button type="button" class="pa-btn" id="pa-change-player">Change player</button></div>' +
    '<p class="pa-hint">Esc or P to resume · M to mute</p></div>';
  D.body.appendChild(pauseLayer);
  var tgSfx = pauseLayer.querySelector("#pa-tg-sfx"), tgMusic = pauseLayer.querySelector("#pa-tg-music");
  function paintToggles() {
    tgSfx.setAttribute("aria-pressed", PA.sfxOn ? "true" : "false");
    tgSfx.textContent = "Sound FX " + (PA.sfxOn ? "on" : "off");
    tgMusic.setAttribute("aria-pressed", PA.musicOn ? "true" : "false");
    tgMusic.textContent = "Music " + (PA.musicOn ? "on" : "off");
  }
  paintToggles();

  PA.setSfx = function (on) { PA.sfxOn = !!on; setPref("pa_sfx", PA.sfxOn); paintSound(); paintToggles(); if (on) PA.sfx("select"); };
  PA.setMusic = function (on) { PA.musicOn = !!on; setPref("pa_music", PA.musicOn); paintToggles(); if (on) ac(); syncMusic(); };

  var pauseCbs = [];
  PA.onPause = function (fn) { pauseCbs.push(fn); };
  PA.isPaused = function () { return paused; };
  PA.pause = function (silent) {
    if (paused || PA.state !== "play") return;
    paused = true;
    pauseAt = performance.now();
    pauseLayer.hidden = !!silent;
    syncMusic();
    pauseCbs.forEach(function (f) { try { f(true); } catch (e) {} });
    setTimeout(function () { try { pauseLayer.querySelector("#pa-resume").focus(); } catch (e) {} }, 20);
  };
  PA.resume = function () {
    if (!paused) return;
    paused = false;
    offset += performance.now() - pauseAt;
    pauseLayer.hidden = true;
    var h = held; held = [];
    h.forEach(function (cb) { raf0(function (ts) { cb(ts - offset); }); });
    for (var k in keys) keys[k] = false;
    syncMusic();
    pauseCbs.forEach(function (f) { try { f(false); } catch (e) {} });
    try { W.focus(); } catch (e) {}
  };
  PA.togglePause = function () { if (paused) PA.resume(); else PA.pause(); };

  tb.querySelector("#pa-tb-pause").addEventListener("click", function () { PA.togglePause(); });
  soundBtn.addEventListener("click", function () { PA.setSfx(!PA.sfxOn); });
  pauseLayer.querySelector("#pa-resume").addEventListener("click", PA.resume);
  pauseLayer.querySelector("#pa-restart").addEventListener("click", function () { PA.resume(); PA.restart(); });
  tgSfx.addEventListener("click", function () { PA.setSfx(!PA.sfxOn); });
  tgMusic.addEventListener("click", function () { PA.setMusic(!PA.musicOn); });
  pauseLayer.querySelector("#pa-change-player").addEventListener("click", function () {
    pauseLayer.hidden = true;
    PA.state = "gate";
    syncMusic();
    if (W.paGate) W.paGate.reopen(true);
  });

  D.addEventListener("visibilitychange", function () { if (D.hidden) PA.pause(); });
  W.addEventListener("blur", function () { if (cfg.pauseOnBlur !== false) setTimeout(function () { if (!D.hasFocus()) PA.pause(); }, 60); });

  /* ---------------- input ---------------- */
  var keys = {};
  var keyCbs = [];
  PA.keys = keys;
  PA.down = function () {
    for (var i = 0; i < arguments.length; i++) if (keys[arguments[i]]) return true;
    return false;
  };
  PA.onKey = function (fn) { keyCbs.push(fn); };
  function inUi(t) { return t && t.closest && t.closest("#pa-gate,#pa-rename,.pa-layer,.pa-tb,input,textarea,select"); }
  W.addEventListener("keydown", function (e) {
    var k = e.key;
    if (inUi(e.target) && (k === "Enter" || k === " " || e.target.tagName === "INPUT")) return;
    if (W.paGate && W.paGate.isOpen()) return;
    var rn = D.getElementById("pa-rename"); if (rn && !rn.hidden) return;
    if ((k === "Escape" || (!cfg.typing && (k === "p" || k === "P"))) && (PA.state === "play" || paused)) {
      e.preventDefault(); e.stopImmediatePropagation(); PA.togglePause(); return;
    }
    if ((k === "m" || k === "M") && !e.repeat && !cfg.typing && !(cfg.keys && cfg.keys.indexOf("m") >= 0)) { PA.setSfx(!PA.sfxOn); }
    if (paused) { e.stopImmediatePropagation(); if (k !== "Tab") e.preventDefault(); return; }
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].indexOf(k) >= 0) e.preventDefault();
    if (PA.state === "over" && native && (k === "Enter" || k === " ") && overReady) { e.preventDefault(); PA.restart(); return; }
    keys[e.code] = true; keys[k] = true; if (k.length === 1) keys[k.toLowerCase()] = true;
    if (native && PA.state === "play") keyCbs.forEach(function (f) { try { f(e); } catch (err) { console.error(err); } });
  }, true);
  W.addEventListener("keyup", function (e) {
    keys[e.code] = false; keys[e.key] = false; if (e.key.length === 1) keys[e.key.toLowerCase()] = false;
  }, true);
  ["pointerdown", "mousedown", "touchstart", "click"].forEach(function (ev) {
    W.addEventListener(ev, function (e) {
      if (paused && !(e.target.closest && e.target.closest(".pa-layer,.pa-tb,#pa-gate"))) { e.stopImmediatePropagation(); }
    }, { capture: true });
  });

  function synthKey(type, key, code) {
    var ev = new KeyboardEvent(type, { key: key, code: code || key, bubbles: true, cancelable: true });
    W.dispatchEvent(ev);
  }
  /** On-screen touch buttons. spec: {left:[{key,code,label,wide}], right:[...], center:[...], always:false} */
  PA.touchControls = function (spec) {
    var groups = [];
    [["left", "l"], ["right", "r"], ["center", "c"]].forEach(function (pair) {
      var list = spec[pair[0]];
      if (!list || !list.length) return;
      var g = D.createElement("div");
      g.className = "pa-touch " + pair[1];
      g.hidden = !(PA.isTouch || spec.always);
      list.forEach(function (b) {
        var btn = D.createElement("button");
        btn.type = "button";
        btn.textContent = b.label;
        btn.setAttribute("aria-label", b.aria || b.label);
        if (b.wide) btn.className = "wide";
        var on = false;
        function press(e) { e.preventDefault(); if (on) return; on = true; btn.classList.add("on"); synthKey("keydown", b.key, b.code); }
        function release(e) { if (e) e.preventDefault(); if (!on) return; on = false; btn.classList.remove("on"); synthKey("keyup", b.key, b.code); }
        btn.addEventListener("pointerdown", function (e) { try { btn.setPointerCapture(e.pointerId); } catch (x) {} press(e); });
        btn.addEventListener("pointerup", release);
        btn.addEventListener("pointercancel", release);
        btn.addEventListener("lostpointercapture", function () { release(); });
        g.appendChild(btn);
      });
      D.body.appendChild(g);
      groups.push(g);
    });
    W.addEventListener("touchstart", function () { groups.forEach(function (g) { g.hidden = false; }); }, { once: true, passive: true });
    return groups;
  };
  /** Swipe + tap detection on an element. fn(dir) with dir in up/down/left/right/tap. */
  PA.swipe = function (el, fn, min) {
    var sx = 0, sy = 0, st0 = 0, active = false;
    min = min || 28;
    el.addEventListener("pointerdown", function (e) { active = true; sx = e.clientX; sy = e.clientY; st0 = performance.now(); });
    el.addEventListener("pointerup", function (e) {
      if (!active) return;
      active = false;
      if (paused || PA.state !== "play") return;
      var dx = e.clientX - sx, dy = e.clientY - sy, ax = Math.abs(dx), ay = Math.abs(dy);
      if (Math.max(ax, ay) < min) { if (performance.now() - st0 < 350) fn("tap", e); return; }
      fn(ax > ay ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"), e);
    });
    el.addEventListener("pointercancel", function () { active = false; });
  };

  /* ---------------- canvas + loop ---------------- */
  /** PA.canvas(el, {width, height, onResize}) — fixed logical size (letterboxed) or full-window when no size given. */
  PA.canvas = function (canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext("2d");
    var o = { canvas: canvas, ctx: ctx, w: 0, h: 0, dpr: 1, scale: 1 };
    function fit() {
      var dpr = Math.min(2, W.devicePixelRatio || 1);
      var vw = W.innerWidth, vh = W.innerHeight;
      if (opts.width && opts.height) {
        var s = Math.min(vw / opts.width, vh / opts.height);
        canvas.style.width = Math.floor(opts.width * s) + "px";
        canvas.style.height = Math.floor(opts.height * s) + "px";
        canvas.width = Math.floor(opts.width * s * dpr);
        canvas.height = Math.floor(opts.height * s * dpr);
        ctx.setTransform(s * dpr, 0, 0, s * dpr, 0, 0);
        o.w = opts.width; o.h = opts.height; o.scale = s;
      } else {
        canvas.style.width = vw + "px"; canvas.style.height = vh + "px";
        canvas.width = Math.floor(vw * dpr); canvas.height = Math.floor(vh * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        o.w = vw; o.h = vh; o.scale = 1;
      }
      o.dpr = dpr;
      if (opts.onResize) opts.onResize(o);
    }
    o.fit = fit;
    o.toLocal = function (cx, cy) {
      var r = canvas.getBoundingClientRect();
      return { x: (cx - r.left) / r.width * o.w, y: (cy - r.top) / r.height * o.h };
    };
    W.addEventListener("resize", fit);
    fit();
    return o;
  };

  var shakeMag = 0, shakeT = 0, shakeDur = 0, shakeX = 0, shakeY = 0, hitT = 0, timeScale = 1;
  PA.shake = function (mag, dur) { if (mag >= shakeMag * (shakeT / (shakeDur || 1))) { shakeMag = mag; shakeDur = shakeT = dur || .3; } };
  PA.shakeOffset = function () { return { x: shakeX, y: shakeY }; };
  PA.hitstop = function (ms) { hitT = Math.max(hitT, ms / 1000); };
  PA.slowmo = function (scale) { timeScale = scale; };
  /** PA.loop(update(dt, t), render(t)) — dt in seconds, capped; frozen while paused or in hitstop. */
  PA.loop = function (update, render) {
    var last = 0, t = 0;
    function frame(ts) {
      W.requestAnimationFrame(frame);
      var dt = last ? Math.min(.05, (ts - last) / 1000) : 0;
      last = ts;
      if (shakeT > 0) {
        shakeT -= dt;
        var k = Math.max(0, shakeT / shakeDur) * shakeMag;
        shakeX = (Math.random() * 2 - 1) * k; shakeY = (Math.random() * 2 - 1) * k;
      } else { shakeX = shakeY = 0; shakeMag = 0; }
      if (hitT > 0) { hitT -= dt; dt = 0; }
      dt *= timeScale;
      t += dt;
      try { if (update) update(dt, t); } catch (e) { console.error(e); }
      try { if (render) render(t); } catch (e) { console.error(e); }
    }
    W.requestAnimationFrame(frame);
  };

  var flashEl = D.createElement("div");
  flashEl.id = "pa-flash";
  D.body.appendChild(flashEl);
  PA.flash = function (color, ms) {
    flashEl.style.transition = "none";
    flashEl.style.background = color || "#fff";
    flashEl.style.opacity = ".55";
    void flashEl.offsetWidth;
    flashEl.style.transition = "opacity " + (ms || 220) + "ms ease-out";
    flashEl.style.opacity = "0";
  };

  /* ---------------- particles + floating text ---------------- */
  function Particles(max) { this.list = []; this.max = max || 900; }
  /** burst(x, y, {n, color|colors, speed, life, size, gravity, drag, spread, angle, glow, shape}) */
  Particles.prototype.burst = function (x, y, o) {
    o = o || {};
    var n = o.n || 16, sp = o.speed || 220, life = o.life || .6, size = o.size || 3;
    var spread = o.spread == null ? Math.PI * 2 : o.spread, ang = o.angle || 0;
    for (var i = 0; i < n; i++) {
      if (this.list.length >= this.max) this.list.shift();
      var a = ang + (Math.random() - .5) * spread, v = sp * (.35 + Math.random() * .75);
      this.list.push({
        x: x, y: y, vx: Math.cos(a) * v + (o.vx || 0), vy: Math.sin(a) * v + (o.vy || 0),
        life: life * (.6 + Math.random() * .6), max: 0, size: size * (.6 + Math.random() * .8),
        color: o.colors ? o.colors[(Math.random() * o.colors.length) | 0] : (o.color || "#8ee9ff"),
        g: o.gravity || 0, drag: o.drag == null ? 2.2 : o.drag, shape: o.shape || "dot"
      });
      this.list[this.list.length - 1].max = this.list[this.list.length - 1].life;
    }
  };
  Particles.prototype.update = function (dt) {
    var L = this.list, j = 0;
    for (var i = 0; i < L.length; i++) {
      var p = L[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      var dr = Math.max(0, 1 - p.drag * dt);
      p.vx *= dr; p.vy = p.vy * dr + p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      L[j++] = p;
    }
    L.length = j;
  };
  Particles.prototype.draw = function (ctx) {
    var L = this.list;
    if (!L.length) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < L.length; i++) {
      var p = L[i], k = p.life / p.max;
      ctx.globalAlpha = Math.min(1, k * 1.4);
      ctx.fillStyle = p.color;
      if (p.shape === "spark") {
        ctx.strokeStyle = p.color; ctx.lineWidth = p.size * .6;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * .04, p.y - p.vy * .04); ctx.stroke();
      } else if (p.shape === "square") {
        var s = p.size * (.5 + k * .5); ctx.fillRect(p.x - s, p.y - s, s * 2, s * 2);
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (.4 + k * .6), 0, 6.283); ctx.fill();
      }
    }
    ctx.restore();
  };
  Particles.prototype.clear = function () { this.list.length = 0; };
  PA.Particles = Particles;

  function Texts() { this.list = []; }
  /** add(x, y, text, {color, size, life, vy}) */
  Texts.prototype.add = function (x, y, text, o) {
    o = o || {};
    this.list.push({ x: x, y: y, text: String(text), color: o.color || "#fff", size: o.size || 18, life: o.life || .9, max: o.life || .9, vy: o.vy == null ? -60 : o.vy });
  };
  Texts.prototype.update = function (dt) {
    this.list = this.list.filter(function (t) { t.life -= dt; t.y += t.vy * dt; return t.life > 0; });
  };
  Texts.prototype.draw = function (ctx) {
    ctx.save();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    this.list.forEach(function (t) {
      var k = t.life / t.max, pop = k > .85 ? 1 + (k - .85) * 3 : 1;
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.font = "700 " + Math.round(t.size * pop) + "px Manrope, system-ui, sans-serif";
      ctx.shadowColor = t.color; ctx.shadowBlur = 12;
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    });
    ctx.restore();
  };
  Texts.prototype.clear = function () { this.list.length = 0; };
  PA.Texts = Texts;

  /** Update a .pa-stat value with a little bump animation. */
  PA.stat = function (el, value) {
    if (typeof el === "string") el = D.getElementById(el);
    if (!el) return;
    var b = el.querySelector("b") || el;
    var v = String(value);
    if (b.textContent === v) return;
    b.textContent = v;
    var host = b.closest(".pa-stat");
    if (host) { host.classList.remove("bump"); void host.offsetWidth; host.classList.add("bump"); }
  };

  /* ---------------- lifecycle ---------------- */
  var startCbs = [];
  PA.onStart = function (fn) { startCbs.push(fn); };
  function runStart() {
    overLayer.hidden = true;
    if (W.paScores) W.paScores.arm();
    PA.state = "play";
    for (var k in keys) keys[k] = false;
    syncMusic();
    if (native) startCbs.forEach(function (f) { try { f(); } catch (e) { console.error(e); } });
    else if (typeof W.psBeginGame === "function") W.psBeginGame();
    try { W.focus(); } catch (e) {}
  }
  W.addEventListener("pa:start", function () {
    if (paused) PA.resume();
    PA.state = "play";
    if (W.paScores) W.paScores.arm();
    ac();
    syncMusic();
  });
  if (native) W.paBeginGame = function () { runStart(); };
  PA.restart = function () {
    if (PA.state === "gate") return;
    if (native) runStart();
    else { if (W.paScores) W.paScores.arm(); runStart(); }
  };
  // Ported games restart from their own "again" buttons.
  D.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("#again,#begin,#restart") : null;
    if (t) { PA.state = "play"; syncMusic(); }
  }, true);

  /* ---------------- game over ---------------- */
  var overLayer = D.createElement("div");
  overLayer.className = "pa-layer";
  overLayer.id = "pa-over";
  overLayer.hidden = true;
  overLayer.innerHTML = '<div class="pa-card" role="dialog" aria-modal="true" aria-labelledby="pa-over-h">' +
    '<div class="pa-kicker" id="pa-over-k">Game over</div><h2 id="pa-over-h">Run complete</h2>' +
    '<div class="pa-score-big" id="pa-over-num">0</div><span class="pa-unit" id="pa-over-unit">points</span>' +
    '<div id="pa-over-best" class="pa-best" hidden>New personal best</div>' +
    '<ul class="pa-stats" id="pa-over-stats"></ul>' +
    '<p class="pa-rank" id="pa-over-rank" aria-live="polite">Saving score…</p>' +
    '<p class="pa-over-who" id="pa-over-who"></p>' +
    '<ol class="pa-board" id="pa-over-board"></ol>' +
    '<p class="pa-xpline" id="pa-over-xp" hidden></p>' +
    '<div class="pa-btns"><button type="button" class="pa-btn pa-btn-primary" id="pa-again">Play again</button>' +
    '<button type="button" class="pa-btn" id="pa-over-share">Challenge a friend</button>' +
    '<button type="button" class="pa-btn" id="pa-over-change">Change name</button></div>' +
    '<p class="pa-hint">Enter or Space to play again</p></div>';
  D.body.appendChild(overLayer);
  var overReady = false;
  overLayer.querySelector("#pa-again").addEventListener("click", function () { PA.restart(); });
  overLayer.querySelector("#pa-over-share").addEventListener("click", function () {
    var n = lastScore, title = cfg.title || slug, unit = cfg.unit || "points";
    var url = location.origin + "/games/" + slug + "/?beat=" + encodeURIComponent(n);
    var text = "I scored " + Number(n).toLocaleString() + " " + unit + " in " + title + " on PromptArcade — a game made entirely by AI. Can you beat it?";
    var btn = this;
    function done(msg) { btn.textContent = msg; setTimeout(function () { btn.textContent = "Challenge a friend"; }, 2200); }
    try {
      if (navigator.share && W.matchMedia && W.matchMedia("(pointer:coarse)").matches) { navigator.share({ title: title, text: text, url: url }).catch(function () {}); return; }
    } catch (e) {}
    try { navigator.clipboard.writeText(text + " " + url).then(function () { done("Link copied!"); }, function () { done("Couldn't copy"); }); } catch (e) { done("Couldn't copy"); }
  });
  var lastScore = 0;
  overLayer.querySelector("#pa-over-change").addEventListener("click", function () {
    // Rename in place: the new name replaces the old one on every saved score, then the board repaints.
    if (W.paPlayer) { W.paPlayer.openRename({ onDone: function () { repaintOver(); } }); return; }
    overLayer.hidden = true; PA.state = "gate"; if (W.paGate) W.paGate.reopen(true);
  });
  var lastOver = null;
  function paintOverWho() {
    var el = overLayer.querySelector("#pa-over-who");
    if (!el) return;
    var n = W.paPlayer ? W.paPlayer.getName() : "";
    el.textContent = n ? "Playing as " + n : "";
  }
  function repaintOver() {
    paintOverWho();
    if (!lastOver || !W.paScores) return;
    W.paScores.fetchTop(slug).then(function (d) {
      if (d && d.top) { lastOver.top = d.top; paintBoard(overLayer.querySelector("#pa-over-board"), lastOver, 5); }
    });
  }
  W.addEventListener("pa:name", function () { if (!overLayer.hidden) repaintOver(); });

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function paintBoard(el, res, max) {
    var top = (res.top || []).slice(0, max || 5), html = "", mine = false;
    top.forEach(function (r, i) {
      var me = (r.id && r.id === res.id) || (r.pid && W.paPlayer && r.pid === W.paPlayer.id() && r.score === res.score);
      if (me) mine = true;
      html += '<li class="' + (me ? "me" : "") + '"><span class="r">' + (i + 1) + '</span><span class="n">' + esc(r.name) + '</span><span class="s">' + Number(r.score).toLocaleString() + "</span></li>";
    });
    if (!mine && res.rank) {
      html += '<li class="gap">⋯</li><li class="me"><span class="r">' + res.rank + '</span><span class="n">' + esc(res.name) + '</span><span class="s">' + Number(res.score).toLocaleString() + "</span></li>";
    }
    el.innerHTML = html;
  }
  function rankText(res) {
    var where = res.source === "global" ? "on the global board" : "on this device's board";
    if (res.rank === 1) return "#1 " + where + " — top of the table!";
    if (res.rank && res.rank <= 10) return "#" + res.rank + " " + where + " — you made the Top 10.";
    if (res.rank) return "#" + res.rank + " " + where + ".";
    return "Score saved.";
  }

  /** PA.gameOver(score, {title, kicker, unit, stats: [["Lines", 12], ...]}) — saves the score and shows the results card. */
  PA.gameOver = function (score, o) {
    if (PA.state === "over") return;
    o = o || {};
    PA.state = "over";
    syncMusic();
    overReady = false;
    var n = Math.max(0, Math.round(score || 0));
    overLayer.querySelector("#pa-over-k").textContent = o.kicker || "Game over";
    overLayer.querySelector("#pa-over-h").textContent = o.title || "Run complete";
    overLayer.querySelector("#pa-over-unit").textContent = o.unit || cfg.unit || "points";
    overLayer.querySelector("#pa-over-stats").innerHTML = (o.stats || []).map(function (s) {
      return "<li>" + esc(s[0]) + " <b>" + esc(s[1]) + "</b></li>";
    }).join("");
    overLayer.querySelector("#pa-over-best").hidden = true;
    overLayer.querySelector("#pa-over-rank").textContent = "Saving score…";
    overLayer.querySelector("#pa-over-board").innerHTML = "";
    var num = overLayer.querySelector("#pa-over-num");
    num.textContent = "0";
    setTimeout(function () {
      overLayer.hidden = false;
      var t0 = performance.now(), dur = Math.min(900, 300 + n * 2);
      (function count() {
        var k = Math.min(1, (performance.now() - t0) / dur);
        num.textContent = Math.round(n * PA.ease.outCubic(k)).toLocaleString();
        if (k < 1) raf0(count);
      })();
      setTimeout(function () { overReady = true; try { overLayer.querySelector("#pa-again").focus(); } catch (e) {} }, 650);
    }, o.delay == null ? 650 : o.delay);
    lastScore = n;
    var xpEl = overLayer.querySelector("#pa-over-xp");
    xpEl.hidden = true;
    setTimeout(function () {
      if (!W.paXP) return;
      var r = W.paXP.award(slug, { score: n });
      if (r && r.xp) { xpEl.innerHTML = "+" + r.xp + " XP · Arcade Pass level <b>" + r.level + "</b>" + (r.quest ? " · daily quest complete!" : ""); xpEl.hidden = false; }
    }, 30);
    var p = W.paReport ? W.paReport(slug, n) : null;
    if (p && p.then) p.then(function (res) {
      if (!res) return;
      if (W.paXP && res.source === "global" && res.rank && res.rank <= 10) W.paXP.badge("top10");
      lastOver = res;
      paintOverWho();
      overLayer.querySelector("#pa-over-rank").textContent = rankText(res);
      overLayer.querySelector("#pa-over-best").hidden = !res.isBest;
      paintBoard(overLayer.querySelector("#pa-over-board"), res, 5);
      if (res.isBest) setTimeout(function () { PA.sfx("power"); }, 700);
    });
    return p;
  };

  /* ---------------- ported-game niceties ---------------- */
  var toast = D.createElement("div");
  toast.id = "pa-toast";
  toast.setAttribute("aria-live", "polite");
  D.body.appendChild(toast);
  var toastT = 0;
  PA.toast = function (msg, ms) {
    toast.textContent = msg;
    toast.classList.add("on");
    clearTimeout(toastT);
    toastT = setTimeout(function () { toast.classList.remove("on"); }, ms || 3200);
  };
  W.addEventListener("pa:report", function () {
    if (native) return;
    PA.state = "over";
    syncMusic();
    PA.sfx("gameover");
  });
  W.addEventListener("pa:score", function (e) {
    if (native) return;
    var r = e.detail || {};
    PA.toast((r.isBest ? "New best! " : "Score saved · ") + (r.rank ? "#" + r.rank + (r.source === "global" ? " worldwide" : " on this device") : r.score));
  });
  if (!native && cfg.hudSfx !== false) {
    var lastVals = {}, lastBlip = 0;
    D.querySelectorAll(hudSel).forEach(function (el) {
      lastVals[el.id] = el.textContent;
      new MutationObserver(function () {
        var v = el.textContent;
        if (v === lastVals[el.id]) return;
        var a = parseFloat(String(lastVals[el.id]).replace(/[^\d.-]/g, "")) || 0;
        var b = parseFloat(String(v).replace(/[^\d.-]/g, "")) || 0;
        lastVals[el.id] = v;
        var now = performance.now();
        if (PA.state === "play" && b > a && now - lastBlip > 120) { lastBlip = now; PA.sfx("coin", { pitch: 1 + Math.min(.5, (b % 10) * .04) }); }
      }).observe(el, { childList: true, characterData: true, subtree: true });
    });
  }

  /* ---------------- Arcade Pass: XP, levels, badges, streaks, daily quest ----------------
   * Everything lives in localStorage under pa_pass_v1 and is shared with the site pages
   * (same origin), which read it for the My Arcade page. Game data (titles, quests) comes from
   * /games/play/pa-data.js, generated at build time from the catalog. */
  (function () {
    var KEY = "pa_pass_v1";
    function load() { try { return JSON.parse(localStorage.getItem(KEY) || "null") || null; } catch (e) { return null; } }
    function save(st) { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
    function blank() { return { xp: 0, runs: 0, plays: {}, best: {}, badges: {}, days: { last: null, streak: 0, best: 0 }, quests: { day: null, done: 0, total: 0 }, recent: [], first: Date.now() }; }
    function dayNum(d) { d = d || new Date(); return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5); }
    var xpFor = function (L) { return Math.round(60 * Math.pow(L - 1, 1.6)); };
    function levelOf(xp) { var L = 1; while (xpFor(L + 1) <= xp) L++; return L; }
    var BADGES = {
      "first-run": ["First Light", "Finish your first run", "✨"],
      "explorer": ["Explorer", "Play 5 different games", "🧭"],
      "completionist": ["Completionist", "Play every game in the arcade", "🏛️"],
      "streak-3": ["On a Roll", "Play 3 days in a row", "🔥"],
      "streak-7": ["Week of Light", "Play 7 days in a row", "🌟"],
      "streak-30": ["Devoted", "Play 30 days in a row", "👑"],
      "runs-50": ["Regular", "Finish 50 runs", "🎟️"],
      "runs-250": ["Arcade Rat", "Finish 250 runs", "🐀"],
      "level-10": ["High Roller", "Reach Arcade Pass level 10", "💎"],
      "quest-1": ["Quest Taker", "Complete a daily quest", "📜"],
      "quest-7": ["Questmaster", "Complete 7 daily quests", "🗺️"],
      "top10": ["Top Ten", "Make a global Top 10", "🏆"],
      "night-owl": ["Night Owl", "Finish a run between midnight and 4am", "🦉"],
      "arena-500": ["Apex Serpent", "Reach length 500 in Glowline Arena", "🐍"],
      "arena-kills": ["Cutthroat", "Cut off 5 snakes in one Glowline Arena run", "✂️"],
      "ember-5": ["Night Watch", "Survive 5 minutes in Ember Swarm", "🕯️"],
      "ember-win": ["Dawnbringer", "Defeat the Ember Wyrm", "🌅"],
      "nebula-sun": ["Stellar Forge", "Form a Sun in Nebula Drop", "☀️"],
      "nebula-hole": ["Event Horizon", "Form a Black Hole in Nebula Drop", "🕳️"],
      "word-2": ["Mind Reader", "Solve a Wordglow in two guesses", "🔮"],
      "bloom-2000": ["Full Bloom", "Score 2,000 in Block Bloom", "🌸"],
      "grid-100k": ["Storm Chaser", "Score 100,000 in Gridstorm", "⚡"],
      "delve-5": ["Dragonslayer", "Reach depth 6 in Deepdelve", "🐉"],
      "delve-10": ["Into the Abyss", "Reach depth 10 in Deepdelve", "🕳️"],
      "stack-30": ["Skyline", "Stack 30 floors in Skystack 3D", "🏙️"]
    };
    var data = null, queue = [];
    (function loadData() {
      if (W.PA_DATA) { data = W.PA_DATA; return; }
      var sc = D.createElement("script"); sc.src = "/games/play/pa-data.js"; sc.async = true;
      sc.onload = function () { data = W.PA_DATA || null; };
      D.head.appendChild(sc);
    })();
    var toastBox = null;
    function toast(html) {
      if (!toastBox) { toastBox = D.createElement("div"); toastBox.id = "pa-pass-toast"; D.body.appendChild(toastBox); }
      var el = D.createElement("div"); el.innerHTML = html; toastBox.appendChild(el);
      setTimeout(function () { el.remove(); }, 4300);
    }
    function grant(st, id, out) {
      if (!BADGES[id] || st.badges[id]) return;
      st.badges[id] = Date.now(); out.push(id);
    }
    function todaysQuest() {
      if (!data || !data.quests || !data.quests.length) return null;
      return data.quests[((dayNum() % data.quests.length) + data.quests.length) % data.quests.length];
    }
    var last = { slug: null, t: 0, stats: null };
    function award(gslug, stats) {
      stats = stats || {};
      var st = load() || blank();
      var now = Date.now(), today = dayNum(), out = [], gained = 0, questDone = false;
      var merge = last.slug === gslug && now - last.t < 4000;
      if (merge) { for (var k in last.stats) if (!(k in stats)) stats[k] = last.stats[k]; }
      var score = Math.max(0, +stats.score || 0);
      if (!merge) {
        st.runs++;
        var firstOfGame = !st.plays[gslug];
        st.plays[gslug] = (st.plays[gslug] || 0) + 1;
        gained = 10 + Math.min(40, Math.round(Math.log10(score + 1) * 6)) + (firstOfGame ? 25 : 0);
        st.dayList = (st.dayList || []).filter(function (d) { return d > today - 60; });
        if (st.dayList.indexOf(today) < 0) st.dayList.push(today);
        if (st.days.last !== today) {
          gained += 15;
          st.days.streak = st.days.last === today - 1 ? st.days.streak + 1 : 1;
          st.days.last = today;
          st.days.best = Math.max(st.days.best, st.days.streak);
        }
        st.recent = [gslug].concat(st.recent.filter(function (x) { return x !== gslug; })).slice(0, 8);
      }
      if (score > (st.best[gslug] || 0)) st.best[gslug] = score;
      // daily quest
      var q = todaysQuest();
      if (q && q.game === gslug && st.quests.day !== today) {
        var v = q.stat === "won" ? (stats.won ? 1 : 0) : +stats[q.stat] || 0;
        if (v >= q.min) { st.quests.day = today; st.quests.total++; gained += 100; questDone = true; }
      }
      // badges
      grant(st, "first-run", out);
      var played = Object.keys(st.plays).length;
      if (played >= 5) grant(st, "explorer", out);
      if (data && data.games && played >= data.games.length && data.games.every(function (g) { return st.plays[g.slug]; })) grant(st, "completionist", out);
      if (st.days.streak >= 3) grant(st, "streak-3", out);
      if (st.days.streak >= 7) grant(st, "streak-7", out);
      if (st.days.streak >= 30) grant(st, "streak-30", out);
      if (st.runs >= 50) grant(st, "runs-50", out);
      if (st.runs >= 250) grant(st, "runs-250", out);
      if (st.quests.total >= 1) grant(st, "quest-1", out);
      if (st.quests.total >= 7) grant(st, "quest-7", out);
      var hr = new Date().getHours(); if (hr < 4) grant(st, "night-owl", out);
      if (gslug === "glowline-arena") { if (score >= 500) grant(st, "arena-500", out); if ((stats.kills || 0) >= 5) grant(st, "arena-kills", out); }
      if (gslug === "ember-swarm") { if ((stats.seconds || 0) >= 300) grant(st, "ember-5", out); if (stats.won) grant(st, "ember-win", out); }
      if (gslug === "nebula-drop") { if ((stats.tier || 0) >= 8) grant(st, "nebula-sun", out); if ((stats.tier || 0) >= 10) grant(st, "nebula-hole", out); }
      if (gslug === "wordglow" && stats.won && stats.guesses <= 2) grant(st, "word-2", out);
      if (gslug === "block-bloom" && score >= 2000) grant(st, "bloom-2000", out);
      if (gslug === "gridstorm" && score >= 100000) grant(st, "grid-100k", out);
      if (gslug === "deepdelve") { if ((stats.depth || 0) >= 6) grant(st, "delve-5", out); if ((stats.depth || 0) >= 10) grant(st, "delve-10", out); }
      if (gslug === "skystack" && score >= 30) grant(st, "stack-30", out);
      var before = levelOf(st.xp);
      st.xp += gained;
      var after = levelOf(st.xp);
      if (after >= 10) grant(st, "level-10", out);
      out.forEach(function (id) { st.xp += 50; });
      after = levelOf(st.xp);
      save(st);
      var result = { xp: gained + out.length * 50, level: after, quest: questDone, badges: out };
      if (merge && last.result) { result.xp += last.result.xp; result.quest = result.quest || last.result.quest; }
      last = { slug: gslug, t: now, stats: stats, result: result };
      // toasts
      var delay = 0;
      if (questDone) { setTimeout(function () { toast("✅ Daily quest complete · <b>+100 XP</b>"); }, delay); delay += 700; }
      out.forEach(function (id) { var b = BADGES[id]; setTimeout(function () { toast(b[2] + " Badge unlocked: <b>" + b[0] + "</b>"); }, delay); delay += 700; });
      if (after > before) setTimeout(function () { toast("⬆️ Arcade Pass level <b>" + after + "</b>"); }, delay);
      if (W.parent && W.parent !== W) { try { W.parent.postMessage({ type: "pa-pass", slug: gslug }, location.origin); } catch (e) {} }
      return result;
    }
    W.paXP = {
      award: award,
      badge: function (id) { var st = load() || blank(), out = []; grant(st, id, out); if (out.length) { st.xp += 50; save(st); var b = BADGES[id]; toast(b[2] + " Badge unlocked: <b>" + b[0] + "</b>"); } },
      read: function () { return load() || blank(); },
      levelOf: levelOf, xpFor: xpFor, badges: BADGES, todaysQuest: todaysQuest, dayNum: dayNum
    };
  })();
})();
