# Evidence and Synthesis Contract

Read this reference before explaining a chart, draw, casting, timing result, compatibility result, or cross-system comparison. Its purpose is traceability, not a claim that divination has validated predictive power.

## 1. Four epistemic layers

Every substantive sentence belongs to one of these layers:

| Layer | Meaning | Allowed basis |
|---|---|---|
| `calculation_fact` | Deterministic or recorded output from the local engine | Result-envelope fact ID, draw record, or casting record |
| `traditional_rule` | A rule attributed to a declared tradition or school | Verified local source record or explicitly documented engine rule |
| `interpretation` | A bounded synthesis from facts and rules | Traceable fact IDs, rule IDs, assumptions, and alternatives |
| `unresolved` | Missing, conflicting, unsupported, or profile-sensitive content | Explicit reason and next possible check |

Do not blend layers in a sentence such as “the engine proves you will…”. The engine establishes only its calculated representation under the chosen profile.

## 2. Required reading manifest

Treat the following as logical audit fields, not a demand that an engine emit duplicate aliases. Resolve each value from the live schema returned by `methods --json`, retain the original envelope unchanged, and use one normalized view only in the report layer.

```yaml
schema_version: string
engine_version: string
system: string
profile: string | object
normalized_input: object
facts: object
warnings: array
sensitivity: object | null
facts_hash: string
reproducibility_hash: string
```

Accepted logical mappings include:

| Report field | Live-envelope forms |
|---|---|
| `schema_version` | `schemaVersion` or `schema_version` |
| `engine_version` | `engine.version` or `engine_version` |
| `system` | `method` or `system` |
| `normalized_input` | `normalizedInput`, `input`, or `normalized_input` |
| `facts_hash` | `factsHash` or `facts_hash` |
| `reproducibility_hash` | `audit.sha256`, `reproducibilityHash`, or `reproducibility_hash` |

Do not fabricate a missing logical field and do not rewrite the original envelope to use both styles.

Generated timestamps may differ between runs and are excluded from both hashes. `facts_hash` is a backstage integrity field over engine version, system, profile, and calculated or recorded facts. `reproducibility_hash` covers the wider audit envelope, including normalized input, warnings, sensitivity, and provenance metadata, so a fresh draw and its later seeded replay can share `facts_hash` while legitimately having different envelope hashes. Neither field improves accuracy, authenticates engine origin, or proves provenance. Replay the pinned engine or structurally recompute the cast before treating digest equality as a secondary record comparison.

## 3. Evidence-card schema

Create one card per material claim. Several nearby observations may share a card only if they use the same facts, rules, scope, and uncertainty.

```yaml
claim_id: C-001
statement: string
technical_summary: string | omitted
epistemic_status: calculation_fact | traditional_rule | interpretation | unresolved
system: string
profile: string
scope: string
fact_ids:
  - engine.fact.path
calculation_facts_hash: lowercase_sha256
evidence_bindings:
  - ref: engine.fact.path
    path: /facts/exact/object/path
    value_hash: lowercase_sha256
    role: support | constraint | context
semantic_bindings:
  - kind: tarot_card
    fact_id: F-TR-C01
    position: situation
    card_id: major-00
    title: The Fool
    title_zh: 愚人
    orientation: upright
meaning_binding: object | omitted  # mechanically derived only for Zi Wei R-ZW-007/008/009
rule_ids:
  - RULE-ID
interpretation_profile_id: registered-profile-id
rule_pack_hash: lowercase_sha256
assessment:
  mode: current_reflection | bounded_phase | prospective_hypothesis
  domain: same-as-claim-topic
  window: { kind: current }
  criteria:
    - { criterion_id: K-support, polarity: supports, observable: concrete observation, evidence_source: self_report }
    - { criterion_id: K-contradict, polarity: contradicts, observable: concrete counter-observation, evidence_source: contemporaneous_record }
reasoning_summary: string
calculation_certainty: high | qualified | unavailable
input_sensitivity:
  label: stable | partly_stable | boundary_sensitive | unavailable
  coverage: "8/13" | null
school_stability: stable | profile_specific | disputed | not_assessed
source_status: verified | engine_documented | unavailable | disputed
source_ids:
  - SOURCE-ID
alternative_readings:
  - string
practical_reflection: string | null
```

