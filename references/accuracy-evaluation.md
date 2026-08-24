# Accuracy Evaluation Protocol

Use this reference when a user asks whether a reading is “accurate,” when reporting quality status, when comparing an already known event informally, or when designing a prospective evaluation. Give the practical conclusion first: Fortune Teller can currently check reproducible calculation and rule-bound interpretation behavior, but real-world predictive validity is `not_established`.

## 1. Three different meanings of accuracy

| Layer | Question | Evidence that can answer it | Current claim ceiling |
|---|---|---|---|
| Calculation correctness | Did the engine produce the declared chart or cast from the declared inputs and profile? | pinned dependencies, boundary fixtures, deterministic replay, differential/oracle checks | claim only the exact tested implementation and profile scope |
| Traditional-rule fidelity | Did the reading follow one declared rule pack and preserve its required facts, meanings and limits? | versioned rule/source registry, fact-value bindings, semantic validators, practitioner review | `automated_fixture_reviewed`; no independent practitioner certification |
| Real-world predictive validity | Do pre-stated claims predict unseen outcomes better than relevant baselines? | preregistered prospective evaluation, blinded outcome collection, holdout analysis and independent replication | `not_established` |

Never use calculation agreement as proof that a traditional interpretation is true. Never use source fidelity, user satisfaction, a few striking matches, or cross-system agreement as proof of prediction.

## 2. Evaluating calculation correctness

Calculation evaluation is profile-specific. Record the system, input, profile, dependency version, engine version, relevant warnings, and the backstage integrity fields. Then test:

1. deterministic replay for identical deterministic inputs;
2. independent published fixtures or an independent oracle where one exists;
3. boundary cases for calendar transitions, day boundaries, time zones, daylight-saving gaps and overlaps, unknown time, and validated date ranges;
4. wrapper parity with the pinned dependency's direct output;
5. fail-closed behavior outside declared support.

An internal fixture proves that a regression was not introduced; it does not prove that the upstream algorithm, chosen school convention, historical birth data, or user-supplied time is correct. If only wrapper and dependency agree, report `wrapper_conformant`. Reserve `cross_validated` for an actually independent oracle covering the material outputs and profile.

## 3. Evaluating traditional-rule fidelity

A rule-faithful reading must be reproducible from one declared calculation profile and one compatible interpretation profile. Check that:

- every material claim is bound to the exact calculation facts used, not merely to reusable fact-ID labels;
- every interpretation cites an applicable registered rule and only sources within that rule's declared scope;
- the claim's topic, scope and epistemic status match the rule;
- star, palace, line, card position, transformation, aspect, or other named semantics match the referenced facts;
- compound rules include every required evidence group rather than cherry-picking favorable components;
- counter-readings, missing premises and material profile sensitivity remain visible;
- no incompatible schools or profiles are silently blended.

For the current Zi Wei deep-reading route, `R-ZW-007/009` must include registered same-palace major-star combinations, every emitted major-star brightness, and all present 六吉六煞/禄存/天马 conditions across the complete natal four-palace unit. The bounded result rule pack contains 24 same-palace pairs, 14 natal context modifiers, and 11 period-star modifiers. `R-ZW-008` uses every selected-topic natal transformation. `R-ZW-009` judges natal baseline → decadal environment → yearly trigger: decadal and yearly each require complete dynamic slots `[0,+4,+8,+6]` and all registered period-star conditions, while both selected-topic-slot phase-transformation sets must be complete, with at least one item across them while either individual set may be empty. The binder and validator must derive identical canonical meaning fields. Formal criteria jointly require every natal focus axis, every registered decadal four-slot condition, every registered yearly four-slot condition, and every selected-topic-slot phase process. No layer substitutes for another. The exact window is the replayed maximal continuous interval in which both records remain unchanged and both endpoints are bracketed. This is not four-palace phase-transformation convergence, a complete Zi Wei judgment, or a concrete event forecast.

