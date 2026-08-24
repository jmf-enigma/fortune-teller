# Changelog

All notable project changes are documented here.

## 0.2.0 - 2026-08-23

Calculation-correctness-, depth-, and interaction-focused release. The supported method count is unchanged.

### Added

- A machine-readable registry of 10 narrow source records and 26 applicability-constrained rules. Source records cover pinned implementation provenance, limited historical terminology, and the bounded Zi Wei phase-analysis order; they do not establish predictive validity.
- A professional reading protocol with separate `quick`, `standard`, `deep`, and `audit` contracts. Deep and audit readings require uncertainty summaries, traceable reasoning, alternative readings, and structured next steps.
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
- Retrospective checks now freeze hypotheses before feedback and retain matches, misses, and unclear cases rather than using biography to tune the result.
- Model-tier guidance now states that a general model can complete the core workflow and a focused deep reading when rules cover the request. Pro is recommended for complex synthesis and independent review, but cannot replace missing rules, sources, or calculations.

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
- Strict input schemas, named calculation profiles, structured envelopes, fact and full-envelope hashes.
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
