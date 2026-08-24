import { verifyCalculationFacts } from "./calculation-verifier.mjs";
import { FortuneTellerError } from "./errors.mjs";
import { stableJson } from "./hash.mjs";
import { verifyCalculationEnvelope } from "./result.mjs";
import { calculateTarot } from "../engines/tarot.mjs";
import { findTarotCard } from "../data/tarot.mjs";
import {
  TAROT_INTERPRETATION_META,
  TAROT_MAJOR_AXES,
  TAROT_POSITION_AXES,
  TAROT_RANK_AXES,
  TAROT_SPREAD_AXES,
  TAROT_SUIT_AXES,
} from "../data/tarot-interpretation-rulepack.mjs";

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function replayProfile(calculation) {
  const profile = calculation?.profile;
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) return profile;
  if (typeof profile.id === "string" && profile.id.startsWith("tarot-custom-")) {
    return Object.fromEntries(Object.entries(profile).filter(([key]) => key !== "id"));
  }
  return profile;
}

function projectedCards(cards) {
  return cards?.map(({ kind: _kind, ...card }) => card);
}

function canonicalStructuralReplay(calculation) {
  const replay = calculateTarot({
    question: calculation.input?.question,
    spread: calculation.input?.spread,
    cards: calculation.facts?.cards?.map((card) => ({ card: card.card_id, orientation: card.orientation })),
  }, replayProfile(calculation));
  return {
    expected: {
      cards: projectedCards(replay.facts.cards),
      spread: replay.facts.spread,
      structure: replay.facts.structure,
    },
    actual: {
      cards: projectedCards(calculation.facts?.cards),
      spread: calculation.facts?.spread,
      structure: calculation.facts?.structure,
    },
  };
}

function ensureCalculation(calculation) {
  if (!calculation || calculation.system !== "tarot") {
    throw new FortuneTellerError(
      "TAROT_ADJUDICATION_INPUT_INVALID",
      "Tarot adjudication requires one Tarot calculation envelope",
    );
  }
  const envelopeErrors = verifyCalculationEnvelope(calculation);
  const replay = verifyCalculationFacts(calculation);
  let structuralError = null;
  try {
    const structural = canonicalStructuralReplay(calculation);
    if (stableJson(structural.expected) !== stableJson(structural.actual)) {
      structuralError = "Tarot arcana, suit, rank, spread, or structural facts do not match a current-engine replay";
    }
  } catch (error) {
    structuralError = `Tarot structural facts could not be replayed: ${error?.code || error?.name || "unknown error"}`;
  }
  const errors = [...envelopeErrors, ...replay.errors, ...(structuralError ? [structuralError] : [])];
  if (errors.length) {
    throw new FortuneTellerError(
      "TAROT_ADJUDICATION_FACTS_UNVERIFIED",
      "Tarot adjudication refuses calculation facts that do not replay",
      { errors },
    );
  }
  return replay.status;
}

function minorTheme(card, orientation, exactKeyword) {
  const suit = TAROT_SUIT_AXES[card.suit];
  const rank = TAROT_RANK_AXES[card.rank];
  const process = rank[orientation];
  const auxiliary = orientation === "upright"
    ? `花色与数字只辅助核对：在${suit.domain}上，是否确有“${process}”，以及能否“${suit.verb}”`
    : `花色与数字只辅助核对：在${suit.domain}上，是否确有“${process}”或${suit.excess}`;
  return `这张具体牌的登记主轴是“${exactKeyword}”；${auxiliary}，但辅助结构不能覆盖具体牌义`;
}

function cardUnit(cardFact, positionFact) {
  const sourceCard = findTarotCard(cardFact.card_id);
  const position = TAROT_POSITION_AXES[cardFact.position];
  const isMajor = cardFact.arcana === "major";
  const sourceKeyword = cardFact.orientation === "upright" ? sourceCard?.upright : sourceCard?.reversed;
  const theme = isMajor
    ? TAROT_MAJOR_AXES[cardFact.card_id]?.[cardFact.orientation]
    : minorTheme(cardFact, cardFact.orientation, sourceKeyword);
  if (!sourceCard || !position || !theme) {
    throw new FortuneTellerError(
      "TAROT_ADJUDICATION_RULE_MISSING",
      `no bounded Tarot adjudication axis is registered for ${cardFact.card_id} at ${cardFact.position}`,
    );
  }
  return {
    card_fact_id: cardFact.fact_id,
    position_fact_id: positionFact?.fact_id || null,
    position: cardFact.position,
    position_label: position.label,
    position_function: position.function,
    agency: position.agency,
    role_question: position.question,
    card_id: cardFact.card_id,
    card: cardFact.title_zh,
    orientation: cardFact.orientation,
    orientation_label: cardFact.orientation === "upright" ? "正位" : "逆位",
    arcana: cardFact.arcana,
    number: cardFact.number,
    suit: cardFact.suit,
    suit_label: cardFact.suit_zh,
    rank: cardFact.rank,
    rank_order: cardFact.rank_order,
    court: cardFact.court,
    theme,
    source_keyword: sourceKeyword,
    source_keyword_status: "project_authored_registered_card_axis",
    semantic_priority: isMajor ? "registered_major_axis" : "exact_card_axis_before_suit_and_rank_helpers",
    orientation_boundary: cardFact.orientation === "upright"
      ? "direct expression; not automatically favourable"
      : "blocked, internalized, delayed, or excessive; not automatically unfavourable",
  };
}

