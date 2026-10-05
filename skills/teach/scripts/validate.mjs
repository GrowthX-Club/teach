#!/usr/bin/env node
// Validates lesson.json (and optionally concept-map.json) against the teach formats.
// Usage: node validate.mjs <lesson.json> [concept-map.json]
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LENSES = ["product", "balanced", "tech"];
const EXAMPLE_KINDS = ["everyday", "industry"];
const EVIDENCE_KINDS = ["chat", "code", "docs", "test", "runtime"];
export const MAX_CONCEPT_WORDS = 300;
// Learners rarely read the chat, so the lesson must never point back at it.
const CHAT_REFERENCE = /\b(earlier (in|today)|as (we|you) (discussed|saw|did)|we just|you just|in (our|this|the) (chat|conversation|session)|the bug we|our discussion|mentioned above)\b/i;

// The strongest AI-writing tells from the humanizer (references/humanizer.md), checked mechanically.
const AI_WORDS = /\b(additionally|align with|bolstered|crucial|deep dive|delve|delves|delving|enduring|enhance|enhances|garner|interplay|intricate|intricacies|meticulous|meticulously|pivotal|showcase|showcases|tapestry|testament|underscore|underscores|vibrant|seamless|seamlessly|leverage|game[- ]changer|unlock|unlocks|empower|empowers|in today's|it's worth noting|let's dive)\b/i;
const NOT_X_BUT_Y = /\b(not just|isn't just|is not just|not only|it's not about)\b/i;
const DASHES = /[\u2014\u2013]|\s--\s/;
const CURLY_DOUBLE = /[\u201c\u201d]/;
// Keys whose values are not shown as prose: identifiers, references, code and the prompts to copy.
const NOT_PROSE = new Set(["evidence_ids", "code", "prompt", "slug", "id", "concept_id", "kind", "created", "domain", "lens", "correct", "depth", "minutes", "version", "language"]);

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
  if (concepts.length < 2 || concepts.length > 3) err("needs 2-3 concepts");
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
  let n = words(c.tagline) + words(c.explain) + words(c.product) + words(c.tech) + words(c.pitfall);
  for (const e of c.examples || []) n += words(e.title) + words(e.text);
  if (c.in_your_work) n += words(c.in_your_work.text);
  const v = c.visual;
  if (v) {
    n += words(v.title);
    for (const s of v.steps || []) n += words(s.label) + words(s.detail);
    for (const side of [v.left, v.right]) if (side) n += words(side.title) + (side.points || []).reduce((t, p) => t + words(p), 0);
  }
  return n;
}

export function validateLesson(lesson, map, cat = loadCatalogue(), warnings = []) {
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
  if (concepts.length < 2 || concepts.length > 3) err("needs 2-3 concepts");
  const conceptIds = new Set();
  for (const [i, c] of concepts.entries()) {
    const at = `concepts[${i}]${c.id ? ` (${c.id})` : ""}`;
    if (!ID.test(c.id || "")) err(`${at}.id must be lowercase-hyphenated`);
    if (conceptIds.has(c.id)) err(`duplicate concept id "${c.id}"`);
    conceptIds.add(c.id);
    for (const k of ["name", "tagline", "explain", "product", "tech"]) if (!isText(c[k])) err(`${at}.${k} is required`);
    if (c.id && cat.concepts.has(c.id) && isText(c.name) && c.name !== cat.concepts.get(c.id).name) err(`${at}.name must be the catalogue name "${cat.concepts.get(c.id).name}" so concepts are named the same in every lesson`);
    if (c.id && !cat.concepts.has(c.id)) warnings.push(`${at} is not in the catalogue; use a catalogue id if one fits, or add the concept to references/catalogue.json`);

    const examples = isList(c.examples) ? c.examples : [];
    if (examples.length !== 2) err(`${at} needs exactly 2 examples`);
    for (const [j, e] of examples.entries()) {
      if (!EXAMPLE_KINDS.includes(e.kind)) err(`${at}.examples[${j}].kind must be everyday or industry (the learner's own work goes in in_your_work)`);
      if (!isText(e.title) || !isText(e.text)) err(`${at}.examples[${j}] needs title and text`);
    }

    const w = c.in_your_work;
    if (w) {
      if (!isText(w.text)) err(`${at}.in_your_work.text is required`);
      else if (words(w.text) > 30 || /[.!?]\s+\S/.test(w.text.trim())) err(`${at}.in_your_work must be one sentence of at most 30 words`);
      if (!isList(w.evidence_ids) || w.evidence_ids.length === 0) err(`${at}.in_your_work needs evidence_ids`);
      else if (evidence) for (const id of w.evidence_ids) if (!evidence.has(id)) err(`${at}.in_your_work cites evidence "${id}" missing from the concept map`);
    }

    const v = c.visual;
    if (v) {
      if (v.type === "flow") {
        if (!isList(v.steps) || v.steps.length < 3 || v.steps.length > 4) err(`${at}.visual flow needs 3-4 steps`);
        for (const [j, s] of (v.steps || []).entries()) if (!isText(s.label) || !isText(s.detail)) err(`${at}.visual.steps[${j}] needs label and detail`);
      } else if (v.type === "compare") {
        for (const side of ["left", "right"]) {
          const s = v[side] || {};
          if (!isText(s.title) || !isList(s.points) || s.points.length === 0 || s.points.length > 3) err(`${at}.visual.${side} needs a title and 1-3 points`);
        }
      } else err(`${at}.visual.type must be flow or compare`);
    }
    if (c.code) {
      if (!isText(c.code.text)) err(`${at}.code.text is required`);
      else if (c.code.text.split("\n").length > 10) err(`${at}.code is longer than 10 lines`);
    }
    if (c.pitfall && words(c.pitfall) > 30) err(`${at}.pitfall must be at most 30 words`);

    const n = conceptWords(c);
    if (n > MAX_CONCEPT_WORDS) err(`${at} has ${n} words; the limit is ${MAX_CONCEPT_WORDS} (code samples don't count)`);
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
  }

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
    const bold = [c.tagline, c.explain, c.product, c.tech, c.pitfall].join(" ").match(/\*\*[^*]+\*\*/g) || [];
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
  const [lessonPath, mapPath] = process.argv.slice(2);
  if (!lessonPath) {
    console.error("Usage: node validate.mjs <lesson.json> [concept-map.json]");
    process.exit(2);
  }
  const lesson = readJson(lessonPath);
  const map = mapPath ? readJson(mapPath) : null;
  const cat = loadCatalogue();
  const warnings = [];
  const errors = [...(map ? validateConceptMap(map, cat).errors : []), ...validateLesson(lesson, map, cat, warnings)];
  for (const w of warnings) console.error(`warning: ${w}`);
  if (errors.length) {
    console.error(`${errors.length} problem(s):\n- ${errors.join("\n- ")}`);
    process.exit(1);
  }
  const counts = lesson.concepts.map((c) => conceptWords(c)).join(", ");
  console.log(`Valid lesson: ${lesson.concepts.length} concepts (${counts} words), ${lesson.quiz.length} quiz questions${map ? ", evidence checked" : ""}.`);
}
