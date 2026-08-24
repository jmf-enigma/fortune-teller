import {
  BAZI_RELATIONSHIP_FACT_MEANINGS,
  BAZI_TOPIC_RULEPACK_META,
  getBaziTopicRule,
} from "../data/bazi-topic-rulepack.mjs";
import { verifyCalculationFacts } from "./calculation-verifier.mjs";
import { FortuneTellerError } from "./errors.mjs";

const VISIBLE_PILLARS = new Set(["year", "month", "time"]);
const BRANCH_RELATIONS = new Set(Object.keys(BAZI_RELATIONSHIP_FACT_MEANINGS));

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

function activePhase(calculation, natalAxes) {
  const target = calculation.facts?.luck_cycles?.target;
  if (!target) return { status: "unavailable", plain_zh: "未指定目标日期，本轮只读原局主题。", layers: [] };
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
  const layerClauses = layers.flatMap((item) => [
    item.emphasized_gods.length ? `${item.label_zh}${item.stem_branch}再次带入原局已有的${item.emphasized_gods.join("、")}` : null,
    item.phase_only_gods.length ? `${item.label_zh}${item.stem_branch}另见${item.phase_only_gods.join("、")}，但原局未见对应轴` : null,
  ]).filter(Boolean);
  return {
    status: emphasized.length
      ? "natal_topic_axis_emphasized"
      : phaseOnly.length
      ? "phase_topic_present_but_natal_axis_absent"
      : "no_direct_topic_emphasis",
    plain_zh: emphasized.length
      ? `${layerClauses.join("；")}。这里只表示原局已有主题在本阶段更显眼；岁运单独新增者不倒写回原局，也不据此命名事件。`
      : phaseOnly.length
      ? `${phaseOnly.map((item) => `${item.label_zh}${item.stem_branch}单独带入${item.phase_only_gods.join("、")}`).join("；")}，但原局已登记位置未见对应主题轴，因此不称原局主题被激活，也不据此命名事件。`
      : "当前岁运干支未直接带入本主题登记十神；这不等于现实中该领域没有事情发生。",
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
  })));
  const spouseStarPhase = activePhase(calculation, spouseGods.length ? [{
    axis_id: "relationship_spouse_star_context",
    ten_gods: spouseGods,
    natal_status: spouseFacts.length ? "observed" : "not_observed",
  }] : []);
  const branchText = branchContext.length
    ? branchContext.map((item) => `${item.layer_label_zh}${item.stem_branch}与日支出现${item.label_zh}`).join("；")
    : "当前大运和流年未见与日支直接相连的已登记合、冲、刑、害、破或重复关系";
  const spouseText = spouseGods.length && spouseStarPhase.status !== "no_direct_topic_emphasis"
    ? ` 配偶星分支另作补充：${spouseStarPhase.plain_zh}`
    : "";
  return {
    status: branchContext.length ? "relationship_branch_context_emphasized" : "no_direct_day_branch_relation",
    plain_zh: `${branchText}。这只提示当前互动方式需要观察，不直接预测关系结果。${spouseText}`,
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
  const headline = foreground.length
    ? `${rule.label_zh}先看${foreground.map((axis) => axis.label_zh).join("、")}；其余只保留为待核对线索。`
    : background.length
    ? `${rule.label_zh}目前只有背景层候选，未形成可直接落地的主判断。`
    : `${rule.label_zh}在已登记位置没有可直接落地的主题轴，本轮不硬凑结论。`;
  const coPresence = [...foregroundPairs, ...candidatePairs];
  return {
    topic,
    topic_label_zh: rule.label_zh,
    status: "completed_with_boundaries",
    conclusion: headline,
    plain_language: `${headline}${foreground.length ? ` 前台证据是${foreground.map((axis) => axis.plain_zh).join("")}` : ""}${background.length ? ` 背景层另见${background.map((axis) => axis.label_zh).join("、")}，但不按透干处理。` : ""}${coPresence.length ? ` ${coPresence.map((route) => route.label_zh).join("、")}只是两轴同见，尚未核验生克、位置、旺衰和效力，不能称为闭合链。` : ""}`,
    axes,
    routes,
    inspected_fact_ids: inspectedFactIds,
    phase_activation: activePhase(calculation, rule.axes.map((axis) => ({
      axis_id: axis.axis_id,
      ten_gods: axis.ten_gods,
      natal_status: axesById.get(axis.axis_id)?.status || "not_observed",
    }))),
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
    ? interactions.map((item) => `${item.label_zh}（连接${item.other_pillars.map((pillar) => ({ year: "年支", month: "月支", time: "时支" }[pillar] || pillar)).join("、")}）：${item.plain_zh}`).join("；")
    : "日支与其余三支未见本规则表登记的合、冲、刑、害、破或重复；这只表示没有这些特定结构，不代表关系简单或必然稳定。";
  const spouseText = chartSex
    ? spouseFacts.length
      ? `按明确提供的传统${chartSex === "male" ? "男命财星" : "女命官杀"}口径，${spouseFacts.map((item) => `${item.location_zh}${item.ten_god}`).join("、")}可作补充背景；不能用来描述现实伴侣或预测婚姻。`
      : `按明确提供的传统${chartSex === "male" ? "男命财星" : "女命官杀"}口径，已登记位置未见对应十神；不能据此断“无缘”或婚姻结果。`
    : "未提供传统顺逆所用的二元参数，因此不启用配偶星分支，也不从姓名或经历猜测。";
  return {
    topic: "relationships",
    topic_label_zh: rule.label_zh,
    status: "completed_with_boundaries",
    conclusion: interactions.length
      ? `长期关系先看日支${day?.earthly_branch || "未明"}，本盘与它直接相连的结构是${interactions.map((item) => item.label_zh).join("、")}。`
      : `长期关系先看日支${day?.earthly_branch || "未明"}；本轮没有把“未见特定支关系”硬写成吉凶。`,
    plain_language: `${relationText} ${spouseText}`,
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
