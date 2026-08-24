import {
  BAZI_RELATIONSHIP_FACT_MEANINGS,
  BAZI_TOPIC_RULEPACK_META,
  getBaziTopicRule,
} from "../data/bazi-topic-rulepack.mjs";
import { verifyCalculationFacts } from "./calculation-verifier.mjs";
import { FortuneTellerError } from "./errors.mjs";

const VISIBLE_PILLARS = new Set(["year", "month", "time"]);
const BRANCH_RELATIONS = new Set(Object.keys(BAZI_RELATIONSHIP_FACT_MEANINGS));
const AXIS_RESULT_LANGUAGE = Object.freeze({
  career_responsibility: "承担职责、适应规则和处理压力任务",
  career_learning_support: "通过学习、训练和方法积累能力",
  career_output: "把想法做成作品、方案或可交付成果",
  wealth_resource: "取得和管理稳定资源",
  wealth_output: "把成果变成收入来源或其他实际回报",
  wealth_shared_boundary: "把合作中的归属、分成和责任说清楚",
  relationship_spouse_star_context: "伴侣相关的传统补充线索",
});
const TOPIC_RESULT_LANGUAGE = Object.freeze({
  career_study: {
    lead: "事业上",
    limit: "这说明事业上该把力气放在哪里，不等于一定会录取、升职或转行，也不能直接指定职业。",
    phase_limit: "这只是阶段重心，不等于一定会升职、录取或换工作。",
  },
  wealth_resources: {
    lead: "财富上",
    limit: "这说明赚钱和管钱时最要留意的环节，不等于收入一定增加、投资一定获利，也不能据此断中奖或破财。",
    phase_limit: "这只是阶段重心，不等于收入一定增加、投资一定获利或一定破财。",
  },
  relationships: {
    lead: "长期关系上",
    limit: "这说明相处中更要留意什么，不等于一定会结婚、分开或出现其他具体结果。",
    phase_limit: "这只是阶段重心，不等于一定会结婚、分开或出现其他具体事件。",
  },
});
const RELATIONSHIP_RESULT_LANGUAGE = Object.freeze({
  branch_repetition: "同一种相处模式反复出现",
  branch_self_punishment: "相处中容易自我牵制、反复打转",
  branch_six_harmony: "连接、协商和靠近",
  branch_clash: "节奏、位置或安排上的直接拉扯",
  branch_harm: "不容易明说的不顺手和互相牵制",
  branch_break: "原有安排松动或配合不稳",
  branch_punishment: "规则、边界或反复摩擦",
  branch_full_three_punishment: "规则、边界或反复摩擦",
});

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

function joinZh(values) {
  const items = unique(values);
  if (items.length < 2) return items[0] || "";
  if (items.length === 2) return `${items[0]}，同时${items[1]}`;
  return `${items.slice(0, -1).join("、")}，以及${items.at(-1)}`;
}

function axisResultText(axis) {
  return AXIS_RESULT_LANGUAGE[axis.axis_id] || axis.label_zh;
}

function relationshipResultText(relation) {
  return RELATIONSHIP_RESULT_LANGUAGE[relation.relationship] || "需要在现实中核对的互动变化";
}

function phaseLayerLabel(layer, fact) {
  if (layer === "yearly" && /^\d{4}-/.test(fact?.date || "")) return `${fact.date.slice(0, 4)}年`;
  return layer === "decadal" ? "当前较长阶段" : "目标年份";
}

function ensureReplayVerifiedKnownTimeBazi(calculation) {
  if (!calculation || calculation.system !== "bazi") {
    throw new FortuneTellerError("BAZI_TOPIC_INPUT_INVALID", "BaZi topic adjudication requires one BaZi calculation envelope");
  }
  const replay = verifyCalculationFacts(calculation);
  if (replay.errors.length) {
    throw new FortuneTellerError(
      "BAZI_TOPIC_FACTS_UNVERIFIED",
      "BaZi topic adjudication refuses calculation facts that do not replay",
      { errors: replay.errors },
    );
  }
  return calculation.facts?.mode === "known-time";
}

