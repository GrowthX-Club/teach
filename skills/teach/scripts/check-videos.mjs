#!/usr/bin/env node
// Drops any video from lesson.json that doesn't exist or whose title or channel
// doesn't match YouTube's own record (via YouTube's public oEmbed endpoint).
// Usage: node check-videos.mjs <lesson.json>
import { readFileSync, writeFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node check-videos.mjs <lesson.json>");
  process.exit(2);
}
const lesson = JSON.parse(readFileSync(file, "utf8"));
const videos = Array.isArray(lesson.videos) ? lesson.videos : [];
if (!videos.length) {
  console.log("No videos to check.");
  process.exit(0);
}

const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
const kept = [];
for (const v of videos) {
  const id = (String(v.url).match(/(?:v=|youtu\.be\/)([\w-]{11})/) || [])[1];
  let reason = "";
  if (!id) reason = "not a YouTube video link";
  else {
    try {
      const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) reason = `YouTube says it doesn't exist or isn't public (${res.status})`;
      else {
        const info = await res.json();
        if (norm(info.title) !== norm(v.title)) reason = `title is "${info.title}" on YouTube`;
        else if (norm(info.author_name) !== norm(v.channel)) reason = `channel is "${info.author_name}" on YouTube`;
      }
    } catch (e) {
      reason = `couldn't reach YouTube (${e.name})`;
    }
  }
  if (reason) console.log(`dropped: ${v.url} (${reason})`);
  else kept.push(v);
}

if (kept.length) lesson.videos = kept;
else delete lesson.videos;
writeFileSync(file, JSON.stringify(lesson, null, 2) + "\n");
console.log(`Kept ${kept.length} of ${videos.length} videos.`);
