# Meihua Yishu Two-Number Preview (`meihua`)

Use this reference only after the live method registry confirms that `meihua` is available and the user explicitly accepts its `preview` status. The engine implements one narrow, deterministic two-number convention. It is not a general Meihua Yishu engine and does not validate forecasting.

## Actual support

The engine currently supports:

- two positive safe integers: `first_number` and `second_number`;
- optional user-supplied `moving_line` from 1 through 6;
- optional question text stored with the input;
- one-based modulo-eight trigram mapping in the declared order;
- first number mapped to the upper trigram and second number to the lower trigram;
- default moving line from one-based modulo six of `first_number + second_number`;
- primary hexagram from lower lines followed by upper lines;
- transformed hexagram by flipping the selected moving line;
- local trigram and King Wen number/name facts;
- deterministic replay from the same numbers and profile.

The current profile is:

```text
trigram_order: qian-dui-li-zhen-xun-kan-gen-kun
modulo_zero_maps_to_last: true
```

This method does not use randomness. The numbers must come from the user or a predeclared external procedure, not be selected by the model after considering the desired result.

## Not currently supported

Do not imply support for:

- time-based, date-based, character-count, sound, object, direction, or environmental casting;
- changing the upper/lower assignment or formula through an unregistered school profile;
- body/use (`体用`) designation or interpretation;
- mutual/nuclear hexagrams, opposite/reversed hexagrams, or additional derived structures;
- Five-Element generation/overcoming adjudication, seasonal strength, external/internal response, timing, or event outcome;
- multiple moving lines;
- a full Meihua commentary corpus, classical quotations, or modern copyrighted interpretations;
- predictive validity or certainty.

If the user requests time-based Meihua, say that it is not implemented in this preview. Do not convert the current time into hidden numbers.

## Reading the result envelope

Read:

- `facts.mode`: `two-number-casting`;
- `facts.upper_trigram` and `facts.lower_trigram`: fact IDs, binary keys, number, name, symbol, image, and element labels;
- `facts.moving_line`: fact ID and one-based position from the bottom;
- `facts.primary` and `facts.transformed`: fact IDs, King Wen number/name, trigrams, and bottom-up lines;
- `input.first_number`, `input.second_number`, and `input.moving_line_supplied`;
- optional `input.question`;
- `profile.trigram_order` and `profile.modulo_zero_maps_to_last`;
- warnings declaring preview status and missing time/body-use/timing functionality.

Facts are deterministic under this one convention. Determinism means reproducibility, not empirical accuracy.

## Numbered rule templates

### R-MH-001 — One-based modulo preserves the last value

- `type`: traditional, implementation-specific
- `source_status`: verified
- `source_ids`: `SRC-MH-MEIHUA-WIKISOURCE`
- `requires`: cited upper- and lower-trigram facts; both mandatory fact groups are checked, together with the input numbers and declared profile
- `rule`: Map a positive integer to `1..8`; a multiple of 8 maps to 8 rather than 0. Use the profile order `乾兑离震巽坎艮坤`.
- `allowed`: audit the returned trigram number from the exact input.
- `forbidden`: switch to zero-based modulo or another trigram order after seeing the result.

### R-MH-002 — First is upper; second is lower

- `type`: traditional, profile-specific
- `source_status`: verified
- `source_ids`: `SRC-MH-MEIHUA-WIKISOURCE`
- `requires`: cited upper- and lower-trigram fact IDs; both mandatory fact groups are checked, together with both inputs
- `rule`: Under this profile only, `first_number` selects the upper trigram and `second_number` the lower trigram.
- `allowed`: report the selected trigrams and construct the primary lines lower-first.
- `forbidden`: claim that this assignment is universal across all Meihua schools.

### R-MH-003 — Moving-line formula is fixed before interpretation

- `type`: traditional, profile-specific
- `source_status`: verified
- `source_ids`: `SRC-MH-MEIHUA-WIKISOURCE`
- `requires`: `facts.moving_line` and `input.moving_line_supplied`
- `rule`: If the user did not supply a moving line, compute one-based modulo six of the two-number sum. If supplied, preserve the value 1–6.
- `allowed`: disclose whether the line was supplied or derived.
- `forbidden`: recompute with another formula to obtain a preferred transformed hexagram.

### R-MH-004 — Transformation flips exactly one returned line

- `type`: calculation guard with traditional downstream use
- `source_status`: engine_documented
- `requires`: cited primary, transformed, and moving-line facts; all three mandatory fact groups are checked
- `rule`: Flip only the one-based moving line from the bottom; all other lines remain unchanged.
- `allowed`: verify primary-to-transformed consistency.
- `forbidden`: add multiple changes or attach body/use, timing, or outcome rules absent from the engine.

## Source status and school differences

- `SRC-MH-MEIHUA-WIKISOURCE` provides checked historical provenance, with recorded edition/attribution limitations, for the eight-remainder trigram indexing, six-remainder moving-line indexing, and upper/lower assignment used by R-MH-001 through R-MH-003. It does not validate outcomes or expand the preview beyond its registered two-number profile.
- The exact local table, transformation implementation, and profile ID remain project implementation details. R-MH-004 is therefore `engine_documented` and carries no external source ID.
- A registered source does not verify an unchecked quotation, commentary, chapter, page, edition claim, or model-authored paraphrase. Do not invent any of these.
- Upper/lower assignment, modulo convention, number source, moving-line formula, body/use, and timing methods can differ by lineage or practitioner. Only the explicit current profile is supported.
- Trigram/hexagram names come from the package's local table. They do not authorize quoting Zhouyi text or a modern commentary.
- Preview status is a software-maturity statement, separate from the unvalidated predictive status of the tradition.

## Evidence/audit example — not the ordinary answer

> **计算事实**：按 `meihua-two-number-v1`，第一个数映射为上卦 `F-MH-T01`，第二个数映射为下卦 `F-MH-T02`；`F-MH-L01` 记录由固定公式得到或用户明确提供的动爻。
>
> **范围**：这只是两数起卦的可复现结构。当前引擎没有体用、五行生克或应期模块，因此不会据此下吉凶和时间结论。
>
> **可继续**：可以查看两个数字如何逐步映射为本卦与变卦，或把两者作为反思性对照。

## Prohibited overreach

Never:

- silently derive inputs from the current time, random numbers, name-stroke counts, sounds, directions, or observed objects;
- add body/use, Five-Element, timing, favorable/unfavorable, or event-outcome analysis from model memory;
- describe one narrow convention as complete Meihua Yishu;
- use the result for diagnosis, pregnancy, death, crime, legal/financial action, or certainty about another person;
- fabricate a classical quotation, lineage, page reference, or success rate;
- hide preview status or conflate deterministic replay with predictive validity.
