/* Score reporter: localStorage now, same wire shape as future /api/games/:slug/scores (D1). */
(function () {
  var sent = false;
  var NAME_KEY = "pa_player_name";
  var PREFIX = "pa_scores_";

  function allowAgain(e) {
    var t = e.target;
    if (!t || !t.id) return;
    if (t.id === "again" || t.id === "begin" || t.id === "restart") sent = false;
  }
  document.addEventListener("click", allowAgain, true);

  function cleanName(v) {
    return String(v || "").replace(/\s+/g, " ").trim().slice(0, 16) || "Guest";
  }
  function clampScore(score) {
    var n = Math.round(Number(score) || 0);
    if (!isFinite(n)) n = 0;
    if (n < 0) n = 0;
    if (n > 1000000) n = 1000000;
    return n;
  }
  function readLocal(slug) {
    try {
      var raw = localStorage.getItem(PREFIX + slug);
      var rows = raw ? JSON.parse(raw) : [];
      return Array.isArray(rows) ? rows : [];
    } catch (e) { return []; }
  }
  function writeLocal(slug, rows) {
    try { localStorage.setItem(PREFIX + slug, JSON.stringify(rows.slice(0, 50))); } catch (e) {}
  }
  function appendLocal(slug, name, score) {
    var rows = readLocal(slug);
    rows.push({ name: name, score: score, at: Date.now() });
    rows.sort(function (a, b) { return (b.score || 0) - (a.score || 0) || (a.at || 0) - (b.at || 0); });
    writeLocal(slug, rows);
    return rows.slice(0, 10);
  }

  function report(slug, score) {
    if (sent) return;
    var n = clampScore(score);
    sent = true;
    var name = "";
    try { name = localStorage.getItem(NAME_KEY) || ""; } catch (e) {}
    name = cleanName(name);
    var top = appendLocal(slug, name, n);

    // Prefer live API when Workers/D1 are wired; ignore failures and keep local.
    try {
      fetch("/api/games/" + encodeURIComponent(slug) + "/scores", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ score: n, name: name }),
      }).catch(function () {});
    } catch (e) {}

    try {
      if (parent && parent !== window) {
        parent.postMessage({ type: "pa-score", game: slug, score: n, top: top }, location.origin);
      }
    } catch (e) {}
  }

  window.psReport = window.paReport = report;
  window.paScores = {
    read: function (slug) {
      return readLocal(slug).slice(0, 10).map(function (r) {
        return { name: r.name, score: r.score };
      });
    },
    append: appendLocal
  };
})();
