# Meihua Yishu Two-Number Preview (`meihua`) — 0.5.0

This route implements one narrow, deterministic two-number convention with body/use, mutual hexagram and before/after Five-Element relation. It remains a preview: it is not a general Meihua engine and does not supply seasonal strength, external omens or timing.

## Actual support

- two positive safe integers;
- moving line derived from the two numbers; explicit override is rejected;
- optional focused question;
- one-based modulo-eight trigram mapping in the fixed `乾兑离震巽坎艮坤` order;
- first number → upper trigram, second → lower trigram;
- default moving line from one-based modulo six of the sum;
- primary and one-line transformed hexagrams;
- body/use: the half containing the moving line is 用, the other is 体;
- mutual hexagram: original lines 2–4 form the lower mutual trigram and lines 3–5 the upper;
- Five-Element body/use relation before and after change;
- deterministic replay from the exact numbers, moving-line choice and profile.

The model must not choose convenient numbers or secretly derive them from the current time after seeing the desired answer.

## Result-first use

```js
import { calculate, adjudicateMeihua, adjudicate } from "../../src/index.mjs";

const calculation = calculate("meihua", {
  first_number: 17,
  second_number: 29,
  question: "这次合作下一步该如何推进？",
});

const result = adjudicateMeihua(calculation);
// or adjudicate(calculation)
```

The ordinary result gives:

1. body and use trigrams/elements and their initial relationship;
2. a plain-language capacity-versus-matter explanation;
3. the moving-line stage;
4. the mutual-hexagram inner/outer process;
5. the transformed body/use relationship;
6. one small reversible action and explicit timing boundary.

## Body/use and Five-Element relation (`R-MH-005`)

The fixed assignment is:

```text
moving line in lower trigram -> lower is Use, upper is Body
moving line in upper trigram -> upper is Use, lower is Body
```

The engine records one of five directional relations:

- `use_generates_body` / 用生体: external matter supports self/capacity;
- `body_generates_use` / 体生用: self/capacity invests into the matter;
- `use_controls_body` / 用克体: external conditions constrain self/capacity;
- `body_controls_use` / 体克用: self/capacity can act on the matter;
- `same_element` / 体用比和: similar rhythm, which may coordinate or stagnate.

These are direction labels, not automatic 吉/凶. The adjudicator repeats the same relation calculation after changing the emitted moving line and reports what changed. It does not score the relation or turn it into a guaranteed outcome.

## Mutual hexagram

The mutual structure uses the declared extraction rule:

- lower mutual trigram = primary lines 2, 3, 4;
- upper mutual trigram = primary lines 3, 4, 5.

For pure 乾 or pure 坤, the registered source says they have no direct mutual structure and the profile therefore extracts lines 2–4 and 3–5 from the transformed hexagram instead. The result is an intermediate process lens, not a hidden event or omen.

## Numbered rules

### R-MH-001 — one-based modulo eight

Multiples of eight map to 8, not 0, under the fixed trigram order.

### R-MH-002 — first upper, second lower

The assignment is explicit and profile-specific, not universal across every lineage.

### R-MH-003 — moving-line formula freezes before reading

Use the explicit line if supplied; otherwise one-based modulo six of the number sum. Do not change formulas after seeing the result.

### R-MH-004 — flip exactly one line

The transformed hexagram changes only the emitted moving line.

### R-MH-005 — body/use, mutual and relation route

Use only the emitted body/use assignment, fixed mutual extraction and unscored Five-Element direction before/after change. No occurrence time means no seasonal strength or timing.

## Timing and seasonal refusal

This profile records no occurrence time. Consequently:

- `seasonal_strength_applied` is false;
- body/use旺衰 is unavailable;
- no 应期 date, interval, probability or event certainty is returned;
- time, date, character count, sound, object, direction and external omen casting are unavailable.

The Agent must not append the current time after the calculation or borrow timing rules from another Meihua lineage.

## Source and school boundary

`SRC-MH-MEIHUA-WIKISOURCE` supplies historical method provenance, with edition/attribution limitations, for the bounded two-number, body/use, mutual-hexagram and directional Five-Element route. The local profile, formulas and plain-language axes remain explicit project implementation choices. No source prose, case library or modern commentary is bundled, and source provenance does not establish predictive validity.

## Explicit refusals

- no hidden time/object/omen number source;
- no unregistered upper/lower, modulo, moving-line, body/use or mutual rule;
- no seasonal旺衰, external response or 应期 without the required fixed profile and facts;
- no medical, pregnancy, death, crime, legal/financial or private-mind conclusion;
- no claim that deterministic replay means empirical accuracy;
- no cross-system vote or “confirmation.”
