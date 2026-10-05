# Teaching method

The goal is a reusable mental model the learner enjoys getting. A lesson takes 4–8 minutes.

## Concepts, not a recap

Teach the ideas that made the work possible, so the learner can spot them again elsewhere. Their own project is one example among several, never the subject.

Bad: "You added a `processed_events` table and a check in `handleEvent`."
Good: "This is idempotency. Lift buttons do it, payment APIs do it, and so does your webhook now."

## Shape

1. **Hook**: open with a situation or question the learner recognises. One to three sentences.
2. **Goal**: what they will be able to explain, with a concrete verb (explain, spot, choose, predict).
3. **Concepts** (2–4), each with:
   - a one-line tagline they could repeat to a friend
   - the explanation, pitched at their depth
   - a product angle and a tech angle (the page shows them by lens)
   - 2–3 examples, in this order: everyday → industry → their work
   - optionally one visual, a short code sample, and the most common mistake
4. **Connect**: how the concepts work together, as 3–5 steps (optional, only when there are real links).
5. **Quiz**: 3–5 multiple-choice questions that ask the learner to apply an idea to a new situation, not to recall a sentence.
6. **Next**: 2–3 follow-up topics, phrased as the exact `teach …` prompt to type.

## Pitch by depth

- **1 New**: define every term on first use. Everyday examples carry the weight. No code even in the tech lens, unless one line helps.
- **2 Basics**: name the terms, explain why each exists. One industry example per concept.
- **3 Builder**: skip definitions. Trade-offs, failure modes, when not to use it.
- **4 Deep**: internals, edge cases, where experts disagree. Quiz on subtle cases.

## Pitch by lens

- **product**: user impact, cost, risk, trade-offs, what to ask an engineer.
- **tech**: mechanism, data flow, code, performance.
- **balanced**: lead with why, then how.

Always write both the `product` and `tech` angle for each concept so the learner can switch on the page.

## Make it fun without making it silly

- Short sentences, concrete nouns, real-world examples.
- One surprise per concept: a counter-intuitive fact, a famous failure, or a "wait, really?" moment.
- Quiz options are all plausible. Each wrong option's `why` names the misunderstanding behind it.
- No praise of the learner's work, no sales tone, no baby talk, no emoji.

## Editing test

Cut any sentence that does not help the learner explain a concept, recognise it elsewhere, or answer the quiz.
