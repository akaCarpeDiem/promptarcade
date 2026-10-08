#!/usr/bin/env python3
"""Build PromptArcade pages from catalog into overlay/, then sync overlay → dist."""
from __future__ import annotations
import json, shutil
from pathlib import Path

ROOT = Path("/workspace/promptarcade-deploy")
OVERLAY = ROOT / "overlay"
DIST = ROOT / "dist"
CAT = json.loads((OVERLAY / "games" / "catalog.json").read_text())
V = "20261005pa1"

LOGO = '''<svg class="logo-mark" width="32" height="32" viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="pa-mark" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8ee9ff"/><stop offset="1" stop-color="#c4a6ff"/></linearGradient></defs><rect x="4" y="8" width="40" height="32" rx="8" fill="#0c1020" stroke="url(#pa-mark)" stroke-width="2"/><circle cx="16" cy="22" r="3.2" fill="#8ee9ff"/><circle cx="24" cy="22" r="3.2" fill="#c4a6ff"/><circle cx="32" cy="22" r="3.2" fill="#ff7eb6"/><rect x="14" y="30" width="20" height="3.5" rx="1.75" fill="#f4f1ff" opacity=".85"/></svg>'''

HEADER = f'''<header class="pa-gbar"><a class="brand" href="/">{LOGO}<span class="brand-name">PromptArcade</span></a>
<nav aria-label="Primary"><a href="/" aria-current="page">Arcade</a><a href="/#simple">Simple</a><a href="/#mid">Mid</a></nav>
<form class="pa-gsearch" role="search" action="/" method="get" onsubmit="return false"><label class="pa-visually-hidden" for="pa-game-search">Search games</label><input id="pa-game-search" name="q" type="search" placeholder="Game, genre, model" autocomplete="off"/></form></header>'''

HEADER_INNER = HEADER.replace('aria-current="page"', "")  # play/legal pages

FOOT = '''<footer class="pa-foot"><a href="/about/">About</a><a href="/terms/">Terms</a><a href="/privacy/">Privacy</a><a href="/contact/">Contact</a>
<span class="fine">Unofficial fan / indie arcade for games made through prompting — single-prompt and multi-prompt. Not affiliated with any AI lab. Contact: support@promptarcade.games</span></footer>'''

def esc(s: str) -> str:
    return (s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace('"',"&quot;"))

def card(g: dict) -> str:
    diff = g["diff"]
    return (
        f'<a class="pa-card" data-diff="{diff}" data-genre="{g["genre"]}" href="/games/{g["slug"]}/">'
        f'<img src="/games/posters/{g["slug"]}.svg?v={V}" alt="" width="640" height="400"/>'
        f'<div class="body"><div class="pa-grow"><h2>{esc(g["title"])}</h2>'
        f'<span class="diff diff-{diff}">{esc(g["label"])}</span>'
        f'<span class="model-chip">{esc(g.get("model","Grok"))}</span>'
        f'<span class="genre-chip">{esc(g["genre"])}</span></div>'
        f'<div class="prompt">{esc(g["prompt"])}</div></div></a>'
    )

def head(title: str, desc: str, canonical: str, extra: str = "") -> str:
    return f'''<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}"/>
<link rel="canonical" href="{canonical}"/>
<meta name="theme-color" content="#070b16"/>
<link rel="icon" href="/favicon.svg?v={V}" type="image/svg+xml"/>
<link rel="stylesheet" href="/assets/pa.css?v={V}"/>
{extra}
</head>'''

