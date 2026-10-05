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

  function concept(c) {
    var mistakes = (c.pitfalls || []).filter(Boolean);
    return (
      '<section class="block" id="c-' + esc(c.id) + '" data-nav="' + esc(plain(c.name)) + '">' +
      (c.story ? '<div class="story prose">' + paras(c.story) + "</div>" : "") +
      '<div class="sec-head"><h2>' + rich(c.name) + "</h2></div>" +
      '<div class="analogy"><span class="eyebrow">Analogy</span><div class="prose">' + paras(c.explain) + "</div></div>" +
      visual(c.visual) +
      (c.real_world ? '<div class="sub"><h3>In the real world</h3><div class="prose">' + paras(c.real_world) + "</div></div>" : "") +
      (c.in_your_work && c.in_your_work.text ? '<div class="sub"><h3>In your work</h3><div class="prose">' + paras(c.in_your_work.text) + "</div></div>" : "") +
      (c.fun_fact ? '<div class="sub did-you-know"><h3>Did you know?</h3><div class="prose">' + paras(c.fun_fact) + "</div></div>" : "") +
      (mistakes.length ? '<div class="sub"><h3>Common mistakes</h3><ul class="mistakes">' + mistakes.map(function (m) { return "<li>" + rich(m) + "</li>"; }).join("") + "</ul></div>" : "") +
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
    });
    document.addEventListener("click", hide);
    addEventListener("scroll", function () { if (current) show(current); }, { passive: true });
  })();

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