function locatedTenGodFacts(calculation) {
  const pillars = calculation.facts?.pillars || [];
  return pillars.flatMap((pillar) => {
    const facts = [];
    if (VISIBLE_PILLARS.has(pillar.pillar) && pillar.ten_god_stem) {
      facts.push({
        fact_id: pillar.fact_id,
        ten_god: pillar.ten_god_stem,
        layer: "visible_stem",
        pillar: pillar.pillar,
        location_zh: `${{ year: "年干", month: "月干", time: "时干" }[pillar.pillar]}`,
        salience: "foreground",
      });
    }
    for (const [index, tenGod] of (pillar.ten_gods_hidden_stems || []).entries()) {
      facts.push({
        fact_id: pillar.fact_id,
        ten_god: tenGod,
        layer: "hidden_stem",
        pillar: pillar.pillar,
        hidden_position: ["main", "middle", "residual"][index] || `position-${index + 1}`,
        location_zh: `${{ year: "年支", month: "月支", day: "日支", time: "时支" }[pillar.pillar]}${["本气", "中气", "余气"][index] || "藏干"}`,
        salience: "background_candidate",
      });
    }
    return facts;
  });
}

function buildAxis(axisRule, facts) {
  const matches = facts.filter((fact) => axisRule.ten_gods.includes(fact.ten_god));
  const visible = matches.filter((fact) => fact.layer === "visible_stem");
  const hidden = matches.filter((fact) => fact.layer === "hidden_stem");
  const status = visible.length ? "foreground" : hidden.length ? "background_candidate" : "not_observed";
  return {
    axis_id: axisRule.axis_id,
    label_zh: axisRule.label_zh,
    status,
    explanation_zh: axisRule.plain_zh,
    evidence: matches,
    plain_zh: visible.length
      ? `${axisRule.label_zh}在${visible.map((item) => `${item.location_zh}${item.ten_god}`).join("、")}直接透出。`
      : hidden.length
      ? `${axisRule.label_zh}只在${hidden.map((item) => `${item.location_zh}${item.ten_god}`).join("、")}作为背景候选，不能按透干强度来写。`
      : `盘内已登记位置未见${axisRule.label_zh}对应十神；这不等于现实中没有这个领域。`,
  };
}

function routeStatus(route, axesById) {
  const members = route.requires_axis.map((axisId) => axesById.get(axisId));
  if (members.some((axis) => !axis || axis.status === "not_observed")) return "not_co_present";
  if (members.every((axis) => axis.status === "foreground")) return "foreground_co_presence";
  return "background_co_presence_candidate";
}

