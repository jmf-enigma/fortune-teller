# Architecture

## Design boundary

The package separates mechanical representation from narrative interpretation:

```text
User / Agent
  -> live method registry and input schema
  -> strict request validation
  -> profile resolution
  -> deterministic engine or recorded/manual cast
  -> versioned JSON result envelope
  -> fixed-engine replay or structural recomputation
  -> exact calculation and fact-value binding
  -> source/rule/profile applicability and typed semantic gates
  -> closed Zi Wei meaning derivation where supported
  -> evidence-bound interpretation or fail-closed downgrade
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
| `src/core/calculation-verifier.mjs` | Replay fixed birth-chart engines or structurally recompute recorded/manual casts; report when random-origin authentication is unavailable |
| `src/core/blind-check.mjs` | Freeze only validated Zi Wei R-ZW-009 hypotheses whose criteria jointly require natal focus axes, all registered period-star conditions across both complete dynamic four-palace layers, and every selected-topic-slot phase process over the exact joint-stability interval; preserve exact criterion objects and mechanically derive outcomes after the window closes |
| `src/core/claim-semantics.mjs` | Resolve typed assertions including brightness-bearing natal `star_in_palace` and dynamic `period_star_in_slot` bindings against exact facts |
| `src/data/meaning-registry.mjs` | Closed Zi Wei registry: five topic markers, constructive/overextension axes for fourteen major stars, and four transformation process lenses |
| `src/data/ziwei-sanhe-rulepack.mjs` | Bounded Zi Wei synthesis rules: 24 same-palace major-star pairs, 14 natal context modifiers, and 11 period-star modifiers; conditions are not scores |
| `src/core/meaning-layer.mjs` | Derive and validate canonical Zi Wei R-ZW-007/008/009 meaning bindings, result prose, alternatives, practical reflections, and observable criteria |
| `src/data/source-registry.mjs` | Narrow, checked implementation/historical source records with declared system, scope, supported rules, and limitations |
| `src/data/rule-registry.mjs` | Machine-readable rule applicability: scopes, fact prefixes, minimum references, mandatory fact groups, sources, epistemic ceilings, and protective flags |
| `src/data/interpretation-profile-registry.mjs` | Versioned system-specific interpretation rule packs and their reviewed calculation-profile boundary |
| `src/core/reading-validator.mjs` | Calculation replay, envelope integrity, exact calculation/fact-value binding, rule/source/profile applicability, cross-system typed semantic checks, closed Zi Wei meaning recomputation, observable assessments, coverage, deep-reading completeness, structured actions, and conservative lexical safety checks |
| `references/` | Progressive disclosure for interaction, evidence, safety, tiers, and method-specific rules |
| `scripts/fortune-teller.mjs` | CLI, goal-first local wizard, and plain-language renderer ordered as conclusion → phase timeline when available → topic cards (conclusion/plain language/basis/revision conditions/reminder) → reality checks → uncertainty → next steps; terminology remains later |
| `scripts/doctor.mjs` | Runtime and pinned-fixture smoke tests |
| `scripts/release-check.mjs` | Static release, schema, license, path, offline-source, and exact 90-item release-manifest gates |

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

## Backstage integrity fields

`facts_hash` covers:

- Fortune Teller engine version;
- system;
- complete profile;
- calculated, randomized, or user-supplied facts.

`reproducibility_hash` additionally covers normalized input, warnings, sensitivity, provenance metadata, and runtime versions. Generation time is excluded from both. Consequently a fresh draw and later seeded replay may share facts but differ in the wider audit hash.

Interpretation profiles also expose a deterministic `rule_pack_hash`. Its v2 preimage covers the engine version, the complete interpretation-profile definition, full canonical calculation profiles, complete rule and source records, and any closed meaning registry selected by that profile. Changing covered content while retaining its ID therefore changes the hash.

These are secondary content-integrity fields, not signatures. They can reveal that a preserved serialized record changed; they do not improve calculation or interpretation accuracy, authenticate which engine created a file, establish provenance, or validate prediction. Fixed-engine replay or structural recomputation is the primary calculation check. Ordinary result rendering hides every hash.

## Structure-fact model

Known-time natal engines emit a small transparent `facts.structure` layer instead of a hidden interpretation score:

- BaZi derives Day Master context, separate unweighted visible/branch/hidden counts, and explicitly enumerated stem/branch relations from pillar IDs.
- Zi Wei derives all twelve four-direction palace groups by index offsets, indexes only mutagen fields actually returned by the pinned engine, and emits five topic units that bind one primary palace to its complete three-directions/four-alignments set.
- Zi Wei target-date output supplies the selected topic focus; the closed layer derives complete `[0,+4,+8,+6]` dynamic palace sets separately for decadal and yearly scopes and fails closed on a missing, duplicated, or misordered slot.
- Western derives unweighted element/modality counts, reference luminary/angle IDs, a fixed orb-≤2° presentation subset, and whole-sign house occupancy counts.

Every structure object states its interpretation limit. These facts do not calculate BaZi strength/pattern/useful gods, Zi Wei event outcomes, or Western dominance/dignity/personality scores.

## Reading contract and validator boundary

`bind-reading` first records an exact root binding for every supplied calculation and a path/value hash for every cited fact. The validator then rejects stale readings, substituted fact values, duplicate fact IDs, incomplete evidence sets, or claims that no longer identify exactly one calculation. This is integrity checking, not approval of the prose.

Before relying on those bindings, the calculation verifier replays BaZi, Zi Wei, Western, and Meihua facts from normalized input and the declared profile. Manual Tarot and I Ching structures are recomputed, and a random draw is replayed only when its seed is available; otherwise the result is explicitly structural-only with origin unverified. Digest equality is never substituted for this check.

A registered rule may be used only for its allowed scope, countable fact-ID roots or explicitly listed material scalar paths, required values, minimum fact count, every mandatory fact group, source bundle, and permitted epistemic status. Aliases inside one fact, parent containers, and explanatory metadata cannot inflate the count. Every interpretation also selects a registered interpretation profile and exact rule-pack hash. A claim cannot carry a free-text `dependencies` field; calculation and input conditions belong in `calculation_certainty`, `input_sensitivity`, or an explicit `unresolved` statement. Material calculation warnings must remain in the reading acknowledgement and may force qualified/profile-specific claims. `source_status=verified` means the registered implementation or historical source and its narrow scope were checked; it does not mean predictive validity.

Every interpretive claim requires an applicable registered rule plus at least one concrete support observation and one concrete counter-observation. Exact I Ching, Meihua, Tarot, BaZi, Western, and Zi Wei technical assertions are represented by typed semantic bindings and rendered mechanically into `technical_summary`; free narrative fields may interpret those facts but may not restate or contradict them. Zi Wei natal major-star bindings retain emitted `brightness`; dynamic decadal/yearly star conditions use `period_star_in_slot`.

Only Zi Wei rules `R-ZW-007`, `R-ZW-008`, and `R-ZW-009` cross the closed professional-depth meaning gate. The binding schema is `fortune-teller/ziwei-meaning-binding/v2`. `R-ZW-007/009` read the complete natal four-palace fourteen-major-star set, registered same-palace combinations, emitted brightness, and all present 六吉六煞/禄存/天马 conditions. The separate result rule pack registers 24 major-star pairs, 14 natal context modifiers, and 11 period-star modifiers. `R-ZW-008` consumes the selected topic's complete natal-transformation set. `R-ZW-009` judges natal baseline → decadal environment → yearly trigger: both period scopes require exactly four unique dynamic slots in `[0,+4,+8,+6]` role order and every registered period-star condition. Its selected-topic-slot decadal and yearly transformation sets are both complete, with at least one item across them while either individual set may be empty. Thus period stars cover two dynamic four-palace layers, but transformations do not claim four-palace phase convergence or a complete Zi Wei judgment. The window is the maximal continuous interval in which both records remain unchanged and both endpoints can be replay-bracketed. Formal criteria jointly require every natal focus axis, every registered decadal four-slot condition, every registered yearly four-slot condition, and every selected-topic-slot phase process; no layer substitutes for another. Generic domain activity or a concrete event/result fails closed. Claims outside the closed layer cannot assert any future event.

At the reading root, `bind-reading` also fixes `title`, derives `user_focus` from the unique canonical Chinese topic labels of all claims in claim order, writes the canonical non-prediction disclaimer and uncertainty summary, sets `warning_acknowledgements` to exactly the material engine-warning codes or omits it when none exist, and fixes next-step labels and unavailable reasons. A single-system reading must omit `cross_system`; a multi-system reading is exactly `{relationship: "not_compared"}`. This is deliberate abstention: the validator does not machine-classify systems as equivalent, complementary, or conflicting.

`standard`, `deep`, and `audit` readings use structured next steps that declare an action, availability, required input, and whether the frozen calculation is reused. `deep` and `audit` additionally require a non-empty uncertainty summary, a reasoning summary and alternative reading for every claim, at least one support and constraint evidence role, and at least one next step.

The validator replays calculations where possible, recomputes closed bindings, and checks these structural relations. Its typed checks cover only the declared technical assertion vocabulary; outside the three closed Zi Wei routes, its general lexical patterns remain an intentionally conservative floor rather than full semantic analysis. A passing payload may still contain a misleading non-technical paraphrase, unsafe implication, bad quotation, or unsupported historical inference; the Skill workflow and human judgment remain required.

The blind-check path accepts only validated Zi Wei `R-ZW-009` `prospective_hypothesis` claims. Formal criteria jointly check natal focus axes, all registered decadal four-slot conditions, all registered yearly four-slot conditions, and both complete selected-topic-slot phase-process sets, with at least one item across them over the fully bracketed joint-stability interval. No layer substitutes for another. The path never tests a generic domain, four-palace phase-transformation convergence, a complete Zi Wei judgment, or a concrete event forecast. Scoring waits until every selected window closes and mechanically derives the item outcome from complete criterion adjudications. Internal commitments are integrity aids, not accuracy evidence.

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
