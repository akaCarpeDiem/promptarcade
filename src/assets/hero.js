/* Hero background: a single fragment shader — aurora ribbons over a neon horizon grid. */
(() => {
  const cv = document.getElementById("hero-gl");
  if (!cv) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const gl = cv.getContext("webgl", { antialias: false, alpha: true, premultipliedAlpha: false, powerPreference: "low-power" });
  if (!gl) return;
  const vs = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
  const fs = `precision highp float;
uniform vec2 R;uniform float T;uniform vec2 M;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/R;vec2 p=(gl_FragCoord.xy-.5*R)/R.y;
  p+=M*.03;
  vec3 col=vec3(.012,.012,.07);
  // stars
  vec2 sp=gl_FragCoord.xy/2.;float s=h(floor(sp));col+=step(.997,s)*vec3(.8,.85,1.)*(.5+.5*sin(T*2.+s*90.))*smoothstep(.0,.6,uv.y);
  // aurora ribbons
  for(int i=0;i<3;i++){
    float fi=float(i);
    float y=.18+fi*.11+.08*sin(p.x*1.6+T*.25+fi*2.)+.12*(fbm(vec2(p.x*1.2+T*.05,fi))-.5);
    float d=abs(p.y-y);
    float band=exp(-d*d*(140.-fi*30.))*(.55+.45*fbm(vec2(p.x*3.+T*.2,fi*7.)));
    vec3 c=fi==0.?vec3(.37,.95,1.):fi==1.?vec3(.65,.55,.98):vec3(1.,.36,.66);
    col+=c*band*.55;
  }
  // horizon grid floor
  float hz=-.18;
  if(p.y<hz){
    float z=1./(hz-p.y+.001);
    vec2 g=vec2(p.x*z,z+T*1.4);
    vec2 gf=abs(fract(g)-.5);
    float line=smoothstep(.06*z*.15+.02,0.,min(gf.x,gf.y)*1.);
    float fade=smoothstep(0.,1.2,hz-p.y)*smoothstep(10.,1.,z);
    col+=mix(vec3(.37,.95,1.),vec3(1.,.36,.66),uv.x)*line*fade*.7;
    col+=vec3(.5,.2,.6)*.15*fade;
  }
  // sun glow at the horizon
  float sd=length(vec2(p.x*.7,(p.y-hz)*1.6));
  col+=vec3(1.,.45,.6)*exp(-sd*5.)*.35+vec3(1.,.8,.4)*exp(-sd*14.)*.25;
  // vignette
  col*=smoothstep(1.25,.35,length(uv-.5));
  gl_FragColor=vec4(col,1.);
}`;
  function sh(t, s) { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; }
  const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return;
  const pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uR = gl.getUniformLocation(pr, "R"), uT = gl.getUniformLocation(pr, "T"), uM = gl.getUniformLocation(pr, "M");
  let mx = 0, my = 0, tx = 0, ty = 0, visible = true, raf = 0;
  addEventListener("pointermove", (e) => { tx = (e.clientX / innerWidth - .5) * 2; ty = (e.clientY / innerHeight - .5) * -2; }, { passive: true });
  function size() {
    const s = Math.min(1.25, devicePixelRatio || 1) * 0.75;
    cv.width = Math.max(1, Math.floor(cv.clientWidth * s)); cv.height = Math.max(1, Math.floor(cv.clientHeight * s));
    gl.viewport(0, 0, cv.width, cv.height);
  }
  addEventListener("resize", size); size();
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(loop); }).observe(cv);
  const t0 = performance.now();
  function loop(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    mx += (tx - mx) * .04; my += (ty - my) * .04;
    gl.uniform2f(uR, cv.width, cv.height); gl.uniform1f(uT, (now - t0) / 1000); gl.uniform2f(uM, mx, my);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    raf = requestAnimationFrame(loop);
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !raf) raf = requestAnimationFrame(loop); });
  raf = requestAnimationFrame(loop);
  cv.classList.add("on");
})();