function activePhase(calculation, natalAxes, topic = null) {
  const target = calculation.facts?.luck_cycles?.target;
  if (!target) return { status: "unavailable", plain_zh: "未指定目标日期，本次只说明本命主题。", layers: [] };
  const axisByGod = new Map();
  for (const axis of natalAxes) {
    for (const god of axis.ten_gods) {
      if (!axisByGod.has(god)) axisByGod.set(god, []);
      axisByGod.get(god).push(axis);
    }
  }
  const relevantGods = new Set(axisByGod.keys());
  const decadal = (calculation.facts?.luck_cycles?.decadal || [])
    .find((item) => item.fact_id === target.active_decadal_fact_id) || null;
  const yearly = target.yearly || null;
  const layers = [
    decadal ? { layer: "decadal", label_zh: "大运环境", fact: decadal } : null,
    yearly ? { layer: "yearly", label_zh: "流年触发", fact: yearly } : null,
  ].filter(Boolean).map(({ layer, label_zh, fact }) => {
    const visibleMatch = relevantGods.has(fact.ten_god_stem) ? [fact.ten_god_stem] : [];
    const hiddenMatches = unique((fact.ten_gods_hidden_stems || []).filter((god) => relevantGods.has(god)));
    const matchedGods = unique([...visibleMatch, ...hiddenMatches]);
    const matchedAxes = unique(matchedGods.flatMap((god) => axisByGod.get(god) || []).map((axis) => axis.axis_id));
    const emphasizedGods = matchedGods.filter((god) =>
      (axisByGod.get(god) || []).some((axis) => axis.natal_status !== "not_observed"));
    const phaseOnlyGods = matchedGods.filter((god) =>
      (axisByGod.get(god) || []).every((axis) => axis.natal_status === "not_observed"));
    const emphasizedAxisIds = unique(emphasizedGods.flatMap((god) => axisByGod.get(god) || []).map((axis) => axis.axis_id));
    const phaseOnlyAxisIds = unique(phaseOnlyGods.flatMap((god) => axisByGod.get(god) || []).map((axis) => axis.axis_id));
    const status = matchedGods.length === 0
      ? "no_direct_topic_ten_god"
      : emphasizedGods.length === 0
      ? "phase_topic_present_but_natal_axis_absent"
      : phaseOnlyGods.length
      ? "mixed_natal_emphasis_and_phase_only"
      : visibleMatch.length
      ? "foreground_natal_axis_emphasis"
      : "background_natal_axis_emphasis_candidate";
    return {
      layer,
      label_zh,
      fact_id: fact.fact_id,
      date: fact.date || null,
      stem_branch: fact.stem_branch,
      visible_ten_god: fact.ten_god_stem,
      matched_visible: visibleMatch,
      matched_hidden: hiddenMatches,
      matched_axis_ids: matchedAxes,
      emphasized_gods: emphasizedGods,
      emphasized_axis_ids: emphasizedAxisIds,
      phase_only_gods: phaseOnlyGods,
      phase_only_axis_ids: phaseOnlyAxisIds,
      status,
    };
  });
  const emphasized = layers.filter((item) => item.emphasized_gods.length);
  const phaseOnly = layers.filter((item) => item.phase_only_gods.length);
  const axesById = new Map(natalAxes.map((axis) => [axis.axis_id, axis]));
  const layerClauses = layers.flatMap((item) => [
    item.emphasized_axis_ids.length
      ? `${phaseLayerLabel(item.layer, item)}的重点是${joinZh(item.emphasized_axis_ids.map((axisId) => axisResultText(axesById.get(axisId) || { axis_id: axisId, label_zh: axisId })))}`
      : null,
    item.phase_only_axis_ids.length
      ? `${phaseLayerLabel(item.layer, item)}还带来${joinZh(item.phase_only_axis_ids.map((axisId) => axisResultText(axesById.get(axisId) || { axis_id: axisId, label_zh: axisId })))}，但出生盘里的同类线索不够，暂不把它算作稳定主线`
      : null,
  ]).filter(Boolean);
  const phaseLimit = TOPIC_RESULT_LANGUAGE[topic]?.phase_limit || "这不代表任何具体事件已经发生。";
  const inspectedLabels = unique(layers.map((item) => phaseLayerLabel(item.layer, item)));
  return {
    status: emphasized.length
      ? "natal_topic_axis_emphasized"
      : phaseOnly.length
      ? "phase_topic_present_but_natal_axis_absent"
      : "no_direct_topic_emphasis",
    plain_zh: emphasized.length
      ? `${layerClauses.join("；")}。${phaseLimit}`
      : phaseOnly.length
      ? `${layerClauses.join("；")}。${phaseLimit}`
      : `${inspectedLabels.join("和") || "当前阶段"}没有让这条主线变得更突出。${phaseLimit}`,
    layers,
    inspected_fact_ids: unique([
      target.fact_id,
      ...layers.map((item) => item.fact_id),
    ]),
  };
}

