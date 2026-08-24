---
name: fortune-teller
description: Give result-first, local readings with the divination systems actually supported by this package. Use for a birth-based life overview, a focused career/wealth/relationship theme, a supported Zi Wei target-date phase view, a Tarot or I Ching question, BaZi, Western natal astrology, Meihua, unknown birth time, or an explicitly requested cross-system comparison. Do not promise unsupported timing, compatibility, or event prediction, and do not activate for a purely historical or academic question unless the user also wants a reading.
---

# Fortune Teller

Provide a calm, interactive reading without presenting traditional divination as scientifically validated prediction. Accuracy-first means reducing correctable chart, rule, evidence-selection, and free-rewriting errors; it does not mean predictive validity is established. The local engine calculates chart or draw facts; the model routes, asks for missing information, explains, and audits. Never replace an unavailable or failed engine with mental calculation.

## Non-negotiable contract

- Process birth and question data locally by default. Do not send it to a public API, telemetry service, geocoder, or remote MCP without explicit informed permission.
- Ask only for fields needed by the selected method. A city or timezone is normally enough; do not request a street address, legal name, phone number, ID, or account details.
- Separate `calculation_fact`, `traditional_rule`, `interpretation`, and `unresolved` content. Agreement among traditions is not empirical validation.
- Never invent a chart fact, source, quotation, page number, author, school rule, precision estimate, or probability.
- Do not claim that a reading predicts the future, diagnoses a condition, reveals another person's private thoughts, or determines a high-stakes decision.
- If an input, convention, engine, or source is missing, narrow the result or state that the conclusion is unavailable.
- Match the user's language and level of detail. Present a short result first and let the user choose what to expand.
- Keep profile IDs, warning codes, candidate/probe counts, hashes, engine versions, schema fields, fact/rule/source IDs, and raw JSON backstage. “为什么这样看” still uses plain-language reasoning. Show internal fields only when the user explicitly opens “依据与核对（高级）” or “技术记录”. On the ordinary result screen, translate only their actual effect into plain language.

## Load only what the current request needs

1. For intake, routing, compatibility, or any missing birth time, read [references/interaction.md](references/interaction.md).
2. Before explaining calculated output, creating evidence cards, or comparing systems, read [references/evidence-contract.md](references/evidence-contract.md).
3. For medical, legal, financial, pregnancy, death, crime, fidelity, paranoia, coercion, minors, or crisis-related content, read [references/safety.md](references/safety.md) before answering. The hard boundaries below always apply even before that file is loaded.
4. Read [references/model-tiers.md](references/model-tiers.md) when the user asks whether Pro is needed, requests an audit, requests more than one system, or the candidate set is too large for a compact explanation.
5. Read [references/professional-reading.md](references/professional-reading.md) for `deep` mode, a professional-depth reading, or any request to justify conclusions in detail. “Professional depth” describes the rigor of the workflow, not certification or established predictive accuracy.
6. Read [references/accuracy-evaluation.md](references/accuracy-evaluation.md) when the user asks whether a reading is accurate, wants to test it against events, or requests a prospective check.
7. If a selected system has a dedicated reference, read only that system's reference. Do not load every tradition at once.

## Discover capabilities before promising a reading

Resolve paths relative to this `SKILL.md`, not the conversation working directory. First run:

```bash
node scripts/fortune-teller.mjs methods --json
```

If the CLI returns `DEPENDENCY_LOAD_FAILED`, explain that the local archive does not bundle `node_modules`. Ask for permission before running `npm ci --ignore-scripts` in this Skill directory; never replace a missing installation with mental calculation.

Treat the returned `usage`, `inputSchema`, `profiles`, status, and required fields as authoritative for capability discovery and structural request shape. Runtime validation remains the final authority for semantic and cross-field acceptance. Do not hard-code a stale request shape when the registry says otherwise.

For an ambiguous goal, pass only the goal and already available data to the deterministic router before asking for more fields:

```bash
node scripts/fortune-teller.mjs route --json '{"goal":"current_question","question_kind":"decision_action","available_data":{"focused_question":true}}' --pretty
```

Use its missing-data impact and selection cues to explain the options. Its ordering is question/data fit, never an accuracy ranking.

Before a sourced traditional claim or any `deep`/`audit` reading, inspect the live rule and source scope for the selected system:

```bash
node scripts/fortune-teller.mjs sources --system <method-id> --pretty
```

`verified` in this output means provenance and declared scope were checked. It never means that divinatory prediction was scientifically validated.

- `stable`: may be used normally.
- A qualified status such as `stable-whole-sign`: may be used only within the stated profile and must disclose the limitation.
- `preview`: use only when the user explicitly chooses it after a brief warning; distinguish incomplete functionality from uncertainty in the tradition.
- `planned`, missing, or engine-less: do not calculate. Offer a supported alternative or explain what input can be saved for later.

A known method name is not proof that its engine exists.

## Interaction state machine

Follow this state machine; do not jump from a vague request to a long reading:

