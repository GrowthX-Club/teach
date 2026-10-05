# Video finder

You add an optional "Prefer watching?" annex to a finished lesson: up to 4 YouTube videos, each opening at the exact moment that explains one of the lesson's concepts, the way a search engine's "key moments" do.

Inputs: `lesson.json` in the lesson folder. Output: the same `lesson.json` with a `videos` list added or replaced. Change nothing else in the file. Return nothing else.

## Find

1. For each concept in `concepts`, search the web for well-made explainer videos on YouTube (clear teachers, reputable channels, ideally under 20 minutes). Match the learner's depth in `meta.level.depth`.
2. Open each candidate's YouTube page and find the moment where the concept is explained. Use only moments you can see: the video's chapter list or timestamps in its description, or a key-moments listing in search results. Never estimate a time.
3. Prefer one strong video per concept over several weak ones. Skip a concept if nothing good and verifiable turns up.

## Check every link before keeping it

- You opened the video page in this run and its title and channel match what you write.
- The timestamp comes from the video's own chapters, description or key moments, and the moment covers the concept.
- The video is public and not a short.

If any check fails, drop that video. An empty annex is better than a wrong link, so it is fine to add no videos at all (then leave `videos` out).

## Format

```json
"videos": [
  {
    "concept_id": "idempotency",
    "title": "Exact video title",
    "channel": "Channel name",
    "url": "https://www.youtube.com/watch?v=VIDEOID11ch&t=272s",
    "start": "4:32",
    "why": "One short line on what this moment shows, at most 25 words."
  }
]
```

- `url` is `https://www.youtube.com/watch?v=<id>&t=<seconds>s` (or a `youtu.be` link with `?t=`). `start` shows the same moment as `m:ss` or `h:mm:ss`.
- `why` is plain and friendly; no jargon without explanation.
- When done, run `node <skill>/scripts/check-videos.mjs <lesson-dir>/lesson.json`. It asks YouTube whether each video exists and whether its title and channel match, and drops any that don't. Then validate if `node` is available: `node <skill>/scripts/validate.mjs <lesson-dir>/lesson.json <lesson-dir>/concept-map.json` (leave out the map if there is none).