/* The arcade cabinet: attract mode cycles the games on its screen with a channel-change burst.
   Each change is driven by the joystick: it pushes left, the screen flips to the next game, and
   it springs back. In between, the buttons get mashed as if someone were playing. The joystick (or the arrow
   keys while it has focus) picks a game; the buttons and the screen open it. */
(() => {
  const cab = document.querySelector("[data-cab]");
  if (!cab) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const slides = [...cab.querySelectorAll(".cab-slide")];
  const play = cab.querySelector("[data-cab-play]");
  const title = cab.querySelector("[data-cab-title]"), classic = cab.querySelector("[data-cab-classic]");
  const nEl = cab.querySelector("[data-cab-n]"), scoreEl = cab.querySelector("[data-cab-score]");
  const btns = [...cab.querySelectorAll(".cbtn")];
  const noise = cab.querySelector(".cab-static"), nx = noise.getContext("2d");
  const img = nx.createImageData(noise.width, noise.height);
  let i = 0, score = 0, paused = false, timer = 0, tuneRaf = 0;

  function burst(ms) {
    if (reduce) return;
    cab.classList.add("tuning");
    const end = performance.now() + ms;
    cancelAnimationFrame(tuneRaf);
    const frame = (now) => {
      const d = img.data;
      for (let k = 0; k < d.length; k += 4) { const v = Math.random() * 255; d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255; }
      nx.putImageData(img, 0, 0);
      if (now < end) tuneRaf = requestAnimationFrame(frame); else cab.classList.remove("tuning");
    };
    tuneRaf = requestAnimationFrame(frame);
  }

  function show(next) {
    i = (next + slides.length) % slides.length;
    burst(260);
    slides.forEach((s, k) => {
      const on = k === i;
      s.classList.toggle("on", on);
      s.tabIndex = on ? 0 : -1;
      on ? s.removeAttribute("aria-hidden") : s.setAttribute("aria-hidden", "true");
    });
    const s = slides[i];
    cab.style.setProperty("--a", s.dataset.a);
    cab.style.setProperty("--b", s.dataset.b);
    title.textContent = s.dataset.title;
    classic.textContent = s.dataset.classic ? "Twist on " + s.dataset.classic.toLowerCase() : "Arcade original";
    nEl.textContent = String(i + 1).padStart(2, "0");
    play.href = s.getAttribute("href") + "#play";
    play.setAttribute("aria-label", "Play " + s.dataset.title);
    score = 0;
  }

  const press = (b, ms = 120) => { b.classList.add("down"); setTimeout(() => b.classList.remove("down"), ms); };
  const tilt = (d, ms) => { cab.dataset.stick = d; if (ms) setTimeout(() => { if (cab.dataset.stick === d) cab.dataset.stick = ""; }, ms); };
  // left moves on to the next game (the same push attract mode makes), right goes back one
  const step = (dir) => { tilt(dir, 260); show(i + (dir === "l" ? 1 : -1)); restart(); };

  // attract mode: someone "playing" the demo
  function fidget() {
    if (!paused && !document.hidden) {
      const r = Math.random();
      if (r < 0.75) press(btns[Math.floor(Math.random() * btns.length)]);
      score += 10 * (1 + Math.floor(Math.random() * 25));
      scoreEl.textContent = String(score).padStart(6, "0");
    }
    setTimeout(fidget, 180 + Math.random() * 420);
  }
  // attract-mode advance: the stick pushes left, the game changes at full tilt, then it springs back
  function advance() {
    if (paused || document.hidden) return;
    tilt("l", 620);
    setTimeout(() => show(i + 1), 220);
  }
  function restart() { clearInterval(timer); if (!reduce) timer = setInterval(advance, 4600); }

  cab.querySelector(".cab-left").addEventListener("click", () => step("l"));
  cab.querySelector(".cab-right").addEventListener("click", () => step("r"));
  cab.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); step(e.key === "ArrowLeft" ? "l" : "r"); }
  });
  play.addEventListener("pointerdown", () => btns.slice(0, 3).forEach((b) => press(b, 200)));
  cab.addEventListener("pointerenter", () => { paused = true; });
  cab.addEventListener("pointerleave", () => { paused = false; });
  cab.addEventListener("focusin", () => { paused = true; });
  cab.addEventListener("focusout", () => { paused = false; });
  new IntersectionObserver(([e]) => { paused = !e.isIntersecting; }).observe(cab);

  restart();
  if (!reduce) setTimeout(fidget, 900);
})();