function unitsByPosition(units) {
  return new Map(units.map((unit) => [unit.position, unit]));
}

function spreadConclusion(spread, byPosition) {
  if (spread === "one") {
    const focus = byPosition.get("focus");
    return `核心结论：${focus.card}${focus.orientation_label}把焦点放在——${focus.theme}。`;
  }
  if (spread === "three") {
    const past = byPosition.get("past");
    const present = byPosition.get("present");
    const future = byPosition.get("future");
    return `主线是：背景中的“${past.theme}”进入当下的“${present.theme}”；若当前做法不变，后续牌提醒“${future.theme}”。后者是条件性趋势，不是已决定的未来。`;
  }
  if (spread === "situation-action-outcome") {
    const situation = byPosition.get("situation");
    const action = byPosition.get("action");
    const outcome = byPosition.get("outcome");
    return `当前处境的关键是“${situation.theme}”；最可控的落点是“${action.theme}”。只有行动与现实条件相配合，结果牌的“${outcome.theme}”才可作为后续方向。`;
  }
  if (spread === "decision") {
    const optionA = byPosition.get("option-a");
    const optionB = byPosition.get("option-b");
    const criterion = byPosition.get("decision-lens");
    return `这组牌不替你选 A 或 B：A 要求处理“${optionA.theme}”；B 要求处理“${optionB.theme}”；真正的比较尺度是“${criterion.theme}”。`;
  }
  const present = byPosition.get("present");
  const challenge = byPosition.get("challenge");
  const self = byPosition.get("self");
  const outcome = byPosition.get("outcome");
  return `凯尔特十字的核心是“${present.theme}”，主要牵制是“${challenge.theme}”；最值得落地核对的是自身位置的“${self.theme}”。结果牌“${outcome.theme}”只表示沿当前结构发展的条件性收束。`;
}

