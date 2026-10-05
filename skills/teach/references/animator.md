# Animator

You design and build one small, looping animation per concept that shows the idea **as it actually looks**: on a phone screen, at a shop counter, in a chat, in the real world. Think of the short clips in a UI glossary like 60fps.design: you see the thing happen and you get it, without reading a diagram.

Inputs: `lesson.json` in the lesson folder. For each concept, read its `story`, `explain` and `visual` to understand the idea and the scene the lesson already uses. Output: add an `animation` object to each concept in `lesson.json`. Change nothing else; keep `visual` as it is (the page falls back to it if an animation is missing or rejected).

## What makes a good one

- **Show the concept itself, not a diagram of it.** Idempotency: a payment screen where Pay is tapped three times in frustration, and one "₹500 debited" message arrives. Retries with backoff: a phone calling a busy line, with the wait before each redial visibly growing. Transactions: two people tapping Buy on the last concert ticket, and exactly one gets it. No generic boxes with arrows, no flowcharts, no step logs.
- **Reuse the lesson's own scene.** If the story or analogy uses a lift button, a ticket counter or a UPI payment, animate that, so the reading and the picture tell the same story.
- **Slow enough to follow.** A newcomer must be able to read and understand every step on the first watch. Move **one thing at a time**; each step lasts at least 1.5 seconds and the next starts only after the last has settled. Hold the key moment for about 2 seconds. A loop is usually 10 to 16 seconds; never rush to fit a shorter one. If something happens three times, the first should be clearly visible on its own before the repeats.
- **Narrate every step on screen.** Keep one short caption line in the scene (e.g. at the top or bottom) that changes with each step and says what is happening right now, in plain words: "1. You tap Pay", "2. No reply. The app waits 2 seconds", "3. Same ID: the bank skips it". Number the steps. Add small labels or badges where the eye needs help ("same ID #A7", "busy", "sold out").
- **Real things take real time.** When the concept is about time (waits, timeouts, delays, speed), animate those durations in real seconds, and show a visible countdown or clock with the number ("Retrying in 2s… 1s"). Only shorten long real times (minutes, hours) and then say so on screen ("1 hour, sped up").
- **A clear outcome.** End on a state that shows the result unmistakably (✓ Booked / Sold out, "3 taps · 1 charge"), named in words, not just colour.
- **Calm and polished.** Smooth easing (`cubic-bezier(.2,.7,.2,1)` or similar), nothing faster than 300 ms, no flashing, no shaking. Generous spacing, rounded shapes, clean type. Besides the narration line, keep to about three short labels on screen at once, in everyday words with no jargon.

**Study the three approved examples** in `<skill>/examples/sample.lesson.json` (each concept's `animation`) before you start; match their pace, narration and finish:

- **Transactions** (the model to follow): two phones tap Buy on the last concert seat at once; a lock snaps around the ticket; one gets "✓ Booked", the other waits at the lock and comes back "Sold out". One conflict, clear actors, one unmistakable outcome.
- **Idempotency**: the first tap's whole journey plays on its own (tap, ID #A7 travels, charged, balance drops) before any repeat; then each repeat visibly hits "Already seen #A7" and the balance stays put; ends on "3 taps · 1 charge". The first version of this was rejected for being too fast to follow.
- **Retries with backoff**: real 1 s, 2 s and 4 s waits with a "Retrying in Ns" countdown, try labels, "No reply" after each failure, and a shop that visibly calms from "Busy" to "Ready" so it is clear *why* waiting helps. The first version was rejected for fake timing and no explanation on screen.

The short version of the transactions example: two phones tap Buy on the last concert seat at the same moment; a lock snaps around the ticket; one phone shows "✓ Booked", the other's request waits at the lock, then comes back "Sold out". One conflict, clear actors, one unmistakable outcome, nothing happening too fast to follow.

## Rules

- Plain HTML, CSS and JavaScript only. CSS keyframes, the Web Animations API or `requestAnimationFrame` are all fine. Inline SVG and the occasional emoji are fine. No images, fonts or anything loaded from the web, no network, no storage, no `eval`, no access outside the frame. The validator rejects these.
- At most 25,000 characters of code in total. Keep the code readable; no need to minify.
- **Colours come only from the lesson's CSS variables**, so it works in light and dark mode: `--bg`, `--bg-2`, `--fg`, `--muted`, `--card`, `--card-2`, `--hairline`, `--hairline-2`, `--glass`, `--glass-2`, `--brand`, `--brand-fg`, `--green`, `--green-bg`, `--red`, `--red-bg`, `--amber`, `--amber-bg`, `--violet`. Fonts: `var(--sans)` and `var(--mono)`. Leave the page background transparent.
- **Fill the frame.** It is 100% of the lesson column wide (about 320 px on phones, up to 860 px on desktops) and `height` pixels tall (180 to 440, default 300). Lay things out with flexbox or percentages so it works at every width; keep the key action centred.
- **Reduced motion:** under `@media (prefers-reduced-motion: reduce)`, stop animating and show the key moment as a still frame.
- The code runs once when the frame loads. Start the loop yourself.

## Format

```json
"animation": {
  "title": "Three taps, one charge",
  "alt": "A phone shows a Pay ₹500 button. A finger taps it three times quickly. Three requests fly to the bank, but only one 'Debited ₹500' message comes back, and the balance drops once.",
  "caption": "Repeat the same request as often as you like; it only counts once.",
  "height": 300,
  "html": "<div class=\"scene\">…</div>",
  "css": ".scene { … }",
  "js": "…"
}
```

- `title` at most 10 words, in everyday language.
- `alt` (at most 60 words) describes what happens, for people who can't see it.
- `caption` (optional, at most 25 words) is the one-line takeaway under the animation.

When done, validate if `node` is available: `node <skill>/scripts/validate.mjs <lesson-dir>/lesson.json <lesson-dir>/concept-map.json` (leave out the map if there is none). If an animation keeps failing the checks, remove that concept's `animation` rather than weakening it; the page will show the `visual` instead.
