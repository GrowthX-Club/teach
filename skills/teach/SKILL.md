---
name: teach
description: Turn the current chat, project, or a named topic into a short, interactive lesson pitched at the learner's own level. Teaches the concepts behind the work with examples, not a recap of what was built. Use when the user types "teach", "teach <topic>", "teach me <topic>", or asks to learn or understand the ideas behind what they just did. Do not use for ordinary coding, writing docs, or one-line explanations.
---

# teach

`teach` alone is a complete request: teach the concepts behind this chat. `teach <topic>` teaches that topic, using this chat and project as examples when they are relevant.

Paths used below:

- `<skill>`: the directory that contains this `SKILL.md`. Never resolve it from the user's project.
- `<home>`: `$TEACH_HOME` if set, otherwise `~/growthx-teach`. It holds `theme.css`, `profile.json`, `lessons/`, and the library page `index.html`.

Before anything else, run `sh <skill>/scripts/setup.sh`. It creates `<home>` on first use and prints its path; on later runs it changes nothing.

## 1. Pick the subject

- `teach <topic>` → the topic is the subject.
- bare `teach` → the subject is what this chat was about. If the chat has no real substance yet, ask the user what they want to learn and stop until they answer.
- Name 2–4 candidate concepts the lesson should cover. A concept is an idea the user can reuse elsewhere (e.g. "idempotency", "vector search", "funnel conversion"), not a feature of their project.

## 2. Set the learner's level

Read [level-check](references/level-check.md) and follow it. It decides two dials, **depth** (1–4) and **lens** (`product`, `balanced`, `tech`), from `<home>/profile.json`, what you already know about the user (CLAUDE.md, AGENTS.md, memories), and this chat. Ask at most one question, then save the answer.

## 3. Write the context brief

Create `<home>/lessons/<YYYY-MM-DD>-<slug>/` (`slug`: lowercase words joined by hyphens). Write `brief.md` there with:

- the subject and candidate concepts
- the learner's depth and lens, and one line on why
- the parts of this chat that show those concepts at work: what the user tried, what broke, what decision was made. Summarise; do not paste the transcript
- the project root path, if a project is involved

Never put secrets, tokens, credentials, customer data, or private personal details in the brief.

## 4. Run two separate agents

Finding facts and designing a lesson are different jobs. Use the environment's subagent or delegation tool for each and give each a fresh context.

1. **Concept investigator** (skip when the subject is a pure topic with no chat or project material). Give it `brief.md`, read access to the project, [investigator](references/investigator.md) and [concept-map format](references/concept-map-format.md). It writes `concept-map.json` in the lesson folder.
2. **Lesson designer**. Give it `brief.md`, `concept-map.json` if it exists, [designer](references/designer.md), [teaching method](references/teaching-method.md) and [lesson format](references/lesson-format.md). It writes `lesson.json` in the lesson folder. It must not read the project or the chat.

If no delegation tool exists, do the two passes yourself one after the other and say so in one line. Never merge them into a single pass.

## 5. Validate and build

```sh
node <skill>/scripts/validate.mjs <lesson-dir>/lesson.json <lesson-dir>/concept-map.json   # skip the map argument if there is none
sh <skill>/scripts/build.sh <lesson-dir>
```

- If `node` is missing, skip validation and check `lesson.json` against [lesson format](references/lesson-format.md) yourself.
- Send validation errors back to the designer (or fix them yourself if they are trivial). Rebuild until it passes.
- `build.sh` writes one self-contained `index.html` into the lesson folder (theme, data and code inlined) and refreshes the library page `<home>/index.html`.

## 6. Hand it over

Open `<lesson-dir>/index.html` (`open` on macOS, `xdg-open` on Linux, `start` on Windows). Reply in at most three lines: the lesson title, the file path, and "Say `teach harder`, `teach easier`, `teach more product` or `teach more tech` to adjust."

## Follow-ups

- `teach harder` / `teach easier` / `teach more product` / `teach more tech`: update the dial in `profile.json`, then rerun only the designer with the same brief and concept map, into the same folder.
- New facts or a new subject: start again from step 1.

## Rules

- Teach concepts with examples. The user's own work is at most one example per concept.
- Every claim about the user's own work needs evidence in `concept-map.json`. General knowledge needs none, but must be correct.
- The finished page never calls a model, a server, or analytics. It is a local file.
