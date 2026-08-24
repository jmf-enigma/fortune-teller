# Professional Reading Protocol

Read this file for `deep` mode, any claim of a professional reading, or any request to explain why a conclusion follows. It constrains the interpretation layer; it never upgrades traditional divination into validated prediction.

## 1. Say what “accurate” means

Never compress accuracy into one adjective or score. Report these axes separately when they matter:

| Axis | Allowed values | Meaning |
|---|---|---|
| Calculation status | `wrapper_conformant`, `cross_validated`, `profile_specific`, `unavailable` | Whether the software faithfully calculated the declared representation |
| Interpretation status | `fact_only`, `reflective`, `sourced_traditional_rule`, `unresolved` | How far the narrative goes beyond the calculated facts |
| Source coverage | `none`, `partial`, `covered_for_claim` | Whether the exact cited rule has a registry source within its stated scope |
| External review | `not_reviewed`, `fixture_reviewed`, `domain_expert_reviewed` | Whether the implementation has only internal automated fixture review or has also received independent domain-expert review |

`verified` source status means only that the project checked the source or implementation record and its declared scope. It does not establish the rule's truth or authority, and it does not validate a real-world prediction.

## 2. Four reading levels

- `quick`: one direct conditional answer, one or two supporting observations, one material limitation, and a continuation menu. Technical calculation receipt stays backstage unless requested.
- `standard`: one system and one topic, three to five result-first material claims at most, representative backstage evidence cards, and alternatives for interpretive claims.
- `deep`: one system by default; reconstruct the chart's internal structure, weigh support and constraints, answer one user topic, expose counter-readings and sensitivity, and provide every material claim as an evidence card.
- `audit`: technical trace of frozen envelopes, profiles, candidate accounting, rule applicability, source coverage, conflicts, validator output, and a machine-readable appendix. Audit is not a more deterministic destiny reading.

A longer answer is not automatically deeper. A `deep` reading that only lists isolated symbols or repeats keywords must be downgraded to `standard` or `fact_only`.

## 3. Professional synthesis ladder

For each material interpretation, work through this order:

```text
direct observations
-> structural combination
-> supporting and constraining factors
-> user-selected topic
-> counter-reading or missing premise
-> input/profile/source sensitivity
-> observable reflection question
-> small reversible next step
```

Quality gates:

1. Make the first claim the direct, evidence-backed headline and copy that statement into `summary`; do not write a separate unsupported executive conclusion. Every traditional or interpretive claim in `deep` or `audit` must cite at least two materially related chart fact roots. Two leaf fields or aliases inside one fact object still count as one fact, a parent collection cannot stand in for its identified members, and explanatory metadata does not count unless a rule explicitly registers that scalar path as material. If only one fact is available, downgrade that observation to `standard`, label it preliminary in prose, and avoid a broad personality or event conclusion.
2. Every interpretive claim must cite at least one rule that is applicable to the calculation mode, profile, fact type, and claim scope according to the machine-readable rule registry. If no rule applies, keep the output factual or unresolved.
3. State what weakens, reverses, or leaves the reading unresolved. `alternative_readings` is mandatory in `deep` and `audit` interpretation cards.
4. Translate symbols into conditional language: “在这个传统框架下，可用来检查……” rather than “你就是……” or “一定会……”.
5. Keep practical reflections small, observable, reversible, and independently sensible. Never justify a high-stakes action by fate.
6. Do not turn absence into a fact. A missing optional star field, aspect, hour pillar, source, or rule is `unavailable`, not a negative omen.
7. Preserve material warnings structurally. With `CALENDAR_DAY_PROFILE_QUALIFIED`, include the code in `warning_acknowledgements`, explain the overseas civil-day limitation in `uncertainty_summary`, and keep bound claims qualified and profile-specific.

## 4. System-specific order of analysis

### BaZi

1. Confirm time basis, day boundary, calendar reference limitation, and known/unknown hour.
2. Read the day master and month/season context before counting visible stems, branches, hidden stems, and Ten-God labels.
3. Examine explicit stem/branch relationships only when emitted by the engine or supported by an applicable rule.
4. Separate visible, hidden, seasonal, and relational evidence. Raw element counts are not strength scores.
5. Do not declare strength, pattern, useful god, luck-cycle event, or timing unless a named, tested profile actually emits those facts and the rule registry covers the inference.

