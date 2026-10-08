(function () {
  document.querySelectorAll(".phrase").forEach(function (phrase) {
    var btn = phrase.querySelector(".phrase-btn");
    var tip = phrase.querySelector(".tip-card");
    if (!btn || !tip) return;
    function open() { tip.hidden = false; phrase.classList.add("is-open"); btn.setAttribute("aria-expanded", "true"); }
    function close() { tip.hidden = true; phrase.classList.remove("is-open"); btn.setAttribute("aria-expanded", "false"); }
    phrase.addEventListener("pointerenter", function (e) { if (!e.pointerType || e.pointerType === "mouse") open(); });
    phrase.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") close(); });
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (tip.hidden) open(); else close();
    });
    btn.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        if (tip.hidden) open(); else close();
      } else if (e.key === "Escape") { close(); }
    });
  });

  function applyFilter(f, push) {
    document.querySelectorAll("[data-filter]").forEach(function (b) {
      b.classList.toggle("is-on", b.getAttribute("data-filter") === f);
    });
    var genreOn = document.querySelector("[data-genre].is-on");
    var genre = genreOn ? genreOn.getAttribute("data-genre") : "all";
    document.querySelectorAll("[data-diff]").forEach(function (el) {
      var hasFeaturedSec = !!document.querySelector('[data-sec="featured"]');
      var showDiff = f === "featured"
        ? (hasFeaturedSec ? !!el.closest('[data-sec="featured"]') : true)
        : f === "all"
          ? true
          : el.getAttribute("data-diff") === f;
      var g = el.getAttribute("data-genre") || "";
      var showGenre = genre === "all" || g === genre;
      el.hidden = !(showDiff && showGenre);
    });
    document.querySelectorAll("[data-sec]").forEach(function (sec) {
      if (f === "all") {
        sec.hidden = false;
        return;
      }
      sec.hidden = sec.getAttribute("data-sec") !== f;
    });
    if (push && window.history && window.history.replaceState) {
      var url = new URL(location.href);
      if (f === "featured") url.searchParams.delete("diff");
      else url.searchParams.set("diff", f);
      if (genre === "all") url.searchParams.delete("genre");
      else url.searchParams.set("genre", genre);
      history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
  }

  var gameSearch = document.getElementById("pa-game-search");
  if (gameSearch) {
    gameSearch.addEventListener("input", function () {
      var query = String(gameSearch.value || "").trim().toLowerCase();
      document.querySelectorAll("[data-diff]").forEach(function (card) {
        var haystack = (card.textContent || "").toLowerCase();
        card.hidden = !!query && haystack.indexOf(query) < 0;
      });
      document.querySelectorAll("[data-sec]").forEach(function (section) {
        var cards = section.querySelectorAll("[data-diff]");
        var any = Array.prototype.some.call(cards, function (card) { return !card.hidden; });
        section.hidden = !!query && !any;
      });
    });
  }

  document.querySelectorAll("[data-filter]").forEach(function (btn) {
    btn.addEventListener("click", function () { applyFilter(btn.getAttribute("data-filter"), true); });
  });
  document.querySelectorAll("[data-genre]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll("[data-genre]").forEach(function (b) {
        b.classList.toggle("is-on", b === btn);
      });
      var fBtn = document.querySelector("[data-filter].is-on");
      applyFilter(fBtn ? fBtn.getAttribute("data-filter") : "featured", true);
    });
  });

  var params = new URLSearchParams(location.search);
  var initial = params.get("diff");
  if (initial !== "simple" && initial !== "mid" && initial !== "advanced" && initial !== "all") initial = "featured";
  var g0 = params.get("genre") || "all";
  document.querySelectorAll("[data-genre]").forEach(function (b) {
    b.classList.toggle("is-on", b.getAttribute("data-genre") === g0);
  });
  applyFilter(initial, false);

  var NAME_KEY = "pa_player_name";
  var nameInput = document.getElementById("pa-name");
  if (nameInput) {
    try { nameInput.value = localStorage.getItem(NAME_KEY) || ""; } catch (e) {}
    nameInput.addEventListener("change", function () {
      var v = nameInput.value.replace(/\s+/g, " ").trim().slice(0, 16);
      nameInput.value = v;
      try { localStorage.setItem(NAME_KEY, v); } catch (e) {}
    });
  }

  window.addEventListener("message", function (ev) {
    if (ev.origin !== location.origin) return;
    var d = ev.data || {};
    if ((d.type === "pa-name" || d.type === "ps-name") && nameInput) {
      nameInput.value = String(d.name || "").slice(0, 16);
    }
  });

  var board = document.querySelector("[data-game]");
  function paintBoard(rows) {
    var list = document.getElementById("pa-board");
    var empty = document.getElementById("pa-score-empty");
    if (!list) return;
    list.innerHTML = "";
    var items = rows || [];
    if (empty) empty.hidden = items.length > 0;
    items.forEach(function (row, i) {
      var li = document.createElement("li");
      var rk = document.createElement("span");
      rk.className = "rk";
      rk.textContent = String(i + 1);
      var nm = document.createElement("span");
      nm.className = "nm";
      nm.textContent = row.name || "Guest";
      var sc = document.createElement("span");
      sc.className = "sc";
      sc.textContent = String(row.score);
      li.appendChild(rk);
      li.appendChild(nm);
      li.appendChild(sc);
      list.appendChild(li);
    });
  }
  function readLocal(id) {
    try {
      var raw = localStorage.getItem("pa_scores_" + id);
      var rows = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(rows)) return [];
      return rows.slice(0, 10).map(function (r) { return { name: r.name, score: r.score }; });
    } catch (e) { return []; }
  }
  function loadBoard() {
    if (!board) return;
    var id = board.getAttribute("data-game");
    if (!id) return;
    // Paint local immediately; upgrade from API if present.
    paintBoard(readLocal(id));
    fetch("/api/games/" + encodeURIComponent(id) + "/scores", { credentials: "same-origin" })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (data) { paintBoard((data && data.top) || []); })
      .catch(function () { /* local already painted */ });
  }
  loadBoard();
  window.addEventListener("message", function (ev) {
    if (ev.origin !== location.origin) return;
    var d = ev.data || {};
    if ((d.type === "pa-score" || d.type === "ps-score") && board && d.game === board.getAttribute("data-game")) {
      if (d.top && d.top.length) paintBoard(d.top);
      else loadBoard();
    }
  });
})();
