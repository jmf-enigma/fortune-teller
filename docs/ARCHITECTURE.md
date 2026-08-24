# Architecture — 0.6.0

## Design boundary

```text
user goal and available data
  -> method router (fit only, never an accuracy ranking)
  -> strict system input and explicit profile
  -> deterministic engine, secure local draw, or recorded manual cast
  -> frozen versioned calculation envelope
  -> fixed-engine replay or structural recomputation
  -> system-specific adjudicator
  -> result-first ordinary answer
  -> optional evidence-bound reading / advanced audit
  -> reading validator
```

No engine failure falls back to language-model calculation. No adjudicator may repair missing facts from memory.

## Main components

| Path | Responsibility |
|---|---|
| `SKILL.md` | Goal-first interaction, frozen-session behavior, privacy, safety and progressive disclosure |
| `src/core/methods.mjs` | Live method registry, status, strict input schema and profile discovery |
| `src/core/method-router.mjs` | Question/data-fit routing; reports blocking versus scope-limiting gaps without declaring a more accurate tradition |
| `src/core/profiles.mjs` | Named profiles, immutable fields and custom-profile validation |
| `src/core/time.mjs` | IANA timezone resolution, DST disambiguation, civil-day bounds and permitted time transforms |
| `src/core/random.mjs` | OS randomness, optional deterministic replay and unbiased bounded sampling |
| `src/engines/` | Calculation-only wrappers and structural facts; no free-form answer generation |
| `src/core/calculation-verifier.mjs` | Replays birth-chart engines or structurally recomputes Tarot/I Ching/Meihua facts |
| `src/core/adjudicate.mjs` | Generic dispatch to exactly one of six result-first adjudicators |
| `src/core/*-adjudicator.mjs` | Per-system closed reasoning, refusal boundary, plain-language result and change conditions |
| `src/core/bazi-topic-adjudicator.mjs` | Three replay-verified BaZi topic views; separates visible/hidden, co-presence/closure, natal/phase, and day-branch/spouse-star context |
| `src/core/ziwei-pattern-evidence.mjs` | Supplemental known-time evaluation of pinned named-pattern predicates and refusal boundaries; no vote, score, or event |
| `src/data/*-interpretation-rulepack.mjs` | Versioned bounded meaning axes; project-authored paraphrases, never unrestricted event corpora |
| `src/data/bazi-climate-rulepack.mjs` | 120 Day-Stem × solar-month base climate-priority entries with source locators and explicit exception boundary |
| `src/data/source-registry.mjs` | 16 narrow implementation/historical source records with scope and limitations |
| `src/data/rule-registry.mjs` | 38 machine-readable applicability rules, fact groups, source bundles and epistemic ceilings |
| `src/data/interpretation-profile-registry.mjs` | Six frozen system profiles and review labels |
| `src/core/meaning-layer.mjs` | Closed Zi Wei `R-ZW-007/008/009` meaning bindings and canonical prose |
| `src/core/reading-validator.mjs` | Calculation binding, rule/source applicability, typed technical assertions, shared-question multi-system contract and safety checks |
| `scripts/fortune-teller.mjs` | CLI, local guided interface and result-first renderer |

The package exports both system-specific adjudicators and:

```js
adjudicate(calculation, options)
```

Dispatch uses `calculation.system`; unsupported or tampered calculations fail closed.

## Six adjudication chains

### BaZi

The engine emits pillars, season/month-command candidates, located root evidence, visible force evidence, relationships, and optional luck-cycle facts. The adjudicator keeps strength hypotheses and 格局、扶抑、调候、通关、病药 separate. The topic layer then offers only career/study, wealth/resources, and long-term relationships: axis co-presence is not causal closure, a period cannot create an absent natal axis, and relationship phases read exact relations to the day branch before optional spouse-star context.

The climate route performs one exact lookup in a 10×12 source-mention screening table and checks mentioned stems as visible, hidden or absent. Array order is not priority. Missing solar-term segments and unclosed roles/conditions keep the lens unresolved; entry-specific outcomes are not installed. Passage opens only for a replayable visible control pair and fixed generating mediator, without claiming efficacy. Every registered formation/damage/rescue route is evaluated for natal, natal+decadal, and natal+decadal+yearly inputs; the natal state never changes. Pair components of three-branch punishment are distinct from a complete punishment.

### Zi Wei