function relationshipPhase(calculation, day, spouseGods, spouseFacts) {
  const target = calculation.facts?.luck_cycles?.target;
  if (!target) {
    return {
      status: "unavailable",
      plain_zh: "未指定目标日期，本轮只读原局日支与关系结构。",
      layers: [],
      branch_context: [],
      spouse_star_phase: { status: "unavailable", layers: [] },
      inspected_fact_ids: [],
    };
  }
  const decadal = (calculation.facts?.luck_cycles?.decadal || [])
    .find((item) => item.fact_id === target.active_decadal_fact_id) || null;
  const layerInputs = [
    decadal ? {
      layer: "decadal",
      label_zh: "大运环境",
      fact: decadal,
      interactions: target.decadal_interactions || [],
    } : null,
    target.yearly ? {
      layer: "yearly",
      label_zh: "流年触发",
      fact: target.yearly,
      interactions: target.interactions || [],
    } : null,
  ].filter(Boolean);
  const layers = layerInputs.map(({ layer, label_zh, fact, interactions }) => {
    const matched = interactions
      .filter((item) => BRANCH_RELATIONS.has(item.relationship))
      .filter((item) => item.layer_fact_ids?.includes(day?.fact_id) && item.layer_fact_ids?.includes(fact.fact_id))
      .map((item) => {
        const qualification = item.configuration_status || "registered_two_branch_relation";
        const base = BAZI_RELATIONSHIP_FACT_MEANINGS[item.relationship];
        return {
          fact_id: item.fact_id,
          relationship: item.relationship,
          values: item.values,
          qualification,
          label_zh: qualification === "pair_component_of_three_branch_punishment" ? "三刑组成支候选" : base.label_zh,
          plain_zh: qualification === "pair_component_of_three_branch_punishment"
            ? "只有组成支，严格口径不按完整三刑处理。"
            : base.plain_zh,
        };
      });
    return {
      layer,
      label_zh,
      fact_id: fact.fact_id,
      date: fact.date || null,
      stem_branch: fact.stem_branch,
      status: matched.length ? "day_branch_relation_observed" : "no_direct_day_branch_relation",
      relationships: matched,
    };
  });
  const branchContext = layers.flatMap((item) => item.relationships.map((relation) => ({
    ...relation,
    layer: item.layer,
    layer_label_zh: item.label_zh,
    layer_fact_id: item.fact_id,
    stem_branch: item.stem_branch,
    date: item.date,
  })));
  const spouseStarPhase = activePhase(calculation, spouseGods.length ? [{
    axis_id: "relationship_spouse_star_context",
    label_zh: "传统配偶星补充",
    ten_gods: spouseGods,
    natal_status: spouseFacts.length ? "observed" : "not_observed",
  }] : [], "relationships");
  const branchText = branchContext.length
    ? branchContext.map((item) => `${phaseLayerLabel(item.layer, item)}要留意的是${relationshipResultText(item)}`).join("；")
    : `${unique(layers.map((item) => phaseLayerLabel(item.layer, item))).join("和") || "当前阶段"}没有进一步加强这条关系主线`;
  const spouseText = spouseGods.length && spouseStarPhase.status !== "no_direct_topic_emphasis"
    ? ` 伴侣相关的传统补充线索是：${spouseStarPhase.plain_zh}`
    : "";
  return {
    status: branchContext.length ? "relationship_branch_context_emphasized" : "no_direct_day_branch_relation",
    plain_zh: branchContext.length
      ? `${branchText}。这只说明当前更该留意哪类互动，不代表关系结果一定好或坏。${spouseText}`
      : `${branchText}。盘面没有给出额外的关系重点，不代表现实里不会有关系变化。${spouseText}`,
    layers,
    branch_context: branchContext,
    spouse_star_phase: spouseStarPhase,
    inspected_fact_ids: unique([
      target.fact_id,
      ...layers.map((item) => item.fact_id),
      ...layers.flatMap((item) => item.relationships.map((relation) => relation.fact_id)),
      ...(spouseStarPhase.inspected_fact_ids || []),
    ]),
  };
}

