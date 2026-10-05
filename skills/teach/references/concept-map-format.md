# concept-map.json

```json
{
  "version": 1,
  "subject": "Retrying webhook deliveries",
  "domain": "backend",
  "concepts": [
    {
      "id": "idempotency",
      "name": "Idempotency",
      "why_it_matters": "Retries are only safe when doing the same thing twice has the same effect as doing it once",
      "seen_in_work": [
        {
          "summary": "The payment webhook handler skips events whose ID is already stored",
          "evidence_ids": ["e1", "e2"]
        }
      ]
    }
  ],
  "discarded": [
    { "detail": "Uses a date library for timestamps", "reason": "Does not change the mental model" }
  ],
  "uncertainties": [],
  "evidence": [
    { "id": "e1", "kind": "code", "source": "src/webhooks/payment.ts:handleEvent", "supports": "Checks processed event IDs before acting" },
    { "id": "e2", "kind": "chat", "source": "chat", "supports": "User asked why customers were charged twice after a retry" }
  ]
}
```

Rules (checked by `validate.mjs`):

- 2–4 concepts. Concept and evidence `id`s are lowercase words joined by hyphens, and unique.
- `seen_in_work` may be empty for a concept the chat discussed but the project does not show.
- Every `evidence_ids` entry exists in `evidence`.
- `kind` is one of `chat`, `code`, `docs`, `test`, `runtime`.