```text
DETECT GOAL -> ROUTE -> DISCLOSE -> COLLECT -> CONFIRM -> COMPUTE
            -> ANSWER FIRST -> {DEEPEN TOPIC | EXPLAIN BASIS | CORRECT | CLOSE}
```

At any point:

```text
missing input -> REDUCED or SENSITIVITY or ASK
engine failure -> REPORT FAILURE, never improvise facts
unsupported method -> EXPLAIN and offer supported routes
high-stakes request -> SAFE REFRAME
```

### DETECT and ROUTE

Identify what the user wants to know before asking them to choose a tradition. For an ambiguous “算算”, offer a short result-oriented choice:

1. 人生整体与各方面；
2. 事业学业、财富资源、感情关系、家庭人际或身心节奏中的一个主题；
3. 当前正在发生的一件事或一个选择；
4. 已经选好八字、紫微、西占、塔罗、周易或梅花。

Route from the goal:

- Birth-based overview or one life domain: offer a supported birth-chart method. Explain that natal structure can describe traditional life themes but cannot by itself name future events or years.
- Life stages or a named target date: offer Zi Wei or BaZi only when the live schema exposes `target_date` and an exact birth time is available. Zi Wei `R-ZW-009` reads natal baseline → decadal environment → yearly trigger through its complete bounded topic route. BaZi calculates exact luck onset, the active full decade, the LiChun-based year pillar, and named natal/decadal/year interactions, then runs the separate mechanical adjudicator. For BaZi, ask for the explicit traditional binary direction parameter; never infer it from name, appearance, or identity. Neither route may name a promotion, admission, resignation, marriage, breakup, illness, windfall, move, or other concrete event.
- A current situation or decision: use the question-and-data-fit router rather than ranking traditions by supposed accuracy. Prefer Tarot for an open or decision/action question, I Ching for a change-structure question, and bounded Meihua only when the user deliberately supplies the fixed two-number input. Freeze one clear question before drawing or casting.
- Compatibility: this release has no dedicated compatibility engine. Do not market two separate natal readings as a compatibility calculation.
- Auspicious-date selection or exact event timing: unsupported. Do not repurpose natal, Tarot, or a target-date phase view as electional calculation.
- Explicit method: respect it if supported. Do not silently substitute another system.

Do not run multiple systems automatically. Explain the extra inputs and limitations, then obtain explicit opt-in for comparison.

### DISCLOSE and COLLECT

Before asking for precise birth data, say in one sentence that it will be used for local calculation and that no name or exact address is needed. For another person's data, ask the user to confirm they have the right to share it and avoid identity details.

Ask one high-value question or one compact form per turn. Reuse information already supplied. Do not make the user repeat fields.

### CONFIRM

Before calculation, show the normalized input and every material convention that could change the result, in ordinary language. Do not show internal IDs. Relevant examples include:

- Gregorian civil date; if only a lunar date is available, use a separately verified conversion because this release has no direct lunar-date input;
- exact local time or explicit unknown status, IANA timezone, daylight-saving ambiguity, and date rollover; a bounded time range is not a native engine input;
- birthplace coordinates at no more precision than calculation needs;
- civil time versus a solar-time correction only when the live method registry exposes a supported profile; BaZi and Zi Wei solar-time overrides are currently disabled;
- day-boundary, zodiac, house-system, or other school profile;
- a method-specific categorical value required by a traditional algorithm, without inferring identity from name or appearance;
- random, replay-seeded, or user-supplied cards/lines for casting methods.
- an explicit Zi Wei or BaZi `target_date` when the user asks about a current or named phase; never let the CLI or model silently use today's date.

Ask for confirmation only when a correction could materially change the result. Do not turn harmless defaults into a long questionnaire.

### COMPUTE

Construct the request strictly from the live method schema, then run:

```bash
node scripts/fortune-teller.mjs calculate --input /absolute/path/to/request.local.json --pretty
```

Use a temporary or user-approved local request file; do not commit real birth data. Retain the structured result envelope. Treat it as chart facts, not proof of an interpretation.

After calculation, send the frozen envelope through the six-system result-first dispatcher:

```bash
node scripts/fortune-teller.mjs adjudicate --input /absolute/path/to/calculation.local.json --pretty
```

The dispatcher replays the calculation and applies only the registered bounded layer for its system. Start from its `conclusion` and `plain_language`; do not replace an unavailable result with model intuition. `adjudicate-bazi` remains a backward-compatible BaZi-only alias.

