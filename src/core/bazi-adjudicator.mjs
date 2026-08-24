import { verifyCalculationFacts } from "./calculation-verifier.mjs";
import { FortuneTellerError } from "./errors.mjs";
import {
  BAZI_ADJUDICATION_RULEPACK_META,
  BAZI_ADJUDICATION_RULES,
  BAZI_ADJUDICATION_STATES,
  BAZI_DIRECTION_ONTOLOGY,
  BAZI_MONTH_COMMAND_PATTERN_RULES,
  BAZI_VIEW_DEFINITIONS,
} from "../data/bazi-adjudication-rulepack.mjs";

const SUPPORT_GODS = new Set(["比肩", "劫财", "正印", "偏印"]);
const PRESSURE_GODS = new Set(["食神", "伤官", "正财", "偏财", "正官", "七杀"]);
const STEMS = new Set(["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]);
const BRANCHES = new Set(["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]);
const TEN_GODS = new Set([...SUPPORT_GODS, ...PRESSURE_GODS]);
const PILLAR_ZH = Object.freeze({ year: "年", month: "月", day: "日", time: "时" });
const TEN_GOD_THEME = Object.freeze({
  比肩: "自主推进、同辈协作与资源分配",
  劫财: "竞争、合作边界与共同资源",
  食神: "稳定输出、表达与成果养成",
  伤官: "独立表达、改进旧法与规则摩擦",
  正财: "稳定资源、交换责任与日常配置",
  偏财: "外部机会、流动资源与多方协调",
  正官: "明确职责、规范与持续承担",
  七杀: "高压任务、快速决断与约束管理",
  正印: "学习支持、方法积累与恢复条件",
  偏印: "非标准学习、专门方法与独立准备",
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
  layer_natal_pillar_repetition: "运年与原局伏吟",
  decadal_yearly_repetition: "岁运并临",
  heavenly_control_earthly_clash: "天克地冲",
  active_layer_completes_three_harmony: "运年补成三合",
  active_layer_completes_three_meeting: "运年补成三会",
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
const MONTH_PATTERN_DAMAGE_RELATIONS = new Set([
  "branch_clash", "branch_punishment", "branch_harm", "branch_break",
]);
const JOINT_ACTIVATION_RELATIONS = new Set([
  "stem_five_combination", "stem_clash",
  "branch_repetition", "branch_self_punishment", "branch_six_harmony", "branch_clash",
  "branch_harm", "branch_break", "branch_punishment",
  "layer_natal_pillar_repetition", "decadal_yearly_repetition", "heavenly_control_earthly_clash",
  "active_layer_completes_three_harmony", "active_layer_completes_three_meeting",
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

function unavailableResult(calculation, replayStatus, reason) {
  return deepFreeze({
    schema_version: "bazi-adjudication-v0.4",
    status: "unavailable",
    conclusion: "当前资料不足，暂不进入专业裁决。",
    plain_language: reason,
    basis: [calculation.facts?.mode === "unknown-time-sensitivity" ? "出生时辰尚未确定" : "四柱事实不完整"],
    change_conditions: ["补齐并重新计算可重放的四柱事实后，再从头进行裁决。"],
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
  const rootPillars = pillars.filter((pillar) => (
    Array.isArray(pillar.ten_gods_hidden_stems)
    && pillar.ten_gods_hidden_stems.some((god) => god === "比肩" || god === "劫财")
  ));
  const relationships = calculation.facts?.structure?.relationships || [];
  return {
    pillars,
    month,
    day,
    dayMaster: calculation.facts?.structure?.day_master,
    monthContext: calculation.facts?.structure?.month_context,
    commandStem: month.hidden_stems[0],
    commandGod: month.ten_gods_hidden_stems[0],
    visiblePillars,
    visibleGods,
    visibleSupport: visiblePillars.filter((pillar) => SUPPORT_GODS.has(pillar.ten_god_stem)),
    visiblePressure: visiblePillars.filter((pillar) => PRESSURE_GODS.has(pillar.ten_god_stem)),
    rootPillars,
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
  const monthSupports = SUPPORT_GODS.has(natal.commandGod);
  const monthPressures = PRESSURE_GODS.has(natal.commandGod);
  const rooted = natal.rootPillars.length > 0;
  const visiblySupported = natal.visibleSupport.length > 0;
  const visiblyPressured = natal.visiblePressure.length > 0;

  const strongSupport = [];
  const strongContrary = [];
  if (monthSupports) strongSupport.push(factEvidence(natal.month.fact_id, `月令本气与日主构成${natal.commandGod}，支持日主一侧。`));
  else if (monthPressures) strongContrary.push(factEvidence(natal.month.fact_id, `月令本气为${natal.commandGod}，不直接支持日主。`, "contrary"));
  for (const pillar of natal.rootPillars) {
    strongSupport.push(factEvidence(pillar.fact_id, `${PILLAR_ZH[pillar.pillar]}支藏有比劫关系，构成一个明确根位。`));
  }
  for (const pillar of natal.visibleSupport) {
    strongSupport.push(factEvidence(pillar.fact_id, `${PILLAR_ZH[pillar.pillar]}干${pillar.ten_god_stem}透出，形成可见生扶。`));
  }
  for (const pillar of natal.visiblePressure) {
    strongContrary.push(factEvidence(pillar.fact_id, `${PILLAR_ZH[pillar.pillar]}干${pillar.ten_god_stem}透出，形成克、泄或耗的一侧。`, "contrary"));
  }

  let strongState = BAZI_ADJUDICATION_STATES.unresolved;
  if (monthSupports && rooted && visiblySupported && !visiblyPressured) strongState = BAZI_ADJUDICATION_STATES.established;
  else if ((monthSupports || rooted) && visiblyPressured) strongState = BAZI_ADJUDICATION_STATES.damaged;

  const weakSupport = [];
  const weakContrary = [];
  if (monthPressures) weakSupport.push(factEvidence(natal.month.fact_id, `月令本气为${natal.commandGod}，构成克、泄或耗的季节背景。`));
  else if (monthSupports) weakContrary.push(factEvidence(natal.month.fact_id, `月令本气为${natal.commandGod}，直接支持日主。`, "contrary"));
  if (!rooted) weakSupport.push(factEvidence(natal.day.fact_id, "四支未见比劫根位，弱势假设获得支持。"));
  for (const pillar of natal.visiblePressure) {
    weakSupport.push(factEvidence(pillar.fact_id, `${PILLAR_ZH[pillar.pillar]}干${pillar.ten_god_stem}透出，增加日主承载要求。`));
  }
  for (const pillar of natal.rootPillars) {
    weakContrary.push(factEvidence(pillar.fact_id, `${PILLAR_ZH[pillar.pillar]}支存在比劫根位，反对无根式弱势判断。`, "contrary"));
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
  return {
    lens: "旺衰",
    source: BAZI_VIEW_DEFINITIONS.strength,
    hypotheses: [strong, weak],
    selected_hypothesis_id: selected,
    conclusion: selected === strong.hypothesis_id
      ? "当前条件支持日主偏强，但仍保留改判条件。"
      : selected === weak.hypothesis_id
        ? "当前条件支持日主偏弱，但仍保留改判条件。"
        : "强弱证据同时存在，当前保持未决，不把混合盘压成一个分数。",
  };
}

function matchingVisiblePillars(natal, ruleLabel) {
  return natal.visiblePillars.filter((pillar) => (
    pillar.ten_god_stem === ruleLabel || TEN_GOD_GROUPS[ruleLabel]?.has(pillar.ten_god_stem)
  ));
}

function evaluatePatternPredicate(predicate, natal, strength) {
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
    const relations = natal.monthRelationshipCautions.filter((relation) => MONTH_PATTERN_DAMAGE_RELATIONS.has(relation.relationship));
    return {
      matched: relations.length > 0,
      fact_ids: relations.map((relation) => relation.fact_id),
      statement: relations.length
        ? `月支命中${unique(relations.map((relation) => INTERACTION_LABELS[relation.relationship] || relation.relationship)).join("、")}。`
        : "月支未命中当前闭合表中的刑、冲、破、害。",
    };
  }
  if (kind === "command" && value === "not_metal_water") {
    const element = STEM_ELEMENTS[natal.commandStem];
    return {
      matched: Boolean(element) && !["金", "水"].includes(element),
      fact_ids: [natal.month.fact_id],
      statement: element ? `月令本气为${element}，属于当前路线所指的非金水伤官条件。` : "月令本气五行不可用。",
    };
  }
  return { matched: false, fact_ids: [], statement: `未实现条件 ${predicate}。` };
}

function evaluatePatternRoute(route, natal, strength) {
  const predicates = route.all.map((predicate) => ({
    predicate,
    ...evaluatePatternPredicate(predicate, natal, strength),
  }));
  return {
    ...route,
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

function adjudicatePattern(natal, strength) {
  const rule = BAZI_MONTH_COMMAND_PATTERN_RULES[natal.commandGod];
  if (!rule || !natal.commandStem) {
    return {
      lens: "格局",
      source: BAZI_VIEW_DEFINITIONS.pattern,
      hypothesis: makeHypothesis({
        id: "H-BZ-PATTERN-PRIMARY",
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
  const transparent = natal.visiblePillars.filter((pillar) => pillar.heavenly_stem === natal.commandStem);
  const formationRoutes = rule.formation_routes.map((route) => evaluatePatternRoute(route, natal, strength));
  const damageRoutes = rule.damage_routes.map((route) => evaluatePatternRoute(route, natal, strength));
  const rescueRoutes = rule.rescue_routes.map((route) => evaluatePatternRoute(route, natal, strength));
  const matchedFormation = formationRoutes.filter((route) => route.matched);
  const matchedDamage = damageRoutes.filter((route) => route.matched);
  const matchedRescue = rescueRoutes.filter((route) => (
    route.matched && matchedDamage.some((damageRoute) => damageRoute.id === route.for_damage)
  ));
  const support = [
    factEvidence(natal.month.fact_id, `月令本气${natal.commandStem}与日主构成${natal.commandGod}，只先立${rule.label}，不因格名自动判成。`),
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
      const closedDamage = matchedDamage.filter((route) => route.closure === "closed");
      const unrescuedClosed = closedDamage.filter((damageRoute) => !matchedRescue.some((route) => (
        route.for_damage === damageRoute.id && route.closure === "closed"
      )));
      const screeningDamage = matchedDamage.filter((route) => route.closure !== "closed");
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
    id: "H-BZ-PATTERN-PRIMARY",
    label: rule.label,
    state,
    supportingEvidence: support,
    contraryEvidence: contrary,
    changeConditions: [
      `若月令本气${natal.commandStem}的透藏关系核对有误，${rule.label}需撤回。`,
      "若合化、制化、位置或根气核验改变某条复合路线，必须重新走成立—受损—救应链。",
      "没有编码完成的成败路线只保留候选，不得由模型补成成立或破格。",
    ],
  });
  const rescueEvidence = matchedRescue.flatMap((route) => routeEvidence(route));
  return {
    lens: "格局",
    source: { ...BAZI_VIEW_DEFINITIONS.pattern, rule_source_status: rule.source_status, rule_source_refs: rule.source_refs },
    hypothesis,
    command: { stem: natal.commandStem, ten_god: natal.commandGod, fact_id: natal.month.fact_id },
    transparent_fact_ids: transparent.map((pillar) => pillar.fact_id),
    formation: {
      matched_routes: matchedFormation.map((route) => ({ id: route.id, label: route.label, fact_ids: route.fact_ids })),
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
      active_damage_routes: matchedDamage.map((route) => ({ id: route.id, label: route.label, closure: route.closure, fact_ids: route.fact_ids })),
      active_rescue_routes: matchedRescue.map((route) => ({ id: route.id, label: route.label, for_damage: route.for_damage, closure: route.closure, fact_ids: route.fact_ids })),
      coverage: "只裁决《子平真诠》第九章中已编码且当前事实能够直接核对的复合路线；轻重、位置、合而能化等未闭合条件不补算。",
    },
    conclusion: state === BAZI_ADJUDICATION_STATES.established
      ? `${rule.label}命中${matchedFormation.map((route) => route.label).join("、")}的已编码成格路线，尚未见已编码直接破坏。`
      : state === BAZI_ADJUDICATION_STATES.rescued
        ? `${rule.label}先命中${matchedDamage.map((route) => route.label).join("、")}，再由${matchedRescue.map((route) => route.label).join("、")}形成配对救应；不能省略中间受损环节。`
      : state === BAZI_ADJUDICATION_STATES.broken
          ? `${rule.label}已经成立但命中${matchedDamage.map((route) => route.label).join("、")}，且已编码的对应救应未成立，当前路线按破格处理。`
          : state === BAZI_ADJUDICATION_STATES.damaged
            ? `${rule.label}已经成立并命中${matchedDamage.map((route) => route.label).join("、")}；相关轻重、位置或制化尚未闭合，只判受损，不越级判破格或救应。`
            : `${rule.label}目前只有月令候选；${formationRoutes.length ? "已编码成格路线的复合条件尚未齐" : "该格的机器成格路线尚未安装"}。`,
  };
}

function patternDirection(pattern, natal) {
  if (pattern.hypothesis.state === BAZI_ADJUDICATION_STATES.rescued && pattern.rescue.length) {
    return unique(pattern.rescue.map((item) => item.statement.match(/干([^，]+)透出/u)?.[1]));
  }
  const rule = BAZI_MONTH_COMMAND_PATTERN_RULES[natal.commandGod];
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
  const climateView = {
    lens: "调候",
    state: BAZI_ADJUDICATION_STATES.unresolved,
    proposed_directions: [],
    conclusion: "调候规则尚未作为可重放计算事实安装；外部自报来源状态不参与裁决，因此调候保持未决。",
    source: BAZI_VIEW_DEFINITIONS.climate,
  };
  const passageView = {
    lens: "通关",
    state: BAZI_ADJUDICATION_STATES.unresolved,
    proposed_directions: [],
    conclusion: "通关规则尚未作为可重放计算事实安装；外部自报对立力量与中介不参与裁决，因此通关保持未决。",
    source: BAZI_VIEW_DEFINITIONS.passage,
  };
  const closedDamageRoutes = pattern.route_adjudication.active_damage_routes.filter((route) => route.closure === "closed");
  const screeningDamageRoutes = pattern.route_adjudication.active_damage_routes.filter((route) => route.closure !== "closed");
  const closedDamageIds = new Set(closedDamageRoutes.map((route) => route.id));
  const closedRescueRoutes = pattern.route_adjudication.active_rescue_routes.filter((route) => (
    route.closure === "closed" && closedDamageIds.has(route.for_damage)
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
  return unique(interactions.map((item) => INTERACTION_LABELS[item.relationship] || item.relationship));
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
  const tendency = SUPPORT_GODS.has(value.ten_god_stem) ? "生扶一侧" : "克、泄或耗的一侧";
  const relevantInteractions = interactions.filter((item) => item.layer_fact_ids?.includes(value.fact_id));
  const interactionLabels = interactionSummary(relevantInteractions);
  const patternEffect = periodPatternEffect(value, patternRule);
  const theme = TEN_GOD_THEME[value.ten_god_stem] || "阶段条件";
  const interactionText = interactionLabels.length
    ? `并通过${interactionLabels.join("、")}与原局或另一时间层发生结构联系`
    : "但在当前闭合关系表中未见与原局或另一时间层的明确结构联系";
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
      label: INTERACTION_LABELS[item.relationship] || item.relationship,
      layer_fact_ids: [...item.layer_fact_ids],
    })),
    pattern_effect: patternEffect,
    conclusion: role === "environment"
      ? `这步大运以${value.ten_god_stem}为显性环境，较强调${theme}，偏向${tendency}，${interactionText}；环境会改变条件是否容易发挥，但不改写原局基线。`
      : `这个流年只把${value.ten_god_stem}所代表的${theme}作为触发，${interactionText}；它不能单独推出具体事件。`,
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
  };
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

function phaseLayers(pattern, calculation) {
  const resolved = resolvedPeriodsFromCalculation(calculation);
  const patternRule = BAZI_MONTH_COMMAND_PATTERN_RULES[pattern.command?.ten_god];
  const decadal = normalizePeriodStage(resolved.periods.decadal, "environment", patternRule, resolved.interactions);
  const yearly = normalizePeriodStage(resolved.periods.yearly, "trigger", patternRule, resolved.interactions);
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
    joint_activation: jointPeriodActivation(decadal, yearly, resolved.interactions),
    source: resolved.source,
    hierarchy: "原局是基线；大运只改变环境；流年只标记触发。后层不得反写前层。",
  };
}

function ordinarySynthesis(strength, pattern, views, conflicts, phase) {
  const unresolvedViews = views.filter((view) => view.state === BAZI_ADJUDICATION_STATES.unresolved).map((view) => view.lens);
  const patternPlain = pattern.hypothesis.state === BAZI_ADJUDICATION_STATES.established
    ? `${pattern.hypothesis.label}目前结构清楚。`
    : pattern.hypothesis.state === BAZI_ADJUDICATION_STATES.rescued
      ? `${pattern.hypothesis.label}不是一路顺成，而是先遇到牵制，再由另一项条件补救。`
      : pattern.hypothesis.state === BAZI_ADJUDICATION_STATES.broken
        ? `${pattern.hypothesis.label}虽有起点，但关键牵制尚未得到化解。`
        : pattern.hypothesis.state === BAZI_ADJUDICATION_STATES.damaged
          ? `${pattern.hypothesis.label}已命中成格路线，也见到牵制；因轻重、位置或制化尚未闭合，目前只判受损。`
          : `${pattern.hypothesis.label}目前只能作为候选，不能直接当成定局。`;
  const strengthPlain = strength.selected_hypothesis_id
    ? strength.conclusion
    : "日主承载力同时见到支持和压力，当前不勉强贴强弱标签。";
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
    conclusion: conflicts.length
      ? `${pattern.conclusion} 取用视角存在明确分歧，当前并列保留。`
      : `${pattern.conclusion} 其余视角只在各自前提内补充。`,
    plain_language: `${patternPlain}${strengthPlain} 这不是把不同门派揉成一个答案，而是先说明哪条判断成立、哪里受损、有没有补救，以及哪些仍未决。`,
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
  if (calculation.facts?.mode !== "known-time") {
    return unavailableResult(calculation, replayStatus, "出生时辰未知时，不创建完整旺衰、格局或用神裁决。");
  }
  const natal = readNatalFacts(calculation);
  if (!natal || !TEN_GODS.has(natal.commandGod)) {
    return unavailableResult(calculation, replayStatus, "月令本气、十神或四柱事实不完整，无法建立候选。 ");
  }
  const strength = adjudicateStrength(natal);
  const pattern = adjudicatePattern(natal, strength);
  const views = usefulGodViews(strength, pattern, natal);
  const conflicts = lensConflicts(views);
  const phase = phaseLayers(pattern, calculation);
  const synthesis = ordinarySynthesis(strength, pattern, views, conflicts, phase);
  return deepFreeze({
    schema_version: "bazi-adjudication-v0.4",
    status: "completed",
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
  });
}
