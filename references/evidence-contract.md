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

Generated timestamps may differ between runs and are excluded from both hashes. `facts_hash` commits to engine version, system, profile, and calculated or recorded facts; use it to verify a seeded replay of the same outcome. `reproducibility_hash` commits to the wider audit envelope, including normalized input, warnings, sensitivity, and provenance metadata, so a fresh draw and its later seeded replay can share `facts_hash` while legitimately having different envelope hashes.

## 3. Evidence-card schema

Create one card per material claim. Several nearby observations may share a card only if they use the same facts, rules, scope, and uncertainty.

```yaml
claim_id: C-001
statement: string
epistemic_status: calculation_fact | traditional_rule | interpretation | unresolved
system: string
profile: string
scope: string
fact_ids:
  - engine.fact.path
rule_ids:
  - RULE-ID
reasoning_summary: string
dependencies:
  - input or profile condition
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

Rules:

- `validate-reading` first recomputes both hashes and rejects incomplete or modified calculation envelopes.
- `fact_ids` must resolve to the actual result envelope or recorded draw/cast. Prefer engine-issued IDs; when the engine does not issue IDs, use an RFC 6901 pointer prefixed with `jsonptr:`, such as `jsonptr:/facts/mode`. Never create a plausible-looking but unresolved path.
- A `calculation_fact` also needs at least one resolved fact ID.
- An `interpretation` needs at least one fact ID and at least one applicable registered rule. Without rule coverage, keep the statement as a calculation fact or mark the requested conclusion unresolved; `source_status: unavailable` is not a bypass for model-authored interpretation. In `deep` or `audit`, every `traditional_rule` or `interpretation` claim needs at least two distinct cited fact roots. Multiple JSON pointers into fields of the same fact object still count as one fact. A broad container such as `/facts/cards` that contains individually identified fact objects is not a valid substitute for citing those individual facts. Its `scope` must be one of every cited rule's registered scopes and the cited facts must fall under the registered fact paths.
- A rule citation must preserve its registered epistemic ceiling and complete source bundle. Every cited fact on a rule-backed claim must fall under at least one cited rule's registered fact paths; an unrelated audit fact cannot be added merely to satisfy a deep fact count. A source-backed rule uses `source_status: verified` or `disputed`; an engine-only rule uses no external `source_ids`.
- `coverage` is a count over admitted candidates, not a probability. Its denominator must equal the actual candidate or sample count reported by the matching engine envelope; `13` in examples is not a universal constant. Whenever such a total exists, `stable`, `partly_stable`, and `boundary_sensitive` require `n/N`; `stable` requires `N/N`. `unavailable` may use `null`, and exact-time results without a candidate/sample total use `null`.
- `calculation_certainty` describes the computation and input resolution, not whether the future claim is true.
- `school_stability` must not be inferred from one school reference.
- `practical_reflection` is an invitation to reflect, not a command justified by fate.

For `standard`, `deep`, and `audit` readings, every `next_steps` entry is a structured action. For `deep` and `audit`, every claim also needs a non-empty `reasoning_summary` and at least one `alternative_readings` entry, and the reading needs a non-empty `uncertainty_summary` plus at least one next step. A deep traditional or interpretive claim must use at least one source-backed rule that actually applies to its scope and cited facts.

Material engine qualifications must survive interpretation. Put each such code in `warning_acknowledgements`. In particular, `CALENDAR_DAY_PROFILE_QUALIFIED` requires a non-empty `uncertainty_summary`, `calculation_certainty: qualified`, and `school_stability: profile_specific` for every claim bound to that calculation.

## 4. Source integrity

Internal IDs are trace links, not citations by themselves.

- The local registry in `src/data/source-registry.mjs` records 10 narrowly scoped implementation, historical-source, or official-method-guide entries. `verified` means the edition, implementation, or guide and its stated scope were checked; it does not mean scholarly consensus, empirical validation, or predictive accuracy.
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
依赖条件：……
时辰敏感性：稳定 / 8/13 / 边界敏感 / 不可判断
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

## 7. Conflict matrix

Use a matrix when at least two systems, profiles, or candidate times speak to the same user-selected topic.

```yaml
topic: work_style
cells:
  - system: bazi
    claim_ids: [C-011]
    original_statement: string
  - system: western
    claim_ids: [C-024]
    original_statement: string
