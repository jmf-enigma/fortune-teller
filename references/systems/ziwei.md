# Zi Wei Dou Shu (`ziwei`)

Use this reference only after the live method registry confirms that `ziwei` is available. The engine builds a compact natal chart and, with an exact birth time plus explicit `target_date`, calculation-only decadal/yearly facts through `iztro`. It also emits machine-bound reading units for five supported topics, so a deep reading can be checked against one complete palace structure instead of being improvised from an unstructured star list. It does not include a validated forecasting system or a free-form event-prediction engine.

For a `standard` or `deep` interpretation, also read [ziwei-reading-map.md](ziwei-reading-map.md). For the meaning of “accurate” and the current review boundary, read [accuracy-evaluation.md](../accuracy-evaluation.md) and [PROFESSIONAL_COVERAGE.md](../../docs/PROFESSIONAL_COVERAGE.md).

## Actual support

The engine currently supports:

- release-tested Gregorian dates from 1900-01-01 through 2100-12-31; dates outside this range fail closed;
- Gregorian civil input in `YYYY-MM-DD`, with an exact local time or no time;
- IANA timezone validation with explicit daylight-saving disambiguation;
- normalized `input.time_precision` provenance (`minute`, `second`, or `unknown`), checked against the supplied clock syntax;
- an explicit binary `chart_sex` calculation parameter required by the installed traditional algorithm;
- an immutable `calendar_day_basis: birthplace-civil` convention;
- civil time basis only;
- selected `iztro` configuration fields for year, horoscope, age, and day divisions;
- default or Zhongzhou algorithm profile;
- leap-month-fix configuration passed to the dependency;
- known-time natal summary and twelve compact palace records;
- optional explicit Gregorian `target_date` with a known birth time, returning the matching decadal and yearly palace mapping, age/year ranges, stars, transformations, and yearly cycle stars through the pinned `iztro` APIs;
- an auditable structural index for every palace's two trine palaces and opposite palace (三方四正), derived only from the complete twelve-palace cycle;
- a chart-wide index of every mutagen field actually returned by the pinned engine, with star and palace bindings;
- five machine-bound natal topic units under `facts.topic_units`: `overview` → 命宫, `career_study` → 官禄, `wealth_resources` → 财帛, `relationships` → 夫妻, and `wellbeing_rhythm` → 福德;
- for each supported topic, one primary-palace ID, its exact palace-relation fact ID, all four 三方四正 component-palace IDs, and only the natal mutagen fact IDs located inside that four-palace unit;
- 疾厄 as secondary context for `wellbeing_rhythm` only; it is not a standalone health-reading route and never authorizes diagnosis or prognosis;
- major, minor, and adjective star names, with major-star brightness retained when returned by the dependency;
- on `R-ZW-007/009`, registered fourteen-major-star same-palace combinations, brightness, 六吉六煞, 禄存 and 天马 conditions; the bounded result rule pack contains 24 major-star pairs, 14 natal context modifiers, and 11 period-star modifiers;
- with `target_date`, five `facts.phase_topic_units` that identify the selected topic, plus complete dynamic four-palace sets `[0,+4,+8,+6]` derived separately for decadal and yearly scopes by the closed layer;
- unknown-time sensitivity from a 60-second scan over every real instant of the named civil day, compressed into consecutive calculation-date/time-index regimes;
- daylight-saving gaps, overlaps, and skipped civil dates handled explicitly rather than by sampling nonexistent clock times;
- stability regime counts for soul star, body star, five-elements class, soul-palace branch, and body-palace branch;
- candidate palace signatures for audit without pretending that one candidate is the chart.

Supported profile fields include:

```text
calendar_day_basis: birthplace-civil
time_basis: civil
fix_leap_month: true | false
year_divide: normal | exact
horoscope_divide: normal | exact
age_divide: normal | birthday
day_divide: current | forward
algorithm: default | zhongzhou
```

Treat `chart_sex` as an algorithmic parameter. Do not infer it from a person's name, appearance, voice, pronouns, or identity.