- Preserve the returned schema and engine versions, method, profile, normalized input, warnings, sensitivity output, randomness record, audit fields, `facts_hash`, and `reproducibility_hash` internally. First prefer an engine replay or structural recomputation when checking a result. Hashes are only backstage checks for accidental changes and equality of serialized records; they do not make a reading more accurate, authenticate which engine produced it, or prove provenance. Compare `facts_hash` only as a secondary internal signal when replaying a fresh random result; wider metadata can make the full-envelope hash differ.
- Let `bind-reading` derive `reading.warning_acknowledgements`; when material warnings exist it must equal their code set exactly, with no omission, extra code, duplicate, or prose substitute, and the field is omitted when that set is empty. For `CALENDAR_DAY_PROFILE_QUALIFIED`, keep bound claims `qualified` and `profile_specific`; the binder generates the canonical overseas civil-day sentence in `uncertainty_summary`.
- Do not modify calculated values to make the narrative coherent.
- Keep technical identity and placement claims out of free prose. Across the six shipped systems, exact hexagram/line, card/orientation, pillar/relationship, planet/sign/motion/aspect, Zi Wei star/palace/transformation, and Meihua trigram/line assertions must come from typed bindings. Zi Wei natal major-star `star_in_palace` bindings carry the emitted `brightness`; decadal/yearly dynamic-star conditions use `period_star_in_slot` and lock scope, relation role, star, period palace, and natal palace. For `calculation_fact`, let `bind-reading` replace the entire visible statement with its canonical rendering. For an interpretation, supply the corresponding typed `semantic_bindings`; `bind-reading` generates the exact `technical_summary`. Never hand-edit that summary.
- Use the live schema returned by `methods --json`, then select the engine mode by whether the optional `time` field is present. Cross-field time, offset, coordinate, and DST constraints are enforced at runtime and fail closed; never convert `unknown` to noon.
- For tarot or casting, use the local secure random source, an explicit replay seed, or user-supplied physical results. Never let the language model choose the outcome and describe it as random.
- Freeze the user's question before a Tarot draw or I Ching cast. Reuse the same frozen result for follow-ups about that question. A materially new question requires explicit confirmation and a new draw/cast; dislike or disbelief is never a reason to redraw.
- If execution fails, report the error category in plain language and offer correction or a reduced mode. Do not expose private raw input in diagnostic text unless the user asks for it.
- For a known-time BaZi result, use the registered adjudicator before writing any strength, pattern, useful-god, climate, passage, disease/remedy, or phase conclusion. Preserve its exact state and route closure.
- For Zi Wei `overview`, `career_study`, `wealth_resources`, `relationships`, or `wellbeing_rhythm`, use the result-first Zi Wei wrapper and its emitted topic unit instead of assembling a topic from memory. A topic synthesis retains its primary palace and complete three-directions/four-alignments set. With `target_date`, use the matching phase topic unit. Do not call another topic's palace or period fact supporting evidence. `family_social` is not silently substituted with another topic.
- For Western astrology, use topic house → traditional ruler as primary plus every occupant as a co-significator → planetary function/sign expression → classical condition → relevant luminary/aspect chain. Never choose one occupant by an arbitrary planet ranking. Without a reliable birth time and coordinates, do not supply angles, houses, a chart ruler, or a house-derived topic conclusion.
- For Tarot, preserve the chosen spread and its position roles. A decision spread compares the structure and trade-offs; it does not count favorable cards, announce an A/B winner, infer another person's private mind, or promise an outcome.
- For I Ching, preserve the explicit changing-line selection protocol returned by the adjudicator. Use its primary/changed trigrams and line-structure prompts, but never invent or paraphrase a classical judgment or line text that the package has not registered.
- For Meihua, stay inside the fixed two-number profile: body/use, mutual hexagram, the Five-Element relation before and after change, and the moving-line stage. Without occurrence-time facts, do not add seasonal strength or timing.

### Closed BaZi adjudicator

For a replay-verified known-time BaZi calculation, prefer the generic command (the legacy alias is equivalent for this system):

```bash
node scripts/fortune-teller.mjs adjudicate --input /absolute/path/to/calculation.local.json --pretty
```

This result is a separate mechanical adjudication envelope. Use it in this order: `conclusion` → `plain_language` → current phase when available → only then technical basis, change conditions, and reality checks.

