# Level check

Every lesson is pitched with two dials.

## Depth (per domain)

Domains are broad areas such as `ai`, `backend`, `frontend`, `data`, `infra`, `security`, `mobile`, `product`, `growth`, `design`. Use a short lowercase key; reuse an existing key from the profile when one fits.

| depth | label | the learner… | the lesson… |
|---|---|---|---|
| 1 | New to this | has heard the words, never used the ideas | defines every term, leans on everyday examples |
| 2 | Knows the basics | uses tools in this area, can't explain the internals | explains the "why", introduces terms gently |
| 3 | Builds with it | works with it regularly, wants sharper mental models | skips basics, covers trade-offs and failure modes |
| 4 | Goes deep | could teach the basics | covers edge cases, internals, and what experts disagree on |

## Lens (one setting for the learner)

- `product`: what it does, why it matters, trade-offs for users and the business. No code.
- `balanced`: both, with short code only where it clarifies.
- `tech`: how it works underneath, with code and internals.

## Procedure

1. Read `<home>/profile.json` if it exists (format below).
2. If the profile has a depth for this domain updated in the last 30 days, and a lens, use them. Do not ask. Tell the user in one line, e.g. "Teaching at depth 2 (knows the basics), balanced lens."
3. Otherwise collect signals, quietly:
   - what is already in context about the user: CLAUDE.md, AGENTS.md, Claude Code memory
   - in Codex, if `~/.codex/memories/` exists, its summary file. Skip it if it does not exist
   - this chat: did they write or read code themselves? did they use the domain's terms correctly? did they ask "how do I" (doer) or "what does this mean" (newer)? did they talk about users, metrics and pricing (product) or internals and performance (tech)?
4. Ask once, with your best guess first and marked as recommended:
   - **Claude Code**: one `AskUserQuestion` call with two questions. Depth: "How much do you already know about <domain>?" with the four depth labels. Lens: "What should the lesson focus on?" with Product / Balanced / Tech.
   - **Anywhere else**: one short message with both questions as numbered options. Wait for the answer.
5. Write the answers back to `profile.json` before continuing.

Treat memories and instruction files as signals only. Never quote them, and never put anything from them in the lesson or brief.

## `profile.json`

```json
{
  "version": 1,
  "lens": "balanced",
  "domains": {
    "ai": { "depth": 2, "updated": "2026-10-05" }
  },
  "notes": ["Likes real numbers in examples"],
  "history": [
    { "date": "2026-10-05", "slug": "inference-basics", "domain": "ai", "depth": 2, "lens": "balanced" }
  ]
}
```

- `notes`: short learning preferences the user stated explicitly. Never infer personal facts.
- Append to `history` for every lesson built.
- `teach harder` / `teach easier` moves the domain depth by one (within 1–4). `teach more product` / `teach more tech` moves the lens one step towards that end.