The default civil-time profile is stable; the registered Zhongzhou profile is qualified. Mean/apparent-solar overrides are disabled because a correction can cross the declared birthplace-civil day while the current engine has only one calculation date. Do not emulate them by shifting the recorded clock.

The calendar day convention is profile-specific. For an admitted instant outside UTC+08:00, the engine still applies the declared birthplace-civil day and emits `CALENDAR_DAY_PROFILE_QUALIFIED`. That is an explicit overseas convention, not a claim that every Zi Wei lineage uses the same Chinese-calendar reference day. Preserve this warning in the preview, evidence cards, and audit; do not silently convert the recorded date to Beijing time or suppress the chart's qualified status.

`time_precision` records how the clock was written, not how accurately the birth was observed. A minute-precision input is normalized with zero seconds while retaining `time_precision: minute`.

## Not currently supported

Do not imply support for:

- direct lunar-date or leap-month user input; the current engine call is made with `type: solar`;
- nonbinary variants of the underlying traditional calculation parameter;
- birth-time rectification, automatic candidate ranking, or selection of a “most likely” palace chart;
- target-date monthly, daily, hourly, or minor-limit calculations; this release retains only decadal and yearly layers;
- a complete school-specific Sanhe, flying-transformations, Sihua, Zhongzhou, or complete Zi Wei judgment; only the five-topic bounded 24/14/11 result rule pack is implemented;
- event prediction, compatibility, remedies, auspicious timing, or causal claims;
- machine-bound deep synthesis for topics outside `overview`, `career_study`, `wealth_resources`, `relationships`, and `wellbeing_rhythm`; other palaces may appear as calculated context but do not become an unsupported deep-reading route;
- interpretation of stars, brightness, cycles, decadal labels, or age arrays as inevitable events;
- a verified classical bibliography for each `iztro` label.

The current interpretation profile is `automated_fixture_reviewed`. It has not received independent Zi Wei practitioner review, its professional label is not enabled, and its predictive validity is `not_established`.

If the user gives a lunar date, request a verified Gregorian conversion rather than passing it as a solar date.

## Reading the result envelope

### Known-time mode

Read:

- `facts.mode`: `known-time`;
- `facts.resolved_time` and `facts.time_index`;
- `facts.summary`: `solar_date`, `lunar_date`, `chinese_date`, `time`, `time_range`, zodiac/sign labels, soul/body stars, five-elements class, and soul/body-palace branches;
- `facts.palaces[]`: each palace's `fact_id`, index, name, body/original flags, stem, branch, stars, cycle labels, decadal data, and age arrays;
- `facts.structure.palace_relations[]`: the focus palace, two trine palaces, opposite palace, their fact IDs, and the exact index-offset derivation;
- `facts.structure.mutagen_locations[]`: only mutagens actually returned by the dependency, bound to a star group and palace;
- `facts.topic_units[]`: one auditable topic index with `primary_palace_id`, `relation_fact_id`, four `component_palace_ids`, and any in-unit `natal_mutagen_fact_ids`;
- when the request contains `target_date`, `facts.periods.target`, `facts.periods.decadal`, and `facts.periods.yearly`; the date is explicit, the date-only target-time policy is recorded, and every period star/transformation remains bound to a natal palace;
- when the request contains `target_date`, `facts.phase_topic_units[]` supplies the selected topic focus; the closed route then requires complete decadal and yearly dynamic four-palace sets, all registered period stars, and selected-topic-slot transformation IDs;
- `profile`: every calculation convention supplied to `iztro`;
- `warnings`: especially `CALENDAR_DAY_PROFILE_QUALIFIED` outside UTC+08:00.

Optional non-major star fields are absent when the dependency does not return them. Absence is not a negative interpretation. For a closed `R-ZW-007/009` natal major-star binding, preserve the emitted `brightness`; do not drop it from `star_in_palace`.

