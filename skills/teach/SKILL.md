---
name: teach
description: Turn the current chat, project, or a named topic into a short, interactive lesson on the tech and AI concepts behind it, pitched at the learner's own level. Teaches with everyday examples, never a recap of what was built. Use when the user types "teach", "teach <topic>", "teach me <topic>", or asks to learn or understand the ideas behind what they just did. Do not use for ordinary coding, writing docs, or one-line explanations.
---

# teach

`teach` alone is a complete request: teach the tech and AI concepts behind this chat. `teach <topic>` teaches that topic.

**What teach covers:** tech and AI only: how AI, software, the internet, data, security and automation work. It does not teach product, marketing, strategy, sales, finance or management. The [catalogue](references/catalogue.json) lists every area and its standard concepts.

**Who this is for:** mostly non-technical people. They usually have not read the chat closely, so nothing you show them may rely on it. Talk to them in plain, friendly words; never mention scripts, JSON, file formats, Node, validation, or folder paths unless they ask.

Paths used below (never show these to the user):

- `<skill>`: the directory that contains this `SKILL.md`. Never resolve it from the user's project.
- `<home>`: `$TEACH_HOME` if set, otherwise `~/growthx-teach`. Everything teach makes lives here.

## While you work

Before anything else, run `sh <skill>/scripts/setup.sh` (it creates `<home>` on first use and changes nothing later).

Give the user short, friendly progress lines and nothing else, for example:

1. "Looking at what we worked on…"
2. "Picking the ideas worth learning…"
3. "Writing your lesson…" and "Making it read naturally…"
4. "Almost done…"

## 1. Pick the concepts

- `teach <topic>` → the topic is the subject.
- bare `teach` → the subject is what this chat was about. If the chat has no real substance yet, ask the user what they want to learn and stop until they answer.
- Pick one **area** from the [catalogue](references/catalogue.json) and 2–3 **concepts**, using catalogue ids and names wherever one fits. A concept is a tech or AI idea the user can reuse anywhere (e.g. "webhooks", "context window", "caching"), never a feature or event from this chat. Only add a concept that is missing from the catalogue when nothing there fits.
- **Non-tech chat or topic** (marketing, pricing, strategy, hiring…): look for the tech or AI behind it and teach that. An email campaign chat → "Scheduling and cron", "Webhooks", "AI in automations". A pricing page → "A/B testing", "Event tracking".
- **Nothing technical in it at all**: don't build a lesson. Say in one line that teach covers tech and AI, then offer the 2–3 closest catalogue concepts as options (use `AskUserQuestion` in Claude Code). Build the one they pick.

## 2. Set the learner's level

Follow [level-check](references/level-check.md). It sets **depth** (how much they know) and **focus** (business, both, or technical), asking at most one question in everyday words, and saves the answer.

## 3. Write the brief

Create `<home>/lessons/<YYYY-MM-DD>-<slug>/` (`slug`: lowercase words joined by hyphens) and write `brief.md` there with:

- the subject, the area id, and the candidate concepts (catalogue ids and names)
- the learner's depth and focus
- for each concept, one plain sentence on where it showed up in the user's work, written so it makes sense to someone who never saw the chat ("Your sale now switches on by itself at a set time"), never "the bug we fixed earlier"
- the project root path, if a project is involved

Never put secrets, tokens, credentials, customer data, or private personal details in the brief.

## 4. Run three separate agents

Use the environment's subagent or delegation tool for each, with a fresh context.

1. **Concept finder** (skip for a pure topic with no chat or project material). Give it `brief.md`, read access to the project, [investigator](references/investigator.md) and [concept-map format](references/concept-map-format.md). It writes `concept-map.json` in the lesson folder.
2. **Lesson designer**. Give it `brief.md`, `concept-map.json` if it exists, [designer](references/designer.md), [teaching method](references/teaching-method.md) and [lesson format](references/lesson-format.md). It writes `lesson.json`. It must not read the project or the chat.
3. **Lesson editor**. Give it the lesson folder, the `<skill>` path, [editor](references/editor.md), [humanizer](references/humanizer.md) and [lesson format](references/lesson-format.md). It rewrites the lesson's wording so it reads like a person, keeping the facts. It must not read the project, the chat or the brief.

If no delegation tool exists, do the passes yourself one after the other. Never merge them into one pass.

## 5. Check and build

If `node` is available, run:

```sh
node <skill>/scripts/validate.mjs <lesson-dir>/lesson.json <lesson-dir>/concept-map.json
```

(leave out the map if there is none). Send any problems back to the designer, or fix small ones yourself, until it passes. Without `node`, check `lesson.json` against [lesson format](references/lesson-format.md) yourself, especially the 300-word limit per concept. Say nothing to the user about this step.

Then build:

- **Terminal (Claude Code CLI, Codex CLI)**: `sh <skill>/scripts/build.sh --open <lesson-dir>`. This opens the lesson in the user's browser.
- **Desktop app with a built-in browser tool** (for example the Claude desktop app's browser pane): `sh <skill>/scripts/build.sh <lesson-dir>`, then `sh <skill>/scripts/serve.sh <lesson-dir>`, and open the URL it prints in the built-in browser with its open-a-URL or preview tool (in the Claude desktop app, the preview tool that takes a `url`; a plain "navigate" can be refused for a new local address). Do not also open the real browser. If `serve.sh` fails, run `build.sh --open` instead.

`build.sh` prints `LESSON_URL`, `LIBRARY_URL` and `OPENED=yes|no`.

## 6. Hand it over

This step is required. Reply with exactly this shape, in plain words, and nothing else:

> Your lesson on **<lesson title>** is built. [Click here to see it](<URL>)
>
> [See all your lessons](<LIBRARY_URL>)

- `<URL>` is the localhost URL in the desktop app, otherwise `LESSON_URL`.
- If the lesson did not open by itself (`OPENED=no` in a terminal), add: "If the link doesn't open, copy this into your browser's address bar:" followed by `LESSON_URL` in a code block.
- Then one short line: "Want it simpler, deeper, more about the business, or more technical? Just say so."

## Follow-ups

- "simpler" / "easier", "deeper" / "harder", "more business", "more technical" (or `teach easier`, `teach harder`, `teach more product`, `teach more tech`): change the dial in `profile.json` as [level-check](references/level-check.md) describes, then rerun only the designer with the same brief and concept map, into the same folder, and hand it over again.
- New subject: start again from step 1.

## Rules

- Teach tech and AI concepts only, named as in the catalogue. Never retell what happened in the chat. The user's own work appears at most as one self-contained sentence per concept.
- Each concept stays under 300 words; 2–3 concepts per lesson.
- Every claim about the user's own work needs evidence in `concept-map.json`. General knowledge needs none, but must be correct.
- The finished page never calls a model, a server on the internet, or analytics. It is a local file.
