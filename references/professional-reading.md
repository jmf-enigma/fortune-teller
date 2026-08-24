# Evidence-Bound Deep Reading Protocol

Read this file for `deep` mode, any request for professional depth, or any request to explain why a conclusion follows. Accuracy-first here means reducing correctable calculation, rule-selection, evidence-selection, and free-rewriting errors; it never upgrades traditional divination into validated prediction. Version 0.6.0 gives all six shipped systems a replay-checked result-first adjudicator; BaZi adds three bounded topic routes and Zi Wei `R-ZW-007/008/009` retain the stricter canonical meaning binding plus supplemental 55-condition/32-refusal pattern evidence. The shipped profiles are automated-fixture reviewed, have no independent practitioner review, and do **not** permit a certified professional label.

## 1. Say what “accurate” means

Never compress accuracy into one adjective, hit rate, or score. Three different questions must remain separate:

1. **Calculation correctness** — did the engine reproduce the declared chart/cast under the declared profile?
2. **Traditional-rule fidelity** — did the interpretation follow the selected rule pack without changing school, topic, evidence, or meaning?
3. **Real-world predictive validity** — do pre-stated claims predict independently observed outcomes better than suitable baselines?

Passing one layer does not pass the next. A correct chart can be interpreted incorrectly; a tradition-faithful interpretation can still lack real-world predictive validity. The current detailed evaluation protocol is [accuracy-evaluation.md](accuracy-evaluation.md).

Report these implementation axes separately when they matter:

| Axis | Allowed values | Meaning |
|---|---|---|
| Calculation status | `wrapper_conformant`, `cross_validated`, `profile_specific`, `unavailable` | Whether the software faithfully calculated the declared representation |
| Interpretation status | `fact_only`, `reflective`, `project_authored_bounded_rules_with_source_anchors`, `unresolved` | How far the narrative goes beyond facts; source anchors do not imply that every project-authored synthesis sentence appears in a historical text |
| Source coverage | `none`, `partial`, `covered_for_claim` | Whether the exact cited rule has a registry source within its stated scope |
| External review | `not_reviewed`, `automated_fixture_reviewed`, `domain_expert_reviewed` | Whether the implementation has only internal automated fixture review or has also received independent domain-expert review |
| Predictive validity | `not_established` unless a preregistered, independently replicated evaluation changes it | Whether claims outperform relevant baselines on unseen outcomes |

`verified` source status means only that the project checked the source or implementation record and its declared scope. It does not establish the rule's truth or authority, and it does not validate a real-world prediction.

Current release boundary: all shipped interpretation profiles are `automated_fixture_reviewed`; no profile is independently `domain_expert_reviewed`; predictive validity is `not_established`. See the system-by-system matrix in [PROFESSIONAL_COVERAGE.md](../docs/PROFESSIONAL_COVERAGE.md).

## 2. Four reading levels

- `quick`: one direct conditional answer, one or two supporting observations, one material limitation, and a continuation menu. Technical calculation receipt stays backstage unless requested.
- `standard`: one system and one topic, three to five result-first material claims at most, representative backstage evidence cards, and alternatives for interpretive claims.
- `deep`: one system by default; reconstruct the chart's internal structure, weigh support and constraints, answer one user topic, expose counter-readings and sensitivity, and provide every material claim as an evidence card.
- `audit`: technical trace of frozen envelopes, profiles, candidate accounting, rule applicability, source coverage, conflicts, validator output, and a machine-readable appendix. Audit is not a more deterministic destiny reading.

A longer answer is not automatically deeper. A `deep` reading that only lists isolated symbols or repeats keywords must be downgraded to `standard` or `fact_only`.

Do not present `deep` as `professional` merely because the output is detailed. A professional label requires a separately gated, independently practitioner-reviewed rule pack; none is enabled in the current release.

Regardless of depth, the ordinary natal/phase result uses one stable hierarchy so a non-specialist can understand it at a glance:

1. lead with a one- or two-sentence conclusion, split into sentence-level bullets;
2. show the exact phase timeline next when available; use category-level plain language and keep detailed stars in the evidence layer;
3. group supported topic cards, requested topic first; within each use `结论 → 白话解读 → 盘面依据（术语） → 什么情况要改判 → 现实提醒`;
4. follow with reality checks, uncertainty, and next steps. Split plain meaning by sentence, evidence at semicolons, and revision conditions one per bullet.

Terminology, complete chart structures, source detail, profiles, warnings, and integrity records belong after that layer. Professional depth comes from better-bound reasoning and visible counterevidence, not forcing the reader through technical vocabulary.

