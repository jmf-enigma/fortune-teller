# Professional Depth and Coverage

Fortune Teller currently provides accuracy-first, result-first readings with deterministic calculation where supported. Here accuracy-first means reducing correctable calculation, rule-selection, evidence-selection, and narrative-rewrite errors. Its strongest typed-reading path is a closed, machine-derived Zi Wei meaning layer for five life areas. BaZi now has a separate replay-verified professional adjudicator whose own result prose is mechanical, but its general reading-schema binding is intentionally still closed. Across all six shipped systems, exact technical facts use typed bindings and are checked against the supplied calculation. Only Zi Wei `R-ZW-007/008/009` also receive mechanically derived and revalidated reading-schema prose; unrestricted interpretation elsewhere remains `not_machine_verified`. The project has no independent practitioner certification and has not established real-world predictive validity.

## Current status at a glance

| System | Calculation coverage | Interpretation coverage | Important unavailable depth |
|---|---|---|---|
| Zi Wei Dou Shu | known-time natal chart; unknown-time sensitivity; explicit target-date 大限 and 流年; palace, star, brightness, 三方四正 and emitted 四化 facts | closed `R-ZW-007/008/009`; natal synthesis reads registered same-palace combinations, brightness, 六吉六煞, 禄存天马; phase synthesis reads natal baseline → decadal four dynamic palaces → yearly four dynamic palaces, with selected-topic-slot transformations | complete Zi Wei judgment, four-palace phase-transformation convergence, concrete events/results, broader school-specific techniques, 流月/流日/流时, timing, compatibility, remedies |
| BaZi | Four Pillars, hidden stems, Five Elements and Ten-God labels; emitted stem/branch structure; exact opt-in luck onset and 24 decadal periods; target-date LiChun year layer and named natal/decadal/year interactions; unknown-time sensitivity | replay-verified adjudicator with competing strong/weak hypotheses, chapter-anchored compound pattern routes, separate 格局/扶抑/调候/通关/病药 lenses, and natal → decadal → year structural linkage; ordinary interactive output is mechanical | human-command/day weighting, full root/position/transformation state machine, special patterns, verified climate table, complete dynamic route re-adjudication, life-domain/event mapping, practitioner review, typed reading-schema binding |
| Western astrology | tropical planet positions, audited motion, and whole-sign houses/angles when coordinates and time are available | bounded natal symbolic reflection | transits, progressions, synastry, dignity systems, predictive timing |
| Tarot | local RWS draw, stable card IDs, positions, orientation and replay controls | bounded position/card and multi-card reflection | verified forecasting, guaranteed outcomes, broad specialist spread corpus |
| I Ching | local three-coin cast, primary/transformed hexagrams and changing-line structure | bounded structural reflection | complete sourced line-text selection schools, event timing, verified forecasts |
| Meihua | deterministic two-number preview | structural preview only | body/use, five-element generation/control, time/object/omen casting and timing judgment |

“Unavailable” means the engine and rule pack must refuse or narrow the request. It is not permission for the model to fill the gap from memory.

## What the BaZi adjudicator closes

The BaZi path no longer treats month-command transparency as a completed pattern. It requires one registered compound formation route. Damage and rescue are paired by route ID: only a machine-closed damage chain can produce `破格`, and only its registered matching rescue can produce `救应`. Conditions that require relative weight, exact position, or successful transformation remain `screening_only`, so the output stops at candidate or damaged instead of manufacturing a decisive label.

Luck-cycle calculation is opt-in because the traditional direction algorithm needs an explicit binary chart parameter; it is never inferred. Exact onset boundaries and LiChun boundary dates remain unresolved. The target layer records named stem/branch interactions and separates natal baseline, full decadal environment, and yearly trigger. It currently reports only three-layer structural linkage, not a completed pattern activation. A period Ten God is only a candidate input to a compound route, never a direct declaration of formation, damage, or rescue.