function generalTopic(calculation, topic, rule) {
  const inspectedFactIds = unique((calculation.facts?.pillars || []).map((pillar) => pillar.fact_id));
  const facts = locatedTenGodFacts(calculation);
  const axes = rule.axes.map((axis) => buildAxis(axis, facts));
  const axesById = new Map(axes.map((axis) => [axis.axis_id, axis]));
  const routes = rule.routes.map((route) => ({
    route_id: route.route_id,
    label_zh: route.label_zh,
    status: routeStatus(route, axesById),
    plain_zh: route.plain_zh,
    axis_ids: route.requires_axis,
  }));
  const foreground = axes.filter((axis) => axis.status === "foreground");
  const background = axes.filter((axis) => axis.status === "background_candidate");
  const foregroundPairs = routes.filter((route) => route.status === "foreground_co_presence");
  const candidatePairs = routes.filter((route) => route.status === "background_co_presence_candidate");
  const language = TOPIC_RESULT_LANGUAGE[topic];
  const headline = foreground.length
    ? `${language.lead}最明确的主线是：${joinZh(foreground.map(axisResultText))}。`
    : background.length
    ? `${language.lead}没有一条足够明确的主线；现有线索更适合作为补充。`
    : `这张盘目前不足以给出${rule.label_zh}的明确判断。`;
  const coPresence = [...foregroundPairs, ...candidatePairs];
  const weakerText = background.length
    ? `盘里也有${background.length === 1 ? "一条" : "几条"}辅助线索：${joinZh(background.map(axisResultText))}。${background.length === 1 ? "它" : "它们"}没有主线那么直接，先不当成主要判断。`
    : "";
  const coPresenceText = coPresence.length
    ? "这些内容虽然同时出现，但现实中能不能互相带动，还要看它们是否真的接得起来。"
    : "";
  return {
    topic,
    topic_label_zh: rule.label_zh,
    status: "completed_with_boundaries",
    conclusion: headline,
    plain_language: `${weakerText}${coPresenceText}${language.limit}`,
    axes,
    routes,
    inspected_fact_ids: inspectedFactIds,
    phase_activation: activePhase(calculation, rule.axes.map((axis) => ({
      axis_id: axis.axis_id,
      label_zh: axis.label_zh,
      ten_gods: axis.ten_gods,
      natal_status: axesById.get(axis.axis_id)?.status || "not_observed",
    })), topic),
    boundary: rule.boundary_zh,
    reality_checks: topic === "career_study"
      ? ["对照最近两个真实任务周期：职责、学习支持和成果输出，究竟哪一环先卡住、哪一环能稳定改善。"]
      : ["把收入来源、成果转化、共同资源和责任边界分开记录，避免用一次得失证明整张盘。"],
  };
}

