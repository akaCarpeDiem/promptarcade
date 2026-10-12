// Tiny build-time syntax highlighter for the "read the source" pages (HTML + inline JS/CSS).
import { esc } from "./html.mjs";

const KW = new Set("const let var function return if else for while do switch case break continue new class extends import export from default try catch finally throw typeof instanceof in of this null undefined true false async await yield delete void static get set".split(" "));
const RULES = [
  ["c", /\/\*[\s\S]*?\*\//y], ["c", /<!--[\s\S]*?-->/y], ["c", /\/\/[^\n]*/y],
  ["s", /`(?:\\[\s\S]|[^`\\])*`/y], ["s", /"(?:\\.|[^"\\\n])*"/y], ["s", /'(?:\\.|[^'\\\n])*'/y],
  ["t", /<\/?[a-zA-Z][\w-]*|\/?>/y],
  ["n", /\b(?:0x[\da-fA-F]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/y],
  ["w", /[A-Za-z_$][\w$]*/y],
  ["x", /\s+/y], ["x", /[^\sA-Za-z_$\d"'`/<]+|./y]
];

export function highlight(src) {
  const toks = [];
  let i = 0;
  while (i < src.length) {
    let hit = false;
    for (const [cls, re] of RULES) {
      re.lastIndex = i;
      const m = re.exec(src);
      if (!m || !m[0].length) continue;
      let c = cls;
      if (cls === "w") c = KW.has(m[0]) ? "k" : src[i + m[0].length] === "=" && src[i - 1] === " " ? "a" : "";
      toks.push([c === "x" ? "" : c, m[0]]);
      i += m[0].length; hit = true; break;
    }
    if (!hit) { toks.push(["", src[i]]); i++; }
  }
  // split into lines, re-opening spans that cross line breaks
  const lines = [[]];
  for (const [c, text] of toks) {
    const parts = text.split("\n");
    parts.forEach((p, k) => {
      if (k > 0) lines.push([]);
      if (p) lines[lines.length - 1].push(c ? `<span class="t-${c}">${esc(p)}</span>` : esc(p));
    });
  }
  return lines.map((l) => `<span class="l">${l.join("") || " "}</span>`).join("\n");
}