The executable result is available through `adjudicateBazi` and `adjudicate-bazi`. In the general claim registry, `R-BZ-005/006` accept only `unresolved` until a dedicated typed adjudication binding can independently rederive the exact result. This prevents an Agent from citing the new rule IDs and then freely writing a stronger conclusion.

## What the closed Zi Wei meaning layer means

The separately exported generic Zi Wei adjudicator is deliberately smaller than this reading layer. It accepts only three immutable replay-bound structural candidates—one each for a complete Sanhe topic structure, complete natal topic-transformation locations, and a Zhongzhou topic baseline. It rejects caller-authored formation names, evidence/path substitutions, fake envelope references, missing four-palace structure, cross-topic joins, and reuse of one fact across natal/decadal/yearly layers. It is a developer-facing guard, not a corpus of traditional named formations and not an additional ordinary result route.

The closed registry has exactly:

- five topic-marker records: `overview`, `career_study`, `wealth_resources`, `relationships`, and `wellbeing_rhythm`;
- fourteen major-star records, each with both a constructive axis and an overextension axis;
- four transformation process lenses for 禄、权、科、忌, each with an explicit prohibited shortcut to a guaranteed result.

The separate bounded Sanhe result rule pack registers 24 same-palace major-star pairs, 14 natal context modifiers (六吉、六煞、禄存、天马), and 11 period-star modifiers. These modifiers describe conditions; they are not weighted scores or event guarantees.

These are project-authored bounded paraphrases. They are not copied classical quotations, a complete lineage manual, independent practitioner review, or evidence that the meanings predict reality.

Each supported natal topic has one `facts.topic_units` record:

| Topic | Primary palace | Required evidence unit |
|---|---|---|
| `overview` | 命宫 | primary palace + exact relation fact + all four 三方四正 palaces |
| `career_study` | 官禄 | primary palace + exact relation fact + all four 三方四正 palaces |
| `wealth_resources` | 财帛 | primary palace + exact relation fact + all four 三方四正 palaces |
| `relationships` | 夫妻 | primary palace + exact relation fact + all four 三方四正 palaces |
| `wellbeing_rhythm` | 福德 | primary palace + exact relation fact + all four 三方四正 palaces; 疾厄 is secondary context only |

A deep topic claim must cite the complete unit. Under `R-ZW-007`, `fortune-teller/ziwei-meaning-binding/v2` supplies four ordered `palace_axis_groups`. It prioritizes a registered same-palace combination over isolated single-star axes, retains each major star's emitted `brightness`, and includes every present registered 六吉六煞/禄存/天马 context. A non-focus group may have no registered major star; the focus group may not. Missing, borrowed, duplicated, or malformed registered content fails closed. This is a bounded complete four-palace input set, not a complete Zi Wei judgment. Under `R-ZW-008`, every natal transformation in the selected topic must enter through exact semantics; no favorable subset or auspiciousness score is allowed.

With an explicit `target_date`, `R-ZW-009` judges in the fixed order natal baseline → decadal environment → yearly trigger. Decadal and yearly scopes must each provide exactly four unique dynamic slots `[0,+4,+8,+6]` and every registered period-star condition in them; those stars use `period_star_in_slot`. The selected topic dynamic slot must provide both complete decadal and yearly transformation sets, with at least one registered transformation across the two sets; either individual set may be empty. This is intentionally asymmetric: period stars cover both dynamic four-palace layers, while transformations remain selected-topic-slot only. The observation window is the maximal continuous interval containing `target_date` during which both current-profile records remain unchanged, fully replay-bracketed at both ends. Formal criteria jointly require every natal focus axis, all registered decadal four-slot conditions, all registered yearly four-slot conditions, and every selected-topic-slot phase process. No layer substitutes for another; generic topic activity and concrete events are ineligible.

Ordinary presentation is intentionally simpler: conclusion → phase timeline when available → topic cards → reality checks → uncertainty → next steps. Each topic card shows conclusion, plain-language interpretation, terminology evidence, revision conditions, and a real-world reminder in that order. Summary/plain meaning are sentence bullets; evidence is split at semicolons; revision conditions are one per bullet. Detailed phase stars remain in the evidence layer. `bind-reading` fixes root presentation fields and keeps backstage IDs and hashes out of ordinary output.

