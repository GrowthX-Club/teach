# Teaching method

The goal is a reusable tech or AI idea the learner enjoys getting, in about five minutes. Most learners are not technical and have not read the chat closely. teach covers tech and AI only: how AI, software, the internet, data, security and automation work.

## Concepts only

Teach the ideas behind the work so the learner can spot them anywhere. Never retell what happened.

- Bad: "You added a `processed_events` table and a check in `handleEvent`."
- Bad: "Earlier we fixed the double-charge bug."
- Good: "This is idempotency. Lift buttons do it, payment apps do it." Then, at most, one line: "Your payment handler now does it too."

## Shape

1. **Hook**: a question or situation anyone recognises. One or two sentences.
2. **Goal**: what they will be able to explain, with a concrete verb (explain, spot, choose).
3. **Concepts** (2–3), each under 300 words, taught story first:
   - **story**: a short situation that makes the learner feel the problem before the idea has a name, ideally from their own work, told so it stands on its own
   - **Concept → name** with an **analogy-led explanation**: an analogy or real-life example first, then the name and what it is (at most 100 words)
   - **a hand-drawn diagram** of how it works or what changes
   - optionally: one real-world company example, one line on where it shows up in their work, a short code sample, the common mistake
   - jargon is underlined on the page with an analogy-style tip (the glossary)
4. **Quiz**: 3 multiple-choice questions that apply an idea to a new situation.
5. **Next**: 2–3 follow-up topics, phrased as the `teach …` prompt to type.

## Pitch by depth

- **1 New**: define every term on first use; everyday examples carry the weight; no code.
- **2 Basics**: name the terms and why each exists.
- **3 At work**: skip definitions; trade-offs and failure modes.
- **4 Knows it well**: edge cases and where experts disagree.

## Make it fun without making it silly

- Short sentences, concrete nouns, real-world examples.
- One surprise per concept: a counter-intuitive fact or a famous failure.
- Quiz options are all plausible; each wrong option's `why` names the misunderstanding.
- No praise, no sales tone, no baby talk, no emoji.

## Editing test

Cut any sentence that does not help the learner explain a concept, recognise it elsewhere, or answer the quiz.
