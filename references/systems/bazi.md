# BaZi / Four Pillars (`bazi`)

Use this reference only after the live method registry confirms that `bazi` is available. This engine calculates a documented Four Pillars representation; it does not validate fortune prediction and does not include an interpretive expert system.

## Actual support

The engine currently supports:

- release-tested Gregorian dates from 1900-01-01 through 2100-12-31; dates outside this range fail closed;
- Gregorian civil input in `YYYY-MM-DD`, with an exact local time or no time;
- IANA timezone validation with explicit `reject`, `earlier`, or `later` handling for daylight-saving ambiguities;
- a fail-closed calendar reference: every admitted civil instant must actually use UTC+08:00; the engine does not ask the user to convert the recorded clock time by hand;
- optional place label and coordinates as input metadata, without a BaZi solar-time correction;
- civil calculation time only;
- midnight or Zi-start day-boundary profiles;
- year, month, day, and hour pillars when time is known;
- stem, branch, element pair, hidden stems, stem/hidden-stem Ten-God labels, growth phase, Na Yin, Xun, and Xun void as returned by `lunar-typescript`;
- fetal origin, fetal breath, life palace, and body palace labels from the underlying library;
- transparent known-time structure facts: Day Master stem/element/polarity, month-branch context, separate unweighted occurrence counts, explicit stem-five-combination pairs, branch six-harmony pairs, branch clashes, and complete three-harmony groups found in the four pillars;
- unknown-time sensitivity using a full civil-day 60-second boundary scan with exact day-edge probes, compressed into consecutive pillar regimes;
- warnings for late-Zi upstream mismatch and a pillar change within a ±2-minute audit window.

Current profiles:

```text
time_basis: civil
day_boundary: midnight | zi-start
```

The two civil-time presets are the only registered BaZi profiles. `time_basis` is not overridable. Mean-solar and apparent-solar profiles are disabled until astronomical-instant year/month solar-term boundaries can be separated safely from local day/hour calculation.

This restriction is material: the pinned dependency's calendar-boundary behavior cannot yet be treated as location-independent. If a known birth instant, or any instant in an unknown-time day scan, has an offset other than `+08:00`, calculation fails with `UNSUPPORTED_BAZI_CALENDAR_OFFSET`. Do not work around this by relabelling or manually shifting the recorded local time.

## Not currently supported

Do not imply support for:

- direct lunar-calendar input, leap-month input, or automatic recognition of an unlabelled lunar date;
- BaZi calculation for an admitted civil instant outside actual UTC+08:00;
- mean-solar, apparent-solar, or true-solar-time BaZi profiles;
- Day-Master strength scoring, seasonal strength, structure/pattern determination, useful/favorable gods, or a single “balanced/unbalanced” verdict;
- luck pillars, annual/monthly cycles, compatibility, naming, timing, remedies, or birth-time rectification;
- a complete Zi Ping, blind-school, Na Yin, Shen Sha, or another school-specific reading;
- empirical predictions about career, wealth, marriage, illness, fertility, lifespan, accidents, or personality;
- a primary-source bibliography for every label returned by the dependency.

If the user supplies a lunar date, ask for the corresponding Gregorian date or use a separately implemented and verified conversion path. Never relabel the lunar date as Gregorian.

## Reading the result envelope

### Known-time mode

Read:

- `facts.mode`: must be `known-time`;
- `facts.resolved_time`: basis, calculation-local time, UTC instant, corrections, and method;
- `facts.solar_date` and `facts.lunar_date`: calculated calendar renderings;
- `facts.pillars[]`: four entries with `pillar` equal to `year`, `month`, `day`, or `time`;
- each pillar's `fact_id`, `stem_branch`, `heavenly_stem`, `earthly_branch`, `five_element_pair`, `hidden_stems`, `ten_god_stem`, `ten_gods_hidden_stems`, `growth_phase`, `nayin`, `xun`, and `xun_void`;
- `facts.structure.day_master`: derived stem, element, polarity, and source day-pillar ID;
- `facts.structure.month_context`: month branch and its element, with an explicit prohibition on inferring seasonal strength;
- `facts.structure.occurrence_counts`: visible-stem, branch, and hidden-stem element counts plus visible/hidden Ten-God counts, kept separate and unweighted;
- `facts.structure.relationships[]`: only the enumerated pair/group relations actually found, each with source pillar IDs;
- `facts.auxiliary`: library-returned auxiliary labels, not independent predictions;
- `warnings`: especially late-Zi normalization or `CALENDAR_BOUNDARY_NEAR`.

The `time` pillar may include an `audit` object. If `normalized_for_selected_day_boundary` is true, disclose that Fortune Teller recomputed the hour stem so the selected day-boundary profile remains internally consistent.

`facts.structure.basis` and the per-field `interpretation_limit` values are binding caveats. The occurrence counts are not pooled, weighted, or converted into strength, pattern, useful-god, balance, or dominance scores. Relationship records are transparent structural detections, not proof that a traditional combination “transforms,” succeeds, or causes an event.

### Unknown-time mode

Read:

- `facts.mode`: `unknown-time-sensitivity`;
- `facts.stable_pillars[]`: year/month/day alternatives found across the scan, with `regime_count` values whose denominator is `sensitivity.candidate_count`;
- `facts.time_pillar.status`: must remain `unavailable`;
- `sensitivity.candidate_count`, `probe_count`, `scan_resolution_seconds`, `coverage_unit`, and `variants[]`.

