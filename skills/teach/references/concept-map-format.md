# concept-map.json

```json
{
  "version": 2,
  "subject": "Making payment webhooks safe to retry",
  "domain": "systems",
  "concepts": [
    {
      "id": "idempotency",
      "name": "Idempotency",
      "why_it_matters": "Retries are only safe when doing the same thing twice has the same effect as doing it once",
      "in_your_work": {
        "summary": "The payment handler now remembers each notice and ignores repeats",
        "evidence_ids": ["e1", "e2"]
      }
    }
  ],
  "discarded": [
    { "detail": "Uses a date library for timestamps", "reason": "Not a reusable idea" }
  ],
  "uncertainties": [],
  "evidence": [
    { "id": "e1", "kind": "code", "source": "src/webhooks/payment.ts:handleEvent", "supports": "Checks processed event IDs before acting" },
    { "id": "e2", "kind": "chat", "source": "chat", "supports": "User asked why customers were charged twice after a retry" }
  ]
}
```

Rules (checked by `validate.mjs`):

- `domain` is a [catalogue](catalogue.json) area id.
- 2–4 concepts. Concept and evidence `id`s are lowercase words joined by hyphens, and unique. Use catalogue ids and names wherever they fit.
- `in_your_work` is optional and only for what this session shows: leave it out unless the chat shows the learner working on it. When present it has a `summary` and `evidence_ids` that exist in `evidence`, including at least one `chat` evidence.
- `kind` is one of `chat`, `code`, `docs`, `test`, `runtime`.