/* Marquee snake: a little attract-mode Snake playing behind the PromptArcade logo. It roams the marquee eating
   dots and growing; once it's long it works its way off an edge, then a short one slides back in and it all
   starts over. Movement is time based (cells per second, smoothly interpolated), so it runs the same at any
   refresh rate. Reduced motion gets one still frame; it stops while the tab is hidden or the cabinet is off screen. */
(() => {
  const g = document.querySelector("[data-cab-snake]");
  if (!g) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NS = "http://www.w3.org/2000/svg";
  // an 8-unit grid over the marquee panel (x 176–544, y 34–126 in the cabinet SVG); the group is clipped to the panel
  const CELL = 8, COLS = 46, ROWS = 11, X0 = 176, Y0 = 36, SPEED = 8, FOODS = 4;
  const pt = (c, r) => (X0 + (c + 0.5) * CELL).toFixed(1) + "," + (Y0 + (r + 0.5) * CELL).toFixed(1);
  const box = (c0, r0, c1, r1) => `M${pt(c0, r0)}L${pt(c1, r0)}L${pt(c1, r1)}L${pt(c0, r1)}Z`;
  const mk = (cls) => { const e = document.createElementNS(NS, "path"); e.setAttribute("class", cls); g.appendChild(e); return e; };
  const foodEl = mk("sn-food"), glowEl = mk("sn-glow"), bodyEl = mk("sn-body"), headEl = mk("sn-head");
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const inGrid = ([c, r]) => c >= 0 && c < COLS && r >= 0 && r < ROWS;
  const same = (a, b) => a[0] === b[0] && a[1] === b[1];
  const rnd = (n) => Math.floor(Math.random() * n);
  let body = [], dir = [1, 0], next = [0, 0], grow = false, pending = 0, food = [], mode = "gone", target = 24, t = 0, wait = 0, exitDir = [1, 0];

  const blocked = () => { const s = new Set(); const n = body.length - (pending > 0 ? 0 : 1); for (let k = 0; k < n; k++) s.add(body[k] + ""); return s; };
  // how much room there is from a cell (capped), so the snake doesn't coil itself into a dead end
  function room(from, occ, cap) {
    const seen = new Set([from + ""]), q = [from];
    while (q.length && seen.size < cap) {
      const [c, r] = q.shift();
      for (const [dc, dr] of DIRS) { const n = [c + dc, r + dr], k = n + ""; if (inGrid(n) && !occ.has(k) && !seen.has(k)) { seen.add(k); q.push(n); } }
    }
    return seen.size;
  }
  function addFood() {
    const occ = new Set(body.map(String)), h = body[0] || [-9, -9];
    for (let tries = 0; tries < 60 && food.length < FOODS; tries++) {
      const f = [1 + rnd(COLS - 2), 1 + rnd(ROWS - 2)];
      if (!occ.has(f + "") && !food.some((x) => same(x, f)) && Math.abs(f[0] - h[0]) + Math.abs(f[1] - h[1]) > 3) food.push(f);
    }
  }
  // a short snake slides back in from one of the side edges
  function reset() {
    const fromLeft = Math.random() < 0.5, r = 1 + rnd(ROWS - 2);
    dir = [fromLeft ? 1 : -1, 0];
    body = Array.from({ length: 4 }, (_, k) => [fromLeft ? -1 - k : COLS + k, r]);
    pending = 0; mode = "enter"; target = 30 + rnd(12); t = 0;
    addFood();
  }
  // distance from a cell to the edge it's leaving by, and the nearest edge to head for
  const toEdge = ([c, r], [dc, dr]) => dc < 0 ? c + 1 : dc > 0 ? COLS - c : dr < 0 ? r + 1 : ROWS - r;
  const edge = (h) => DIRS.reduce((a, d) => (toEdge(h, d) < toEdge(h, a) ? d : a));
  function plan() {
    const h = body[0];
    if (mode === "roam" && body.length >= target) {
      mode = "exit";
      exitDir = edge(h);
    }
    if (mode === "enter" || (mode === "exit" && !inGrid(h))) { next = [h[0] + dir[0], h[1] + dir[1]]; }
    else {
      const occ = blocked();
      let best = null, bestS = Infinity;
      for (const d of DIRS) {
        if (d[0] === -dir[0] && d[1] === -dir[1]) continue;
        const n = [h[0] + d[0], h[1] + d[1]];
        if (occ.has(n + "")) continue;
        let s = (same(d, dir) ? -0.4 : 0) + Math.random() * 0.9;
        if (mode === "roam") {
          if (!inGrid(n)) continue;
          s += food.length ? Math.min(...food.map((f) => Math.abs(f[0] - n[0]) + Math.abs(f[1] - n[1]))) : 0;
          if (room(n, occ, body.length + 2) < body.length + 2) s += 100;
        } else {
          s += toEdge(n, exitDir);
        }
        if (s < bestS) { bestS = s; best = d; }
      }
      if (!best) { if (mode === "roam") { mode = "exit"; exitDir = edge(h); } best = dir; }
      dir = best;
      next = [h[0] + dir[0], h[1] + dir[1]];
    }
    grow = pending > 0;
  }
  function commit() {
    body.unshift(next);
    if (grow) pending--; else body.pop();
    const k = food.findIndex((f) => same(f, next));
    if (k >= 0) { food.splice(k, 1); pending += 3; addFood(); }
    if (mode === "enter" && inGrid(body[0])) mode = "roam";
    if (mode === "exit" && !body.some(inGrid)) { mode = "gone"; wait = 0.9 + Math.random() * 0.6; }
  }
  function advance(dt) {
    if (mode === "gone") { wait -= dt; if (wait <= 0) { reset(); plan(); } return; }
    t += dt * SPEED;
    while (t >= 1 && mode !== "gone") { t -= 1; commit(); if (mode !== "gone") plan(); }
  }
  function draw() {
    foodEl.setAttribute("d", food.map(([c, r]) => box(c - 0.24, r - 0.24, c + 0.24, r + 0.24)).join(""));
    if (mode === "gone") { bodyEl.setAttribute("d", ""); glowEl.setAttribute("d", ""); headEl.setAttribute("d", ""); return; }
    const n = body.length, lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    const head = lerp(body[0], next, t);
    const pts = [head, ...body.slice(0, n - 1), grow ? body[n - 1] : lerp(body[n - 1], body[n - 2], t)];
    const H = 0.38;
    let d = "";
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1], b = pts[k];
      d += box(Math.min(a[0], b[0]) - H, Math.min(a[1], b[1]) - H, Math.max(a[0], b[0]) + H, Math.max(a[1], b[1]) + H);
    }
    bodyEl.setAttribute("d", d);
    glowEl.setAttribute("d", d);
    headEl.setAttribute("d", box(head[0] - 0.42, head[1] - 0.42, head[0] + 0.42, head[1] + 0.42));
  }

  // start already on the marquee and a little grown, rather than on an empty one
  reset();
  plan();
  for (let k = 0; k < 400 && (mode !== "roam" || body.length < (reduce ? 20 : 8)); k++) { commit(); plan(); }
  draw();
  if (reduce) return;

  let raf = 0, last = 0, onScreen = true;
  function frame(now) {
    raf = 0;
    if (document.hidden || !onScreen) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    advance(dt);
    draw();
    raf = requestAnimationFrame(frame);
  }
  const wake = () => { if (!raf && onScreen && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } };
  document.addEventListener("visibilitychange", wake);
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; wake(); }).observe(g.closest("[data-cab]") || g.ownerSVGElement);
  wake();
})();
