# Zi Wei Bounded Reading Map

Use this map only after [ziwei.md](ziwei.md), a resolved known-time chart, and the live Zi Wei rule/source registry. It is a compact project-authored paraphrase for consistent readings, not a quotation, a complete school manual, independent practitioner certification, or evidence of predictive validity.

The closed machine-bound deep-reading surface is deliberately narrow. Only rules `R-ZW-007`, `R-ZW-008`, and `R-ZW-009` may use it:

| Reading topic | Primary palace | Required machine unit | Boundary |
|---|---|---|---|
| `overview` | 命宫 | matching `facts.topic_units[]` record | broad life orientation, not a fixed personality diagnosis |
| `career_study` | 官禄 | matching `facts.topic_units[]` record | work/study responsibility and craft, not a promotion or exam prediction |
| `wealth_resources` | 财帛 | matching `facts.topic_units[]` record | resource acquisition and allocation, not an amount or investment return |
| `relationships` | 夫妻 | matching `facts.topic_units[]` record | long-term reciprocity and negotiation, not fidelity or a marriage date |
| `wellbeing_rhythm` | 福德 | matching `facts.topic_units[]` record | restoration, attention and load, not diagnosis or prognosis |

疾厄 appears only as `wellbeing_rhythm.secondary_context`. It may narrow a discussion of sustainable rhythm, but it cannot become a standalone medical reading. Questions outside the five topics may receive factual chart navigation or a narrower standard response; they do not qualify for the closed Zi Wei meaning layer.

The closed meaning registry contains five topic markers, fourteen major-star dual axes, and four transformation process lenses. A separate bounded Sanhe result rule pack registers 24 same-palace major-star pairs, 14 natal context modifiers, and 11 period-star modifiers. `bind-reading` derives wording from these fixed records; do not free-complete them.

A Zi Wei claim outside these three closed routes cannot assert any future event. If the requested future conclusion is not produced by the closed layer—and this layer never produces concrete events—return factual navigation, a current bounded reflection, or `unresolved`.

## 1. Start from the user's life area

Map the user's question to one supported topic before reading stars. The emitted topic unit—not a model-selected keyword—chooses the primary palace. Palace names identify the area to inspect; they do not promise an event.

| Palace | Bounded question area | Do not turn it into |
|---|---|---|
| 命宫 | self-directed style, priorities, recurring approach | a fixed personality diagnosis |
| 兄弟 | peers, siblings, lateral support and comparison | certainty about a sibling's private life |
| 夫妻 | long-term partnership, negotiation and reciprocity | a marriage date, fidelity verdict or destined partner |
| 子女 | care responsibilities, creative output and what one develops | pregnancy, fertility or a child's fate |
| 财帛 | acquiring, allocating and managing resources | a wealth amount, investment return or gambling advice |
| 疾厄 | strain, recovery habits and bodily attention | diagnosis, prognosis or treatment advice |
| 迁移 | external environments, mobility and adaptation | a guaranteed move, visa or travel outcome |
| 交友 | networks, teams, clients and collaboration boundaries | mind-reading or moral judgment of another person |
| 官禄 | work role, craft, responsibility and public contribution | a guaranteed promotion or job loss |
| 田宅 | home base, property responsibilities and belonging | a property price or purchase instruction |
| 福德 | inner restoration, meaning, attention and mental load | a mental-health diagnosis |
| 父母 | authority, mentorship, institutions and family-of-origin roles | blame, longevity or an inevitable family event |

When a user asks about “人生大事”, offer the five supported topics and deepen one at a time. Never manufacture a wedding, illness, windfall, bereavement, accident, or exact date.

## 2. Bind the complete 三方四正 unit

For the selected topic, the reading must cite:

1. the matching `facts.topic_units[]` fact;
2. its `primary_palace_id`;
3. its `relation_fact_id`;
4. every one of its four `component_palace_ids`.

The four components are the focus palace, two trine palaces, and opposite palace emitted by the engine. They are one evidence group. Do not cite only the components that make the conclusion sound favorable, replace one with another palace, or treat the relation object alone as a star reading.

The four-palace group supplies structure, not a vote or score. A repeated theme may justify more attention; it does not become more objectively probable because several traditional symbols point in the same direction.

## 3. Fourteen major-star axes

Each entry is an interpretive axis, never a verdict by itself. Keep each major star bound to its palace and emitted brightness. When a same-palace pair is one of the 24 registered combinations, use the pair rule before isolated single-star axes. Include every present registered natal context modifier: 六吉 (左辅、右弼、文昌、文曲、天魁、天钺), 六煞/压力星 (擎羊、陀罗、火星、铃星、地空、地劫), 禄存 and 天马. These are conditions, not additive points.

