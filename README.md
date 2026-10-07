# GrowthX teach

Learn the ideas behind what you just did.

Type `teach` in Claude Code or Codex and get a short, interactive lesson on the tech and AI concepts your chat or project relied on, pitched at your level. It teaches the ideas with everyday and industry examples, not a recap of what you built.

## What it teaches

Tech and AI only, across eight areas: how AI works, building with AI, how apps and websites work, hosting and shipping, reliability and speed, staying safe, data and analytics, and automation and no-code. Every area's standard concepts live in [`skills/teach/references/catalogue.json`](skills/teach/references/catalogue.json), so a concept is named the same in every lesson and "keep going" suggests a sensible next step.

If your chat was about marketing or strategy, teach finds the tech behind it (an email campaign becomes a lesson on scheduling and webhooks). If there's no tech in it at all, teach says so and offers the closest tech or AI lessons instead.

## Install

### With your AI (easiest)

Paste this into Claude Code or Codex:

```text
Install the GrowthX teach skill by following INSTALL.md in the GitHub repo GrowthX-Club/teach
```

Your agent picks the right install method, runs it and checks it worked. Start a new chat afterwards.

### Claude Code plugin

Inside Claude Code:

```text
/plugin marketplace add GrowthX-Club/teach
/plugin install teach@growthx
```

Plugins update automatically. The skill shows up as `teach:teach`; typing `teach` still works.

### Any agent, with the skills CLI

Needs Node.js. Installs for Codex, Claude Code and other agents that read skills folders:

```sh
npx skills add GrowthX-Club/teach -g
```

### From the terminal

```sh
curl -fsSL https://raw.githubusercontent.com/GrowthX-Club/teach/main/install.sh | sh
```

Or from a clone:

```sh
git clone https://github.com/GrowthX-Club/teach.git
cd teach
sh install.sh
```

The installer copies the skill to `~/.claude/skills/teach` and/or `~/.agents/skills/teach` for each agent it finds.

### Notes

- Your teach folder, `~/growthx-teach/` (override with `TEACH_HOME`), is created the first time you type `teach`, whichever way you installed.
- Requirements: macOS, Linux or WSL (Git Bash on Windows) with `sh`, `sed` and `awk`. Node.js is optional; when present it validates every lesson before it is built.

## Use

| Type | What happens |
|---|---|
| `teach` | A lesson on the concepts behind this chat |
| `teach inference engineering` | A lesson on that topic, using your chat and project as examples where relevant |
| `teach harder` / `teach easier` | Rebuild the last lesson one level deeper or simpler |
| `teach more product` / `teach more tech` | Shift the focus between product thinking and how it works |

Every time, teach first asks two quick questions: how much you already know about the area, and whether you want a business, balanced or technical focus. Your last answers are saved in `~/growthx-teach/profile.json` and pre-selected, so answering is usually one click.

## Playground

Turn any chat between a person and an AI assistant into a lesson, without using your own chat. Type:

```text
teach playground
```

A page opens on your computer. Paste the conversation (or upload a `.txt`, `.md`, `.json` or `.jsonl` file), pick how much the learner knows and what to focus on, and hit **Generate lesson**. It runs the same teach pipeline in the background through Claude Code and shows a link when the lesson is ready; the lesson also lands in your library.

You can also point teach at a transcript from any chat: `teach ~/Downloads/chat.txt`.

Needs Node.js and the Claude Code command line (`claude`), logged in; it uses your Claude plan. The page only talks to `localhost`, needs the access key in the link teach gives you, and refuses requests from other websites. The headless run can only read the skill and your teach folder, write to your teach folder, and run the lesson validator; it has no web access and no MCP servers. Transcripts are kept in `~/growthx-teach/playground/`. The server stops by itself after two hours without use.

## What a lesson has

- A short hook and a clear goal
- An analogy for a title, with no jargon
- 2–4 concepts, taught story first: a short situation (from your own work when there is one), then the concept with an analogy-led explanation, a short animation that acts the idea out, "In the real world" and "In your work" (about 100 words each). No code
- Jargon is highlighted; hover or tap it for a plain, analogy-style explanation (a one-time hint points this out)
- A sidebar with every section, ticking them off as you read
- Light and dark themes (the focus you pick shapes the writing)
- An optional "Did you know?" side note per concept, only when there's a genuinely interesting fact
- A **lesson tutor**: a chat button at the bottom right answers questions about the lesson in plain words, right in the page. Select any text and tap **Ask about this** (or **Explain simply**); passages you ask about stay highlighted, and clicking one shows its answer. It runs on your computer through Claude Code; opened as a plain file, it copies the question for your Claude chat instead
- A 3-question multiple-choice quiz with an explanation for every option
- "Prefer watching?": up to 4 YouTube videos that open at the exact moment that explains a concept, found and checked by a separate agent (left out when nothing reliable turns up)
- Follow-up prompts to keep learning
- Ready-to-post LinkedIn and X text
- A "Built using GrowthX teach" footer

Lessons teach ideas, not a recap of the chat: most learners never read the chat, so every lesson stands on its own.

teach doesn't block your chat. It asks its level question and writes a short brief right away, then builds the lesson in the background while you keep working. When the lesson is ready, teach says so with a link to click. In the Claude desktop app it opens in the app's built-in browser; in a terminal it opens in your browser.