## 3. Evidence-bound synthesis ladder

For each material interpretation, work through this order:

```text
direct observations
-> structural combination
-> supporting and constraining factors
-> user-selected topic
-> counter-reading or missing premise
-> input/profile/source sensitivity
-> observable support and contradiction criteria
-> small reversible next step
```

Quality gates:

1. Make the first claim the direct, evidence-backed headline and copy that statement into `summary`; do not write a separate unsupported executive conclusion. Every traditional or interpretive claim in `deep` or `audit` must cite at least two materially related chart fact roots. Two leaf fields or aliases inside one fact object still count as one fact, a parent collection cannot stand in for its identified members, and explanatory metadata does not count unless a rule explicitly registers that scalar path as material. If only one fact is available, downgrade that observation to `standard`, label it preliminary in prose, and avoid a broad personality or event conclusion.
2. Every interpretive claim must cite at least one rule that is applicable to the calculation mode, profile, fact type, and claim scope according to the machine-readable rule registry. If no rule applies, keep the output factual or unresolved.
3. State what weakens, reverses, or leaves the reading unresolved. `alternative_readings` is mandatory in `deep` and `audit` interpretation cards.
4. Translate symbols into conditional language: “在这个传统框架下，可用来检查……” rather than “你就是……” or “一定会……”.
5. Keep practical reflections small, observable, reversible, and independently sensible. Never justify a high-stakes action by fate.
6. Do not turn absence into a fact. A missing optional star field, aspect, hour pillar, source, or rule is `unavailable`, not a negative omen.
7. Preserve material warnings structurally. Let `bind-reading` set `warning_acknowledgements` to exactly the material warning codes emitted by the supplied calculations, or omit the field when no material code exists. It also fixes the title, `user_focus` as the unique canonical Chinese topic labels from all claims in claim order, non-prediction disclaimer, uncertainty summary, single/multi-system display state, and next-step labels/unavailable reasons. With `CALENDAR_DAY_PROFILE_QUALIFIED`, keep bound claims qualified and profile-specific; do not handwrite a competing uncertainty sentence.
8. A reality check must be able to fail. State at least one observable that supports the claim and one observable that contradicts or materially weakens it; neither may simply paraphrase the conclusion.
9. Keep exact system facts in typed `semantic_bindings`. Zi Wei natal major stars use `star_in_palace` with emitted `brightness`; dynamic period stars use `period_star_in_slot`. `bind-reading` mechanically renders `technical_summary`; free narrative may discuss meaning but must not restate technical facts.
10. Do not confuse a result-first adjudicator with a fully canonical reading-schema meaning proof. Every system adjudicator replays facts and applies its own bounded rule pack, but in the general reading artifact only Zi Wei `R-ZW-007/008/009` overwrite and rederive all non-technical prose. Outside those routes, keep claims within the exact exported adjudicator ceiling and perform narrative review; do not freely strengthen or rewrite them.
11. No route may assert a concrete future event. Keep it structural, current-reflective, conditional-process, or explicitly `unresolved`; “may” does not authorize an unsupported promotion, marriage, illness, offer, move, result, date or probability.

## 4. System-specific order of analysis

### BaZi

1. Confirm time basis, day boundary, calendar reference limitation, and known/unknown hour. Luck cycles require an exact supported instant and an explicit traditional binary direction parameter; never infer that parameter from a person's identity.
2. Run `calculate` first, then pass that exact result to `adjudicateBazi` or generic `adjudicate`. Caller-authored status, source, fact, direction or period objects are never evidence.
3. Read season/month-command candidates, located roots (pillar plus main/middle/residual depth), visible support/pressure and emitted relations before strength. Treat 旺衰 as two competing hypotheses, never a count score. Exact 人元司令分日 and force weights remain unresolved.
4. A month-command Ten God is only a pattern candidate. 成格 requires one complete registered compound route. Only a closed damage route can reach 破格, and only its paired rescue can reach 救应. Weight-, position-, control-, transformation-, tomb/storehouse- or void-dependent conditions remain screening or unresolved.
5. Keep 格局、扶抑、调候、通关 and 病药 separate. 调候 uses one exact 10×12 source-mention screening entry and reports mentioned stems as visible/hidden/absent; array order is not priority, and missing segment/role/condition facts keep it unresolved. 通关 requires a replayable visible control pair and fixed generating mediator, but does not claim that the mediator is strong or effective.
6. Distinguish a two-branch component of 寅巳申 or 丑戌未 punishment from a complete three-branch relation. An active period may complete a relation; completion does not name an accident, disease, dispute or relationship event.
7. For a target date, evaluate all registered formation/damage/rescue routes three times: frozen natal, natal+active decade, natal+decade+LiChun year. Report which conditions opened or closed. Never modify the natal state, treat a period Ten God as sufficient, or substitute graph connectivity for route re-adjudication.
8. Present the route conclusion and plain language first, then evidence, lens differences, stage transitions and change conditions. This release does not provide exact weights, full climate exceptions, complete special patterns, a sourced life-event map, or validated event timing.