relationship: compatible_wording | different_construct | input_profile_sensitive | direct_conflict | insufficient_evidence
resolution: string
```

Readable form:

| Topic | System/profile A | System/profile B | Relationship | Honest resolution |
|---|---|---|---|---|
| Work style | Original claim + ID | Original claim + ID | Different construct | Keep both scopes separate |

### Classification rules

- `compatible_wording`: claims can coexist under the same scope. This is interpretive convergence, not validation.
- `different_construct`: superficially conflicting words refer to different questions, time horizons, or concepts.
- `input_profile_sensitive`: the relationship changes with candidate time or school configuration.
- `direct_conflict`: both claims address the same construct, scope, and period but cannot both hold as stated.
- `insufficient_evidence`: one or both claims lack enough facts, rules, or source support.

### Resolution rules

1. Preserve original statements and claim IDs.
2. Check scope, time horizon, input candidate, profile, and epistemic layer.
3. Reclassify only with an explicit reason.
4. If conflict remains, retain it. Do not vote, average, or rewrite one side.
5. Let real-world user evidence be a reflection prompt, not retroactive proof of a system.

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
dependencies:
  - "A reliable local birth time and timezone"
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

`validate-reading` enforces machine-checkable envelope integrity, schema shape, system/profile bindings, fact IDs, scope-to-rule applicability, rule fact-path/minimum-count/mandatory-group/value requirements, required source bundles, material-warning acknowledgement, epistemic ceilings, coverage denominators, deep/audit completeness, and prohibited structured probability/voting fields. The non-empty `summary` must equal the first claim statement after Unicode and whitespace normalization, so the headline cannot float free of a validated evidence card. Every interpretation needs at least one rule that is actually applicable, not merely a known rule ID.

For `standard`, `deep`, and `audit`, follow-ups are structured actions with a controlled `requires_input` vocabulary. Multi-system actions that take input or change a target require `target_system`. A Tarot or I Ching step that changes the question, profile, draw, cast, cards, lines, spread, or seed must be `new_reading` with `reuses_frozen_calculation: false`. Ordinary visible fields are checked for internal IDs, technical keys, codes, hashes, raw candidate/probe counts, and unqualified future-outcome assertions. An `unresolved` claim must explicitly state what cannot be determined and cannot hide an affirmative future assertion behind that label. These are conservative lexical and structural gates, not complete semantic understanding.

A pass is not a semantic proof. The validator cannot establish that every paraphrase is faithful, detect every unsafe implication or negation, decide whether a source is historically authoritative beyond its registered scope, or validate divinatory prediction. Semantic wording, quotation accuracy, conflict handling, and high-stakes safety still require the Skill workflow or human review.

A report fails the overall evidence contract if:

- a supplied calculation envelope is incomplete or either content hash does not match;
- a fact ID cannot be resolved;
- a chart claim survives an engine error;
- a time-dependent field is asserted despite an unknown-time exclusion;
- a quotation or bibliographic detail lacks a verified source record;
- `n/N` sensitivity is described as predictive probability;
- an interpretation is presented as a calculated fact;
- the visible headline differs from its first evidence-backed claim;
- an unresolved label is used to display an affirmative conclusion;
- a new Tarot or I Ching question/draw/cast reuses the frozen outcome;
- an ordinary result exposes backstage technical fields or raw candidate accounting;
- a direct conflict is removed without a traceable scope or profile reason;
- agreement across systems is described as empirical confirmation;
- a practical suggestion is framed as required by fate.
