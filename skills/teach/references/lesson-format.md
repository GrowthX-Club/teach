# lesson.json

The designer writes one UTF-8 JSON object. Text fields are plain text; the page renders only `**bold**` and `` `code` `` inside them.

```json
{
  "version": 1,
  "meta": {
    "slug": "retries-and-idempotency",
    "title": "Why safe retries need idempotency",
    "subject": "Retrying webhook deliveries",
    "domain": "backend",
    "one_liner": "Retrying is easy. Retrying without doing things twice is the real trick.",
    "minutes": 6,
    "created": "2026-10-05",
    "level": { "depth": 2, "lens": "balanced" }
  },
  "goal": "By the end you can explain why a retry can charge a customer twice, and the two patterns that stop it.",
  "hook": "Your webhook failed, so the sender tried again. Now the customer has two receipts. What went wrong?",
  "concepts": [
    {
      "id": "idempotency",
      "name": "Idempotency",
      "tagline": "Doing it twice has the same effect as doing it once.",
      "explain": "An action is idempotent when repeating it changes nothing after the first time...",
      "product": "Customers never see duplicate charges, emails, or orders, even when networks fail.",
      "tech": "Store a unique key per request and check it inside the same transaction as the write.",
      "examples": [
        { "kind": "everyday", "title": "The lift button", "text": "Pressing it five times calls one lift." },
        { "kind": "industry", "title": "Payment APIs", "text": "Payment providers accept an idempotency key so a retried charge is not run twice." },
        { "kind": "your-work", "title": "Your payment webhook", "text": "Your handler now skips events it has already stored.", "evidence_ids": ["e1"] }
      ],
      "visual": {
        "type": "flow",
        "title": "One request, safely retried",
        "steps": [
          { "label": "Request arrives", "detail": "Carries a unique key" },
          { "label": "Key checked", "detail": "Seen before? Return the saved result" },
          { "label": "Work done once", "detail": "Result saved with the key" }
        ]
      },
      "code": { "language": "ts", "caption": "The check, simplified", "text": "if (await seen(key)) return saved(key);" },
      "pitfall": "Checking the key and doing the work in two separate steps still lets two retries slip through together."
    }
  ],
  "connect": {
    "title": "How the ideas fit together",
    "text": "Retries make delivery reliable; idempotency makes retries safe.",
    "steps": [
      { "label": "Failure", "detail": "The network drops a response", "concept_id": "retries" },
      { "label": "Retry", "detail": "The sender tries again", "concept_id": "retries" },
      { "label": "Dedupe", "detail": "The key stops double work", "concept_id": "idempotency" }
    ]
  },
  "quiz": [
    {
      "question": "A retried request reaches your server twice at the same moment. What prevents a double charge?",
      "concept_id": "idempotency",
      "options": [
        { "text": "A longer timeout", "correct": false, "why": "Timeouts change when retries happen, not whether work repeats." },
        { "text": "Checking the key and writing in one transaction", "correct": true, "why": "Both requests can't pass the check at once." },
        { "text": "Logging every request", "correct": false, "why": "Logs record the duplicate; they don't stop it." }
      ]
    }
  ],
  "next": [
    { "title": "Exactly-once delivery", "prompt": "teach me why exactly-once delivery is so hard" }
  ],
  "share": {
    "linkedin": "Learned today why retries can double-charge customers...",
    "x": "Retries make systems reliable. Idempotency makes retries safe."
  }
}
```

## Rules (checked by `validate.mjs`)

- `meta.slug`: lowercase words joined by hyphens. `meta.minutes`: 3–12. `meta.level.depth`: 1–4. `meta.level.lens`: `product`, `balanced` or `tech`.
- `goal`, `hook`, every concept's `name`, `tagline`, `explain`, `product` and `tech` are non-empty.
- 2–4 `concepts`, unique `id`s (lowercase, hyphens).
- 2–3 `examples` per concept. `kind` is `everyday`, `industry` or `your-work`. At most one `your-work` per concept and at least one other kind.
- `your-work` examples need `evidence_ids`. When a concept map is passed to the validator, they must exist there.
- `visual` is optional: `{ "type": "flow", "title", "steps": 3–5 × { label, detail } }` or `{ "type": "compare", "title", "left": { "title", "points": [] }, "right": { "title", "points": [] } }`.
- `code` is optional and hidden in the product lens. Keep it under 15 lines.
- `connect` is optional; when present it has 3–5 `steps`, each `concept_id` refers to a concept.
- 3–5 `quiz` questions. Each has 3–4 options, exactly one `correct: true`, and a `why` on every option. Each `concept_id` refers to a concept.
- 2–3 `next` items.
- `share.x` at most 260 characters. `share.linkedin` at most 1300 characters.
- No evidence IDs, file paths from private projects, secrets, or personal data in any visible text.