`dependencies` is not a claim field. Do not create a free-text precondition list that can smuggle in another conclusion. Express calculation/input limits through `calculation_certainty` and `input_sensitivity`; if the requested conclusion is unavailable, use an `unresolved` claim whose statement explicitly says what cannot be determined.

Rules:

- Run `bind-reading` once on the completed draft, then run `validate-reading` on its output. Binding is a mechanical integrity step, not general semantic approval. Validation first replays fixed birth-chart engines or structurally recomputes supported cast facts; it rejects a mismatched calculation even when its internal digests were recomputed. Hashes remain secondary record-change checks.
- `reading.calculation_bindings` must match the supplied calculation set exactly. Each claim's `calculation_facts_hash` must identify exactly one supplied system/profile calculation. Each `evidence_bindings` entry must resolve one `fact_id` to its exact `/facts/...` path and a hash of the observed value, and its refs must match `fact_ids` exactly. Do not rebind an old narrative after replacing its chart.
- `fact_ids` must resolve to the actual result envelope or recorded draw/cast. Prefer engine-issued IDs; when the engine does not issue IDs, use an RFC 6901 pointer prefixed with `jsonptr:`, such as `jsonptr:/facts/mode`. Never create a plausible-looking but unresolved path.
- A `calculation_fact` also needs at least one resolved fact ID. Its whole `statement` is mechanically rendered from those facts; arbitrary prose is not permitted in a calculation-fact claim.
- An `interpretation` needs at least one fact ID, one applicable registered rule, one registered interpretation profile with the exact rule-pack hash, and an assessment containing independent observable support and counterevidence. Without rule coverage, keep the statement as a calculation fact or mark the requested conclusion unresolved; `source_status: unavailable` is not a bypass for model-authored interpretation. In `deep` or `audit`, every `traditional_rule` or `interpretation` claim needs at least two distinct cited fact roots. Multiple JSON pointers into fields of the same fact object still count as one fact. A broad container such as `/facts/cards` that contains individually identified fact objects is not a valid substitute for citing those individual facts. Its `scope` must be one of every cited rule's registered scopes and the cited facts must fall under the registered fact paths.
- Exact system assertions are a separate typed layer. The allowed `kind` values are `hexagram_identity`, `iching_line`, `meihua_trigram`, `meihua_moving_line`, `tarot_card`, `bazi_pillar`, `bazi_relationship`, `western_planet`, `western_aspect`, `star_in_palace`, `period_star_in_slot`, `mutagen_in_palace`, and `period_transformation`. For a closed Zi Wei natal major star, `star_in_palace` retains the emitted `brightness`. A dynamic Zi Wei star uses `period_star_in_slot` with exact `{fact_id, topic_unit_id, scope, relation_role, star, period_palace, natal_palace}` in addition to `kind`; the validator checks the scope, fixed relation role/offset slot, star, period palace, and natal palace against the referenced period component. `bind-reading` generates the only allowed `technical_summary`; do not duplicate technical facts in free prose.
- Assessment criteria must name a concrete observation and an evidence source. `prospective_hypothesis` is allowed only on Zi Wei `R-ZW-009`, uses the fully bracketed interval in which both current-profile records remain unchanged, and requires canonical criteria that jointly cover every natal focus-group major-star axis, every registered decadal condition across `[0,+4,+8,+6]`, every registered yearly condition across `[0,+4,+8,+6]`, and every selected-topic-slot phase transformation process. Natal baseline, decadal environment, and yearly trigger cannot substitute for one another. Generic domain activity, four-palace phase-transformation convergence, a complete Zi Wei judgment, and concrete future events are out of scope.
- A `deep` interpretive claim must include both `support` and `constraint` evidence roles. These roles describe the reasoning structure, not empirical proof.
- Zi Wei topic interpretation uses one emitted `topic_unit_id`. `R-ZW-007` requires the complete four-palace unit and, through binding v2, every registered same-palace major-star combination, major-star axis with emitted brightness, and present 六吉六煞/禄存/天马 condition. `R-ZW-008` requires every natal transformation in the selected topic. `R-ZW-009` judges natal baseline → decadal environment → yearly trigger. Decadal and yearly scopes each require exactly four unique dynamic component slots in fixed `[0,+4,+8,+6]` role order and all registered period-star conditions in them. The selected topic dynamic slot separately requires both complete decadal and yearly transformation sets, with at least one item across them while either individual set may be empty. This is asymmetric by design: period stars cover both dynamic four-palace layers, while phase transformations cover only the selected topic dynamic slot. The window is the engine-replayed maximal continuous interval in which both records remain unchanged and both endpoints can be bracketed. The route does not establish four-palace phase-transformation convergence, complete Zi Wei judgment, or a concrete event.
- Only `R-ZW-007/008/009` have a closed non-technical meaning layer. For these routes, `bind-reading` derives `meaning_binding` from the claim and calculation, then replaces `statement`, `reasoning_summary`, `alternative_readings`, `practical_reflection`, and `assessment` with canonical values. `validate-reading` independently rederives the binding and all five fields and requires exact structural equality. Do not hand-edit them or provide a second claim with the same calculation/profile/rule/topic/unit/axes/mode/window meaning signature.
- The closed meaning registry contains five topic markers, fourteen major-star meanings, and four transformation lenses. The separate bounded Sanhe result rule pack registers 24 same-palace major-star pairs, 14 natal context modifiers, and 11 period-star modifiers. It is project-authored and `automated_fixture_reviewed`, not independently practitioner reviewed; `professional_label_allowed` stays false and `predictive_validity` stays `not_established`.
- A non-closed claim cannot contain any future-event assertion. If no closed route supports the requested future conclusion, use a calculation fact, current reflection, or `unresolved`; hedging words do not make an unsupported event admissible.
- A rule citation must preserve its registered epistemic ceiling and complete source bundle. Every cited fact on a rule-backed claim must fall under at least one cited rule's registered fact paths; an unrelated audit fact cannot be added merely to satisfy a deep fact count. A source-backed rule uses `source_status: verified` or `disputed`; an engine-only rule uses no external `source_ids`.
- `coverage` is a count over admitted candidates, not a probability. Its denominator must equal the actual candidate or sample count reported by the matching engine envelope; `13` in examples is not a universal constant. Whenever such a total exists, `stable`, `partly_stable`, and `boundary_sensitive` require `n/N`; `stable` requires `N/N`. `unavailable` may use `null`, and exact-time results without a candidate/sample total use `null`.
- `calculation_certainty` describes the computation and input resolution, not whether the future claim is true.
- `school_stability` must not be inferred from one school reference.
- `practical_reflection` is an invitation to reflect, not a command justified by fate.