### Zi Wei Dou Shu

1. Confirm algorithm/division profile, time basis, and whether one chart is resolved. `adjudicateZiweiReading` must return unavailable for unknown time; never choose a candidate chart from day-scan personality fit.
2. Closed machine-bound deep synthesis supports only `R-ZW-007/008/009` for `overview`, `career_study`, `wealth_resources`, `relationships`, and `wellbeing_rhythm`. `family_social` is explicitly unavailable because the current closed table does not justify substituting another palace. Select the matching `facts.topic_units` record; 疾厄 is secondary context under wellbeing only.
3. Cite the topic unit, its primary palace, its relation fact, and every one of its four `component_palace_ids`. A partial 三方四正 group cannot support `topic_synthesis`.
4. Keep every star, palace, and transformation semantically matched. The cited palace must contain the named star; the mutagen fact must have the named transformation, star, and palace and belong to the selected topic unit.
5. For `R-ZW-007`, use binding schema `fortune-teller/ziwei-meaning-binding/v2`. Across the four ordered palace groups, include every registered same-palace major-star combination, every major-star axis with emitted brightness, and every present 六吉六煞/禄存/天马 condition. The bounded result rule pack contains 24 same-palace pairs and 14 natal modifiers; modifiers are conditions, not scores. Missing, borrowed, malformed, duplicated, or omitted registered content closes the route. This is bounded four-palace coverage, not a complete Zi Wei judgment.
6. For `R-ZW-008`, require a non-empty natal-transformation set and bind every fact listed by the selected topic unit through an exact declared `mutagen_in_palace` binding and the four registered process lenses for 禄、权、科、忌. An empty set, partial set, or favorable-only selection makes the route unavailable. Do not turn the complete set into guaranteed money, status, credentials, disaster, or a net auspiciousness score.
7. For `R-ZW-009`, judge natal baseline → decadal environment → yearly trigger. Decadal and yearly scopes each need exactly four unique dynamic slots `[0,+4,+8,+6]` and every registered period star in those slots; the rule pack contains 11 period-star modifiers and each dynamic star uses `period_star_in_slot`. Separately, bind both complete selected-topic-slot decadal and yearly transformation sets; require at least one item across them, while either individual set may be empty. Period stars therefore cover two dynamic four-palace layers, while phase transformations remain selected-topic-slot only. Derive the maximal continuous interval in which both records remain unchanged and bracket both endpoints by replay. Formal criteria jointly require natal focus axes, all registered decadal four-slot conditions, all registered yearly four-slot conditions, and all selected-topic-slot phase processes; no layer substitutes for another. Generic activity, four-palace phase-transformation convergence, complete judgments, and concrete events are invalid.
8. Ordinary output prefers a complete phase route, transparently falls back to natal when phase predicates do not close, and exposes its `layer`. Give a formal reading claim's exact facts, route, rule, topic, topic unit, semantic bindings where required, and assessment mode to `bind-reading`; it must overwrite and independently rederive canonical prose. Do not hand-edit it.
9. When meaning derivation is unavailable because evidence is incomplete, a star or transformation is unregistered/mismatched, or the requested mode is not allowed, downgrade to chart facts, a narrower bounded theme, or `unresolved`. Never repair the gap with model memory.

Do not add a claim-level `dependencies` list. Use `calculation_certainty` and `input_sensitivity` for input limitations; use an explicit `unresolved` claim when they prevent the requested conclusion. Omit `cross_system` for one system. For multiple systems, require at least one claim for every calculation and the same normalized question for all current-question methods; let `bind-reading` set exactly `{relationship: "not_compared"}`. The contract does not establish equivalence, complementarity, conflict, votes or winners.

### Western natal astrology

