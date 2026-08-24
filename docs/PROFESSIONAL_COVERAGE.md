# Professional Depth and Coverage — 0.6.0

Fortune Teller 0.6.0 gives all six shipped systems a replay-checked, result-first adjudication path. “More accurate” here means fewer correctable calculation, rule-selection, evidence-selection, and narrative-promotion errors inside a declared profile. It does **not** mean that divination has established real-world predictive validity. The release has automated fixture and independent adversarial engineering review, not practitioner certification.

## Coverage matrix

| System | Closed calculation and adjudication chain | What the user receives first | Important unavailable depth |
|---|---|---|---|
| BaZi | Four Pillars → all month-command candidates → season/root/visible-stem strength axes → registered formation/damage/paired-rescue routes → separate 格局、扶抑、调候、通关、病药 lenses → selected career/wealth/relationship topic → replayed decadal/yearly context | selected-topic conclusion first; co-presence stays a clue, phase-only gods stay phase-only, and relationship periods lead with relations to the day branch | exact human-command day weights, full force/position/transformation state machine, complete climate exceptions and special patterns, sourced event mapping |
| Zi Wei Dou Shu | known-time chart → selected topic palace → complete 三方四正 → sitting-star or exact opposite-context axis → registered combinations/context/transformations → natal/decadal/yearly path → 55 mechanical named-pattern checks plus 32 refusal boundaries as supplemental evidence | one readable topic conclusion first; neutral pattern evidence and technical provenance remain secondary; unknown time or unsupported topic refuses | complete all-school pattern corpus, broad Flying/钦天/河洛 routes, 流月/日/时, rectification, concrete event timing |
| Western natal astrology | tropical positions → applying/separating/exact aspect phase → classical seven-planet domicile/detriment/exaltation/fall → angular/succedent/cadent placement → chart ruler → selected topic house, traditional ruler plus all occupants, luminaries and tight aspects | a topic axis in ordinary language, its constructive and excess expressions, then condition/aspect evidence | alternative zodiacs or houses, modern dignity scoring, nodes/asteroids, transits, progressions, synastry and event timing |
| Tarot | frozen question and spread → exact card-orientation axis → position role → suit/rank helpers that cannot override the exact card → composition, repetition and adjacency patterns → conditional synthesis and action anchor | direct answer to the question and the most controllable action; a decision spread compares A/B but never declares a winner | specialist spread corpora, arbitrary decks, timing, yes/no certainty, private-mind or event forecasts |
| I Ching | frozen six-line cast → primary/transformed hexagrams → fixed 0/1/2–5/all-changing selection protocol → centrality, correctness and correspondence checks → bounded process reflection | the main structural change and selected stages in plain language | bundled 卦辞/爻辞/传文, complete 384-line commentary, alternative line-selection schools, 纳甲六爻 and timing |
| Meihua | fixed two-number convention → upper/lower trigrams and moving line → body/use → mutual hexagram → Five-Element relation before and after change → bounded structural reading | body/use relationship, what changes, and a reality-grounded next step | time/object/omen casting, seasonal旺衰, external response, 应期 and a full commentary corpus |

“Unavailable” is a real refusal boundary. The model may not fill it from memory.

## BaZi: what is actually deeper in 0.6.0

The engine now emits the evidence needed to keep commonly conflated judgments separate:

- month branch, seasonal frame, and month-command candidates, while explicitly leaving exact day-specific 人元司令 unresolved;
- root location by pillar and main/middle/residual hidden stem, plus visible support and pressure evidence;
- stem combinations/clashes and branch combination, clash, harm, break, repetition and punishment relations, including the distinction between a pair that is only part of 寅巳申 or 丑戌未 and a complete three-branch punishment;
- a 10 Day Stems × 12 solar-month branches index of 120 source-mention screening entries with section-level locators. Array order is not priority; the machine reports mentioned stems as visible, hidden or absent while solar-term segments and unclosed conditional roles remain unresolved;
- a passage candidate only when the two visible controlling elements and the fixed generating mediator are replayable. It does not claim that the mediator is strong enough or effective;
- formation, damage and matching rescue routes that are re-run from the frozen natal chart after adding the active decadal layer and again after adding the target year. The natal result remains immutable, and transitions report which registered conditions opened or closed.

This closes the former “period relation graph equals activation” shortcut. A yearly Ten God, clash, punishment component or mediator does not by itself become an event. Routes depending on relative weight, exact location, control order, successful transformation, tomb/storehouse, void or a school-specific exception remain candidates or unresolved.

The three topic routes are intentionally narrower than an unrestricted Ten-God life-domain essay. Career/study separates responsibility, learning support, and output; wealth/resources separates resources, output conversion, and shared-resource boundaries; long-term relationships anchors the day branch and groups duplicate branch relations. Two axes appearing together remain `co_presence`, not a closed causal chain. A period can emphasize only a matching natal axis; mixed periods explicitly separate the natal-axis part from phase-only additions. The optional male-wealth/female-official-star relationship lens is disclosed as a school-variable supplement, never a partner description or outcome.

