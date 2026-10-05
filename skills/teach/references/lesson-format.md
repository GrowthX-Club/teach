# lesson.json

The designer writes one UTF-8 JSON object. Text fields are plain text; the page renders only `**bold**` and `` `code` `` inside them. See `examples/sample.lesson.json` for a complete lesson.

```json
{
  "version": 2,
  "meta": {
    "slug": "safe-retries",
    "title": "Why safe retries need **idempotency**",
    "subject": "Making payment webhooks safe to retry",
    "domain": "backend",
    "one_liner": "Retrying is easy. Retrying without doing things twice is the real trick.",
    "minutes": 5,
    "created": "2026-10-05",
    "level": { "depth": 2, "lens": "product" }
  },
  "goal": "By the end you can explain why trying again can charge a customer twice, and the two ideas that stop it.",
  "hook": "Apps resend messages all the time when the internet hiccups. So why don't you get charged twice every time?",
  "concepts": [
    {
      "id": "idempotency",
      "name": "Idempotency",
      "tagline": "Doing it twice has the same effect as doing it once.",
      "explain": "An action is **idempotent** when repeating it changes nothing after the first time...",
      "product": "Customers never see double charges or duplicate emails, even when the network misbehaves.",
      "tech": "Store a record keyed by the request ID and check it before acting.",
      "examples": [
        { "kind": "everyday", "title": "The lift button", "text": "Pressing it five times still calls one lift." },
        { "kind": "industry", "title": "Payment APIs", "text": "Major payment APIs accept an idempotency key, so a retried charge never runs twice." }
      ],
      "visual": {
        "type": "compare",
        "title": "Same repeat, two outcomes",
        "left": { "title": "Without it", "points": ["Message arrives twice", "Customer charged twice"] },
        "right": { "title": "With it", "points": ["Message arrives twice", "Repeat recognised and skipped"] }
      },
      "code": { "language": "ts", "caption": "The idea, simplified", "text": "if (await alreadyHandled(event.id)) return ok();" },
      "in_your_work": { "text": "Your payment handler now remembers every payment notice and ignores repeats.", "evidence_ids": ["e2"] },
      "pitfall": "Making a new ID for each retry, so nobody can recognise the repeat."
    }
  ],
  "quiz": [
    {
      "question": "Which of these actions is idempotent?",
      "concept_id": "idempotency",
      "options": [
        { "text": "Add one item to the cart", "correct": false, "why": "Doing it twice leaves two items." },
        { "text": "Set the user's plan to Pro", "correct": true, "why": "After the first time, repeating it changes nothing." },
        { "text": "Send a welcome email", "correct": false, "why": "Twice means two emails." }
      ]
    }
  ],
  "next": [
    { "title": "Why \"exactly once\" is so hard", "prompt": "teach me why exactly-once delivery is so hard" }
  ],
  "share": {
    "linkedin": "Learned today why apps can charge you twice…\n\nBuilt using GrowthX teach",
    "x": "Retries make apps reliable. Idempotency makes retries safe."
  }
}
```

## Rules (checked by `validate.mjs`)

- `meta.slug`: lowercase words joined by hyphens. `meta.minutes`: 2–8. `meta.level.depth`: 1–4. `meta.level.lens`: `product`, `balanced` or `tech`.
- `goal`, `hook`, and every concept's `name`, `tagline`, `explain`, `product` and `tech` are required.
- **2–3 concepts**, unique `id`s (lowercase, hyphens).
- **Each concept is at most 300 words**, counting tagline, explain, product, tech, examples, visual text, `in_your_work` and pitfall. Code does not count.
- Exactly **2 examples** per concept, `kind` `everyday` or `industry`.
- `in_your_work` is optional: **one sentence, at most 30 words**, with `evidence_ids` from the concept map. It must make sense to someone who never read the chat.
- `visual` is optional: `{ "type": "flow", "title", "steps": 3–4 × { label, detail } }` or `{ "type": "compare", "title", "left": { "title", "points": 1–3 }, "right": { … } }`.
- `code` is optional, hidden in the business focus, at most 10 lines.
- `pitfall` is optional, at most 30 words.
- Exactly **3 quiz** questions, each with 3–4 options, exactly one `correct: true`, and a `why` on every option.
- 2–3 `next` items.
- `share.x` at most 260 characters. `share.linkedin` at most 1300 characters.
- No references back to the chat ("as we discussed", "in our chat", "you just", "the bug we…"), no evidence IDs, file paths, secrets or personal data in visible text.