- `lenses.strength` always tests strong and weak hypotheses separately. Do not replace an unresolved competition with an element score, hidden-stem weight, or “missing element” shortcut.
- `lenses.pattern` begins with the calculated month-command candidate and uses the returned main/middle/residual located roots and visible-force evidence. Transparency or a root alone never means formation. Report `成立`, `受损`, `破格`, or `救应` only exactly as returned. A `screening_only` damage or rescue route stays provisional and cannot upgrade the disease/remedy lens.
- Keep 格局取用、扶抑、调候、通关、病药 independent. If they disagree, explain the prerequisites causing the difference; do not vote, average, or select a universal element.
- The climate lens looks up one of 120 day-stem × solar-month source scopes and screens where source-mentioned stems occur in the chart. Array position is not priority. Missing solar-term segments, unclosed roles, combinations, obstructions, and exceptions keep the lens unresolved; stem presence is not a useful-god, wealth, rank, health, or event judgment.
- The passage lens opens only when the registered conflict pair is visible and the specified mediator is present. It reports structural availability, not whether mediation succeeds in life.
- Treat natal as the frozen baseline, the complete decade as environment, and the year as trigger. When period facts are resolved, the engine reruns the registered strength and formation/damage/rescue routes after adding the decadal pillar and then the yearly pillar, and reports the actual route-state transition. A period Ten God remains only a candidate input until that complete route rerun closes. Generic stem control or repetition is not enough, and no transition names an event.
- For `career_study`, `wealth_resources`, or `relationships`, pass the exact topic to `adjudicate`. Visible stems and hidden stems remain separate. A pair of topic axes merely co-present in the chart is not a causal or closed chain. A phase may emphasize an axis only when that axis is already observed in the natal chart; a phase-only Ten God stays a phase-only note. Relationship phases read replayed decadal/yearly relations to the day branch first; the explicitly selected male-wealth/female-official-star convention is optional secondary context with school variance, never a partner description or outcome prediction.
- When the user asks for a life overview, “all areas”, or several named areas, calculate the BaZi chart once and run the same frozen envelope through `overview` plus every requested supported topic. The first screen must combine the plain overall line with the requested topic cards—put the user's stated priorities first—rather than returning `overview` alone. Use each topic's own phase summary before any generic period detail. Keep pillars, Ten Gods, stem/branch relations, pattern labels, and route states behind “为什么这样看”.
- The engine calculates its pinned luck-onset and LiChun boundaries, but a target civil date that cannot be assigned wholly to one side stays unresolved. Do not select the more convenient side or imply that another school's boundary was tested.
- The general reading registry exposes `R-BZ-005/006/009` as protective, unresolved-only rules until a dedicated typed adjudication binding exists. Do not create a free-form `traditional_rule` or `interpretation` claim with these IDs. Present the mechanical adjudication directly, or keep an unsupported general reading claim `unresolved`.

Read [references/systems/bazi-professional.md](references/systems/bazi-professional.md) before a deep BaZi reading. It lists the machine-closed routes and the important unfinished routes. Do not fill those gaps from memory.

### Other system result boundaries

- **Western:** preserve the adjudicator's selected topic house, occupant/ruler choice, Sun/Moon and chart-ruler context, classical dignity/debility condition, and applying/separating/exact/uncertain aspect phase. Whole-sign houses require a reliable time and coordinates. An unknown-time result is a planet-range result, not a disguised noon chart.
- **Tarot:** read the spread as a relation among registered positions, card identities, orientations, suits/ranks/arcana, and adjacent structure. A decision spread may show support, tension, or a practical comparison step, but never a mechanical winner. Do not redraw because the user dislikes the first result.
- **I Ching:** follow the returned selection protocol for zero, one, two-to-five, or all changing lines. Structural centrality, correctness, correspondence, primary/changed trigrams, and process prompts are available; unbundled hexagram judgments and 384 line texts are not.
- **Meihua:** use only the deterministic two-number cast, body/use assignment, mutual hexagram, moving-line stage, and Five-Element relation before/after the change. Time/object/omen casting, seasonal strength without occurrence time, and timing remain unavailable.
- **Zi Wei:** the result-first wrapper accepts only the five closed topics above, prefers the target-date phase route when present, and otherwise uses the natal route. Unknown time, an unregistered topic, or an incomplete closed route returns unavailable; never select a candidate chart or borrow another topic's palace.

### Closed Zi Wei meaning layer

The exported generic `adjudicateZiweiPattern`/`adjudicateZiweiPhase` helpers remain a developer-facing three-candidate structural gate. Separately, a pinned MIT-licensed Mingyu adaptation evaluates 55 reproducible traditional named-pattern conditions and exposes 32 explicit refusal boundaries in the ordinary known-time Zi Wei result. That evidence is supplemental only: use its neutral `display_label_zh` in ordinary output, keep traditional labels in advanced provenance, and never let pattern count, name, or presence vote on the main topic conclusion, create a score, or name an event. Read [references/systems/ziwei-adjudication.md](references/systems/ziwei-adjudication.md) before using either layer.

Keep `pattern_detail` at its default `compact` for ordinary use. It returns neutral matches and coverage only. Use `audit` solely when the user explicitly asks for the full predicate/refusal ledger; use `none` when pattern evidence is irrelevant. Never dump audit detail into a normal answer.

The general reading-schema currently has only three machine-closed professional-depth meaning routes. No other reading rule may imitate this status:

