/* GrowthX teach lesson renderer. Inlined into every lesson by build.sh. */
(function () {
  "use strict";

  var REPO_URL = "https://github.com/GrowthX-Club/teach";
  var DEPTH_LABELS = { 1: "New to this", 2: "Knows the basics", 3: "Builds with it", 4: "Goes deep" };
  var KIND_LABELS = { everyday: "Everyday", industry: "In the industry" };
  var LENSES = [
    ["product", "Product"],
    ["balanced", "Balanced"],
    ["tech", "Tech"]
  ];

  var lesson;
  try {
    lesson = JSON.parse(document.getElementById("lesson-data").textContent);
  } catch (e) {
    document.getElementById("app").textContent = "This lesson's data could not be read. Rebuild it with build.sh.";
    return;
  }

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
    var lensButtons = LENSES.map(function (l) {
      return '<button type="button" data-lens="' + l[0] + '">' + l[1] + "</button>";
    }).join("");
    return (
      '<header class="topbar"><div class="wrap">' +
      '<a class="brand" href="' + REPO_URL + '" target="_blank" rel="noopener">GrowthX <span class="grad">teach</span></a>' +
      '<div class="controls">' +
      '<div class="seg" role="group" aria-label="Lesson focus">' + lensButtons + "</div>" +
      '<button type="button" class="icon-btn" id="theme-toggle" aria-label="Switch light or dark theme">◐</button>' +
      "</div></div></header>"
    );
  }

  function hero() {
    var level = meta.level || {};
    var eyebrow = [meta.domain, DEPTH_LABELS[level.depth], meta.minutes ? meta.minutes + " min" : ""]
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

  function visual(v) {
    if (!v) return "";
    var body = "";
    if (v.type === "flow") {
      body = '<ol class="flow">' + (v.steps || []).map(function (s) {
        return "<li><b>" + rich(s.label) + "</b><span>" + rich(s.detail) + "</span></li>";
      }).join("") + "</ol>";
    } else if (v.type === "compare") {
      body = '<div class="compare">' + ["left", "right"].map(function (side) {
        var s = v[side] || {};
        return "<div><b>" + rich(s.title) + "</b><ul>" + (s.points || []).map(function (p) {
          return "<li>" + rich(p) + "</li>";
        }).join("") + "</ul></div>";
      }).join("") + "</div>";
    }
    return '<div class="visual">' + (v.title ? '<span class="eyebrow">' + esc(v.title) + "</span>" : "") + body + "</div>";
  }

  function concept(c, i) {
    var examples = (c.examples || []).map(function (e) {
      return (
        '<article class="example">' +
        '<span class="chip">' + esc(KIND_LABELS[e.kind] || e.kind) + "</span>" +
        "<h4>" + rich(e.title) + "</h4><p>" + rich(e.text) + "</p></article>"
      );
    }).join("");
    var code = c.code
      ? '<div class="code-wrap" data-hide-lens="product">' +
        (c.code.caption ? '<span class="eyebrow">' + esc(c.code.caption) + "</span>" : "") +
        '<pre class="code"><code>' + esc(c.code.text) + "</code></pre></div>"
      : "";
    return (
      '<section class="block" id="c-' + esc(c.id) + '" data-nav="' + esc(plain(c.name)) + '">' +
      '<div class="sec-head"><span class="sec-num">' + String(i + 1).padStart(2, "0") + "</span><h2>" + rich(c.name) + "</h2></div>" +
      '<p class="tagline">' + rich(c.tagline) + "</p>" +
      '<div class="prose">' + paras(c.explain) + "</div>" +
      '<div class="lens-blocks">' +
      '<div class="lens-card" data-lens-block="product"><span class="eyebrow">Why it matters</span>' + paras(c.product) + "</div>" +
      '<div class="lens-card" data-lens-block="tech"><span class="eyebrow">How it works</span>' + paras(c.tech) + "</div>" +
      "</div>" +
      visual(c.visual) +
      '<div class="examples">' + examples + "</div>" +
      code +
      (c.in_your_work && c.in_your_work.text ? '<div class="in-work"><span class="eyebrow">In your work</span><p>' + rich(c.in_your_work.text) + "</p></div>" : "") +
      (c.pitfall ? '<div class="callout"><span class="eyebrow">Common mistake</span><p>' + rich(c.pitfall) + "</p></div>" : "") +
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
      '<div class="share-image"><span class="eyebrow">Share image · 1200 × 630</span><canvas id="share-canvas" width="1200" height="630" role="img" aria-label="Share image for this lesson"></canvas>' +
      '<div class="btn-row"><button type="button" class="btn primary" id="download-image">Download image</button></div></div>' +
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
    drawShareImage();
  });

  // ---------- lens ----------
  function setLens(lens) {
    document.querySelectorAll("[data-lens]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lens") === lens));
    });
    document.querySelectorAll(".lens-blocks").forEach(function (box) {
      var shown = 0;
      box.querySelectorAll("[data-lens-block]").forEach(function (el) {
        var on = lens === "balanced" || el.getAttribute("data-lens-block") === lens;
        el.hidden = !on;
        if (on) shown++;
      });
      box.setAttribute("data-count", String(shown));
    });
    document.querySelectorAll("[data-hide-lens]").forEach(function (el) {
      el.hidden = el.getAttribute("data-hide-lens") === lens;
    });
    save("lens", lens);
  }
  document.querySelectorAll("[data-lens]").forEach(function (b) {
    b.addEventListener("click", function () { setLens(b.getAttribute("data-lens")); });
  });
  setLens(load("lens", (meta.level && meta.level.lens) || "balanced"));

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

  // ---------- share image ----------
  function cssVar(name) {
    return getComputedStyle(root).getPropertyValue(name).trim();
  }
  function wrapLines(ctx, text, maxWidth) {
    var words = text.split(/\s+/);
    var lines = [];
    var line = "";
    words.forEach(function (w) {
      var test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else line = test;
    });
    if (line) lines.push(line);
    return lines;
  }
  function drawShareImage() {
    var canvas = document.getElementById("share-canvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var W = canvas.width, H = canvas.height, pad = 72;
    // The share image is always the dark brand look, whatever theme the page is in.
    var bg = "#050505", fg = "#fafafa", muted = "#a3a3a3";
    var sans = cssVar("--sans") || "sans-serif", mono = cssVar("--mono") || "monospace", serif = cssVar("--serif") || "serif";

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    var glow = ctx.createRadialGradient(W * 0.15, -60, 10, W * 0.15, -60, 760);
    glow.addColorStop(0, "rgba(86, 30, 255, 0.35)");
    glow.addColorStop(1, "rgba(86, 30, 255, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    var glow2 = ctx.createRadialGradient(W * 0.92, 0, 10, W * 0.92, 0, 600);
    glow2.addColorStop(0, "rgba(0, 100, 255, 0.25)");
    glow2.addColorStop(1, "rgba(0, 100, 255, 0)");
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = muted;
    ctx.font = "500 22px " + mono;
    ctx.fillText("I JUST LEARNED", pad, pad + 10);

    ctx.fillStyle = fg;
    ctx.font = "700 64px " + sans;
    var lines = wrapLines(ctx, plain(meta.title || ""), W - pad * 2).slice(0, 3);
    lines.forEach(function (l, i) { ctx.fillText(l, pad, pad + 100 + i * 74); });

    var y = pad + 100 + lines.length * 74 + 20;
    ctx.font = "italic 34px " + serif;
    var grad = ctx.createLinearGradient(pad, 0, W - pad, 0);
    grad.addColorStop(0, fg);
    grad.addColorStop(0.55, "#561eff");
    grad.addColorStop(1, "#0064ff");
    ctx.fillStyle = grad;
    var names = concepts.map(function (c) { return plain(c.name); }).join("  ·  ");
    wrapLines(ctx, names, W - pad * 2).slice(0, 2).forEach(function (l, i) { ctx.fillText(l, pad, y + i * 44); });

    ctx.fillStyle = muted;
    ctx.font = "500 22px " + mono;
    ctx.fillText("Built using GrowthX teach", pad, H - pad + 10);
    ctx.textAlign = "right";
    ctx.fillText("github.com/GrowthX-Club/teach", W - pad, H - pad + 10);
    ctx.textAlign = "left";
  }
  var downloadBtn = document.getElementById("download-image");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", function () {
      var canvas = document.getElementById("share-canvas");
      var a = document.createElement("a");
      a.download = (meta.slug || "lesson") + "-share.png";
      a.href = canvas.toDataURL("image/png");
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawShareImage);
  drawShareImage();

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