For a machine-bound deep reading, first select one supported `topic`, then cite its `topic_units` fact, primary palace, relation fact, and all four component palace facts. 三方四正 is an indivisible evidence group: citing only the favorable-looking palace, only the opposite palace, or any other subset is not a deep topic synthesis. A star claim must cite the actual palace fact containing that star. A transformation claim must cite the emitted mutagen fact whose star and palace match the sentence and whose ID belongs to the selected unit.

For a target-date phase, select the matching `phase_topic_units` record, then derive decadal and yearly complete dynamic palace sets in fixed `[0,+4,+8,+6]` order. Bind every registered period star with `period_star_in_slot`. Keep phase transformations limited to the selected topic dynamic slot; bind both decadal and yearly sets completely, require at least one item across them, and allow either individual set to be empty. Judge natal baseline → decadal environment → yearly trigger; do not mix topics or claim four-palace transformation convergence.

Every interpretive conclusion must state at least one observable condition that supports it and one that would weaken or contradict it. This is a reality check, not evidence that the chart predicts events.

### Unknown-time mode

Read:

- `facts.mode`: `unknown-time-sensitivity`;
- `facts.stable_summary[]`: each field's stable/time-sensitive status and alternatives with `regime_count` coverage;
- `facts.single_chart.status`: must remain `unavailable`;
- `sensitivity.candidate_count`, `probe_count`, `scan_resolution_seconds`, and `candidates[]`;
- each candidate's `civil_probe_range`, `civil_probe_count`, calculation date/time index, example resolved time, compact summary, and palace signature.

Candidate and probe counts describe scan coverage, not likelihood. Probe boundaries are resolution-bounded observations, not exact transition timestamps. On a daylight-saving transition day, do not assume there are 24 civil hours or a fixed theoretical set of clock samples.

Do not reconstruct full palace narratives from signatures or merge stars across candidates.

## Numbered rule templates

### R-ZW-001 — Read a star only in its resolved palace context

- `type`: traditional
- `source_status`: verified
- `source_ids`: `SRC-ZW-IZTRO-2.6.0`, `SRC-ZW-ZIWEI-QUANSHU`
- `requires`: a resolved palace/star entry under `facts.palaces`; derived palace-relation facts under `facts.structure` cannot by themselves authorize a star interpretation
- `rule`: Keep the star name, palace name/branch, profile, optional brightness/mutagen fields, and any emitted structural relation together. Do not interpret a star name detached from its calculated location.
- `allowed`: “在当前 profile 下，星 X 位于宫位 Y；其象征解释仍属传统框架。”
- `forbidden`: “星 X 单独证明现实事件 Z。”

### R-ZW-002 — Soul/body fields are symbolic chart labels

- `type`: traditional
- `source_status`: verified
- `source_ids`: `SRC-ZW-IZTRO-2.6.0`, `SRC-ZW-ZIWEI-QUANSHU`
- `requires`: `facts.summary.soul_star`, `body_star`, `soul_palace_branch`, or `body_palace_branch`
- `rule`: Use these fields only as declared symbolic labels within the installed calculation profile.
- `allowed`: present a bounded reflective theme with an evidence card.
- `forbidden`: infer identity, health, morality, intelligence, trauma, or inevitable life role.

### R-ZW-003 — Period arrays are not forecasts by themselves

- `type`: traditional, profile-specific
- `source_status`: verified
- `source_ids`: `SRC-ZW-IZTRO-2.6.0`
- `requires`: palace `decadal` or `ages` plus the exact age/year-division profile
- `rule`: Treat returned periods as calculated chart indexing. A concrete event claim requires a separately implemented, sourced, and audited rule that this engine does not provide.
- `allowed`: “该年龄范围被索引到此宫位。”
- `forbidden`: “这十年一定结婚/生病/发财。”

### R-ZW-004 — Unknown hour forbids a single-chart reading