function structuralPatterns(calculation) {
  const structure = calculation.facts.structure;
  const composition = structure.composition;
  const suitCounts = structure.suit_distribution.counts;
  const repeatedSuits = Object.entries(suitCounts)
    .filter(([, count]) => count >= 2)
    .toSorted((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([suit, count]) => ({
      suit,
      label: TAROT_SUIT_AXES[suit].label,
      count,
      interpretation: `${TAROT_SUIT_AXES[suit].domain}被重复触及；这是结构强调，不是赞成票`,
    }));
  const repeatedRanks = Object.entries(structure.rank_distribution.counts)
    .filter(([, count]) => count >= 2)
    .toSorted((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([rank, count]) => ({
      rank,
      label: TAROT_RANK_AXES[rank].label,
      count,
      interpretation: `“${TAROT_RANK_AXES[rank].label}”这一发展阶段在不同领域重复出现；这是同阶段回声，不是赞成票`,
    }));
  const orientationPattern = composition.reversed_count === 0
    ? { state: "all_upright", interpretation: "牌面都以较直接方式表达，但不等于全部有利" }
    : composition.upright_count === 0
      ? { state: "all_reversed", interpretation: "每个位置都要检查受阻、内化、延迟或过度；不等于全部不利" }
      : { state: "mixed", interpretation: "直接表达与受阻表达并存，需要按牌阵角色逐位处理" };
  const majorPattern = composition.major_arcana_count === 0
    ? { state: "none", interpretation: "本轮主要由具体领域与发展阶段构成" }
    : {
        state: composition.major_arcana_count >= Math.ceil(composition.card_count / 2) ? "structurally_prominent" : "present",
        positions: composition.major_positions,
        interpretation: `${composition.major_arcana_count}张大阿尔克那标出较高层的转折或价值议题；数量不用于预测事件大小`,
      };
  return {
    composition: structuredClone(composition),
    repeated_suits: repeatedSuits,
    repeated_ranks: repeatedRanks,
    orientation_pattern: orientationPattern,
    major_arcana_pattern: majorPattern,
    adjacent_transitions: structure.adjacent_links.map((link) => ({
      fact_id: link.fact_id,
      positions: [link.from_position, link.to_position],
      arcana_relation: link.arcana_relation,
      orientation_relation: link.orientation_relation,
      suit_relation: link.suit_relation,
    })),
    adjudication_boundary: "no count, repetition, or adjacency is converted into a fortune score or vote",
  };
}

function groupedSpread(spreadDefinition, byPosition) {
  return spreadDefinition.groups.map((group) => ({
    id: group.id,
    label: group.label,
    positions: group.positions,
    card_fact_ids: group.positions.map((position) => byPosition.get(position)?.card_fact_id).filter(Boolean),
    themes: group.positions.map((position) => ({
      position,
      theme: byPosition.get(position)?.theme,
    })),
  }));
}

/**
 * Convert one replay-verified Tarot calculation into a bounded, result-first
 * reflection. The function never draws cards and never silently changes the
 * frozen question or spread.
 */
export function adjudicateTarot(calculation) {
  const replayStatus = ensureCalculation(calculation);
  const spread = calculation.input.spread;
  const spreadDefinition = TAROT_SPREAD_AXES[spread];
  if (!spreadDefinition) {
    throw new FortuneTellerError("TAROT_ADJUDICATION_SPREAD_INVALID", `unsupported Tarot spread: ${String(spread)}`);
  }
  const positionByName = new Map(calculation.facts.spread.positions.map((position) => [position.position, position]));
  const units = calculation.facts.cards.map((card) => cardUnit(card, positionByName.get(card.position)));
  const byPosition = unitsByPosition(units);
  const actionUnit = byPosition.get(spreadDefinition.action_position) || units[0];
  const patterns = structuralPatterns(calculation);
  const conclusion = spreadConclusion(spread, byPosition);
  const plainLanguage = `先别把牌当成“会不会发生”的判决。围绕${actionUnit.position_label}牌${actionUnit.card}${actionUnit.orientation_label}，先回答：${actionUnit.role_question} 牌面给出的工作方向是：${actionUnit.theme}。`;
  const factIds = [
    ...units.flatMap((unit) => [unit.card_fact_id, unit.position_fact_id]),
    calculation.facts.spread.fact_id,
    calculation.facts.structure.composition.fact_id,
    calculation.facts.structure.suit_distribution.fact_id,
    calculation.facts.structure.rank_distribution.fact_id,
    ...calculation.facts.structure.adjacent_links.map((link) => link.fact_id),
  ].filter(Boolean);
  const unresolved = replayStatus === "structural_only_origin_unverified"
    ? ["本轮牌面结构可重算，但未公开重放种子，因此不能核验这次本地随机抽牌的起源顺序。"]
    : [];
  return deepFreeze({
    schema_version: "tarot-adjudication-v0.5",
    system: "tarot",
    status: unresolved.length ? "qualified" : "completed",
    conclusion,
    plain_language: plainLanguage,
    action_anchor: {
      position: actionUnit.position,
      position_label: actionUnit.position_label,
      card_fact_id: actionUnit.card_fact_id,
      prompt: actionUnit.role_question,
      next_observation: "写下一项48小时内可以完成或核对的动作，并注明什么事实会支持或反驳当前理解。",
    },
    lenses: {
      spread: {
        spread_id: spread,
        label: spreadDefinition.label,
        provenance: calculation.facts.spread.provenance,
        synthesis: spreadDefinition.synthesis,
        groups: groupedSpread(spreadDefinition, byPosition),
      },
      card_roles: units,
      structural_patterns: patterns,
    },
    basis: [...new Set(factIds)],
    change_conditions: [
      "同一个问题继续追问时保留本轮牌面；不要反复重抽直到出现喜欢的答案。",
      "问题的对象、目标或时间范围改变时，明确结束本轮，再开启一次新抽牌。",
      "现实条件出现实质变化时，先更新现实证据；不能靠重写牌义把旧结论变成永远正确。",
    ],
    reality_checks: [
      actionUnit.role_question,
      "同步记录一个与核心牌义相反的现实事实，检查解读是否只是在套用宽泛描述。",
      spread === "decision"
        ? "分别列出 A、B 的成本、可逆性、最低资源和退出条件；让现实约束作决定，不让牌数作决定。"
        : "到约定复盘日只核对可观察行为和条件变化，不把模糊感受事后改写成命中。",
    ],
    unresolved,
    rulepack: TAROT_INTERPRETATION_META,
    safeguards: {
      score_used: false,
      card_voting_used: false,
      decision_winner_declared: false,
      fixed_event_prediction_used: false,
      reversed_equals_negative: false,
      same_question_redraw_used: false,
    },
    audit: {
      calculation_replay_status: replayStatus,
      structural_replay_status: "matched_current_engine",
      draw_origin_claim: replayStatus === "structural_only_origin_unverified" ? "not_verified" : "recomputed_or_replayed",
    },
  });
}
