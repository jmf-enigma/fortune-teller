# Architecture

## Design boundary

The package separates mechanical representation from narrative interpretation:

```text
User / Agent
  -> live method registry and input schema
  -> strict request validation
  -> profile resolution
  -> deterministic engine or recorded/manual cast
  -> hash-committed JSON result envelope
  -> source/rule applicability gate
  -> evidence-bound interpretation with structured continuation actions
  -> reading validator
  -> result-first renderer (ordinary answer) or opt-in technical record
```

An engine failure never falls back to language-model calculation.

## Main components

| Path | Responsibility |
|---|---|
| `SKILL.md` | Agent routing, interaction state machine, privacy, evidence, and safety gates |
| `src/core/methods.mjs` | Live method registry, input schemas, statuses, and profile discovery |
| `src/core/profiles.mjs` | Named presets, immutable fields, custom-profile validation, and profile IDs |
| `src/core/time.mjs` | Calendar input, IANA zone resolution, DST disambiguation, civil-day bounds, and solar-time transforms |
| `src/core/random.mjs` | OS seed generation, commitments, SHA-256 replay stream, rejection sampling, and shuffle |
| `src/engines/` | Calculation-only wrappers; no free-form reading generation |
| `src/core/result.mjs` | Versioned envelope, runtime provenance, `facts_hash`, and `reproducibility_hash` |
| `src/data/source-registry.mjs` | Narrow, checked implementation/historical source records with declared system, scope, supported rules, and limitations |
| `src/data/rule-registry.mjs` | Machine-readable rule applicability: scopes, fact prefixes, minimum references, mandatory fact groups, sources, epistemic ceilings, and protective flags |
| `src/core/reading-validator.mjs` | Envelope integrity, system/profile binding, fact/rule/source applicability, coverage, deep-reading completeness, structured actions, and conservative lexical safety checks |
| `references/` | Progressive disclosure for interaction, evidence, safety, tiers, and method-specific rules |
| `scripts/fortune-teller.mjs` | CLI, result-first reading renderer, and goal-first local interactive wizard |
| `scripts/doctor.mjs` | Runtime and pinned-fixture smoke tests |
| `scripts/release-check.mjs` | Static release, schema, license, path, and offline-source gates |

The Zi Wei wrapper evaluates the pinned `iztro` UMD bundle once in a private Node VM realm. This prevents another same-process consumer's `iztro` plugins, brightness/mutagen tables, scalar profile settings, or language state from changing Fortune Teller facts. Returned chart JSON is cloned into the host realm before hashing and validation.

## Time model

Recorded local times are resolved with an IANA timezone. DST gaps always reject; an overlap requires explicit `earlier` or `later` selection. An optional UTC offset is accepted only with an exact local time and must agree with the named zone. An offset and `earlier`/`later` cannot be supplied together because they are competing resolution controls. Unknown-time day scans reject instant-only offset or overlap controls.

Normalized birth input records `time_precision` as `minute`, `second`, or `unknown`. The field is derived from the supplied clock syntax and rejects a contradictory caller value. It is provenance about representation, not a confidence estimate for the historical birth record.

The discoverable input schemas cover fields, types, unknown-key rejection, and selected dependencies such as Western coordinate pairing. Semantic cross-field constraints are also checked by the runtime; schema discovery is not permission to bypass those checks.

Unknown BaZi and Zi Wei times are scanned over the actual instant interval of the civil date. This matters because a local day may have 23 or 25 hours, and a historical timezone transition can skip a civil date entirely. Scans group consecutive calculation regimes; their counts are coverage diagnostics, never probabilities.

BaZi has an additional fail-closed calendar boundary: every admitted known-time or day-scan instant must actually use UTC+08:00. Its two profiles use civil time and differ only by `midnight` versus `zi-start` day boundary. Mean/apparent-solar BaZi profiles are not registered because the pinned dependency does not yet provide a safe separation between astronomical-instant year/month solar-term boundaries and local day/hour calculation.

Zi Wei fixes `calendar_day_basis` to `birthplace-civil` and uses civil time only. Outside UTC+08:00 it remains calculable only as that declared overseas convention and emits `CALENDAR_DAY_PROFILE_QUALIFIED`; the warning is part of the envelope and must survive interpretation. Mean/apparent-solar overrides are disabled until calendar-day selection and local time-index calculation can be represented as separate clocks.

With a known birth time and explicit `target_date`, the isolated Zi Wei chart calls the pinned `horoscope()`, `decadalList()`, and `yearlyList()` APIs. The wrapper retains only target, decadal, and yearly calculation facts, binds period stars and transformations back to natal palaces, and distinguishes a palace index from its sequence position. Unknown birth time, pre-birth targets, unsupported dates, childhood gaps, or ambiguous period coverage fail closed. No current date is read implicitly.

