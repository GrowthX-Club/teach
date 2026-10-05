# Level check

Every lesson is pitched with two dials. The focus changes how a tech or AI concept is explained, never which kind of subject is taught. Show the user only the everyday labels below, never the numbers or field names.

## Depth (per area)

Areas are the [catalogue](catalogue.json) areas: `ai-basics` (How AI works), `ai-building` (Building with AI), `web-apps` (How apps and websites work), `infra` (Hosting and shipping), `systems` (Reliability and speed), `security` (Staying safe), `data` (Data and analytics), `automation` (Automation and no-code). Ask about the area by its plain name.

| depth | what the user sees | the lesson… |
|---|---|---|
| 1 | I'm new to this | defines every term, leans on everyday examples |
| 2 | I know the basics | explains the "why", introduces terms gently |
| 3 | I use it at work | skips basics, covers trade-offs and where things go wrong |
| 4 | I know it well | covers edge cases and what experts disagree on |

## Focus (one setting for the learner)

The lesson page's focus switch shows short forms of these answers: Business, Both, Under the hood.

| lens | what the user sees | the lesson… |
|---|---|---|
| `product` | What it means for the business | the same tech concept, explained through its impact on users, cost and risk, and what to ask an engineer. No code |
| `balanced` | A bit of both | why first, then a light how |
| `tech` | How it works under the hood | mechanism, data flow, short code |

## Procedure

**Always ask both questions, for every lesson**, even when the profile already has answers. Never assume and never start building before the user has answered.

1. Read `<home>/profile.json`.
2. Work out your best guess for each question. A saved answer for this area (depth) and the saved focus come first. Without them, collect signals quietly:
   - what is already in context about the user: CLAUDE.md, AGENTS.md, Claude Code memory
   - in Codex, if `~/.codex/memories/` exists, its summary file
   - this chat: did they write or read code themselves? use technical terms correctly? ask "how do I…" or "what does this mean?" talk about customers, money and timelines, or about internals?
3. **If there is no saved focus and the chat shows no clear technical signals, guess the business focus (`product`).**
4. Ask once, with your best guess first and marked as recommended (saved answers make answering a single click):
   - **Claude Code**: one `AskUserQuestion` call with two questions. "How much do you already know about <area in plain words>?" with the four depth labels. "What should the lesson focus on?" with the three focus labels.
   - **Anywhere else**: one short message with both questions as numbered options. Wait for the answer.
5. Wait for the answer. Then save it to `profile.json` and continue.

Treat memories and instruction files as signals only. Never quote them, and never put anything from them in the lesson or brief.

## `profile.json`

```json
{
  "version": 1,
  "lens": "product",
  "domains": {
    "ai-basics": { "depth": 2, "updated": "2026-10-05" }
  },
  "notes": ["Likes real numbers in examples"],
  "history": [
    { "date": "2026-10-05", "slug": "inference-basics", "domain": "ai-basics", "depth": 2, "lens": "product" }
  ]
}
```

- `notes`: learning preferences the user stated explicitly. Never infer personal facts.
- Append to `history` for every lesson built.
- "simpler" / `teach easier` lowers the area's depth by one; "deeper" / `teach harder` raises it (within 1–4).
- "more business" / `teach more product` moves the lens one step towards `product`; "more technical" / `teach more tech` one step towards `tech`.