For `standard`, `deep`, and `audit` readings, every `next_steps` entry is a structured action. Supply the action, availability, required inputs, target system where required, and reuse behavior; do not author its visible `label` or unavailable `reason`. `bind-reading` replaces those two fields with canonical text. It also fixes the reading `title`, derives `user_focus` from the unique canonical Chinese topic labels of all claims in claim order, and fixes the non-prediction `disclaimer` and calculation-derived `uncertainty_summary`. For `deep` and `audit`, every claim needs a non-empty `reasoning_summary` and at least one `alternative_readings` entry, and the reading needs at least one next step. A deep traditional or interpretive claim must use at least one source-backed rule that actually applies to its scope and cited facts.

Material engine qualifications must survive interpretation. `bind-reading` derives `warning_acknowledgements`; when material warnings exist it must equal the engine-emitted code set exactly, with no omission, addition, prose paraphrase, or duplicate, and the field is omitted when that set is empty. In particular, `CALENDAR_DAY_PROFILE_QUALIFIED` also requires `calculation_certainty: qualified` and `school_stability: profile_specific` for every claim bound to that calculation; the canonical `uncertainty_summary` states the overseas civil-day limitation.

## 4. Source integrity

Internal IDs are trace links, not citations by themselves.

- The local registry in `src/data/source-registry.mjs` records 12 narrowly scoped implementation, historical-source, or official-method-guide entries. `verified` means the edition, implementation, or guide and its stated scope were checked; it does not mean scholarly consensus, empirical validation, or predictive accuracy.
- The rule registry in `src/data/rule-registry.mjs` declares each rule's system, allowed scopes, required fact prefixes, countable fact-ID roots and any explicitly material scalar paths, minimum fact count, mandatory fact groups or exact fact-value conditions, source bundle, permitted epistemic statuses, and interpretation ceiling. A compound rule must cite at least one material fact from every mandatory group; a value-constrained rule must cite the required path and match its declared value. Method notes and metadata under an otherwise allowed prefix do not become chart evidence. Use the registry as the authority instead of copying a rule's apparent name into a broader claim.
- Cite a title, author, quotation, page, chapter, URL, DOI, or edition only when that exact detail is present in the current local source record and within its scope, or was checked through an authorized live lookup. The existence of a registry entry does not verify every detail on the linked page.
- Do not convert a package README, model recollection, or common saying into a primary-source citation.
- Do not invent classical Chinese wording or translate a paraphrase as a quotation.
- If a traditional rule is implemented by the engine but no scholarly or primary source has been verified, use `engine_documented`; say “the installed profile implements this rule,” not “the classics establish this rule.”
- If no applicable registered rule exists, do not issue an interpretation. Use `unavailable` on an unresolved claim, narrow the response, and offer to show calculation facts instead.
- `source_status: verified` requires a known `source_id`. `engine_documented` and `unavailable` cannot carry external source IDs. Do not attach a real source to a rule that the source registry does not declare it supports.
- If schools disagree, identify the exact profile being used and mark `disputed` or `profile_specific`.