Known-time Western apparent-motion state is audited with centered longitude differences at ±6, ±12, and ±24 hours. A direct/retrograde label is emitted only when all numerically resolved window signs agree; otherwise the fact remains `stationary-or-uncertain` with `retrograde: null`.

The pinned Temporal polyfill supplies Temporal arithmetic, while timezone rules come from the Node/ICU runtime. Results therefore record Node, ICU, and tzdb versions.

## Randomness model

Fresh local draws begin with an operating-system random seed. A SHA-256 counter stream is domain-separated by method and profile. Bounded integers use rejection sampling, Tarot uses Fisher-Yates, and I Ching records every coin value.

The generated seed is not returned unless the caller explicitly requests it for a fresh draw. Manual results and supplied seeds are mutually exclusive. The language model never selects the random outcome.

The interaction layer freezes a Tarot or I Ching three-coin question with its draw or cast. Same-question follow-ups reuse the frozen outcome. A materially new question requires explicit confirmation before a new draw/cast; negative feedback never triggers an automatic redraw. Deterministic Meihua number input is governed by ordinary input-change invalidation instead.

## Hash model

`facts_hash` commits to:

- Fortune Teller engine version;
- system;
- complete profile;
- calculated, randomized, or user-supplied facts.

`reproducibility_hash` additionally commits to normalized input, warnings, sensitivity, provenance metadata, and runtime versions. Generation time is excluded from both. Consequently a fresh draw and later seeded replay may share facts but differ in the wider audit hash.

These are content hashes, not signatures.

## Structure-fact model

Known-time natal engines emit a small transparent `facts.structure` layer instead of a hidden interpretation score:

- BaZi derives Day Master context, separate unweighted visible/branch/hidden counts, and explicitly enumerated stem/branch relations from pillar IDs.
- Zi Wei derives all twelve four-direction palace groups by index offsets and indexes only mutagen fields actually returned by the pinned engine.
- Zi Wei target-date output separately records natal, decadal, and yearly fact roots so R-ZW-006 can require all three layers for a bounded phase interpretation.
- Western derives unweighted element/modality counts, reference luminary/angle IDs, a fixed orb-≤2° presentation subset, and whole-sign house occupancy counts.

Every structure object states its interpretation limit. These facts do not calculate BaZi strength/pattern/useful gods, Zi Wei event outcomes, or Western dominance/dignity/personality scores.

## Reading contract and validator boundary

An evidence claim binds to one calculation system/profile and cites real fact IDs or `/facts` JSON pointers. A registered rule may be used only for its allowed scope, countable fact-ID roots or explicitly listed material scalar paths, required values, minimum fact count, every mandatory fact group, source bundle, and permitted epistemic status. Aliases inside one fact, parent containers, and explanatory metadata cannot inflate the count. Material calculation warnings must remain in the reading acknowledgement and may force qualified/profile-specific claims. `source_status=verified` means the registered implementation or historical source and its narrow scope were checked; it does not mean predictive validity.

Every interpretive claim requires an applicable registered rule. `standard`, `deep`, and `audit` readings use structured next steps that declare an action, availability, required input, and whether the frozen calculation is reused. `deep` and `audit` additionally require a non-empty uncertainty summary, a reasoning summary and alternative reading for every claim, and at least one next step.

The validator recomputes hashes and checks these structural relations. Its lexical safety patterns are an intentionally small floor, not semantic analysis. A passing payload may still contain a misleading paraphrase, unsafe implication, bad quotation, or unsupported historical inference; the Skill workflow and human judgment remain required.

## Network and persistence

Production source has no network client. Calculation results are returned to stdout unless the caller requests a new output file. The CLI uses exclusive creation and refuses to overwrite an existing file. The interactive CLI keeps at most the current result in memory for details, plain-language input impact, technical audit, and correction; starting a new session clears that frozen result. If a correction changes facts, old bound interpretations are invalidated. The project itself has no user database, telemetry, geocoder, or cache.

## Extension rule

A new method must add, together:

- registry entry and strict input schema;
- named profile and declared immutable fields;
- calculation engine with no prose fallback;
- normal, boundary, negative, and unknown-input fixtures;
- result facts with stable IDs where interpretation can cite them;
- method reference with numbered local rule IDs and explicit unsupported scope;
- source-registry entries for any claimed external provenance, with exact rule support and limitations;
- rule-registry entries whose scopes, fact prefixes, mandatory groups, source bundle, and epistemic ceiling match the emitted schema;
- deep/audit reading fixtures that exercise structured next steps and validator rejection paths;
- dependency/license notice and clean-archive proof.
