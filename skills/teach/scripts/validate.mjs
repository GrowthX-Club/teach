#!/usr/bin/env node
// Validates lesson.json (and optionally concept-map.json) against the teach formats.
// Usage: node validate.mjs [--final] <lesson.json> [concept-map.json]
//   --final  the finished lesson: every concept must also have its animation
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LENSES = ["product", "balanced", "tech"];
const EVIDENCE_KINDS = ["chat", "code", "docs", "test", "runtime"];
export const MAX_CONCEPTS = 4;
export const MAX_CONCEPT_WORDS = 450;
export const MAX_DEFINITION_WORDS = 100;
export const MAX_STORY_WORDS = 80;

// Ways a concept can be named: "Retrieval-augmented generation (RAG)" → full, "retrieval-augmented generation", "rag"; plus singular forms.
function nameVariants(name) {
  const n = String(name || "").toLowerCase();
  const base = [n, n.replace(/\s*\(.*\)\s*/, ""), (n.match(/\(([^)]+)\)/) || [])[1]].filter(Boolean);
  return [...new Set(base.flatMap((v) => [v, v.replace(/s$/, ""), v.split(" and ")[0]]))].filter((v) => v.length > 2);
}
const mentionsName = (c, text) => nameVariants(c.name).some((v) => text.toLowerCase().replace(/\*\*/g, "").includes(v));
// The explanation leads with an analogy or example, so it must not open with a definition of the name.
const opensAsDefinition = (c) => {
  const start = c.explain.toLowerCase().replace(/\*\*/g, "").slice(0, 80);
  return nameVariants(c.name).some((v) => new RegExp(`^(an? |the )?${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}s? (means|is|are|refers)\\b`).test(start));
};
// Learners rarely read the chat, so the lesson must never point back at it.
const CHAT_REFERENCE = /\b(earlier (in|today)|as (we|you) (discussed|saw|did)|we just|you just|in (our|this|the) (chat|conversation|session)|the bug we|our discussion|mentioned above)\b/i;

