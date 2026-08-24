import { FortuneTellerError } from "./errors.mjs";
import { stableJson } from "./hash.mjs";
import { verifyCalculationFacts } from "./calculation-verifier.mjs";
import { verifyCalculationEnvelope } from "./result.mjs";
import {
  buildIChingStructure,
  ICHING_INTERPRETATION_META,
  ICHING_LINE_STAGES,
  ICHING_TRIGRAM_FRAMES,
} from "../data/iching-interpretation-rulepack.mjs";

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function ensureCalculation(calculation) {
  if (!calculation || calculation.system !== "iching") {
    throw new FortuneTellerError("ICHING_ADJUDICATION_INPUT_INVALID", "I Ching adjudication requires one I Ching calculation envelope");
  }
  const replay = verifyCalculationFacts(calculation);
  const envelopeErrors = verifyCalculationEnvelope(calculation);
  const lines = calculation.facts?.lines?.map((line) => line.value);
  let structureError = null;
  try {
    const expected = buildIChingStructure(lines, calculation.facts?.primary, calculation.facts?.transformed);
    if (stableJson(expected) !== stableJson(calculation.facts?.structure)) {
      structureError = "I Ching structural selection facts do not match the six replayed lines";
    }
  } catch {
    structureError = "I Ching structural selection facts could not be reconstructed";
  }
  const errors = [...envelopeErrors, ...replay.errors, ...(structureError ? [structureError] : [])];
  if (errors.length) {
    throw new FortuneTellerError(
      "ICHING_ADJUDICATION_FACTS_UNVERIFIED",
      "I Ching adjudication refuses calculation facts that do not replay",
      { errors },
    );
  }
  return replay.status;
}

function trigramUnit(trigram, role) {
  const frame = ICHING_TRIGRAM_FRAMES[trigram.name];
  return {
    role,
    name: trigram.name,
    symbol: trigram.symbol,
    image: trigram.image,
    element: trigram.element,
    process_zh: frame.process_zh,
    wording_status: "project_authored_process_prompt_not_classic_text",
  };
}

function lineUnit(feature) {
  const stage = ICHING_LINE_STAGES[feature.position_from_bottom];
  return {
    line_fact_id: feature.line_fact_id,
    position_from_bottom: feature.position_from_bottom,
    stage: stage.label,
    stage_prompt_zh: stage.plain_zh,
    polarity: feature.polarity,
    central: feature.central,
    correct_position: feature.correct_position,
    correspondence_position: feature.correspondence_position,
    correspondence: feature.correspondence,
    structural_boundary: "centrality, position, and correspondence are recorded as checks, not converted into automatic good/bad scores",
  };
}

function conclusionFor(calculation, selected) {
  const selector = calculation.facts.structure.reading_selector;
  const primary = calculation.facts.primary;
  const transformed = calculation.facts.transformed;
  if (selector.mode === "primary_whole_only") {
    return `本卦是第${primary.king_wen_number}卦“${primary.name}”，本轮无动爻：结论重点放在当前整体结构，不人为制造变化主线。`;
  }
  if (selector.mode === "single_changing_line") {
    return `本卦“${primary.name}”变“${transformed.name}”，唯一焦点是第${selected[0].position_from_bottom}爻的“${selected[0].stage}”阶段；这描述变化落在哪里，不是预言必然结果。`;
  }
  if (selector.mode === "multiple_changing_lines_parallel_unranked") {
    return `本卦“${primary.name}”变“${transformed.name}”，有${selected.length}个阶段同时变化；本轮并列处理，不在没有流派规则时擅自挑一条当主答案。`;
  }
  if (selector.mode === "all_nine_use_nine_marker") {
    return `乾卦六爻皆九并转为坤：只登记“用九”取用标记；因原文未打包，本轮不补写、不伪引其辞。`;
  }
  if (selector.mode === "all_six_use_six_marker") {
    return `坤卦六爻皆六并转为乾：只登记“用六”取用标记；因原文未打包，本轮不补写、不伪引其辞。`;
  }
  return `本卦“${primary.name}”六爻皆动并变“${transformed.name}”：六个阶段一起过渡，但不借用不适用的“用九/用六”，也不臆定主爻。`;
}

