import { FortuneTellerError } from "./errors.mjs";
import { verifyCalculationFacts } from "./calculation-verifier.mjs";
import { verifyCalculationEnvelope } from "./result.mjs";
import {
  MEIHUA_INTERPRETATION_META,
  MEIHUA_LINE_STAGES,
  MEIHUA_RELATION_AXES,
  MEIHUA_TRIGRAM_FRAMES,
} from "../data/meihua-interpretation-rulepack.mjs";

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function ensureCalculation(calculation) {
  if (!calculation || calculation.system !== "meihua") {
    throw new FortuneTellerError("MEIHUA_ADJUDICATION_INPUT_INVALID", "Meihua adjudication requires one Meihua calculation envelope");
  }
  const replay = verifyCalculationFacts(calculation);
  const errors = [...verifyCalculationEnvelope(calculation), ...replay.errors];
  if (errors.length) {
    throw new FortuneTellerError(
      "MEIHUA_ADJUDICATION_FACTS_UNVERIFIED",
      "Meihua adjudication refuses calculation facts that do not replay",
      { errors },
    );
  }
  if (!calculation.facts?.structure?.body_use || !calculation.facts?.structure?.mutual) {
    throw new FortuneTellerError("MEIHUA_ADJUDICATION_STRUCTURE_MISSING", "Meihua body/use or mutual-hexagram facts are missing");
  }
  return replay.status;
}

function trigramUnit(record, role) {
  return {
    role,
    half: record.half,
    name: record.trigram.name,
    symbol: record.trigram.symbol,
    image: record.trigram.image,
    element: record.trigram.element,
    process_zh: MEIHUA_TRIGRAM_FRAMES[record.trigram.name].process_zh,
  };
}

function relationUnit(record) {
  const axis = MEIHUA_RELATION_AXES[record.relation];
  if (!axis) throw new FortuneTellerError("MEIHUA_ADJUDICATION_RELATION_UNKNOWN", `unknown body/use relation: ${String(record.relation)}`);
  return {
    relation: record.relation,
    label: axis.label,
    body_element: record.body_element,
    use_element: record.use_element,
    plain_zh: axis.plain_zh,
    action_zh: axis.action_zh,
    seasonal_strength_applied: record.seasonal_strength_applied,
  };
}

/** Result-first adjudication for the bounded two-number Meihua profile. */
export function adjudicateMeihua(calculation) {
  const replayStatus = ensureCalculation(calculation);
  const bodyUse = calculation.facts.structure.body_use;
  const mutual = calculation.facts.structure.mutual;
  const timing = calculation.facts.structure.timing;
  const movingPosition = calculation.facts.moving_line.position_from_bottom;
  const stage = MEIHUA_LINE_STAGES[movingPosition];
  const body = trigramUnit(bodyUse.body, "body_self_or_capacity");
  const use = trigramUnit(bodyUse.use, "use_matter_or_environment");
  const primaryRelation = relationUnit(bodyUse.primary_relation);
  const changedBody = trigramUnit(bodyUse.transformed.body, "body_after_change");
  const changedUse = trigramUnit(bodyUse.transformed.use, "use_after_change");
  const changedRelation = relationUnit(bodyUse.transformed.relation);
  const mutualLower = MEIHUA_TRIGRAM_FRAMES[mutual.lower_trigram.name];
  const mutualUpper = MEIHUA_TRIGRAM_FRAMES[mutual.upper_trigram.name];

  return deepFreeze({
    schema_version: "meihua-adjudication-v0.5",
    system: "meihua",
    status: "qualified",
    ...(calculation.input.question ? { question: calculation.input.question } : {}),
    conclusion: `本轮体卦为${body.name}${body.element}，用卦为${use.name}${use.element}，初始关系是“${primaryRelation.label}”。它说明自身与所问之事的作用方向，不等于自动判成败。`,
    plain_language: `${primaryRelation.plain_zh}动爻在第${movingPosition}爻“${stage.label}”阶段，${stage.plain_zh}变化后体用关系转为“${changedRelation.label}”：${changedRelation.plain_zh}`,
    lenses: {
      body_use: {
        fact_id: bodyUse.fact_id,
        assignment_rule: bodyUse.assignment_rule,
        body,
        use,
        primary_relation: primaryRelation,
      },
      moving_stage: {
        fact_id: calculation.facts.moving_line.fact_id,
        position_from_bottom: movingPosition,
        label: stage.label,
        prompt_zh: stage.plain_zh,
      },
      mutual_process: {
        fact_id: mutual.fact_id,
        king_wen_number: mutual.king_wen_number,
        name: mutual.name,
        lower: {
          name: mutual.lower_trigram.name,
          image: mutual.lower_trigram.image,
          process_zh: mutualLower.process_zh,
        },
        upper: {
          name: mutual.upper_trigram.name,
          image: mutual.upper_trigram.image,
          process_zh: mutualUpper.process_zh,
        },
        plain_zh: `中间过程可拆为内侧“${mutualLower.process_zh}”与外侧“${mutualUpper.process_zh}”；这只是互卦结构提示，不用卦名倒推具体事件。`,
        extraction_rule: mutual.extraction_rule,
        school_variance: mutual.school_variance,
      },
      transformed_body_use: {
        hexagram_fact_id: calculation.facts.transformed.fact_id,
        body: changedBody,
        use: changedUse,
        relation: changedRelation,
      },
      timing_boundary: timing,
    },
    basis: [
      calculation.facts.upper_trigram.fact_id,
      calculation.facts.lower_trigram.fact_id,
      calculation.facts.moving_line.fact_id,
      calculation.facts.primary.fact_id,
      calculation.facts.transformed.fact_id,
      bodyUse.fact_id,
      mutual.fact_id,
    ],
    action_anchor: primaryRelation.action_zh,
    change_conditions: [
      "两个起卦数、动爻或问题任一改变，都必须重新起卦；不能沿用旧结论。",
      "若加入发生时间，必须明确采用哪一种时间起卦与旺衰口径后重算；当前两数卦不能事后补时。",
      "若现实限制与体用提示不一致，以可观察的资源、规则和对方反馈为准。",
    ],
    reality_checks: [
      primaryRelation.action_zh,
      "做一个成本可控、可撤回的小实验，同时记录支持与反对这条判断的事实。",
    ],
    unresolved: [
      "没有发生时间，未判体用旺衰",
      "没有登记应期规则，不给精准日期、事件概率或必然成败",
      "互卦只按本 profile 的固定取法计算，其他流派须另建 profile 比较",
    ],
    rulepack: MEIHUA_INTERPRETATION_META,
    safeguards: {
      score_used: false,
      seasonal_strength_invented: false,
      exact_timing_used: false,
      event_prediction_used: false,
    },
    audit: {
      calculation_replay_status: replayStatus,
      body_use_replayed: true,
      mutual_hexagram_replayed: true,
    },
  });
}