- `type`: audit guard
- `source_status`: engine_documented
- `requires`: `facts.mode=unknown-time-sensitivity`
- `rule`: Use only explicit stability summaries or candidate-by-candidate audit. Keep the candidate denominator equal to the engine's actual count.
- `allowed`: “命宫地支在候选中有多个取值，因此本项不可定。”
- `forbidden`: choose one chart from biography matching, majority vote, or merge candidate palaces.

### R-ZW-005 — Target-date periods remain calculation structure

- `type`: calculation/traditional structure
- `source_status`: verified
- `source_ids`: `SRC-ZW-IZTRO-2.6.0`
- `requires`: an explicit `facts.periods.target` plus emitted decadal or yearly facts
- `rule`: Report the requested date, period range, focus mapping, stars, and transformations exactly as emitted. Do not convert them into auspiciousness or an event.
- `allowed`: “所选日期位于这个大限与流年结构中。”
- `forbidden`: “这个索引证明该年一定发生某事。”

### R-ZW-006 — Legacy three-layer phase structure remains non-interpretive

- `type`: calculation/traditional structure
- `source_status`: verified
- `source_ids`: `SRC-ZW-IZTRO-HOROSCOPE-GUIDE`
- `requires`: at least one material natal palace fact, one decadal fact, and one yearly fact from the same frozen calculation
- `rule`: Report that the frozen calculation contains all three layers, but do not synthesize an interpretive phase claim from arbitrary facts. Use R-ZW-009 and one emitted same-topic phase unit for bounded interpretation.
- `allowed`: “本次计算同时保留本命、大限与流年三层结构；尚未按同一主题完成解释绑定。”
- `forbidden`: any interpretive claim, cross-topic synthesis, event certainty, exact timing, or a one-star/one-transformation verdict.

### R-ZW-007 — One topic requires its complete machine-bound palace unit

- `type`: traditional bounded topic synthesis
- `source_status`: verified for provenance and method scope only
- `source_ids`: `SRC-ZW-IZTRO-2.6.0`, `SRC-ZW-IZTRO-PALACE-GUIDE`
- `requires`: one supported topic unit and all four component palaces, including every registered same-palace major-star combination, emitted major-star brightness, and present 六吉六煞/禄存/天马 condition
- `rule`: Treat the four palaces as one bounded evidence set. Prefer a registered same-palace combination over isolated single-star axes; treat context modifiers as conditions, not scores.
- `allowed`: a conditional topic-level reflection with one support, one constraint, and an observable countercondition.
- `forbidden`: partial 三方四正 citation, cross-topic substitution, a single-palace verdict, or an unsupported sixth topic.

### R-ZW-008 — A natal transformation must match topic, star, and palace

- `type`: traditional bounded transformation synthesis
- `source_status`: verified for provenance and method scope only
- `source_ids`: `SRC-ZW-IZTRO-2.6.0`, `SRC-ZW-IZTRO-MUTAGEN-GUIDE`
- `requires`: a selected natal topic unit with a non-empty `natal_mutagen_fact_ids`, the referenced transformation fact, and the palace fact containing its named star
- `rule`: The transformation ID must belong to the selected unit, and the wording must preserve its emitted transformation label, star, and palace.
- `allowed`: describe a conditional process lens such as access, responsibility, legibility, or friction while retaining the competing evidence in the four-palace unit.
- `forbidden`: attach a transformation to another star or palace, convert it into a good/bad score, or infer a guaranteed event.

### R-ZW-009 — Natal baseline, decadal environment, yearly trigger

- `type`: traditional bounded phase-topic synthesis
- `source_status`: verified for provenance and method scope only
- `source_ids`: `SRC-ZW-IZTRO-2.6.0`, `SRC-ZW-IZTRO-PALACE-GUIDE`, `SRC-ZW-IZTRO-HOROSCOPE-GUIDE`
- `requires`: one phase topic unit; complete decadal and yearly dynamic four-palace sets `[0,+4,+8,+6]`; every registered period star in both scopes; and both complete transformation sets from the selected topic dynamic slot, with at least one item across them
- `rule`: Judge natal baseline → decadal environment → yearly trigger. Period stars cover both dynamic four-palace sets; phase transformations cover only the selected topic dynamic slot. Formal criteria require natal focus axes + all decadal four-slot conditions + all yearly four-slot conditions + all selected-topic-slot processes, with no substitution.
- `allowed`: one bounded category-level phase theme over the exact joint-stability interval.
- `forbidden`: cross-topic mixing, omitted dynamic slots/stars, four-palace phase-transformation convergence, complete Zi Wei judgment, concrete events, or retrospective rewriting.

