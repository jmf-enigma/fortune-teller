# I Ching Three-Coin Casting (`iching`) — 0.6.0

This route records six bottom-up line values, identifies the primary and transformed hexagrams, and applies one transparent project-authored structural selection protocol. It does not bundle the Judgment, Image, Ten Wings, 384 line texts, or a validated forecasting method.

## Actual support

- a focused question up to 1,000 characters;
- six user-supplied values `6/7/8/9` in bottom-to-top order, or a local three-coin cast;
- secure local randomness or user-supplied replay seed;
- explicit changing-line positions;
- primary/transformed lines, upper/lower trigrams, names and King Wen numbers;
- one frozen selector for zero, one, two-to-five, or all changing lines;
- line stage, centrality, positional correctness and correspondence;
- result-first current structure → selected change stages → transformed structure.

The current coin profile is tails `2`, heads `3`, summed independently for each line. Other casting probabilities are not silently substituted.

## Result-first use

```js
import { calculate, adjudicateIChing, adjudicate } from "../../src/index.mjs";

const calculation = calculate("iching", {
  question: "未来四周我该如何调整这次合作？",
});

const result = adjudicateIChing(calculation);
// or adjudicate(calculation)
```

The adjudicator first reconstructs the selector from the six frozen line values. It then explains inner/lower and outer/upper trigram processes, the exact selected stages, and the transformed direction. All wording is a bounded project-authored process prompt, not a quotation from the classic.

## Frozen changing-line protocol (`R-YJ-005`)

The release fixes one transparent protocol so the model cannot pick whichever line gives the smoothest answer:

- **0 changing:** read the primary whole only; do not invent a focal line;
- **1 changing:** use that one stage as the change focus, with both whole-hexagram contexts retained;
- **2–5 changing:** preserve every changing stage in bottom-up order and leave them parallel/unranked;
- **all six, all 9:** mark `use_nine`, but do not invent the unbundled 用九 text;
- **all six, all 6:** mark `use_six`, but do not invent the unbundled 用六 text;
- **all six, mixed old Yin/Yang:** preserve all six stages, without borrowing 用九/用六 or inventing a main line.

This selector is a declared local policy for consistent structural reflection, not a claim that it settles all historical schools.

## Centrality, position and correspondence

For each line, the engine records:

- whether it is line 2 or 5 (`central`);
- whether Yang occupies an odd position or Yin an even position (`correct_position`);
- whether the 1↔4, 2↔5 or 3↔6 counterpart has opposite polarity (`correspondence`).

These are unscored checks. The adjudicator may use them to ask where a stage is centered, appropriately placed or connected; it may not add them into a fortune score or automatically call a line auspicious/inauspicious.

## Numbered rules

### R-YJ-001 — bottom-up line order

Position 1 is the bottom and position 6 the top. Reversing display order may not reverse interpretation positions.

### R-YJ-002 — only 6 and 9 change

`6` changes Yin→Yang; `9` changes Yang→Yin; `7` and `8` remain. The transformed pattern must flip exactly the indexed lines.

### R-YJ-003 — hexagram identity

The first three bottom-up lines form the lower trigram and the last three the upper trigram; the local table supplies number and name.

### R-YJ-004 — cast provenance

Keep user-supplied, secure-random and seeded modes distinct. Replay describes reproducibility, not supernatural selection.

### R-YJ-005 — frozen selection and structure

Apply the exact 0/1/2–5/all-changing protocol and preserve centrality, position and correspondence without weighting or main-line invention.

## Classic-text refusal

The package deliberately records:

```text
judgment_texts: not_packaged
line_texts_384: not_packaged
special_use_nine_six_texts: not_packaged
```

Therefore the Agent must not quote, paraphrase as quotation, or attribute a Judgment or line text from model memory. A future text module would need an edition, licensing review, exact mapping, selection policy and fixtures before release.

## Source and school boundary

`SRC-YJ-ZHOUYI-WIKISOURCE` supplies historical provenance for the sixty-four identities, names and bottom-up line structure. It does not establish the project's random probabilities, structural selector, commentary or concrete outcomes. The selector and process prompts are local, independently authored policies.

## Explicit refusals

- no yarrow-stalk substitution, 纳甲, 六亲, 六神, 世应, 空亡 or month/day strength;
- no medical, pregnancy, death, crime, legal, investment or relationship verdict;
- no event date, odds, guilt, fidelity or private-mind inference;
- no redraw because the first answer is unwelcome;
- no cross-system “agreement” as empirical confirmation.

Same-question follow-ups reuse the frozen cast. A materially new question requires an explicitly new cast.