### Zi Wei Dou Shu

1. Confirm algorithm/division profile, time basis, and whether one chart is resolved.
2. Start with 命宫、身宫 and the user-selected topic palace.
3. Use the emitted 三方四正 structural unit: focus palace, two trine palaces, and opposite palace.
4. Keep star, palace, and any emitted brightness or mutagen fields together. Treat derived palace relations as indices only, and do not invent a supportive/challenging-star classification that the envelope and registered rules do not supply.
5. For natal interpretation, use the bounded palace/star/four-transformation prompts in `systems/ziwei-reading-map.md`; do not improvise a deterministic star verdict.
6. When `facts.periods` exists, follow natal baseline → decadal context → yearly emphasis. A professional phase claim must cite all three groups under R-ZW-006 and state an observable countercondition.
7. Treat ordinary palace `decadal` and `ages` arrays as indexes only. Only the explicit target-date `facts.periods` object supports a phase view, and even that does not support a guaranteed event or exact timing.

### Western natal astrology

1. Confirm tropical zodiac, whole-sign houses, input precision, and whether angles/houses are available.
2. Combine planet + sign + house when available, then prioritize the tightest emitted aspects.
3. Use element/modality counts only as unweighted descriptive summaries, never as a validated dominance or personality score.
4. Distinguish direct/retrograde calculation facts from traditional symbolic interpretation.
5. Do not add dignity, rulership chains, nodes, Chiron, patterns, transits, synastry, or timing when the engine did not emit them.

### Tarot

1. Freeze the question, spread position, draw source, card, and orientation.
2. Read position-card pairs before combining cards.
3. In a multi-card spread, identify one support, tension, or sequence across at least two cards; do not keyword-dump.
4. Answer the user's actual question before explaining each card: current situation, primary tension, support/risk, conditional direction, and one reversible action.
5. Treat project-authored keywords as prompts, not verified Waite quotations and not forecasts.

### I Ching

1. Freeze line order, casting provenance, primary hexagram, changing lines, and transformed hexagram.
2. Use only the changing lines actually emitted.
3. Do not invent hexagram or line text. A hexagram mapping rule cannot support a wealth, health, legal, or timing prediction.
4. With no sourced selection rule for multiple changing lines, present the structural change and mark detailed textual priority unresolved.

### Meihua

Keep the reading at preview depth. Explain the exact two-number convention and structural result only. Do not add body/use, five-element generation/control, time casting, or event timing.

## 5. Evidence and validator boundary

Every material claim must follow `evidence-contract.md`. Run `validate-reading` on `deep` and `audit` payloads before delivery.

The validator checks envelope integrity, fact and profile bindings, registered rule applicability, source links, level-specific structure, candidate denominators, and a conservative lexical safety floor. It does **not** understand all implications of free prose and is not a theorem prover or domain-expert certification. After a pass, still perform a narrative review:

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

## 7. Honest retrospective check

When the user asks whether the reading is accurate or offers past events as a test, use an optional blind check instead of adaptive storytelling:

1. Freeze the calculation and write a small set of specific, bounded hypotheses before asking for event details.
2. Ask for one defined past window and one domain, not an open-ended life story.
3. Record every item as `supported`, `contradicted`, or `unclear`; retain misses and ambiguous cases as visibly as hits.
4. Do not change birth time, profile, rule, card, scope, or wording after feedback to rescue a claim.
5. Feedback may guide which topic to discuss next, but it does not validate the chart, rank candidate birth hours, or establish an accuracy rate.

If the user says a result does not fit, first acknowledge the exact disputed claim. Then offer only: check a potentially wrong input, show why the traditional rule led there and its counter-reading, or stop the reading. Do not fish for details until a vague statement sounds correct, redraw, or replace the original statement with a more flattering one.

## 8. Final professional check

Before calling a result `deep` or `professional`, confirm:

- the calculation is inside its declared safe range;
- every material interpretation uses a valid fact combination and applicable rule;
- every `verified` source is in the registry and scoped to that rule;
- alternatives and limitations are visible, not buried in a disclaimer;
- unsupported specialist modules are named as unavailable;
- past-event feedback, if used, was collected only after the tested claims were frozen and did not rewrite misses;
- no inevitability, private-mind reading, health diagnosis, or fate-backed high-stakes action appears;
- the first screen is still concise and the user can inspect evidence or correct inputs.