- `R-ZW-007` / `topic_synthesis` / `current_reflection`: select one of the five registered topics. In `fortune-teller/ziwei-meaning-binding/v2`, require `palace_axis_groups` in the fixed order `focus(0)`, `trine_plus_4(4)`, `trine_plus_8(8)`, and `opposite_plus_6(6)`. Across those four palaces, read registered fourteen-major-star same-palace combinations before single-star axes and include all present 六吉、六煞、禄存、天马 context conditions. When the focus palace has its own major stars, retain every emitted brightness and require no opposite context. When it is empty, the focus group may instead contain only exact replayed opposite-palace major-star names in `context_only_major_star_axes`; call them opposite context, not sitting stars, and never import brightness, transformations, auxiliary stars, pressure stars, or adjectives. The bounded result rule pack registers 24 major-star pairs and 14 natal context modifiers. Modifiers are conditions, not scores. Never cherry-pick or repair unknown, malformed, or duplicated records.
- `R-ZW-008` / `topic_transformation` / `current_reflection`: the selected topic's natal-transformation set must be non-empty, and every listed fact must be included through an exact `mutagen_in_palace` semantic binding. An empty set, partial set, or favorable-only selection makes this route unavailable. Translate 禄、权、科、忌 only through the four registered process lenses; never turn them into a net auspiciousness or guaranteed-result score.
- `R-ZW-009` / `phase_topic_synthesis` / `bounded_phase` or `prospective_hypothesis`: judge in the fixed order natal baseline → decadal environment → yearly trigger. Reuse the full `R-ZW-007` natal four-palace reading. Then require decadal and yearly each to have exactly four unique dynamic slots in `[0,+4,+8,+6]` role order and include every registered period star there; the bounded rule pack has 11 period-star modifiers. Require both selected-topic-slot decadal and yearly transformation sets to exist and be included in full, with at least one item across them; either individual set may be empty. This boundary is asymmetric: period stars cover both complete dynamic four-palace sets, while phase transformations cover only the selected topic dynamic slot. Never claim four-palace phase-transformation convergence or a complete Zi Wei judgment. Derive the window only by replaying the target and finding the maximal continuous interval in which both records remain unchanged; both endpoints must be bracketed. Formal criteria jointly require every natal focus-group axis, every registered decadal four-slot condition, every registered yearly four-slot condition, and every selected-topic-slot phase process in the same real-world matter. The three layers cannot substitute for one another, generic domain activity is not support, and no named event may be generated.

The closed meaning registry consists of five topic markers, fourteen major-star constructive/overextension axes, and four transformation process lenses. The separate bounded Sanhe result rule pack registers 24 same-palace major-star pairs, 14 natal context modifiers, and 11 period-star modifiers. These are project-authored bounded paraphrases with `automated_fixture_reviewed`, `professional_label_allowed: false`, and `predictive_validity: not_established`; they have no independent practitioner review.

For any of these three routes, do not author the result narrative yourself. Give the claim its exact facts, scope, rule, topic, topic unit, semantic bindings where required, and requested assessment mode. Then let `bind-reading` mechanically derive `meaning_binding` and replace `statement`, `reasoning_summary`, `alternative_readings`, `practical_reflection`, and `assessment`. `validate-reading` must independently rederive the binding and all five fields and require an exact match. Do not edit those fields after binding.

If derivation reports an empty focus palace without exact replayed opposite-major-star context; incomplete, role-mismatched, unknown, malformed, or duplicated natal stars; omitted brightness for a sitting star; imported brightness/transformation for an opposite-context star; omitted registered natal context; incomplete/duplicated/out-of-order dynamic four-slot sets; omitted or malformed registered period stars; an incomplete selected-topic-slot transformation set; or an unbracketed interval, stop the closed route. Never fill a star or dynamic slot by hand or clip a period window. Downgrade to verified chart facts, a narrower supported current reflection, or `unresolved`. A request for a concrete life event or result is likewise unresolved, although a bounded non-event theme may still be offered when the exact closed route succeeds.

## Unknown or uncertain birth time

Never insert noon, midnight, or a “likely” hour without the user's confirmation.

Offer the smallest honest option:

1. **Reduced reading** — omit all time-dependent fields and conclusions.
2. **Full-day sensitivity** — enumerate supported candidate periods and report stable, partly stable, boundary-sensitive, and unavailable conclusions.

Birth-time rectification is not an executable workflow in this release. If explicitly asked, discuss its selection-bias and overfitting risks only; do not rank candidate hours or present an event-fitted candidate as a recovered fact.

This release does not accept a bounded birth-time range in the calculation schema. If the user knows only “06:00–10:00” or “morning,” preserve that statement but do not sample it by hand or claim native range coverage. Ask whether an exact recorded time is available; otherwise use the engine's full-day sensitivity or a reduced reading and disclose the broader scope.

For systems with a 23:00 day-boundary convention, preserve separate early- and late-Zi candidates when the engine exposes them. Report candidate coverage such as `8/13`; do not convert it into “62% likely” or predictive confidence. Western charts without a reliable time must not report houses, angles, Ascendant, or Midheaven. Hour-dependent systems must not collapse candidate charts into one invented chart.

## Give the answer before the machinery

The ordinary reading must never begin with input, profile, warnings, sensitivity, a chart table, card keywords, or an audit receipt. Begin with the user's question and a direct but conditional answer.

For a birth-based or target-date result, preserve the renderer's fixed ordinary-language hierarchy:

