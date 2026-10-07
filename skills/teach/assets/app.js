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
  // Lessons live at <teach home>/lessons/<dir>/index.html, next to the library page.
  var thisDir = (location.pathname.match(/\/lessons\/([a-z0-9-]+)\/(index\.html)?$/) || [])[1] || "";

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
  // GrowthX wordmark: black in light mode, white in dark mode (see .brand-logo).
  var GX_LOGO = '<svg class="brand-logo" role="img" aria-label="GrowthX" viewBox="0 0 98 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M31.5371 8.76074C33.1853 8.7608 34.5911 9.33456 35.7461 10.4795C36.9018 11.6252 37.4805 13.0382 37.4805 14.708C37.4804 16.3777 36.9017 17.7899 35.7461 18.9355C34.5911 20.0805 33.1853 20.6542 31.5371 20.6543C29.8889 20.6543 28.4831 20.0804 27.3281 18.9355L27.3271 18.9346C26.1864 17.7888 25.6153 16.377 25.6152 14.708C25.6152 13.0388 26.1863 11.6263 27.3271 10.4805L27.3281 10.4795C28.4831 9.33467 29.889 8.76074 31.5371 8.76074ZM31.5371 10.9219C30.4899 10.9219 29.6103 11.282 28.8906 12.0049C28.1717 12.727 27.8115 13.6251 27.8115 14.708C27.8116 15.7907 28.1718 16.6882 28.8906 17.4102C29.6103 18.133 30.4899 18.4941 31.5371 18.4941C32.5995 18.4941 33.4858 18.1326 34.2051 17.4102C34.9239 16.6882 35.2841 15.7907 35.2842 14.708C35.2842 13.6251 34.924 12.727 34.2051 12.0049C33.4858 11.2825 32.5995 10.9219 31.5371 10.9219Z" fill="currentColor" stroke="currentColor" stroke-width="0.284384"/><path fill-rule="evenodd" clip-rule="evenodd" d="M23.9704 9.06344V11.1005H22.9736C21.9854 11.1005 21.1922 11.4014 20.6459 11.9583C20.0996 12.5152 19.7941 13.3346 19.7941 14.3841L19.7941 20.5483H17.5762L17.5762 9.16603H19.6552L19.7766 10.6694C20.2796 9.60865 21.3582 8.91797 22.794 8.91797C23.1808 8.91797 23.4991 8.9638 23.9277 9.05443L23.9704 9.06344Z" fill="currentColor"/><path fill-rule="evenodd" clip-rule="evenodd" d="M86.664 11.2135L93.1334 1.07073L98.0003 0L90.3071 12.0068L98.0003 24L93.4539 23.0525L93.1334 22.9915L86.6572 12.7905L82.2623 19.7482L77.8755 20.6673L83.4442 12.0068L77.8633 3.32183L82.2488 4.2423L86.664 11.2135Z" fill="#3096FF"/><path d="M67.6018 3.50586V9.7832C68.5062 8.75158 69.6226 8.23577 70.9509 8.23577C71.714 8.23577 72.4135 8.41023 73.0494 8.75916C73.6853 9.10809 74.187 9.60873 74.5544 10.2611C74.9359 10.9134 75.1267 11.6872 75.1267 12.5822V20.6294H72.9646V13.1284C72.9646 12.2333 72.7244 11.5506 72.2439 11.0803C71.7776 10.61 71.1911 10.3749 70.4846 10.3749C69.9476 10.3749 69.4177 10.519 68.8948 10.8072C68.372 11.0803 67.941 11.4672 67.6018 11.9678V20.6294H65.4609V3.50586H67.6018Z" fill="currentColor"/><path d="M49.4858 20.4948L54.2356 9.16895H51.9477L49.3366 15.7993L46.5513 9.16895H44.537L45.3576 11.0007L43.4428 15.6445L40.6824 9.16895H38.3945L43.1692 20.4948L46.1783 13.1678L49.4858 20.4948Z" fill="currentColor"/><path d="M11.7693 19.9889C12.8659 19.6517 13.6691 19.2839 14.1788 18.8854V11.094H8.57215V13.232H11.9083V17.598C11.5377 17.8126 11.0743 17.9812 10.5183 18.1038C9.96223 18.2111 9.39074 18.2647 8.80383 18.2647C7.53731 18.2647 6.40982 18.0118 5.42131 17.5061C4.4328 16.985 3.66825 16.257 3.12768 15.3221C2.5871 14.3872 2.3168 13.3221 2.3168 12.1267C2.3168 10.8393 2.5871 9.71285 3.12768 8.74732C3.66825 7.78179 4.4328 7.03849 5.42131 6.5174C6.42524 5.99631 7.57593 5.73578 8.87334 5.73578C9.47571 5.73578 10.1476 5.84307 10.889 6.05762C11.4481 6.20483 11.9356 6.37293 12.3514 6.56195L13.5069 4.72427C12.8428 4.35645 12.0937 4.06524 11.2596 3.85069C10.4256 3.6208 9.5375 3.50586 8.59532 3.50586C7.03536 3.50586 5.59894 3.85834 4.28608 4.56335C2.97321 5.26835 1.93066 6.28751 1.1584 7.62086C0.386134 8.93888 0 10.5021 0 12.3106C0 13.8585 0.355241 15.2532 1.06573 16.4946C1.79166 17.736 2.81878 18.7168 4.14707 19.4371C5.47536 20.1421 7.01219 20.4946 8.7575 20.4946C9.68422 20.4946 10.6882 20.3261 11.7693 19.9889Z" fill="currentColor"/><path d="M58.1964 5.54883H60.5185V9.35403H63.3649V11.1847H60.5185V20.4948H58.1964V11.1847H56.2988V9.35403H58.1964V5.54883Z" fill="currentColor"/></svg>';
  function topbar() {
    return (
      '<header class="topbar"><div class="wrap">' +
      '<a class="brand" href="' + REPO_URL + '" target="_blank" rel="noopener">' + GX_LOGO + ' <span class="grad">teach</span></a>' +
      '<div class="controls">' +
      (thisDir ? '<a class="btn" href="../../index.html">All lessons</a>' : "") +
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

  // What the session was about, for learners who have forgotten the chat by the time they open the lesson.
  function sessionSection() {
    var s = lesson.session;
    if (!s || !s.about) return "";
    return (
      '<section class="block session" id="session" data-nav="Your session">' +
      '<div class="sec-head"><span class="sec-num">Recap</span><h2>What you were working on</h2></div>' +
      '<p class="session-about">' + rich(s.about) + "</p>" +
      (s.did ? '<div class="prose">' + paras(s.did) + "</div>" : "") +
      '<div class="session-learn"><span class="eyebrow">What you\'ll learn today</span><ul>' +
      concepts.map(function (c) { return '<li><a href="#c-' + esc(c.id) + '">' + esc(plain(c.name)) + "</a></li>"; }).join("") +
      "</ul></div></section>"
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

  // Social logos (Simple Icons, CC0). Both use currentColor.
  var LOGO_LI = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>';
  var LOGO_X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>';
  // Every post ends with a link to teach, so readers can make their own lessons.
  function withRepoLink(text) {
    text = String(text || "").replace(/\s+$/, "");
    return text.indexOf(REPO_URL.replace(/^https:\/\//, "")) >= 0 ? text : text + "\n\n" + REPO_URL;
  }
  function shareCard(id, cls, logo, name, sub, text, open) {
    return (
      '<article class="share-card ' + cls + '">' +
      '<header class="sc-head"><span class="sc-logo">' + logo + '</span><span class="sc-title"><b>' + name + "</b><span>" + sub + "</span></span>" +
      '<span class="count" id="' + id + '-count"></span></header>' +
      '<div class="sc-post"><div class="sc-author"><span class="sc-avatar" aria-hidden="true"><svg viewBox="0 0 32 32"><circle cx="16" cy="12.5" r="5.5"/><path d="M5.5 28.5c1.6-5.6 5.6-8.5 10.5-8.5s8.9 2.9 10.5 8.5"/></svg></span><span><b>You</b><span>Now · your post</span></span></div>' +
      '<textarea id="' + id + '" aria-label="' + name + ' post" spellcheck="true">' + esc(withRepoLink(text)) + "</textarea></div>" +
      '<div class="btn-row"><a class="btn sc-go" id="' + id + '-open" target="_blank" rel="noopener">' + logo + open + '</a><button type="button" class="btn" data-copy="' + id + '">Copy text</button></div>' +
      "</article>"
    );
  }

  function shareSection() {
    var s = lesson.share || {};
    if (!s.linkedin && !s.x) return "";
    return (
      '<section class="block" id="share" data-nav="Share">' +
      '<div class="sec-head"><span class="sec-num">Share</span><h2>Tell people what you learned</h2></div>' +
      '<div class="share-grid">' +
      (s.linkedin ? shareCard("share-li", "li", LOGO_LI, "LinkedIn", "Post to your network", s.linkedin, "Post on LinkedIn") : "") +
      (s.x ? shareCard("share-x", "x", LOGO_X, "X", "Post to your followers", s.x, "Post on X") : "") +
      "</div>" +
      '<p class="share-repo">Make lessons like this from your own chats: <a href="' + REPO_URL + '" target="_blank" rel="noopener">github.com/GrowthX-Club/teach</a></p>' +
      "</section>"
    );
  }

  function moreSection() {
    if (!thisDir) return "";
    var others = (window.LIBRARY || []).filter(function (it) { return it && it.dir && it.dir !== thisDir && it.lesson; })
      .sort(function (a, b) { return a.dir < b.dir ? 1 : -1; });
    if (!others.length) return "";
    return (
      '<section class="block" id="more" data-nav="More lessons">' +
      '<div class="sec-head"><span class="sec-num">More</span><h2>Your other lessons</h2></div>' +
      '<ol class="lib-list">' + others.slice(0, 6).map(function (it) {
        var m = it.lesson.meta || {};
        var tags = (areaNames[m.domain] ? '<span class="tag area">' + esc(areaNames[m.domain]) + "</span>" : "") +
          (it.lesson.concepts || []).map(function (c) { return '<span class="tag">' + esc(plain(c.name)) + "</span>"; }).join("");
        return '<li><a class="lib-row" href="../' + encodeURIComponent(it.dir) + '/index.html">' +
          (m.created ? '<span class="lib-meta">' + esc(m.created) + "</span>" : "") +
          "<h3>" + esc(plain(m.title)) + "</h3>" +
          (tags ? '<span class="tags">' + tags + "</span>" : "") + "</a></li>";
      }).join("") + "</ol>" +
      (others.length > 6 ? '<a class="btn" href="../../index.html" style="margin-top:12px">See all ' + (others.length + 1) + " lessons</a>" : "") +
      "</section>"
    );
  }

  // Overall feedback, right after the quiz. Per-section boxes are added after render (see feedback below).
  function feedbackSection() {
    return (
      '<section class="block" id="feedback" data-nav="Feedback">' +
      '<div class="sec-head"><span class="sec-num">Feedback</span><h2>How was this lesson?</h2></div>' +
      '<div class="feedback overall" data-feedback="lesson"></div>' +
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
  var body = hero() + sessionSection() + concepts.map(concept).join("") + quizSection() + feedbackSection() + nextSection() + videosSection() + shareSection() + moreSection();
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
  // Every page opens light (data-theme="light" on <html>) until the learner
  // switches; the choice is shared by all lessons and the library.
  var THEME_KEY = "teach:theme";
  var savedTheme = "";
  try { savedTheme = localStorage.getItem(THEME_KEY) || ""; } catch (e) {}
  if (!savedTheme) savedTheme = load("theme", "");
  if (savedTheme) root.setAttribute("data-theme", savedTheme);
  document.getElementById("theme-toggle").addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
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
  // X counts every link as 23 characters.
  function xLength(t) { return t.replace(/https?:\/\/\S+/g, "x".repeat(23)).length; }
  function fit(el) { el.style.height = "auto"; el.style.height = el.scrollHeight + 2 + "px"; }
  [
    { id: "share-li", limit: 3000, len: function (t) { return t.length; }, url: function (t) { return "https://www.linkedin.com/feed/?shareActive=true&text=" + encodeURIComponent(t); } },
    { id: "share-x", limit: 280, len: xLength, url: function (t) { return "https://x.com/intent/post?text=" + encodeURIComponent(t); } },
  ].forEach(function (p) {
    var box = document.getElementById(p.id);
    if (!box) return;
    var count = document.getElementById(p.id + "-count"), open = document.getElementById(p.id + "-open");
    function update() {
      var n = p.len(box.value);
      count.textContent = n + " / " + p.limit;
      count.classList.toggle("over", n > p.limit);
      open.href = p.url(box.value);
      fit(box);
    }
    box.addEventListener("input", update);
    update();
    addEventListener("load", function () { fit(box); });
  });

  // ---------- bespoke animations ----------
  var THEME_VARS = ["--bg", "--bg-2", "--fg", "--muted", "--card", "--card-2", "--hairline", "--hairline-2", "--glass", "--glass-2", "--brand", "--brand-text", "--brand-fg", "--green", "--green-bg", "--red", "--red-bg", "--amber", "--amber-bg", "--violet", "--sans", "--mono"];
  // Colours come from the figure, not the page: diagrams stay light in dark mode.
  function loadBespokes() {
    var close = "<" + "/script>";
    document.querySelectorAll("iframe[data-bespoke]").forEach(function (f) {
      var a = bespokes[Number(f.getAttribute("data-bespoke"))] || {};
      var cs = getComputedStyle(f.closest(".anim") || root);
      var vars = THEME_VARS.map(function (n) { return n + ":" + cs.getPropertyValue(n).trim(); }).join(";");
      var dark = cs.getPropertyValue("color-scheme").trim() === "dark";
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

  // ---------- feedback ----------
  // A thumbs up or down on each section, then an optional note. Kept in this
  // browser only for now; every change also fires a "teach:feedback" event so
  // sending it somewhere later is one listener.
  var FEEDBACK_ASK = { section: "What did you think about this section?", lesson: "Help us improve your experience. Did this lesson help you?" };
  var feedback = {};
  try { feedback = JSON.parse(load("feedback", "{}")) || {}; } catch (e) {}

  function feedbackBox(box) {
    var id = box.getAttribute("data-feedback");
    var kind = id === "lesson" ? "lesson" : "section";
    box.setAttribute("role", "group");
    box.setAttribute("aria-label", "Feedback");
    box.innerHTML =
      '<div class="fb-row"><span class="fb-ask">' + esc(FEEDBACK_ASK[kind]) + "</span>" +
      '<span class="fb-votes">' +
      '<button type="button" class="fb-vote" data-vote="up" aria-pressed="false" aria-label="Yes, helpful"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10v11M15 5.9 14 10h5.8a2 2 0 0 1 1.9 2.6l-2.3 7A2 2 0 0 1 17.5 21H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h2.8a2 2 0 0 0 1.8-1.1L12 2a3.1 3.1 0 0 1 3 3.9z"/></svg></button>' +
      '<button type="button" class="fb-vote" data-vote="down" aria-pressed="false" aria-label="No, not helpful"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 14V3M9 18.1 10 14H4.2a2 2 0 0 1-1.9-2.6l2.3-7A2 2 0 0 1 6.5 3H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-2.8a2 2 0 0 0-1.8 1.1L12 22a3.1 3.1 0 0 1-3-3.9z"/></svg></button>' +
      "</span></div>" +
      '<form class="fb-form" inert><div class="fb-inner"><div class="fb-field"><textarea rows="3" maxlength="1000" placeholder="Tell us more (optional)" aria-label="Tell us more (optional)"></textarea>' +
      '<div class="fb-bar"><span class="fb-count" hidden></span>' +
      '<button type="submit" class="btn primary fb-send" tabindex="-1">Send</button></div></div></div></form>' +
      '<p class="fb-thanks" hidden aria-live="polite"><span>Thanks, that helps.</span> <button type="button" class="fb-edit">Add a note</button></p>';
    var form = box.querySelector(".fb-form");
    var area = form.querySelector("textarea");
    var thanks = box.querySelector(".fb-thanks");
    var votes = box.querySelectorAll(".fb-vote");
    var sendBtn = form.querySelector(".fb-send");
    var count = form.querySelector(".fb-count");
    var NOTE_MAX = area.maxLength;
    // Send only appears once there is something to send; the countdown only
    // in the last 100 characters.
    function syncSend() {
      var has = !!area.value.trim();
      form.classList.toggle("has-text", has);
      sendBtn.tabIndex = has ? 0 : -1;
      var left = NOTE_MAX - area.value.length;
      count.hidden = left > 100;
      count.textContent = left === 1 ? "1 character left" : left + " characters left";
      count.classList.toggle("low", left <= 20);
    }
    area.addEventListener("input", syncSend);

    function store(entry) {
      if (entry) feedback[id] = entry; else delete feedback[id];
      save("feedback", JSON.stringify(feedback));
      try {
        document.dispatchEvent(new CustomEvent("teach:feedback", { detail: { lesson: meta.slug, section: id, vote: entry ? entry.vote : null, note: entry ? entry.note : "" } }));
      } catch (e) {}
      // The lesson server sends it on (or queues it while offline). Opened as a file, it stays in this browser.
      if (onServer && consent === true) {
        sharingSaved.then(function () {
          return api("POST", "/api/feedback", { lesson: thisDir, section: id, vote: entry ? entry.vote : null, note: entry ? entry.note : "" });
        }).catch(function () {});
      }
    }
    function show(state) {
      var entry = feedback[id];
      votes.forEach(function (b) { b.setAttribute("aria-pressed", String(!!entry && entry.vote === b.getAttribute("data-vote"))); });
      box.classList.toggle("voted", !!entry);
      // Closed, the form is inert so its fields can't be tabbed into while it's collapsed.
      form.classList.toggle("open", state === "note");
      form.inert = state !== "note";
      thanks.hidden = state !== "thanks";
      if (entry) thanks.querySelector(".fb-edit").textContent = entry.note ? "Edit your note" : "Add a note";
    }
    votes.forEach(function (b) {
      // Feedback needs a yes to sharing first.
      b.addEventListener("click", function () { withConsent(function () { choose(b.getAttribute("data-vote")); }); });
    });
    function choose(vote) {
      var entry = feedback[id];
      if (entry && entry.vote === vote) { store(null); show(""); return; }
      store({ vote: vote, note: entry ? entry.note : "", at: new Date().toISOString() });
      // A small pop and ring on the chosen thumb says the vote landed.
      var picked = box.querySelector('.fb-vote[data-vote="' + vote + '"]');
      picked.classList.remove("got");
      void picked.offsetWidth;
      picked.classList.add("got");
      area.value = feedback[id].note;
      syncSend();
      show("note");
      area.focus({ preventScroll: true });
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var entry = feedback[id];
      if (!entry || !area.value.trim()) return;
      entry.note = area.value.trim();
      entry.at = new Date().toISOString();
      store(entry);
      show("thanks");
    });
    thanks.querySelector(".fb-edit").addEventListener("click", function () {
      area.value = (feedback[id] && feedback[id].note) || "";
      syncSend();
      show("note");
      area.focus({ preventScroll: true });
    });
    area.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { show("thanks"); }
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit")); }
    });
    show(feedback[id] ? "thanks" : "");
  }

  document.querySelectorAll("section.block[id^='c-']").forEach(function (sec) {
    var box = document.createElement("div");
    box.className = "feedback";
    box.setAttribute("data-feedback", sec.id.slice(2));
    sec.appendChild(box);
  });
  document.querySelectorAll("[data-feedback]").forEach(feedbackBox);

  // ---------- data sharing consent ----------
  // Asked the first time the learner gives feedback, in a card pinned to the bottom: may teach send lessons and feedback to
  // GrowthX? Feedback needs a yes. Every answer fires "teach:consent" for the
  // backend to pick up later.
  // For lessons opened as a file (no lesson server): with it on, the answer is
  // remembered in this browser. Off for now, so a file-opened lesson asks each time.
  var PERSIST_CONSENT = false;
  var CONSENT_KEY = "teach:consent";
  var consent = null;
  if (PERSIST_CONSENT) {
    try { var savedConsent = localStorage.getItem(CONSENT_KEY); if (savedConsent) consent = savedConsent === "yes"; } catch (e) {}
  }
  var afterConsent = null;
  // Served by the lesson server, the answer lives in <home>/sharing.json, so it's asked once for every lesson.
  var onServer = /^https?:$/.test(location.protocol) && !!thisDir;
  var sharingSaved = Promise.resolve();
  if (onServer) {
    sharingSaved = api("GET", "/api/sharing").then(function (r) { if (consent === null) consent = r.share; }).catch(function () {});
  }

  var consentDlg = document.createElement("dialog");
  consentDlg.className = "consent";
  consentDlg.setAttribute("aria-labelledby", "consent-title");
  consentDlg.innerHTML =
    '<button type="button" class="consent-x" aria-label="Close">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
    '<div class="consent-body">' +
    '<p class="consent-need" hidden>You need to accept this to share feedback.</p>' +
    '<h3 id="consent-title">Help make teach better</h3>' +
    "<p>Share your lessons and feedback with GrowthX so we can improve the teach experience. We never upload your chat, your code or your files.</p>" +
    '<button type="button" class="consent-more" aria-expanded="false" aria-controls="consent-details">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>What we collect</button>' +
    '<div class="consent-details" id="consent-details" inert><div><ul>' +
    "<li>The lessons teach makes for you</li>" +
    "<li>Your thumbs up, thumbs down and notes</li>" +
    "<li>An anonymous ID. No name or email.</li>" +
    "</ul></div></div>" +
    '<p class="consent-fine">By choosing Agree, you agree to share this data to improve GrowthX teach.</p></div>' +
    '<div class="consent-actions"><button type="button" class="btn primary" data-consent="yes">Agree</button><button type="button" class="btn" data-consent="no">No thanks</button></div>';
  document.body.appendChild(consentDlg);
  // Dims the page behind the card. Clicking it closes the card, like the × does.
  var consentShade = document.createElement("div");
  consentShade.className = "consent-shade";
  consentShade.hidden = true;
  document.body.insertBefore(consentShade, consentDlg);

  var moreBtn = consentDlg.querySelector(".consent-more");
  var details = consentDlg.querySelector(".consent-details");
  moreBtn.addEventListener("click", function () {
    var open = moreBtn.getAttribute("aria-expanded") !== "true";
    moreBtn.setAttribute("aria-expanded", String(open));
    details.classList.toggle("open", open);
    details.inert = !open;
  });

  // Line the card up with the lesson's content column.
  function placeConsent() {
    var col = document.querySelector(".content");
    if (!col) return;
    var r = col.getBoundingClientRect();
    consentDlg.style.left = r.left + "px";
    consentDlg.style.width = r.width + "px";
  }
  addEventListener("resize", placeConsent);

  var consentShown = false;
  function closeConsent() {
    consentShown = false;
    consentDlg.classList.remove("open");
    consentShade.classList.remove("open");
    setTimeout(function () {
      if (consentDlg.classList.contains("open")) return;
      if (consentDlg.open) consentDlg.close();
      consentShade.hidden = true;
    }, 200);
  }
  function setConsent(value) {
    consent = value;
    if (PERSIST_CONSENT) { try { localStorage.setItem(CONSENT_KEY, value ? "yes" : "no"); } catch (e) {} }
    // Feedback waits for this, so the server never sees a vote before the yes.
    if (onServer) sharingSaved = api("POST", "/api/sharing", { share: value }).catch(function () {});
    closeConsent();
    try { document.dispatchEvent(new CustomEvent("teach:consent", { detail: { share: value } })); } catch (e) {}
    var next = afterConsent;
    afterConsent = null;
    if (value && next) next();
    else toast(value ? "Thanks for sharing." : "Nothing will be shared.");
  }
  // needed: opened because the learner tried to give feedback without a yes.
  function openConsent(needed, then) {
    afterConsent = then || null;
    consentDlg.querySelector(".consent-need").hidden = !needed;
    // Non-modal: the lesson stays usable while the card waits at the bottom.
    if (!consentDlg.open) {
      placeConsent();
      consentDlg.show();
    }
    consentShade.hidden = false;
    consentShown = true;
    requestAnimationFrame(function () {
      if (!consentShown) return;
      consentDlg.classList.add("open");
      consentShade.classList.add("open");
    });
  }
  // Runs fn now if sharing is on, otherwise asks first and runs it on a yes.
  // The first ask is plain; after a no, it says feedback needs a yes.
  function withConsent(fn) {
    if (consent === true) fn();
    else openConsent(consent === false, fn);
  }
  consentDlg.querySelectorAll("[data-consent]").forEach(function (b) {
    b.addEventListener("click", function () { setConsent(b.getAttribute("data-consent") === "yes"); });
  });
  // Closing is neither a yes nor a no: nothing is recorded, so it asks again next time.
  function dismissConsent() {
    afterConsent = null;
    closeConsent();
  }
  consentDlg.querySelector(".consent-x").addEventListener("click", dismissConsent);
  consentShade.addEventListener("click", dismissConsent);

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
          if (!p || p.closest("h1, h2, h3, .eyebrow, .term, code, pre, button, figure, .feedback")) return NodeFilter.FILTER_REJECT;
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
    '<header class="tutor-head">' +
    '<div class="tutor-title"><b>Lesson tutor</b><span id="tutor-status">Answers in plain words</span></div>' +
    '<button type="button" class="tutor-x" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>' +
    '<div class="tutor-body" id="tutor-body" aria-live="polite"></div>' +
    '<div class="tutor-compose">' +
    '<div class="tutor-quote" hidden><span class="tq-label">Asking about</span><q></q><button type="button" aria-label="Remove passage">×</button></div>' +
    '<form class="tutor-form"><label class="sr-only" for="tutor-input">Your question</label>' +
    '<textarea id="tutor-input" rows="1" placeholder="Ask anything about this lesson…"></textarea>' +
    '<button type="submit" class="tutor-send" aria-label="Send"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button></form></div>' +
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
      '<div class="tutor-hello"><h2>What can I explain?</h2><p>Ask me anything about this lesson and I\'ll explain it in plain words.</p>' +
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
    document.documentElement.classList.add("tutor-open");
    fab.classList.add("open");
    fab.classList.remove("pulse");
    fab.querySelector(".tutor-dot").hidden = true;
    seenHint("ask");
    renderEmpty();
    setTimeout(function () { input.focus(); scrollBottom(); }, 30);
  }
  function closePanel() { panel.hidden = true; document.documentElement.classList.remove("tutor-open"); fab.classList.remove("open"); }
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
  function autosize() { input.style.height = "auto"; input.style.height = Math.min(200, input.scrollHeight) + "px"; }
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
    if (!el || !el.closest(".content") || el.closest("textarea, input, button, .options, figure, .tutor, .feedback")) return null;
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
