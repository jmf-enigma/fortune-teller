import { FortuneTellerError } from "./errors.mjs";
import { verifyCalculationFacts } from "./calculation-verifier.mjs";
import {
  canonicalZiweiNarrative,
  canonicalZiweiSemanticBindings,
  deriveZiweiMeaningBinding,
} from "./meaning-layer.mjs";

const TOPICS = new Set([
  "overview", "career_study", "wealth_resources", "relationships", "family_social", "wellbeing_rhythm",
]);

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function unique(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value))];
}

function ensureZiwei(calculation) {
  if (!calculation || calculation.system !== "ziwei") {
    throw new FortuneTellerError(
      "ZIWEI_READING_ADJUDICATION_INPUT_INVALID",
      "Zi Wei reading adjudication requires one Zi Wei calculation envelope",
    );
  }
  const replay = verifyCalculationFacts(calculation);
  if (replay.errors.length) {
    throw new FortuneTellerError(
      "ZIWEI_READING_ADJUDICATION_FACTS_UNVERIFIED",
      "Zi Wei reading adjudication refuses facts that do not replay",
      { errors: replay.errors },
    );
  }
  return replay.status;
}

function natalClaim(calculation, topic) {
  const unit = calculation.facts?.topic_units?.find((item) => item.topic === topic);
  if (!unit) return null;
  return {
    system: "ziwei",
    scope: "topic_synthesis",
    topic,
    topic_unit_id: unit.fact_id,
    rule_ids: ["R-ZW-007"],
    fact_ids: unique([
      unit.fact_id,
      unit.primary_palace_id,
      unit.relation_fact_id,
      ...(unit.component_palace_ids || []),
    ]),
    assessment: { mode: "current_reflection" },
  };
}

function phaseClaim(calculation, topic) {
  const unit = calculation.facts?.phase_topic_units?.find((item) => item.topic === topic);
  if (!unit) return null;
  const natal = calculation.facts?.topic_units?.find((item) => item.fact_id === unit.natal_topic_unit_id);
  if (!natal) return null;
  return {
    system: "ziwei",
    scope: "phase_topic_synthesis",
    topic,
    topic_unit_id: unit.fact_id,
    rule_ids: ["R-ZW-009"],
    fact_ids: unique([
      unit.fact_id,
      natal.fact_id,
      natal.primary_palace_id,
      natal.relation_fact_id,
      ...(natal.component_palace_ids || []),
      unit.target_fact_id,
      unit.phase_validity_fact_id,
      unit.decadal_star_palace_id,
      unit.yearly_star_palace_id,
      ...(unit.decadal_component_star_palace_ids || []),
      ...(unit.yearly_component_star_palace_ids || []),
      ...(unit.decadal_transformation_fact_ids || []),
      ...(unit.yearly_transformation_fact_ids || []),
    ]),
    assessment: { mode: "bounded_phase" },
  };
}

function unavailable(calculation, replayStatus, reason, changeConditions = null) {
  return deepFreeze({
    schema_version: "ziwei-reading-adjudication-v0.5",
    system: "ziwei",
    status: "unavailable",
    conclusion: "当前资料只够保留排盘事实，暂不生成紫微主题深读。",
    plain_language: reason,
    lenses: {},
    basis: [],
    change_conditions: changeConditions || ["补齐可重放的出生时刻和目标日期后，重新从主题宫与三方四正开始。"],
    reality_checks: ["先核对出生记录；不要用经历倒推一个更顺耳的时辰。"],
    unresolved: ["主题深读"],
    safeguards: {
      score_used: false,
      named_event_prediction_used: false,
      predictive_validity: "not_established",
    },
    audit: { calculation_replay_status: replayStatus, calculation_mode: calculation.facts?.mode },
  });
}

/**
 * Render the existing closed Zi Wei meaning binding as a result-first response.
 * A valid target-date phase is preferred unless options.phase is "natal";
 * if that phase route lacks a required registered fact, the function falls
 * back to the natal route and discloses that choice.
 */
export function adjudicateZiweiReading(calculation, options = {}) {
  const replayStatus = ensureZiwei(calculation);
  const topic = options.topic || "overview";
  if (!TOPICS.has(topic)) {
    throw new FortuneTellerError(
      "ZIWEI_READING_ADJUDICATION_TOPIC_INVALID",
      `unsupported Zi Wei topic: ${String(topic)}`,
    );
  }
  if (topic === "family_social") {
    return unavailable(
      calculation,
      replayStatus,
      "家庭与广义人际需要区分田宅、父母、兄弟、交友等不同宫位；当前封闭主题表尚未安装这一合并路线，因此不拿关系宫或命宫替代。",
      ["改选当前已闭合的事业学业、财富资源、长期关系或身心节奏主题；家庭与广义人际需等待多宫合并路线安装后重新计算。"],
    );
  }
  if (calculation.facts?.mode !== "known-time") {
    return unavailable(calculation, replayStatus, "出生时刻未知时，不从候选盘中挑一张生成三方四正或阶段结论。");
  }

  const attempts = [];
  if (options.phase !== "natal") {
    const claim = phaseClaim(calculation, topic);
    if (claim) attempts.push({ layer: "phase", claim });
  }
  const natal = natalClaim(calculation, topic);
  if (natal) attempts.push({ layer: "natal", claim: natal });

  for (const attempt of attempts) {
    const derivation = deriveZiweiMeaningBinding(attempt.claim, calculation, attempt.claim.rule_ids);
    if (!derivation.ok) continue;
    const narrative = canonicalZiweiNarrative(derivation.binding, calculation);
    const semantics = canonicalZiweiSemanticBindings(derivation.binding, calculation);
    return deepFreeze({
      schema_version: "ziwei-reading-adjudication-v0.5",
      system: "ziwei",
      status: attempt.layer === "phase" ? "completed" : "qualified",
      topic,
      layer: attempt.layer,
      conclusion: narrative.statement,
      plain_language: narrative.reasoning_summary,
      lenses: {
        route: derivation.binding.route,
        primary_palace: derivation.binding.primary_palace,
        palace_axis_groups: derivation.binding.palace_axis_groups,
        transformation_lenses: derivation.binding.transformation_lenses,
        semantic_bindings: semantics,
        ...(derivation.binding.phase ? { phase: derivation.binding.phase } : {}),
      },
      basis: [...derivation.binding.source_fact_ids],
      change_conditions: [...narrative.alternative_readings],
      reality_checks: [narrative.practical_reflection],
      unresolved: attempt.layer === "phase" ? [] : [
        ...(calculation.facts?.periods ? ["阶段路线未满足全部闭合条件，已回退本命主题"] : ["未提供目标日期，不判断大限流年阶段"]),
      ],
      safeguards: {
        score_used: false,
        named_event_prediction_used: false,
        borrowed_star_used: false,
        predictive_validity: "not_established",
      },
      audit: {
        calculation_replay_status: replayStatus,
        meaning_binding_schema: derivation.binding.schema,
        requested_phase: options.phase || "prefer_phase_when_available",
      },
    });
  }
  return unavailable(calculation, replayStatus, "当前主题缺少完整且机器绑定的主宫、三方、对宫或阶段条件。 ");
}
