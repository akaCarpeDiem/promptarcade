"""Bake the Ptero Flap character sprites.

models.html holds the procedural clay models (signed-distance shapes, ray-marched in WebGL). This
script renders every frame in headless Chrome via Playwright, crops the frames to a shared cell,
packs the atlases, writes them as webp to src/play/ptero/ and refreshes the MODEL table in
src/play/neon-flap.html.  Run from the repo root:  python3 scripts/ptero-models/bake.py
Needs Python Playwright + Pillow and a Chrome at /usr/bin/google-chrome (software GL is fine)."""
import json, base64, io, math, sys
from PIL import Image
from playwright.sync_api import sync_playwright
import os, re, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = tempfile.mkdtemp(prefix='ptero-bake-')
PF = 24
PP = 40  # ptero px per model unit
BP = 90  # bronto px per unit
PCAM = dict(yaw=0.45, pitch=0.5); BCAM = dict(yaw=-0.4, pitch=0.18)
def wing(ph): return 0.2 + 0.8 * math.cos(2 * math.pi * ph), 0.4 * math.sin(2 * math.pi * ph)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg = b.new_page()
    pg.on('pageerror', lambda e: print('pageerror', str(e)[:3000]))
    pg.goto('file://' + os.path.join(HERE, 'models.html')); pg.evaluate('R.init()')
    def rend(o):
        d = pg.evaluate("(o)=>R.render(o).toDataURL('image/png')", o)
        return Image.open(io.BytesIO(base64.b64decode(d.split(',')[1]))).convert('RGBA')
    def proj(o, P): return pg.evaluate("([o,P])=>R.project(o,P)", [o, P])
    meta = {}
    # ---- pterodactyl ----
    base = dict(w=PP * 9, h=PP * 10, ppu=PP, cx=0.0, cy=0.3, char=0, ss=3, **PCAM)
    fr, bl = [], []
    for i in range(PF):
        ph = i / PF; wv, bv = wing(ph)
        o = dict(base, wing=wv, bend=bv, lid=0.06); fr.append(rend(o))
        bl.append(rend(dict(o, lid=-0.2)))
        print('ptero', i, flush=True)
    dead = rend(dict(base, wing=0.75, bend=-0.25, lid=0.22, bonk=1.0))
    allb = [im.getchannel('A').point(lambda v: 255 if v > 3 else 0).getbbox() for im in fr + [dead]]
    x0 = min(q[0] for q in allb) - 2; y0 = min(q[1] for q in allb) - 2; x1 = max(q[2] for q in allb) + 2; y1 = max(q[3] for q in allb) + 2
    cw, ch = x1 - x0, y1 - y0
    ax, ay = proj(base, [0, 0, 0])
    # eye-region crop for blinks (the head does not move between frames)
    ex0, ey0 = proj(base, [1.3, 1.45, 0.4]); ex1, ey1 = proj(base, [1.75, 0.85, -0.4])
    eb = [int(min(ex0, ex1)) - 12, int(min(ey0, ey1)) - 8, int(max(ex0, ex1)) + 12, int(max(ey0, ey1)) + 6]
    ew, eh = eb[2] - eb[0], eb[3] - eb[1]
    cols = 6; rows = math.ceil((PF + 1) / cols)
    at = Image.new('RGBA', (cols * cw, rows * ch + eh * math.ceil(PF / cols)), (0, 0, 0, 0))
    for i, im in enumerate(fr + [dead]):
        at.paste(im.crop((x0, y0, x1, y1)), ((i % cols) * cw, (i // cols) * ch))
    for i, im in enumerate(bl):
        at.paste(im.crop(tuple(eb)), ((i % cols) * ew, rows * ch + (i // cols) * eh))
    at.save(f'{OUT}/ptero.png')
    meta['ptero'] = dict(frames=PF, cols=cols, cw=cw, ch=ch, ax=round(ax - x0, 2), ay=round(ay - y0, 2), ppu=PP,
                         eye=dict(x=eb[0] - x0, y=eb[1] - y0, w=ew, h=eh, top=rows * ch, cols=cols))
    # ---- brontosaurus body walk ----
    BF = 12
    bb = dict(w=BP * 5, h=BP * 3, ppu=BP, cx=0.45, cy=1.15, char=1, ss=3, **BCAM)
    bfr = []
    for i in range(BF):
        bfr.append(rend(dict(bb, phase=i / BF))); print('bronto', i, flush=True)
    allb = [im.getchannel('A').point(lambda v: 255 if v > 3 else 0).getbbox() for im in bfr]
    x0 = min(q[0] for q in allb) - 2; y0 = min(q[1] for q in allb) - 2; x1 = max(q[2] for q in allb) + 2; y1 = max(q[3] for q in allb) + 2
    cw, ch = x1 - x0, y1 - y0
    cols = 4
    at = Image.new('RGBA', (cols * cw, math.ceil(BF / cols) * ch), (0, 0, 0, 0))
    for i, im in enumerate(bfr): at.paste(im.crop((x0, y0, x1, y1)), ((i % cols) * cw, (i // cols) * ch))
    at.save(f'{OUT}/bronto.png')
    stubs = []
    for i in range(BF):
        bob = abs(math.sin(2 * math.pi * i / BF)) * 0.07
        sx, sy = proj(bb, [-0.78, 2.19 + bob - 0.25, 0]); stubs.append(round(sy - y0, 2))
    sx, _ = proj(bb, [-0.78, 2.0, 0]); gx, gy = proj(bb, [0, 0, 0])
    meta['bronto'] = dict(frames=BF, cols=cols, cw=cw, ch=ch, sx=round(sx - x0, 2), sy=stubs, gy=round(gy - y0, 2), ppu=BP)
    # ---- neck strip: a seamless tile of an endless tapered-free tube ----
    period = 1 / 2.6; L = period * 12
    nk = dict(w=int(BP * 1.2), h=int(BP * (L + 2)), ppu=BP, cx=0.0, cy=L / 2, char=2, neckL=L + 6, ss=3, **BCAM)
    im = rend(dict(nk, neckL=L + 8))
    # the tube runs y = 0 .. neckL; rows for y in [L/2 - L/2 ... ] -> take the exact window y in [period*3, period*3 + L)
    # use world y window centred so the crop has no caps
    ya = proj(nk, [0, 0.0, 0])[1]; ybt = proj(nk, [0, L, 0])[1]
    a = im.getchannel('A').getbbox()
    strip = im.crop((a[0] - 1, int(round(ybt)), a[2] + 1, int(round(ya))))
    strip.save(f'{OUT}/neck.png')
    nx = proj(nk, [0, 1, 0])[0] - (a[0] - 1)
    meta['neck'] = dict(w=strip.width, h=strip.height, cx=round(nx, 2), ppu=BP)
    # ---- head (open, blink) with a short neck piece that fades out at the bottom ----
    hd = dict(w=int(BP * 2.2), h=int(BP * 2.6), ppu=BP, cx=-0.15, cy=-0.25, char=3, ss=3, fade=0.0, **BCAM)
    h1 = rend(dict(hd, lid=0.06, fade=0.05)); h2 = rend(dict(hd, lid=-0.22, fade=0.05))
    a = h1.getchannel('A').point(lambda v: 255 if v > 3 else 0).getbbox(); a = (a[0] - 2, a[1] - 2, a[2] + 2, a[3] + 2)
    hw, hh = a[2] - a[0], a[3] - a[1]
    at = Image.new('RGBA', (hw * 2, hh), (0, 0, 0, 0)); at.paste(h1.crop(a), (0, 0)); at.paste(h2.crop(a), (hw, 0))
    at.save(f'{OUT}/head.png')
    hx, hy = proj(hd, [0, 0, 0]); nx2, _ = proj(hd, [0.2, -1.0, 0])
    meta['head'] = dict(cw=hw, ch=hh, ax=round(hx - a[0], 2), ay=round(hy - a[1], 2), nx=round(nx2 - a[0], 2), ppu=BP)
    b.close()
ROOT = os.path.dirname(os.path.dirname(HERE))
for f in ['ptero', 'bronto', 'neck', 'head']:
    Image.open(f'{OUT}/{f}.png').save(f'{ROOT}/src/play/ptero/{f}.webp', 'WEBP', quality=88, method=6, alpha_quality=90)
game = f'{ROOT}/src/play/neon-flap.html'
s = open(game).read()
s, n = re.subn(r'  const MODEL = \{.*\};', lambda m: '  const MODEL = ' + json.dumps(meta, separators=(',', ':')) + ';', s)
assert n == 1
open(game, 'w').write(s)
print(json.dumps(meta))