The readable wrapper calls the closed meaning layer. It binds one supported topic to its primary palace and complete 三方四正, then uses natal or a complete natal→decadal→yearly phase path. A focus palace uses either its own replayed major-star axes or exact opposite-palace names as context only; the two representations cannot mix. The known-time result also carries a supplemental ledger of 55 fixed Mingyu-derived pattern predicates and 32 refusals. That ledger cannot rewrite the topic conclusion, vote, score, or generate an event. Unknown-time candidate selection and unsupported `family_social` synthesis remain refused.

### Western natal astrology

The engine adds aspect phase, unscored classical seven-planet condition, angularity and chart ruler. The adjudicator selects a topic's whole-sign house, keeps its traditional ruler as primary and every occupant as a co-significator, then adds chart ruler, luminaries and closest relevant aspects. Missing time or coordinates removes every dependent layer instead of supplying a substitute.

### Tarot

The calculation records exact card metadata, spread/position provenance, composition, suit/rank distribution and adjacency. The adjudicator reads position-card units before synthesis. Repetition never becomes a vote; a decision spread never names a winner; future/outcome language remains conditional.

### I Ching

The calculation records the six lines, primary and transformed hexagrams, and one frozen selector for 0/1/2–5/all changing lines. Line centrality, positional correctness and correspondence are unscored structure. No classical judgment or line text is bundled.

### Meihua

The bounded two-number calculation derives upper/lower trigrams, moving line, body/use, mutual hexagram, and Five-Element relationship before and after change. No occurrence time means no seasonal strength or timing. The route remains preview because it does not implement time/object/omen casting or a full interpretive corpus.

## Time and unknown-input model

Recorded local times use an IANA timezone. DST gaps reject; overlaps require explicit disambiguation. `time_precision` records the supplied clock syntax, not confidence in the historical record.

- BaZi admits only actual UTC+08:00 instants in its tested civil-calendar reference and never hand-shifts unsupported overseas time.
- Zi Wei uses the declared birthplace-civil day convention; unknown time preserves real candidate regimes and never selects one from personality feedback.
- Western omits Ascendant, houses, angularity and chart ruler when their time/coordinate premises are absent. Its unknown-time path reports stable versus boundary-sensitive day ranges only.
- Target dates are explicit frozen inputs. The runtime never reads “today” implicitly for a result.

## Random and frozen-question model

Fresh Tarot and I Ching results use OS randomness. User-supplied cards/lines and supplied replay seeds are separate modes. The model never selects an outcome. Same-question follow-ups reuse the frozen draw or cast; a materially new question requires a new explicitly labelled reading. Negative feedback never triggers an automatic redraw.

Meihua is deterministic under user-supplied numbers and its declared profile. The model may not choose numbers after seeing the desired answer or silently derive them from current time.

## Result-first and multi-system model

Every adjudicator returns the same user-facing backbone: `status`, `conclusion`, `plain_language`, `lenses`, `basis`, `change_conditions`, `reality_checks` and safeguards. System-specific details remain typed inside `lenses`.

A multi-system reading is a collection of independent frozen calculations and claims, not a blended meta-engine. For current-question systems, normalized question text must match. Each calculation must have at least one claim. Rendering is system-first and suppresses a first-system-biased global summary. The fixed relationship remains “not compared”: no vote, winner, accuracy boost or machine-authored reconciliation.

## Reading contract versus adjudicator contract

The result-first adjudicators are the ordinary product path. The general evidence-bound reading schema is a separate, stricter artifact contract:

- every calculation is replayed or structurally recomputed;
- every fact reference is bound to a concrete path/value;
- rules are checked for system, scope, required fact groups, source bundle and epistemic ceiling;
- exact technical assertions use typed semantic bindings;
- Zi Wei `R-ZW-007/008/009` additionally rederive canonical meaning prose;
- multiple current-question systems must share the same normalized question and remain `not_compared`.

A valid reading proves contract consistency only. It is not a semantic theorem for unrestricted prose and not empirical validation.

## Integrity fields

`facts_hash`, `reproducibility_hash`, seed commitments and rule-pack hashes are backstage change-detection aids. Primary correctness comes from engine replay or structural recomputation. These fields do not improve accuracy, authenticate an engine, establish provenance or validate prediction, so ordinary results hide them.

## Network, persistence and extension

Production calculation and adjudication code has no network client. Results go to stdout unless a user explicitly exports a new file; existing files are not silently overwritten. The package has no user database, telemetry, geocoder or remote cache.

A new method is releasable only when registry/schema, named profile, calculation engine, fact IDs, adjudicator/refusal rules, source and rule records, normal/boundary/adversarial fixtures, dependency notices and a clean-archive proof arrive together. A long prompt or method name alone is not an implementation.
