#!/usr/bin/env node
// Validates lesson.json (and optionally concept-map.json) against the teach formats.
// Usage: node validate.mjs <lesson.json> [concept-map.json]
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LENSES = ["product", "balanced", "tech"];
const EXAMPLE_KINDS = ["everyday", "industry"];
const EVIDENCE_KINDS = ["chat", "code", "docs", "test", "runtime"];
export const MAX_CONCEPT_WORDS = 300;
// Learners rarely read the chat, so the lesson must never point back at it.
const CHAT_REFERENCE = /\b(earlier (in|today)|as (we|you) (discussed|saw|did)|we just|you just|in (our|this|the) (chat|conversation|session)|the bug we|our discussion|mentioned above)\b/i;

const isText = (v) => typeof v === "string" && v.trim().length > 0;
const isList = (v) => Array.isArray(v);
const words = (s) => (typeof s === "string" ? s.trim().split(/\s+/).filter(Boolean).length : 0);

export function validateConceptMap(map) {
  const errors = [];
  const err = (msg) => errors.push(`concept-map: ${msg}`);
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

export function validateLesson(lesson, map) {
  const errors = [];
  const err = (msg) => errors.push(`lesson: ${msg}`);
  const evidence = map ? validateConceptMap(map).evidence : null;

  const m = lesson.meta || {};
  if (!ID.test(m.slug || "")) err("meta.slug must be lowercase words joined by hyphens");
  for (const k of ["title", "subject", "domain", "one_liner"]) if (!isText(m[k])) err(`meta.${k} is required`);
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

  // Visible text: everything except evidence IDs and the share posts' fixed footer.
  const visible = JSON.stringify(lesson, (key, value) => (key === "evidence_ids" ? undefined : value));
  const ref = visible.match(CHAT_REFERENCE);
  if (ref) err(`refers back to the chat ("${ref[0]}"); learners may not have read it, so describe the idea on its own`);
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
  const errors = [...(map ? validateConceptMap(map).errors : []), ...validateLesson(lesson, map)];
  if (errors.length) {
    console.error(`${errors.length} problem(s):\n- ${errors.join("\n- ")}`);
    process.exit(1);
  }
  const counts = lesson.concepts.map((c) => conceptWords(c)).join(", ");
  console.log(`Valid lesson: ${lesson.concepts.length} concepts (${counts} words), ${lesson.quiz.length} quiz questions${map ? ", evidence checked" : ""}.`);
}