Each lesson is one self-contained HTML file. It never calls a model, a server on the internet or analytics.

## Feedback and data sharing

Each concept, and the lesson as a whole, has a thumbs up or down with an optional note. The first time you give feedback, teach asks whether you agree to share your lessons and feedback with GrowthX to improve teach. Nothing is shared unless you agree, and teach never uploads your chat, your code or your files.

If you agree, the local lesson server (not the lesson page) sends the lesson and your feedback to the GrowthX API, using an anonymous install ID. Feedback waits in a local queue while you're offline. Your answer and the install credentials live in `~/growthx-teach/sharing.json`, readable only by you. Delete that file to be asked again. Set `TEACH_API_URL` to point the lesson server at a different API, for example a dev server.

## Lesson-ready email

When teach asks its level questions, it also asks whether to email you the lesson once it's ready. Give an address and, when the lesson is built, `scripts/notify.mjs` asks the GrowthX API to send you an email with the lesson's title, its opening question and links to it. Skip it and the link only shows up in the chat. The links point at this computer, so they open only here.

The email is separate from data sharing: it never sends the lesson itself, and it works whether or not you agreed to share. Your address is kept in `~/growthx-teach/contact.json`, readable only by you, so next time it's one click. Say "forget my email", or delete that file, to remove it.

## Your teach folder

```
~/growthx-teach/
├── index.html          # library of every lesson
├── theme.css           # colours and fonts of every lesson; edit it to restyle
├── profile.json        # your levels and focus per area
├── sharing.json        # your data sharing answer and install ID (only if you answered)
├── feedback-queue.json # feedback waiting to be sent while offline
├── contact.json        # your email for lesson-ready emails (only if you gave one)
└── lessons/
    └── 2026-10-05-safe-retries/
        ├── index.html          # the lesson
        ├── lesson.json         # lesson content
        ├── concept-map.json    # what was found in your chat and code, with evidence
        └── brief.md            # the context handed to the lesson designer
```

The theme lives in your teach folder so the agent never has to write CSS, which keeps lessons fast and cheap to generate. It holds only colours and fonts; layout ships with the skill and updates with it. Reinstalling never overwrites a theme you have edited; the latest default is saved next to it as `theme.default.css`.

## How it works

1. **Level check**: reads your profile and what your agent already knows about you, then always asks its two questions in one prompt, with your last answers pre-selected.
2. **Brief**: the agent picks 2–4 concepts and writes a short brief, without secrets or personal data.
3. **Concept finder** (a separate agent): confirms which concepts were really used, with evidence from code, tests or the chat.
4. **Lesson designer** (another separate agent): sees only the brief and the concept map and writes `lesson.json`.
5. **Lesson editor** (a third agent): rewrites the wording so it reads like a person wrote it, using the [humanizer](https://github.com/blader/humanizer) rules, without changing facts, structure or quiz answers.
6. **Animator** (a fourth agent): designs a small looping animation for each concept that shows the idea as it really looks, run in a sandboxed frame with no network access. If it fails, the page animates the concept's simpler visual instead.
7. **Video finder** (a fifth agent, where web search is available): adds YouTube links that start at the right moment, keeping only ones it has checked.
8. **Check and build**: `validate.mjs` enforces the rules (including 450 words per concept, an analogy title with no jargon, no code, no references back to the chat, and no obvious AI-writing tells); `build.sh` inlines your theme, the layout, the lesson and the renderer into one HTML file and refreshes the library.
9. **Hand-off**: the lesson opens (built-in browser in the desktop app via `serve.sh`, your browser in a terminal) and teach replies with a link.

Steps 3 to 8 run in the background where the agent supports it (Claude Code): the main chat starts each agent in the background and starts the next one when it reports back, so every pass still gets its own fresh agent. Ready-made prompts for each pass are in `skills/teach/references/agent-prompts.md`. Where background agents aren't available, the same steps run one after another.

Keeping fact-finding and teaching in separate agents stops the lesson from inventing things about your work.

## Develop

```
.claude-plugin/          # Claude Code plugin + marketplace manifests
skills/teach/
├── SKILL.md            # the orchestrator instructions
├── references/         # prompts, formats and catalogue.json (areas and concepts)
├── assets/             # theme.css (tokens), base.css (layout), templates, renderer
├── scripts/            # setup.sh, build.sh, serve.sh, validate.mjs
└── examples/           # a sample lesson and concept map
```

Adding a concept: add it to `catalogue.json` under its area with an id, name, one plain line and `next` links; the tests check every link resolves.

Releasing: bump `version` in `.claude-plugin/plugin.json` so plugin users get the update. Validate the manifests with `claude plugin validate .`.

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

## Credits

The lesson editor uses [humanizer](https://github.com/blader/humanizer) by Siqi Chen (MIT), bundled at `skills/teach/references/humanizer.md` with its licence in `humanizer.LICENSE`. To update it, copy the latest `SKILL.md` body over that file and bump the version note at its top.

## Uninstall

| Installed with | Remove with |
|---|---|
| Claude Code plugin | `/plugin uninstall teach@growthx` |
| skills CLI | `npx skills remove teach -g` |
| clone | `sh uninstall.sh` |

Your lessons in `~/growthx-teach/` are kept.
