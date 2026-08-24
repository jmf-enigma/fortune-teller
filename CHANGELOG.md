# Changelog

All notable project changes are documented here.

## 0.4.0 - 2026-08-24

Professional-depth release focused on bounded BaZi adjudication, exact luck-cycle structure, specialist-method audit, and fail-closed school-specific candidate handling. The supported method count is unchanged.

### Added

- Exact opt-in BaZi luck onset, 24 complete decadal intervals, LiChun-bounded target-year facts, and named natal/decadal/year stem-branch relations. The traditional binary direction parameter is explicit and is never inferred from identity.
- A replay-verified `adjudicateBazi` API and `adjudicate-bazi` CLI. It keeps strong/weak hypotheses separate, requires registered compound pattern routes, pairs damage with its own rescue, and keeps 格局、扶抑、调候、通关、病药 as independent lenses without scores or school voting.
- Chapter-anchored BaZi method records for 《子平真诠》 and 《滴天髓》, with deliberately narrow scope. Only the closed 正官→伤官受损→透印救应 chain can automatically reach break/rescue; weight-, position-, control-, and transformation-dependent routes remain screening-only.
- Result-first guided BaZi life-overview flow: collect only the extra luck inputs when needed, show the mechanical conclusion and ordinary explanation before pillars, and expose technical routes only on demand.
- Specialist comparison of focused BaZi and Zi Wei Skills, documenting which workflow structures were independently adopted and which fixed weights, retrospective calibration, unsupported event maps, and unverified pattern corpora were rejected.
- Adversarial fixtures for fabricated rule input, fake period facts, unreachable pattern predicates, ontology alias conflicts, mismatched ordinary prose, and relation-only pseudo-activation.

### Changed

- Month-command transparency no longer establishes a BaZi pattern. Formation requires a complete registered route; only a closed damage route can produce breakage, and only its matching closed rescue can produce rescue.
- The target-period output now distinguishes a replayable three-layer structural linkage from a completed pattern activation. Period Ten Gods are candidate route inputs only, and no relation graph produces a named life event.
- Caller-supplied climate, passage, source-status, fact-ID, direction, or period objects are ignored. Only facts replayed from the supplied calculation envelope can affect adjudication.
- Broad direction labels such as 印星 are expanded before comparison. Different suggestions are not treated as conflict unless a registered rule explicitly declares them incompatible.
- `user_focus` now contains the stable, unique canonical topic labels from all claims rather than only the first claim, while `summary` remains bound to the first claim as the headline.
- The source registry now contains 14 narrow records and the rule registry 31 rules. General-reading `R-BZ-005/006` remain unresolved-only until a dedicated typed binding can independently rederive the mechanical result.

### Evidence boundary

- The BaZi strength screen is still qualitative and incomplete. Human-command/day weighting, full root/position/control/transformation state, special patterns, a verified climate table, complete dynamic route re-adjudication, life-event mapping, practitioner review, and predictive validity remain unavailable.
- Zi Wei public result prose remains limited to the existing closed `R-ZW-007/008/009` paths. A generic candidate evaluator is not a named-pattern corpus and may not be advertised as complete pattern recognition.
- These changes reduce correctable calculation, rule-selection, and narrative-promotion errors. They do not establish real-world predictive accuracy.

## 0.3.0 - 2026-08-24

Professional-depth release focused on evidence integrity, Zi Wei topic synthesis, falsifiability, and result-facing usability. The supported method count is unchanged.

### Added

