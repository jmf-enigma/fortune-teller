# Tarot (`tarot`) — 0.6.0

The Tarot route freezes one focused question, one registered spread and one 78-card Rider–Waite–Smith naming-profile draw. The model explains that frozen draw; it never selects cards, redraws until favourable, or treats a pattern count as a vote.

## Actual support

- question text up to 1,000 characters;
- `one`, `three`, `situation-action-outcome`, `decision`, and `celtic-cross` spreads with fixed positions and groups;
- 78 stable card IDs and Chinese/English titles;
- upright/reversed orientation when enabled;
- user-supplied cards, secure local random draw, or user-supplied replay seed;
- full structural card metadata: major/minor arcana, number, suit, Chinese suit label, rank, rank order and court status;
- spread provenance and one fact per declared position;
- composition totals, suit/rank distributions, major-card positions and adjacent transitions;
- result-first synthesis that preserves every position and ends with a controllable action.

No artwork, copyrighted modern guidebook, arbitrary deck or custom spread array is bundled.

## Result-first route

```js
import { calculate, adjudicateTarot, adjudicate } from "../../src/index.mjs";

const calculation = calculate("tarot", {
  question: "未来四周我该怎样推进这次合作？",
  spread: "situation-action-outcome",
});

const result = adjudicateTarot(calculation);
// or adjudicate(calculation)
```

The adjudicator checks a complete structural replay before interpreting. For every card it binds:

```text
declared position and function
  -> exact card and orientation
  -> exact registered card-orientation axis
  -> suit + rank only as non-overriding helpers for Minor Arcana
  -> position-specific role question
```

Only after every position is bound does it add composition, repeated suits/ranks and adjacent transitions.

## Spread-specific conclusion

- `one`: one focus, not a yes/no oracle;
- `three`: background → present → conditional continuation if current behaviour remains;
- `situation-action-outcome`: situation → most controllable action → conditional outcome;
- `decision`: requirements of option A, requirements of option B, then a decision criterion; it explicitly does **not** pick A or B;
- `celtic-cross`: present/challenge, supporting groups, self-position and a conditional outcome, not ten disconnected keywords.

“Future” and “outcome” are role labels, not factual forecasts.

## Composition without voting

The engine records:

- major/minor count and major positions;
- upright/reversed count;
- suit counts;
- rank counts;
- adjacent arcana, orientation and suit relations.

The adjudicator may call a repeated suit a domain emphasis or a repeated rank a repeated development stage. It may not say that two cards “vote yes,” that a majority predicts success, or that more Major Arcana means a bigger destined event. All-upright is not all favourable; all-reversed is not all bad.

## Orientation boundary

Upright means a more direct expression inside the local axis, not automatic luck. Reversed means blocked, internalized, delayed or excessive expression, not punishment or inevitable failure. When reversals are disabled, no reversal meaning may be added.

## Frozen question and provenance

`facts.mode` distinguishes user-supplied and local draw. The calculation also records whether randomness was secure or seeded. Provenance describes how the cards were selected; it does not prove psychic selection or accuracy.

Same-question follow-ups reuse the draw. A materially new question requires an explicit new reading. User dissatisfaction alone is never a reason to redraw.

## Numbered rules

### R-TR-001 — position before card

Every card must be read through its registered position. A true card fact in the wrong role is not supporting evidence.

### R-TR-002 — orientation selects the bounded branch

Use the returned upright/reversed branch as a reflective lens and preserve the declared reversal profile.

### R-TR-003 — multi-card synthesis without votes

Preserve every position and contradiction. Composition, repetition and adjacency can describe structure only; none creates a score, winner or accuracy boost.

### R-TR-004 — draw provenance is visible

Keep user-supplied, secure-random and seeded modes distinct. Replay is an integrity feature, not supernatural evidence.

## Source boundary

`SRC-TR-WAITE-WIKISOURCE` supplies historical provenance for card identity and bounded orientation vocabulary. It does not prescribe these spreads, validate outcomes, or make project-authored axes quotations from Waite. Modern copyrighted interpretations and artwork are not copied.

## Explicit refusals

Never use this route to:

- choose a winner in a decision spread;
- guarantee a future event, date, probability or yes/no answer;
- reveal another person's private thoughts, fidelity, guilt, sexuality, consent or location;
- diagnose illness or pregnancy, predict death/crime, or direct a legal/financial action;
- turn repeated cards, suits, ranks or orientation into a vote;
- redraw until the answer is welcome;
- claim that another system's agreement validates the Tarot result.