| Star | Constructive axis | Overextension to check |
|---|---|---|
| 紫微 | coordination, long-range framing, holding a center | status pressure, over-control, expectations outrunning support |
| 天机 | analysis, planning, adaptation, finding alternatives | overthinking, frequent switching, plans not reaching execution |
| 太阳 | visibility, contribution, advocacy, mobilizing others | overextension, needing recognition, helping without enough boundaries |
| 武曲 | execution, resource discipline, direct decisions | rigidity, under-communicating, acting before enough consultation |
| 天同 | ease, affiliation, restoration, finding workable comfort | avoidance, delayed confrontation, staying comfortable too long |
| 廉贞 | boundaries, negotiation, complexity, testing limits | entanglement, image pressure, escalating a contest unnecessarily |
| 天府 | stewardship, storage, continuity, building a stable base | inertia, possessiveness, protecting the existing arrangement too long |
| 太阴 | inward processing, accumulation, care, quiet preparation | withdrawal, hesitation, carrying unspoken concerns alone |
| 贪狼 | curiosity, social range, appetite, experimentation | dispersion, excess, novelty displacing sustained commitment |
| 巨门 | questioning, articulation, investigation, naming ambiguity | rumination, argument loops, mistrust amplified by incomplete information |
| 天相 | mediation, standards, role balance, institutional fit | indecision, over-accommodation, relying too much on external approval |
| 天梁 | protection, principle, mentoring, taking the long view | moral burden, rescuing, becoming inflexible in the name of principle |
| 七杀 | decisive action, autonomy, pressure tolerance, cutting through | abruptness, isolation, treating every problem as a test of force |
| 破军 | dismantling, renewal, experimentation after disruption | burning bridges, change for its own sake, underestimating transition cost |

For `R-ZW-007` and `R-ZW-009`, binding schema `fortune-teller/ziwei-meaning-binding/v2` uses exactly four ordered `palace_axis_groups`:

1. `focus` with `relation_offset: 0`;
2. `trine_plus_4` with `relation_offset: 4`;
3. `trine_plus_8` with `relation_offset: 8`;
4. `opposite_plus_6` with `relation_offset: 6`.

Each group has exactly `{relation_role, relation_offset, palace: {fact_id, name}, major_star_axes: [...]}` and binds every registered major-star axis in that palace; major-star semantic bindings retain `brightness`. Same-palace combinations and natal context conditions are derived from the complete four-palace facts. Do not omit, duplicate, move, borrow, or suppress registered content. An empty focus group or malformed registered star closes the route. This remains bounded coverage, not a complete Zi Wei judgment.

Semantic binding is mandatory. If a sentence names star X in palace Y, the cited palace fact must actually contain star X and be palace Y. A star found elsewhere in the chart cannot support that sentence merely because its symbolism is convenient.

## 4. Four transformations as process labels

Use transformations only where the engine actually emits and locates them.

| Transformation | Bounded process lens | Unsafe shortcut |
|---|---|---|
| 禄 | attraction, access, resources or ease of flow | guaranteed money or good luck |
| 权 | agency, responsibility, leverage or pressure to act | guaranteed power or promotion |
| 科 | visibility, ordering, explanation or recognized competence | guaranteed fame, exam or credential outcome |
| 忌 | friction, obligation, repetition, blind spot or higher cost | disaster, punishment or inevitable loss |

`禄` and `忌` can coexist as “more opportunity and more cost”; `权` can mean responsibility before status; `科` can mean a need to make work legible rather than public acclaim. Always inspect the bound star and palace instead of reading the transformation alone.

For `R-ZW-008`, the selected topic unit's `natal_mutagen_fact_ids` set must be non-empty, and every listed fact ID must be included—the claim cannot select only one favorable or convenient transformation. Every item needs an exact `mutagen_in_palace` semantic binding whose star, transformation label, and palace match the calculation. An empty or partial set makes the route unavailable. The meaning layer derives only the corresponding registered process lenses. Never move a 四化 label to another star or palace, convert the processes into a net auspiciousness score, or infer a concrete result.

For `R-ZW-009`, decadal and yearly scopes each require complete dynamic slots `[0,+4,+8,+6]` and every registered period-star condition in them. The 11 period modifiers cover bounded support, resource, movement, pressure, relationship, and resolution conditions; each star is bound with `period_star_in_slot`. Separately, the exact selected-topic dynamic slot's decadal and yearly transformation sets must both exist and be bound in full; at least one item is required across them, while either individual set may be empty. Period stars therefore cover two dynamic four-palace layers, while phase transformations remain selected-topic-slot only.