- Exact reading-to-calculation bindings and per-fact value bindings. A claim now commits to one supplied calculation and to the exact path and value of every cited fact; stale chart reuse and substituted evidence fail validation.
- A mechanical `bind-reading` command that prepares those integrity fields before the separate `validate-reading` gate.
- Registered interpretation profiles with complete versioned rule-pack contents. `rule_pack_hash` v2 covers the full rule-pack payload and detects accidental drift only; it is not an accuracy or provenance claim. Each interpretive claim must use one profile whose system, allowed calculation profiles, and rule set match the reading.
- Five machine-generated Zi Wei natal topic units: overview, career/study, wealth/resources, relationships, and wellbeing rhythm. Each unit binds its primary palace, complete three-directions/four-alignments set, relation fact, and relevant natal transformations.
- Same-topic Zi Wei phase units for an explicit target date, plus complete `[0,+4,+8,+6]` dynamic four-palace sets derived separately for decadal and yearly scopes.
- A closed Zi Wei meaning registry with five topic markers, constructive/overextension axes for fourteen major stars, and four transformation process lenses. Only `R-ZW-007/008/009` use it; `bind-reading` generates all result-facing meaning fields and `validate-reading` independently rederives them.
- A bounded Sanhe result rule pack with 24 registered same-palace major-star pairs, 14 natal context modifiers (六吉六煞、禄存天马), and 11 period-star modifiers. `R-ZW-007/009` read same-palace combinations, emitted brightness, and all registered natal context; modifiers are conditions rather than a score.
- Complete-set guards for Zi Wei meaning: `R-ZW-008` consumes every natal transformation; `R-ZW-009` judges natal baseline → decadal environment → yearly trigger and consumes all registered period-star conditions across both complete dynamic four-palace sets. Its phase transformations remain the two complete selected-topic-slot sets, with at least one item across them while either individual set may be empty, without claiming four-palace phase-transformation convergence or a complete Zi Wei judgment.
- Profile-derived Zi Wei phase intervals. `R-ZW-009` replays around `target_date` and uses the maximal continuous interval in which both decadal and yearly records remain unchanged. In the pinned engine, `horoscope_divide=normal` follows the lunar-year boundary and `exact` follows the Start of Spring boundary; a decadal boundary can shorten either side. Both endpoints must be bracketed inside the release-tested range, so the route fails closed instead of clipping near 1900 or 2100. January 1–December 31 is never assumed.
- Typed technical-fact bindings across six systems, including Zi Wei natal `star_in_palace` with emitted `brightness` and dynamic `period_star_in_slot` with exact scope, role, star, period palace, and natal palace.
- Observable assessments and a scan-first renderer ordered as conclusion → phase timeline when available → topic cards (conclusion/plain language/chart basis/revision conditions/reminder) → reality checks → uncertainty → next steps. Summary/plain meaning, terminology evidence, and revision conditions are split into readable bullets; detailed phase stars stay in the evidence layer.
- A reading-bound forward-check workflow whose canonical `R-ZW-009` criteria jointly require every natal focus axis, every registered decadal four-slot condition, every registered yearly four-slot condition, and every selected-topic-slot phase process. No layer may substitute for another; generic activity, four-palace phase-transformation convergence, complete Zi Wei judgment, and concrete events are ineligible. Outcomes are mechanically derived from complete criterion adjudications.
- An exact 90-item release manifest gate for the Skill archive.
- Dedicated adversarial regression tests for calculation tampering, chart swapping, evidence-value substitution, duplicate fact IDs, false technical assertions, Barnum-style wording, false Zi Wei relations, topic mixing, phase mixing, contradictory claims, and unreviewed custom profiles.
- Accuracy-evaluation and professional-coverage documentation that separate calculation correctness, traditional-rule fidelity, and real-world predictive validity.

### Changed

- The source registry now contains 12 narrow records and the rule registry 29 rules, including official Zi Wei palace and transformation guides and three topic-specific Zi Wei rules.
- BaZi Ten-God interpretation was narrowed to traditional relational structure. Strength, pattern, useful-god, and luck-cycle analysis remain unavailable until one fixed school, a versioned decision graph, independent calculation fixtures, and expert review exist.
- Zi Wei star/palace and natal–decadal–yearly legacy rules were narrowed to structural reporting; bounded interpretation now goes through the topic-unit rules.
- Calculation envelopes reject duplicate `fact_id` values, preventing ambiguous evidence resolution.
- Calculation verification now prefers fixed-engine replay or structural recomputation over digest matching. Internal hashes remain secondary change-detection fields and do not authenticate engine origin.
- Claim-level free-text `dependencies` were removed. `bind-reading` now fixes the title, first-claim-topic `user_focus`, non-prediction disclaimer, uncertainty summary, exact material-warning code set, and next-step labels/unavailable reasons. It omits `cross_system` for one system and fixes multi-system readings to `{relationship: "not_compared"}` rather than claiming machine-detected equivalence, complementarity, or conflict.
- Guided single-domain Zi Wei intake can request a target date up front instead of requiring a later edit.
- Method and reading quality metadata now states `automated_fixture_reviewed`, `professional_label_allowed: false`, `predictive_validity: not_established`, and `narrative_status: not_machine_verified`; no shipped interpretation profile permits an independent-professional label.
- Claims outside the three closed Zi Wei meaning routes are prohibited from making future-event assertions; unsupported future questions must remain factual, current-reflective, or unresolved.