/**
 * Produce a result-first, replay-bound structural reading.  This function does
 * not contain or synthesize the received judgment and 384 line texts.
 */
export function adjudicateIChing(calculation) {
  const replayStatus = ensureCalculation(calculation);
  const structure = calculation.facts.structure;
  const selector = structure.reading_selector;
  const selected = selector.selected_line_positions.map((position) => (
    lineUnit(structure.line_features[position - 1])
  ));
  const primary = calculation.facts.primary;
  const transformed = calculation.facts.transformed;
  const primaryLower = trigramUnit(primary.lower_trigram, "inner_or_near_context");
  const primaryUpper = trigramUnit(primary.upper_trigram, "outer_or_environment_context");
  const transformedLower = trigramUnit(transformed.lower_trigram, "changed_inner_or_near_context");
  const transformedUpper = trigramUnit(transformed.upper_trigram, "changed_outer_or_environment_context");
  const linePrompt = selected.length
    ? selected.map((line) => `第${line.position_from_bottom}爻先核对“${line.stage_prompt_zh.replace(/。$/u, "")}”`).join("；")
    : "没有动爻时，先核对当前安排是否能持续，不把焦虑本身当成变化证据";
  const transitionPrompt = structure.changing_line_count > 0
    ? `变化方向由内侧“${transformedLower.process_zh}”与外侧“${transformedUpper.process_zh}”共同构成。`
    : "本卦与变卦相同，本轮不另造变化后的故事。";

  return deepFreeze({
    schema_version: "iching-adjudication-v0.5",
    system: "iching",
    status: "qualified",
    question: calculation.input.question,
    conclusion: conclusionFor(calculation, selected),
    plain_language: `眼下先把内侧的“${primaryLower.process_zh}”和外侧的“${primaryUpper.process_zh}”分开看。${linePrompt}。${transitionPrompt}`,
    lenses: {
      selection_protocol: selector,
      current_structure: {
        hexagram_fact_id: primary.fact_id,
        king_wen_number: primary.king_wen_number,
        name: primary.name,
        inner: primaryLower,
        outer: primaryUpper,
      },
      selected_change_stages: selected,
      transformed_structure: structure.changing_line_count > 0 ? {
        hexagram_fact_id: transformed.fact_id,
        king_wen_number: transformed.king_wen_number,
        name: transformed.name,
        inner: transformedLower,
        outer: transformedUpper,
      } : { status: "same_as_primary_no_separate_change_claim" },
      classic_text_boundary: structure.classic_text_status,
    },
    basis: unique([
      primary.fact_id,
      ...(structure.changing_line_count > 0 ? [transformed.fact_id] : []),
      ...selected.map((line) => line.line_fact_id),
    ]),
    change_conditions: [
      "问题一旦改变，就应明确开始一次新起卦；旧卦不能直接移植到新问题。",
      "若改用其他多爻取用流派，必须先登记该流派协议并从六爻事实重新裁决，不能事后挑最顺耳的一爻。",
      "若要援引卦辞、爻辞或用九用六，必须接入经过校对且许可清楚的完整文本；当前结构层不能替代原文义理。",
    ],
    reality_checks: [
      "把问题改写成一个本周可观察的选择、约束或行动，不用宽泛结果反向套卦。",
      "记录一个支持当前结构的事实和一个反例；若现实证据相反，以现实证据为准。",
    ],
    unresolved: [
      "卦辞与384爻辞未打包，因此未作经典文本裁释",
      "未登记具体应期规则，因此不提供日期或事件概率",
    ],
    rulepack: ICHING_INTERPRETATION_META,
    safeguards: {
      classic_text_invented: false,
      changing_line_ranking_invented: false,
      score_used: false,
      exact_timing_used: false,
      event_prediction_used: false,
    },
    audit: {
      calculation_replay_status: replayStatus,
      structural_protocol_recomputed: true,
      random_origin_verified: replayStatus !== "structural_only_origin_unverified",
    },
  });
}