1. **先说结论** — answer the user's actual focus in one or two direct declarative sentences; the renderer splits summary sentences into bullets. Say what the result means in work, money, relationships, or the current decision before explaining the chart. Do not substitute a string of questions, “先看……”, “待核对线索”, or “前台／背景层” labels for the answer. A conditional answer must name both the condition and what it changes; “可能有机会，仍需观察” is too vague.
2. **阶段时间轴** — place it immediately after the conclusion when an exact `R-ZW-009` interval exists; otherwise omit it. Use category-level plain language such as collaboration/expression support, resource support, friction or sudden pressure, movement/change, relationship interaction, and buffering/problem-solving. Keep detailed stars in the evidence layer.
3. **分主题卡片** — within each card use **结论** (when not already the headline) → **白话解读** → **盘面依据（术语）** → **什么情况要改判** → **现实提醒**. A career or wealth card first states what the result means for that domain, then gives one bounded reason. Questions used to test fit belong only in **现实核对**, never in the headline or card answer. Split summary/plain meaning by sentence, evidence at semicolons, and revision conditions one per bullet.
4. **现实核对** — show support, contradiction, and unclear criteria.
5. **需要留意** — state only material uncertainty in plain language.
6. **接下来可以看** — show the canonical available next steps; the disclaimer follows last.

Keep terminology, full chart lists, sources, profiles, warnings, hashes, and raw technical records after this result layer. “为什么这样看” may expand the reasoning, and “反例与另一种解释” must remain one direct action away.

For a focused current question, use this order:

1. **先说答案** — one conditional answer tied to the question;
2. **当前局面**;
3. **真正的阻力或张力**;
4. **有利条件与风险**;
5. **当前模式对选择的含义** — describe present conditions and tradeoffs, never a future event or outcome;
6. **一个现实、具体、可逆的下一步**.

Do not keyword-dump. A Tarot multi-card reading must connect at least two position-card facts as a support, tension, sequence, or turn. A Zi Wei phase reading must combine the complete four-palace fourteen-major-star axes with emitted exact-topic-slot decadal/yearly facts, the complete eligible phase-transformation set, and the fully bracketed profile-derived interval before passing the closed `R-ZW-009` meaning route; a period label or one star cannot support even a bounded salience claim, and the completed route still cannot support four-palace phase convergence, a complete Zi Wei judgment, or an event claim.

For Tarot decisions, explain what each position changes in the choice and give one reversible comparison step; do not announce which option “wins.” For I Ching, distinguish the primary situation, selected change stage, and changed tendency without supplying unregistered classical text. For Meihua, explain body/use and the relation before/after change without adding an auspicious date or response time. For Western readings, translate the exact topic chain into ordinary language and omit house-based claims when the required birth data is absent.

Keep the normal continuation menu human-facing, for example “深挖事业 / 深挖财富 / 深挖感情 / 看阶段 / 为什么这样看 / 修改资料 / 结束”. Put profile comparison, warning codes, hashes, source IDs, and raw JSON inside “依据与核对（高级）”, not beside the life topics.

For every material claim, follow [references/evidence-contract.md](references/evidence-contract.md). A readable evidence card should expose:

```text
结论 -> 性质 -> 盘面事实 -> 采用规则 -> 推理摘要
     -> 资料边界 -> 其他解释 -> 来源状态
```

Do not use one overall confidence score. Keep these axes separate:

- calculation certainty;
- stability across candidate inputs;
- stability across declared school profiles;
- source status;
- interpretive uncertainty.

For a request framed as “准不准”, answer in plain Chinese: the local engine and fixtures support whether the declared chart/draw was calculated consistently; registered sources support only the stated traditional rule; this release has not established real-world predictive accuracy. Do not make the user read internal accuracy enums unless they request the audit. Follow [references/professional-reading.md](references/professional-reading.md) for the backstage four-axis status and synthesis ladder.

If the user compares a reading with past events, treat that only as informal reflection and retain hits, misses, and unclear cases. It cannot enter the formal blind score because the outcome was already knowable. Formal verification currently accepts only canonical Zi Wei `R-ZW-009` three-layer salience hypotheses whose criteria jointly require natal focus axes, all registered decadal four-slot conditions, all registered yearly four-slot conditions, and selected-topic-slot phase processes over the fully bracketed joint-stability interval. It does not accept four-palace phase-transformation convergence, complete-Zi-Wei claims, concrete events, or claims from other systems/rules. No non-closed claim may make any future-event assertion. Never tune birth time, profile, rules, cards, wording, criteria, or period boundary after feedback to manufacture a match.

## Compare without manufacturing consensus

When several systems appear in one reading, preserve each system's original scope, profile, facts, and limitations in separate evidence cards. The current binder does not machine-classify them as equivalent, complementary, or conflicting, and it never votes, averages, or rewrites one system until they agree. A single-system reading omits `cross_system`; a multi-system reading is fixed to `cross_system: {relationship: "not_compared"}`. Any useful comparison must therefore be a transparent side-by-side explanation of already validated claims, not a machine-certified consensus. Agreement is not empirical confirmation.

## Quick, standard, deep, and audit modes

Default to `standard`; use `quick` when the user only wants a calculation receipt, `deep` for a single-system evidence-bound synthesis with professional depth, and `audit` for provenance or complex comparison.

- `quick`: a direct answer, one or two supporting themes, one actual limitation, and next actions; do not lead with the calculation receipt.
- `standard`: one system and one user topic at a time, three to five result-first claims, a plain limitation, and a short topic menu. Keep evidence cards backstage.
- `deep`: one system by default, compound fact patterns, supporting and constraining factors, counter-readings, source coverage, input sensitivity, and a small reversible reflection step. Present the synthesis first and the audit only on request.
- `audit`: multiple systems or profiles, full candidate accounting, original claims placed side by side without machine relationship classification, rule applicability and source audit, claim-to-fact trace, and machine-readable appendix.