### Evidence boundary

- Automated fixtures and adversarial cases support calculation consistency and contract enforcement only.
- The release has not received independent practitioner review and has not established prospective real-world predictive validity.
- Internal blind-record commitments can reveal later edits only when the earlier record was preserved. They are not trusted timestamps, digital signatures, engine-origin authentication, or evidence of accuracy.

## 0.2.0 - 2026-08-23

Calculation-correctness-, depth-, and interaction-focused release. The supported method count is unchanged.

### Added

- A machine-readable registry of 10 narrow source records and 26 applicability-constrained rules. Source records cover pinned implementation provenance, limited historical terminology, and the bounded Zi Wei phase-analysis order; they do not establish predictive validity.
- A professional-depth reading protocol with separate `quick`, `standard`, `deep`, and `audit` contracts. Deep and audit readings require uncertainty summaries, traceable reasoning, alternative readings, and structured next steps.
- Structural facts for more disciplined synthesis: BaZi day-master/month context, separate unweighted occurrence counts and explicit stem/branch relationships; Zi Wei three-directions-and-four-alignments and mutagen-location indices; Western unweighted element/modality summaries and tight-aspect priority.
- `time_precision` provenance for birth inputs and outputs, including consistency validation.
- A continuous Chinese terminal wizard with in-place validation, natural-language menus, confirmation and edit flows, progress notices, concise result home, details, sensitivity, privacy-gated audit output, edit-and-recalculate, new session, and `q` exit.
- A result-first reading renderer that validates the reading payload before presenting the user's question, direct conclusion, topic-grouped claims, practical steps, limitations, and next actions without leaking internal IDs or hashes.
- Explicit Zi Wei `target_date` support for known-time charts, retaining calculation-only natal, decadal, and yearly palace/star/transformation facts plus profile-boundary fixtures.
- A bounded Zi Wei reading map for 12 life areas, 14 major-star axes, four transformations, and natal → decadal → yearly synthesis without event certainty.
- An offline smoke test that traps standard Node network APIs while exercising every shipped engine.

### Changed

- BaZi now fails closed unless every admitted civil instant has an actual UTC offset of `+08:00`. Mean-solar and apparent-solar BaZi profiles are disabled until solar-term year/month boundaries can be separated safely from local day/hour calculation. Users must keep the original birthplace civil time rather than hand-convert it.
- Zi Wei explicitly declares `birthplace-civil` as its calendar-day basis. Results outside UTC+08:00 carry a profile-qualification warning because overseas calendar-day handling is school-specific rather than universal.
- Zi Wei mean-solar and apparent-solar overrides are disabled until calendar-day selection and local time-index calculation can be represented as separate clocks; this prevents a solar-time correction from silently crossing the declared civil calendar day.
- Western apparent motion now uses symmetric forward/backward `6`, `12`, and `24` hour windows. Direct or retrograde is reported only when all windows agree; inconsistent near-station results remain uncertain.
- The reading validator now checks rule scope, countable fact roots or explicitly registered material scalar paths, required fact values, permitted epistemic status, and required source bundles, rather than accepting a known rule ID or any path-shaped citation alone.
- The visible summary is now structurally bound to the first claim statement, and the renderer displays that headline only once after validating the whole reading. Unresolved claims must use explicit uncertainty language and cannot carry an affirmative future outcome.
- Structured follow-ups now use a controlled input vocabulary and optional `target_system`; multi-system actions must name their target, while Tarot/I Ching question or draw changes must start a non-reusing new reading.
- Ordinary visible fields reject actual profile IDs, internal technical keys and versions, raw candidate/probe counts, warning codes, trace IDs, and hashes without rejecting ordinary uses of words such as “profile,” “warning,” or “sensitivity.”
- Deep/audit validation now enforces non-empty uncertainty, per-claim reasoning and alternatives, and structured practical next steps.
- Every deep/audit traditional or interpretive claim must cite at least two distinct material fact roots; aliases, parent containers, and explanatory metadata cannot pad the count. One-fact observations must remain preliminary at standard depth.
- Material calculation warnings must survive into the reading contract. Overseas Zi Wei claims are forced to `qualified` and `profile_specific` until the `CALENDAR_DAY_PROFILE_QUALIFIED` convention is acknowledged.
- The terminal wizard now asks for optional Western coordinates up front, shows audited motion direction, discloses overseas Zi Wei's civil-day convention before confirmation, resolves both sides of a repeated DST clock time explicitly, and refuses to reinterpret nonexistent DST-gap times.
- The first terminal choice is now the user's goal rather than a list of methods. Profiles, warnings, candidate counts, versions, and hashes stay behind a separate technical-record action.
- Follow-ups reuse a frozen calculation or draw. Changing a Tarot/I Ching question requires an explicit new draw/cast; changed chart facts invalidate the old reading instead of carrying favorable conclusions forward.
- Past-event comparison now remains informal and retains matches, misses, and unclear cases rather than using biography to tune the result. Formal scoring is reserved for forward claims frozen before their observation windows.
- Model-tier guidance now states that a general model can complete the core workflow and a focused deep reading when rules cover the request. Pro is recommended for complex synthesis and an adversarial second review, but cannot replace missing rules, sources, or calculations.