## The other five result-first chains

### Zi Wei

`adjudicateZiweiReading` reuses the existing closed `R-ZW-007/008/009` meaning layer rather than creating a second free-text corpus. It prefers a complete target-date phase route, falls back transparently to a natal topic route, and refuses to choose among unknown-time candidate charts. `family_social` is unavailable because the current closed table does not justify collapsing 田宅、父母、兄弟 and 交友 into another topic palace.

The bounded route still covers five supported topics, complete natal 三方四正, 24 registered same-palace major-star pairs, 14 natal context modifiers, 11 period-star modifiers, and exact natal/decadal/yearly transformations where required. These are conditions, not scores or event guarantees.

Version 0.6.0 additionally adapts 55 reproducible named-pattern predicates and 32 explicit rejection boundaries from Mingyu's fixed MIT-licensed core commit. Every known-time chart receives a complete evaluation ledger, but ordinary output uses neutral structural labels; traditional names are advanced evidence only. Matches do not vote on or rewrite the five-topic conclusion and never generate a score or event. If the selected palace is empty, only exact opposite-palace major-star names may be used as context; brightness, transformations, auxiliary/pressure stars, and “sitting in this palace” language are rejected.

### Western natal astrology

`adjudicateWestern` selects a primary whole-sign topic house, keeps the traditional ruler of that house sign as primary, and preserves every present occupant as a co-significator. It then keeps the chart ruler, luminaries, up to three closest relevant aspects, and unscored classical seven-planet conditions visible. Aspect phase is derived from a fixed ±60-minute comparison. Without coordinates, houses and chart ruler remain unavailable; without birth time, the result is limited to stable or boundary-sensitive day ranges and never invents an Ascendant.

### Tarot

The frozen draw records arcana, number, suit, rank, court status, spread definition, position roles, composition, suit/rank repetition and adjacent transitions. The adjudicator puts the exact card-orientation axis first; suit and rank only add checks and cannot overwrite it. It reads every card through its declared position before synthesis. Repetitions are structural emphasis, not votes; reversals are not automatically bad; “future” and “outcome” remain conditional. A decision spread states the demands of A, the demands of B and the comparison lens, but does not pick a winner.

### I Ching

The local rule pack freezes one transparent selector: no changing lines reads the primary structure; one reads that line; two to five preserve the selected changing stages; all six use a whole-change comparison. It also emits unscored line centrality, positional correctness and correspondence. No classical judgment or line text is bundled, so the adjudicator must describe structure without fabricating a quotation.

### Meihua

The preview remains deliberately narrow but is no longer only a hexagram label. Under one stable two-number convention it derives body/use from the moving-line trigram, the mutual hexagram, and Five-Element generation/control relations before and after change. With no occurrence time it refuses seasonal strength and timing; it does not turn a deterministic formula into a prediction claim.

## Unified interaction and multi-system boundary

- `recommendMethods` ranks methods only by the user's question, supplied data, and implemented scope. It never claims one tradition is inherently more accurate.
- `adjudicate(calculation, options)` dispatches the same frozen calculation to the correct one of six result-first adjudicators.
- Ordinary output starts with conclusion and plain language; internal hashes, profiles, rule IDs and fact IDs remain available only as advanced evidence.
- A materially new Tarot or I Ching question requires a new, explicitly labelled draw or cast. Same-question follow-ups reuse the frozen result.
- A multi-system reading preserves a separate calculation and claim set for each system, requires the same normalized question for current-question methods, renders system first, and states “separate, no vote, no winner.” Agreement is not cross-validation and disagreement is not resolved by majority.

## Registry and review status

The 0.6.0 release contract records 16 narrow source records, 38 machine-readable rules, and six interpretation profiles. A source marked `verified` means its identity and declared scope were checked; it does not certify a tradition or prediction. All six profiles retain:

```text
review_status: automated_fixture_reviewed
professional_label_allowed: false
predictive_validity: not_established
```

Three gates must remain separate:

1. calculation correctness under a declared profile;
2. fidelity to the installed traditional rule pack;
3. real-world predictive validity on preregistered, unseen outcomes.

0.6.0 materially strengthens the first two. The third is not established.

## Release claim checklist

Before calling a result “professionally deeper,” verify that:

- the calculation replays or structurally recomputes;
- every adjudicator uses only facts from that frozen calculation;
- unknown time, coordinates, question changes, unsupported topics and unresolved school premises fail closed;
- BaZi climate entries are described as source-mention screening rather than priorities, passage as a candidate, and period results as route re-adjudication rather than named events;
- Tarot and multi-system repetition never become a vote or winner;
- I Ching does not invent classic text and Meihua does not invent occurrence time, season or timing;
- ordinary prose remains result-first and comprehensible, while counterconditions and reality checks can genuinely disconfirm it;
- no documentation upgrades automated fixtures into practitioner certification or claims proven predictive accuracy.
