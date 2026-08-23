# Zi Wei Dou Shu (`ziwei`)

Use this reference only after the live method registry confirms that `ziwei` is available. The engine builds a compact natal-chart representation through `iztro`; it does not include a validated forecasting system or a free-form traditional interpretation engine.

## Actual support in v0.1.0

The engine currently supports:

- release-tested Gregorian dates from 1900-01-01 through 2100-12-31; dates outside this range fail closed;
- Gregorian civil input in `YYYY-MM-DD`, with an exact local time or no time;
- IANA timezone validation with explicit daylight-saving disambiguation and optional solar-time correction;
- an explicit binary `chart_sex` calculation parameter required by the installed traditional algorithm;
- civil, mean-solar, or approximate apparent-solar time basis;
- selected `iztro` configuration fields for year, horoscope, age, and day divisions;
- default or Zhongzhou algorithm profile;
- leap-month-fix configuration passed to the dependency;
- known-time natal summary and twelve compact palace records;
- major, minor, and adjective star names, optional brightness/mutagen fields, Changsheng/Boshi/Jiangqian/Suiqian labels, decadal data, and age arrays when returned by the dependency;
- unknown-time sensitivity from a 60-second scan over every real instant of the named civil day, compressed into consecutive calculation-date/time-index regimes;
- daylight-saving gaps, overlaps, and skipped civil dates handled explicitly rather than by sampling nonexistent clock times;
- stability regime counts for soul star, body star, five-elements class, soul-palace branch, and body-palace branch;
- candidate palace signatures for audit without pretending that one candidate is the chart.

Supported profile fields include:

```text
time_basis: civil | mean-solar | apparent-solar
fix_leap_month: true | false
year_divide: normal | exact
horoscope_divide: normal | exact
age_divide: normal | birthday
day_divide: current | forward
algorithm: default | zhongzhou
```

Treat `chart_sex` as an algorithmic parameter. Do not infer it from a person's name, appearance, voice, pronouns, or identity.

The default civil-time profile is stable; the registered Zhongzhou profile is qualified. Mean/apparent-solar overrides are engine capabilities but are not registered as stable Zi Wei presets, so disclose them as custom/experimental use.

## Not currently supported

Do not imply support for:

- direct lunar-date or leap-month user input; the current engine call is made with `type: solar`;
- nonbinary variants of the underlying traditional calculation parameter;
- birth-time rectification, automatic candidate ranking, or selection of a “most likely” palace chart;
- current annual, monthly, daily, or hourly horoscope calculations;
- a complete flying-transformations, Sanhe, Sihua, Zhongzhou, or another school reading beyond returned facts;
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
- `profile`: every calculation convention supplied to `iztro`;
- `warnings`: especially approximate apparent-solar correction.

Optional star fields are absent when the dependency does not return them. Absence is not a negative interpretation.

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
- `source_status`: engine_documented
- `requires`: a resolved palace `fact_id` and the star entry inside that palace
- `rule`: Keep the star name, palace name/branch, profile, and optional brightness/mutagen fields together. Do not interpret a star name detached from its calculated location.
- `allowed`: “在当前 profile 下，星 X 位于宫位 Y；其象征解释仍属传统框架。”
- `forbidden`: “星 X 单独证明现实事件 Z。”

### R-ZW-002 — Soul/body fields are symbolic chart labels

- `type`: traditional
- `source_status`: engine_documented
- `requires`: `facts.summary.soul_star`, `body_star`, `soul_palace_branch`, or `body_palace_branch`
- `rule`: Use these fields only as declared symbolic labels within the installed calculation profile.
- `allowed`: present a bounded reflective theme with an evidence card.
- `forbidden`: infer identity, health, morality, intelligence, trauma, or inevitable life role.

### R-ZW-003 — Period arrays are not forecasts by themselves

- `type`: traditional, profile-specific
- `source_status`: engine_documented
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

## Source status and school differences

- Calculation provenance: `iztro`, as recorded in `meta.library`; this documents the implementation path, not predictive validity.
- The pinned `iztro` bundle runs in a private local VM realm, so unrelated same-process `iztro` plugins or global configuration cannot alter the Fortune Teller chart.
- Star placement and labels returned by the dependency are `engine_documented` unless a verified source registry says more.
- This reference does not bundle or verify classical quotations, editions, commentaries, chapters, or pages. Never invent them.
- `default` and `zhongzhou`, division settings, leap-month fixing, time basis, and day handling are material profiles. Keep them in every evidence card that depends on them.
- Do not claim that one profile is universally correct. If profiles disagree, report `profile_specific` or `disputed`.
- Modern copyrighted interpretations are not included and must not be reproduced from memory.

## Safe output example

> **计算事实**：`F-ZW-P01` 记录了当前 profile 下该宫位的名称、地支和星曜列表。`facts.summary` 还给出命宫、身宫及五行局等计算标签。
>
> **传统解释**：若继续，可以把“星曜—宫位”组合当作反思主题，但这不是经验证的性格或事件预测。
>
> **限制**：当前引擎没有运行流年事件规则；宫位中的 `decadal` 和 `ages` 只是索引，不能直接写成未来事件。

## Prohibited overreach

Never:

- treat `chart_sex` as a judgment about identity or infer it without asking;
- use one star, brightness label, palace, cycle, decade, or age array as a deterministic verdict;
- claim a marriage date, pregnancy, illness, death, accident, crime, wealth amount, legal outcome, or another person's fidelity;
- infer a unique chart when time is unknown;
- mix fields from different candidate hours or profiles;
- attribute a rule to a named school or classic without a verified source record;
- describe agreement with BaZi or Western astrology as empirical confirmation.