### Safety and integrity

- Added a conservative lexical floor for explicit fatalism, guaranteed outcomes, all-in financial instructions, stopping treatment, diagnostic/death certainty, and certainty about a third party's private mind.
- Clarified throughout that a `verified` source status verifies the source record and its narrow scope only. It is not evidence that divinatory predictions are empirically accurate.
- Full audit JSON remains opt-in because it can expose birth details, private questions, or replay material in terminal history.

### Known limitations

- The source and rule registries are deliberately narrow, not a comprehensive classical corpus or a complete professional-school knowledge base.
- The validator checks machine-readable bindings and a conservative phrase set; it does not prove that unrestricted prose is semantically sound or professionally correct.
- BaZi outside actual UTC+08:00, BaZi strength/pattern/useful-god/luck-cycle analysis, Zi Wei flow-month/day/hour or event-timing readings, and broader Western techniques remain unavailable.
- Zi Wei overseas calendar-day handling is a declared `birthplace-civil` profile convention and may differ from another school.
- Meihua remains a two-number preview. Liu Yao, Qi Men, and Vedic astrology remain planned and fail closed.
- No chart graphics, MCP/HTTP API, external user validation, or independent domain-expert certification is included yet.

## 0.1.0 - 2026-08-23

Initial local release candidate.

### Added

- Agent Skill state machine, progressive system references, evidence contract, safety contract, and standard/audit model tiers.
- Local BaZi, Zi Wei, tropical whole-sign Western natal, Tarot, I Ching, and preview Meihua engines.
- Strict input schemas, named calculation profiles, structured envelopes, and internal fact/full-envelope integrity digests. The digests detect record changes; they do not establish accuracy or provenance.
- Full civil-day unknown-time scans for BaZi and Zi Wei; 60-second planetary range scan for unknown Western birth time.
- Explicit DST gap/overlap handling and skipped-civil-date rejection.
- Secure local random draws, replay seeds, seed commitments, user-supplied card/line modes, and coin transcripts.
- Reading validator with system/profile/fact/rule binding and anti-probability/anti-voting gates.
- Fail-closed CLI and JSON hardening for repeated flags, prototype-like keys, malformed field types, coordinate half-pairs, and private error values.
- Candidate/sample coverage enforcement for every stable, partly stable, or boundary-sensitive unknown-time claim.
- Doctor, release checker, Skill archive builder, tests, bilingual README, benchmark, competitor audit, CI, security policy, and third-party notices.

### Known limitations

- Meihua is a two-number preview only.
- Liu Yao, Qi Men, and Vedic astrology are planned and fail closed.
- Western houses are whole-sign only; no nodes, Chiron, asteroids, Placidus, synastry, or transits.
- No bundled verified classical source registry; `verified` source status is rejected.
- No MCP, HTTP API, chart graphics, or external user validation yet.