Treat `candidate_count` as the number of consecutive pillar regimes discovered by the scan. `probe_count` is implementation coverage, not likelihood. Variant boundaries are bounded by probes to the documented resolution; do not present them as exact transition timestamps.

## Numbered rule templates

These are conservative Fortune Teller templates. `traditional` means the rule belongs to the declared traditional calculation/interpretive framework; it does not mean the rule has validated predictive power.

### R-BZ-001 — Keep chart structure bound to emitted facts

- `type`: traditional
- `source_status`: verified
- `source_ids`: `SRC-BZ-LUNAR-TS-1.8.6`, `SRC-BZ-SANMING-WIKISOURCE`
- `requires`: one or more resolved fact IDs under `facts.pillars`, `facts.stable_pillars`, or `facts.structure`
- `rule`: Keep every label or derived relation attached to its emitted pillar/source IDs. Do not move an hour label to the day pillar, merge candidate hour pillars, or turn a transparent structural count into a strength score.
- `allowed`: “在所选日界口径下，日柱的计算结果是 X。”
- `forbidden`: “这个柱位证明某事件一定发生。”

### R-BZ-002 — Ten-God labels are Day-Stem relations

- `type`: traditional
- `source_status`: verified
- `source_ids`: `SRC-BZ-LUNAR-TS-1.8.6`, `SRC-BZ-SANMING-WIKISOURCE`
- `requires`: a resolved Ten-God-bearing pillar fact, or the emitted `facts.structure.day_master`/`occurrence_counts` fact used with the Day-Stem relation
- `rule`: Explain a Ten-God name only as the installed profile's relation to the day stem. Keep visible and hidden labels/counts separate and unweighted.
- `allowed`: use the label as a possible reflective theme after citing the relevant facts.
- `forbidden`: infer wealth amount, occupation, family event, morality, or fate from the label alone.

### R-BZ-003 — Calendar reference and day boundary stay explicit

- `type`: traditional, profile-specific
- `source_status`: engine_documented
- `requires`: `profile.day_boundary`, `profile.time_basis`, and `facts.resolved_time` when available
- `rule`: State the civil time basis, actual UTC offset, and selected day-boundary profile before describing a boundary-sensitive pillar. If the two supported day-boundary profiles change the fact, classify the result as profile-sensitive.
- `allowed`: compare `midnight` and `zi-start` as two declared conventions.
- `forbidden`: silently choose whichever convention creates a more compelling story, or simulate a disabled solar-time profile by shifting the clock.

### R-BZ-004 — Unknown hour permits stability statements only

- `type`: audit guard
- `source_status`: engine_documented
- `requires`: `facts.mode=unknown-time-sensitivity`
- `rule`: Interpret only fields marked stable by the full-day scan; list explicit alternatives for time-sensitive fields. Do not issue an hour-pillar interpretation.
- `allowed`: “整日边界扫描下，年柱保持一致；时柱因出生时间未知而不可判断。”
- `forbidden`: default noon, select the most narratively convenient candidate, or turn counts into likelihood.

## Source status and school differences

- `SRC-BZ-LUNAR-TS-1.8.6` verifies the pinned implementation provenance and the narrow terminology scope used by R-BZ-001 and R-BZ-002. It supports reproducibility of the implementation, not the truth of a life interpretation.
- `SRC-BZ-SANMING-WIKISOURCE` supplies historical provenance for bounded Four-Pillars structure, Ten-God, and stem/branch relational vocabulary under R-BZ-001 and R-BZ-002. Its registry limitations remain part of every source-backed claim; it is not empirical evidence or permission for deterministic forecasting.
- A registry entry verifies only its declared source and scope. It does not turn project-authored paraphrases into quotations or supply a page/chapter that was not checked.
- `midnight` versus `zi-start` is the implemented profile difference. Civil versus mean/apparent solar time is not an available BaZi comparison in the current release.
- Na Yin, Xun void, auxiliary palaces, growth phases, and hidden stems may have school-specific interpretive uses. Without a verified rule record, show them as calculated labels only.

## Evidence/audit example — not the ordinary answer

> **计算事实**：在 `bazi-civil-midnight-consistent-v1` 的未知时辰模式下，年、月、日候选分别记录在 `F-BZ-U01` 至 `F-BZ-U03`。出生时辰未知，因此 `facts.time_pillar` 明确为不可用。
>
> **传统解释边界**：可以进一步解释这些已计算标签在所选框架中的象征含义，但当前引擎没有计算旺衰、格局或用神，所以不会给出“身强/身弱”或职业、婚姻结论。
>
> **敏感性**：候选覆盖是时段枚举，不是命中概率。

## Prohibited overreach

Never:

- turn `five_element_pair` counts into a diagnosis or a universal balancing prescription;
- pool visible stems, branches, and hidden stems into an undocumented “element score”;
- infer “missing an element” from visible stems alone;
- present Na Yin or an auxiliary label as a complete life verdict;
- claim exact wealth, marriage, childbirth, disease, death, legal trouble, or disaster timing;
- recommend medical, legal, financial, relationship, or irreversible action because of a pillar;
- conceal that a conclusion changes under another supported time/day-boundary profile;
- calculate outside actual UTC+08:00 by hand-shifting or relabelling the birth time;
- cite a classical source that is not present in a verified source registry.
