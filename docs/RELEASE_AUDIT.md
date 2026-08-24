# Release Audit — 0.5.0

Audit date: 2026-08-24

## Outcome

Version `0.5.0` extends result-first, replay-checked adjudication from the previous Zi Wei and BaZi paths to all six shipped systems. It also replaces shallow “period relationship equals activation” and “multiple systems agree” shortcuts with explicit closed chains and refusal boundaries.

Final release sign-off is **PASS**. The final source tree and a newly extracted release archive both passed the complete release gates below.

This audit supports claims about calculation consistency, installed-rule fidelity, fail-closed behavior, and readable result presentation inside the documented scope. It does not establish divinatory predictive validity, practitioner certification, or “best overall” status.

## Reproducible gates

| Gate | Final result |
|---|---|
| Full `npm test` in source tree | PASS — 385/385 |
| New 0.5.0 system-adjudicator and router fixtures | PASS — 56/56 |
| `npm run doctor` | PASS — runtime, dependencies, deterministic fixture and calendar engine |
| `npm run verify` | PASS — zero release-policy errors |
| `quick_validate.py` against the Skill directory | PASS — `Skill is valid!` |
| JavaScript syntax, whitespace and `git diff --check` | PASS |
| Registry contract | PASS — 15 source records, 36 rules, 6 interpretation profiles; every profile keeps `professional_label_allowed: false` |
| Release manifest equality and archive build | PASS — 118/118 controlled files; no `node_modules` |
| Clean extracted archive install and full check | PASS — locked install, 0 reported vulnerabilities, then 385/385 tests plus doctor and release verification |
| `npm pack --dry-run --json` | PASS — package metadata and 115 npm-visible entries inspected |
| Release archive checksum | PASS — SHA-256 sidecar generated with the rebuilt archive |
| Independent forward-use and competitor-dimension audit | PASS — independent red-team and non-BaZi source/route audit completed; all material findings repaired or bounded explicitly |

The archive must not bundle `node_modules`. Installing locked dependencies contacts the npm registry; after installation, shipped calculations and adjudicators do not require a remote calculation service.

## Material changes reviewed in 0.5.0

### Unified entry and interaction

- `adjudicate(calculation, options)` dispatches the frozen envelope to the BaZi, Zi Wei, Western, Tarot, I Ching, or Meihua result-first adjudicator.
- `recommendMethods` uses question type, available data, requested scope and current implementation only. Its order must never be described as an accuracy ranking.
- The generic CLI adjudication path and guided interface show the conclusion and plain-language explanation before technical facts.
- Multi-system readings preserve a separate claim set for every calculation, require a normalized common question for current-question systems, and render system first. They explicitly abstain from voting, declaring a winner, or treating agreement as independent confirmation.

### BaZi

- The calculation emits seasonal and month-command evidence, root locations and main/middle/residual depth, visible forces, and expanded stem/branch relations.
- Pair components of 寅巳申 or 丑戌未 punishment are distinguished from a complete three-branch punishment; active periods may complete a registered relation but cannot turn it directly into an event.
- The climate lens uses an independently transcribed 120-entry Day-Stem × solar-month source-mention screening index with section-level locators. Array order is not priority; five audited solar-term-segment entries and unclosed conditional roles remain unresolved, and no source outcome language is installed.
- The passage lens opens only when both visible controlling elements and the fixed generating mediator replay. It remains a candidate because strength, position and effectiveness are not established.
- Every registered formation, damage and paired-rescue route is re-run at natal, natal+decadal and natal+decadal+yearly layers. The natal result is frozen, and the output reports route conditions opened or closed rather than treating a generic relationship graph as activation.
- Weight-, exact-position-, control-order-, transformation-, tomb/storehouse-, void- and special-pattern-dependent routes remain screening or unresolved. No phase names a concrete life event.

### Zi Wei

- `adjudicateZiweiReading` presents the existing closed `R-ZW-007/008/009` meaning route as an ordinary result. It prefers a complete phase path and discloses fallback to natal when phase conditions are incomplete.
- Unknown birth time returns unavailable; the wrapper never selects a candidate chart from the day scan.
- `family_social` returns unavailable because the current table does not justify substituting 命宫 or 夫妻宫 for the separate family/social palaces.
- The existing generic candidate evaluator remains a developer-facing prerequisite checker, not a traditional named-pattern corpus and not an alternate ordinary reading path.

### Western natal astrology

- Aspects now carry applying, separating, exact or uncertain phase from a fixed time comparison.
- The engine emits unscored domicile/detriment and exaltation/fall conditions for the classical seven planets, angular/succedent/cadent placement and chart ruler when available.
- The result-first route selects the topic's primary whole-sign house, keeps its traditional ruler as primary and every occupant as a co-significator, and keeps chart ruler, luminaries and closest relevant aspects visible.
- Missing birth time or coordinates never produces an Ascendant, house or chart-ruler substitute.

### Tarot

- Every card now carries arcana, number, suit, rank and court metadata; the result also records the registered spread, position functions, composition, suit/rank repetition and adjacency.
- The adjudicator reads position before card combination, preserves inconvenient or contradictory cards, and anchors the answer in a controllable action.
- Repetition is emphasis, not a vote; reversed is not automatically bad; future/outcome is conditional; the decision spread compares A and B without choosing a winner.

### I Ching

- The engine emits a frozen reading selector for zero, one, two-to-five, or all changing lines, plus line centrality, positional correctness and correspondence.
- The adjudicator presents the primary-to-transformed process and exactly the selected stages.
- No 卦辞, 爻辞, commentary or 384-line corpus is bundled. A missing text cannot be repaired from model memory or presented as a quotation.

### Meihua

- The bounded two-number route now emits body/use, mutual hexagram, and Five-Element relation before and after the one-line change.
- It remains one explicit number convention, not general Meihua. Without occurrence time, seasonal strength and timing are unavailable; time/object/omen casting and 应期 remain outside scope.

## Bounded comparison conclusion

Within the six implemented routes, 0.5.0 is stronger than prompt-only workflows on calculation replay, explicit school/profile scope, closed-chain reasoning, ordinary-language output, and refusal when a required premise is missing. It is also narrower than Mingyu, Horosa and specialist repositories with larger method directories, named-pattern corpora, classical text collections or full timing systems.

No inspected repository, including this one, supplied enough public preregistered, blinded, out-of-sample evidence to establish real-world predictive validity. The defensible claim is improved professional discipline and fewer correctable errors inside scope—not “proved more accurate,” “better overall,” or “the best fortune teller.”

## Known limits that must remain visible

- BaZi does not have human-command day weights, fixed force scores, a complete position/control/transformation state machine, the full climate exception corpus, all special patterns or a sourced life-event map.
- Zi Wei does not have a reviewed complete named-pattern corpus, broad school-specific techniques, unknown-time rectification or flow-month/day/hour event timing.
- Western remains tropical whole-sign natal only; Tarot has a bounded RWS naming profile and fixed spreads; I Ching lacks the 384 texts and alternate selectors; Meihua remains a narrow two-number preview without timing.
- Liu Yao, Qi Men and Vedic astrology remain planned.
- There is no independent practitioner sign-off, external-user validity study, or established predictive accuracy.
- A passing validator is not a semantic proof for unrestricted prose. Unsupported future-event language remains prohibited.

## Sign-off rule

Any later edit to code, lockfiles, schemas, Skill routing, rule packs, release documentation, or packaged resources invalidates this sign-off and requires a rebuilt archive plus a new clean-extraction run.
