# BaZi / Four Pillars (`bazi`)

Use this reference only after the live method registry confirms that `bazi` is available. This engine calculates a documented Four Pillars representation; it does not validate fortune prediction and does not include an interpretive expert system.

## Actual support in v0.1.0

The engine currently supports:

- release-tested Gregorian dates from 1900-01-01 through 2100-12-31; dates outside this range fail closed;
- Gregorian civil input in `YYYY-MM-DD`, with an exact local time or no time;
- IANA timezone validation with explicit `reject`, `earlier`, or `later` handling for daylight-saving ambiguities;
- optional place label and coordinates;
- civil, mean-solar, or approximate apparent-solar calculation time;
- midnight or Zi-start day-boundary profiles;
- year, month, day, and hour pillars when time is known;
- stem, branch, element pair, hidden stems, stem/hidden-stem Ten-God labels, growth phase, Na Yin, Xun, and Xun void as returned by `lunar-typescript`;
- fetal origin, fetal breath, life palace, and body palace labels from the underlying library;
- unknown-time sensitivity using a full civil-day 60-second boundary scan with exact day-edge probes, compressed into consecutive pillar regimes;
- warnings for late-Zi upstream mismatch and apparent-solar boundary proximity.

Current profiles:

```text
time_basis: civil | mean-solar | apparent-solar
day_boundary: midnight | zi-start
```

The two civil-time presets are stable. The registered apparent-solar preset is experimental, and mean-solar is available only through a custom profile rather than a stable preset. `apparent-solar` uses the package's documented approximation to the equation of time; it is not an astronomical truth-time guarantee.

## Not currently supported

Do not imply support for:

- direct lunar-calendar input, leap-month input, or automatic recognition of an unlabelled lunar date;
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
- `facts.auxiliary`: library-returned auxiliary labels, not independent predictions;
- `warnings`: especially late-Zi normalization or solar-time boundary warnings.

The `time` pillar may include an `audit` object. If `normalized_for_selected_day_boundary` is true, disclose that Fortune Teller recomputed the hour stem so the selected day-boundary profile remains internally consistent.

### Unknown-time mode

Read:

- `facts.mode`: `unknown-time-sensitivity`;
- `facts.stable_pillars[]`: year/month/day alternatives found across the scan, with `regime_count` values whose denominator is `sensitivity.candidate_count`;
- `facts.time_pillar.status`: must remain `unavailable`;
- `sensitivity.candidate_count`, `probe_count`, `scan_resolution_seconds`, `coverage_unit`, and `variants[]`.

Treat `candidate_count` as the number of consecutive pillar regimes discovered by the scan. `probe_count` is implementation coverage, not likelihood. Variant boundaries are bounded by probes to the documented resolution; do not present them as exact transition timestamps.

## Numbered rule templates

These are conservative Fortune Teller templates. `traditional` means the rule belongs to the declared traditional calculation/interpretive framework; it does not mean the rule has validated predictive power.

### R-BZ-001 — Preserve the four-pillar scope

- `type`: traditional
- `source_status`: engine_documented
- `requires`: one or more resolved `facts.pillars[].fact_id`
- `rule`: Refer to a label only in the pillar where the engine placed it. Do not move an hour label to the day pillar or merge candidate hour pillars.
- `allowed`: “在所选日界口径下，日柱的计算结果是 X。”
- `forbidden`: “这个柱位证明某事件一定发生。”

### R-BZ-002 — Ten-God labels are Day-Stem relations

- `type`: traditional
- `source_status`: engine_documented
- `requires`: the day pillar's `heavenly_stem` and a resolved `ten_god_stem` or `ten_gods_hidden_stems` field
- `rule`: Explain a Ten-God name only as the installed profile's relation to the day stem. Keep stem and hidden-stem labels separate.
- `allowed`: use the label as a possible reflective theme after citing the relevant facts.
- `forbidden`: infer wealth amount, occupation, family event, morality, or fate from the label alone.

### R-BZ-003 — Day-boundary and time-basis are profile-specific

- `type`: traditional, profile-specific
- `source_status`: engine_documented
- `requires`: `profile.day_boundary`, `profile.time_basis`, and `facts.resolved_time` when available
- `rule`: State the selected profile before interpreting a boundary-sensitive pillar. If adjacent supported profiles change the fact, classify the interpretation as profile-sensitive.
- `allowed`: compare `midnight` and `zi-start` as two declared conventions.
- `forbidden`: silently choose whichever convention creates a more compelling story.

### R-BZ-004 — Unknown hour permits stability statements only

- `type`: audit guard
- `source_status`: engine_documented
- `requires`: `facts.mode=unknown-time-sensitivity`
- `rule`: Interpret only fields marked stable by the full-day scan; list explicit alternatives for time-sensitive fields. Do not issue an hour-pillar interpretation.
- `allowed`: “整日边界扫描下，年柱保持一致；时柱因出生时间未知而不可判断。”
- `forbidden`: default noon, select the most narratively convenient candidate, or turn counts into likelihood.

## Source status and school differences

- Calculation provenance: `lunar-typescript`, as recorded in `meta.library`; this supports reproducibility of the implemented calculation, not the truth of a life interpretation.
- The dependency-provided labels are `engine_documented` unless a separate verified source registry entry exists.
- No classical edition, quotation, author attribution, chapter, or page is bundled by this reference. Do not invent one.
- `midnight` versus `zi-start`, and civil versus mean/apparent solar time, are explicit profile differences. Other school differences are not implemented merely because the model knows their names.
- Na Yin, Xun void, auxiliary palaces, growth phases, and hidden stems may have school-specific interpretive uses. Without a verified rule record, show them as calculated labels only.

## Safe output example

> **计算事实**：在 `bazi-civil-midnight-consistent-v1` 的未知时辰模式下，年、月、日候选分别记录在 `F-BZ-U01` 至 `F-BZ-U03`。出生时辰未知，因此 `facts.time_pillar` 明确为不可用。
>
> **传统解释边界**：可以进一步解释这些已计算标签在所选框架中的象征含义，但当前引擎没有计算旺衰、格局或用神，所以不会给出“身强/身弱”或职业、婚姻结论。
>
> **敏感性**：候选覆盖是时段枚举，不是命中概率。

## Prohibited overreach

Never:

- turn `five_element_pair` counts into a diagnosis or a universal balancing prescription;
- infer “missing an element” from visible stems alone;
- present Na Yin or an auxiliary label as a complete life verdict;
- claim exact wealth, marriage, childbirth, disease, death, legal trouble, or disaster timing;
- recommend medical, legal, financial, relationship, or irreversible action because of a pillar;
- conceal that a conclusion changes under another supported time/day-boundary profile;
- cite a classical source that is not present in a verified source registry.
