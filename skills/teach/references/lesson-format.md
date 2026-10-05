# lesson.json

The designer writes one UTF-8 JSON object. Text fields are plain text; the page renders only `**bold**` and `` `code` `` inside them. See `examples/sample.lesson.json` for a complete lesson.

```json
{
  "version": 3,
  "meta": {
    "slug": "safe-retries",
    "title": "Why pressing the lift button five times still brings **one lift**",
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
      "real_world": "When a shop asks Stripe to charge a card, it can attach a unique key to the request, a bit like a token number. If the shop sends the same charge again, Stripe sees the same key and returns the first result instead of taking the money twice...",
      "in_your_work": { "text": "Your payment handler now keeps a list of every payment message it has already handled. When one shows up again, it sees the ID and skips it, so the customer is never charged twice...", "evidence_ids": ["e2"] },
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
2. **The concept's name** as the heading, then the explanation in an "Analogy" card: start from an analogy or a real-life example, then name the concept and say exactly what it is.
3. **Animation**: when the animator has added a bespoke `animation`, the page plays it in a sandboxed frame: the idea shown as it really looks, made for this one concept (see [animator](animator.md)). Otherwise the `visual` below is animated by the page: It starts when it scrolls into view, loops, and can be paused. With motion turned off in the reader's system settings, the finished picture is shown still.
4. **In the real world** and **In your work** (only when this session shows it), each as a plain subheading with text, then **Did you know?** (optional) as a separate side-note card.

There is no code anywhere in a lesson and no share image.

Jargon anywhere in the lesson is underlined; hovering or tapping it shows its glossary tip.

## A bars animation

Use it whenever the point is *how much*: where the time goes, what each option costs, how big one thing is next to another.

```json
"visual": {
  "type": "bars",
  "title": "How long the app waits before each new try",
  "bars": [
    { "label": "Before try 2", "value": 1, "display": "1 second" },
    { "label": "Before try 3", "value": 2, "display": "2 seconds" },
    { "label": "Before try 4", "value": 4, "display": "4 seconds" },
    { "label": "Before try 5", "value": 8, "display": "8 seconds", "tone": "good" }
  ],
  "caption": "Each wait doubles, so a struggling server gets more room to recover."
}
```

Only use real or clearly typical numbers; never invent precise figures.

## A sequence animation

Use it whenever two or three things pass something between them: a phone and a server, an app and a payment company, a question, a search index and a model.

```json
"visual": {
  "type": "sequence",
  "title": "One payment, sent twice",
  "actors": [
    { "id": "phone", "name": "Your phone", "role": "the app" },
    { "id": "shop", "name": "The shop", "role": "its server" }
  ],
  "steps": [
    { "from": "phone", "to": "shop", "label": "Pay ₹500, ticket 42" },
    { "at": "shop", "says": "Charged ₹500" },
    { "from": "phone", "to": "shop", "label": "Pay ₹500, ticket 42" },
    { "at": "shop", "says": "Seen ticket 42, skipped" }
  ],
  "caption": "Same ticket number, so the second copy changes nothing."
}
```

On the page the actors sit side by side. A message slides from its sender to its receiver; a moment appears inside the actor it belongs to and stays there until that actor's next moment. A numbered log underneath fills in as the beats play, so nothing is lost if the reader looks away.

## Rules (checked by `validate.mjs`)

- `meta.domain` is a [catalogue](catalogue.json) area id. teach only covers tech and AI.
- A concept whose `id` is in the catalogue must use the catalogue `name`. Concepts outside the catalogue are allowed but produce a warning.
- `meta.slug`: lowercase words joined by hyphens. `meta.minutes`: 2–8. `meta.level.depth`: 1–4. `meta.level.lens`: `product`, `balanced` or `tech`. The focus shapes the writing; the page has no focus switch.
- `meta.title` is an analogy in everyday words. It must not contain any concept name or glossary term ("Why pressing the lift button five times still brings one lift", not "Why safe retries need idempotency").
- `goal`, `hook`, and every concept's `name`, `story`, `explain`, `visual`, and `real_world` are required. There is no tagline, no `product`/`tech` split, no `examples` list and no `code`.
- `story`: at most 80 words. When the brief says where the concept showed up in the learner's work, build the story around that situation, told so it makes sense to someone who never saw the chat.
- `explain`: at most 100 words. It opens with an analogy or a real-life example (never "X means…"), then names the concept and says what it is.
- **2–4 concepts**, unique `id`s (lowercase, hyphens).
- **Each concept is at most 450 words**, counting story, explain, visual text, `real_world`, and `in_your_work`.
- `visual` is required and is animated by the page. One of three types, each with a `title` and an optional `caption` (at most 25 words, the one-line takeaway under the animation):
  - `{ "type": "sequence", "actors": 2–3 × { id, name, role? }, "steps": 3–6 }`: things talking to each other. Each step is either a **message** `{ from, to, label }` that travels from one actor to another, or a **moment** `{ at, says }` where one actor does or shows something. At least one message. `id` is lowercase with hyphens, `name` at most 3 words, `role` at most 5, `label` and `says` at most 8.
  - `{ "type": "flow", "steps": 3–4 × { label, detail } }`: stages of one thing, lit up in order. Labels at most 6 words, details at most 10.
  - `{ "type": "compare", "left": { "title", "tone"?, "points": 1–3 }, "right": { … } }`: the left side plays out, then the right. `tone` is `good`, `bad` or `neutral`. Points at most 10 words.
  - `{ "type": "bars", "bars": 2–4 × { label, value, display, tone? } }`: amounts side by side (time, cost, size, speed), each bar growing to its `value` on its own beat. `value` is a positive number on one shared scale; `display` is what the reader sees, at most 4 words ("about 40 ms", "₹2 per chat"). `label` at most 6 words. Tiny values keep a visible sliver.
- `real_world`: **40–100 words** on how a well-known company or product uses the idea, told as a small story with concrete details.
- `in_your_work` (only when the concept map has one): **40–100 words** on where the idea shows up in what the learner did in this session and what it changed. Its `evidence_ids` come from the concept map and include at least one `chat` evidence. It must make sense to someone who never read the chat. No concept map, no `in_your_work`.
- `fun_fact` is optional: at most 50 words, a genuinely interesting, verifiable fact. Leave it out rather than force one.
- `glossary`: 3–12 entries covering every piece of jargon a newcomer might not know. Each `term` appears in the lesson's visible text; each `tip` is at most 30 words and explains with an analogy or everyday comparison.
- `animation` is optional, added by the animator: `{ title, alt, caption?, height?, html, css?, js? }`. At most 25,000 characters of code, no web addresses, network, imports, storage, string evaluation, or reaching outside its frame. It is **required in the finished lesson** (`validate.mjs --final`): every concept gets one. `visual` stays required too, as the safety net the page uses only if an animation can't load.
- `videos` is optional, added by the video finder: at most 4 items of `{ concept_id, title, channel, url, start, why }`. `url` is a YouTube link with `t=<seconds>`, `start` shows the same moment as `m:ss` or `h:mm:ss`, `why` is at most 25 words. Only videos and timestamps checked in this run.
- Exactly **3 quiz** questions, each with 3–4 options, exactly one `correct: true`, and a `why` on every option.
- 2–3 `next` items.
- `share.x` at most 260 characters. `share.linkedin` at most 1300 characters.
- No references back to the chat ("as we discussed", "in our chat", "you just", "the bug we…"), no evidence IDs, file paths, secrets or personal data in visible text.
- Reads like a person: no em or en dashes, no stock AI words (delve, crucial, pivotal, seamless, leverage, unlock…), no "not just X but Y", straight double quotes, and at most 2 bold phrases per concept. See [humanizer](humanizer.md).