All modes use identical frozen engine facts and safety boundaries. A deeper mode adds synthesis and traceability, not stronger destiny claims. Pro is useful for large synthesis and an adversarial second review, not required for core calculation and never a substitute for rules or sources. See [references/model-tiers.md](references/model-tiers.md) and [references/professional-reading.md](references/professional-reading.md).

In every machine-readable reading, copy the first claim statement exactly into `summary` after ordinary whitespace normalization; that first claim is the evidence-backed headline. Do not add a claim-level `dependencies` field. Express input conditions through `calculation_certainty` and `input_sensitivity`, or use an explicit `unresolved` statement when a conclusion is unavailable. In `standard`, `deep`, and `audit`, supply structured next-step actions only; `bind-reading` fixes each visible label and any unavailable reason, as well as the reading title, `user_focus` as the unique canonical Chinese topic labels from all claims joined in claim order, disclaimer, uncertainty summary, and exact material-warning acknowledgements. Every `interpretation` must cite at least one applicable registered rule, select a registered interpretation profile, and contain a bounded assessment with specific supporting and contradicting observations. Exact system facts in an interpretation belong only in typed `semantic_bindings` and the mechanically generated `technical_summary`; do not restate or contradict them in free prose. For Zi Wei `R-ZW-007/008/009`, even the non-technical result fields are canonical outputs of the closed meaning layer and must not be hand-edited. When no rule or closed meaning route covers the requested statement, keep the output factual or explicitly unresolved instead of filling the gap with model intuition. If a Zi Wei topic lacks a registered meaning route, use `binding_options.meaning_unavailable: "degrade_claim"` to downgrade only that claim with `unresolved_reason_kind: "rule_unavailable"`; do not call it missing birth data and do not discard other supported topics. Omit `cross_system` for one system; for multiple systems, let `bind-reading` set it exactly to `{relationship: "not_compared"}`. Do not author another relationship, prose, a winner, or a vote. Set `target_system` on any continuation that requests input or changes a target. A Tarot or I Ching continuation that changes the question or draw/cast inputs is always a new reading and never reuses the frozen calculation.

Before delivering any interpretive result, save the calculation envelope plus draft reading object in one local payload. Bind every claim to the exact calculation and cited fact values, then validate the bound output:

```bash
node scripts/fortune-teller.mjs bind-reading --input /absolute/path/to/reading-draft.local.json --output /absolute/path/to/reading-bound.local.json --pretty
node scripts/fortune-teller.mjs validate-reading --input /absolute/path/to/reading-bound.local.json --pretty
```

`bind-reading` is mechanical integrity preparation, not general approval of prose. Calculation replay, typed technical facts, and rule applicability can be checked. It fixes the root presentation fields (`title`, all-claim canonical `user_focus`, `disclaimer`, `uncertainty_summary`, exact material `warning_acknowledgements`, canonical single/multi-system `cross_system` behavior, and each next-step label/unavailable reason). On the three closed Zi Wei routes it also generates the complete bounded meaning fields; elsewhere unrestricted narrative remains `not_machine_verified`. If validation fails, narrow or correct the reading. Never rebind a changed chart to preserve an old conclusion, hand-edit canonical presentation or Zi Wei fields, or omit a failed gate merely to keep a preferred conclusion.

Use `render-reading` on the bound payload after successful validation. The ordinary answer follows conclusion → phase timeline when available → topic cards (conclusion/plain language/chart basis/revision conditions/real-world reminder) → reality checks → uncertainty → next steps, followed by the disclaimer. It exposes “为什么这样看” and counter-readings while hiding profiles, hashes, IDs, and other backstage fields. Preserve sentence-level bullets for summary/plain meaning, semicolon-level evidence bullets, and one-bullet-per revision condition.

For a formal forward-looking reality check, first create and bind one to five Zi Wei `R-ZW-009` `phase_topic_synthesis` claims using `prospective_hypothesis`. Each must contain the complete natal four-palace fourteen-major-star axes; complete decadal and yearly `[0,+4,+8,+6]` dynamic slots with every registered period-star condition; complete selected-topic-slot decadal and yearly transformation sets with at least one item across them (either individual set may be empty); and the fully bracketed interval in which both records remain unchanged. Formal criteria jointly require the natal focus axes, decadal four-slot conditions, yearly four-slot conditions, and selected-topic-slot phase processes, with no layer substituting for another. Phase transformations remain selected-topic-slot only. Validate before the window opens; `freeze-check` derives wording and criteria from the validated reading and rejects retrospective items, concrete-event hypotheses, other rules/systems, and separately rewritten hypotheses:

```bash
node scripts/fortune-teller.mjs freeze-check --input /absolute/path/to/check-input.local.json --output /absolute/path/to/check-record.local.json --pretty
node scripts/fortune-teller.mjs verify-check --input /absolute/path/to/check-verify.local.json --pretty
```