function relationshipTopic(calculation, rule) {
  const pillars = calculation.facts?.pillars || [];
  const day = pillars.find((pillar) => pillar.pillar === "day");
  const inspectedFactIds = unique(pillars.map((pillar) => pillar.fact_id));
  const grouped = new Map();
  for (const relation of (calculation.facts?.structure?.relationships || [])) {
    if (!BRANCH_RELATIONS.has(relation.relationship) || !relation.pillars?.includes("day")) continue;
    const qualification = relation.configuration_status || "registered_two_branch_relation";
    const key = `${relation.relationship}|${qualification}|${[...(relation.values || [])].sort().join("|")}`;
    if (!grouped.has(key)) {
      const base = BAZI_RELATIONSHIP_FACT_MEANINGS[relation.relationship];
      grouped.set(key, {
        fact_id: relation.fact_id,
        fact_ids: [],
        relationship: relation.relationship,
        values: relation.values,
        other_pillars: [],
        occurrences: [],
        qualification,
        school_variance: relation.school_variance || null,
        ...base,
        ...(qualification === "pair_component_of_three_branch_punishment" ? {
          label_zh: "三刑组成支候选",
          plain_zh: "这里只出现三刑组合中的两支；部分流派会参考，严格口径要求三支齐全，因此不能直接写成相刑成立。",
        } : {}),
      });
    }
    const item = grouped.get(key);
    item.fact_ids.push(relation.fact_id);
    const others = (relation.pillars || []).filter((pillar) => pillar !== "day");
    item.other_pillars.push(...others);
    item.occurrences.push({ fact_id: relation.fact_id, pillars: relation.pillars, values: relation.values });
  }
  const interactions = [...grouped.values()].map((item) => ({
    ...item,
    fact_ids: unique(item.fact_ids),
    other_pillars: unique(item.other_pillars),
  }));
  const chartSex = calculation.input?.chart_sex || null;
  const spouseGods = chartSex === "male" ? ["正财", "偏财"] : chartSex === "female" ? ["正官", "七杀"] : [];
  const spouseFacts = spouseGods.length
    ? locatedTenGodFacts(calculation).filter((fact) => spouseGods.includes(fact.ten_god))
    : [];
  const dayHidden = (day?.hidden_stems || []).map((stem, index) => ({
    stem,
    ten_god: day.ten_gods_hidden_stems?.[index] || null,
    hidden_position: ["main", "middle", "residual"][index] || `position-${index + 1}`,
  }));
  const relationText = interactions.length
    ? `这些线索来自出生盘中与长期关系有关的位置：${joinZh(interactions.map(relationshipResultText))}。它们只描述可能反复出现的互动课题，不决定关系结果。`
    : "本轮没有出现足以单独判断关系顺逆的固定互动结构；这不代表关系一定简单或稳定。";
  const spouseText = chartSex
    ? spouseFacts.length
      ? `按你明确提供的传统${chartSex === "male" ? "男命" : "女命"}口径，盘里还有伴侣相关的补充线索，但它不足以描述现实伴侣，也不能预测婚姻结果。`
      : `按你明确提供的传统${chartSex === "male" ? "男命" : "女命"}口径，本轮没有看到对应的补充线索；这不能解读成“无缘”或其他婚姻结果。`
    : "没有启用按男命或女命区分的传统补充规则，因为你没有明确提供这项参数；本轮不会猜。";
  return {
    topic: "relationships",
    topic_label_zh: rule.label_zh,
    status: "completed_with_boundaries",
    conclusion: interactions.length
      ? `长期关系中较值得留意的是：${joinZh(interactions.map(relationshipResultText))}。`
      : "长期关系这部分，盘里没有强到足以判断明显顺利或明显困难的信号。",
    plain_language: `${relationText}${spouseText}`,
    day_branch: {
      fact_id: day?.fact_id || null,
      earthly_branch: day?.earthly_branch || null,
      hidden_stems: dayHidden,
      role: "primary_relationship_context_not_outcome",
    },
    branch_interactions: interactions,
    inspected_fact_ids: inspectedFactIds,
    spouse_star_context: {
      status: chartSex ? "enabled_from_explicit_parameter" : "disabled_without_explicit_parameter",
      chart_sex_parameter: chartSex,
      ten_gods: spouseGods,
      evidence: spouseFacts,
      interpretation_limit: "traditional supplementary context only; not partner description or marriage prediction",
      school_variance: rule.spouse_star_school_variance_zh,
    },
    phase_activation: relationshipPhase(calculation, day, spouseGods, spouseFacts),
    boundary: rule.boundary_zh,
    reality_checks: ["分别记录互惠、冲突修复、边界协商和长期承诺的现实表现；不拿一次巧合验证婚姻结论。"],
  };
}

export function adjudicateBaziTopic(calculation, topic) {
  const knownTime = ensureReplayVerifiedKnownTimeBazi(calculation);
  if (!knownTime) {
    return deepFreeze({
      schema_version: "bazi-topic-adjudication-v0.6",
      system: "bazi",
      topic,
      status: "unavailable",
      conclusion: "出生时辰未知，当前不能建立唯一的八字主题判断。",
      plain_language: "本轮不会从候选时柱中挑一张，也不会用“日支未明”继续生成关系结论。",
      inspected_fact_ids: unique((calculation.facts?.pillars || []).map((pillar) => pillar.fact_id)),
      rulepack: BAZI_TOPIC_RULEPACK_META,
      safeguards: {
        score_used: false,
        element_count_used: false,
        named_event_prediction_used: false,
        phase_created_event: false,
      },
    });
  }
  const rule = getBaziTopicRule(topic);
  if (!rule) return null;
  const result = topic === "relationships"
    ? relationshipTopic(calculation, rule)
    : generalTopic(calculation, topic, rule);
  return deepFreeze({
    schema_version: "bazi-topic-adjudication-v0.6",
    system: "bazi",
    ...result,
    rulepack: BAZI_TOPIC_RULEPACK_META,
    safeguards: {
      score_used: false,
      element_count_used: false,
      named_event_prediction_used: false,
      phase_created_event: false,
    },
  });
}
