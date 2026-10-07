#!/usr/bin/env node
// "Your lesson is ready" email. The learner's address lives in
// <home>/contact.json, readable only by them; nothing else about them is kept.
// The email goes through the GrowthX API, which only accepts plain text and
// links back to this computer, so it carries the title, the hook and links.
// It does not need data sharing and never sends the lesson itself.
//
// Usage:
//   node notify.mjs email                  print the saved address (empty if none)
//   node notify.mjs email <address>        save an address
//   node notify.mjs email --forget         forget the saved address
//   node notify.mjs send <lesson-dir> <lesson-url>
//                                          email the saved address; prints EMAILED=yes|no
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const home = path.resolve(process.env.TEACH_HOME || path.join(os.homedir(), "growthx-teach"));
const API = (process.env.TEACH_API_URL || "https://backend.growthx.club/api/v1").replace(/\/+$/, "");
const contactPath = path.join(home, "contact.json");
const EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;

const readContact = () => {
  try { return JSON.parse(fs.readFileSync(contactPath, "utf8")); } catch { return {}; }
};
function writeContact(value) {
  fs.mkdirSync(home, { recursive: true });
  fs.writeFileSync(contactPath, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
  fs.chmodSync(contactPath, 0o600);
}
const die = (msg, code = 2) => { console.error(msg); process.exit(code); };
// The API rejects markup, so drop angle brackets instead of failing the send. Lesson text uses
// markdown emphasis (a **taster**), which would show as literal asterisks in the subject.
const plain = (s, max) =>
  String(s || "").replace(/[<>]/g, "").replace(/\*\*|__|[*`]/g, "").replace(/\s+/g, " ").trim().slice(0, max);

// Same server for the library: http://localhost:<port>/index.html, or the file next to the lessons folder.
function libraryUrlFor(lessonUrl) {
  if (/^http:\/\/(localhost|127\.0\.0\.1):\d+\//.test(lessonUrl)) return new URL("/index.html", lessonUrl).href;
  return pathToFileURL(path.join(home, "index.html")).href;
}

async function send(lessonDir, lessonUrl) {
  const { email } = readContact();
  if (!email) return "no saved email";
  const lesson = JSON.parse(fs.readFileSync(path.join(lessonDir, "lesson.json"), "utf8"));
  const res = await fetch(API + "/teach/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      lesson_title: plain(lesson.meta?.title, 200),
      lesson_summary: plain(lesson.hook, 300) || null,
      lesson_url: lessonUrl,
      library_url: libraryUrlFor(lessonUrl),
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (res.ok) return null;
  const json = await res.json().catch(() => ({}));
  return json.msg || json.message || `HTTP ${res.status}`;
}

const [cmd, a, b] = process.argv.slice(2);
if (cmd === "email" && !a) {
  console.log(readContact().email || "");
} else if (cmd === "email" && a === "--forget") {
  fs.rmSync(contactPath, { force: true });
} else if (cmd === "email") {
  const email = a.trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 254) die(`Not an email address: ${a}`);
  writeContact({ email, at: new Date().toISOString() });
} else if (cmd === "send" && a && b) {
  const error = await send(path.resolve(a), b).catch((e) => e.message);
  console.log(`EMAILED=${error ? "no" : "yes"}`);
  if (error) console.log(`REASON=${error}`);
} else {
  die("Usage: node notify.mjs email [<address>|--forget] | send <lesson-dir> <lesson-url>");
}
