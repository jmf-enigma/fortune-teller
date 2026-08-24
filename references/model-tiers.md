# Model Tiers and Graceful Degradation

Fortune Teller is designed so that deterministic local engines carry calculation correctness. Model capability changes how much synthesis and auditing can be done safely; it does not change chart facts or make divination predictively valid.

## 1. Four task modes, not a model-status guess

Expose `quick`, `standard`, `deep`, and `audit` modes. Do not attempt to infer product subscription, hidden model name, or reasoning budget from conversational style.

- Default to `standard`.
- Use `quick` for a very short answer-first preview; keep the calculation receipt behind an evidence request.
- Use `deep` for one system, one main topic, compound-fact synthesis, counter-readings, and complete evidence cards.
- Offer `audit` when the user wants multiple systems, multiple school profiles, a large unknown-time candidate set, full source tracing, or a machine-readable appendix.
- If the environment identifies its capabilities explicitly, use them. Otherwise keep the standard limits and let the user opt into a deeper pass.

“Pro” in user-facing language means a stronger synthesis/review model or larger reasoning budget. It is recommended for audit work, not required to calculate a chart.

## 2. Capability matrix

| Task | Standard/general model | Pro/audit model |
|---|---|---|
| Route a request | Yes | Yes |
| Collect and confirm input | Yes | Yes |
| Run one local engine | Yes | Yes |
| Explain one topic | Yes, with structured cards | Yes |
| Zi Wei explicit target-date phase | Yes, for one of five supported topics when its R-ZW-009 same-topic natal/decadal/yearly unit is present | Longer multi-topic synthesis and second review |
| Tarot current question | Yes, answer-first with multi-card interaction | Longer decision comparison and second review |
| One-system deep reading | Yes, when rules and sources cover the requested scope; narrow otherwise | Recommended for a longer synthesis and second-pass review |
| Summarize engine-produced time sensitivity | Yes | Yes |
| Independently compare many raw candidates | Avoid; use engine aggregation | Review full candidate ledger |
| Compare systems | One topic and two systems at a time | Multiple systems/topics with conflict matrix |
| Source handling | Use verified registry records only | Audit rule-to-source coverage and disputes |
| Full claim trace | Representative cards | Every material claim plus machine-readable appendix |
| Adversarial consistency review | Basic validator | Recommended second pass |

## 3. Standard mode contract

Standard mode should be robust on a general model because choices are constrained and evidence is structured.

- Work with one system and one user-selected topic at a time.
- Present no more than three to five material claims in the first result.
- Require fact IDs and source status for each card.
- Use the engine's sensitivity aggregation; do not manually compare a large set of free-form candidate narratives.
- Compare at most two systems on one topic in a single pass.
- If a direct conflict needs nuanced reconciliation, preserve it and offer audit mode.
- Keep alternatives brief and do not generate a life-spanning narrative from sparse facts.

Standard mode is complete, not a teaser. It must provide a useful answer, visible limitations, and evidence access without requiring an upgrade.

## 4. Deep mode contract

Deep mode is an evidence-bound synthesis contract with professional depth, not a professional certification or a promise of predictive accuracy. It follows `professional-reading.md` and requires:

- one declared system and profile by default;
- compound observations rather than isolated-symbol keyword lists;
- reasoning summaries, dependencies, counter-readings, source coverage, and sensitivity for every material interpretation;
- an exact calculation/fact-value binding, a registered interpretation rule pack, and concrete observations that support and contradict every interpretation;
- typed technical bindings for exact BaZi, Zi Wei, Western, Tarot, I Ching, and Meihua assertions, with canonical technical summaries rather than hand-written identities or placements;
- for Zi Wei, one complete emitted topic unit and semantic bindings for every named star, palace, or transformation relation;
- explicit refusal to fill specialist gaps such as unsupported strength/useful-god, Zi Wei flow-month/day/hour or event timing, or uncalculated Western techniques;
- a final narrative review after machine validation, because unrestricted prose remains `not_machine_verified`.

A standard/general model may complete deep mode when the scope is narrow and the registry covers the requested rules. Recommend a stronger model for many interacting facts or a formal second pass. If the knowledge layer is missing, both tiers must narrow the answer; a stronger model cannot repair missing rules or sources.

## 5. Audit mode contract

Audit mode adds depth but cannot loosen any input, evidence, privacy, or safety gate.

It may include:

- all admitted candidate hours and coverage counts;
- more than one supported system or school profile;
- a full topic-by-system conflict matrix;
- claim-to-fact and claim-to-rule mappings;
- source coverage, disputed rules, and unverified-source gaps;
- alternative interpretations and counterarguments;
- normalized input, engine version, profile, warnings, calculation replay/structural-verification status, and optional backstage integrity receipts;
- machine-readable evidence cards;
- a second pass that checks the narrative against the frozen result envelopes.

Audit mode must not:

- invent a missing source to make coverage look complete;
- harmonize direct conflicts;
- infer an unknown birth time from narrative convenience;
- reinterpret calculation uncertainty as predictive probability;
- claim that greater reasoning depth produces greater supernatural accuracy.

Internal hashes, when shown in an audit appendix, only help compare serialized records. They neither authenticate engine origin nor establish calculation, interpretive, or predictive accuracy.

## 6. Complexity routing

Recommend audit mode when any condition holds:

- more than two systems or more than two school profiles;
- unknown-time candidates create many materially different charts;
- the user requests exact provenance for every claim;
- a report must be published, reviewed, or reproduced;
- the standard pass detects several direct conflicts;
- a requested workflow would need a specialist calculation that this release does not implement; audit mode should document the gap rather than imitate the missing engine.

Stay in standard mode when:

- the user wants a quick one-system reading;
- the user asks one focused question;
- the result has only a few stable facts;
- the user prefers conversation over a formal report.

## 7. Graceful degradation

When context or model capability is limited:

1. Keep the frozen engine envelope and safety rules.
2. Reduce the number of topics, systems, or evidence cards.
3. Report unresolved conflicts rather than compressing them.
4. Ask the user which single topic matters most.
5. Offer an audit export for a later stronger-model review.

Never degrade by dropping warnings, fabricating links, substituting prose calculation, or hiding candidate sensitivity.

## 8. Cross-Codex/Claude portability

The shared contract is `SKILL.md`, relative references, local CLI, and JSON envelopes.

- Do not require an OpenAI-only or Anthropic-only tool for the core workflow.
- Treat `agents/openai.yaml` as optional Codex UI metadata, not an execution dependency.
- Resolve all package paths relative to the skill directory.
- Use plain process execution and documented JSON, not implicit conversation state, for calculation.
- Keep safety and evidence validation inside the skill/package so both hosts use the same gates.
- If a host cannot run local commands, say that calculation is unavailable; do not emulate the engine from memory.

## 9. Suggested user-facing explanation

> 普通模型就能完成排盘、单体系标准解读，并在出生时间不确定时说明哪些结果稳定、哪些暂时不能判断；规则覆盖充分时，也能完成聚焦的深度解读。Pro 更适合长篇综合、多体系比较、完整来源审计和第二遍对抗复核。它不会改变盘面事实，也不能补上缺失的规则或来源，更不代表预测更有效。

## 10. Tier acceptance checks

- Standard mode completes a one-system reading without upgrade pressure.
- Standard and audit modes produce identical facts for the same envelope.
- Audit mode contains more traceability, not stronger destiny claims.
- A limited model narrows scope before it drops evidence or warnings.
- Both Codex and Claude can follow the same state machine and evidence schema.
- No response implies that a paid tier improves supernatural accuracy.
