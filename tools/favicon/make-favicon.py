"""Build src/static/favicon.ico from the vector icons (run from the repo root: python3 tools/favicon/make-favicon.py).
16 px uses the pixel-aligned tools/favicon/favicon-16.svg; 32/48/64/256 render src/static/favicon.svg directly (CairoSVG)."""
import io, cairosvg
from PIL import Image
def r(src, s): return Image.open(io.BytesIO(cairosvg.svg2png(url=src, output_width=s, output_height=s))).convert("RGBA")
imgs = [r("tools/favicon/favicon-16.svg", 16)] + [r("src/static/favicon.svg", s) for s in (32, 48, 64, 256)]
imgs[-1].save("src/static/favicon.ico", sizes=[(i.width, i.height) for i in imgs], append_images=imgs[:-1])