For all three routes, `bind-reading` derives the meaning binding and overwrites the statement, reasoning summary, alternative readings, practical reflection, and assessment. `validate-reading` independently recomputes them and requires exact equality. Missing evidence, a mismatched transformation, a disallowed assessment mode, or any requested concrete event must fail closed to chart facts, a narrower bounded theme, or `unresolved`.

These gates reduce model improvisation and make this narrow interpretation path auditable. They do not prove that the underlying traditional meaning predicts reality. See [Zi Wei system reference](../references/systems/ziwei.md) and [bounded reading map](../references/systems/ziwei-reading-map.md).

## Review and label status

All current interpretation profiles have:

```text
review_status: automated_fixture_reviewed
professional_label_allowed: false
predictive_validity: not_established
```

`automated_fixture_reviewed` means automated positive, negative and regression fixtures check the implementation. It is not an independent review by qualified practitioners and is not equivalent to `domain_expert_reviewed`.

The user may request professional **depth**, meaning careful evidence binding, complete structural reasoning, counter-readings and honest uncertainty. The product must not describe the current result as professionally certified. Enabling a professional label would require fixed rule-pack versions, declared school boundaries, at least independent practitioner review records, resolved critical findings, and release-specific evidence.

## Three gates that must remain separate

1. **Calculation correctness:** faithful output under a declared profile and tested input range.
2. **Traditional-rule fidelity:** correct use of a declared, sourced rule pack and exact calculation facts.
3. **Real-world predictive validity:** performance on preregistered, unseen outcomes against relevant baselines.

Current engine replay, structural recomputation, typed-fact checks, rule applicability tests, and adversarial fixtures primarily strengthen the first two gates. The third remains `not_established`. Internal hashes only help detect accidental record changes; they do not improve accuracy, authenticate engine origin, or prove provenance.

Formal scoring accepts only canonical Zi Wei `R-ZW-009` three-layer salience claims frozen before their fully bracketed joint-stability intervals. Criteria jointly require natal focus axes, all registered decadal four-slot conditions, all registered yearly four-slot conditions, and all selected-topic-slot phase processes. It does not accept four-palace phase-transformation convergence, a complete Zi Wei judgment, generic activity, a concrete event, or another system/rule.

The full evaluation standard is in [Accuracy Evaluation Protocol](../references/accuracy-evaluation.md); delivery requirements are in [Professional Reading Protocol](../references/professional-reading.md).

## Release claim checklist

Before describing an improvement as greater professional depth, verify:

- the engine emits every fact group required by the rule;
- the validator rejects partial evidence, semantic mismatches and cross-topic joins;
- for `R-ZW-007/009`, the binder and validator include all registered same-palace combinations, brightness, 14 natal context modifiers, and complete four-palace axes; the rule pack contains exactly 24/14/11 registered result patterns;
- `R-ZW-008` includes the selected topic's complete natal-transformation set, and `R-ZW-009` requires a non-empty eligible phase-transformation set and includes it completely;
- a prospective `R-ZW-009` claim contains both complete dynamic four-palace layers, binds every registered period star with `period_star_in_slot`, and formally tests natal focus axes + decadal four-slot conditions + yearly four-slot conditions + selected-topic-slot phase processes over the fully bracketed interval; no layer substitution or concrete event is allowed;
- the binder generated the root title, all-claim-topic focus in stable unique order, disclaimer, uncertainty summary, exact warning-code set, next-step presentation, and single/multi-system state; no claim-level free-text dependency or machine-classified cross-system relationship remains;
- every non-closed claim is factual/current-reflective or `unresolved` and contains no future-event assertion;
- positive and adversarial fixtures cover the new path;
- the source scope supports the method description without being presented as empirical proof;
- supporting, contradicting, and unclear observables are fixed before a prospective observation window opens;
- unsupported specialist modules remain explicitly unavailable;
- review and predictive-validity labels have not been upgraded without the required evidence.