1. Confirm tropical zodiac, whole-sign houses, input precision, and whether time/coordinates make angles and houses available.
2. Use the registered topic route: primary house → traditional house ruler as primary plus every occupant as a co-significator → chart ruler → Sun/Moon → up to three closest relevant aspects. Never discard occupants through a planet-priority list. Without houses, disclose the bounded luminary fallback.
3. Preserve applying/separating/exact/uncertain aspect phase; this is birth-instant geometry, not event timing.
4. Use domicile/detriment, exaltation/fall and angular/succedent/cadent only as unscored classical conditions. Outer planets do not receive invented seven-planet dignity.
5. Element/modality counts are descriptive only. Do not add alternative houses/zodiacs, full dignity scoring, nodes, Chiron, patterns, transits, synastry or timing.

### Tarot

1. Freeze the question, spread position, draw source, card, and orientation.
2. Replay card metadata, spread definition, position roles, composition, suit/rank distributions and adjacency; refuse any mismatch.
3. Read position-card units before combination. For Minor Arcana, the exact card-orientation axis is primary and suit/rank are only helpers; they may not overwrite a specific card meaning. In a multi-card spread, preserve every position and contradiction; repeated suits/ranks and adjacency are emphasis, never votes.
4. Answer the actual question before card detail. Decision spreads compare A requirements, B requirements and the criterion but never choose a winner; future/outcome stays conditional.
5. End with one reversible action. Treat project-authored axes as prompts, not Waite quotations, forecasts or private-mind access.

### I Ching

1. Freeze line order, casting provenance, primary hexagram, changing lines, and transformed hexagram.
2. Reconstruct the fixed selector: 0 = primary whole; 1 = that stage; 2–5 = all changing stages parallel and bottom-up; all-six = all stages, with `use_nine/use_six` markers only for pure 9/pure 6.
3. Keep centrality, positional correctness and correspondence unscored. Do not turn them into automatic good/bad labels.
4. Do not invent the unbundled Judgment, 384 line texts or 用九/用六 text. A hexagram mapping cannot support a wealth, health, legal or timing prediction.

### Meihua

Keep the reading at preview depth but use the installed closed chain: exact two-number convention → moving line → body/use (moving half is Use) → mutual hexagram → Five-Element relation before and after change. Treat directional relation as capacity-versus-matter, not automatic 吉凶. With no occurrence time, do not add seasonal旺衰, time/object/omen casting, external response or 应期.

## 5. Evidence and validator boundary

Every material claim must follow `evidence-contract.md`. Run `validate-reading` on `deep` and `audit` payloads before delivery.

The validator replays or structurally recomputes calculation facts where possible, then checks envelope integrity, fact and profile bindings, registered rule applicability, source links, level-specific structure, candidate denominators, and a conservative lexical safety floor. Across all six shipped systems, typed bindings mechanically verify the supported vocabulary of exact technical facts. It also requires at least one claim per supplied calculation; current-question Tarot/I Ching/Meihua calculations must carry the same normalized question, and multi-system rendering remains separate with no vote or winner. For Zi Wei `R-ZW-007/008/009`, it additionally rederives the closed meaning binding and all canonical result fields. It does **not** understand all implications of non-technical free prose outside those routes and is not a theorem prover, an empirical validation, or domain-expert certification. After a pass, still perform a narrative review:

- Could the cited rule actually support the wording?
- Did the statement become broader than its facts or scope?
- Is a countercondition missing?
- Is a reflective suggestion being presented as fate-backed instruction?
- Would the answer remain responsible if the traditional premise were wrong?

If any answer is unsafe or unsupported, narrow the claim even if the validator returned `valid: true`.

## 6. Continuous interaction

Freeze the calculation envelope for the session and reuse it for follow-up questions. Do not ask for birth data again unless the user edits it. Offer only actions supported by the current result:

- deepen one topic;
- show the evidence behind one claim;
- inspect unknown-time sensitivity;
- compare a second declared profile;
- change one input and recalculate;
- open the technical audit;
- close without saving.

When an input or profile changes, invalidate only dependent claims, recalculate the affected system, and show what changed. Do not silently carry conclusions from the old envelope into the new one.

For Tarot or an I Ching three-coin cast, the frozen question and outcome belong together. A follow-up about the same issue reuses the same draw or cast. A materially new question requires an explicit new draw/cast; never redraw merely because the user dislikes the answer. If the user declines, keep the original result unchanged.

## 7. Honest forward-looking check

When the user wants to test a future-facing claim, use the optional reading-bound freeze-and-score check instead of adaptive storytelling:

1. Before the observation window begins, create one to five Zi Wei `R-ZW-009` `prospective_hypothesis` claims. Each must contain complete natal four-palace axes, complete decadal and yearly `[0,+4,+8,+6]` dynamic slots with all registered period-star conditions, and both complete selected-topic-slot transformation sets, with at least one item across them while either individual set may be empty. Canonical criteria jointly require natal focus axes, decadal four-slot conditions, yearly four-slot conditions, and selected-topic-slot processes in the same recorded matter. No layer substitutes for another. Generic activity, four-palace phase-transformation convergence, complete judgment, or concrete event is ineligible.
2. Pass that exact `reading_payload` and the selected `claim_ids` to `freeze-check`. The tool derives the bounded star-axis–phase-process salience hypotheses and preserves the complete reading payload, validation receipt, wording, exact start/end dates, and full criterion objects; free replacement hypotheses are rejected.
3. Preserve both the reading and record. Before adjudication, run reading-bound `verify-check` with `{record, reading_payload}`; record-only verification cannot prove which reading was frozen.
4. Wait until every selected window has closed. Then adjudicate every frozen criterion exactly once as `met`, `not_met`, or `unclear`, with a dated record whose source type matches that criterion. The tool mechanically derives each item as `supported`, `contradicted`, or `unclear`; the user does not supply the hypothesis outcome. Retain misses and ambiguous cases as visibly as hits.
5. Do not change birth time, profile, rule, topic, card, window, criteria, wording, or reading after feedback to rescue a claim. The tool rejects substituted readings and early scoring.
6. Feedback may guide which topic to discuss next, but it does not validate the chart, rank candidate birth hours, or establish an accuracy rate.

Internal integrity checks can detect later alteration only when the earlier record and reading pair were preserved, but `frozen_at` comes from the local system clock and has no trusted external timestamp or third-party attestation. The tool also cannot authenticate user-entered documents or observations. Therefore the feature reduces ordinary hindsight rewriting; it does not improve accuracy, prove preregistration, or become a scientific blind test. Past windows and retrospective hypothesis mode are deliberately rejected by this executable workflow. See [accuracy-evaluation.md](accuracy-evaluation.md).

If the user says a result does not fit, first acknowledge the exact disputed claim. Then offer only: check a potentially wrong input, show why the traditional rule led there and its counter-reading, or stop the reading. Do not fish for details until a vague statement sounds correct, redraw, or replace the original statement with a more flattering one.

## 8. Final deep-reading check

Before calling a result `deep` or describing it as having professional depth, confirm:

- the calculation is inside its declared safe range;
- every material interpretation uses a valid fact combination and applicable rule;
- BaZi distinguishes month-command candidates from day-specific command, base climate priorities from the full exception corpus, a passage candidate from effective mediation, punishment components from a complete relation, and period route re-adjudication from an event;
- every Zi Wei `R-ZW-007/008/009` claim has an exactly rederived meaning binding and canonical five-field result, while unavailable routes were downgraded rather than improvised;
- every `R-ZW-007/009` claim preserves registered same-palace combinations, major-star brightness, all present natal context modifiers, and—for `R-ZW-009`—both complete dynamic four-palace sets with exact `period_star_in_slot` bindings;
- Western omits houses/chart ruler without their premises; Tarot repetitions and decision positions do not vote; I Ching does not invent classic text or rank parallel changing lines; Meihua does not invent occurrence time, seasonal strength or timing;
- the reading has no claim-level `dependencies`; its canonical title, stable unique all-claim-topic `user_focus`, disclaimer, uncertainty summary, exact material-warning list, single/multi-system state, and next-step labels/unavailable reasons came from `bind-reading`;
- every `verified` source is in the registry and scoped to that rule;
- ordinary rendering follows conclusion → phase timeline when available → topic cards (conclusion/plain language/basis/revision conditions/reminder) → reality checks → uncertainty → next steps, with scan-friendly bullets and terminology after plain meaning;
- unsupported specialist modules are named as unavailable;
- any blind-check claim is only an `R-ZW-009` three-layer salience hypothesis whose criteria require natal focus axes, all decadal four-slot conditions, all yearly four-slot conditions, and selected-topic-slot processes without layer substitution;
- `cross_system` is absent for one system and exactly `{relationship: "not_compared"}` for multiple systems; every calculation has a claim, all current-question calculations share the normalized question, and no machine classification, vote, winner, or free-text reconciliation is claimed;
- the output describes current review status as `automated_fixture_reviewed`, not independent practitioner certification, and keeps predictive validity `not_established`;
- no inevitability, private-mind reading, health diagnosis, or fate-backed high-stakes action appears;
- the first screen is still concise and the user can inspect evidence or correct inputs.
