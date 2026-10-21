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