// The strongest AI-writing tells from the humanizer (references/humanizer.md), checked mechanically.
const AI_WORDS = /\b(additionally|align with|bolstered|crucial|deep dive|delve|delves|delving|enduring|enhance|enhances|garner|interplay|intricate|intricacies|meticulous|meticulously|pivotal|showcase|showcases|tapestry|testament|underscore|underscores|vibrant|seamless|seamlessly|leverage|game[- ]changer|unlock|unlocks|empower|empowers|in today's|it's worth noting|let's dive)\b/i;
const NOT_X_BUT_Y = /\b(not just|isn't just|is not just|not only|it's not about)\b/i;
const DASHES = /[\u2014\u2013]|\s--\s/;
const CURLY_DOUBLE = /[\u201c\u201d]/;
// Keys whose values are not shown as prose: identifiers, references, code and the prompts to copy.
const NOT_PROSE = new Set(["videos", "animation", "evidence_ids", "code", "prompt", "slug", "id", "concept_id", "kind", "created", "domain", "lens", "correct", "depth", "minutes", "version", "language"]);

// teach only teaches tech and AI. The catalogue lists the areas and the standard concepts.
const CATALOGUE_PATH = fileURLToPath(new URL("../references/catalogue.json", import.meta.url));
export function loadCatalogue(path = CATALOGUE_PATH) {
  const catalogue = JSON.parse(readFileSync(path, "utf8"));
  const areas = new Map();
  const concepts = new Map();
  for (const a of catalogue.areas) {
    areas.set(a.id, a);
    for (const c of a.concepts) concepts.set(c.id, { ...c, area: a.id });
  }
  return { catalogue, areas, concepts };
}

export function validateCatalogue(cat) {
  const errors = [];
  const seen = new Set();
  for (const a of cat.catalogue.areas) {
    if (!ID.test(a.id) || !isTextValue(a.name)) errors.push(`catalogue: area "${a.id}" needs a lowercase id and a name`);
    for (const c of a.concepts) {
      if (seen.has(c.id)) errors.push(`catalogue: duplicate concept id "${c.id}"`);
      seen.add(c.id);
      if (!ID.test(c.id) || !isTextValue(c.name) || !isTextValue(c.plain)) errors.push(`catalogue: concept "${c.id}" needs an id, name and plain line`);
      for (const n of c.next || []) if (!cat.concepts.has(n)) errors.push(`catalogue: "${c.id}" lists unknown next concept "${n}"`);
    }
  }
  return errors;
}

function isTextValue(v) {
  return typeof v === "string" && v.trim().length > 0;
}

const isText = (v) => typeof v === "string" && v.trim().length > 0;
const isList = (v) => Array.isArray(v);
const words = (s) => (typeof s === "string" ? s.trim().split(/\s+/).filter(Boolean).length : 0);

// Bespoke animations are code written by the animator agent and run in a
// sandboxed frame. These checks keep them small, offline and self-contained.
export const MAX_ANIMATION_CHARS = 25000;
const ANIMATION_FORBIDDEN = [
  [/https?:\/\//i, "must not reference any web address"],
  [/\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon/i, "must not make network requests"],
  [/\bimport\s*\(|^\s*import\s/im, "must not import modules"],
  [/<\s*\/?\s*(script|iframe|object|embed|form|link|meta|base)\b/i, "must not contain script, iframe, object, embed, form, link, meta or base tags"],
  [/@import/i, "must not use @import"],
  [/\b(parent|top|opener)\s*\.|window\.(parent|top|opener)/i, "must not reach outside its frame"],
  [/localStorage|sessionStorage|indexedDB|document\.cookie/i, "must not use storage or cookies"],
  [/\beval\s*\(|new\s+Function\b|\bsetTimeout\s*\(\s*["'`]|\bsetInterval\s*\(\s*["'`]/i, "must not evaluate strings as code"],
  [/\bwindow\.open\b|\blocation\s*(\.href)?\s*=/i, "must not open or change pages"],
];
export function checkAnimation(a) {
  const errors = [];
  if (!a || typeof a !== "object") return ["must be an object"];
  if (!isText(a.title) || words(a.title) > 10) errors.push("title is required, at most 10 words");
  if (!isText(a.alt) || words(a.alt) > 60) errors.push("alt is required: a plain description of what happens, at most 60 words");
  if (a.caption !== undefined && (!isText(a.caption) || words(a.caption) > 25)) errors.push("caption must be at most 25 words");
  if (!isText(a.html)) errors.push("html is required");
  for (const k of ["html", "css", "js"]) if (a[k] !== undefined && typeof a[k] !== "string") errors.push(`${k} must be a string`);
  if (a.height !== undefined && !(Number.isInteger(a.height) && a.height >= 180 && a.height <= 440)) errors.push("height must be a whole number of pixels from 180 to 440");
  const code = [a.html, a.css, a.js].filter((x) => typeof x === "string").join("\n");
  if (code.length > MAX_ANIMATION_CHARS) errors.push(`is ${code.length} characters of code; keep it under ${MAX_ANIMATION_CHARS}`);
  for (const [re, why] of ANIMATION_FORBIDDEN) if (re.test(code)) errors.push(why);
  return errors;
}

export function validateConceptMap(map, cat = loadCatalogue()) {
  const errors = [];
  const err = (msg) => errors.push(`concept-map: ${msg}`);
  if (!cat.areas.has(map.domain)) err(`domain "${map.domain}" is not a teach area (${[...cat.areas.keys()].join(", ")}); teach only covers tech and AI`);
  const evidence = new Set();
  if (!isList(map.evidence)) err("evidence must be a list");
  for (const [i, e] of (map.evidence || []).entries()) {
    if (!ID.test(e.id || "")) err(`evidence[${i}].id must be lowercase-hyphenated`);
    if (evidence.has(e.id)) err(`duplicate evidence id "${e.id}"`);
    evidence.add(e.id);
    if (!EVIDENCE_KINDS.includes(e.kind)) err(`evidence "${e.id}" has unknown kind "${e.kind}"`);
    if (!isText(e.source) || !isText(e.supports)) err(`evidence "${e.id}" needs source and supports`);
  }
  const concepts = isList(map.concepts) ? map.concepts : [];
  if (concepts.length < 2 || concepts.length > MAX_CONCEPTS) err(`needs 2-${MAX_CONCEPTS} concepts`);
  const ids = new Set();
  for (const [i, c] of concepts.entries()) {
    if (!ID.test(c.id || "")) err(`concepts[${i}].id must be lowercase-hyphenated`);
    if (ids.has(c.id)) err(`duplicate concept id "${c.id}"`);
    ids.add(c.id);
    if (!isText(c.name) || !isText(c.why_it_matters)) err(`concept "${c.id}" needs name and why_it_matters`);
    const w = c.in_your_work;
    if (w) {
      if (!isText(w.summary)) err(`${c.id}.in_your_work needs a summary`);
      if (!isList(w.evidence_ids) || w.evidence_ids.length === 0) err(`${c.id}.in_your_work needs evidence_ids`);
      for (const id of w.evidence_ids || []) if (!evidence.has(id)) err(`${c.id} cites missing evidence "${id}"`);
    }
  }
  return { errors, evidence };
}

function conceptWords(c) {
  let n = words(c.story) + words(c.explain) + words(c.real_world) + words(c.fun_fact);
  if (c.in_your_work) n += words(c.in_your_work.text);
  const v = c.visual;
  if (v) {
    n += words(v.title);
    n += words(v.caption);
    for (const a of v.actors || []) n += words(a.name) + words(a.role);
    for (const s of v.steps || []) n += words(s.label) + words(s.detail) + words(s.says);
    for (const bar of v.bars || []) n += words(bar.label) + words(bar.display);
    for (const side of [v.left, v.right]) if (side) n += words(side.title) + (side.points || []).reduce((t, p) => t + words(p), 0);
  }
  return n;
}

export function validateLesson(lesson, map, cat = loadCatalogue(), warnings = [], final = false) {
  const errors = [];
  const err = (msg) => errors.push(`lesson: ${msg}`);
  const evidence = map ? validateConceptMap(map, cat).evidence : null;

  const m = lesson.meta || {};
  if (!ID.test(m.slug || "")) err("meta.slug must be lowercase words joined by hyphens");
  for (const k of ["title", "subject", "domain", "one_liner"]) if (!isText(m[k])) err(`meta.${k} is required`);
  if (isText(m.domain) && !cat.areas.has(m.domain)) err(`meta.domain "${m.domain}" is not a teach area (${[...cat.areas.keys()].join(", ")}); teach only covers tech and AI`);
  if (!Number.isInteger(m.minutes) || m.minutes < 2 || m.minutes > 8) err("meta.minutes must be an integer from 2 to 8");
  const level = m.level || {};
  if (!Number.isInteger(level.depth) || level.depth < 1 || level.depth > 4) err("meta.level.depth must be 1-4");
  if (!LENSES.includes(level.lens)) err(`meta.level.lens must be one of ${LENSES.join(", ")}`);
  if (!isText(lesson.goal)) err("goal is required");
  if (!isText(lesson.hook)) err("hook is required");
  if (lesson.connect) err("connect is no longer supported; keep the lesson to its concepts");

  const concepts = isList(lesson.concepts) ? lesson.concepts : [];
  if (concepts.length < 2 || concepts.length > MAX_CONCEPTS) err(`needs 2-${MAX_CONCEPTS} concepts`);
  const conceptIds = new Set();
  for (const [i, c] of concepts.entries()) {
    const at = `concepts[${i}]${c.id ? ` (${c.id})` : ""}`;
    if (!ID.test(c.id || "")) err(`${at}.id must be lowercase-hyphenated`);
    if (conceptIds.has(c.id)) err(`duplicate concept id "${c.id}"`);
    conceptIds.add(c.id);
    for (const k of ["name", "story", "explain"]) if (!isText(c[k])) err(`${at}.${k} is required`);
    for (const k of ["tagline", "product", "tech", "examples", "code", "pitfall", "pitfalls"]) if (c[k] !== undefined) err(`${at}.${k} is no longer used; remove it (see lesson-format.md)`);
    if (isText(c.story) && words(c.story) > MAX_STORY_WORDS) err(`${at}.story has ${words(c.story)} words; keep it to ${MAX_STORY_WORDS}`);
    if (isText(c.explain)) {
      if (words(c.explain) > MAX_DEFINITION_WORDS) err(`${at}.explain has ${words(c.explain)} words; keep it to ${MAX_DEFINITION_WORDS}`);
      if (opensAsDefinition(c)) err(`${at}.explain opens with a definition; start from an analogy or real-life example, then name the concept`);
      if (!mentionsName(c, c.explain)) err(`${at}.explain must name the concept ("${c.name}") after the analogy`);
    }
    if (!isText(c.real_world)) err(`${at}.real_world is required: how a well-known company or product uses the idea`);
    else if (words(c.real_world) < 40 || words(c.real_world) > 100) err(`${at}.real_world has ${words(c.real_world)} words; elaborate it in 40-100 words`);
    if (c.fun_fact !== undefined && (!isText(c.fun_fact) || words(c.fun_fact) > 50)) err(`${at}.fun_fact must be at most 50 words (or left out)`);
    if (isText(m.title) && mentionsName(c, m.title)) err(`meta.title names the concept "${c.name}"; make the title an analogy with no jargon`);
    if (c.id && cat.concepts.has(c.id) && isText(c.name) && c.name !== cat.concepts.get(c.id).name) err(`${at}.name must be the catalogue name "${cat.concepts.get(c.id).name}" so concepts are named the same in every lesson`);
    if (c.id && !cat.concepts.has(c.id)) warnings.push(`${at} is not in the catalogue; use a catalogue id if one fits, or add the concept to references/catalogue.json`);

    const w = c.in_your_work;
    if (w) {
      if (!isText(w.text)) err(`${at}.in_your_work.text is required`);
      else if (words(w.text) < 40 || words(w.text) > 100) err(`${at}.in_your_work has ${words(w.text)} words; elaborate it in 40-100 words`);
      if (!isList(w.evidence_ids) || w.evidence_ids.length === 0) err(`${at}.in_your_work needs evidence_ids`);
      else if (!map) err(`${at}.in_your_work needs a concept map: only write it when the chat and project show it`);
      else {
        for (const id of w.evidence_ids) if (!evidence.has(id)) err(`${at}.in_your_work cites evidence "${id}" missing from the concept map`);
        const kinds = w.evidence_ids.map((id) => (map.evidence || []).find((e) => e.id === id)).filter(Boolean).map((e) => e.kind);
        if (!kinds.includes("chat")) err(`${at}.in_your_work must cite at least one "chat" evidence: it has to come from this session, not from guessing about the project`);
      }
    }

    if (c.animation !== undefined) for (const e of checkAnimation(c.animation)) err(`${at}.animation ${e}`);
    else if (final) err(`${at}.animation is required: every concept gets its own animation (run the animator for it)`);
    const v = c.visual;
    if (!v) err(`${at}.visual is required: every concept gets an animation`);
    else {
      if (!isText(v.title)) err(`${at}.visual.title is required`);
      if (v.type === "flow") {
        if (!isList(v.steps) || v.steps.length < 3 || v.steps.length > 4) err(`${at}.visual flow needs 3-4 steps`);
        for (const [j, s] of (v.steps || []).entries()) {
          if (!isText(s.label) || !isText(s.detail)) err(`${at}.visual.steps[${j}] needs label and detail`);
          else if (words(s.label) > 6 || words(s.detail) > 10) err(`${at}.visual.steps[${j}] is too long for the animation (label 6 words, detail 10)`);
        }
      } else if (v.type === "compare") {
        for (const side of ["left", "right"]) {
          const s = v[side] || {};
          if (!isText(s.title) || !isList(s.points) || s.points.length === 0 || s.points.length > 3) err(`${at}.visual.${side} needs a title and 1-3 points`);
          if (s.tone !== undefined && !["good", "bad", "neutral"].includes(s.tone)) err(`${at}.visual.${side}.tone must be good, bad or neutral`);
          if ((s.points || []).some((p) => words(p) > 10)) err(`${at}.visual.${side} has a point over 10 words`);
        }
      } else if (v.type === "sequence") {
        const actors = isList(v.actors) ? v.actors : [];
        if (actors.length < 2 || actors.length > 3) err(`${at}.visual sequence needs 2-3 actors`);
        const actorIds = new Set();
        for (const [j, a] of actors.entries()) {
          if (!a || !isText(a.id) || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.id)) err(`${at}.visual.actors[${j}].id must be lowercase words joined by hyphens`);
          else if (actorIds.has(a.id)) err(`${at}.visual.actors[${j}].id "${a.id}" is used twice`);
          else actorIds.add(a.id);
          if (!a || !isText(a.name) || words(a.name) > 3) err(`${at}.visual.actors[${j}].name is required, at most 3 words`);
          if (a && a.role !== undefined && (!isText(a.role) || words(a.role) > 5)) err(`${at}.visual.actors[${j}].role must be at most 5 words`);
        }
        const steps = isList(v.steps) ? v.steps : [];
        if (steps.length < 3 || steps.length > 6) err(`${at}.visual sequence needs 3-6 steps`);
        let messages = 0;
        for (const [j, s] of steps.entries()) {
          const isState = s && s.at !== undefined;
          const isMessage = s && (s.from !== undefined || s.to !== undefined);
          if (isState === isMessage) { err(`${at}.visual.steps[${j}] must be either a message { from, to, label } or a moment { at, says }`); continue; }
          if (isState) {
            if (!actorIds.has(s.at)) err(`${at}.visual.steps[${j}].at "${s.at}" is not an actor id`);
            if (!isText(s.says) || words(s.says) > 8) err(`${at}.visual.steps[${j}].says is required, at most 8 words`);
          } else {
            messages++;
            if (!actorIds.has(s.from) || !actorIds.has(s.to)) err(`${at}.visual.steps[${j}] from and to must be actor ids`);
            else if (s.from === s.to) err(`${at}.visual.steps[${j}] travels nowhere: from and to are the same actor`);
            if (!isText(s.label) || words(s.label) > 8) err(`${at}.visual.steps[${j}].label is required, at most 8 words`);
          }
        }
        if (steps.length && messages === 0) err(`${at}.visual sequence needs at least one message that travels between actors`);
      } else if (v.type === "bars") {
        const bars = isList(v.bars) ? v.bars : [];
        if (bars.length < 2 || bars.length > 4) err(`${at}.visual bars needs 2-4 bars`);
        for (const [j, bar] of bars.entries()) {
          if (!bar || !isText(bar.label) || words(bar.label) > 6) err(`${at}.visual.bars[${j}].label is required, at most 6 words`);
          if (!bar || typeof bar.value !== "number" || !(bar.value > 0)) err(`${at}.visual.bars[${j}].value must be a positive number`);
          if (!bar || !isText(bar.display) || words(bar.display) > 4) err(`${at}.visual.bars[${j}].display is required, at most 4 words (e.g. "about 40 ms")`);
          if (bar && bar.tone !== undefined && !["good", "bad", "neutral"].includes(bar.tone)) err(`${at}.visual.bars[${j}].tone must be good, bad or neutral`);
        }
      } else err(`${at}.visual.type must be sequence, flow, compare or bars`);
      if (v.caption !== undefined && (!isText(v.caption) || words(v.caption) > 25)) err(`${at}.visual.caption must be at most 25 words`);
    }

    const n = conceptWords(c);
    if (n > MAX_CONCEPT_WORDS) err(`${at} has ${n} words; the limit is ${MAX_CONCEPT_WORDS}`);
  }

  const glossary = isList(lesson.glossary) ? lesson.glossary : [];
  if (glossary.length < 3 || glossary.length > 12) err("glossary needs 3-12 terms: every piece of jargon a newcomer might not know");
  const terms = new Set();
  const bodyText = JSON.stringify([lesson.hook, lesson.goal, concepts.map((c) => [c.story, c.explain, c.real_world, c.in_your_work && c.in_your_work.text, c.pitfall, c.visual])]).toLowerCase();
  for (const [i, g] of glossary.entries()) {
    if (!isText(g.term) || !isText(g.tip)) { err(`glossary[${i}] needs term and tip`); continue; }
    const t = g.term.toLowerCase();
    if (terms.has(t)) err(`glossary has "${g.term}" twice`);
    terms.add(t);
    if (!bodyText.includes(t)) err(`glossary term "${g.term}" never appears in the lesson; use the exact words from the text`);
    if (words(g.tip) > 30) err(`glossary tip for "${g.term}" is over 30 words`);
    if (isText(m.title) && m.title.toLowerCase().replace(/\*\*/g, "").includes(t)) err(`meta.title uses the jargon "${g.term}"; make the title an analogy with no jargon`);
  }

  // Videos: optional annex of YouTube links that start at the exact moment.
  const videos = lesson.videos === undefined ? [] : lesson.videos;
  if (!isList(videos) || videos.length > 4) err("videos must be a list of at most 4");
  for (const [i, vid] of (isList(videos) ? videos : []).entries()) {
    const at = `videos[${i}]`;
    for (const k of ["title", "channel", "url", "start", "why"]) if (!isText(vid[k])) err(`${at}.${k} is required`);
    if (vid.concept_id && !conceptIds.has(vid.concept_id)) err(`${at} refers to unknown concept "${vid.concept_id}"`);
    const m2 = String(vid.url || "").match(/^https:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=([\w-]{11})(?:&[^#]*)?|youtu\.be\/([\w-]{11})\?(?:[^#]*))$/);
    const t = String(vid.url || "").match(/[?&]t=(\d+)s?(?:&|$)/);
    if (!m2) err(`${at}.url must be a youtube.com/watch?v=… or youtu.be/… link`);
    else if (!t) err(`${at}.url must start at the right moment with a t= parameter in seconds`);
    else {
      const parts = String(vid.start || "").split(":").map(Number);
      const secs = parts.reduce((a, b) => a * 60 + b, 0);
      if (!/^\d{1,2}(:\d{2}){1,2}$/.test(vid.start || "") || secs !== Number(t[1])) err(`${at}.start "${vid.start}" must match t=${t[1]} (as m:ss or h:mm:ss)`);
    }
    if (isText(vid.why) && words(vid.why) > 25) err(`${at}.why must be at most 25 words`);
  }

  const quiz = isList(lesson.quiz) ? lesson.quiz : [];
  if (quiz.length !== 3) err("needs exactly 3 quiz questions");
  for (const [i, q] of quiz.entries()) {
    if (!isText(q.question)) err(`quiz[${i}].question is required`);
    if (q.concept_id && !conceptIds.has(q.concept_id)) err(`quiz[${i}] refers to unknown concept "${q.concept_id}"`);
    const options = isList(q.options) ? q.options : [];
    if (options.length < 3 || options.length > 4) err(`quiz[${i}] needs 3-4 options`);
    if (options.filter((o) => o.correct === true).length !== 1) err(`quiz[${i}] needs exactly one correct option`);
    for (const [j, o] of options.entries()) if (!isText(o.text) || !isText(o.why)) err(`quiz[${i}].options[${j}] needs text and why`);
    // Wrong options must be believable: the right one shouldn't stand out by being the long, careful one.
    const right = options.find((o) => o.correct === true);
    const wrong = options.filter((o) => o.correct !== true && isText(o.text));
    if (right && isText(right.text) && wrong.length) {
      const avg = wrong.reduce((t, o) => t + o.text.length, 0) / wrong.length;
      if (right.text.length > avg * 1.35 + 8) err(`quiz[${i}]: the correct option is much longer than the wrong ones, which gives it away; make every option a similar, equally careful length`);
      for (const o of wrong) if (/\b(always|never|nothing|everything|only because|completely|magically)\b/i.test(o.text)) err(`quiz[${i}]: "${o.text}" is an easy-to-rule-out extreme; write a wrong answer a newcomer could genuinely believe`);
    }
  }

  const rightAt = quiz.map((q) => (isList(q.options) ? q.options.findIndex((o) => o.correct === true) : -1));
  if (quiz.length === 3 && rightAt.every((x) => x === rightAt[0])) err("the correct answer is in the same position in every quiz question; vary it");

  const next = isList(lesson.next) ? lesson.next : [];
  if (next.length < 2 || next.length > 3) err("needs 2-3 next items");
  for (const [i, n] of next.entries()) if (!isText(n.title) || !isText(n.prompt)) err(`next[${i}] needs title and prompt`);

  const share = lesson.share || {};
  if (!isText(share.x) || share.x.length > 260) err("share.x is required and must be at most 260 characters");
  if (!isText(share.linkedin) || share.linkedin.length > 1300) err("share.linkedin is required and must be at most 1300 characters");

  // Visible prose only: no identifiers, evidence, code or copyable prompts.
  const visible = JSON.stringify(lesson, (key, value) => (NOT_PROSE.has(key) ? undefined : value));
  const prose = [];
  JSON.parse(visible, (key, value) => { if (typeof value === "string") prose.push(value); return value; });
  const text = prose.join("\n");
  const ref = text.match(CHAT_REFERENCE);
  if (ref) err(`refers back to the chat ("${ref[0]}"); learners may not have read it, so describe the idea on its own`);
  const aiWord = text.match(AI_WORDS);
  if (aiWord) err(`uses the stock AI word "${aiWord[0]}"; say it plainly (see humanizer section 12)`);
  const contrast = text.match(NOT_X_BUT_Y);
  if (contrast) err(`uses the "${contrast[0]} X but Y" contrast; state the point directly (humanizer section 1)`);
  if (DASHES.test(text)) err("contains em or en dashes; use a period, comma, colon or parentheses instead (humanizer section 8)");
  if (CURLY_DOUBLE.test(text)) err("contains curly double quotes; use straight quotes");
  for (const c of concepts) {
    const bold = [c.story, c.explain, c.real_world, c.fun_fact].join(" ").match(/\*\*[^*]+\*\*/g) || [];
    if (bold.length > 2) err(`concept "${c.id}" bolds ${bold.length} phrases; bold only the concept's own term (humanizer section 19)`);
  }
  // Only IDs containing a digit (e1, code-2) are distinctive enough to detect without false positives.
  if (evidence) for (const id of evidence) if (/\d/.test(id) && new RegExp(`\\b${id}\\b`).test(visible)) err(`evidence id "${id}" appears in visible text`);

  return errors;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    console.error(`Could not read ${path}: ${e.message}`);
    process.exit(2);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const final = args.includes("--final");
  const [lessonPath, mapPath] = args.filter((a) => a !== "--final");
  if (!lessonPath) {
    console.error("Usage: node validate.mjs [--final] <lesson.json> [concept-map.json]");
    process.exit(2);
  }
  const lesson = readJson(lessonPath);
  const map = mapPath ? readJson(mapPath) : null;
  const cat = loadCatalogue();
  const warnings = [];
  const errors = [...(map ? validateConceptMap(map, cat).errors : []), ...validateLesson(lesson, map, cat, warnings, final)];
  for (const w of warnings) console.error(`warning: ${w}`);
  if (errors.length) {
    console.error(`${errors.length} problem(s):\n- ${errors.join("\n- ")}`);
    process.exit(1);
  }
  const counts = lesson.concepts.map((c) => conceptWords(c)).join(", ");
  console.log(`Valid lesson: ${lesson.concepts.length} concepts (${counts} words), ${lesson.quiz.length} quiz questions${map ? ", evidence checked" : ""}.`);
}
