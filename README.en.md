# Fortune Teller

[![CI](https://github.com/jmf-enigma/fortune-teller/actions/workflows/ci.yml/badge.svg)](https://github.com/jmf-enigma/fortune-teller/actions/workflows/ci.yml)

[中文](README.md) · [Scope](docs/SCOPE.md) · [Evidence-bound deep-reading protocol](references/professional-reading.md) · [Accuracy evaluation](references/accuracy-evaluation.md) · [Benchmark](BENCHMARK.md) · [Release audit](docs/RELEASE_AUDIT.md)

Fortune Teller is an accuracy-first, result-first Agent Skill for a deliberately limited set of Chinese and Western divination systems. “Accuracy-first” here means reducing correctable errors—a wrong chart, wrong rule, cherry-picked evidence, or freely rewritten conclusion—not claiming that real-world predictive validity has been established. It does not compete by listing the most methods. It first asks whether the user wants a life overview, one life area, or help with a current question; calculations stay local, and the useful answer comes before technical machinery.

Pinned local programs calculate charts and casts; the conversational model handles intake, explanation, comparison, and audit. The project makes no claim that divination or astrology has scientifically validated predictive power.

Current release: `0.4.0`. Public repository: [jmf-enigma/fortune-teller](https://github.com/jmf-enigma/fortune-teller).

## Results before internal terminology

Ordinary users do not need to understand calculation conventions or internal audit records. Birth and phase readings use one plain-language hierarchy: **conclusion first → phase timeline when available → topic cards → reality checks → uncertainty → next steps**. Each topic card uses **conclusion → plain-language interpretation → chart basis (terminology) → what would change the judgment → real-world reminder**. Summary and plain-language text are split into sentence-level bullets, terminology evidence is split at semicolons, and revision conditions appear one per bullet for rapid scanning. The timeline appears only when a phase was explicitly and exactly calculated; its headline uses plain categories such as collaboration/expression support, resource support, friction or sudden pressure, movement/change, relationship interaction, and buffering/problem-solving, while detailed stars stay in the evidence layer. A current-question reading likewise starts with a conditional answer, then the present tension, support and risk, and one reversible real-world action. Ordinary output visibly includes “why this follows,” counter-readings, and concrete support/contradiction/unclear checks. Profiles, warning codes, hashes, and other internal fields stay in the separately opened technical record. Hashes are secondary change-detection fields, not accuracy or provenance evidence.

## What “accurate” means here

The project does not compress unrelated questions into one “accuracy” score. An evidence-bound reading separates these axes when relevant:

- **Calculation status:** whether the declared time, calendar, and algorithm profile was calculated inside its supported boundary.
- **Input sensitivity:** what remains stable and what changes when birth time, zone, location, or school profile changes.
- **Interpretation status:** whether a statement is a calculation fact, traditional rule, bounded model interpretation, or unresolved.
- **Source coverage:** whether the exact rule has a narrow registered source and what that source actually supports.
- **External review:** whether the implementation or claim has only fixture-level engineering review or independent domain-expert review.

This makes it possible to inspect calculation consistency, fact/rule traceability, and visible uncertainty separately. It does not prove that a traditional prediction is empirically true.

Past events can be discussed as fit or mismatch, but they cannot be turned into a blind test after the fact. The executable forward check is restricted to Zi Wei `R-ZW-009`. Decadal and yearly layers must each contain the complete dynamic four-palace slots `[0,+4,+8,+6]` and every registered period-star condition in those slots; both selected-topic-slot decadal and yearly transformation sets must exist and be included in full; at least one item is required across them, while either individual set may be empty. Formal criteria jointly require every natal focus-group axis, every registered condition across the decadal four slots, every registered condition across the yearly four slots, and every selected-topic-slot phase process. Natal baseline, decadal environment, and yearly trigger cannot substitute for one another. The transformation asymmetry is deliberate: period stars cover the dynamic four palaces, but phase transformations still cover only the selected topic's dynamic slot, not four-palace transformation convergence or a complete Zi Wei judgment. The observation window is the exact continuous interval containing `target_date` during which both decadal and yearly records remain unchanged under the current profile, never a default Gregorian year. If replay cannot fully bracket both endpoints—including near the 2100 upper bound—the route fails closed. The check asks whether that exact three-layer combination repeatedly becomes salient, not whether the life area was generically busy, and it does not predict a promotion, admission, marriage, resignation, illness, or any other concrete event or result. This still does not establish scientific predictive accuracy.

## Supported scope

| System | Status | Implemented boundary and depth |
|---|---|---|
| BaZi | stable with calendar-reference restriction | Gregorian input, IANA zones, midnight/Zi-start day boundaries, and a real-civil-day unknown-time scan. With an exact time and explicit traditional direction parameter, it calculates exact luck onset, 24 decadal intervals, a LiChun-bounded target year, and named natal/decadal/year relations. Its mechanical adjudicator keeps competing strength hypotheses, requires registered compound formation/damage/paired-rescue routes, and separates pattern, support/control, climate, passage, and disease/remedy lenses. Unclosed weight, position, control, or transformation conditions remain screening-only. It proceeds **only when every admitted birth instant has an actual UTC offset of `+08:00`**; other offsets fail closed and must not be hand-converted |
| Zi Wei Dou Shu | qualified | Pinned `iztro` default and Zhongzhou profiles, twelve palaces, three-directions-and-four-alignments indices, and transformation locations. Five topics have machine-bound complete four-palace units. Only `R-ZW-007/008/009` enter the closed meaning layer. `R-ZW-007/009` read fourteen-major-star same-palace combinations, brightness, the six benefics, six pressure stars, Lucun, and Tianma; the fixed result rule pack registers 24 major-star pairs, 14 natal context modifiers, and 11 period-star modifiers. `R-ZW-008` includes every natal transformation in the topic. `R-ZW-009` reads natal baseline → decadal environment → yearly trigger; decadal and yearly each cover four dynamic slots `[0,+4,+8,+6]` and all registered period-star conditions, while phase transformations remain limited to the selected topic's dynamic slot. It therefore does not claim four-palace phase-transformation convergence or a complete Zi Wei judgment. Unknown time never synthesizes one chart and disables the phase view |
| Western natal astrology | stable-whole-sign | Tropical planets, Ascendant/MC, whole-sign houses, five aspects, unweighted element/modality counts, and tight-aspect summaries. Motion direction is accepted only when forward/backward `6/12/24`-hour windows agree; otherwise it is uncertain. Angles and houses are omitted without birth time |
| Tarot | stable | Local 78-card names and original short prompts, five spreads, secure random, replay seed, and manual cards |
| I Ching | stable | Per-coin transcript, six bottom-up lines, 64-hexagram King Wen mapping, changing hexagram, and replay seed |
| Meihua two-number | preview | Deterministic two-number cast and explicit moving line; no body/use, five-element, or timing engine |
| Liu Yao, Qi Men, Vedic | planned | Registered but intentionally fail closed because no engine is shipped |

“Stable” is an engineering status within the declared scope. “Qualified” means that a material profile condition must remain visible. Neither status asserts predictive validity. See [docs/SCOPE.md](docs/SCOPE.md) for the complete boundary.

## Professional depth

Release `0.4.0` concentrates professional depth on whether a conclusion is actually supported by this exact chart:

- [14 source records](src/data/source-registry.mjs) cover pinned implementations, limited historical terminology, chapter-anchored BaZi formation/rescue and luck-method provenance, and bounded Zi Wei palace, transformation, and phase guidance;
- [31 machine-readable rules](src/data/rule-registry.mjs) declare system, claim scope, minimum fact references, source bundles, and permitted epistemic states;
- BaZi no longer promotes a transparent month-command stem directly to a completed pattern. A registered compound formation route is required; only a closed damage route can produce failure, and only its matching closed rescue can produce rescue. The adjudicator is replayable through `adjudicateBazi`/`adjudicate-bazi`; general-reading rules `R-BZ-005/006` remain unresolved-only until a dedicated typed binding can independently reconstruct the result;
- BaZi target dates are read in natal → complete decadal interval → LiChun-bounded year order. A period Ten God is only a candidate route input, and generic three-layer structural linkage is not promoted into a completed pattern activation or life event;
- each reading is bound to the exact calculation, and each claim is bound to the exact paths and values of its cited facts, so a stale reading or substituted fact fails validation;
- Zi Wei topic synthesis cites one generated topic unit and its complete four-palace set, including registered same-palace major-star combinations, emitted major-star brightness, six benefics, six pressure stars, Lucun, and Tianma. The bounded result rule pack contains 24 major-star pairs, 14 natal context modifiers, and 11 period-star modifiers; modifiers are conditions, not a score;
- if and only if a Zi Wei claim uses `R-ZW-007`, `R-ZW-008`, or `R-ZW-009`, a closed registry derives its `meaning_binding` from five topic markers, fourteen registered major-star constructive/overextension axes, and four transformation process lenses. For `R-ZW-007/009`, `fortune-teller/ziwei-meaning-binding/v2` uses `palace_axis_groups` to cover the complete four-palace fourteen-major-star axis set in fixed role/offset order. `bind-reading` mechanically replaces `statement`, `reasoning_summary`, `alternative_readings`, `practical_reflection`, and `assessment`; `validate-reading` independently recomputes them and requires an exact match;
- `R-ZW-008` cannot select one convenient natal transformation: it binds every transformation in the selected topic unit. `R-ZW-009` binds decadal and yearly complete dynamic four-palace slots plus all registered period-star conditions, in natal-baseline → decadal-environment → yearly-trigger order. Its decadal and yearly phase-transformation sets still come only from the selected topic's dynamic slot; both are complete, at least one item is required across them, and either individual set may be empty; otherwise it downgrades;
- A separate developer-facing Zi Wei adjudication API accepts only three immutable replay-bound structural candidates. It blocks arbitrary formation names, fake calculation references, and cross-layer fact reuse; it is neither a 45-pattern corpus nor an ordinary result path and must not be presented as complete formation recognition;
- in typed semantics, natal major stars use `star_in_palace` with the emitted `brightness`, while dynamic decadal/yearly stars use `period_star_in_slot` to lock scope, relation role, star, period palace, and natal palace;
- this meaning layer never generates a concrete life event or result. If the primary palace has no registered major star, no star may be borrowed from a trine or opposite palace; if the complete four-palace axes, a transformation, or the exact phase interval cannot be reproduced, evidence is incomplete, or the user asks whether a promotion, resignation, marriage, or similar event will happen, the result must narrow to chart facts, a bounded theme, or `unresolved` rather than model intuition;
- exact technical assertions across all six shipped systems—hexagram/line, card/position/orientation, pillar/relationship, planet/sign/motion/aspect, and Zi Wei star/palace/transformation—must be mechanically rendered from typed bindings to the actual facts; free narrative cannot restate or contradict them;
- every interpretation supplies observable supporting and contradicting criteria, while common both-sides Barnum formulations fail validation;
- prospective checks freeze criteria that jointly require every natal focus-group axis, every registered condition across all four decadal slots, every registered condition across all four yearly slots, and every exact-topic-slot phase process. The three layers cannot substitute for one another; four-palace phase-transformation convergence, generic domain activity, and internal integrity fields are never treated as accuracy evidence;
- `bind-reading` fixes the result title, `user_focus` from the unique canonical Chinese topic labels of all claims in claim order, non-prediction disclaimer, uncertainty summary, exact material warning-code set, and next-step labels/unavailable reasons. Claims cannot carry free-text `dependencies`; input conditions belong in calculation certainty, sensitivity, or an explicit unresolved statement. A single-system reading omits `cross_system`; a multi-system reading is fixed to `{relationship: "not_compared"}`. The current binder does not claim to classify systems as equivalent, complementary, or conflicting, and never supplies a winner, vote, or free-text reconciliation;
- every non-closed claim is prohibited from making a future-event assertion; without an applicable closed route, the answer stays factual, current-reflective, or `unresolved`;
- registered interpretation profiles pin the approved calculation profiles and rule pack; custom mixed Zi Wei profiles cannot pose as reviewed deep interpretation;
- `validate-reading` checks rule applicability to the cited facts and claim scope, rather than merely checking that an ID exists, and verifies registered sources;
- every interpretive claim must cite at least one applicable registered rule; without rule coverage it must remain a calculation fact or unresolved rather than becoming model-authored expertise;
- `standard`, `deep`, and `audit` use structured continuation actions so the validator can distinguish reuse from a new reading and reject backstage fields in ordinary result text;
- `deep` and `audit` require an uncertainty summary, reasoning summaries, alternative readings, and structured next steps;
- every traditional or interpretive `deep`/`audit` claim must cite at least two distinct, materially related chart-fact roots; multiple leaf fields under one fact object still count as one root, and a one-root observation belongs in `standard` as preliminary, not in a deep synthesis;
- practical reflections must be small, observable, reversible, and independently sensible if the traditional premise is wrong.

The four reading levels are:

- `quick`: a direct answer, one or two supporting themes, one material limitation, and next actions;
- `standard`: one system and one topic, with three to five result-first material claims;
- `deep`: result-first synthesis of internal structure, support and constraints, counter-readings, and sensitivity;
- `audit`: complete fact/rule/source mappings, candidate coverage, conflict matrices, and a machine-readable appendix.

A source marked `verified` means only that the project checked the edition or implementation record and its declared scope. **It does not validate divinatory predictions or authorize claims beyond that scope.** The validator catches structural errors and a conservative set of explicit unsafe phrases, but it is not a semantic theorem prover or domain-expert certification. A `deep` or `audit` pass still requires narrative review. See [references/professional-reading.md](references/professional-reading.md) and [references/evidence-contract.md](references/evidence-contract.md).

## Quick start

Requires Node.js 20 or newer. All three birth-chart engines fail closed outside their release-tested range of `1900-01-01` through `2100-12-31`.

```bash
npm ci --ignore-scripts
npm run check
npm start
```

`npm start` opens a Chinese guided interface; users do not need to know JSON or profile IDs. It:

1. asks whether the user wants a life overview, one life area, a current question, or a specific method;
2. asks only for fields needed by the routed system and validates them with in-place retry;
3. shows a confirmation screen before start, edit, cancel, or advanced-profile selection;
4. displays a progress notice before an unknown-time scan;
5. presents a concise result start and hides input impact and technical records behind “why this follows”;
6. freezes the result for follow-ups and explicitly confirms a new draw/cast when the user changes questions;
7. supports edit-and-recalculate, a new session, exit, and `q` from any input prompt;
8. gives a second privacy warning before printing full audit JSON that may contain birth data or a private question.

For Western charts with a known time, the wizard asks for optional coordinates up front. A repeated DST clock time exposes the earlier and later real UTC instants; a nonexistent gap time can only be corrected. Overseas Zi Wei input shows the `birthplace-civil` calendar-day convention and its school limitation before calculation is confirmed.

The terminal wizard fixes local calculation facts rather than improvising destiny prose. In an Agent, `$fortune-teller` turns the same frozen result into an answer-first reading. It does not recalculate or redraw for follow-ups unless the user changes a key input or explicitly starts a new question.

## Structured calculation

Discover the live contract before constructing requests:

```bash
node scripts/fortune-teller.mjs methods --json
```

Inspect the exact registered sources and rules for one system when preparing a sourced reading:

```bash
node scripts/fortune-teller.mjs sources --system bazi --pretty
```

Example request (save it as the git-ignored `request.local.json`):

```json
{
  "system": "bazi",
  "input": {
    "date": "2000-08-16",
    "time": "04:00",
    "timezone": "Asia/Shanghai"
  },
  "profile": "bazi-civil-midnight-consistent-v1"
}
```

```bash
node scripts/fortune-teller.mjs calculate --input request.local.json --pretty
```

An output path is create-only and never overwrites an existing file. BaZi requests must preserve the birthplace's original civil clock reading; do not hand-convert a birth time to satisfy the `+08:00` restriction.

After an Agent creates a structured reading, validate it before rendering the ordinary result:

```bash
node scripts/fortune-teller.mjs bind-reading --input reading-draft.local.json --output reading-bound.local.json --pretty
node scripts/fortune-teller.mjs validate-reading --input reading-bound.local.json --pretty
node scripts/fortune-teller.mjs render-reading --input reading-bound.local.json
```

Binding is a mechanical integrity step, not an endorsement of the interpretation. It renders supported technical assertions into an exact, non-editable `technical_summary` and fixes title, stable unique all-claim-topic user focus, disclaimer, uncertainty, material-warning, single/multi-system, and next-step presentation fields. Validation rejects an unsupported reading. Ordinary rendering follows “conclusion → phase timeline when available → topic cards (conclusion / plain language / chart basis / revision conditions / real-world reminder) → reality checks → uncertainty → next steps.” Terminology and the technical record come later; profile IDs, warning codes, fact IDs, and hashes stay hidden.

For a forward-looking reality check, first validate a Zi Wei `R-ZW-009` three-layer salience claim with a `prospective_hypothesis` assessment. It must contain the complete natal four-palace fourteen-major-star axes; the complete `[0,+4,+8,+6]` decadal and yearly dynamic slots with all registered period-star conditions; complete selected-topic-slot decadal and yearly transformation sets with at least one item across them (either individual set may be empty); and exact start/end dates for the replayed interval in which both records remain unchanged. Criteria jointly require the natal focus axes, decadal four-slot conditions, yearly four-slot conditions, and exact-topic-slot processes, with no cross-layer substitution. Exact-slot transformations must not be expanded into four-palace phase-transformation convergence. Other systems, rules, concrete events, generic domain activity, and narrower timing are not accepted. User-entered evidence is not independently authenticated. See [references/accuracy-evaluation.md](references/accuracy-evaluation.md).

### Random replay

A fresh draw returns only a seed commitment by default. Set `reveal_seed:true` only when the user explicitly wants replay access:

```json
{
  "system": "tarot",
  "input": {
    "question": "How can I compare these two options more clearly?",
    "spread": "decision",
    "reveal_seed": true
  }
}
```

The tool does not persist the returned seed. Supplying it again replays the draw. Compare the actual card/cast facts first; use `facts_hash` only as a secondary backstage signal. A fresh draw and replay can have different full `reproducibility_hash` values because their random provenance differs.

## Agent Skill installation

Copy or symlink the complete folder into the host's skills directory. For a common Codex setup:

```bash
cd /absolute/path/to/fortune-teller
npm ci --ignore-scripts
ln -s /absolute/path/to/fortune-teller ~/.codex/skills/fortune-teller
```

The archive does not bundle `node_modules`; install the locked dependencies in the extracted directory before first use. An agent must not perform that networked installation without permission.

Then invoke `$fortune-teller`. The portable core is `SKILL.md`, relative references, the local CLI, and JSON schemas; `agents/openai.yaml` is optional Codex UI metadata.

## Standard model vs Pro

A standard/general model is sufficient for chart calculation, one-system standard readings, one Zi Wei target-date phase, a Tarot current-question reading, engine-aggregated time sensitivity, and a small set of traceable evidence cards. It can also complete a focused `deep` reading when the interactions are limited and the requested rules and sources are actually covered. Standard mode is complete, not an upgrade teaser.

A Pro model or larger reasoning budget is recommended for long multi-factor synthesis, multi-system or multi-profile conflict audits, exhaustive source-coverage reports, and an adversarial second pass. Both tiers use identical local facts. Pro cannot change a chart, validate a traditional prediction, **or repair a missing rule, source, or specialist calculation module**. See [references/model-tiers.md](references/model-tiers.md).

## Backstage verification and evidence

Accuracy checks first replay the pinned engine or structurally recompute the facts, then verify rule and meaning bindings. Only after those checks do hashes serve as secondary signals that serialized records changed. Ordinary output does not show them.

- `facts_hash` is a backstage integrity field for comparing engine version, system, profile, and calculated or recorded facts.
- `reproducibility_hash` is a backstage integrity field for comparing the wider envelope except its generation timestamp, including normalized input, warnings, sensitivity, provenance, and Node/ICU/tzdb runtime.
- `meta.time_runtime` records the environment that can affect historical timezone conversion.
- `profile` preserves material conventions such as day boundary, calendar-day basis, house system, and reversal rules.
- `sensitivity` separates stable, changing, and unavailable fields when input is incomplete.

Neither hash improves accuracy, authenticates engine origin, or proves provenance or predictive validity. The interpretation layer uses `calculation_fact`, `traditional_rule`, `interpretation`, and `unresolved`. `validate-reading` first replays or structurally checks the calculation, then checks system/profile binding, fact IDs, rule path/value applicability, registered sources, material-warning acknowledgement, candidate denominators, prohibited probability/voting fields, and exact typed technical assertions. For the three closed Zi Wei routes, it also recomputes the meaning binding, result text, alternatives, practical reflection, and assessment criteria. It sets a conservative lexical floor against explicit fatalism, all-in financial advice, stopping treatment, and similar unsafe language; prose outside the closed Zi Wei layer is not machine-proved.

## Safety and privacy

- The source engines contain no network calls; dependency installation still accesses the npm registry.
- The tool does not persist user input by default. Do not commit real birth records, precise locations, private questions, or replay seeds.
- Do not use it to diagnose health conditions, determine pregnancy, predict death, establish guilt, direct legal or financial action, determine another person's fidelity, or validate paranoia.
- A seed is a replay credential, not a cryptographic secret or a measure of divinatory validity.
- The source registry stores narrow metadata and links; it does not copy historical texts or competitor knowledge bases.

See [SECURITY.md](SECURITY.md), [references/safety.md](references/safety.md), and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Development

```bash
npm test
npm run doctor
npm run verify
npm run check
npm run package:skill
```

GitHub Actions runs the checks on Node 20, 22, and 24 and inspects the npm package and Skill archive. The release manifest contains exactly 90 items and the archive must match it exactly. A release archive should also be extracted into a clean temporary directory, reinstall locked dependencies, and pass `npm run check` there.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/RELEASE_AUDIT.md](docs/RELEASE_AUDIT.md), [CONTRIBUTING.md](CONTRIBUTING.md), and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Comparison boundary

Fortune Teller does not compete on method count. Within its smaller supported core, it aims to make calendar/time failures explicit, preserve unknown-time sensitivity, replay random casts, standardize envelopes, validate rule applicability, trace narrow sources, require professional depth contracts, and keep the Chinese interaction continuous.

It still lacks the breadth, full historical corpora, chart graphics, MCP/HTTP APIs, external user base, and independent domain-expert review of larger projects. Its BaZi strength result is still a bounded competing-hypothesis screen; complete weight/position/control/transformation adjudication, special patterns, a verified climate table, dynamic compound-route re-adjudication, and life-event mapping remain unavailable. Broader Western house/timing techniques also remain unavailable. Zi Wei currently stops at five bounded natal–decadal–yearly topics; it does not implement flow-month/day/hour timing or guaranteed events. The current interpretation layer has automated fixture and adversarial-case review, not independent practitioner review, and predictive validity remains unestablished. The project therefore does not claim to be universally “best” or more predictively accurate. See [docs/COMPETITOR_AUDIT.md](docs/COMPETITOR_AUDIT.md) and [docs/PROFESSIONAL_COVERAGE.md](docs/PROFESSIONAL_COVERAGE.md).

## License

Project-authored code is [MIT licensed](LICENSE). Production dependencies use MIT, ISC, and Apache-2.0 licenses; attribution is in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
