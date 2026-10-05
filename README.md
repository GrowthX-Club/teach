# GrowthX teach

Learn the ideas behind what you just did.

Type `teach` in Claude Code or Codex and get a short, interactive lesson on the concepts your chat or project relied on, pitched at your level. It teaches the ideas with everyday, industry and your-own-work examples, not a recap of what you built.

## Install

### With your AI (easiest)

Paste this into Claude Code or Codex:

```text
Install the GrowthX teach skill: clone github.com/GrowthX-Club/teach and follow its INSTALL.md
```

Your agent downloads teach, installs it, sets up your teach folder and checks it worked. Start a new chat afterwards. The same prompt updates teach later.

### With the terminal

```sh
git clone git@github.com:GrowthX-Club/teach.git
cd teach
sh install.sh
```

Once the repo is public, this one-liner works too:

```sh
curl -fsSL https://raw.githubusercontent.com/GrowthX-Club/teach/main/install.sh | sh
```

The installer finds Claude Code and Codex and installs the skill for each:

| Agent | Skill location |
|---|---|
| Claude Code | `~/.claude/skills/teach` |
| Codex | `~/.agents/skills/teach` |

It also creates your teach folder, `~/growthx-teach/` (override with `TEACH_HOME`). Restart your agent afterwards. Run the same command again to update.

Requirements: macOS, Linux or WSL with `sh`, `sed` and `awk`. Node.js is optional; when present it validates every lesson before it is built.

## Use

| Type | What happens |
|---|---|
| `teach` | A lesson on the concepts behind this chat |
| `teach inference engineering` | A lesson on that topic, using your chat and project as examples where relevant |
| `teach harder` / `teach easier` | Rebuild the last lesson one level deeper or simpler |
| `teach more product` / `teach more tech` | Shift the focus between product thinking and how it works |

The first time you learn about an area, teach asks two quick questions: how much you already know, and whether you want a product, balanced or tech focus. Your answers are saved in `~/growthx-teach/profile.json` and reused next time.

## What a lesson has

- A hook and a clear goal
- 2–4 concepts, each with a one-line tagline, an explanation, a "why it matters" and a "how it works" angle, 2–3 examples, an optional diagram or code sample, and the most common mistake
- A switch between Product, Balanced and Tech focus, plus light and dark themes
- A 3–5 question multiple-choice quiz with an explanation for every option
- Follow-up prompts to keep learning
- Ready-to-post LinkedIn and X text and a downloadable share image
- A "Built using GrowthX teach" footer

Each lesson is one self-contained HTML file. It never calls a model, a server or analytics.

## Your teach folder

```
~/growthx-teach/
├── index.html          # library of every lesson
├── theme.css           # the look of every lesson; edit it to restyle
├── profile.json        # your levels and focus per area
└── lessons/
    └── 2026-10-05-safe-retries/
        ├── index.html          # the lesson
        ├── lesson.json         # lesson content
        ├── concept-map.json    # what was found in your chat and code, with evidence
        └── brief.md            # the context handed to the lesson designer
```

The theme lives in your teach folder so the agent never has to write CSS, which keeps lessons fast and cheap to generate. Reinstalling never overwrites a theme you have edited; the latest default is saved next to it as `theme.default.css`.

## How it works

1. **Level check**: reads your profile and what your agent already knows about you, then asks at most one question.
2. **Brief**: the agent writes a short summary of the chat, without secrets or personal data.
3. **Concept investigator** (a separate agent): confirms which concepts were really used and where, with evidence from code, tests or the chat.
4. **Lesson designer** (another separate agent): sees only the brief and the concept map and writes `lesson.json`.
5. **Validate and build**: `validate.mjs` checks the lesson; `build.sh` inlines your theme, the lesson and the renderer into one HTML file and refreshes the library.

Keeping fact-finding and teaching in separate agents stops the lesson from inventing things about your work.

## Develop

```
skills/teach/
├── SKILL.md            # the orchestrator instructions
├── references/         # prompts and formats for each step
├── assets/             # theme.css, lesson and library templates, renderer
├── scripts/            # build.sh, validate.mjs
└── examples/           # a sample lesson and concept map
```

Run the tests:

```sh
sh tests/test.sh
```

Preview the sample lesson:

```sh
mkdir -p /tmp/teach-demo/lessons/2026-10-05-safe-retries
cp skills/teach/examples/sample.lesson.json /tmp/teach-demo/lessons/2026-10-05-safe-retries/lesson.json
TEACH_HOME=/tmp/teach-demo sh skills/teach/scripts/build.sh /tmp/teach-demo/lessons/2026-10-05-safe-retries
open /tmp/teach-demo/lessons/2026-10-05-safe-retries/index.html
```

## Uninstall

```sh
sh uninstall.sh
```

This removes the skill and keeps your lessons in `~/growthx-teach/`.
