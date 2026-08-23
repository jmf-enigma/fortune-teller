# Tarot (`tarot`)

Use this reference only after the live method registry confirms that `tarot` is available. The engine records a user-supplied or local draw from a 78-card Rider–Waite–Smith naming profile and attaches short local keyword prompts. It does not forecast events or choose cards through model intuition.

## Actual support in v0.1.0

The engine currently supports:

- a focused question of at most 1,000 characters;
- these exact spreads and positions:
  - `one`: focus;
  - `three`: past, present, future;
  - `situation-action-outcome`;
  - `decision`: option A, option B, decision lens;
  - `celtic-cross`: ten declared positions;
- 78 card IDs with English and Chinese titles, plus concise English local keyword summaries;
- upright and reversed orientation when `profile.reversals=true`;
- user-supplied physical/manual cards, requiring exactly one non-duplicated card per position;
- local secure random draw when no seed or cards are supplied;
- deterministic seeded draw when the user supplies a replay seed;
- an RNG mode, algorithm description, and seed commitment when available;
- a distinct fact ID for every drawn card and position.

The current profile is:

```text
deck: rider-waite-smith-names
reversals: true | false
```

The language model must never choose the card outcome. It may only explain the frozen draw returned by the engine.

## Not currently supported

Do not imply support for:

- card images, scans, Rider–Waite–Smith artwork, or copyrighted guidebook text;
- Marseille, Thoth, oracle decks, Lenormand, custom decks, duplicate-card decks, or multi-deck draws;
- arbitrary custom position arrays outside the registered spreads;
- timing algorithms, yes/no certainty, spirit communication, psychic revelation, or prediction accuracy;
- discovering another person's thoughts, fidelity, guilt, health, location, or intentions;
- empirical decision quality or a validated probability estimate;
- a verified bibliography for each keyword string.

## Reading the result envelope

Read:

- `facts.mode`: `user-supplied` or `local-draw`;
- `facts.cards[]`: `fact_id`, position, card ID/title, Chinese title, orientation, keyword reference, and keyword status;
- `input.question`, `input.spread`, and `input.cards_supplied`;
- `profile.reversals`;
- `meta.rng`: draw mode, algorithm, seed commitment, and replay metadata when present;
- `meta.deck_size`;
- `meta.card_keyword_references[]`: project-authored reflective prompts keyed by `card_id` and orientation; these are deliberately outside calculation facts;
- `warnings`: keyword prompts are not validated predictions.

Each `meta.card_keyword_references[].prompt` is a short local project summary. It is not a quotation or a complete card meaning. Preserve the matching fact card's assigned spread position when explaining it, and do not relabel the prompt itself as a `calculation_fact`.

## Numbered rule templates

### R-TR-001 — Position scopes the prompt

- `type`: traditional
- `source_status`: engine_documented
- `requires`: a card `fact_id`, its `position`, and the selected spread
- `rule`: Discuss the card only through the question posed by its registered position. Position labels structure reflection; they do not establish a timeline as fact.
- `allowed`: “行动位可以提示你检查哪些可控行动。”
- `forbidden`: “结果位证明这件事一定会发生。”

### R-TR-002 — Orientation selects the local keyword branch

- `type`: traditional, profile-specific
- `source_status`: engine_documented
- `requires`: the fact card's `orientation`, the same-card prompt in `meta.card_keyword_references`, and `profile.reversals`
- `rule`: When reversals are enabled, use the returned upright/reversed keyword branch exactly. When disabled, do not invent reversal meaning.
- `allowed`: treat the keyword as one possible reflective lens.
- `forbidden`: treat reversal as bad luck, punishment, diagnosis, or inevitable failure.

### R-TR-003 — Multi-card synthesis must preserve every position

- `type`: traditional interpretive template
- `source_status`: engine_documented
- `requires`: two or more card fact IDs from one frozen draw
- `rule`: Compare themes while preserving position, orientation, and contradictory prompts. A synthesis is a model interpretation, not a calculated fact.
- `allowed`: identify a tension between two prompts and ask which better matches observable circumstances.
- `forbidden`: discard an inconvenient card or rewrite positions to create a smoother prophecy.

### R-TR-004 — Draw provenance precedes interpretation

- `type`: audit guard
- `source_status`: engine_documented
- `requires`: `facts.mode` and `meta.rng`
- `rule`: State whether cards were user-supplied, secure-random, or seeded. A commitment can verify a retained seed but does not prove supernatural selection.
- `allowed`: replay a seeded draw only when the user retains or supplies the seed.
- `forbidden`: expose/store a private seed unnecessarily, claim model intuition selected the cards, or redraw until a preferred answer appears.

## Source status and tradition differences

- Deck names follow the declared Rider–Waite–Smith naming profile. Images and original guidebook passages are not included.
- Keyword strings are local, concise interpretive references and have `engine_documented` status. They must not be represented as quotations from A. E. Waite, Pamela Colman Smith, a modern author, or a named school.
- Reversal use, spread positions, elemental correspondences, timing, and card combinations vary among readers. Only `reversals` and the registered spreads are implemented here.
- Do not copy modern copyrighted card descriptions or web readings. Write a short original paraphrase tied to the returned keyword and evidence card.
- Traditional provenance does not establish predictive validity.

## Safe output example

> **抽取事实**：如果冻结结果中 `F-TR-001.position=action`，则牌名、方向和关键词均须从同一张事实记录读取。
>
> **反思性解释**：可以把该关键词改写成一个问题：“在我能控制的行动里，哪一步需要更多准备？”这不是未来事件的保证。
>
> **抽取来源**：本次为本地安全随机；这说明抽取机制，不代表超自然准确性。

## Prohibited overreach

Never:

- use tarot to diagnose illness, determine pregnancy, predict death, identify a criminal, or direct a legal/financial action;
- claim certainty about another person's fidelity, thoughts, sexuality, motives, or consent;
- redraw because the first result is unwelcome unless the user deliberately starts a new, separately labeled reading;
- describe a seeded or secure-random draw as psychic selection;
- turn “future” or “outcome” position labels into factual forecasts;
- quote or closely imitate copyrighted guidebook prose;
- fabricate a card source, artist statement, historical attribution, or accuracy rate.
