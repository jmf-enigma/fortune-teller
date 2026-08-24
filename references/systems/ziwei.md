# Zi Wei Dou Shu (`ziwei`)

Use this reference only after the live method registry confirms that `ziwei` is available. The engine builds a compact natal chart and, with an exact birth time plus explicit `target_date`, calculation-only decadal/yearly facts through `iztro`; it does not include a validated forecasting system or a free-form event-prediction engine. For a `standard` or `deep` interpretation, also read [ziwei-reading-map.md](ziwei-reading-map.md).

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
- major, minor, and adjective star names, optional brightness/mutagen fields, Changsheng/Boshi/Jiangqian/Suiqian labels, decadal data, and age arrays when returned by the dependency;
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
- a complete flying-transformations, Sanhe, Sihua, Zhongzhou, or another school reading beyond returned facts; the emitted 三方四正 index is a relationship fact, not an interpretive school engine;
- event prediction, compatibility, remedies, auspicious timing, or causal claims;
- interpretation of stars, brightness, cycles, decadal labels, or age arrays as inevitable events;
- a verified classical bibliography for each `iztro` label.

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
- when the request contains `target_date`, `facts.periods.target`, `facts.periods.decadal`, and `facts.periods.yearly`; the date is explicit, the date-only target-time policy is recorded, and every period star/transformation remains bound to a natal palace;
- `profile`: every calculation convention supplied to `iztro`;
- `warnings`: especially `CALENDAR_DAY_PROFILE_QUALIFIED` outside UTC+08:00.

Optional star fields are absent when the dependency does not return them. Absence is not a negative interpretation.

For a deep structural reading, start with the focus palace and its emitted four-direction unit. Keep the four palace IDs visible internally, then inspect stars and mutagens within those palaces. The structural index does not authorize a single-star verdict or a predicted event. For a target-date phase, use the order in `ziwei-reading-map.md`: natal baseline, decadal context, yearly emphasis, interaction, and reality check.

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

### R-ZW-006 — A phase theme needs natal, decadal, and yearly context

- `type`: traditional bounded synthesis
- `source_status`: verified
- `source_ids`: `SRC-ZW-IZTRO-HOROSCOPE-GUIDE`
- `requires`: at least one material natal palace fact, one decadal fact, and one yearly fact from the same frozen calculation
- `rule`: Interpret only a conditional phase theme or area of attention. State a convergence, tension, or shift across the three layers, plus a counter-reading and observable reality check.
- `allowed`: “如果现实中该领域已经出现新责任，这组结构可用来检查资源与代价是否同时上升。”
- `forbidden`: event certainty, exact timing, or a one-star/one-transformation verdict.

## Source status and school differences

- `SRC-ZW-IZTRO-2.6.0` verifies the pinned implementation provenance and the narrow returned-field scope used by R-ZW-001 through R-ZW-003 and R-ZW-005. This documents the implementation path, not predictive validity.
- `SRC-ZW-IZTRO-HOROSCOPE-GUIDE` supports only the natal → decadal → yearly analysis order and a bounded phase-theme framing under R-ZW-006. It is a modern method guide, not empirical evidence or permission for guaranteed events.
- `SRC-ZW-ZIWEI-QUANSHU` supplies historical provenance for bounded palace/star and soul/body terminology under R-ZW-001 and R-ZW-002. The registry records the host documentation's warning that the material can be exaggerated or internally inconsistent; it is not empirical evidence or permission for literal forecasting.
- The pinned `iztro` bundle runs in a private local VM realm, so unrelated same-process `iztro` plugins or global configuration cannot alter the Fortune Teller chart.
- A source entry verifies only its declared provenance and scope. It does not make an unchecked edition, quotation, commentary, chapter, page, or model-authored paraphrase verified.
- `default` and `zhongzhou`, division settings, leap-month fixing, time basis, birthplace-civil calendar-day basis, and day handling are material profiles. Keep them in every evidence card that depends on them.
- Do not claim that one profile is universally correct. If profiles disagree, report `profile_specific` or `disputed`.
- Modern copyrighted interpretations are not included and must not be reproduced from memory.

## Evidence/audit example — not the ordinary answer

> **计算事实**：`F-ZW-P01` 记录了当前 profile 下该宫位的名称、地支和星曜列表。`facts.summary` 还给出命宫、身宫及五行局等计算标签。
>
> **传统解释**：若继续，可以把“星曜—宫位”组合当作反思主题，但这不是经验证的性格或事件预测。
>
> **阶段事实（仅在显式目标日期时）**：`facts.periods` 可以记录对应大限与流年；它允许进一步做本命—大限—流年的条件性主题综合，但不能直接写成未来事件。

## Prohibited overreach

Never:

- treat `chart_sex` as a judgment about identity or infer it without asking;
- use one star, brightness label, palace, cycle, decade, or age array as a deterministic verdict;
- claim a marriage date, pregnancy, illness, death, accident, crime, wealth amount, legal outcome, or another person's fidelity;
- infer a unique chart when time is unknown;
- present the birthplace-civil calendar-day convention outside UTC+08:00 as universal or hide its qualified warning;
- present `time_precision` as proof that the recorded birth time is accurate;
- mix fields from different candidate hours or profiles;
- attribute a rule to a named school or classic without a verified source record;
- describe agreement with BaZi or Western astrology as empirical confirmation.
