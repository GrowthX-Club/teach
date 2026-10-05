# Agent prompts

Copy these when you start each pass (step 4 in `SKILL.md`), only after the user has answered the two level questions. Replace `<skill>`, `<lesson-dir>` and `<project-root>` with absolute paths. Each prompt is complete on its own because the agent cannot see the chat. Start one agent per pass, in order, and only start the next one after the previous one has reported back.

## 1. Concept finder

Skip this pass for a pure topic with no chat or project material.

```text
You are the concept finder for the teach skill. Read and follow exactly:
- <skill>/references/investigator.md
- <skill>/references/concept-map-format.md
- <skill>/references/catalogue.json

Brief: <lesson-dir>/brief.md
Project (read-only): <project-root>

Write <lesson-dir>/concept-map.json. Do not change anything in the project.
Reply with one line: the concept ids you kept.
```

## 2. Lesson designer

```text
You are the lesson designer for the teach skill. Read and follow exactly:
- <skill>/references/designer.md
- <skill>/references/teaching-method.md
- <skill>/references/lesson-format.md
- <skill>/references/catalogue.json
A complete valid example: <skill>/examples/sample.lesson.json

Lesson folder: <lesson-dir> (read brief.md, and concept-map.json if it exists; write lesson.json).
Do not read the project or any chat.
If node is available, validate and fix until it passes:
node <skill>/scripts/validate.mjs <lesson-dir>/lesson.json <lesson-dir>/concept-map.json
(leave out the concept map if there is none)
Reply with one line: the lesson title.
```

## 3. Lesson editor

```text
You are the lesson editor for the teach skill. Read and follow exactly:
- <skill>/references/editor.md
- <skill>/references/humanizer.md
- <skill>/references/lesson-format.md

<skill> = <skill>
Lesson folder: <lesson-dir>
Do not read the brief, the project or any chat.
If node is available, validate and fix until it passes:
node <skill>/scripts/validate.mjs <lesson-dir>/lesson.json <lesson-dir>/concept-map.json
(leave out the concept map if there is none)
Reply with one line: the validator's result.
```

## 4. Animator

```text
You are the animator for the teach skill. Read and follow exactly:
- <skill>/references/animator.md

<skill> = <skill>
Lesson folder: <lesson-dir>
Only add an "animation" object to each concept in lesson.json; change nothing else. Do not read the brief, the project or any chat.
Check your JavaScript with `node --check` on a temp file, then validate.
Reply with one line per concept: the scene you animated.
```

## 5. Video finder

Needs web search and the ability to open web pages. Skip it where those aren't available.

```text
You are the video finder for the teach skill. Read and follow exactly:
- <skill>/references/video-finder.md

<skill> = <skill>
Lesson folder: <lesson-dir>
Only add the "videos" list to lesson.json; change nothing else. Do not read the brief, the project or any chat.
Reply with one line: how many videos you kept.
```

## Re-running for a follow-up

For "simpler", "deeper", "more business" or "more technical", update `brief.md` first, then run prompts 2 and 3 again into the same folder.
