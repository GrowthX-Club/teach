#!/usr/bin/env node
// Validates lesson.json (and optionally concept-map.json) against the teach formats.
// Usage: node validate.mjs <lesson.json> [concept-map.json]
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LENSES = ["product", "balanced", "tech"];
const EXAMPLE_KINDS = ["everyday", "industry", "your-work"];
const EVIDENCE_KINDS = ["chat", "code", "docs", "test", "runtime"];

const isText = (v) => typeof v === "string" && v.trim().length > 0;
const isList = (v) => Array.isArray(v);

export function validateConceptMap(map) {
  const errors = [];
  const evidence = new Set();
  if (!isList(map.evidence)) errors.push("concept-map: evidence must be a list");
  for (const [i, e] of (map.evidence || []).entries()) {
    if (!ID.test(e.id || "")) errors.push(`concept-map: evidence[${i}].id must be lowercase-hyphenated`);
    if (evidence.has(e.id)) errors.push(`concept-map: duplicate evidence id "${e.id}"`);
    evidence.add(e.id);
    if (!EVIDENCE_KINDS.includes(e.kind)) errors.push(`concept-map: evidence "${e.id}" has unknown kind "${e.kind}"`);
    if (!isText(e.source) || !isText(e.supports)) errors.push(`concept-map: evidence "${e.id}" needs source and supports`);
  }
  const concepts = map.concepts || [];
  if (!isList(map.concepts) || concepts.length < 2 || concepts.length > 4) errors.push("concept-map: needs 2-4 concepts");
  const ids = new Set();
  for (const [i, c] of concepts.entries()) {
    if (!ID.test(c.id || "")) errors.push(`concept-map: concepts[${i}].id must be lowercase-hyphenated`);
    if (ids.has(c.id)) errors.push(`concept-map: duplicate concept id "${c.id}"`);
    ids.add(c.id);
    if (!isText(c.name) || !isText(c.why_it_matters)) errors.push(`concept-map: concept "${c.id}" needs name and why_it_matters`);
    for (const [j, s] of (c.seen_in_work || []).entries()) {
      if (!isText(s.summary)) errors.push(`concept-map: ${c.id}.seen_in_work[${j}] needs a summary`);
      if (!isList(s.evidence_ids) || s.evidence_ids.length === 0) errors.push(`concept-map: ${c.id}.seen_in_work[${j}] needs evidence_ids`);
      for (const id of s.evidence_ids || []) if (!evidence.has(id)) errors.push(`concept-map: ${c.id} cites missing evidence "${id}"`);
    }
  }
  return { errors, evidence };
}

export function validateLesson(lesson, map) {
  const errors = [];
  const err = (msg) => errors.push(`lesson: ${msg}`);
  const evidence = map ? validateConceptMap(map).evidence : null;

  const m = lesson.meta || {};
  if (!ID.test(m.slug || "")) err("meta.slug must be lowercase words joined by hyphens");
  for (const k of ["title", "subject", "domain", "one_liner"]) if (!isText(m[k])) err(`meta.${k} is required`);
  if (!Number.isInteger(m.minutes) || m.minutes < 3 || m.minutes > 12) err("meta.minutes must be an integer from 3 to 12");
  const level = m.level || {};
  if (!Number.isInteger(level.depth) || level.depth < 1 || level.depth > 4) err("meta.level.depth must be 1-4");
  if (!LENSES.includes(level.lens)) err(`meta.level.lens must be one of ${LENSES.join(", ")}`);
  if (!isText(lesson.goal)) err("goal is required");
  if (!isText(lesson.hook)) err("hook is required");

  const concepts = isList(lesson.concepts) ? lesson.concepts : [];
  if (concepts.length < 2 || concepts.length > 4) err("needs 2-4 concepts");
  const conceptIds = new Set();
  for (const [i, c] of concepts.entries()) {
    const at = `concepts[${i}]${c.id ? ` (${c.id})` : ""}`;
    if (!ID.test(c.id || "")) err(`${at}.id must be lowercase-hyphenated`);
    if (conceptIds.has(c.id)) err(`duplicate concept id "${c.id}"`);
    conceptIds.add(c.id);
    for (const k of ["name", "tagline", "explain", "product", "tech"]) if (!isText(c[k])) err(`${at}.${k} is required`);

    const examples = isList(c.examples) ? c.examples : [];
    if (examples.length < 2 || examples.length > 3) err(`${at} needs 2-3 examples`);
    const own = examples.filter((e) => e.kind === "your-work");
    if (own.length > 1) err(`${at} has more than one your-work example`);
    if (examples.length && own.length === examples.length) err(`${at} needs at least one everyday or industry example`);
    for (const [j, e] of examples.entries()) {
      if (!EXAMPLE_KINDS.includes(e.kind)) err(`${at}.examples[${j}].kind must be one of ${EXAMPLE_KINDS.join(", ")}`);
      if (!isText(e.title) || !isText(e.text)) err(`${at}.examples[${j}] needs title and text`);
      if (e.kind === "your-work") {
        if (!isList(e.evidence_ids) || e.evidence_ids.length === 0) err(`${at}.examples[${j}] (your-work) needs evidence_ids`);
        else if (evidence) for (const id of e.evidence_ids) if (!evidence.has(id)) err(`${at}.examples[${j}] cites evidence "${id}" missing from the concept map`);
      }
    }

    const v = c.visual;
    if (v) {
      if (v.type === "flow") {
        if (!isList(v.steps) || v.steps.length < 3 || v.steps.length > 5) err(`${at}.visual flow needs 3-5 steps`);
        for (const [j, s] of (v.steps || []).entries()) if (!isText(s.label) || !isText(s.detail)) err(`${at}.visual.steps[${j}] needs label and detail`);
      } else if (v.type === "compare") {
        for (const side of ["left", "right"]) {
          const s = v[side] || {};
          if (!isText(s.title) || !isList(s.points) || s.points.length === 0) err(`${at}.visual.${side} needs title and points`);
        }
      } else err(`${at}.visual.type must be flow or compare`);
    }
    if (c.code) {
      if (!isText(c.code.text)) err(`${at}.code.text is required`);
      else if (c.code.text.split("\n").length > 15) err(`${at}.code is longer than 15 lines`);
    }
  }

  if (lesson.connect) {
    const steps = lesson.connect.steps || [];
    if (steps.length < 3 || steps.length > 5) err("connect needs 3-5 steps");
    for (const [j, s] of steps.entries()) {
      if (!isText(s.label) || !isText(s.detail)) err(`connect.steps[${j}] needs label and detail`);
      if (s.concept_id && !conceptIds.has(s.concept_id)) err(`connect.steps[${j}] refers to unknown concept "${s.concept_id}"`);
    }
  }

  const quiz = isList(lesson.quiz) ? lesson.quiz : [];
  if (quiz.length < 3 || quiz.length > 5) err("needs 3-5 quiz questions");
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

  const visible = JSON.stringify(lesson, (key, value) => (key === "evidence_ids" ? undefined : value));
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
  console.log(`Valid lesson: ${lesson.concepts.length} concepts, ${lesson.quiz.length} quiz questions${map ? ", evidence checked" : ""}.`);
}