Lack of a source does not invalidate a calculated date or position. It prevents unsupported traditional interpretation from being presented as sourced knowledge.

## 5. Human-readable evidence card for an opened audit

Use this compact rendering only after the user explicitly opens “依据与核对（高级）” or an audit. The ordinary answer and “为什么这样看” remain in natural language and must not expose profile IDs, warning codes, candidate counts, hashes, or fact/rule/source IDs.

```text
[C-001] 结论：……
性质：模型解释 / 传统规则 / 计算事实 / 未解决
盘面事实：F-…，F-…
采用规则：R-…（流派 profile）
推理摘要：……
资料边界：计算确定性 + 时辰/输入敏感性；无法判断时显示明确的未解决原因
来源状态：已核验 / 引擎文档 / 无来源 / 有争议
其他解释：……
```

When the audit is opened, show one representative card first and make the rest expandable. For full audit mode, include all cards and the machine-readable form.

## 6. Forbidden confidence compression

Never merge these into one “confidence” number:

- correctness of local calculation;
- accuracy of user-supplied time and location;
- candidate-time stability;
- agreement across schools;
- source quality;
- plausibility of an interpretation;
- empirical predictive validity.

In particular, do not use percentages such as `92% accurate`, `high destiny probability`, or `three systems confirm`. Report the relevant axis directly.

## 7. Cross-system relationship

Preserve every system's original claims, facts, rules, and limitations in its own cards. The top-level `cross_system` field is deliberately not a free-text matrix or resolution channel. `bind-reading` removes it from a single-system reading. When more than one system is present, the binder fixes it to exactly:

```yaml
cross_system:
  relationship: not_compared
```

`not_compared` means only that several systems are present and the program does not claim to have mechanically established equivalence, complementarity, or conflict. Do not add another relationship label, a winner, vote, confidence, prose resolution, or input-profile diagnosis to `cross_system`. A user-facing side-by-side discussion may point to the already validated claims and their separate scopes, but it must not be presented as a machine-derived relationship. Explain scope or input sensitivity inside the affected claims through exact facts, `calculation_certainty`, `input_sensitivity`, and—when necessary—an `unresolved` claim. Never rewrite one system to manufacture agreement or treat agreement as empirical confirmation.

## 8. Compatibility readings

Compatibility does not authorize claims about another person's hidden intentions, fidelity, diagnosis, identity, or inevitable behavior.

- Distinguish person A facts, person B facts, and relational synthesis.
- Do not infer missing data for either person.
- A relational claim must cite facts from both sides or be labeled one-sided.
- Frame interpretations as possible interaction patterns and questions to discuss.
- Never recommend coercion, surveillance, confrontation, separation, marriage, or financial commitment because “the chart says so.”

Current validator limitation: two people calculated under the same system and identical profile have colliding local fact-ID namespaces. Validate each envelope and its person-specific claims separately, then keep the relational synthesis visibly separate. A combined `validate-reading` payload deliberately rejects duplicate system/profile bindings until scoped cross-envelope fact references are implemented.

## 9. Example card using only audit facts

This example intentionally avoids a traditional prediction:

```yaml
claim_id: C-EXAMPLE-01
statement: "The requested house-based Western interpretation is unavailable without a reliable birth time."
epistemic_status: unresolved
system: western
profile: western-tropical-whole-sign-v1
scope: houses
fact_ids:
  - jsonptr:/facts/angles
rule_ids: []
reasoning_summary: "The admitted input does not support angles or house placement."
calculation_certainty: unavailable
input_sensitivity:
  label: unavailable
  coverage: null
school_stability: not_assessed
source_status: engine_documented
source_ids: []
alternative_readings:
  - "Use only time-independent planetary positions and disclose any body that changes within the date."
practical_reflection: null
```

