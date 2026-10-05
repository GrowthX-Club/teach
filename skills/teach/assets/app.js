/* GrowthX teach lesson renderer. Inlined into every lesson by build.sh. */
(function () {
  "use strict";

  var REPO_URL = "https://github.com/GrowthX-Club/teach";
  var DEPTH_LABELS = { 1: "I'm new to this", 2: "I know the basics", 3: "I use it at work", 4: "I know it well" };

  var lesson;
  try {
    lesson = JSON.parse(document.getElementById("lesson-data").textContent);
  } catch (e) {
    document.getElementById("app").textContent = "This lesson's data could not be read. Rebuild it with build.sh.";
    return;
  }

  var areaNames = {};
  try {
    JSON.parse(document.getElementById("teach-catalogue").textContent).areas.forEach(function (a) { areaNames[a.id] = a.name; });
  } catch (e) {}

  var meta = lesson.meta || {};
  var concepts = lesson.concepts || [];
  var quiz = lesson.quiz || [];
  var storeKey = "teach:" + (meta.slug || "lesson");

  function load(key, fallback) {
    try {
      var v = localStorage.getItem(storeKey + ":" + key);
      return v === null ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }
  function save(key, value) {
    try {
      localStorage.setItem(storeKey + ":" + key, value);
    } catch (e) {}
  }

  // ---------- tiny DOM helpers ----------
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  // Plain text with **bold** and `code`. In titles, bold becomes the gradient accent.
  function rich(s, accent) {
    return esc(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, accent ? '<span class="grad">$1</span>' : "<strong>$1</strong>");
  }
  function plain(s) {
    return String(s || "").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1");
  }
  function paras(s) {
    return String(s || "")
      .split(/\n{2,}/)
      .map(function (p) { return "<p>" + rich(p.trim()) + "</p>"; })
      .join("");
  }
  function toast(msg) {
    var t = document.createElement("div");
    t.className = "toast";
    t.setAttribute("role", "status");
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 1800);
  }
  function copy(text, fallbackEl) {
    var done = function () { toast("Copied."); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { selectFallback(fallbackEl); });
    } else selectFallback(fallbackEl);
  }
  function selectFallback(el) {
    if (el && el.select) {
      el.focus();
      el.select();
      toast("Selected. Press Cmd+C or Ctrl+C to copy.");
    }
  }

  // ---------- sections ----------
  function topbar() {
    return (
      '<header class="topbar"><div class="wrap">' +
      '<a class="brand" href="' + REPO_URL + '" target="_blank" rel="noopener">GrowthX <span class="grad">teach</span></a>' +
      '<div class="controls">' +
      '<button type="button" class="icon-btn" id="theme-toggle" aria-label="Switch light or dark theme">◐</button>' +
      "</div></div></header>"
    );
  }

  function hero() {
    var level = meta.level || {};
    var eyebrow = [areaNames[meta.domain] || meta.domain, DEPTH_LABELS[level.depth], meta.minutes ? meta.minutes + " min" : ""]
      .filter(Boolean).map(esc).join(" · ");
    return (
      '<section class="hero" id="start" data-nav="Start">' +
      '<p class="eyebrow">' + eyebrow + "</p>" +
      "<h1>" + rich(meta.title, true) + "</h1>" +
      (lesson.hook ? '<p class="lede">' + rich(lesson.hook) + "</p>" : "") +
      (lesson.goal ? '<div class="goal"><span class="eyebrow">By the end</span><p>' + rich(lesson.goal) + "</p></div>" : "") +
      "</section>"
    );
  }

  // Every concept gets an animated figure: it plays one beat at a time when it
  // scrolls into view and loops. Anything that appears carries data-beat="k" and
  // is switched on once the player reaches beat k (see the animated figures
  // section). The same content stays in the page as plain text for screen
  // readers, and is the whole figure when motion is turned off.
  var visuals = [];
  function actorIndex(v, id) {
    var list = v.actors || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return i;
    return 0;
  }
  function stepText(v, s) {
    var actors = v.actors || [];
    if (s.at !== undefined) return plain((actors[actorIndex(v, s.at)] || {}).name) + ": " + plain(s.says);
    return plain((actors[actorIndex(v, s.from)] || {}).name) + " to " + plain((actors[actorIndex(v, s.to)] || {}).name) + ": " + plain(s.label);
  }
  function flowStage(v) {
    var steps = v.steps || [];
    return {
      beats: steps.length,
      alt: steps.map(function (s) { return plain(s.label) + ": " + plain(s.detail); }),
      html: '<ol class="af" style="--n:' + steps.length + '">' + steps.map(function (s, i) {
        return '<li data-beat="' + (i + 1) + '"><span class="af-n">' + (i + 1) + "</span><b>" + rich(s.label) + "</b><span>" + rich(s.detail) + "</span></li>";
      }).join("") + "</ol>"
    };
  }
  function compareStage(v) {
    var beat = 0, alt = [];
    var sides = ["left", "right"].map(function (k) {
      var x = v[k] || {}, pts = x.points || [], first = beat + 1;
      var tone = x.tone === "good" || x.tone === "bad" ? x.tone : "neutral";
      var items = pts.map(function (p) { beat++; return '<li data-beat="' + beat + '">' + rich(p) + "</li>"; }).join("");
      alt.push(plain(x.title) + ": " + pts.map(plain).join("; "));
      var mark = tone === "neutral" ? "" : '<i class="ac-mark" data-beat="' + beat + '">' + (tone === "good" ? "✓" : "✗") + "</i>";
      return '<div class="ac-side tone-' + tone + '" data-beat="' + first + '"><div class="ac-title"><b>' + rich(x.title) + "</b>" + mark + "</div><ul>" + items + "</ul></div>";
    });
    return { beats: beat, alt: alt, html: '<div class="ac">' + sides[0] + '<span class="ac-vs">vs</span>' + sides[1] + "</div>" };
  }
  function sequenceStage(v) {
    var actors = v.actors || [], steps = v.steps || [];
    return {
      beats: steps.length,
      alt: steps.map(function (s) { return stepText(v, s); }),
      html: '<div class="as" style="--n:' + actors.length + '">' +
        '<div class="as-actors">' + actors.map(function (a) {
          return '<div class="as-actor"><b>' + rich(a.name) + "</b>" + (a.role ? '<span class="as-role">' + rich(a.role) + "</span>" : "") + '<span class="as-state"></span></div>';
        }).join("") + "</div>" +
        '<div class="as-lane"><span class="as-msg"></span></div>' +
        '<ol class="as-log">' + steps.map(function (s, i) {
          var who = s.at !== undefined
            ? plain((actors[actorIndex(v, s.at)] || {}).name)
            : plain((actors[actorIndex(v, s.from)] || {}).name) + " → " + plain((actors[actorIndex(v, s.to)] || {}).name);
          return '<li data-beat="' + (i + 1) + '"><span class="as-who">' + esc(who) + "</span><span>" + rich(s.at !== undefined ? s.says : s.label) + "</span></li>";
        }).join("") + "</ol></div>"
    };
  }
  // Amounts side by side (time, cost, size): each bar grows to its value on its beat.
  // Tiny values keep a visible sliver so they don't vanish next to big ones.
  function barsStage(v) {
    var bars = v.bars || [];
    var max = Math.max.apply(null, bars.map(function (b) { return Number(b.value) || 0; }).concat([0])) || 1;
    return {
      beats: bars.length,
      alt: bars.map(function (b) { return plain(b.label) + ": " + plain(b.display); }),
      html: '<ol class="ab">' + bars.map(function (b, i) {
        var pct = Math.max(1.5, (Number(b.value) || 0) / max * 100);
        var tone = b.tone === "good" || b.tone === "bad" ? b.tone : "neutral";
        return '<li data-beat="' + (i + 1) + '" class="tone-' + tone + '" style="--w:' + pct.toFixed(2) + '%">' +
          '<div class="ab-text"><b>' + rich(b.label) + '</b><span>' + rich(b.display) + "</span></div>" +
          '<div class="ab-track"><span class="ab-fill"></span></div></li>';
      }).join("") + "</ol>"
    };
  }

  function visual(v) {
    if (!v) return "";
    var stage = v.type === "sequence" ? sequenceStage(v) : v.type === "compare" ? compareStage(v) : v.type === "bars" ? barsStage(v) : flowStage(v);
    var idx = visuals.push({ v: v, beats: stage.beats }) - 1;
    return (
      '<figure class="anim" data-anim="' + idx + '" data-type="' + esc(v.type) + '">' +
      '<div class="anim-head"><strong>' + rich(v.title) + "</strong>" +
      '<button class="anim-btn" type="button" hidden>Pause</button></div>' +
      '<div class="anim-stage" aria-hidden="true">' + stage.html + "</div>" +
      '<ol class="anim-alt">' + stage.alt.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ol>" +
      (v.caption ? "<figcaption>" + rich(v.caption) + "</figcaption>" : "") +
      "</figure>"
    );
  }

  // A bespoke animation, designed for this one concept by the animator agent.
  // It runs inside a sandboxed frame: scripts only, no network (CSP), no access
  // to this page, its storage or cookies. The frame gets the lesson's colours.
  var bespokes = [];
  function bespoke(a) {
    var idx = bespokes.push(a) - 1;
    var h = Math.min(440, Math.max(180, Number(a.height) || 300));
    return (
      '<figure class="anim bespoke">' +
      '<div class="anim-head"><strong>' + rich(a.title) + "</strong></div>" +
      '<div class="bespoke-frame" style="height:' + h + 'px"><iframe data-bespoke="' + idx + '" sandbox="allow-scripts" title="' + esc(plain(a.title)) + '" aria-describedby="bespoke-alt-' + idx + '"></iframe></div>' +
      '<p class="sr-only" id="bespoke-alt-' + idx + '">' + esc(a.alt) + "</p>" +
      (a.caption ? "<figcaption>" + rich(a.caption) + "</figcaption>" : "") +
      "</figure>"
    );
  }

  function concept(c) {
    return (
      '<section class="block" id="c-' + esc(c.id) + '" data-nav="' + esc(plain(c.name)) + '">' +
      (c.story ? '<div class="story prose">' + paras(c.story) + "</div>" : "") +
      '<div class="sec-head"><h2>' + rich(c.name) + "</h2></div>" +
      '<div class="analogy"><span class="eyebrow">Analogy</span><div class="prose">' + paras(c.explain) + "</div></div>" +
      (c.animation ? bespoke(c.animation) : visual(c.visual)) +
      (c.real_world ? '<div class="sub"><h3>In the real world</h3><div class="prose">' + paras(c.real_world) + "</div></div>" : "") +
      (c.in_your_work && c.in_your_work.text ? '<div class="sub"><h3>In your work</h3><div class="prose">' + paras(c.in_your_work.text) + "</div></div>" : "") +
      (c.fun_fact
        ? '<aside class="fact" aria-label="Did you know?">' +
          '<svg class="fact-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '<div><span class="fact-label">Did you know?</span><div class="prose">' + paras(c.fun_fact) + "</div></div></aside>"
        : "") +
      "</section>"
    );
  }

  function quizSection() {
    if (!quiz.length) return "";
    var qs = quiz.map(function (q, qi) {
      var opts = (q.options || []).map(function (o, oi) {
        return '<button type="button" class="option" data-q="' + qi + '" data-o="' + oi + '"><span>' + rich(o.text) + '</span><span class="why" hidden>' + rich(o.why) + "</span></button>";
      }).join("");
      return '<div class="question" id="q-' + qi + '"><span class="eyebrow">Question ' + (qi + 1) + " of " + quiz.length + "</span><h3>" + rich(q.question) + '</h3><div class="options">' + opts + "</div></div>";
    }).join("");
    return (
      '<section class="block" id="quiz" data-nav="Quiz">' +
      '<div class="sec-head"><span class="sec-num">Quiz</span><h2>Check yourself</h2></div>' +
      '<p class="score" id="score" aria-live="polite">0 of ' + quiz.length + " answered</p>" +
      qs +
      '<div class="quiz-done" id="quiz-done" hidden></div>' +
      "</section>"
    );
  }

  function nextSection() {
    var next = lesson.next || [];
    if (!next.length) return "";
    return (
      '<section class="block" id="next" data-nav="Keep going">' +
      '<div class="sec-head"><span class="sec-num">Next</span><h2>Keep going</h2></div>' +
      '<p class="lede">Paste one of these into your coding agent.</p>' +
      '<div class="next-list">' + next.map(function (n, i) {
        return '<div class="next-item"><div><b>' + rich(n.title) + "</b><code>" + esc(n.prompt) + '</code></div><button type="button" class="btn" data-copy-next="' + i + '">Copy prompt</button></div>';
      }).join("") + "</div></section>"
    );
  }

  function videosSection() {
    var videos = (lesson.videos || []).filter(function (v) { return v && v.url && v.title; });
    if (!videos.length) return "";
    var names = {};
    concepts.forEach(function (c) { names[c.id] = plain(c.name); });
    return (
      '<section class="block" id="watch" data-nav="Watch">' +
      '<div class="sec-head"><span class="sec-num">Annex</span><h2>Prefer watching?</h2></div>' +
      '<p class="lede">Each video opens at the exact moment that explains the idea.</p>' +
      '<ol class="videos">' + videos.map(function (v) {
        var safe = /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(v.url) ? v.url : "#";
        return (
          "<li>" +
          '<a class="video-link" href="' + esc(safe) + '" target="_blank" rel="noopener">' +
          '<span class="video-start">▶ ' + esc(v.start) + "</span>" +
          '<span class="video-title">' + esc(v.title) + "</span></a>" +
          '<span class="video-meta">' + esc([v.channel, names[v.concept_id]].filter(Boolean).join(" · ")) + "</span>" +
          (v.why ? '<p class="video-why">' + rich(v.why) + "</p>" : "") +
          "</li>"
        );
      }).join("") + "</ol></section>"
    );
  }

  function shareSection() {
    var s = lesson.share || {};
    if (!s.linkedin && !s.x) return "";
    return (
      '<section class="block" id="share" data-nav="Share">' +
      '<div class="sec-head"><span class="sec-num">Share</span><h2>Tell people what you learned</h2></div>' +
      '<div class="share-grid">' +
      '<div class="share-card"><span class="eyebrow">LinkedIn</span><textarea id="share-li" aria-label="LinkedIn post">' + esc(s.linkedin) + "</textarea>" +
      '<div class="btn-row"><button type="button" class="btn" data-copy="share-li">Copy</button><a class="btn" id="open-li" target="_blank" rel="noopener">Open LinkedIn</a></div></div>' +
      '<div class="share-card"><span class="eyebrow">X</span><textarea id="share-x" aria-label="X post">' + esc(s.x) + "</textarea>" +
      '<span class="count" id="x-count"></span>' +
      '<div class="btn-row"><button type="button" class="btn" data-copy="share-x">Copy</button><a class="btn" id="open-x" target="_blank" rel="noopener">Post on X</a></div></div>' +
      "</div>" +

      "</section>"
    );
  }

  function footer() {
    var created = meta.created ? "Made " + esc(meta.created) + " · " : "";
    return (
      '<footer class="site"><div class="wrap">' +
      '<a class="watermark" href="' + REPO_URL + '" target="_blank" rel="noopener">Built using GrowthX <span class="grad">teach</span></a>' +
      "<span>" + created + "Generated and stored on your computer</span>" +
      "</div></footer>"
    );
  }

  // External links always open in a new tab, even in browsers that ignore target="_blank".
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var url;
    try { url = new URL(a.getAttribute("href"), location.href); } catch (err) { return; }
    if (!/^https?:$/.test(url.protocol) || url.origin === location.origin) return;
    var win = window.open(url.href, "_blank");
    if (win) {
      win.opener = null;
      e.preventDefault();
    }
  });

  // ---------- render ----------
  document.title = plain(meta.title || "Lesson") + " · GrowthX teach";
  var body = hero() + concepts.map(concept).join("") + quizSection() + nextSection() + videosSection() + shareSection();
  document.getElementById("app").innerHTML =
    topbar() +
    '<div class="layout wrap"><nav class="sidebar" id="sidebar" aria-label="Lesson sections"></nav><main class="content">' + body + "</main></div>" +
    footer();

  // ---------- sidebar ----------
  var sections = Array.prototype.slice.call(document.querySelectorAll("[data-nav]"));
  var conceptCount = 0;
  document.getElementById("sidebar").innerHTML =
    '<span class="eyebrow side-title">In this lesson</span><ol>' +
    sections.map(function (sec) {
      var isConcept = sec.id.indexOf("c-") === 0;
      var mark = isConcept ? String(++conceptCount) : "";
      return '<li><a href="#' + sec.id + '" data-target="' + sec.id + '"><span class="tick" aria-hidden="true">' + mark + "</span><span>" + esc(sec.getAttribute("data-nav")) + "</span></a></li>";
    }).join("") +
    "</ol>";
  var links = {};
  document.querySelectorAll("#sidebar a").forEach(function (a) { links[a.getAttribute("data-target")] = a; });
  // Keep the sidebar just below the top bar, whose height changes when it wraps on phones.
  function measureTopbar() {
    var top = document.querySelector(".topbar");
    if (top) document.documentElement.style.setProperty("--topbar-h", top.offsetHeight + "px");
  }
  measureTopbar();
  addEventListener("resize", measureTopbar);

  function updateSidebar() {
    var line = innerHeight * 0.35;
    var current = sections[0];
    sections.forEach(function (sec) {
      if (sec.getBoundingClientRect().top <= line) current = sec;
    });
    var passed = true;
    sections.forEach(function (sec) {
      var a = links[sec.id];
      if (sec === current) passed = false;
      a.classList.toggle("active", sec === current);
      a.classList.toggle("done", passed);
      if (sec === current) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    var active = links[current.id];
    var bar = document.getElementById("sidebar");
    if (active && bar.scrollWidth > bar.clientWidth) {
      bar.scrollLeft = active.offsetLeft - bar.clientWidth / 2 + active.clientWidth / 2;
    }
  }

  // ---------- theme ----------
  var root = document.documentElement;
  var savedTheme = load("theme", "");
  if (savedTheme) root.setAttribute("data-theme", savedTheme);
  document.getElementById("theme-toggle").addEventListener("click", function () {
    var current = root.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    var next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    save("theme", next);
    loadBespokes();
  });

  // ---------- quiz ----------
  var answers = {};
  function updateScore() {
    var answered = Object.keys(answers).length;
    var correct = Object.keys(answers).filter(function (k) { return answers[k]; }).length;
    var score = document.getElementById("score");
    if (score) score.textContent = answered + " of " + quiz.length + " answered · " + correct + " correct";
    var done = document.getElementById("quiz-done");
    if (done && answered === quiz.length) {
      var msg =
        correct === quiz.length ? "All " + correct + " right. You've got this." :
        correct >= Math.ceil(quiz.length / 2) ? correct + " of " + quiz.length + " right. Reread the concepts you missed, then try again." :
        correct + " of " + quiz.length + " right. Worth another pass through the lesson.";
      done.innerHTML = '<h3 class="serif" style="font-size:26px">' + esc(msg) + '</h3><div class="btn-row"><button type="button" class="btn" id="quiz-retry">Try again</button><a class="btn" href="#share">Share what you learned</a></div>';
      done.hidden = false;
      document.getElementById("quiz-retry").addEventListener("click", resetQuiz);
    }
  }
  function resetQuiz() {
    answers = {};
    document.querySelectorAll(".option").forEach(function (b) {
      b.disabled = false;
      b.classList.remove("right", "wrong", "dim");
      b.querySelector(".why").hidden = true;
    });
    document.getElementById("quiz-done").hidden = true;
    updateScore();
    document.getElementById("q-0").scrollIntoView();
  }
  document.querySelectorAll(".option").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var qi = Number(btn.getAttribute("data-q"));
      var oi = Number(btn.getAttribute("data-o"));
      var q = quiz[qi];
      var buttons = document.querySelectorAll('.option[data-q="' + qi + '"]');
      buttons.forEach(function (b, i) {
        b.disabled = true;
        var isRight = q.options[i].correct === true;
        if (isRight) b.classList.add("right");
        else if (i === oi) b.classList.add("wrong");
        else b.classList.add("dim");
        if (isRight || i === oi) b.querySelector(".why").hidden = false;
      });
      answers[qi] = q.options[oi].correct === true;
      updateScore();
    });
  });

  // ---------- next + share ----------
  document.querySelectorAll("[data-copy-next]").forEach(function (b) {
    b.addEventListener("click", function () {
      copy(lesson.next[Number(b.getAttribute("data-copy-next"))].prompt, null);
    });
  });
  document.querySelectorAll("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var el = document.getElementById(b.getAttribute("data-copy"));
      copy(el.value, el);
    });
  });
  var xBox = document.getElementById("share-x");
  var liBox = document.getElementById("share-li");
  function updateShareLinks() {
    if (xBox) {
      document.getElementById("x-count").textContent = xBox.value.length + " / 280";
      document.getElementById("open-x").href = "https://x.com/intent/post?text=" + encodeURIComponent(xBox.value);
    }
    if (liBox) {
      document.getElementById("open-li").href = "https://www.linkedin.com/feed/?shareActive=true&text=" + encodeURIComponent(liBox.value);
    }
  }
  if (xBox) xBox.addEventListener("input", updateShareLinks);
  if (liBox) liBox.addEventListener("input", updateShareLinks);
  updateShareLinks();

  // ---------- bespoke animations ----------
  var THEME_VARS = ["--bg", "--bg-2", "--fg", "--muted", "--card", "--card-2", "--hairline", "--hairline-2", "--glass", "--glass-2", "--brand", "--brand-fg", "--green", "--green-bg", "--red", "--red-bg", "--amber", "--amber-bg", "--violet", "--sans", "--mono"];
  function loadBespokes() {
    var cs = getComputedStyle(root);
    var vars = THEME_VARS.map(function (n) { return n + ":" + cs.getPropertyValue(n).trim(); }).join(";");
    var dark = (root.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")) === "dark";
    var close = "<" + "/script>";
    document.querySelectorAll("iframe[data-bespoke]").forEach(function (f) {
      var a = bespokes[Number(f.getAttribute("data-bespoke"))] || {};
      f.srcdoc =
        '<!doctype html><html><head><meta charset="utf-8">' +
        '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; script-src \'unsafe-inline\'; img-src data:">' +
        "<style>:root{" + vars + ";color-scheme:" + (dark ? "dark" : "light") + "}" +
        "html,body{margin:0;height:100%;overflow:hidden;background:transparent;color:var(--fg);font-family:var(--sans)}</style>" +
        "<style>" + String(a.css || "") + "</style></head><body>" + String(a.html || "") +
        "<script>" + String(a.js || "") + close + "</body></html>";
    });
  }
  loadBespokes();

  // ---------- animated figures ----------
  // One player per figure. Beat 0 is the empty stage; beat k switches on every
  // element with data-beat <= k and marks data-beat == k as "now". After the
  // last beat the figure holds, then starts again. It only runs while the
  // figure is on screen, and never when the reader asked for reduced motion:
  // then the finished picture is shown, still.
  var BEAT_MS = 1700, START_MS = 700, END_MS = 3200, ARRIVE_MS = 900;
  var reducedMotion = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  function renderSequence(fig, v, i, still) {
    var actors = fig.querySelectorAll(".as-actor");
    var msg = fig.querySelector(".as-msg");
    var steps = v.steps || [];
    var says = [];
    for (var k = 0; k < i && k < steps.length; k++) if (steps[k].at !== undefined) says[actorIndex(v, steps[k].at)] = steps[k].says;
    Array.prototype.forEach.call(actors, function (el, a) {
      var state = el.querySelector(".as-state");
      state.innerHTML = says[a] ? rich(says[a]) : "";
      el.classList.remove("now", "recv");
    });
    clearTimeout(fig._arrive);
    var step = steps[i - 1];
    if (!step || still) { msg.classList.remove("show"); return; }
    if (step.at !== undefined) {
      msg.classList.remove("show");
      actors[actorIndex(v, step.at)].classList.add("now");
      return;
    }
    var from = actorIndex(v, step.from), to = actorIndex(v, step.to);
    msg.innerHTML = (to < from ? "← " : "") + rich(step.label) + (to < from ? "" : " →");
    msg.style.transition = "none";
    msg.style.setProperty("--at", from);
    msg.classList.add("show");
    actors[from].classList.add("now");
    void msg.offsetWidth; // start the trip from the sender, not from wherever the last message stopped
    msg.style.transition = "";
    msg.style.setProperty("--at", to);
    fig._arrive = setTimeout(function () {
      actors[from].classList.remove("now");
      actors[to].classList.add("recv");
    }, ARRIVE_MS);
  }

  function renderBeat(fig, entry, i, still) {
    Array.prototype.forEach.call(fig.querySelectorAll("[data-beat]"), function (el) {
      var k = Number(el.getAttribute("data-beat"));
      el.classList.toggle("on", k <= i);
      el.classList.toggle("now", !still && k === i);
    });
    if (entry.v.type === "sequence") renderSequence(fig, entry.v, i, still);
  }

  function startFigure(fig) {
    var entry = visuals[Number(fig.getAttribute("data-anim"))];
    if (!entry) return;
    var n = entry.beats;
    if (reducedMotion || !n) { fig.classList.add("still"); renderBeat(fig, entry, n, true); return; }

    var i = 0, timer = null, inView = false, paused = false;
    var btn = fig.querySelector(".anim-btn");
    function schedule() {
      clearTimeout(timer);
      if (!inView || paused) return;
      timer = setTimeout(function () {
        i = i >= n ? 0 : i + 1;
        renderBeat(fig, entry, i, false);
        schedule();
      }, i === 0 ? START_MS : i === n ? END_MS : BEAT_MS);
    }
    btn.hidden = false;
    btn.addEventListener("click", function () {
      paused = !paused;
      btn.textContent = paused ? "Play" : "Pause";
      schedule();
    });
    renderBeat(fig, entry, 0, false);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (items) {
        inView = items[items.length - 1].isIntersecting;
        schedule();
      }, { threshold: 0.35 }).observe(fig);
    } else { inView = true; schedule(); }
  }
  Array.prototype.forEach.call(document.querySelectorAll("figure.anim"), startFigure);

  // ---------- jargon tooltips ----------
  // Underline the first use of each glossary term per section; hover, focus or tap shows the tip.
  (function applyGlossary() {
    var glossary = (lesson.glossary || []).filter(function (g) { return g && g.term && g.tip; })
      .sort(function (a, b) { return b.term.length - a.term.length; });
    if (!glossary.length) return;
    var reEsc = function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); };
    var scopes = document.querySelectorAll(".hero, section.block[id^='c-']");
    scopes.forEach(function (scope) {
      var used = {};
      var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          var p = n.parentElement;
          if (!p || p.closest("h1, h2, h3, .eyebrow, .term, code, pre, button, figure")) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      var nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(function (node) {
        glossary.forEach(function (g) {
          var key = g.term.toLowerCase();
          if (used[key] || !node.parentNode) return;
          var m = new RegExp("\\b" + reEsc(g.term) + "\\b", "i").exec(node.nodeValue);
          if (!m) return;
          used[key] = true;
          var after = node.splitText(m.index);
          var rest = after.splitText(m[0].length);
          var span = document.createElement("span");
          span.className = "term";
          span.tabIndex = 0;
          span.setAttribute("data-tip", g.tip);
          span.setAttribute("aria-label", m[0] + ": " + g.tip);
          span.textContent = m[0];
          after.parentNode.replaceChild(span, after);
          node = rest;
        });
      });
    });

    var tip = document.createElement("div");
    tip.className = "term-tip";
    tip.setAttribute("role", "tooltip");
    tip.hidden = true;
    document.body.appendChild(tip);
    var current = null;
    function show(el) {
      current = el;
      tip.textContent = el.getAttribute("data-tip");
      tip.hidden = false;
      var r = el.getBoundingClientRect();
      var w = tip.offsetWidth, h = tip.offsetHeight;
      var left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8);
      var top = r.top - h - 10 < 8 ? r.bottom + 10 : r.top - h - 10;
      tip.style.left = left + "px";
      tip.style.top = top + "px";
    }
    function hide() { current = null; tip.hidden = true; }
    document.querySelectorAll(".term").forEach(function (el) {
      el.addEventListener("mouseenter", function () { show(el); });
      el.addEventListener("mouseleave", hide);
      el.addEventListener("focus", function () { show(el); });
      el.addEventListener("blur", hide);
      el.addEventListener("click", function (e) { e.stopPropagation(); current === el ? hide() : show(el); });
      el.addEventListener("mouseenter", function () { seenHint("terms"); });
      el.addEventListener("click", function () { seenHint("terms"); });
    });
    document.addEventListener("click", hide);
    addEventListener("scroll", function () { if (current) show(current); }, { passive: true });
  })();

  // ---------- one-time hints ----------
  // Each hint shows once per browser (remembered when storage is available).
  function hintSeen(name) {
    try { return localStorage.getItem("teach:hint:" + name) === "1"; } catch (e) { return !!hintSeen.mem[name]; }
  }
  hintSeen.mem = {};
  function seenHint(name) {
    hintSeen.mem[name] = true;
    try { localStorage.setItem("teach:hint:" + name, "1"); } catch (e) {}
    var open = document.querySelector('.coach[data-hint="' + name + '"]');
    if (open) open.remove();
  }
  function showCoach(name, html, anchor, opts) {
    opts = opts || {};
    if (hintSeen(name) || document.querySelector(".coach")) return false;
    var c = document.createElement("div");
    c.className = "coach" + (opts.big ? " big" : "");
    c.setAttribute("role", "status");
    c.setAttribute("data-hint", name);
    c.innerHTML = (opts.demo ? '<div class="coach-demo" aria-hidden="true"><span class="cd-line"><span class="cd-sel">select any text</span> in the lesson</span><span class="cd-pill">Ask about this</span></div>' : "") +
      "<div>" + html + '</div><button type="button">Got it</button>';
    c.querySelector("button").addEventListener("click", function () { seenHint(name); setTimeout(maybeAskHint, 400); });
    document.body.appendChild(c);
    function place() {
      if (!c.isConnected) return;
      if (opts.corner) { c.classList.add("corner"); c.style.right = "20px"; c.style.bottom = "92px"; return; }
      var r = anchor.getBoundingClientRect(), w = c.offsetWidth, h = c.offsetHeight;
      var left = Math.min(Math.max(12, r.left + r.width / 2 - 24), innerWidth - w - 12);
      var below = r.bottom + h + 14 < innerHeight;
      c.classList.toggle("below", below);
      c.classList.toggle("above", !below);
      c.style.left = left + "px";
      c.style.top = (below ? r.bottom + 10 : r.top - h - 10) + "px";
      c.style.setProperty("--arrow-x", Math.max(12, Math.min(w - 24, r.left + r.width / 2 - left - 6)) + "px");
    }
    place();
    addEventListener("scroll", place, { passive: true });
    addEventListener("resize", place);
    return true;
  }

  // Hint 1: the highlighted words, when the first one scrolls into view.
  var firstTerm = document.querySelector(".content .term");
  if (firstTerm && !hintSeen("terms") && "IntersectionObserver" in window) {
    var termWatch = new IntersectionObserver(function (items) {
      if (items[0].isIntersecting) {
        termWatch.disconnect();
        showCoach("terms", "<b>Highlighted words</b> have a quick, plain explanation. Hover or tap one to see it.", firstTerm);
      }
    }, { threshold: 1, rootMargin: "0px 0px -30% 0px" });
    termWatch.observe(firstTerm);
  }
  // Hint 2: the tutor, once the reader is into the first concept and hint 1 is done.
  function maybeAskHint() {
    if (hintSeen("ask") || (firstTerm && !hintSeen("terms"))) return;
    var firstConcept = document.querySelector("section.block[id^='c-']");
    if (firstConcept && firstConcept.getBoundingClientRect().top < innerHeight * 0.5) {
      if (showCoach("ask", "<b>Stuck on something?</b> Select any text and tap <b>Ask about this</b>, or open the tutor below. You get a plain-words answer right here.", null, { corner: true, big: true, demo: true })) {
        fab.classList.add("pulse");
      }
    }
  }
  addEventListener("scroll", maybeAskHint, { passive: true });

  // ---------- lesson tutor (chat) ----------
  // With the teach lesson server (http://localhost) questions are answered right
  // here by Claude Code on this computer. Opened as a plain file, the same panel
  // copies the question so it can be pasted into the Claude chat instead.
  var lessonDir = (location.pathname.match(/\/lessons\/([a-z0-9-]+)\//) || [])[1] || "";
  var chatLive = false;
  var thread = [];
  var pendingQuote = null;
  var waiting = false;
  var localKey = storeKey + ":questions";

  var fab = document.createElement("button");
  fab.type = "button";
  fab.className = "tutor-fab";
  fab.setAttribute("aria-label", "Ask the lesson tutor");
  fab.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.4c-.5.4-1.3 0-1.3-.6V16A2.5 2.5 0 0 1 4 13.5z" fill="currentColor"/><circle cx="8.5" cy="9.5" r="1.2" fill="var(--brand)"/><circle cx="12" cy="9.5" r="1.2" fill="var(--brand)"/><circle cx="15.5" cy="9.5" r="1.2" fill="var(--brand)"/></svg><span class="tutor-dot" hidden></span>';
  document.body.appendChild(fab);

  var panel = document.createElement("section");
  panel.className = "tutor";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Lesson tutor");
  panel.innerHTML =
    '<header class="tutor-head"><div class="tutor-avatar" aria-hidden="true">t</div>' +
    '<div class="tutor-title"><b>Lesson tutor</b><span id="tutor-status">Answers in plain words</span></div>' +
    '<button type="button" class="tutor-x" aria-label="Close">×</button></header>' +
    '<div class="tutor-body" id="tutor-body" aria-live="polite"></div>' +
    '<div class="tutor-quote" hidden><span class="tq-label">Asking about</span><q></q><button type="button" aria-label="Remove passage">×</button></div>' +
    '<form class="tutor-form"><label class="sr-only" for="tutor-input">Your question</label>' +
    '<textarea id="tutor-input" rows="1" placeholder="Ask anything about this lesson…"></textarea>' +
    '<button type="submit" class="tutor-send" aria-label="Send"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l15-7-5 16-2.5-6.5z" fill="currentColor"/></svg></button></form>' +
    '<p class="tutor-foot" id="tutor-foot"></p>';
  document.body.appendChild(panel);
  var body = panel.querySelector("#tutor-body");
  var input = panel.querySelector("#tutor-input");
  var quoteBox = panel.querySelector(".tutor-quote");

  function md(s) {
    var blocks = String(s || "").trim().split(/\n{2,}/);
    var bullet = /^\s*([-*•]|\d+\.)\s+/;
    return blocks.map(function (b) {
      // Group consecutive bullet lines into a list and other lines into a paragraph.
      var out = "", para = [], items = [];
      function flush() {
        if (para.length) out += "<p>" + rich(para.join(" ")) + "</p>";
        if (items.length) out += "<ul>" + items.map(function (l) { return "<li>" + rich(l) + "</li>"; }).join("") + "</ul>";
        para = []; items = [];
      }
      b.split("\n").forEach(function (l) {
        if (bullet.test(l)) { if (para.length) flush(); items.push(l.replace(bullet, "")); }
        else { if (items.length) flush(); para.push(l); }
      });
      flush();
      return out;
    }).join("");
  }
  function scrollBottom() { body.scrollTop = body.scrollHeight; }
  function renderEmpty() {
    if (thread.length) return;
    body.innerHTML =
      '<div class="tutor-hello"><p><b>Hi!</b> Ask me anything about this lesson and I\'ll explain it in plain words.</p>' +
      '<p class="tutor-tip">Tip: select any text in the lesson and tap <b>Ask about this</b>.</p>' +
      '<div class="tutor-chips">' + ["Explain the main idea more simply", "Give me another real-life example", "How does this connect to my work?"].map(function (t) {
        return '<button type="button" class="tutor-chip">' + esc(t) + "</button>";
      }).join("") + "</div></div>";
    body.querySelectorAll(".tutor-chip").forEach(function (b) { b.addEventListener("click", function () { send(b.textContent); }); });
  }
  function addTurn(q, answerHtml, opts) {
    opts = opts || {};
    var hello = body.querySelector(".tutor-hello");
    if (hello) hello.remove();
    var wrap = document.createElement("div");
    wrap.className = "tutor-turn";
    if (q.id) wrap.setAttribute("data-q", q.id);
    wrap.innerHTML =
      (q.quote ? '<div class="tutor-cite"><q>' + esc(q.quote.length > 180 ? q.quote.slice(0, 180) + "…" : q.quote) + "</q>" +
        (q.sectionId ? '<a href="#' + esc(q.sectionId) + '" class="tutor-jump">Show in lesson</a>' : "") + "</div>" : "") +
      '<div class="bubble me">' + esc(q.question) + "</div>" +
      '<div class="bubble bot">' + (answerHtml || '<span class="typing"><i></i><i></i><i></i></span>') + "</div>";
    body.appendChild(wrap);
    var jump = wrap.querySelector(".tutor-jump");
    if (jump) jump.addEventListener("click", function (e) {
      e.preventDefault();
      var m = document.querySelector('mark.asked[data-q="' + q.id + '"]') || document.getElementById(q.sectionId);
      if (m) { m.scrollIntoView({ block: "center" }); if (m.classList) { m.classList.add("flash"); setTimeout(function () { m.classList.remove("flash"); }, 1600); } }
      if (innerWidth < 640) closePanel();
    });
    if (!opts.quiet) scrollBottom();
    return wrap;
  }
  function openPanel() {
    panel.hidden = false;
    fab.classList.add("open");
    fab.classList.remove("pulse");
    fab.querySelector(".tutor-dot").hidden = true;
    seenHint("ask");
    renderEmpty();
    setTimeout(function () { input.focus(); scrollBottom(); }, 30);
  }
  function closePanel() { panel.hidden = true; fab.classList.remove("open"); }
  fab.addEventListener("click", function () { panel.hidden ? openPanel() : closePanel(); });
  panel.querySelector(".tutor-x").addEventListener("click", closePanel);
  panel.addEventListener("keydown", function (e) { if (e.key === "Escape") closePanel(); });

  function setQuote(p) {
    pendingQuote = p;
    quoteBox.hidden = !p;
    if (p) quoteBox.querySelector("q").textContent = p.text.length > 160 ? p.text.slice(0, 160) + "…" : p.text;
  }
  quoteBox.querySelector("button").addEventListener("click", function () { setQuote(null); });

  function api(method, url, data) {
    return fetch(url, { method: method, headers: { "Content-Type": "application/json", "X-Teach": "1" }, body: data ? JSON.stringify(data) : undefined })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || "Something went wrong."); return j; }); });
  }
  function saveLocal() { try { localStorage.setItem(localKey, JSON.stringify(thread)); } catch (e) {} }

  function send(text) {
    var question = String(text || "").trim();
    if (!question || waiting) return;
    var p = pendingQuote;
    var q = { question: question, quote: p ? p.text : "", section: p ? p.section : "", sectionId: p ? p.sectionId : "" };
    input.value = "";
    autosize();
    setQuote(null);
    if (!chatLive) {
      var prompt = 'Question about my GrowthX teach lesson "' + plain(meta.title || "") + '"' + (q.section ? " (section: " + q.section + ")" : "") + "\n\n" +
        (q.quote ? "About this part:\n> " + q.quote + "\n\n" : "") + "My question: " + question;
      q.id = "l" + Date.now().toString(36);
      thread.push(q);
      saveLocal();
      if (p) markPassage(p, q.id);
      addTurn(q, "<p>I can't answer inside the page when it's opened as a file. Your question is copied: paste it into your Claude chat and teach will explain it there.</p>");
      copy(prompt, null);
      return;
    }
    waiting = true;
    var turn = addTurn(q, null);
    var history = thread.slice(-3).reduce(function (h, t) { return h.concat([{ role: "user", text: t.question }, { role: "assistant", text: t.answer || "" }]); }, []);
    api("POST", "/api/ask", { lesson: lessonDir, question: question, quote: q.quote, section: q.section, sectionId: q.sectionId, history: history })
      .then(function (entry) {
        thread.push(entry);
        turn.setAttribute("data-q", entry.id);
        turn.querySelector(".bubble.bot").innerHTML = md(entry.answer);
        if (p) markPassage(p, entry.id);
        if (panel.hidden) fab.querySelector(".tutor-dot").hidden = false;
      })
      .catch(function (err) { turn.querySelector(".bubble.bot").innerHTML = '<p class="tutor-err">' + esc(err.message) + "</p>"; })
      .then(function () { waiting = false; scrollBottom(); });
  }
  function autosize() { input.style.height = "auto"; input.style.height = Math.min(140, input.scrollHeight) + "px"; }
  input.addEventListener("input", autosize);
  input.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input.value); } });
  panel.querySelector(".tutor-form").addEventListener("submit", function (e) { e.preventDefault(); send(input.value); });

  // ---------- asked passages stay marked ----------
  function textNodesIn(root) {
    var out = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) { return n.parentElement && n.parentElement.closest("figure, button, .term-tip, script, style") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
    });
    while (w.nextNode()) out.push(w.currentNode);
    return out;
  }
  // Find the quote inside its section (whitespace-insensitive) and wrap each piece in <mark>.
  function markText(section, quote, id) {
    if (!section || !quote || document.querySelector('mark.asked[data-q="' + id + '"]')) return;
    var nodes = textNodesIn(section), flat = "", map = [];
    nodes.forEach(function (n, ni) {
      for (var i = 0; i < n.nodeValue.length; i++) {
        var ch = n.nodeValue[i];
        if (/\s/.test(ch)) { if (flat.slice(-1) === " ") continue; ch = " "; }
        flat += ch;
        map.push([ni, i]);
      }
    });
    var target = quote.replace(/…$/, "").replace(/\s+/g, " ").trim();
    var at = flat.indexOf(target);
    if (at < 0) return;
    var end = at + target.length - 1, pieces = {};
    for (var k = at; k <= end; k++) {
      var m = map[k];
      pieces[m[0]] = pieces[m[0]] || [m[1], m[1]];
      pieces[m[0]][1] = m[1];
    }
    Object.keys(pieces).sort(function (a, b) { return b - a; }).forEach(function (ni) {
      var n = nodes[ni], r = pieces[ni];
      var mid = n.splitText(r[0]);
      mid.splitText(r[1] - r[0] + 1);
      var mark = document.createElement("mark");
      mark.className = "asked";
      mark.setAttribute("data-q", id);
      mark.title = "You asked about this. Click to see the answer.";
      mid.parentNode.replaceChild(mark, mid);
      mark.appendChild(mid);
      mark.addEventListener("click", function () { openThreadAt(id); });
    });
  }
  function markPassage(p, id) {
    window.getSelection && window.getSelection().removeAllRanges();
    markText(document.getElementById(p.sectionId) || document.querySelector(".content"), p.text, id);
  }
  function openThreadAt(id) {
    openPanel();
    var t = body.querySelector('.tutor-turn[data-q="' + id + '"]');
    if (t) { t.scrollIntoView({ block: "start" }); t.classList.add("flash"); setTimeout(function () { t.classList.remove("flash"); }, 1600); }
  }
  function restore(list) {
    thread = list || [];
    body.innerHTML = "";
    thread.forEach(function (q) {
      addTurn(q, q.answer ? md(q.answer) : "<p>Copied to paste into your Claude chat.</p>", { quiet: true });
      if (q.quote) markText(document.getElementById(q.sectionId) || document.querySelector(".content"), q.quote, q.id);
    });
    renderEmpty();
  }

  // Server or file? Load saved questions either way.
  var foot = panel.querySelector("#tutor-foot");
  if (/^https?:$/.test(location.protocol) && lessonDir) {
    fetch("/api/health").then(function (r) { return r.json(); }).then(function (h) {
      chatLive = !!(h && h.teach && h.chat);
      foot.textContent = chatLive ? "Answered by Claude on your computer, using this lesson." : "The tutor needs Claude Code installed. Questions are copied for your Claude chat instead.";
      return chatLive ? api("GET", "/api/questions?lesson=" + encodeURIComponent(lessonDir)).then(function (r) { restore(r.questions); }) : restore(loadLocal());
    }).catch(function () { foot.textContent = "Questions are copied for your Claude chat."; restore(loadLocal()); });
  } else {
    foot.textContent = "Opened as a file: questions are copied for your Claude chat.";
    restore(loadLocal());
  }
  function loadLocal() { try { return JSON.parse(localStorage.getItem(localKey) || "[]"); } catch (e) { return []; } }

  // ---------- select text → ask ----------
  var pop = document.createElement("div");
  pop.className = "ask-pop";
  pop.hidden = true;
  pop.innerHTML = '<button type="button" data-act="ask"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.4c-.5.4-1.3 0-1.3-.6V16A2.5 2.5 0 0 1 4 13.5z" fill="currentColor"/></svg>Ask about this</button><button type="button" data-act="simple">Explain simply</button>';
  document.body.appendChild(pop);
  var picked = null;
  function selectionInLesson() {
    var sel = window.getSelection && window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    var text = sel.toString().replace(/\s+/g, " ").trim();
    if (text.length < 3) return null;
    var node = sel.getRangeAt(0).commonAncestorContainer;
    var el = node.nodeType === 1 ? node : node.parentElement;
    if (!el || !el.closest(".content") || el.closest("textarea, input, button, .options, figure, .tutor")) return null;
    var section = el.closest("[data-nav]");
    return {
      text: text.length > 600 ? text.slice(0, 600) + "…" : text,
      section: section ? section.getAttribute("data-nav") : "",
      sectionId: section ? section.id : "",
      rect: sel.getRangeAt(0).getBoundingClientRect()
    };
  }
  function updatePop() {
    picked = selectionInLesson();
    if (!picked) { pop.hidden = true; return; }
    pop.hidden = false;
    var w = pop.offsetWidth, h = pop.offsetHeight;
    var left = Math.min(Math.max(8, picked.rect.left + picked.rect.width / 2 - w / 2), innerWidth - w - 8);
    var top = picked.rect.top - h - 12;
    pop.classList.toggle("below", top < 64);
    if (top < 64) top = picked.rect.bottom + 12;
    pop.style.left = left + scrollX + "px";
    pop.style.top = top + scrollY + "px";
  }
  document.addEventListener("mouseup", function () { setTimeout(updatePop, 0); });
  document.addEventListener("keyup", function (e) { if (e.shiftKey) updatePop(); });
  document.addEventListener("selectionchange", function () { clearTimeout(updatePop.t); updatePop.t = setTimeout(updatePop, 350); });
  pop.addEventListener("mousedown", function (e) { e.preventDefault(); });
  pop.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b || !picked) return;
    var p = picked;
    pop.hidden = true;
    seenHint("ask");
    openPanel();
    setQuote(p);
    if (b.getAttribute("data-act") === "simple") send("Can you explain this part more simply?");
    else input.focus();
  });

  // ---------- reading progress ----------
  var bar = document.getElementById("progress");
  function onScroll() {
    var max = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = (max > 0 ? Math.min(100, (scrollY / max) * 100) : 100) + "%";
    updateSidebar();
  }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
