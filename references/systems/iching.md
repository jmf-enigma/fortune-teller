# I Ching Three-Coin Casting (`iching`)

Use this reference only after the live method registry confirms that `iching` is available. The engine records six user-supplied or locally cast lines, derives a primary and transformed hexagram, and returns King Wen number/name metadata. It does not include judgment or line-text interpretation and does not validate forecasting.

## Actual support in v0.1.0

The engine currently supports:

- a focused question of at most 1,000 characters;
- six user-supplied line values in bottom-to-top order;
- line values `6`, `7`, `8`, and `9` only;
- local three-coin casting with independent binary coin outcomes;
- coin values tails `2`, heads `3`, summed for each line;
- secure-random casting without a seed or deterministic replay casting with a supplied seed;
- explicit moving-line indices;
- primary and transformed line patterns;
- upper/lower trigrams, trigram symbols/images/elements, King Wen number, and hexagram name from the local mapping table;
- draw provenance, algorithm description, and seed commitment when available.

The current profile is:

```text
coin_values: tails 2, heads 3
line_order: bottom-up
```

## Not currently supported

Do not imply support for:

- yarrow-stalk probabilities or any casting method other than the implemented fair three-coin method;
- hexagram judgments, Image text, line texts, traditional commentaries, translations, or edition-critical variants;
- nuclear/mutual, opposite, reversed, interlocking, or other derived hexagrams;
- Na Jia, Six Relatives, Six Spirits, stems/branches, voids, month/day strength, or Liu Yao adjudication;
- Meihua time/number casting through this method;
- outcome certainty, event timing, medical/legal/financial conclusions, or empirical prediction;
- automatic selection of a changing-line interpretation rule when several schools differ.

## Reading the result envelope

Read:

- `facts.mode`: `user-supplied` or `local-three-coin-cast`;
- `facts.lines[]`: fact ID, bottom-up position, numeric value, and line type;
- `facts.changing_lines`: one-based positions from the bottom;
- `facts.primary`: fact ID, King Wen number/name, upper/lower trigrams, and bottom-up Boolean lines;
- `facts.transformed`: the same fields after changing each `6` or `9` line;
- `input.question` and `input.lines_supplied`;
- `profile.coin_values` and `profile.line_order`;
- `meta.rng`: source mode, algorithm, commitment, and replay metadata when present;
- the warning that interpretation is a traditional reflective practice, not a validated forecast.

The Boolean line arrays represent Yang as `true` and Yin as `false`. Do not expose this implementation detail as a separate divinatory meaning.

## Numbered rule templates

### R-YJ-001 — Lines are ordered from bottom to top

- `type`: traditional, profile-specific
- `source_status`: engine_documented
- `requires`: all six `facts.lines[].fact_id` and `profile.line_order=bottom-up`
- `rule`: Position 1 is the bottom line and position 6 is the top line. Preserve this order in any display or explanation.
- `allowed`: “第 2 爻自下而上计数。”
- `forbidden`: reverse the list for presentation and then interpret the reversed positions as original facts.

### R-YJ-002 — Six and nine change; seven and eight remain

- `type`: traditional
- `source_status`: engine_documented
- `requires`: line values and `facts.changing_lines`
- `rule`: `6` is old Yin changing to Yang; `9` is old Yang changing to Yin; `7` and `8` remain Yang and Yin respectively in this profile.
- `allowed`: verify that the transformed Boolean pattern flips exactly the indexed changing lines.
- `forbidden`: invent a changing line not present in the frozen cast.

### R-YJ-003 — Hexagram identity follows the local King Wen mapping

- `type`: traditional, implementation mapping
- `source_status`: engine_documented
- `requires`: `facts.primary` or `facts.transformed` fact ID and both trigram keys
- `rule`: The first three bottom-up lines form the lower trigram; the last three form the upper trigram; the local table maps that pair to a King Wen number/name.
- `allowed`: report number, name, trigrams, and line pattern as calculation facts.
- `forbidden`: quote a judgment or line text that is not bundled and verified.

### R-YJ-004 — Casting provenance is part of the evidence

- `type`: audit guard
- `source_status`: engine_documented
- `requires`: `facts.mode` and `meta.rng`
- `rule`: State whether the lines were user-supplied, secure-random, or seeded. The RNG mechanism explains reproducibility, not supernatural selection.
- `allowed`: replay with the retained user seed and compare the complete cast.
- `forbidden`: let the model choose line values, redraw until favorable, or claim a commitment proves divinatory accuracy.

## Source status and tradition differences

- Trigram data, line transformations, King Wen numbering, and hexagram names are local implementation tables with `engine_documented` status.
- No verified edition of the Zhouyi, Ten Wings, judgment text, line text, commentary, translation, chapter, or page is bundled here. Do not fabricate or quote one from model memory.
- Three-coin, yarrow-stalk, and other casting practices have different probability structures. This engine implements only the declared three-coin profile.
- Traditions differ on how to prioritize multiple changing lines and how to relate primary and transformed hexagrams. Because no such interpretive selector is implemented, do not silently choose one.
- Ancient names may be public-domain material, but modern translations and commentary can be copyrighted. Do not reproduce them without a supplied, authorized source.

## Safe output example

> **起卦事实**：六爻按自下而上记录；实际动爻位置只从 `facts.changing_lines` 读取，并回查相应 `F-YJ-L*` 的数值。`F-YJ-H01` 与 `F-YJ-H02` 分别保存本卦和变卦的卦名、序号与上下卦。
>
> **解释边界**：当前包没有收录卦辞、爻辞或多动爻取用规则，因此我可以展示结构与提出反思问题，但不会伪造经典原文或给出确定事件预测。
>
> **反思问题**：问题中哪些部分是现状，哪些部分确实处在变化中？这是一种对照框架，不是预测证据。

## Prohibited overreach

Never:

- quote or paraphrase a named translation as if it were bundled;
- turn a hexagram name into a medical, pregnancy, death, crime, legal, investment, or relationship verdict;
- infer dates, odds, guilt, fidelity, or another person's thoughts;
- mix I Ching three-coin facts with Liu Yao/Na Jia rules that this engine did not calculate;
- hide the casting mode or change line order after seeing the result;
- call agreement with another method cross-validation or empirical confirmation.
