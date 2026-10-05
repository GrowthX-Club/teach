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

  // Diagrams are drawn on a canvas in a hand-sketched notebook style (see drawSketch).
  // The text version stays in the page for screen readers and copy-paste.
  var visuals = [];
  function visual(v) {
    if (!v) return "";
    var idx = visuals.push(v) - 1;
    var alt = v.type === "flow"
      ? (v.steps || []).map(function (s, i) { return (i + 1) + ". " + plain(s.label) + ": " + plain(s.detail); }).join(" ")
      : ["left", "right"].map(function (k) { var x = v[k] || {}; return plain(x.title) + ": " + (x.points || []).map(plain).join("; "); }).join(". ");
    return (
      '<figure class="sketch">' +
      '<canvas data-visual="' + idx + '" role="img" aria-label="' + esc(plain(v.title) + ". " + alt) + '"></canvas>' +
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

  // ---------- render ----------
  document.title = plain(meta.title || "Lesson") + " · GrowthX teach";
  var body = hero() + concepts.map(concept).join("") + quizSection() + nextSection() + shareSection();
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
    drawAllSketches();
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

  // ---------- hand-drawn diagrams ----------
  // A tiny Excalidraw-like renderer: wobbly double strokes, hand-written labels,
  // seeded randomness so a diagram looks the same every time it is drawn.
  function seedFrom(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function makeRng(seed) {
    return function () {
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function cssVar(name, fallback) {
    return getComputedStyle(root).getPropertyValue(name).trim() || fallback;
  }
  function roughLine(ctx, r, x1, y1, x2, y2, wobble) {
    var w = wobble == null ? 1.4 : wobble;
    for (var pass = 0; pass < 2; pass++) {
      var j = function () { return (r() - 0.5) * 2 * w; };
      ctx.beginPath();
      ctx.moveTo(x1 + j(), y1 + j());
      ctx.quadraticCurveTo((x1 + x2) / 2 + j(), (y1 + y2) / 2 + j(), x2 + j(), y2 + j());
      ctx.stroke();
    }
  }
  function roughRect(ctx, r, x, y, w, h, fill) {
    if (fill) {
      ctx.save();
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(x + 3, y + 1);
      ctx.lineTo(x + w - 2, y + 2);
      ctx.lineTo(x + w - 1, y + h - 3);
      ctx.lineTo(x + 2, y + h - 1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    roughLine(ctx, r, x, y, x + w, y);
    roughLine(ctx, r, x + w, y, x + w, y + h);
    roughLine(ctx, r, x + w, y + h, x, y + h);
    roughLine(ctx, r, x, y + h, x, y);
  }
  function roughArrow(ctx, r, x1, y1, x2, y2) {
    roughLine(ctx, r, x1, y1, x2, y2, 1);
    var a = Math.atan2(y2 - y1, x2 - x1), len = 11;
    roughLine(ctx, r, x2, y2, x2 - len * Math.cos(a - 0.45), y2 - len * Math.sin(a - 0.45), 0.6);
    roughLine(ctx, r, x2, y2, x2 - len * Math.cos(a + 0.45), y2 - len * Math.sin(a + 0.45), 0.6);
  }
  function wrapText(ctx, text, maxWidth) {
    var out = [], line = "";
    String(text).split(/\s+/).forEach(function (w) {
      var test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxWidth && line) { out.push(line); line = w; } else line = test;
    });
    if (line) out.push(line);
    return out;
  }

  function drawSketch(canvas) {
    var v = visuals[Number(canvas.getAttribute("data-visual"))];
    if (!v) return;
    var W = canvas.parentNode.clientWidth;
    if (!W) return;
    var dpr = window.devicePixelRatio || 1;
    var ctx = canvas.getContext("2d");
    var hand = cssVar("--hand", "cursive");
    var ink = cssVar("--fg", "#111"), muted = cssVar("--muted", "#777"), brand = cssVar("--brand", "#0064ff");
    var paper = cssVar("--card", "#fff"), good = cssVar("--green", "#16a34a"), bad = cssVar("--red", "#dc2626");
    var pad = 18, labelFont = "700 21px " + hand, detailFont = "500 18px " + hand, titleFont = "600 19px " + hand;
    var lineH = 22, titleH = 34;
    var boxes = [];

    // Lay out first (measuring needs the fonts set), then size the canvas, then draw.
    ctx.font = titleFont;
    if (v.type === "flow") {
      var steps = v.steps || [];
      var row = W >= 560;
      var gap = row ? 40 : 34;
      var boxW = row ? (W - pad * 2 - gap * (steps.length - 1)) / steps.length : W - pad * 2;
      var maxH = 0;
      steps.forEach(function (s) {
        ctx.font = labelFont;
        var l = wrapText(ctx, plain(s.label), boxW - 28);
        ctx.font = detailFont;
        var d = wrapText(ctx, plain(s.detail), boxW - 28);
        var h = 20 + (l.length + d.length) * lineH + 14;
        boxes.push({ l: l, d: d, h: h });
        maxH = Math.max(maxH, h);
      });
      var y = pad + titleH;
      boxes.forEach(function (b, i) {
        b.w = boxW;
        if (row) { b.x = pad + i * (boxW + gap); b.y = y; b.h = maxH; }
        else { b.x = pad; b.y = y; y += b.h + gap; }
      });
      var H = row ? pad + titleH + maxH + pad : y - gap + pad;
    } else {
      var sides = ["left", "right"].map(function (k) { return v[k] || {}; });
      var cols = W >= 520;
      var gapC = 44;
      var colW = cols ? (W - pad * 2 - gapC) / 2 : W - pad * 2;
      sides.forEach(function (s) {
        ctx.font = labelFont;
        var t = wrapText(ctx, plain(s.title), colW - 56);
        ctx.font = detailFont;
        var pts = (s.points || []).map(function (p) { return wrapText(ctx, plain(p), colW - 50); });
        var lines = pts.reduce(function (n, p) { return n + p.length; }, 0);
        boxes.push({ s: s, t: t, pts: pts, w: colW, h: 22 + t.length * lineH + 10 + lines * lineH + pts.length * 6 + 14 });
      });
      var hMax = Math.max(boxes[0].h, boxes[1].h);
      if (cols) {
        boxes[0].x = pad; boxes[1].x = pad + colW + gapC;
        boxes[0].y = boxes[1].y = pad + titleH;
        boxes[0].h = boxes[1].h = hMax;
        var H = pad + titleH + hMax + pad;
      } else {
        boxes[0].x = boxes[1].x = pad;
        boxes[0].y = pad + titleH;
        boxes[1].y = boxes[0].y + boxes[0].h + 40;
        var H = boxes[1].y + boxes[1].h + pad;
      }
    }

    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.textBaseline = "top";
    var r = makeRng(seedFrom(JSON.stringify(v)));

    ctx.fillStyle = muted;
    ctx.font = titleFont;
    ctx.fillText(plain(v.title || ""), pad, pad);

    if (v.type === "flow") {
      boxes.forEach(function (b, i) {
        ctx.strokeStyle = ink;
        ctx.lineWidth = 1.6;
        roughRect(ctx, r, b.x, b.y, b.w, b.h, paper);
        // numbered marker
        ctx.strokeStyle = brand;
        ctx.fillStyle = brand;
        ctx.beginPath();
        ctx.arc(b.x + 4, b.y + 4, 11, 0, Math.PI * 2);
        ctx.fillStyle = paper;
        ctx.fill();
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.fillStyle = brand;
        ctx.font = "700 15px " + hand;
        ctx.textAlign = "center";
        ctx.fillText(String(i + 1), b.x + 4, b.y - 4);
        ctx.textAlign = "left";
        var ty = b.y + 18;
        ctx.fillStyle = ink;
        ctx.font = labelFont;
        b.l.forEach(function (line) { ctx.fillText(line, b.x + 14, ty); ty += lineH; });
        ctx.fillStyle = muted;
        ctx.font = detailFont;
        b.d.forEach(function (line) { ctx.fillText(line, b.x + 14, ty); ty += lineH; });
        var next = boxes[i + 1];
        if (next) {
          ctx.strokeStyle = muted;
          ctx.lineWidth = 1.5;
          if (next.y === b.y) roughArrow(ctx, r, b.x + b.w + 6, b.y + b.h / 2, next.x - 6, next.y + next.h / 2);
          else roughArrow(ctx, r, b.x + 40, b.y + b.h + 5, b.x + 40, next.y - 5);
        }
      });
    } else {
      boxes.forEach(function (b, i) {
        var tone = b.s.tone === "good" ? good : b.s.tone === "bad" ? bad : ink;
        ctx.strokeStyle = tone;
        ctx.lineWidth = 1.7;
        roughRect(ctx, r, b.x, b.y, b.w, b.h, paper);
        var ty = b.y + 16;
        if (b.s.tone === "good" || b.s.tone === "bad") {
          ctx.fillStyle = tone;
          ctx.font = "700 24px " + hand;
          ctx.fillText(b.s.tone === "good" ? "✓" : "✗", b.x + 14, ty - 3);
        }
        ctx.fillStyle = tone;
        ctx.font = labelFont;
        b.t.forEach(function (line) { ctx.fillText(line, b.x + (b.s.tone && b.s.tone !== "neutral" ? 40 : 14), ty); ty += lineH; });
        ty += 10;
        ctx.font = detailFont;
        b.pts.forEach(function (lines) {
          ctx.fillStyle = muted;
          ctx.fillText("•", b.x + 16, ty);
          ctx.fillStyle = ink;
          lines.forEach(function (line) { ctx.fillText(line, b.x + 32, ty); ty += lineH; });
          ty += 6;
        });
      });
      ctx.fillStyle = muted;
      ctx.font = "700 20px " + hand;
      ctx.textAlign = "center";
      if (boxes[1].x > boxes[0].x) ctx.fillText("vs", (boxes[0].x + boxes[0].w + boxes[1].x) / 2, boxes[0].y + boxes[0].h / 2 - 10);
      else ctx.fillText("vs", W / 2, boxes[0].y + boxes[0].h + 10);
      ctx.textAlign = "left";
    }
  }
  function drawAllSketches() {
    document.querySelectorAll("canvas[data-visual]").forEach(drawSketch);
  }
  var resizeTimer;
  addEventListener("resize", function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(drawAllSketches, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawAllSketches);
  drawAllSketches();

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
