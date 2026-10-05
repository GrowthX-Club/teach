# lesson.json

The designer writes one UTF-8 JSON object. Text fields are plain text; the page renders only `**bold**` and `` `code` `` inside them. See `examples/sample.lesson.json` for a complete lesson.

```json
{
  "version": 3,
  "meta": {
    "slug": "safe-retries",
    "title": "Why safe retries need **idempotency**",
    "subject": "Making payment webhooks safe to retry",
    "domain": "systems",
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
      "story": "Your phone loses signal just as you tap Pay. The shop's server already charged you, but the reply never reached your phone, so the app sends the payment again. Will you pay twice?",
      "explain": "Think of a lift button. Press it once, or five times because you're late: one lift comes. Extra presses change nothing. **Idempotency** is that property for software: doing an action twice has the same effect as doing it once.",
      "visual": {
        "type": "compare",
        "title": "Same payment arrives twice",
        "left": { "title": "Not idempotent", "tone": "bad", "points": ["First copy: charged", "Second copy: charged again"] },
        "right": { "title": "Idempotent", "tone": "good", "points": ["First copy: charged", "Second copy: seen, skipped"] }
      },
      "real_world": "Payment companies like Stripe let a shop attach a unique key to each charge, so a resent charge never runs twice.",
      "code": { "language": "ts", "caption": "The idea, simplified", "text": "if (await alreadyHandled(event.id)) return ok();" },
      "in_your_work": { "text": "Your payment handler now remembers every payment notice and ignores repeats.", "evidence_ids": ["e2"] },
      "pitfall": "Making a new ID for each retry, so nobody can recognise the repeat."
    }
  ],
  "glossary": [
    { "term": "server", "tip": "A computer somewhere else that does the work for an app, like a restaurant kitchen cooking what the waiter ordered." },
    { "term": "unique key", "tip": "A one-off ticket number stuck on a request, so the receiver can spot a repeat." }
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
    { "title": "Transactions", "prompt": "teach me transactions" }
  ],
  "share": {
    "linkedin": "Learned today why apps can charge you twice…\n\nBuilt using GrowthX teach",
    "x": "Retries make apps reliable. Idempotency makes retries safe."
  }
}
```

## How a concept reads on the page

1. **Story**: a short, concrete situation that sets up the problem before the idea has a name.
2. **Concept → name**, then the explanation in an "Analogy" card: start from an analogy or a real-life example, then name the concept and say exactly what it is.
3. **Diagram**: drawn by the page in a hand-sketched notebook style.
4. **In the real world** (optional), **In your work** (optional), code (optional), **Common mistake** (optional).

Jargon anywhere in the lesson is underlined; hovering or tapping it shows its glossary tip.

## Rules (checked by `validate.mjs`)

- `meta.domain` is a [catalogue](catalogue.json) area id. teach only covers tech and AI.
- A concept whose `id` is in the catalogue must use the catalogue `name`. Concepts outside the catalogue are allowed but produce a warning.
- `meta.slug`: lowercase words joined by hyphens. `meta.minutes`: 2–8. `meta.level.depth`: 1–4. `meta.level.lens`: `product`, `balanced` or `tech`. The focus shapes the writing; the page has no focus switch.
- `goal`, `hook`, and every concept's `name`, `story`, `explain` and `visual` are required. There is no tagline, no `product`/`tech` split and no `examples` list.
- `story`: at most 80 words. When the brief says where the concept showed up in the learner's work, build the story around that situation, told so it makes sense to someone who never saw the chat.
- `explain`: at most 100 words. It opens with an analogy or a real-life example (never "X means…"), then names the concept and says what it is.
- **2–3 concepts**, unique `id`s (lowercase, hyphens).
- **Each concept is at most 300 words**, counting story, explain, visual text, `real_world`, `in_your_work` and pitfall. Code does not count.
- `visual` is required: `{ "type": "flow", "title", "steps": 3–4 × { label, detail } }` or `{ "type": "compare", "title", "left": { "title", "tone"?, "points": 1–3 }, "right": { … } }`. `tone` is `good`, `bad` or `neutral`. Labels at most 6 words, details and points at most 10.
- `real_world` is optional: one sentence, at most 35 words, about a well-known company or product.
- `in_your_work` is optional: **one sentence, at most 30 words**, with `evidence_ids` from the concept map. It must make sense to someone who never read the chat.
- `code` is optional, at most 10 lines; include it only for depth 3–4 or the technical focus.
- `pitfall` is optional, at most 30 words.
- `glossary`: 3–12 entries covering every piece of jargon a newcomer might not know. Each `term` appears in the lesson's visible text; each `tip` is at most 30 words and explains with an analogy or everyday comparison.
- Exactly **3 quiz** questions, each with 3–4 options, exactly one `correct: true`, and a `why` on every option.
- 2–3 `next` items.
- `share.x` at most 260 characters. `share.linkedin` at most 1300 characters.
- No references back to the chat ("as we discussed", "in our chat", "you just", "the bug we…"), no evidence IDs, file paths, secrets or personal data in visible text.
- Reads like a person: no em or en dashes, no stock AI words (delve, crucial, pivotal, seamless, leverage, unlock…), no "not just X but Y", straight double quotes, and at most 2 bold phrases per concept. See [humanizer](humanizer.md).