The current review status is `automated_fixture_reviewed`. This means tests exercise known positive and negative cases. It does not mean an independent Zi Wei, BaZi, astrology, Tarot, I Ching or Meihua practitioner has certified the rule pack. `domain_expert_reviewed` requires documented independent reviewers, an exactly identified reviewed artifact and rule-pack version, disclosed school and conflicts, blinded fixtures, resolved critical findings, and a reproducible review record. Any digest used there identifies the reviewed bytes only; it does not itself supply expertise, provenance, or accuracy.

Presentation integrity is a separate, narrower contract. `bind-reading` fixes the title, derives `user_focus` from the unique canonical Chinese topic labels of all claims in claim order, writes the disclaimer and uncertainty summary, copies exactly the material engine-warning code set, and fixes next-step labels/unavailable reasons. It removes `cross_system` for one system and writes exactly `{relationship: "not_compared"}` for multiple systems; this does not claim machine-established agreement, complementarity, or conflict. Claims cannot carry free-text `dependencies`. These constraints prevent result-facing fields from smuggling another conclusion, but they do not make the traditional claim empirically accurate.

## 4. Reading-bound prospective freeze and score

The optional v3 blind-check helper reduces ordinary hindsight rewriting. Only a canonical Zi Wei `R-ZW-009` three-layer salience claim is eligible. Its criteria jointly require natal focus axes, all registered decadal four-slot conditions, all registered yearly four-slot conditions, and all selected-topic-slot phase processes. It rejects free hypotheses, layer substitution, four-palace phase-transformation convergence, complete-Zi-Wei claims, concrete-event standards, generic activity, other rules/systems, retrospective mode, and altered readings.

1. In the original draft, prepare one to five `phase_topic_synthesis` claims using `R-ZW-009` and `assessment.mode: prospective_hypothesis`. Supply the exact calculation facts and semantic bindings, not hand-written result wording or event criteria.
2. Run `bind-reading`. It must derive the complete natal four-palace axes, both complete dynamic four-palace layers with every registered period-star condition, both complete selected-topic-slot transformation sets with at least one item across them, the fully bracketed joint-stability interval, and canonical criteria. Those criteria require natal focus axes + decadal four-slot conditions + yearly four-slot conditions + selected-topic-slot processes without substitution. Then run `validate-reading`; the blind check cannot bypass this gate.
3. Select the existing claim IDs. `freeze-check` preserves the complete reading payload, freeze-time validation receipt, claim bindings, exact wording, start/end dates, full criterion objects, and required evidence-source types.
4. Preserve both `reading-bound.local.json` and `check-record.local.json`. Reading-bound `verify-check` must accept the exact pair before adjudication. Historical records are checked against their preserved freeze-time receipt rather than being rewritten to satisfy a later validator version.
5. Wait until every exact current-profile decadal/yearly joint-stability interval has ended. For every frozen criterion, record exactly one `result` (`met`, `not_met`, or `unclear`), one `observed_on` date inside its window, the exact required `source_type`, and a concrete `observation`.
6. Do not enter a hypothesis outcome. `score-check` derives `supported`, `contradicted`, or `unclear` mechanically from the complete criterion set and conservatively resolves missing clarity or support/contradiction conflict to `unclear`.
7. Report all three counts and preserve every frozen statement, criterion, and criterion result. Do not calculate a promotional hit rate.

### Complete split-file flow

Assume `reading-bound.local.json` is the complete, validated output of `bind-reading` and contains claim `C-prospective-1`. Its wording, `meaning_binding`, criteria, and exact window must already be canonical. Do not write a work-offer, promotion, marriage, illness, or other event standard into the draft; binding will reject or overwrite unsupported result-facing fields.

Freeze and immediately verify the exact reading–record pair:

```bash
node scripts/fortune-teller.mjs validate-reading --input reading-bound.local.json --pretty
node scripts/fortune-teller.mjs freeze-check --reading reading-bound.local.json --claim-ids C-prospective-1 --output check-record.local.json --pretty
node scripts/fortune-teller.mjs verify-check --record check-record.local.json --reading reading-bound.local.json --pretty
```