## 10. Validation invariants

`validate-reading` enforces machine-checkable calculation replay or structural recomputation, envelope integrity, schema shape, system/profile bindings, fact IDs, scope-to-rule applicability, rule fact-path/minimum-count/mandatory-group/value requirements, required source bundles, exact material-warning acknowledgement, epistemic ceilings, coverage denominators, deep/audit completeness, canonical single/multi-system `cross_system` behavior, and prohibited structured probability/voting fields. `bind-reading` canonically sets the title, all-claim-topic `user_focus`, disclaimer, uncertainty summary, material-warning code list, single/multi-system state, and next-step labels/unavailable reasons. For Zi Wei `R-ZW-007/008/009`, it also recomputes the closed meaning binding and every canonical result-facing field. The non-empty `summary` must equal the first claim statement after Unicode and whitespace normalization, so the headline cannot float free of a validated evidence card. Every interpretation needs at least one rule that is actually applicable, not merely a known rule ID.

For `standard`, `deep`, and `audit`, follow-ups are structured actions with a controlled `requires_input` vocabulary. Multi-system actions that take input or change a target require `target_system`. A Tarot or I Ching step that changes the question, profile, draw, cast, cards, lines, spread, or seed must be `new_reading` with `reuses_frozen_calculation: false`. Ordinary visible fields are checked for internal IDs, technical keys, codes, hashes, raw candidate/probe counts, and future-event assertions, including hedged ones. An `unresolved` claim must explicitly state what cannot be determined and cannot hide an affirmative future assertion behind that label. Outside the three closed Zi Wei routes, these are conservative lexical and structural gates, not complete semantic understanding.

A pass is not a general semantic proof. The validator can establish exact equality to the project-authored closed wording for Zi Wei `R-ZW-007/008/009`; it cannot thereby prove that wording true. Outside those routes it cannot establish that every paraphrase is faithful, detect every unsafe implication or negation, decide whether a source is historically authoritative beyond its registered scope, or validate divinatory prediction. Quotation accuracy, conflict handling, and high-stakes safety still require the Skill workflow or human review.

A report fails the overall evidence contract if:

- a supplied calculation envelope is incomplete, fails engine replay/structural recomputation, or either secondary content-integrity field does not match;
- a fact ID cannot be resolved;
- a chart claim survives an engine error;
- a time-dependent field is asserted despite an unknown-time exclusion;
- a quotation or bibliographic detail lacks a verified source record;
- `n/N` sensitivity is described as predictive probability;
- an interpretation is presented as a calculated fact;
- a claim supplies the removed free-text `dependencies` field instead of using calculation certainty, input sensitivity, or an explicit unresolved statement;
- the reading edits the canonical title, stable unique all-claim-topic `user_focus`, disclaimer, uncertainty summary, next-step label/unavailable reason, omits or adds a material warning code, supplies `cross_system` for one system, or fails to use exactly `{relationship: "not_compared"}` for multiple systems;
- a Zi Wei `R-ZW-007/008/009` claim changes a canonical field; omits a registered same-palace combination, sitting-star brightness, natal context modifier, or transformation; duplicates/moves a star; mixes sitting and opposite-context axes in the focus group; imports brightness/transformation into opposite context; leaves an empty focus group without exact replayed opposite-major-star context; has missing, duplicated, or misordered dynamic `[0,+4,+8,+6]` slots; omits a registered period star or its `period_star_in_slot` binding; uses an empty/partial selected-topic-slot phase set; substitutes a Gregorian/clipped window; expands selected-slot transformations into four-palace phase convergence; or names a concrete event/result;
- a claim outside the three closed Zi Wei routes asserts a future event;
- the visible headline differs from its first evidence-backed claim;
- an unresolved label is used to display an affirmative conclusion;
- a new Tarot or I Ching question/draw/cast reuses the frozen outcome;
- an ordinary result exposes backstage technical fields or raw candidate accounting;
- one system's original validated claim or limitation is removed merely to make a multi-system presentation sound harmonious;
- agreement across systems is described as empirical confirmation;
- a practical suggestion is framed as required by fate.
