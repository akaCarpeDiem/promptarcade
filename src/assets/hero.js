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