def build_hub():
    featured = [g for g in CAT if g.get("featured")]
    simple = [g for g in CAT if g["diff"] == "simple"]
    mid = [g for g in CAT if g["diff"] == "mid"]
    advanced = [g for g in CAT if g["diff"] == "advanced"]
    single = [g for g in CAT if g.get("shelf") == "single"]
    multi = [g for g in CAT if g.get("shelf") == "multi"]

    sections = []
    sections.append(f'<h2 class="pa-sec" data-sec="featured" id="featured">Featured <span class="pa-sec-pill">pick up and play</span></h2>')
    sections.append(f'<div class="pa-grid pa-grid-featured" data-sec="featured">{"".join(card(g) for g in featured)}</div>')

    sections.append(f'<h2 class="pa-sec" data-sec="simple" id="simple">Simple / Single Prompt <span class="pa-sec-pill">one prompt</span></h2>')
    sections.append(f'<div class="pa-grid" data-sec="simple">{"".join(card(g) for g in simple)}</div>')

    sections.append(f'<h2 class="pa-sec" data-sec="mid" id="mid">Mid <span class="pa-sec-pill">deeper loops</span></h2>')
    sections.append(f'<div class="pa-grid" data-sec="mid">{"".join(card(g) for g in mid)}</div>')

    sections.append(f'<h2 class="pa-sec" data-sec="advanced" id="advanced">Advanced <span class="pa-sec-pill">multi-prompt ready</span></h2>')
    sections.append(f'<div class="pa-grid" data-sec="advanced">{"".join(card(g) for g in advanced)}</div>')

    # Hidden "all" view still uses data-sec filtering; multi shelf note on advanced lede via hero.

    html = head(
        "PromptArcade.Games — Prompt-made arcade",
        "Play games made through prompting — single-prompt plates and multi-prompt builds. Neon arcade, high scores, no account.",
        "https://promptarcade.games/",
    ) + f'''<body class="pa-body">
{HEADER}
<main class="pa-wrap">
<div class="pa-hero">
<h1>PromptArcade</h1>
<p class="lede">A dedicated arcade for games made through prompting — single-prompt plates and multi-prompt / multi-model builds. Enter a name, hit Start, chase the board.</p>
<div class="pa-badge-row">
<span class="pa-badge">{len(CAT)} games live</span>
<span class="pa-badge">Username gate → Start</span>
<span class="pa-badge">Per-game Top 10</span>
<span class="pa-badge">Dark neon arcade</span>
</div>
</div>
<div class="pa-filters" role="toolbar" aria-label="Difficulty">
<button type="button" data-filter="featured" class="is-on">Featured</button>
<button type="button" data-filter="simple">Simple</button>
<button type="button" data-filter="mid">Mid</button>
<button type="button" data-filter="advanced">Advanced</button>
<button type="button" data-filter="all">All</button>
</div>
<div class="pa-genre" role="toolbar" aria-label="Genre">
<button type="button" data-genre="all" class="is-on">All genres</button>
<button type="button" data-genre="Platformer">Platformer</button>
<button type="button" data-genre="Racing">Racing</button>
<button type="button" data-genre="Puzzle">Puzzle</button>
<button type="button" data-genre="Arcade">Arcade</button>
</div>
{"".join(sections)}
{FOOT}
</main>
<script src="/games/plate.js?v={V}" defer></script>
</body></html>'''
    (OVERLAY / "index.html").write_text(html)
    print(f"hub: {len(CAT)} games, featured={len(featured)}, multi={len(multi)}")

def build_plate(g: dict):
    slug = g["slug"]
    d = OVERLAY / "games" / slug
    d.mkdir(parents=True, exist_ok=True)
    header = HEADER_INNER.replace(
        '<a href="/" aria-current="page">Arcade</a>' if False else "",
        "",
    )
    # rebuild header without current on Arcade for plate? Keep Arcade as home link.
    hdr = f'''<header class="pa-gbar"><a class="brand" href="/">{LOGO}<span class="brand-name">PromptArcade</span></a>
<nav aria-label="Primary"><a href="/">Arcade</a><a href="/#simple">Simple</a><a href="/#mid">Mid</a></nav>
<form class="pa-gsearch" role="search" action="/" method="get"><label class="pa-visually-hidden" for="pa-game-search">Search games</label><input id="pa-game-search" name="q" type="search" placeholder="Game, genre, model" autocomplete="off"/></form></header>'''

    shelf_note = "Multi-prompt / remake shelf." if g.get("shelf") == "multi" else "Single-prompt plate — ported from PromptShare Games."
    html = head(
        f"{g['title']} — PromptArcade",
        g["prompt"][:160],
        f"https://promptarcade.games/games/{slug}/",
        f'<meta property="og:title" content="{esc(g["title"])} — PromptArcade"/>\n<meta property="og:image" content="https://promptarcade.games/games/posters/{slug}.svg?v={V}"/>',
    ) + f'''<body class="pa-body">
{hdr}
<main class="pa-wrap">
<p class="kicker"><a href="/">Arcade</a> · {esc(g["label"])} · {esc(g["genre"])}</p>
<div class="pa-title-row"><h1>{esc(g["title"])}</h1><span class="pa-title-meta">
<span class="diff diff-{g["diff"]}">{esc(g["label"])}</span>
<span class="model-chip">{esc(g.get("model","Grok"))}</span>
<span class="genre-chip">{esc(g["genre"])}</span>
</span></div>
<p class="fine">{shelf_note} Enter a name in the gate, then Start. High scores append to this plate’s Top 10.</p>
<div class="pa-stage-row" data-game="{slug}">
<div class="frame"><iframe class="game-frame" src="/games/play/{slug}?v={V}" title="{esc(g["title"])}" loading="eager"></iframe></div>
<aside class="pa-scores" aria-label="Top 10 high scores">
<h2>Top 10</h2>
<p class="fine">Saved in this browser for now — D1 leaderboards next.</p>
<p class="pa-score-empty" id="pa-score-empty">No scores yet — be the first.</p>
<ol id="pa-board"></ol>
<label class="pa-name">Display name<input id="pa-name" maxlength="16" autocomplete="nickname" placeholder="Initials or a short name"/></label>
</aside>
</div>
<h2 class="pa-sec">Prompt</h2>
<div class="prompt">{esc(g["prompt"])}</div>
<p class="fine">Self-contained HTML + canvas. No account. No upload.</p>
{FOOT}
</main>
<script src="/games/plate.js?v={V}" defer></script>
</body></html>'''
    (d / "index.html").write_text(html)

