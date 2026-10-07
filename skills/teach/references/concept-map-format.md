# concept-map.json

```json
{
  "version": 2,
  "subject": "Making payment webhooks safe to retry",
  "domain": "systems",
  "session": {
    "about": "Making a shop's payment notifications safe when they arrive more than once",
    "did": "Customers were charged twice after a resent notification; the handler now skips repeats",
    "evidence_ids": ["e1", "e2"]
  },
  "case_details": [
    { "detail": "Order #48213 was charged ₹1,499 twice, 31 seconds apart", "evidence_ids": ["e2"], "concept_ids": ["idempotency"] },
    { "detail": "The payment company resent event evt_9Kx2 because the shop took 12 seconds to answer", "evidence_ids": ["e1", "e2"], "concept_ids": ["idempotency"] }
  ],
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
- `session` is optional and only for a real chat: `about` (what the session was about), `did` (what the learner did in it) and `evidence_ids` that exist in `evidence`, including at least one `chat` evidence.
- `in_your_work` is optional and only for what this session shows: leave it out unless the chat shows the learner working on it. When present it has a `summary` and `evidence_ids` that exist in `evidence`, including at least one `chat` evidence.
- `case_details` is optional and only when the chat was about a specific case: a list of `{ detail, evidence_ids, concept_ids }`, each the exact user, record, value, error or cause the case turned on, copied as it appeared. `concept_ids` names only the concepts this detail is a direct example of. A general or overview concept usually gets none, and that's expected; never tag every concept by default. No secrets, tokens, passwords or keys.
- `kind` is one of `chat`, `code`, `docs`, `test`, `runtime`.