## Source status and school differences

- `SRC-ZW-IZTRO-2.6.0` verifies the pinned implementation provenance and the narrow returned-field scope used by R-ZW-001 through R-ZW-003 and R-ZW-005. This documents the implementation path, not predictive validity.
- `SRC-ZW-IZTRO-HOROSCOPE-GUIDE` supports the natal → decadal → yearly analysis order. R-ZW-006 uses it only to report the legacy three-layer structure; bounded phase interpretation requires R-ZW-009's exact same-topic unit. The guide is not empirical evidence or permission for guaranteed events.
- `SRC-ZW-IZTRO-PALACE-GUIDE` supports the target-palace plus complete 三方四正 method boundary used by R-ZW-007 and R-ZW-009. It does not validate a personality or event prediction.
- `SRC-ZW-IZTRO-MUTAGEN-GUIDE` supports keeping transformations attached to their actual star and palace under R-ZW-008. It does not supply a universal good/bad score or predictive evidence.
- `SRC-ZW-ZIWEI-QUANSHU` supplies historical provenance for bounded palace/star and soul/body terminology under R-ZW-001 and R-ZW-002. The registry records the host documentation's warning that the material can be exaggerated or internally inconsistent; it is not empirical evidence or permission for literal forecasting.
- The pinned `iztro` bundle runs in a private local VM realm, so unrelated same-process `iztro` plugins or global configuration cannot alter the Fortune Teller chart.
- A source entry verifies only its declared provenance and scope. It does not make an unchecked edition, quotation, commentary, chapter, page, or model-authored paraphrase verified.
- `default` and `zhongzhou`, division settings, leap-month fixing, time basis, birthplace-civil calendar-day basis, and day handling are material profiles. Keep them in every evidence card that depends on them.
- Do not claim that one profile is universally correct. If profiles disagree, report `profile_specific` or `disputed`.
- Modern copyrighted interpretations are not included and must not be reproduced from memory.

## Evidence/audit example — not the ordinary answer

> **主题绑定**：先引用一个 `F-ZW-U..` 主题单元，再按其中的 ID 引用主宫、`F-ZW-R..` 三方四正关系和全部四个 `F-ZW-P..` 宫位事实。不能从别的主题借一个更顺眼的星曜补结论。
>
> **传统解释**：若继续，可以把语义匹配的“星曜—宫位—四化”组合作为条件性反思主题，同时写明支持条件和反例。这不是经验证的性格或事件预测。
>
> **阶段事实（仅在显式目标日期时）**：按本命底色、大限四动态宫环境、流年四动态宫触发的顺序展开；阶段四化仍只取主题槽。它不能直接写成未来事件。

## Prohibited overreach

Never:

- treat `chart_sex` as a judgment about identity or infer it without asking;
- use one star, brightness label, palace, cycle, decade, or age array as a deterministic verdict;
- claim a marriage date, pregnancy, illness, death, accident, crime, wealth amount, legal outcome, or another person's fidelity;
- infer a unique chart when time is unknown;
- present the birthplace-civil calendar-day convention outside UTC+08:00 as universal or hide its qualified warning;
- present `time_precision` as proof that the recorded birth time is accurate;
- mix fields from different candidate hours or profiles;
- omit part of a topic unit's four-palace evidence group, mix topics across phase layers, or describe a star/palace/transformation different from the referenced fact;
- attribute a rule to a named school or classic without a verified source record;
- describe agreement with BaZi or Western astrology as empirical confirmation.