def build_legal():
    pages = {
        "about": (
            "About — PromptArcade",
            """<h1>About</h1>
<p>PromptArcade.Games is a dedicated arcade for games made through prompting — both single-prompt playables and multi-prompt / multi-model builds.</p>
<p>It started as a home for PromptShare’s game plates, then grew into its own neon arcade with shared username gate, Start button, and per-game leaderboards.</p>
<p>Unofficial fan / indie project. Not affiliated with xAI, OpenAI, Anthropic, Google, or any other AI lab.</p>
<p>Contact: <a href="mailto:support@promptarcade.games">support@promptarcade.games</a></p>""",
        ),
        "contact": (
            "Contact — PromptArcade",
            """<h1>Contact</h1>
<p>Public contact for PromptArcade:</p>
<p><a href="mailto:support@promptarcade.games">support@promptarcade.games</a></p>
<p>We don’t use personal or Outlook addresses on this site.</p>""",
        ),
        "terms": (
            "Terms — PromptArcade",
            """<h1>Terms</h1>
<p>PromptArcade is an unofficial fan / indie arcade. Games are provided as-is for entertainment and study of prompt-made playables.</p>
<p>No accounts. Scores may be stored in your browser (localStorage) and later on shared leaderboards. Don’t submit abusive names.</p>
<p>Classic game mechanics (e.g. Tetris-like stackers) are remakes for fun — not affiliated with original rightsholders.</p>
<p>Questions: <a href="mailto:support@promptarcade.games">support@promptarcade.games</a></p>""",
        ),
        "privacy": (
            "Privacy — PromptArcade",
            """<h1>Privacy</h1>
<p>v1 stores your display name and high scores in <strong>localStorage</strong> on your device. No account system.</p>
<p>When D1 / Workers leaderboards ship, scores you submit may be stored on Cloudflare infrastructure tied to the display name you chose.</p>
<p>We don’t sell personal data. Contact: <a href="mailto:support@promptarcade.games">support@promptarcade.games</a></p>""",
        ),
    }
    for slug, (title, body) in pages.items():
        d = OVERLAY / slug
        d.mkdir(parents=True, exist_ok=True)
        hdr = f'''<header class="pa-gbar"><a class="brand" href="/">{LOGO}<span class="brand-name">PromptArcade</span></a>
<nav aria-label="Primary"><a href="/">Arcade</a><a href="/about/">About</a><a href="/contact/">Contact</a></nav></header>'''
        html = head(title, title, f"https://promptarcade.games/{slug}/") + f'''<body class="pa-body">
{hdr}
<main class="pa-wrap pa-prose">
{body}
{FOOT}
</main>
</body></html>'''
        (d / "index.html").write_text(html)

def sync_dist():
    DIST.mkdir(parents=True, exist_ok=True)
    # Copy overlay onto dist (preserve nothing special yet)
    for src in OVERLAY.rglob("*"):
        if src.is_dir():
            continue
        rel = src.relative_to(OVERLAY)
        dst = DIST / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
    print(f"synced overlay → dist ({sum(1 for _ in DIST.rglob('*') if _.is_file())} files)")

def main():
    build_hub()
    for g in CAT:
        build_plate(g)
    build_legal()
    sync_dist()
    print("build complete")

if __name__ == "__main__":
    main()