## 5. Three closed routes

### `R-ZW-007`: current natal topic axes

1. Select one of the five supported topics and its exact topic unit.
2. Cite the unit, primary palace, relation fact, and all four component palace facts.
3. Use `assessment.mode: current_reflection`.
4. Let the meaning layer derive all four ordered `palace_axis_groups`, registered same-palace combinations, emitted brightness, and all present 六吉六煞/禄存/天马 conditions. Missing registered content closes the route.
5. Let the canonical renderer generate the statement, reasoning, counter-readings, practical reflection, and support/contradiction criteria.

### `R-ZW-008`: current transformation process

1. Select the exact natal topic unit and primary palace.
2. Declare an exact semantic binding for every transformation fact in that topic unit; partial selection is invalid.
3. Cite the topic, primary palace, every transformation fact, and every exact palace fact containing the transformed star.
4. Use `assessment.mode: current_reflection`.
5. Let the meaning layer generate the complete registered process observation and canonical reality check.

### `R-ZW-009`: bounded target-date phase salience and process

1. Select the matching `facts.phase_topic_units[]` record and natal topic unit.
2. Derive exactly four unique decadal dynamic components and four unique yearly dynamic components in `[0,+4,+8,+6]` role order.
3. Bind every registered dynamic star with `period_star_in_slot`; missing, malformed, duplicated, or unregistered entries close the route.
4. Bind both complete selected-topic-slot decadal and yearly transformation sets; require at least one item across them, while either individual set may be empty.
5. Judge in the fixed order natal baseline → decadal environment → yearly trigger.
6. Use `bounded_phase` for a current reflection or `prospective_hypothesis` only before the window begins.
7. Replay the maximal interval in which both records remain unchanged and bracket both endpoints. Generate formal criteria requiring natal focus axes + all decadal four-slot conditions + all yearly four-slot conditions + all selected-topic-slot phase processes. No layer substitutes for another.

This route asks whether the required three-layer combination becomes repeatedly salient within the exact joint-stability interval. It is not satisfied by generic activity, and selected-topic-slot phase processes do not become four-palace phase-transformation convergence or a complete Zi Wei judgment. It does not support promotion, admission, resignation, marriage, illness, moving, windfalls, or other concrete events/results.

## 6. Canonical result wording

Do not handwrite the five result-facing fields for a closed route. `bind-reading` must derive `meaning_binding` and overwrite:

1. `statement`;
2. `reasoning_summary`;
3. `alternative_readings`;
4. `practical_reflection`;
5. `assessment`, including stable criterion IDs and evidence-source requirements.

`validate-reading` independently recomputes the binding and all five fields. The phase route keeps natal four-palace detail, both dynamic four-palace period layers, and selected-topic-slot phase processes in reasoning; its formal standard requires all four criterion groups without substitution. Ordinary `render-reading` follows conclusion → phase timeline when available → topic cards (conclusion/plain language/evidence/revision conditions/reminder) → reality checks → uncertainty → next steps. Summary/plain meaning, evidence, and revision conditions are split into scan-friendly bullets; detailed phase stars remain in evidence.

If the user gives feedback about an already known event, retain hits, misses, and unclear cases, but label it informal. Formal verification accepts only a canonical `R-ZW-009` three-layer salience claim frozen before its fully bracketed joint-stability interval opens; follow [accuracy-evaluation.md](../accuracy-evaluation.md).

## 7. Source and review boundary

- Calculation fields come from the pinned `iztro@2.6.0` implementation and its official horoscope API documentation.
- The analysis order and non-deterministic period framing are bounded by the registered iztro horoscope guide and the historical terminology source recorded in the registry.
- The compact meanings in the registry and this file are original project text. They are not copied modern guidebook text, verified quotations, or a substitute for a lineage-specific corpus.
- These themes support reflective interpretation only. They do not establish empirical personality or event prediction.
- Typed bindings check named Zi Wei stars, palaces, transformations, and same-topic period structure. The three closed routes additionally prove only that emitted results exactly match the project-authored registry and canonical renderer; they do not prove that those meanings are true. Narrative outside those routes remains `not_machine_verified`.
- The current rule pack is `automated_fixture_reviewed`, not independently reviewed by Zi Wei practitioners. Its predictive validity is `not_established`, and the project does not enable a certified professional label. See [professional-reading.md](../professional-reading.md).