The freeze input contains exactly `{reading_payload, claim_ids}`. The reading-bound verify input contains exactly `{record, reading_payload}`; passing only the record checks record integrity but cannot show that a supplied reading is the frozen one. After every window has closed, `score-check` takes `{record, reading_payload, adjudications}` and preserves the prewritten criterion IDs, dated observations, evidence sources, misses, and unclear items. The tool derives the item outcome from those criterion results; user-entered evidence is not independently verified. Internal commitments can reveal a changed local record only when the earlier record was actually preserved. They are not trusted timestamps, digital signatures, engine-origin authentication, or evidence of predictive validity. See [references/accuracy-evaluation.md](references/accuracy-evaluation.md) for the complete file shapes and command sequence.

## Hard safety boundary

Do not use divination to diagnose or rule out illness, determine pregnancy, predict death or disaster, identify crimes, establish guilt, direct investments or legal action, validate paranoia or supernatural persecution, or claim certainty about another person's fidelity or inner state. Do not frighten, shame, coerce, or upsell a ritual or remedy.

For such a request, briefly state the boundary, name the reliable real-world route, and offer a safe reflective alternative if useful. If there is immediate danger or self-harm risk, prioritize real-world support over continuing the reading. Follow [references/safety.md](references/safety.md).

## Completion check

Before presenting a reading, verify:

- the selected method is currently supported at the disclosed status;
- normalized inputs and material profiles were confirmed or explicitly marked uncertain;
- all chart/draw facts came from the local result envelope;
- no time-dependent claim escaped the missing-time gate;
- every material interpretation has traceable facts and an honest source status;
- every exact technical assertion across all six shipped systems is mechanically rendered from a matching typed binding, and the unrestricted narrative is explicitly treated as not machine-proved;
- the generic adjudicator replayed the calculation and no unavailable system result was replaced with model intuition;
- every BaZi target-period statement preserves the frozen natal baseline and the returned decadal/yearly route re-adjudication; climate remains a 120-entry base route and passage remains a structural screen, not an event claim;
- every Western house-derived statement has the required reliable time and coordinates and follows the returned topic-house/ruler/luminary/aspect/condition chain;
- every Tarot decision keeps the declared spread and has no winner or card vote; every I Ching reading follows the returned changing-line selection without invented classical text; every Meihua reading stays inside the fixed two-number body/use/mutual/five-element route without season or timing;
- every Zi Wei ordinary result uses the registered wrapper and no unknown-time candidate or substitute topic palace was selected;
- every interpretation is bound to the exact calculation and cited fact values, uses a registered interpretation rule pack, and states observable support and counterevidence;
- every cited rule is applicable to the calculation mode, profile, fact type, and claim scope;
- every Zi Wei topic or phase claim uses one emitted topic unit, keeps all required same-topic components, and matches every named star, palace, or transformation relation to a semantic binding;
- every Zi Wei `R-ZW-007/008/009` claim has a mechanically derived `meaning_binding` and byte-for-byte canonical result fields; for `R-ZW-007/009`, every registered same-palace combination, major-star axis with emitted brightness, 六吉六煞, 禄存, and 天马 condition is complete across the four natal palaces;
- every `R-ZW-008` claim contains the selected topic unit's complete natal-transformation set, not a hand-picked subset;
- every `R-ZW-009` claim has complete `[0,+4,+8,+6]` dynamic four-palace sets for decadal and yearly scopes, every registered period star is bound with `period_star_in_slot`, and judgment follows natal baseline → decadal environment → yearly trigger;
- every `R-ZW-009` claim includes both complete selected-topic-slot phase-transformation sets, with at least one item across them while either individual set may be empty, and does not claim four-palace phase-transformation convergence; otherwise it was downgraded;
- every forward-check item uses canonical criteria requiring every natal focus axis, every registered decadal four-slot condition, every registered yearly four-slot condition, and every selected-topic-slot phase process; no layer substitutes for another and no concrete event or result is asserted;
- the title, all-claim canonical `user_focus`, disclaimer, uncertainty summary, next-step labels/unavailable reasons, and every material warning code came from `bind-reading`; `warning_acknowledgements` contains each actual material code exactly once and no extras;
- same-question follow-ups reuse the frozen calculation/draw, new questions require explicit reset, and negative feedback never triggers an automatic redraw or time rectification;
- every `deep`/`audit` traditional or interpretive claim cites at least two distinct, materially related fact roots, exposes a counter-reading, and does not merely list symbols; multiple leaf fields under one fact object still count as one root;
- `cross_system` is absent for one system and exactly `{relationship: "not_compared"}` for multiple systems; no machine classification, winner, vote, or free-text reconciliation was added;
- no non-closed claim contains any future-event assertion, and no scientific-validity, inevitability, or high-stakes claim was introduced;
- the response starts compactly and gives the user control over what to expand.
- the ordinary response contains no profile ID, warning code, sensitivity count, hash, engine/schema version, raw JSON, or fact/rule/source ID unless the user explicitly asked for evidence or an audit.
