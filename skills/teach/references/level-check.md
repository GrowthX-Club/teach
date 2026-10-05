# Level check

Every lesson is pitched with two dials. Show the user only the everyday labels below, never the numbers or field names.

## Depth (per area)

Areas are broad, such as `ai`, `backend`, `frontend`, `data`, `infra`, `security`, `mobile`, `product`, `growth`, `design`, `finance`. Use a short lowercase key; reuse an existing key from the profile when one fits.

| depth | what the user sees | the lesson… |
|---|---|---|
| 1 | I'm new to this | defines every term, leans on everyday examples |
| 2 | I know the basics | explains the "why", introduces terms gently |
| 3 | I use it at work | skips basics, covers trade-offs and common mistakes |
| 4 | I know it well | covers edge cases and what experts disagree on |

## Focus (one setting for the learner)

| lens | what the user sees | the lesson… |
|---|---|---|
| `product` | What it means for the business | impact on users, cost, risk, what to ask an engineer. No code |
| `balanced` | A bit of both | why first, then a light how |
| `tech` | How it works under the hood | mechanism, data flow, short code |

## Procedure

1. Read `<home>/profile.json`.
2. If it has a depth for this area updated in the last 30 days, and a lens, use them without asking. Tell the user in one plain line, e.g. "I'll keep this at 'I know the basics', focused on the business side."
3. Otherwise collect signals quietly:
   - what is already in context about the user: CLAUDE.md, AGENTS.md, Claude Code memory
   - in Codex, if `~/.codex/memories/` exists, its summary file
   - this chat: did they write or read code themselves? use technical terms correctly? ask "how do I…" or "what does this mean?" talk about customers, money and timelines, or about internals?
4. Pick your best guess. **If the chat shows no clear technical signals, guess the business focus (`product`).**
5. Ask once, guess first and marked as recommended:
   - **Claude Code**: one `AskUserQuestion` call with two questions. "How much do you already know about <area in plain words>?" with the four depth labels. "What should the lesson focus on?" with the three focus labels.
   - **Anywhere else**: one short message with both questions as numbered options. Wait for the answer.
6. Save the answers to `profile.json` before continuing.

Treat memories and instruction files as signals only. Never quote them, and never put anything from them in the lesson or brief.

## `profile.json`

```json
{
  "version": 1,
  "lens": "product",
  "domains": {
    "ai": { "depth": 2, "updated": "2026-10-05" }
  },
  "notes": ["Likes real numbers in examples"],
  "history": [
    { "date": "2026-10-05", "slug": "inference-basics", "domain": "ai", "depth": 2, "lens": "product" }
  ]
}
```

- `notes`: learning preferences the user stated explicitly. Never infer personal facts.
- Append to `history` for every lesson built.
- "simpler" / `teach easier` lowers the area's depth by one; "deeper" / `teach harder` raises it (within 1–4).
- "more business" / `teach more product` moves the lens one step towards `product`; "more technical" / `teach more tech` one step towards `tech`.