Open `check-record.local.json` and copy every `hypotheses[].criteria[].criterion_id` and its `evidence_source`. The following v3 `adjudications.local.json` shape uses an illustrative fixture whose target date is `2027-06-01`; engine replay under its `normal` profile yields `2027-02-06` through `2028-01-25` as the exact interval in which both current-profile decadal and yearly records remain unchanged. It can be scored only after that end date. All three criteria are adjudicated exactly once; `outcome` and free `evidence` fields are deliberately absent:

```json
[
  {
    "hypothesis_id": "H-01",
    "criteria": [
      {
        "criterion_id": "K-ZW-CS-PHASE-SUPPORT",
        "result": "met",
        "observed_on": "2027-06-18",
        "source_type": "contemporaneous_record",
        "observation": "当日记录逐项标注了本命焦点轴、大限四槽条件、流年四槽条件与主题槽阶段过程如何在同一现实事项中共同出现。"
      },
      {
        "criterion_id": "K-ZW-CS-PHASE-CONTRADICT",
        "result": "not_met",
        "observed_on": "2028-01-20",
        "source_type": "contemporaneous_record",
        "observation": "区间内的完整同期记录不支持该反驳标准被满足。"
      },
      {
        "criterion_id": "K-ZW-CS-PHASE-UNCLEAR",
        "result": "not_met",
        "observed_on": "2028-01-20",
        "source_type": "contemporaneous_record",
        "observation": "同期记录包含日期、逐项本命焦点轴、逐项大限与流年四槽条件、逐项主题槽阶段过程和替代机制字段。"
      }
    ]
  }
]
```

Always use the actual IDs, source types, and start/end dates in the frozen record; the example values are not universal. Then score from the three preserved files:

```bash
node scripts/fortune-teller.mjs score-check --record check-record.local.json --reading reading-bound.local.json --adjudications adjudications.local.json --output check-score.local.json --pretty
```

The composite-file alternatives are exactly `{reading_payload, claim_ids}` for freeze, `{record, reading_payload}` for reading-bound verification, and `{record, reading_payload, adjudications}` for scoring. Record-only verification checks only the preserved record's internal integrity; it does not show that a separately supplied reading is the frozen one.

Internal commitments reveal later alteration only if the earlier record was preserved. They do **not** improve accuracy or supply a trusted timestamp: `frozen_at` comes from the local clock, there is no external timestamp authority or public append-only log, and the program does not authenticate user-entered evidence. Therefore this is an anti-rewrite aid, not proof of preregistration or prediction.

Do not compute an “accuracy percentage” by discarding `unclear` items, counting generic topic activity or loosely related events as hits, or retrying profiles until one fits. This check can reveal obvious mismatches and improve discussion discipline; it cannot establish general predictive validity.

## 5. Requirements for a real predictive-validity study

Before changing `predictive_validity: not_established`, a study should at minimum:

- preregister the population, inclusion rules, versioned calculation and rule packs, domains, windows, observable outcomes, abstention rules, primary metric and analysis plan;
- freeze predictions before outcomes are available and use a verifiable external timestamp or repository;
- keep predictors blind to outcomes and outcome adjudicators blind to charts and predicted labels;
- evaluate unseen participants or future windows, not examples used to write the rules;
- compare against base rates, simple non-divinatory covariates, and appropriately permuted or placebo charts;
- retain contradictions, unclear outcomes, missing data and abstentions;
- report calibration, uncertainty intervals, false positives, false negatives and all prespecified analyses;
- reproduce any positive result on a new independent sample.

A statistically unusual result in one exploratory dataset is not enough. Report effect size and uncertainty, correct for multiple comparisons, and distinguish an exploratory signal from confirmatory evidence.

## 6. User-facing wording

Current safe summary:

> 这套工具能严格核对排盘口径和解读有没有用错本盘事实，也能先冻结说法再完整记录命中、反例与不清楚；但它尚未经过独立命理专家审阅，也没有建立现实预测有效性。

Do not say “scientifically accurate,” “expert certified,” “validated by many tests,” or quote a personal hit rate unless the exact corresponding evidence and denominator exist. See [professional-reading.md](professional-reading.md) for delivery rules and [PROFESSIONAL_COVERAGE.md](../docs/PROFESSIONAL_COVERAGE.md) for current system coverage.
