"""Bake the Ptero Flap pterodactyl sprites.

models.html holds the procedural clay model (signed-distance shapes, ray-marched in WebGL). This
script renders every frame of the flap cycle in headless Chrome via Playwright, crops the frames to
a shared cell, packs one atlas (flap frames, the bonk frame, then small eye crops for blinks),
writes it as webp to src/play/ptero/ptero.webp and refreshes the MODEL table in
src/play/neon-flap.html.  Run from the repo root:  python3 scripts/ptero-models/bake.py
Needs Python Playwright + Pillow and a Chrome at /usr/bin/google-chrome (software GL is fine)."""
import json, base64, io, math, os, re, tempfile
from PIL import Image
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = tempfile.mkdtemp(prefix='ptero-bake-')
PF = 24   # flap frames
PP = 44   # px per model unit
CAM = dict(yaw=0.45, pitch=0.45)
ANCHOR = [0.2, 0.15, 0.0]  # model point that sits on the flyer's position in the game
OPEN, SHUT = 0.3, -0.2     # eyelid plane offsets: wide open, blink
def wing(ph):
    # phase 0 = wings fully up; downstroke to 0.5, upstroke back. The outer wing lags the arm.
    return 0.2 + 0.8 * math.cos(2 * math.pi * ph), 0.45 * math.sin(2 * math.pi * ph)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page()
    pg.on('pageerror', lambda e: print('pageerror', str(e)[:3000]))
    pg.goto('file://' + os.path.join(HERE, 'models.html')); pg.evaluate('R.init()')
    def rend(o):
        d = pg.evaluate("(o)=>R.render(o).toDataURL('image/png')", o)
        return Image.open(io.BytesIO(base64.b64decode(d.split(',')[1]))).convert('RGBA')
    def proj(o, P): return pg.evaluate("([o,P])=>R.project(o,P)", [o, P])
    base = dict(w=PP * 9, h=PP * 9, ppu=PP, cx=0.2, cy=0.4, ss=3, **CAM)
    fr, bl = [], []
    for i in range(PF):
        wv, bv = wing(i / PF)
        o = dict(base, wing=wv, bend=bv, lid=OPEN); fr.append(rend(o)); bl.append(rend(dict(o, lid=SHUT)))
        print('frame', i, flush=True)
    dead = rend(dict(base, wing=0.75, bend=-0.3, lid=OPEN, bonk=1.0))
    ax, ay = proj(base, ANCHOR)
    b.close()
allb = [im.getchannel('A').point(lambda v: 255 if v > 3 else 0).getbbox() for im in fr + [dead]]
x0 = min(q[0] for q in allb) - 2; y0 = min(q[1] for q in allb) - 2; x1 = max(q[2] for q in allb) + 2; y1 = max(q[3] for q in allb) + 2
cw, ch = x1 - x0, y1 - y0
# eye-region crop for blinks: the head never moves between frames, so a blink is a small overlay
diff = None
for a, c in zip(fr, bl):
    q = Image.frombytes('L', a.size, bytes(255 if u != v else 0 for u, v in zip(a.convert('RGB').tobytes()[0::3], c.convert('RGB').tobytes()[0::3])))
    bb = q.getbbox()
    if bb: diff = bb if diff is None else (min(diff[0], bb[0]), min(diff[1], bb[1]), max(diff[2], bb[2]), max(diff[3], bb[3]))
eb = (diff[0] - 3, diff[1] - 3, diff[2] + 3, diff[3] + 3)
ew, eh = eb[2] - eb[0], eb[3] - eb[1]
cols = 6; rows = math.ceil((PF + 1) / cols)
at = Image.new('RGBA', (cols * cw, rows * ch + eh * math.ceil(PF / cols)), (0, 0, 0, 0))
for i, im in enumerate(fr + [dead]):
    at.paste(im.crop((x0, y0, x1, y1)), ((i % cols) * cw, (i // cols) * ch))
for i, im in enumerate(bl):
    at.paste(im.crop(eb), ((i % cols) * ew, rows * ch + (i // cols) * eh))
at.save(f'{OUT}/ptero.png')
at.save(f'{ROOT}/src/play/ptero/ptero.webp', 'WEBP', quality=88, method=6, alpha_quality=90)
meta = dict(ptero=dict(frames=PF, cols=cols, cw=cw, ch=ch, ax=round(ax - x0, 2), ay=round(ay - y0, 2), ppu=PP,
                       eye=dict(x=eb[0] - x0, y=eb[1] - y0, w=ew, h=eh, top=rows * ch, cols=cols)))
game = f'{ROOT}/src/play/neon-flap.html'
s = open(game).read()
s, n = re.subn(r'  const MODEL = \{.*\};', lambda m: '  const MODEL = ' + json.dumps(meta, separators=(',', ':')) + ';', s)
assert n == 1
open(game, 'w').write(s)
print(OUT, json.dumps(meta))
