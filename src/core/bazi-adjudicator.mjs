import { verifyCalculationFacts } from "./calculation-verifier.mjs";
import { FortuneTellerError } from "./errors.mjs";
import { adjudicateBaziTopic } from "./bazi-topic-adjudicator.mjs";
import {
  BAZI_ADJUDICATION_RULEPACK_META,
  BAZI_ADJUDICATION_RULES,
  BAZI_ADJUDICATION_STATES,
  BAZI_DIRECTION_ONTOLOGY,
  BAZI_MONTH_COMMAND_PATTERN_RULES,
  BAZI_VIEW_DEFINITIONS,
} from "../data/bazi-adjudication-rulepack.mjs";
import {
  BAZI_CLIMATE_RULEPACK_META,
  getBaziClimateRule,
} from "../data/bazi-climate-rulepack.mjs";

const SUPPORT_GODS = new Set(["比肩", "劫财", "正印", "偏印"]);
const PRESSURE_GODS = new Set(["食神", "伤官", "正财", "偏财", "正官", "七杀"]);
const STEMS = new Set(["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]);
const BRANCHES = new Set(["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]);
const TEN_GODS = new Set([...SUPPORT_GODS, ...PRESSURE_GODS]);
const SUPPORTED_TOPICS = new Set(["overview", "career_study", "wealth_resources", "relationships"]);
const PILLAR_ZH = Object.freeze({ year: "年", month: "月", day: "日", time: "时", decadal: "大运", yearly: "流年" });
const ROOT_POSITION_ZH = Object.freeze({ main: "本气", middle: "中气", residual: "余气" });
const TEN_GOD_THEME = Object.freeze({
  比肩: "自主推进、同辈协作与资源分配",
  劫财: "竞争、合作边界与共同资源",
  食神: "稳定输出、表达与成果养成",
  伤官: "独立表达、改进旧方法和处理规则摩擦",
  正财: "稳定资源、交换责任与日常配置",
  偏财: "外部机会、流动资源与多方协调",
  正官: "明确职责、规范与持续承担",
  七杀: "高压任务、快速决断与约束管理",
  正印: "学习支持、方法积累与恢复条件",
  偏印: "专门领域的学习、方法打磨和独立准备",
});
const INTERACTION_LABELS = Object.freeze({
  stem_repetition: "天干重复",
  stem_five_combination: "天干五合",
  stem_clash: "天干相冲",
  stem_control: "天干相克",
  branch_repetition: "地支重复",
  branch_self_punishment: "地支自刑",
  branch_six_harmony: "地支六合",
  branch_clash: "地支相冲",
  branch_harm: "地支相害",
  branch_break: "地支相破",
  branch_punishment: "地支相刑",
  branch_full_three_punishment: "地支三刑齐全",
  layer_natal_pillar_repetition: "运年与原局伏吟",
  decadal_yearly_repetition: "岁运并临",
  heavenly_control_earthly_clash: "天克地冲",
  active_layer_completes_three_harmony: "运年补成三合",
  active_layer_completes_three_meeting: "运年补成三会",
  active_layer_completes_three_punishment: "运年补成三刑",
  branch_full_three_harmony: "地支三合齐全",
  branch_full_three_meeting: "地支三会齐全",
});
const TEN_GOD_GROUPS = Object.freeze(Object.fromEntries(
  Object.entries(BAZI_DIRECTION_ONTOLOGY)
    .filter(([, entry]) => entry.kind === "ten_god_group")
    .map(([label, entry]) => [label, new Set(entry.members)]),
));
const STEM_ELEMENTS = Object.freeze({
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
});
const CONTROL_MEDIATORS = Object.freeze({
  "木-土": "火",
  "土-水": "金",
  "水-火": "木",
  "火-金": "土",
  "金-木": "水",
});
const MONTH_PATTERN_DAMAGE_RELATIONS = new Set([
  "branch_clash", "branch_punishment", "branch_full_three_punishment", "branch_harm", "branch_break",
]);
const ROOT_USABILITY_CAUTION_RELATIONS = new Set([
  "branch_clash", "branch_punishment", "branch_full_three_punishment", "branch_harm", "branch_break",
  "active_layer_completes_three_punishment",
]);
const JOINT_ACTIVATION_RELATIONS = new Set([
  "stem_five_combination", "stem_clash",
  "branch_repetition", "branch_self_punishment", "branch_six_harmony", "branch_clash",
  "branch_harm", "branch_break", "branch_punishment",
  "layer_natal_pillar_repetition", "decadal_yearly_repetition", "heavenly_control_earthly_clash",
  "active_layer_completes_three_harmony", "active_layer_completes_three_meeting",
  "active_layer_completes_three_punishment",
]);

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

function factEvidence(factId, statement, role = "support") {
  return { fact_id: factId, role, statement };
}

function ensureReplayVerifiedBazi(calculation) {
  if (!calculation || calculation.system !== "bazi") {
    throw new FortuneTellerError("BAZI_ADJUDICATION_INPUT_INVALID", "BaZi adjudication requires one BaZi calculation envelope");
  }
  const replay = verifyCalculationFacts(calculation);
  if (replay.errors.length) {
    throw new FortuneTellerError(
      "BAZI_ADJUDICATION_FACTS_UNVERIFIED",
      "BaZi adjudication refuses calculation facts that do not replay",
      { errors: replay.errors },
    );
  }
  return replay.status;
}

function unavailableResult(calculation, replayStatus, reason, options = {}) {
  return deepFreeze({
    schema_version: "bazi-adjudication-v0.5",
    system: "bazi",
    status: "unavailable",
    conclusion: options.conclusion || "当前资料不足，暂不进入专业裁决。",
    plain_language: reason,
    basis: options.basis || [calculation.facts?.mode === "unknown-time-sensitivity" ? "出生时辰尚未确定" : "四柱事实不完整"],
    change_conditions: options.change_conditions || ["补齐并重新计算可重放的四柱事实后，再从头进行裁决。"],
    reality_checks: ["先核对出生资料、时区和日界口径，不用人生经历反推一个方便的时辰。"],
    rulepack: BAZI_ADJUDICATION_RULEPACK_META,
    audit: { calculation_replay_status: replayStatus, score_used: false, event_prediction_used: false },
  });
}

function readNatalFacts(calculation) {
  const pillars = calculation.facts?.pillars;
  if (!Array.isArray(pillars) || pillars.length !== 4) return null;
  const byLabel = new Map(pillars.map((pillar) => [pillar.pillar, pillar]));
  const month = byLabel.get("month");
  const day = byLabel.get("day");
  if (!month || !day || !Array.isArray(month.hidden_stems) || !Array.isArray(month.ten_gods_hidden_stems)) return null;
  const visiblePillars = pillars.filter((pillar) => pillar.pillar !== "day");
  const visibleGods = visiblePillars.map((pillar) => pillar.ten_god_stem).filter((god) => TEN_GODS.has(god));
  const structuralRoots = calculation.facts?.structure?.root_evidence;
  const rootRecords = Array.isArray(structuralRoots)
    ? structuralRoots.map((record) => ({ ...record }))
    : pillars.flatMap((pillar) => (pillar.ten_gods_hidden_stems || []).flatMap((god, index) => (
      god === "比肩" || god === "劫财"
        ? [{
            fact_id: pillar.fact_id,
            source_pillar_id: pillar.fact_id,
            pillar: pillar.pillar,
            earthly_branch: pillar.earthly_branch,
            hidden_stem: pillar.hidden_stems[index],
            hidden_position: ["main", "middle", "residual"][index] || `position-${index + 1}`,
            relation: god === "比肩" ? "same_stem_root" : "same_element_peer_root",
            ten_god: god,
          }]
        : []
    )));
  const rootPillars = pillars.filter((pillar) => rootRecords.some((record) => record.source_pillar_id === pillar.fact_id));
  const relationships = calculation.facts?.structure?.relationships || [];
  const emittedMonthCommand = calculation.facts?.structure?.month_command;
  const emittedCandidates = Array.isArray(emittedMonthCommand?.candidates_in_library_order)
    ? emittedMonthCommand.candidates_in_library_order : [];
  const monthQiCandidates = month.hidden_stems.map((stem, index) => {
    const emitted = emittedCandidates[index];
    const tenGod = month.ten_gods_hidden_stems[index];
    if (
      emitted
      && (emitted.hidden_stem !== stem || emitted.ten_god !== tenGod)
    ) return null;
    return {
      candidate_id: `H-BZ-MONTH-QI-${String(index + 1).padStart(2, "0")}`,
      hidden_stem: stem,
      ten_god: tenGod,
      hidden_position: emitted?.hidden_position || ["main", "middle", "residual"][index] || `position-${index + 1}`,
      source_fact_id: emittedMonthCommand?.fact_id || month.fact_id,
    };
  });
  if (monthQiCandidates.some((candidate) => !candidate || !TEN_GODS.has(candidate.ten_god))) return null;
  const monthMainQi = monthQiCandidates.find((candidate) => candidate.hidden_position === "main") || monthQiCandidates[0];
  return {
    pillars,
    month,
    day,
    dayMaster: calculation.facts?.structure?.day_master,
    monthContext: calculation.facts?.structure?.month_context,
    monthMainQiStem: monthMainQi?.hidden_stem,
    monthMainQiGod: monthMainQi?.ten_god,
    monthQiCandidates,
    visiblePillars,
    visibleGods,
    visibleSupport: visiblePillars.filter((pillar) => SUPPORT_GODS.has(pillar.ten_god_stem)),
    visiblePressure: visiblePillars.filter((pillar) => PRESSURE_GODS.has(pillar.ten_god_stem)),
    rootPillars,
    rootRecords,
    seasonalContext: calculation.facts?.structure?.seasonal_context || null,
    monthCommand: emittedMonthCommand || null,
    relationships,
    monthRelationshipCautions: relationships.filter((relation) => relation.pillars?.includes("month")),
  };
}

function makeHypothesis({ id, label, state, supportingEvidence, contraryEvidence, changeConditions }) {
  return {
    hypothesis_id: id,
    label,
    state,
    supporting_evidence: supportingEvidence,
    contrary_evidence: contraryEvidence,
    change_conditions: unique(changeConditions),
  };
}

function adjudicateStrength(natal) {
  const monthSupports = SUPPORT_GODS.has(natal.monthMainQiGod);
  const monthPressures = PRESSURE_GODS.has(natal.monthMainQiGod);
  const rooted = natal.rootRecords.length > 0;
  const mainRoots = natal.rootRecords.filter((root) => root.hidden_position === "main");
  const secondaryRoots = natal.rootRecords.filter((root) => root.hidden_position !== "main");
  const rootCautions = natal.rootRecords.map((root) => ({
    root,
    interactions: natal.relationships.filter((relation) => (
      ROOT_USABILITY_CAUTION_RELATIONS.has(relation.relationship)
      && [...(relation.pillar_ids || []), ...(relation.layer_fact_ids || [])].includes(root.source_pillar_id)
    )),
  })).filter((item) => item.interactions.length);
  const cautionedRootIds = new Set(rootCautions.map((item) => item.root.fact_id));
  const rootsWithoutRegisteredCaution = natal.rootRecords.filter((root) => !cautionedRootIds.has(root.fact_id));
  const rootClosedForStrong = rootsWithoutRegisteredCaution.length > 0;
  const visiblySupported = natal.visibleSupport.length > 0;
  const visiblyPressured = natal.visiblePressure.length > 0;

  const strongSupport = [];
  const strongContrary = [];
  if (monthSupports) strongSupport.push(factEvidence(natal.month.fact_id, `月支本气与日主构成${natal.monthMainQiGod}，支持日主一侧；这不是精确人元司令结论。`));
  else if (monthPressures) strongContrary.push(factEvidence(natal.month.fact_id, `月支本气为${natal.monthMainQiGod}，不直接支持日主；这不是精确人元司令结论。`, "contrary"));
  for (const root of natal.rootRecords) {
    strongSupport.push(factEvidence(
      root.fact_id,
      `${PILLAR_ZH[root.pillar] || root.pillar}支${root.earthly_branch}的${ROOT_POSITION_ZH[root.hidden_position] || root.hidden_position}藏${root.hidden_stem}（${root.ten_god}），构成${root.relation === "same_stem_root" ? "同干根" : "同五行异阴阳根"}；这里只记位置，不折算分数。`,
    ));
  }
  for (const item of rootCautions) {
    strongContrary.push(factEvidence(
      item.interactions[0].fact_id,
      `${PILLAR_ZH[item.root.pillar] || item.root.pillar}支的根位同时受到${interactionSummary(item.interactions).join("、")}；当前只确认冲突存在，未证明根气仍可完整使用，因此不能仅凭此根把偏强判为成立。`,
      "contrary",
    ));
  }
  for (const pillar of natal.visibleSupport) {
    strongSupport.push(factEvidence(pillar.fact_id, `${PILLAR_ZH[pillar.pillar]}干${pillar.ten_god_stem}透出，形成可见生扶。`));
  }
  for (const pillar of natal.visiblePressure) {
    strongContrary.push(factEvidence(pillar.fact_id, `${PILLAR_ZH[pillar.pillar]}干${pillar.ten_god_stem}透出，形成克、泄或耗的一侧。`, "contrary"));
  }

  let strongState = BAZI_ADJUDICATION_STATES.unresolved;
  if (monthSupports && rootClosedForStrong && visiblySupported && !visiblyPressured) strongState = BAZI_ADJUDICATION_STATES.established;
  else if ((monthSupports || rooted) && visiblyPressured) strongState = BAZI_ADJUDICATION_STATES.damaged;

  const weakSupport = [];
  const weakContrary = [];
  if (monthPressures) weakSupport.push(factEvidence(natal.month.fact_id, `月支本气为${natal.monthMainQiGod}，构成克、泄或耗的季节背景；这不是精确人元司令结论。`));
  else if (monthSupports) weakContrary.push(factEvidence(natal.month.fact_id, `月支本气为${natal.monthMainQiGod}，直接支持日主；这不是精确人元司令结论。`, "contrary"));
  if (!rooted) weakSupport.push(factEvidence(natal.day.fact_id, "四支未见比劫根位，弱势假设获得支持。"));
  for (const pillar of natal.visiblePressure) {
    weakSupport.push(factEvidence(pillar.fact_id, `${PILLAR_ZH[pillar.pillar]}干${pillar.ten_god_stem}透出，增加日主承载要求。`));
  }
  for (const root of natal.rootRecords) {
    weakContrary.push(factEvidence(
      root.fact_id,
      `${PILLAR_ZH[root.pillar] || root.pillar}支存在${ROOT_POSITION_ZH[root.hidden_position] || root.hidden_position}${root.ten_god}根位，反对无根式弱势判断。`,
      "contrary",
    ));
  }
  for (const pillar of natal.visibleSupport) {
    weakContrary.push(factEvidence(pillar.fact_id, `${PILLAR_ZH[pillar.pillar]}干${pillar.ten_god_stem}透出，提供可见生扶。`, "contrary"));
  }

  let weakState = BAZI_ADJUDICATION_STATES.unresolved;
  if (monthPressures && !rooted && visiblyPressured && !visiblySupported) weakState = BAZI_ADJUDICATION_STATES.established;
  else if (monthPressures && visiblyPressured && (rooted || visiblySupported)) weakState = BAZI_ADJUDICATION_STATES.damaged;

  const strong = makeHypothesis({
    id: "H-BZ-STRENGTH-STRONG",
    label: "日主偏强候选",
    state: strongState,
    supportingEvidence: strongSupport,
    contraryEvidence: strongContrary,
    changeConditions: [
      "若经已登记规则确认月令并非生扶，偏强候选需下调。",
      "若根位被已验证的合化、冲损或空亡规则实质改变，必须重做根气检查。",
    ],
  });
  const weak = makeHypothesis({
    id: "H-BZ-STRENGTH-WEAK",
    label: "日主偏弱候选",
    state: weakState,
    supportingEvidence: weakSupport,
    contraryEvidence: weakContrary,
    changeConditions: [
      "若发现稳定根位或可见印比，不能维持无根式偏弱判断。",
      "若月令司令或合化条件经核对发生变化，必须重新判断而非修补原结论。",
    ],
  });
  const selected = strongState === BAZI_ADJUDICATION_STATES.established
    ? strong.hypothesis_id
    : weakState === BAZI_ADJUDICATION_STATES.established
      ? weak.hypothesis_id
      : null;
  const rootAxis = !rooted
    ? "absent"
    : rootsWithoutRegisteredCaution.length && rootCautions.length
      ? "usable_with_cautions"
      : rootsWithoutRegisteredCaution.length
        ? "usable"
        : "present_but_usability_unresolved";
  const surfaceAxis = visiblySupported && visiblyPressured
    ? "mixed"
    : visiblySupported
      ? "support"
      : visiblyPressured
        ? "pressure" : "neutral";
  const threeAxisTendency = {
    season: {
      direction: monthSupports ? "support" : monthPressures ? "pressure" : "other",
      basis_fact_ids: [natal.month.fact_id],
      boundary: "month_branch_main_qi_frame_not_exact_human_command",
    },
    roots: {
      direction: rootAxis,
      usable_root_fact_ids: rootsWithoutRegisteredCaution.map((root) => root.fact_id),
      cautioned_root_fact_ids: rootCautions.map((item) => item.root.fact_id),
    },
    visible_surface: {
      direction: surfaceAxis,
      support_fact_ids: natal.visibleSupport.map((pillar) => pillar.fact_id),
      pressure_fact_ids: natal.visiblePressure.map((pillar) => pillar.fact_id),
    },
    strict_resolution: selected === strong.hypothesis_id
      ? "strong_established"
      : selected === weak.hypothesis_id
        ? "weak_established" : "unresolved",
    policy: "three qualitative axes are reported separately; they do not vote, receive weights, or relax the strict establishment conjunctions",
  };
  const axisPlain = `${monthSupports
    ? "季节环境偏向支持日主"
    : monthPressures
      ? "季节环境偏向让日主输出、承压或消耗"
      : "季节环境暂未形成明确方向"}；地支${({
    absent: "未见日主根位",
    usable: "见到未受登记关系警示的根位",
    usable_with_cautions: "既有可用根位，也有受冲刑等关系警示的根位",
    present_but_usability_unresolved: "虽见根位，但受冲刑等关系影响，可用性尚未闭合",
  })[rootAxis]}；天干表层${({ support: "偏向支持", pressure: "偏向承压或消耗", mixed: "同时见支持与压力", neutral: "未见明确支持或压力" })[surfaceAxis]}。`;
  return {
    lens: "旺衰",
    source: BAZI_VIEW_DEFINITIONS.strength,
    evidence_dimensions: {
      month_command_side: monthSupports ? "support" : monthPressures ? "pressure" : "other",
      root_locations: {
        main: mainRoots.map((root) => root.fact_id),
        secondary_or_residual: secondaryRoots.map((root) => root.fact_id),
        exact_same_stem: natal.rootRecords.filter((root) => root.relation === "same_stem_root").map((root) => root.fact_id),
        same_element_peer: natal.rootRecords.filter((root) => root.relation === "same_element_peer_root").map((root) => root.fact_id),
      },
      visible_support: natal.visibleSupport.map((pillar) => pillar.fact_id),
      visible_pressure: natal.visiblePressure.map((pillar) => pillar.fact_id),
      root_usability_cautions: rootCautions.map((item) => ({
        root_fact_id: item.root.fact_id,
        root_position: item.root.hidden_position,
        interaction_fact_ids: item.interactions.map((relation) => relation.fact_id),
        status: "unresolved_under_registered_branch_interaction",
      })),
      three_axis_tendency: threeAxisTendency,
      weighting: "none",
    },
    hypotheses: [strong, weak],
    selected_hypothesis_id: selected,
    conclusion: `${axisPlain}${selected === strong.hypothesis_id
      ? "三条证据共同满足严格偏强条件，但仍保留改判条件。"
      : selected === weak.hypothesis_id
        ? "三条证据共同满足严格偏弱条件，但仍保留改判条件。"
        : "三条证据没有共同指向偏强或偏弱，当前保持未决，不把混合盘压成一个分数。"}`,
  };
}

function matchingVisiblePillars(natal, ruleLabel) {
  return natal.visiblePillars.filter((pillar) => (
    pillar.ten_god_stem === ruleLabel || TEN_GOD_GROUPS[ruleLabel]?.has(pillar.ten_god_stem)
  ));
}

function evaluatePatternPredicate(predicate, natal, strength, monthQiCandidate) {
  const [kind, value] = predicate.split(":");
  if (kind === "visible") {
    const pillars = matchingVisiblePillars(natal, value);
    return {
      matched: pillars.length > 0,
      fact_ids: pillars.map((pillar) => pillar.fact_id),
      statement: pillars.length
        ? `${pillars.map((pillar) => `${PILLAR_ZH[pillar.pillar]}干${pillar.ten_god_stem}`).join("、")}透出，满足“${value}可见”。`
        : `非日主三干未见${value}透出。`,
    };
  }
  if (kind === "absent") {
    const pillars = matchingVisiblePillars(natal, value);
    return {
      matched: pillars.length === 0,
      fact_ids: natal.visiblePillars.map((pillar) => pillar.fact_id),
      statement: pillars.length
        ? `${pillars.map((pillar) => `${PILLAR_ZH[pillar.pillar]}干${pillar.ten_god_stem}`).join("、")}已出现，不满足“无${value}”。`
        : `非日主三干未见${value}，满足当前路线的缺席条件。`,
    };
  }
  if (kind === "strength" && value === "strong") {
    const selected = strength.selected_hypothesis_id === "H-BZ-STRENGTH-STRONG";
    const hypothesis = strength.hypotheses.find((item) => item.hypothesis_id === "H-BZ-STRENGTH-STRONG");
    return {
      matched: selected,
      fact_ids: unique([
        ...(hypothesis?.supporting_evidence || []).map((item) => item.fact_id),
        ...(hypothesis?.contrary_evidence || []).map((item) => item.fact_id),
      ]),
      statement: selected ? "旺衰竞争假设当前选中日主偏强路线。" : "日主偏强路线尚未独立成立。",
    };
  }
  if (kind === "strength" && value === "can_carry") {
    const rooted = natal.rootPillars.length > 0;
    const visibleSupport = natal.visibleSupport.length > 0;
    return {
      matched: rooted && visibleSupport,
      fact_ids: unique([
        ...natal.rootPillars.map((pillar) => pillar.fact_id),
        ...natal.visibleSupport.map((pillar) => pillar.fact_id),
      ]),
      statement: rooted && visibleSupport
        ? "此复合路线同时见根位与透干印比，满足路线级承载前提；这不等于把全局旺衰强行判强。"
        : "此复合路线尚未同时见到根位与透干印比，路线级承载前提不足。",
    };
  }
  if (kind === "month" && value === "刑冲破害") {
    const relations = natal.monthRelationshipCautions.filter((relation) => (
      MONTH_PATTERN_DAMAGE_RELATIONS.has(relation.relationship)
      && !(relation.relationship === "branch_punishment"
        && relation.configuration_status === "pair_component_of_three_branch_punishment")
    ));
    return {
      matched: relations.length > 0,
      fact_ids: relations.map((relation) => relation.fact_id),
      statement: relations.length
        ? `月支命中${unique(relations.map((relation) => INTERACTION_LABELS[relation.relationship] || relation.relationship)).join("、")}。`
        : "月支未命中当前闭合表中的刑、冲、破、害。",
    };
  }
  if (kind === "command" && value === "not_metal_water") {
    const element = STEM_ELEMENTS[monthQiCandidate.hidden_stem];
    return {
      matched: Boolean(element) && !["金", "水"].includes(element),
      fact_ids: [natal.month.fact_id],
      statement: element ? `当前月支藏干候选为${element}，属于这条路线所指的非金水伤官条件；它不是精确人元司令结论。` : "当前月支藏干候选五行不可用。",
    };
  }
  return { matched: false, fact_ids: [], statement: `未实现条件 ${predicate}。` };
}

function routeClosure(route) {
  if (route.closure === "effect_closed") return "effect_closed";
  if (route.closure === "presence_closed_effect_unresolved") return "presence_closed_effect_unresolved";
  if (route.closure === "screening_only") return "screening_only";
  if (route.closure === "closed") return "presence_closed_effect_unresolved";
  return "structure_present_effect_unresolved";
}

function evaluatePatternRoute(route, natal, strength, monthQiCandidate) {
  const predicates = route.all.map((predicate) => ({
    predicate,
    ...evaluatePatternPredicate(predicate, natal, strength, monthQiCandidate),
  }));
  return {
    ...route,
    declared_closure: route.closure || "not_declared",
    closure: routeClosure(route),
    matched: predicates.every((item) => item.matched),
    predicates,
    fact_ids: unique(predicates.flatMap((item) => item.fact_ids)),
  };
}

function routeEvidence(route, role = "support") {
  return route.predicates.flatMap((predicate) => predicate.fact_ids.map((factId) => ({
    ...factEvidence(factId, `${route.label}：${predicate.statement}`, role),
    route_id: route.id,
    predicate: predicate.predicate,
  })));
}

function unresolvedPatternCandidate(natal, candidate, reason) {
  const label = BAZI_MONTH_COMMAND_PATTERN_RULES[candidate.ten_god]?.label || `${candidate.ten_god}格候选`;
  return {
    lens: "格局",
    candidate_id: candidate.candidate_id,
    candidate_basis: {
      hidden_stem: candidate.hidden_stem,
      ten_god: candidate.ten_god,
      hidden_position: candidate.hidden_position,
      transparency: "hidden_only",
      status: "secondary_qi_not_transparent",
      exact_commander: false,
    },
    source: BAZI_VIEW_DEFINITIONS.pattern,
    hypothesis: makeHypothesis({
      id: `H-BZ-PATTERN-${candidate.candidate_id}`,
      label,
      state: BAZI_ADJUDICATION_STATES.unresolved,
      supportingEvidence: [factEvidence(natal.month.fact_id, `${ROOT_POSITION_ZH[candidate.hidden_position] || candidate.hidden_position}${candidate.hidden_stem}与日主构成${candidate.ten_god}，仅保留藏干候选。`)],
      contraryEvidence: [],
      changeConditions: ["只有该中气或余气透出，或安装可审计的人元司令分段规则后，才重新运行它自己的成败路线。"],
    }),
    month_qi_candidate: { ...candidate, fact_id: natal.month.fact_id },
    transparent_fact_ids: [],
    formation: { matched_routes: [], unmatched_routes: [] },
    state_history: [BAZI_ADJUDICATION_STATES.unresolved],
    damage: [],
    rescue: [],
    route_adjudication: {
      active_damage_routes: [],
      active_rescue_routes: [],
      coverage: "中气或余气未透且精确人元司令未安装；不运行其成败路线。",
    },
    conclusion: reason,
  };
}

function adjudicatePatternCandidate(natal, strength, candidate, primaryFrame = false) {
  const rule = BAZI_MONTH_COMMAND_PATTERN_RULES[candidate.ten_god];
  if (!rule || !candidate.hidden_stem) {
    return {
      lens: "格局",
      candidate_id: candidate.candidate_id,
      source: BAZI_VIEW_DEFINITIONS.pattern,
      hypothesis: makeHypothesis({
        id: primaryFrame ? "H-BZ-PATTERN-PRIMARY" : `H-BZ-PATTERN-${candidate.candidate_id}`,
        label: "月令格局候选",
        state: BAZI_ADJUDICATION_STATES.unresolved,
        supportingEvidence: [],
        contraryEvidence: [],
        changeConditions: ["补齐可核对的月令本气与十神关系。"],
      }),
      state_history: [BAZI_ADJUDICATION_STATES.unresolved],
      damage: [],
      rescue: [],
      conclusion: "月令格局候选无法建立。",
    };
  }
  const transparent = natal.visiblePillars.filter((pillar) => pillar.heavenly_stem === candidate.hidden_stem);
  const formationRoutes = rule.formation_routes.map((route) => evaluatePatternRoute(route, natal, strength, candidate));
  const damageRoutes = rule.damage_routes.map((route) => evaluatePatternRoute(route, natal, strength, candidate));
  const rescueRoutes = rule.rescue_routes.map((route) => evaluatePatternRoute(route, natal, strength, candidate));
  const matchedFormation = formationRoutes.filter((route) => route.matched);
  const matchedDamage = damageRoutes.filter((route) => route.matched);
  const matchedRescue = rescueRoutes.filter((route) => (
    route.matched && matchedDamage.some((damageRoute) => damageRoute.id === route.for_damage)
  ));
  const support = [
    factEvidence(natal.month.fact_id, `月支${ROOT_POSITION_ZH[candidate.hidden_position] || candidate.hidden_position}${candidate.hidden_stem}与日主构成${candidate.ten_god}，只立${rule.label}候选；这不是精确人元司令结论。`),
    ...matchedFormation.flatMap((route) => routeEvidence(route)),
  ];
  const contrary = matchedDamage.flatMap((route) => routeEvidence(route, "contrary"));
  let state = BAZI_ADJUDICATION_STATES.unresolved;
  const stateHistory = [];
  if (matchedFormation.length) {
    stateHistory.push(BAZI_ADJUDICATION_STATES.established);
    state = BAZI_ADJUDICATION_STATES.established;
    if (matchedDamage.length) {
      stateHistory.push(BAZI_ADJUDICATION_STATES.damaged);
      state = BAZI_ADJUDICATION_STATES.damaged;
      const closedDamage = matchedDamage.filter((route) => route.closure === "effect_closed");
      const unrescuedClosed = closedDamage.filter((damageRoute) => !matchedRescue.some((route) => (
        route.for_damage === damageRoute.id && route.closure === "effect_closed"
      )));
      const screeningDamage = matchedDamage.filter((route) => route.closure !== "effect_closed");
      if (unrescuedClosed.length) {
        stateHistory.push(BAZI_ADJUDICATION_STATES.broken);
        state = BAZI_ADJUDICATION_STATES.broken;
      } else if (closedDamage.length && !screeningDamage.length) {
        stateHistory.push(BAZI_ADJUDICATION_STATES.rescued);
        state = BAZI_ADJUDICATION_STATES.rescued;
      }
    }
  } else stateHistory.push(BAZI_ADJUDICATION_STATES.unresolved);

  const hypothesis = makeHypothesis({
    id: primaryFrame ? "H-BZ-PATTERN-PRIMARY" : `H-BZ-PATTERN-${candidate.candidate_id}`,
    label: rule.label,
    state,
    supportingEvidence: support,
    contraryEvidence: contrary,
    changeConditions: [
      `若月支${ROOT_POSITION_ZH[candidate.hidden_position] || candidate.hidden_position}${candidate.hidden_stem}的透藏关系核对有误，${rule.label}需撤回。`,
      "若合化、制化、位置或根气核验改变某条复合路线，必须重新走成立—受损—救应链。",
      "没有编码完成的成败路线只保留候选，不得由模型补成成立或破格。",
    ],
  });
  const rescueEvidence = matchedRescue.flatMap((route) => routeEvidence(route));
  return {
    lens: "格局",
    candidate_id: candidate.candidate_id,
    candidate_basis: {
      hidden_stem: candidate.hidden_stem,
      ten_god: candidate.ten_god,
      hidden_position: candidate.hidden_position,
      transparency: transparent.length ? "visible" : "hidden_only",
      status: primaryFrame ? "month_branch_main_qi_frame" : "transparent_secondary_qi_candidate",
      exact_commander: false,
    },
    source: { ...BAZI_VIEW_DEFINITIONS.pattern, rule_source_status: rule.source_status, rule_source_refs: rule.source_refs },
    hypothesis,
    month_qi_candidate: { ...candidate, fact_id: natal.month.fact_id },
    command: {
      stem: candidate.hidden_stem,
      ten_god: candidate.ten_god,
      fact_id: natal.month.fact_id,
      compatibility_only: true,
      exact_commander_status: natal.monthCommand?.exact_commander_status || "unresolved_without_solar_term_segment_rule",
    },
    transparent_fact_ids: transparent.map((pillar) => pillar.fact_id),
    formation: {
      matched_routes: matchedFormation.map((route) => ({
        id: route.id,
        label: route.label,
        closure: route.closure,
        fact_ids: route.fact_ids,
      })),
      unmatched_routes: formationRoutes.filter((route) => !route.matched).map((route) => ({
        id: route.id,
        label: route.label,
        missing_predicates: route.predicates.filter((item) => !item.matched).map((item) => item.predicate),
      })),
    },
    state_history: stateHistory,
    damage: contrary,
    rescue: rescueEvidence,
    route_adjudication: {
      active_damage_routes: matchedDamage.map((route) => ({
        id: route.id,
        label: route.label,
        declared_closure: route.declared_closure,
        closure: route.closure,
        fact_ids: route.fact_ids,
      })),
      active_rescue_routes: matchedRescue.map((route) => ({
        id: route.id,
        label: route.label,
        for_damage: route.for_damage,
        declared_closure: route.declared_closure,
        closure: route.closure,
        fact_ids: route.fact_ids,
      })),
      coverage: "当前透干出现可闭合结构筛查，但轻重、位置、根气、制化效力未闭合的路线不得升级为最终破格或救应。",
    },
    conclusion: state === BAZI_ADJUDICATION_STATES.established
      ? `${rule.label}命中${matchedFormation.map((route) => route.label).join("、")}的已编码成格路线，尚未见已编码直接破坏。`
      : state === BAZI_ADJUDICATION_STATES.rescued
        ? `${rule.label}先命中${matchedDamage.map((route) => route.label).join("、")}，再由${matchedRescue.map((route) => route.label).join("、")}形成配对救应；不能省略中间受损环节。`
      : state === BAZI_ADJUDICATION_STATES.broken
          ? `${rule.label}已经成立但命中${matchedDamage.map((route) => route.label).join("、")}，且已编码的对应救应未成立，当前路线按破格处理。`
          : state === BAZI_ADJUDICATION_STATES.damaged
            ? `${rule.label}命中成格结构，也见${matchedDamage.map((route) => route.label).join("、")}${matchedRescue.length ? `及配对救应候选${matchedRescue.map((route) => route.label).join("、")}` : ""}；相关轻重、位置、根气或制化效力尚未闭合，只判受损，不越级判最终破格或救应。`
            : `${rule.label}目前只有月令候选；${formationRoutes.length ? "已编码成格路线的复合条件尚未齐" : "该格的机器成格路线尚未安装"}。`,
  };
}

function adjudicatePattern(natal, strength) {
  const candidates = natal.monthQiCandidates.map((candidate) => {
    const transparent = natal.visiblePillars.some((pillar) => pillar.heavenly_stem === candidate.hidden_stem);
    const primaryFrame = candidate.hidden_position === "main";
    if (!primaryFrame && !transparent) {
      return unresolvedPatternCandidate(
        natal,
        candidate,
        `${ROOT_POSITION_ZH[candidate.hidden_position] || candidate.hidden_position}${candidate.hidden_stem}（${candidate.ten_god}）未透，且精确人元司令分段未安装；保留候选但不运行成败路线。`,
      );
    }
    return adjudicatePatternCandidate(natal, strength, candidate, primaryFrame);
  });
  const primary = candidates.find((candidate) => candidate.candidate_basis?.status === "month_branch_main_qi_frame") || candidates[0];
  if (!primary) {
    return unresolvedPatternCandidate(
      natal,
      { candidate_id: "H-BZ-MONTH-QI-00", hidden_stem: null, ten_god: null, hidden_position: "unknown" },
      "月支藏干候选无法建立。",
    );
  }
  const candidateSummaries = candidates.map((candidate) => ({
    candidate_id: candidate.candidate_id,
    candidate_basis: candidate.candidate_basis,
    hypothesis: candidate.hypothesis,
    formation: candidate.formation,
    state_history: candidate.state_history,
    route_adjudication: candidate.route_adjudication,
    conclusion: candidate.conclusion,
  }));
  return {
    ...primary,
    selected_candidate_id: null,
    primary_frame_candidate_id: primary.candidate_id,
    exact_commander_status: natal.monthCommand?.exact_commander_status || "unresolved_without_solar_term_segment_rule",
    candidate_policy: "retain every month-branch hidden-stem candidate; use main qi only as a seasonal frame, run a secondary route only when that stem is visible, and never call any candidate the exact human commander without a solar-term segment rule",
    candidates: candidateSummaries,
    conclusion: `精确人元司令未决；以下只以月支本气框架展开，同时保留${candidateSummaries.length}个藏干候选。${primary.conclusion}`,
  };
}

function patternDirection(pattern, natal) {
  if (pattern.hypothesis.state === BAZI_ADJUDICATION_STATES.rescued && pattern.rescue.length) {
    return unique(pattern.rescue.map((item) => item.statement.match(/干([^，]+)透出/u)?.[1]));
  }
  const rule = BAZI_MONTH_COMMAND_PATTERN_RULES[pattern.month_qi_candidate?.ten_god || natal.monthMainQiGod];
  if (pattern.hypothesis.state === BAZI_ADJUDICATION_STATES.broken) return unique(rule?.rescue || []);
  if (pattern.hypothesis.state === BAZI_ADJUDICATION_STATES.established) return unique(rule?.maintain || []);
  return [];
}

function expandDirections(directions) {
  return unique(directions.flatMap((direction) => (
    BAZI_DIRECTION_ONTOLOGY[direction]?.members || [direction]
  )));
}

function directionView(view) {
  return {
    ...view,
    expanded_directions: expandDirections(view.proposed_directions),
    explicit_exclusions: [...(view.explicit_exclusions || [])],
  };
}

function stemLocations(natal, targetStem) {
  const visible = natal.visiblePillars.filter((pillar) => pillar.heavenly_stem === targetStem);
  const hidden = natal.pillars.flatMap((pillar) => (pillar.hidden_stems || []).flatMap((stem, index) => (
    stem === targetStem
      ? [{ pillar, index, position: ["main", "middle", "residual"][index] || `position-${index + 1}` }]
      : []
  )));
  return { visible, hidden };
}

function adjudicateClimate(natal) {
  const rule = getBaziClimateRule(natal.day.heavenly_stem, natal.month.earthly_branch);
  if (!rule) {
    return {
      lens: "调候",
      state: BAZI_ADJUDICATION_STATES.unresolved,
      proposed_directions: [],
      conclusion: "本次日干与月令没有命中已校勘的基础调候单元，调候保持未决。",
      source: BAZI_VIEW_DEFINITIONS.climate,
    };
  }
  const candidates = rule.mentioned_stems.map((stem) => {
    const locations = stemLocations(natal, stem);
    const availability = locations.visible.length
      ? "visible" : locations.hidden.length ? "hidden_only" : "absent";
    const role = rule.stem_roles.find((item) => item.stem === stem);
    return {
      stem,
      roles: [...(role?.roles || ["source_mentioned_role_unresolved"])],
      ...(role?.condition ? { condition: role.condition } : {}),
      availability,
      fact_ids: unique([
        ...locations.visible.map((item) => item.fact_id),
        ...locations.hidden.map((item) => item.pillar.fact_id),
      ]),
      locations: [
        ...locations.visible.map((pillar) => `${PILLAR_ZH[pillar.pillar] || pillar.pillar}干`),
        ...locations.hidden.map((item) => `${PILLAR_ZH[item.pillar.pillar] || item.pillar.pillar}支${ROOT_POSITION_ZH[item.position] || item.position}`),
      ],
    };
  });
  const present = candidates.filter((candidate) => candidate.availability !== "absent");
  const availabilityStatus = present.length
    ? `原文提及的${present.map((item) => `${item.stem}${item.availability === "visible" ? "已透" : "仅见于藏干"}`).join("、")}`
    : `原文提及的${candidates.map((item) => item.stem).join("、")}在当前盘面均未见`;
  const routeStatus = rule.applicability.status === "requires_solar_term_segment"
    ? "solar_term_segment_unresolved"
    : rule.applicability.status === "conditional_roles_not_adjudicated"
      ? "conditional_roles_unresolved"
      : present.length
        ? "source_mentions_located" : "source_mentions_absent";
  const boundaryText = routeStatus === "solar_term_segment_unresolved"
    ? `${rule.applicability.note}因此不能选择原文分路。`
    : routeStatus === "conditional_roles_unresolved"
      ? "这些干在原文中可能分别是主用、并用、佐用、条件救应、自带或反忌；条件角色尚未闭合，不能排成固定先后。"
      : "本规则只完成来源提及与盘内位置筛查，尚未逐条闭合角色、组合、阻碍和例外。";
  return {
    lens: "调候",
    state: BAZI_ADJUDICATION_STATES.unresolved,
    route_status: routeStatus,
    screening_completed: true,
    proposed_directions: [],
    candidate_directions: [...rule.mentioned_stems],
    conclusion: `${natal.day.heavenly_stem}日、${natal.month.earthly_branch}月命中《穷通宝鉴》来源索引；${availabilityStatus}。${boundaryText}调候保持未决，不把“出现”写成用神有效，更不推出古籍中的身份或结果断语。`,
    candidates,
    source: {
      ...BAZI_VIEW_DEFINITIONS.climate,
      rule_id: rule.id,
      source_id: rule.source_id,
      source_locator: rule.source_locator,
      source_granularity: rule.source_granularity,
      coverage: rule.coverage,
      applicability: rule.applicability,
      rulepack: BAZI_CLIMATE_RULEPACK_META,
    },
  };
}

function elementLocations(natal, element) {
  const visible = natal.visiblePillars.filter((pillar) => STEM_ELEMENTS[pillar.heavenly_stem] === element);
  const hidden = natal.pillars.flatMap((pillar) => (pillar.hidden_stems || []).flatMap((stem) => (
    STEM_ELEMENTS[stem] === element ? [pillar] : []
  )));
  return { visible, hidden };
}

function adjudicatePassage(natal) {
  const visibleElements = unique(natal.visiblePillars.map((pillar) => STEM_ELEMENTS[pillar.heavenly_stem]));
  const routes = Object.entries(CONTROL_MEDIATORS).flatMap(([pair, mediator]) => {
    const [controller, controlled] = pair.split("-");
    if (!visibleElements.includes(controller) || !visibleElements.includes(controlled)) return [];
    const controllerFacts = elementLocations(natal, controller);
    const controlledFacts = elementLocations(natal, controlled);
    const mediatorFacts = elementLocations(natal, mediator);
    const mediatorStatus = mediatorFacts.visible.length
      ? "visible" : mediatorFacts.hidden.length ? "hidden_only" : "absent";
    return [{
      controller,
      controlled,
      mediator,
      mediator_status: mediatorStatus,
      fact_ids: unique([
        ...controllerFacts.visible.map((pillar) => pillar.fact_id),
        ...controlledFacts.visible.map((pillar) => pillar.fact_id),
        ...mediatorFacts.visible.map((pillar) => pillar.fact_id),
        ...mediatorFacts.hidden.map((pillar) => pillar.fact_id),
      ]),
    }];
  });
  if (!routes.length) {
    return {
      lens: "通关",
      state: BAZI_ADJUDICATION_STATES.unresolved,
      proposed_directions: [],
      routes: [],
      conclusion: "非日主三干没有同时形成一组可直接核对的五行相制两端，因此不强行提出通关方向。",
      source: BAZI_VIEW_DEFINITIONS.passage,
    };
  }
  const viable = routes.filter((route) => route.mediator_status !== "absent");
  return {
    lens: "通关",
    state: viable.length ? BAZI_ADJUDICATION_STATES.established : BAZI_ADJUDICATION_STATES.unresolved,
    proposed_directions: unique(routes.map((route) => route.mediator)),
    routes,
    conclusion: viable.length
      ? `${viable.map((route) => `${route.controller}制${route.controlled}之间以${route.mediator}作中介（${route.mediator_status === "visible" ? "透干" : "仅藏支"}）`).join("；")}。这里只确认“对立两端—中介”结构可见，不判断中介是否足以扭转全局。`
      : `${routes.map((route) => `${route.controller}制${route.controlled}需${route.mediator}衔接`).join("；")}，但中介在当前四柱未见，通关路线保持未决。`,
    source: BAZI_VIEW_DEFINITIONS.passage,
  };
}

function usefulGodViews(strength, pattern, natal) {
  const patternDirections = patternDirection(pattern, natal);
  const patternView = {
    lens: "格局取用",
    state: patternDirections.length ? BAZI_ADJUDICATION_STATES.established : BAZI_ADJUDICATION_STATES.unresolved,
    proposed_directions: patternDirections,
    conclusion: patternDirections.length
      ? `格局视角只提出${patternDirections.join("、")}作为修复方向，不自动升级为全局唯一用神。`
      : "格局当前没有产生可独立成立的取用方向。",
    source: BAZI_VIEW_DEFINITIONS.pattern,
  };
  const selectedStrength = strength.hypotheses.find((item) => item.hypothesis_id === strength.selected_hypothesis_id);
  const supportDirections = selectedStrength?.hypothesis_id === "H-BZ-STRENGTH-WEAK"
    ? ["印星", "比劫"]
    : selectedStrength?.hypothesis_id === "H-BZ-STRENGTH-STRONG"
      ? ["食伤", "财星", "官杀"]
      : [];
  const supportView = {
    lens: "扶抑",
    state: supportDirections.length ? BAZI_ADJUDICATION_STATES.established : BAZI_ADJUDICATION_STATES.unresolved,
    proposed_directions: supportDirections,
    conclusion: supportDirections.length
      ? `扶抑视角提出${supportDirections.join("、")}方向，但只在当前强弱候选成立时有效。`
      : "旺衰尚未收敛，扶抑取用保持未决。",
    source: BAZI_VIEW_DEFINITIONS.support_balance,
  };
  const climateView = adjudicateClimate(natal);
  const passageView = adjudicatePassage(natal);
  const closedDamageRoutes = pattern.route_adjudication.active_damage_routes.filter((route) => route.closure === "effect_closed");
  const screeningDamageRoutes = pattern.route_adjudication.active_damage_routes.filter((route) => route.closure !== "effect_closed");
  const closedDamageIds = new Set(closedDamageRoutes.map((route) => route.id));
  const closedRescueRoutes = pattern.route_adjudication.active_rescue_routes.filter((route) => (
    route.closure === "effect_closed" && closedDamageIds.has(route.for_damage)
  ));
  const closedRescueIds = new Set(closedRescueRoutes.map((route) => route.id));
  const remedyDirections = pattern.rescue
    .filter((item) => closedRescueIds.has(item.route_id))
    .map((item) => item.statement.match(/干([^，]+)透出/u)?.[1])
    .filter(Boolean);
  const closedDiseaseRescued = closedDamageRoutes.length > 0
    && closedDamageRoutes.every((damageRoute) => closedRescueRoutes.some((rescueRoute) => rescueRoute.for_damage === damageRoute.id))
    && screeningDamageRoutes.length === 0
    && pattern.hypothesis.state === BAZI_ADJUDICATION_STATES.rescued;
  const diseaseView = {
    lens: "病药",
    state: closedDiseaseRescued
      ? BAZI_ADJUDICATION_STATES.rescued
      : closedDamageRoutes.length
        ? BAZI_ADJUDICATION_STATES.damaged
        : BAZI_ADJUDICATION_STATES.unresolved,
    proposed_directions: unique(remedyDirections),
    conclusion: closedDamageRoutes.length
      ? closedDiseaseRescued
        ? `病药视角能同时指出受损点与${unique(remedyDirections).join("、")}救应。`
        : "已找到闭合受损点，但尚未形成覆盖全部受损路线的闭合救应，不能泛称某五行为药。"
      : screeningDamageRoutes.length
        ? "只发现需要轻重、位置或制化继续核对的候选病点；当前病药路线保持未决，不把筛查信号升级成救应。"
        : "未识别具体病点，病药视角不强行取用。",
    source: BAZI_VIEW_DEFINITIONS.disease_remedy,
  };
  return [patternView, supportView, climateView, passageView, diseaseView].map(directionView);
}

function lensConflicts(views) {
  const active = views.filter((view) => view.state !== BAZI_ADJUDICATION_STATES.unresolved && view.proposed_directions.length);
  const conflicts = [];
  for (let left = 0; left < active.length; left += 1) {
    for (let right = left + 1; right < active.length; right += 1) {
      const leftExclusions = expandDirections(active[left].explicit_exclusions || []);
      const rightExclusions = expandDirections(active[right].explicit_exclusions || []);
      const leftDirections = active[left].expanded_directions || expandDirections(active[left].proposed_directions);
      const rightDirections = active[right].expanded_directions || expandDirections(active[right].proposed_directions);
      const explicitlyExcluded = unique([
        ...leftExclusions.filter((item) => rightDirections.includes(item)),
        ...rightExclusions.filter((item) => leftDirections.includes(item)),
      ]);
      if (explicitlyExcluded.length) {
        conflicts.push({
          between: [active[left].lens, active[right].lens],
          state: BAZI_ADJUDICATION_STATES.unresolved,
          mutually_exclusive_directions: explicitlyExcluded,
          explanation: `${active[left].lens}与${active[right].lens}存在规则显式声明的互斥方向；两者保持并列，不做平均。`,
          change_condition: "只有新增事实满足其中一条规则的适用前提或反证条件时，才改判。",
        });
      }
    }
  }
  return conflicts;
}

function matchesTenGodRule(god, entries) {
  return entries.some((entry) => entry === god || TEN_GOD_GROUPS[entry]?.has(god));
}

function patternRouteInputs(god, patternRule) {
  const groups = [
    ["formation_input", patternRule?.formation_routes || []],
    ["damage_input", patternRule?.damage_routes || []],
    ["rescue_input", patternRule?.rescue_routes || []],
  ];
  return groups.flatMap(([role, routes]) => routes.flatMap((route) => route.all
    .filter((predicate) => predicate.startsWith("visible:"))
    .filter((predicate) => matchesTenGodRule(god, [predicate.slice("visible:".length)]))
    .map((predicate) => ({
      role,
      route_id: route.id,
      route_label: route.label,
      matched_predicate: predicate,
      closure: route.closure || "formation_route",
    }))));
}

function periodPatternEffect(value, patternRule) {
  if (!patternRule) return { status: "unresolved", visible: null, hidden: [] };
  const visible = {
    ten_god: value.ten_god_stem,
    route_inputs: patternRouteInputs(value.ten_god_stem, patternRule),
  };
  const hidden = (value.ten_gods_hidden_stems || []).map((tenGodLabel, index) => ({
    ten_god: tenGodLabel,
    hidden_stem: value.hidden_stems?.[index] || null,
    route_inputs: patternRouteInputs(tenGodLabel, patternRule),
    visibility: "branch_hidden",
  }));
  const active = [visible, ...hidden].filter((item) => item.route_inputs.length > 0);
  return {
    status: active.length ? "candidate_route_inputs_present" : "neutral",
    visible,
    hidden,
    adjudication: "时间层只补入复合路线的候选条件；必须把整条路线连同原局重新核对，单一运年十神不能直接称为成格、破格或救应。",
    change_condition: "若合化、制化、位置或根气核验改变该十神的实际作用，阶段路线必须从头重算。",
  };
}

function interactionSummary(interactions) {
  return unique(interactions.map(interactionLabel));
}

function interactionLabel(item) {
  const completion = {
    active_layer_completes_three_harmony: "补成三合",
    active_layer_completes_three_meeting: "补成三会",
    active_layer_completes_three_punishment: "补成三刑",
  }[item.relationship];
  if (!completion) return INTERACTION_LABELS[item.relationship] || item.relationship;
  const layers = new Set(item.layers || []);
  const prefix = layers.has("decadal") && layers.has("yearly")
    ? "岁运"
    : layers.has("decadal")
      ? "大运"
      : layers.has("yearly")
        ? "流年" : "时间层";
  return `${prefix}${completion}`;
}

function normalizePeriodStage(value, role, patternRule = null, interactions = []) {
  const label = role === "environment" ? "大运环境" : "流年触发";
  if (value?._unavailable_reason) {
    return {
      role,
      status: "unavailable",
      conclusion: `${label}${value._unavailable_reason}`,
      basis: unique(value._basis || []),
    };
  }
  if (!value) {
    return {
      role,
      status: "unavailable",
      conclusion: `${label}未提供，不能从原局自行补算。`,
      basis: [],
    };
  }
  const valid = value.source_status === "verified_calculation_fact"
    && typeof value.fact_id === "string"
    && STEMS.has(value.heavenly_stem)
    && BRANCHES.has(value.earthly_branch)
    && TEN_GODS.has(value.ten_god_stem);
  if (!valid) {
    return {
      role,
      status: "unavailable",
      conclusion: `${label}缺少可核对的干支、十神或来源状态，不参与裁决。`,
      basis: [],
    };
  }
  const relevantInteractions = interactions.filter((item) => item.layer_fact_ids?.includes(value.fact_id));
  const interactionLabels = interactionSummary(relevantInteractions);
  const patternEffect = periodPatternEffect(value, patternRule);
  const theme = TEN_GOD_THEME[value.ten_god_stem] || "阶段条件";
  const interactionText = interactionLabels.length
    ? "它同时和出生盘里的其他结构相连，需要结合原有主题一起看"
    : "它没有和出生盘里的其他结构形成直接联系，所以只作阶段提示";
  const stageLabel = role === "environment"
    ? "当前较长阶段"
    : /^\d{4}-/.test(value.date || "")
      ? `${value.date.slice(0, 4)}年`
      : "目标年份";
  return {
    role,
    status: "available",
    fact_id: value.fact_id,
    heavenly_stem: value.heavenly_stem,
    earthly_branch: value.earthly_branch,
    ten_god_stem: value.ten_god_stem,
    hidden_stems: [...(value.hidden_stems || [])],
    ten_gods_hidden_stems: [...(value.ten_gods_hidden_stems || [])],
    ordinary_theme: theme,
    activation_status: interactionLabels.length ? "structurally_linked" : "background_only",
    interactions: relevantInteractions.map((item) => ({
      fact_id: item.fact_id,
      relationship: item.relationship,
      label: interactionLabel(item),
      layer_fact_ids: [...item.layer_fact_ids],
    })),
    pattern_effect: patternEffect,
    conclusion: role === "environment"
      ? `${stageLabel}的重点是${theme}；${interactionText}。这会影响原有主题怎样表现，但不能单凭这一层断定具体事件。`
      : `${stageLabel}的重点是${theme}；${interactionText}。这是当年的着力点，不能单凭它断定具体事件。`,
    basis: unique([value.fact_id, ...relevantInteractions.map((item) => item.fact_id)]),
  };
}

function resolvedPeriodsFromCalculation(calculation) {
  const luck = calculation.facts?.luck_cycles;
  const target = luck?.target;
  if (!luck || !target) {
    return {
      periods: {},
      source: "calculation.facts.luck_cycles_unavailable",
      interactions: [],
      decadalInteractions: [],
    };
  }
  const targetBasis = [luck.fact_id, target.fact_id];
  let decadal;
  if (target.status === "resolved_for_full_civil_date" && target.active_decadal_fact_id) {
    const active = luck.decadal?.find((item) => item.fact_id === target.active_decadal_fact_id);
    if (active) decadal = { ...active, source_status: "verified_calculation_fact" };
    else decadal = {
      _unavailable_reason: "引用的大运事实不存在，不能选择阶段环境。",
      _basis: [...targetBasis, target.active_decadal_fact_id],
    };
  } else {
    decadal = {
      _unavailable_reason: "处于起运边界或没有唯一当前大运，保持未决。",
      _basis: targetBasis,
    };
  }
  let yearly;
  if (target.yearly_status === "resolved_for_full_civil_date" && target.yearly) {
    yearly = { ...target.yearly, source_status: "verified_calculation_fact" };
  } else {
    yearly = {
      _unavailable_reason: "在目标日期内不是唯一稳定年柱，保留节气边界候选。",
      _basis: unique([target.fact_id, ...(target.yearly_alternatives || []).map((item) => item.fact_id)]),
    };
  }
  return {
    periods: { decadal, yearly },
    source: "calculation.facts.luck_cycles",
    interactions: Array.isArray(target.interactions) ? target.interactions : [],
    decadalInteractions: Array.isArray(target.decadal_interactions) ? target.decadal_interactions : [],
  };
}

function periodAsPillar(value, pillar) {
  return {
    fact_id: value.fact_id,
    pillar,
    stem_branch: value.stem_branch,
    heavenly_stem: value.heavenly_stem,
    earthly_branch: value.earthly_branch,
    ten_god_stem: value.ten_god_stem,
    hidden_stems: [...(value.hidden_stems || [])],
    ten_gods_hidden_stems: [...(value.ten_gods_hidden_stems || [])],
  };
}

function natalWithPeriodLayers(natal, layerValues, interactions) {
  const extraPillars = layerValues.map(({ value, pillar }) => periodAsPillar(value, pillar));
  const pillars = [...natal.pillars, ...extraPillars];
  const visiblePillars = [...natal.visiblePillars, ...extraPillars];
  const extraRoots = extraPillars.flatMap((pillar) => pillar.ten_gods_hidden_stems.flatMap((god, index) => (
    god === "比肩" || god === "劫财"
      ? [{
          fact_id: pillar.fact_id,
          source_pillar_id: pillar.fact_id,
          pillar: pillar.pillar,
          earthly_branch: pillar.earthly_branch,
          hidden_stem: pillar.hidden_stems[index],
          hidden_position: ["main", "middle", "residual"][index] || `position-${index + 1}`,
          relation: god === "比肩" ? "same_stem_root" : "same_element_peer_root",
          ten_god: god,
        }]
      : []
  )));
  const combinedRelationships = [...natal.relationships, ...interactions];
  return {
    ...natal,
    pillars,
    visiblePillars,
    visibleGods: visiblePillars.map((pillar) => pillar.ten_god_stem).filter((god) => TEN_GODS.has(god)),
    visibleSupport: visiblePillars.filter((pillar) => SUPPORT_GODS.has(pillar.ten_god_stem)),
    visiblePressure: visiblePillars.filter((pillar) => PRESSURE_GODS.has(pillar.ten_god_stem)),
    rootPillars: pillars.filter((pillar) => [...natal.rootRecords, ...extraRoots].some((root) => root.source_pillar_id === pillar.fact_id)),
    rootRecords: [...natal.rootRecords, ...extraRoots],
    relationships: combinedRelationships,
    monthRelationshipCautions: combinedRelationships.filter((relation) => (
      relation.pillars?.includes("month")
      || relation.layer_fact_ids?.includes(natal.month.fact_id)
    )),
  };
}

function patternSnapshot(pattern, strength) {
  return {
    strength_selected_hypothesis_id: strength.selected_hypothesis_id,
    pattern_label: pattern.hypothesis.label,
    pattern_state: pattern.hypothesis.state,
    formation_route_ids: pattern.formation.matched_routes.map((route) => route.id),
    damage_route_ids: pattern.route_adjudication.active_damage_routes.map((route) => route.id),
    rescue_route_ids: pattern.route_adjudication.active_rescue_routes.map((route) => route.id),
    basis: unique([
      pattern.command?.fact_id,
      ...pattern.transparent_fact_ids,
      ...pattern.formation.matched_routes.flatMap((route) => route.fact_ids),
      ...pattern.route_adjudication.active_damage_routes.flatMap((route) => route.fact_ids),
      ...pattern.route_adjudication.active_rescue_routes.flatMap((route) => route.fact_ids),
    ]),
  };
}

function snapshotTransition(from, to, layerFactId) {
  const difference = (next, prior) => next.filter((value) => !prior.includes(value));
  return {
    from_state: from.pattern_state,
    to_state: to.pattern_state,
    changed: from.pattern_state !== to.pattern_state
      || ["formation_route_ids", "damage_route_ids", "rescue_route_ids"]
        .some((key) => JSON.stringify(from[key]) !== JSON.stringify(to[key])),
    opened_formation_routes: difference(to.formation_route_ids, from.formation_route_ids),
    opened_damage_routes: difference(to.damage_route_ids, from.damage_route_ids),
    opened_rescue_routes: difference(to.rescue_route_ids, from.rescue_route_ids),
    closed_formation_routes: difference(from.formation_route_ids, to.formation_route_ids),
    closed_damage_routes: difference(from.damage_route_ids, to.damage_route_ids),
    closed_rescue_routes: difference(from.rescue_route_ids, to.rescue_route_ids),
    layer_fact_id: layerFactId,
    interpretation_limit: "a route-state transition is a traditional structural re-adjudication, not a named event or probability",
  };
}

function readjudicatePeriodLayers(natal, natalStrength, natalPattern, resolved, decadal, yearly) {
  const natalSnapshot = patternSnapshot(natalPattern, natalStrength);
  const result = {
    policy: "natal frozen; add unique decadal; then add unique yearly; rerun strength and every registered pattern predicate at each layer",
    natal: natalSnapshot,
    decadal: { status: "unavailable" },
    yearly: { status: "unavailable" },
  };
  if (decadal.status !== "available") return result;
  const decadalNatal = natalWithPeriodLayers(
    natal,
    [{ value: resolved.periods.decadal, pillar: "decadal" }],
    resolved.decadalInteractions,
  );
  const decadalStrength = adjudicateStrength(decadalNatal);
  const decadalPattern = adjudicatePattern(decadalNatal, decadalStrength);
  const decadalSnapshot = patternSnapshot(decadalPattern, decadalStrength);
  result.decadal = {
    status: "re_adjudicated",
    layer_fact_id: resolved.periods.decadal.fact_id,
    snapshot: decadalSnapshot,
    transition: snapshotTransition(natalSnapshot, decadalSnapshot, resolved.periods.decadal.fact_id),
    conclusion: decadalSnapshot.pattern_state === natalSnapshot.pattern_state
      ? `加入大运后，${natalPattern.hypothesis.label}仍为${decadalSnapshot.pattern_state}；路线条件已完整重跑，不是只看大运天干。`
      : `加入大运后，${natalPattern.hypothesis.label}由${natalSnapshot.pattern_state}转为${decadalSnapshot.pattern_state}；只表示登记路线的条件变化。`,
  };
  if (yearly.status !== "available") return result;
  const yearlyNatal = natalWithPeriodLayers(
    natal,
    [
      { value: resolved.periods.decadal, pillar: "decadal" },
      { value: resolved.periods.yearly, pillar: "yearly" },
    ],
    resolved.interactions,
  );
  const yearlyStrength = adjudicateStrength(yearlyNatal);
  const yearlyPattern = adjudicatePattern(yearlyNatal, yearlyStrength);
  const yearlySnapshot = patternSnapshot(yearlyPattern, yearlyStrength);
  result.yearly = {
    status: "re_adjudicated",
    layer_fact_id: resolved.periods.yearly.fact_id,
    snapshot: yearlySnapshot,
    transition: snapshotTransition(decadalSnapshot, yearlySnapshot, resolved.periods.yearly.fact_id),
    conclusion: yearlySnapshot.pattern_state === decadalSnapshot.pattern_state
      ? `再加入流年后，${natalPattern.hypothesis.label}仍为${yearlySnapshot.pattern_state}；流年没有被单独拿来命名事件。`
      : `再加入流年后，${natalPattern.hypothesis.label}由${decadalSnapshot.pattern_state}转为${yearlySnapshot.pattern_state}；这只是当年登记条件的结构迁移。`,
  };
  return result;
}

function jointPeriodActivation(decadal, yearly, interactions) {
  if (decadal.status !== "available" || yearly.status !== "available") {
    return {
      status: "unavailable",
      adjudication_level: "structural_linkage_only",
      conclusion: "大运或流年有一层未能唯一确定，不生成联合引动判断。",
      basis: [],
    };
  }
  const materialInteractions = interactions.filter((item) => JOINT_ACTIVATION_RELATIONS.has(item.relationship));
  const decadalNatal = materialInteractions.filter((item) => (
    item.layers?.includes("decadal") && item.layers?.includes("natal")
  ));
  const yearlyNatal = materialInteractions.filter((item) => (
    item.layers?.includes("yearly") && item.layers?.includes("natal")
  ));
  const yearlyDecadal = materialInteractions.filter((item) => (
    item.layers?.includes("yearly") && item.layers?.includes("decadal")
  ));
  const decadalNatalIds = new Set(decadalNatal.flatMap((item) => item.layer_fact_ids || []).filter((id) => /^F-BZ-00[1-4]$/u.test(id)));
  const sharedNatalPillar = yearlyNatal.some((item) => (
    (item.layer_fact_ids || []).some((id) => decadalNatalIds.has(id))
  ));
  const supported = decadalNatal.length > 0
    && yearlyNatal.length > 0
    && (yearlyDecadal.length > 0 || sharedNatalPillar);
  const basis = unique([
    ...decadalNatal.map((item) => item.fact_id),
    ...yearlyNatal.map((item) => item.fact_id),
    ...yearlyDecadal.map((item) => item.fact_id),
  ]);
  return {
    status: supported ? "structurally_linked" : basis.length ? "partly_linked" : "background_only",
    adjudication_level: "structural_linkage_only",
    conclusion: supported
      ? "原局、大运、流年三层出现具名的同链结构联系；当前只确认结构相连，尚未逐条重跑成格、受损或救应路线，因此不称为联合引动。"
      : basis.length
        ? "只见部分层次与原局相连，尚不足以称为原局—大运—流年的完整联合引动。"
        : "当前闭合关系表未见三层结构联系，只保留大运与流年的一般背景。",
    basis,
    relation_labels: interactionSummary(materialInteractions.filter((item) => basis.includes(item.fact_id))),
    excluded_generic_relation_fact_ids: interactions
      .filter((item) => !JOINT_ACTIVATION_RELATIONS.has(item.relationship))
      .map((item) => item.fact_id),
  };
}

function phaseLayers(natal, strength, pattern, calculation) {
  const resolved = resolvedPeriodsFromCalculation(calculation);
  const patternRule = BAZI_MONTH_COMMAND_PATTERN_RULES[pattern.command?.ten_god];
  const decadal = normalizePeriodStage(resolved.periods.decadal, "environment", patternRule, resolved.decadalInteractions);
  const yearly = normalizePeriodStage(resolved.periods.yearly, "trigger", patternRule, resolved.interactions);
  const reAdjudication = readjudicatePeriodLayers(natal, strength, pattern, resolved, decadal, yearly);
  const joint = jointPeriodActivation(decadal, yearly, resolved.interactions);
  if (reAdjudication.yearly.status === "re_adjudicated") {
    joint.adjudication_level = "registered_route_re_adjudication";
    joint.route_transition = reAdjudication.yearly.transition;
    joint.conclusion = reAdjudication.yearly.conclusion;
  } else if (reAdjudication.decadal.status === "re_adjudicated") {
    joint.adjudication_level = "decadal_route_re_adjudication_only";
    joint.route_transition = reAdjudication.decadal.transition;
    joint.conclusion = `${reAdjudication.decadal.conclusion} 流年未能唯一确定，所以停止在大运层。`;
  }
  return {
    natal: {
      role: "baseline",
      status: "available",
      conclusion: `原局以${pattern.hypothesis.label}的${pattern.hypothesis.state}状态作为冻结基线。`,
      basis: unique([
        pattern.command?.fact_id,
        ...pattern.transparent_fact_ids,
        ...pattern.damage.map((item) => item.fact_id),
        ...pattern.rescue.map((item) => item.fact_id),
      ]),
    },
    decadal,
    yearly,
    re_adjudication: reAdjudication,
    joint_activation: joint,
    source: resolved.source,
    hierarchy: "原局是基线；大运只改变环境；流年只标记触发。后层不得反写前层。",
  };
}

function readableStrengthSummary(strength) {
  const axes = strength.evidence_dimensions?.three_axis_tendency || {};
  const resolution = axes.strict_resolution;
  const headline = resolution === "strong_established"
    ? "盘里的支持条件较完整，面对任务时更有自行承载和持续推进的空间"
    : resolution === "weak_established"
      ? "盘里的消耗和压力更集中，做重要事情时更依赖合适节奏、外部支持和恢复"
      : "你不是一眼能归成“强”或“弱”的类型：盘里既有支撑，也有消耗";
  const season = ({
    support: "出生时的季节条件偏向提供支持",
    pressure: "出生时的季节条件更偏向输出、承压和消耗",
    other: "出生时的季节条件没有给出明确方向",
  })[axes.season?.direction] || "出生时的季节条件暂不明确";
  const roots = ({
    absent: "盘里没有看到明确的持续支撑",
    usable: "盘里有能落到实处的支撑",
    usable_with_cautions: "盘里有能落到实处的支撑，但也受其他条件牵制",
    present_but_usability_unresolved: "盘里有支撑，但能否稳定发挥还说不准",
  })[axes.roots?.direction] || "自身支撑条件暂不明确";
  const surface = ({
    support: "直接表现出来的部分更多是支持",
    pressure: "直接表现出来的部分更多是压力和消耗",
    mixed: "直接表现出来的部分既有支持也有压力",
    neutral: "直接表现出来的部分没有明显偏向",
  })[axes.visible_surface?.direction] || "直接表现出来的部分暂不明确";
  return { headline, detail: `${season}；${roots}；${surface}` };
}

function readablePatternSummary(pattern) {
  const state = pattern.hypothesis.state;
  if (state === BAZI_ADJUDICATION_STATES.established) {
    return { headline: "出生盘里有一条相对完整的核心主线", detail: "这张盘有一条相对清楚的核心主线" };
  }
  if (state === BAZI_ADJUDICATION_STATES.damaged) {
    return { headline: "核心主线已经形成，但也受到明确牵制；目前只能说发挥会受影响，不能直接推结果", detail: "核心主线已经形成，但发挥时会受到牵制" };
  }
  if (state === BAZI_ADJUDICATION_STATES.broken) {
    return { headline: "核心主线受到明确阻碍，本轮还没有看到能把它接回来的条件", detail: "核心主线受到明确阻碍，暂未见有效补接" };
  }
  if (state === BAZI_ADJUDICATION_STATES.rescued) {
    return { headline: "核心主线先受牵制，随后出现了能把它接回来的条件", detail: "核心主线先受牵制，随后得到补接" };
  }
  return { headline: "盘里能看出几条方向，但没有一条完整到足以概括整个人生", detail: "没有一条固定结构足以概括整个人生" };
}

function ordinarySynthesis(strength, pattern, views, conflicts, phase) {
  const unresolvedViews = views.filter((view) => view.state === BAZI_ADJUDICATION_STATES.unresolved).map((view) => view.lens);
  const strengthSummary = readableStrengthSummary(strength);
  const patternSummary = readablePatternSummary(pattern);
  const viewBoundary = conflicts.length
    ? "不同判断角度确实有分歧，所以分别保留，不硬拼成一个答案。"
    : "其他判断只有在各自条件满足时才成立，不把它们硬凑成一个结论。";
  const basis = unique([
    pattern.command?.fact_id,
    ...strength.hypotheses.flatMap((item) => [
      ...item.supporting_evidence.map((evidence) => evidence.fact_id),
      ...item.contrary_evidence.map((evidence) => evidence.fact_id),
    ]),
    ...pattern.transparent_fact_ids,
    ...pattern.damage.map((item) => item.fact_id),
    ...pattern.rescue.map((item) => item.fact_id),
  ]);
  return {
    conclusion: `整体上，${strengthSummary.headline}。${patternSummary.detail}，所以事业、财富和关系要分开看，不能用一个标签概括。`,
    plain_language: `为什么这样看：${strengthSummary.detail}。${patternSummary.headline}。${viewBoundary}`,
    basis,
    change_conditions: unique([
      ...pattern.hypothesis.change_conditions,
      ...strength.hypotheses.flatMap((item) => item.change_conditions),
      "补入经核对的调候或通关规则时，只更新对应视角，不事后改写其他视角的原始证据。",
      "大运或流年只能改变阶段环境与触发，不能把原局未成立的结构倒推为成立。",
    ]),
    reality_checks: [
      "连续记录至少两个相似任务周期：资源补充后，承载和恢复是否稳定改善，而不是只挑一次吻合。",
      "当约束、输出和资源同时出现时，分别记录哪一项先造成卡点、哪一项实际缓解，不用结果倒推规则。",
      "若现实记录反复同时支持相反路线，保留未决并检查出生资料、月令和根位，不强行收敛。",
    ],
    unresolved: unique([
      ...unresolvedViews,
      ...(conflicts.length ? ["视角冲突"] : []),
      ...(phase.decadal.status === "unavailable" ? ["大运环境"] : []),
      ...(phase.yearly.status === "unavailable" ? ["流年触发"] : []),
    ]),
  };
}

/**
 * Build a bounded professional BaZi adjudication from replay-verified natal
 * facts.  Replay-verified luck-cycle facts from the calculation take priority;
 * caller-supplied rule or period claims are never accepted as facts.
 */
export function adjudicateBazi(calculation, options = {}) {
  const replayStatus = ensureReplayVerifiedBazi(calculation);
  const topic = options.topic === undefined ? "overview" : options.topic;
  if (!SUPPORTED_TOPICS.has(topic)) {
    return unavailableResult(
      calculation,
      replayStatus,
      "当前八字主题表只闭合人生整体、事业学习、财富资源和长期关系；其他领域不借相邻十神拼答案。",
      {
        conclusion: "当前八字规则不能可靠回答这个指定领域。",
        basis: ["指定领域不在封闭主题表内"],
        change_conditions: ["改选人生整体来查看已闭合的八字结构，或改用已支持该主题的紫微/西洋路线。"],
      },
    );
  }
  if (calculation.facts?.mode !== "known-time") {
    return unavailableResult(calculation, replayStatus, "出生时辰未知时，不创建完整旺衰、格局或用神裁决。");
  }
  const natal = readNatalFacts(calculation);
  if (!natal || !TEN_GODS.has(natal.monthMainQiGod) || !natal.monthQiCandidates.length) {
    return unavailableResult(calculation, replayStatus, "月令本气、十神或四柱事实不完整，无法建立候选。 ");
  }
  const strength = adjudicateStrength(natal);
  const pattern = adjudicatePattern(natal, strength);
  const views = usefulGodViews(strength, pattern, natal);
  const conflicts = lensConflicts(views);
  const phase = phaseLayers(natal, strength, pattern, calculation);
  const synthesis = ordinarySynthesis(strength, pattern, views, conflicts, phase);
  const overviewResult = {
    schema_version: "bazi-adjudication-v0.5",
    system: "bazi",
    status: "completed",
    topic: "overview",
    conclusion: synthesis.conclusion,
    plain_language: synthesis.plain_language,
    basis: synthesis.basis,
    change_conditions: synthesis.change_conditions,
    reality_checks: synthesis.reality_checks,
    competing_hypotheses: [
      ...strength.hypotheses,
      pattern.hypothesis,
      ...views.map((view, index) => ({
        hypothesis_id: `H-BZ-VIEW-${String(index + 1).padStart(2, "0")}`,
        label: view.lens,
        state: view.state,
        proposed_directions: view.proposed_directions,
        conclusion: view.conclusion,
        source: view.source,
      })),
    ],
    lenses: { strength, pattern, useful_god_views: views, conflicts },
    phase,
    unresolved: synthesis.unresolved,
    rulepack: {
      meta: BAZI_ADJUDICATION_RULEPACK_META,
      rule_ids: BAZI_ADJUDICATION_RULES.map((rule) => rule.id),
    },
    safeguards: {
      score_used: false,
      school_average_used: false,
      named_event_prediction_used: false,
      natal_rewritten_by_period: false,
      predictive_validity: "not_established",
      external_rule_inputs_accepted: false,
      external_period_inputs_accepted: false,
    },
    audit: {
      calculation_replay_status: replayStatus,
      ignored_untrusted_option_keys: ["rule_inputs", "periods"].filter((key) => Object.hasOwn(options, key)),
    },
  };
  if (topic === "overview") return deepFreeze(overviewResult);

  const topicReading = adjudicateBaziTopic(calculation, topic);
  if (!topicReading) {
    throw new FortuneTellerError("BAZI_ADJUDICATION_TOPIC_INTERNAL", `registered BaZi topic did not resolve: ${topic}`);
  }
  const topicBasis = unique([
    ...(topicReading.inspected_fact_ids || []),
    ...(topicReading.axes || []).flatMap((axis) => axis.evidence.map((item) => item.fact_id)),
    topicReading.day_branch?.fact_id,
    ...(topicReading.branch_interactions || []).flatMap((item) => item.fact_ids || [item.fact_id]),
    ...(topicReading.spouse_star_context?.evidence || []).map((item) => item.fact_id),
    ...(topicReading.phase_activation?.inspected_fact_ids || []),
  ]);
  return deepFreeze({
    ...overviewResult,
    topic,
    conclusion: topicReading.conclusion,
    plain_language: topicReading.plain_language,
    basis: topicBasis,
    change_conditions: unique([
      "出生资料、时区或日界口径改变时，必须重算整条主题路线。",
      "藏在地支里的线索只作补充；如果没有直接显出，也没有形成完整作用链，就不把它升级成主要结论。",
      "当前阶段只能加强出生盘里已有的主线；如果原盘没有同类线索，就只记为阶段新出现的课题，不据此命名具体事件。",
    ]),
    reality_checks: topicReading.reality_checks,
    natal_overview: {
      conclusion: synthesis.conclusion,
      plain_language: synthesis.plain_language,
    },
    lenses: { ...overviewResult.lenses, topic: topicReading },
    phase: { ...phase, topic_activation: topicReading.phase_activation },
    rulepack: {
      ...overviewResult.rulepack,
      topic: topicReading.rulepack,
    },
    safeguards: {
      ...overviewResult.safeguards,
      ...topicReading.safeguards,
    },
  });
}
