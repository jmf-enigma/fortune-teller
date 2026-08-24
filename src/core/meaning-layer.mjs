import { isDeepStrictEqual } from "node:util";
import { verifyCalculationFacts } from "./calculation-verifier.mjs";
import { verifyCalculationEnvelope } from "./result.mjs";
import {
  ZIWEI_MEANING_REGISTRY_META,
  getZiweiMajorStarMeaning,
  getZiweiTopicMeaning,
  getZiweiTransformationMeaning,
} from "../data/meaning-registry.mjs";
import {
  getZiweiContextStarModifier,
  getZiweiMajorStarCombination,
  getZiweiPeriodStarModifier,
} from "../data/ziwei-sanhe-rulepack.mjs";

export const ZIWEI_MEANING_BINDING_SCHEMA = "fortune-teller/ziwei-meaning-binding/v2";
const BINDING_SCHEMA = ZIWEI_MEANING_BINDING_SCHEMA;
const CANONICAL_NARRATIVE_FIELDS = [
  "statement",
  "reasoning_summary",
  "alternative_readings",
  "practical_reflection",
  "assessment",
];
const ROUTE_BY_SCOPE = new Map([
  ["topic_synthesis", {
    rule_id: "R-ZW-007",
    route: "natal_topic_axes",
    assessment_modes: ["current_reflection"],
    default_assessment_mode: "current_reflection",
    criterion_route: "NATAL",
  }],
  ["topic_transformation", {
    rule_id: "R-ZW-008",
    route: "natal_transformation_process",
    assessment_modes: ["current_reflection"],
    default_assessment_mode: "current_reflection",
    criterion_route: "PROCESS",
  }],
  ["phase_topic_synthesis", {
    rule_id: "R-ZW-009",
    route: "bounded_phase_theme",
    assessment_modes: ["bounded_phase", "prospective_hypothesis"],
    default_assessment_mode: "bounded_phase",
    criterion_route: "PHASE",
  }],
]);
const TOPIC_CODES = new Map([
  ["overview", "OV"],
  ["career_study", "CS"],
  ["wealth_resources", "WR"],
  ["relationships", "RL"],
  ["wellbeing_rhythm", "WB"],
]);

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function unavailable(reasonCode, reasonZh, details = {}) {
  return {
    ok: false,
    status: "unavailable",
    reason_code: reasonCode,
    reason_zh: reasonZh,
    fallback: {
      level: "standard",
      mode: "calculation_only",
      reason_zh: "保留已核验的排盘事实，停止生成机器绑定的深层含义。",
    },
    ...details,
  };
}

function escapePointerToken(token) {
  return token.replaceAll("~", "~0").replaceAll("/", "~1");
}

function collectFacts(value, path = "/facts", target = new Map()) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectFacts(item, `${path}/${index}`, target));
    return target;
  }
  if (!isRecord(value)) return target;
  if (typeof value.fact_id === "string" && value.fact_id) {
    target.set(value.fact_id, { path, value });
  }
  for (const [key, child] of Object.entries(value)) {
    collectFacts(child, `${path}/${escapePointerToken(key)}`, target);
  }
  return target;
}

function pathMatches(path, prefix) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function normalizedRuleIds(applicableRules, claim) {
  const source = applicableRules == null ? claim?.rule_ids : applicableRules;
  const values = source instanceof Set ? [...source] : Array.isArray(source) ? source : [];
  return new Set(values.flatMap((value) => {
    if (typeof value === "string" && value) return [value];
    if (isRecord(value) && typeof value.id === "string" && value.id) return [value.id];
    return [];
  }));
}

function hasEveryFactId(claim, factIds) {
  if (!Array.isArray(claim?.fact_ids)) return false;
  const cited = new Set(claim.fact_ids);
  return factIds.every((factId) => typeof factId === "string" && cited.has(factId));
}

function canonicalDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function registeredMajorStars(palace) {
  if (!Array.isArray(palace?.major_stars)) return { ok: false, reason: "宫位事实缺少 major_stars 数组" };
  const seen = new Set();
  const records = [];
  for (const star of palace.major_stars) {
    const meaning = getZiweiMajorStarMeaning(star?.name);
    if (!meaning) {
      return { ok: false, reason: `宫位事实含有未登记或畸形的主星 ${String(star?.name)}` };
    }
    if (seen.has(star.name)) return { ok: false, reason: `宫位事实重复登记主星 ${star.name}` };
    seen.add(star.name);
    records.push({
      meaning_id: meaning.meaning_id,
      fact_id: palace.fact_id,
      star: star.name,
      palace: palace.name,
    });
  }
  return { ok: true, records };
}

function derivePalaceAxisGroups(unit, facts) {
  const components = Array.isArray(unit?.component_palace_ids) ? unit.component_palace_ids : [];
  const relation = facts.get(unit?.relation_fact_id);
  const relationValue = relation?.value;
  if (
    components.length !== 4
    || new Set(components).size !== 4
    || !components.includes(unit?.primary_palace_id)
    || !relation
    || !pathMatches(relation.path, "/facts/structure/palace_relations")
    || relationValue?.focus_palace_id !== unit?.primary_palace_id
    || !Array.isArray(relationValue?.trine_palace_ids)
    || relationValue.trine_palace_ids.length !== 2
    || typeof relationValue?.opposite_palace_id !== "string"
    || !isDeepStrictEqual(relationValue?.four_directions_palace_ids, components)
  ) {
    return unavailable(
      "INVALID_FOUR_PALACE_STRUCTURE",
      "主题单元没有与主宫、两组三方和对宫的精确关系事实完整对应。",
    );
  }
  const groupSpecs = [
    { relation_role: "focus", relation_offset: 0, fact_id: relationValue.focus_palace_id },
    { relation_role: "trine_plus_4", relation_offset: 4, fact_id: relationValue.trine_palace_ids[0] },
    { relation_role: "trine_plus_8", relation_offset: 8, fact_id: relationValue.trine_palace_ids[1] },
    { relation_role: "opposite_plus_6", relation_offset: 6, fact_id: relationValue.opposite_palace_id },
  ];
  if (!isDeepStrictEqual(components, groupSpecs.map((spec) => spec.fact_id))) {
    return unavailable(
      "INVALID_FOUR_PALACE_ORDER",
      "主题单元的四宫顺序必须与焦点、顺向四位、顺向八位、对向六位的关系顺序完全一致。",
    );
  }
  const groups = [];
  for (const spec of groupSpecs) {
    const palace = facts.get(spec.fact_id);
    if (!palace || !pathMatches(palace.path, "/facts/palaces")) {
      return unavailable(
        "INVALID_FOUR_PALACE_COMPONENT",
        "至少一个三方四正宫位没有与关系事实中的精确宫位对应。",
      );
    }
    const stars = registeredMajorStars(palace.value);
    if (!stars.ok) return unavailable("UNREGISTERED_COMPONENT_MAJOR_STAR", stars.reason);
    groups.push({
      relation_role: spec.relation_role,
      relation_offset: spec.relation_offset,
      palace: { fact_id: palace.value.fact_id, name: palace.value.name },
      major_star_axes: stars.records,
    });
  }
  if (groups[0].major_star_axes.length === 0) {
    return unavailable(
      "NO_REGISTERED_MAJOR_STAR",
      "所选主题主宫没有任何已登记的十四主星含义；不能借用三方或对宫主星充当主宫。",
    );
  }
  return {
    ok: true,
    groups,
    source_fact_ids: [
      unit.fact_id,
      unit.relation_fact_id,
      ...groupSpecs.map((spec) => spec.fact_id),
    ],
  };
}

function baseBinding(route, assessmentMode, topicMeaning, topicUnit, primaryPalace) {
  return {
    schema: BINDING_SCHEMA,
    registry_id: ZIWEI_MEANING_REGISTRY_META.registry_id,
    system: "ziwei",
    origin: ZIWEI_MEANING_REGISTRY_META.origin,
    review_status: ZIWEI_MEANING_REGISTRY_META.review_status,
    predictive_validity: ZIWEI_MEANING_REGISTRY_META.predictive_validity,
    professional_label_allowed: ZIWEI_MEANING_REGISTRY_META.professional_label_allowed,
    event_generation: ZIWEI_MEANING_REGISTRY_META.event_generation,
    rule_id: route.rule_id,
    route: route.route,
    assessment_mode: assessmentMode,
    topic: topicMeaning.topic,
    topic_meaning_id: topicMeaning.meaning_id,
    topic_unit_id: topicUnit.fact_id,
    primary_palace: {
      fact_id: primaryPalace.fact_id,
      name: primaryPalace.name,
    },
    palace_axis_groups: [],
    transformation_lenses: [],
  };
}

function resolveNatalContext(claim, facts, expectedPrefix = "/facts/topic_units") {
  if (typeof claim?.topic_unit_id !== "string" || !claim.topic_unit_id) {
    return unavailable("MISSING_TOPIC_UNIT", "深层含义需要一个明确的主题单元。");
  }
  const resolvedUnit = facts.get(claim.topic_unit_id);
  if (!resolvedUnit || !pathMatches(resolvedUnit.path, expectedPrefix)) {
    return unavailable("INVALID_TOPIC_UNIT", "主题单元不是本次排盘中相应类型的精确事实。");
  }
  const topicMeaning = getZiweiTopicMeaning(claim.topic);
  if (!topicMeaning || resolvedUnit.value.topic !== claim.topic) {
    return unavailable("UNREGISTERED_OR_MISMATCHED_TOPIC", "所选主题未登记，或与主题单元不一致。");
  }
  const primaryPalaceId = expectedPrefix === "/facts/phase_topic_units"
    ? resolvedUnit.value.natal_palace_id
    : resolvedUnit.value.primary_palace_id;
  const primaryPalace = facts.get(primaryPalaceId);
  if (
    !primaryPalace
    || !pathMatches(primaryPalace.path, "/facts/palaces")
    || primaryPalace.value.name !== topicMeaning.primary_palace
  ) {
    return unavailable("INVALID_PRIMARY_PALACE", "主题主宫未能与本次排盘及登记主题精确对应。");
  }
  return {
    ok: true,
    unit: resolvedUnit.value,
    unit_path: resolvedUnit.path,
    topic_meaning: topicMeaning,
    primary_palace: primaryPalace.value,
  };
}

function deriveNatalTopicAxes(claim, facts, route, assessmentMode) {
  const context = resolveNatalContext(claim, facts);
  if (!context.ok) return context;
  const unit = context.unit;
  const components = Array.isArray(unit.component_palace_ids) ? unit.component_palace_ids : [];
  const required = [...new Set([unit.fact_id, unit.primary_palace_id, unit.relation_fact_id, ...components])];
  if (
    components.length !== 4
    || new Set(components).size !== 4
    || !components.includes(unit.primary_palace_id)
    || !hasEveryFactId(claim, required)
  ) {
    return unavailable(
      "INCOMPLETE_NATAL_TOPIC_EVIDENCE",
      "所选主题没有完整引用主题、主宫与三方四正的全部精确事实，不能生成深层含义。",
    );
  }
  const axes = derivePalaceAxisGroups(unit, facts);
  if (!axes.ok) return axes;
  const binding = baseBinding(route, assessmentMode, context.topic_meaning, unit, context.primary_palace);
  binding.palace_axis_groups = axes.groups;
  binding.source_fact_ids = axes.source_fact_ids;
  return { ok: true, status: "generated", binding };
}

function deriveNatalTransformation(claim, facts, route, assessmentMode) {
  const context = resolveNatalContext(claim, facts);
  if (!context.ok) return context;
  const unit = context.unit;
  const permittedTransformationIds = Array.isArray(unit.natal_mutagen_fact_ids)
    ? [...unit.natal_mutagen_fact_ids]
    : [];
  if (permittedTransformationIds.length === 0) {
    return unavailable(
      "NO_REGISTERED_TOPIC_TRANSFORMATION",
      "所选主题没有可登记的本命四化，不能生成四化过程深读。",
    );
  }
  const lenses = [];
  const required = new Set([unit.fact_id, unit.primary_palace_id]);
  for (const transformationId of permittedTransformationIds) {
    const resolved = facts.get(transformationId);
    const value = resolved?.value;
    const meaning = getZiweiTransformationMeaning(value?.mutagen);
    const exact = resolved
      && pathMatches(resolved.path, "/facts/structure/mutagen_locations")
      && meaning;
    if (!exact) {
      return unavailable(
        "INVALID_TRANSFORMATION_BINDING",
        "至少一个过程含义没有与所选主题内的星曜、四化标签和宫位事实精确对应。",
      );
    }
    const palace = facts.get(value.palace_id);
    if (
      !palace
      || !pathMatches(palace.path, "/facts/palaces")
      || palace.value.name !== value.palace
      || !hasEveryFactId(claim, [unit.fact_id, unit.primary_palace_id, value.palace_id, transformationId])
    ) {
      return unavailable(
        "INCOMPLETE_TRANSFORMATION_EVIDENCE",
        "过程含义没有完整引用主题、主宫、四化所在宫位和四化事实。",
      );
    }
    required.add(value.palace_id);
    required.add(transformationId);
    lenses.push({
      meaning_id: meaning.meaning_id,
      fact_id: transformationId,
      star: value.star,
      transformation: value.mutagen,
      palace: value.palace,
    });
  }
  lenses.sort((left, right) => left.fact_id.localeCompare(right.fact_id) || left.meaning_id.localeCompare(right.meaning_id));
  const binding = baseBinding(route, assessmentMode, context.topic_meaning, unit, context.primary_palace);
  binding.transformation_lenses = lenses;
  binding.source_fact_ids = [...required].sort();
  return { ok: true, status: "generated", binding };
}

function derivePeriodTransformationLenses(unit, facts, decadalSlot, yearlySlot) {
  const lenses = [];
  const deriveScope = (scope, ids, slot) => {
    const expectedPrefix = `/facts/periods/${scope}/mutagens`;
    for (const factId of ids) {
      const resolved = facts.get(factId);
      const value = resolved?.value;
      const meaning = getZiweiTransformationMeaning(value?.transformation);
      const location = Array.isArray(value?.natal_locations)
        ? value.natal_locations.find((item) => item.natal_palace_id === slot.value.natal_palace_id)
        : null;
      if (!resolved || !pathMatches(resolved.path, expectedPrefix) || !meaning || !location) {
        return unavailable(
          "INVALID_PERIOD_TRANSFORMATION",
          "阶段四化没有与对应的大限或流年主题槽及本命落点精确对应。",
        );
      }
      lenses.push({
        meaning_id: meaning.meaning_id,
        fact_id: factId,
        scope,
        star: value.star,
        transformation: value.transformation,
        palace: unit.palace_name,
        natal_palace: location.natal_palace_name,
      });
    }
    return null;
  };
  const decadalIds = Array.isArray(unit.decadal_transformation_fact_ids)
    ? unit.decadal_transformation_fact_ids : [];
  const yearlyIds = Array.isArray(unit.yearly_transformation_fact_ids)
    ? unit.yearly_transformation_fact_ids : [];
  const decadalError = deriveScope("decadal", decadalIds, decadalSlot);
  if (decadalError) return decadalError;
  const yearlyError = deriveScope("yearly", yearlyIds, yearlySlot);
  if (yearlyError) return yearlyError;
  if (lenses.length === 0) {
    return unavailable(
      "NO_BOUND_PHASE_PROCESS_LENS",
      "该目标主题的阶段槽没有已登记的大限或流年四化过程线索，不能把本命主题重复包装成阶段深读。",
    );
  }
  lenses.sort((left, right) => left.scope.localeCompare(right.scope)
    || left.fact_id.localeCompare(right.fact_id)
    || left.meaning_id.localeCompare(right.meaning_id));
  return { ok: true, lenses, fact_ids: [...decadalIds, ...yearlyIds] };
}

function derivePeriodConditionGroups(unit, facts, scope) {
  const ids = Array.isArray(unit?.[`${scope}_component_star_palace_ids`])
    ? unit[`${scope}_component_star_palace_ids`] : [];
  const offsets = Array.isArray(unit?.component_relation_offsets)
    ? unit.component_relation_offsets : [];
  const roles = ["focus", "trine_plus_4", "trine_plus_8", "opposite_plus_6"];
  if (
    ids.length !== 4
    || new Set(ids).size !== 4
    || !isDeepStrictEqual(offsets, [0, 4, 8, 6])
    || ids[0] !== unit?.[`${scope}_star_palace_id`]
  ) {
    return unavailable(
      "INVALID_PERIOD_FOUR_PALACE_STRUCTURE",
      `${scope === "decadal" ? "大限" : "流年"}主题没有完整的焦点、两组三方与对向动态槽。`,
    );
  }
  const groups = [];
  for (let index = 0; index < ids.length; index += 1) {
    const resolved = facts.get(ids[index]);
    const value = resolved?.value;
    if (!resolved || !pathMatches(resolved.path, `/facts/periods/${scope}/star_palaces`)) {
      return unavailable(
        "INVALID_PERIOD_FOUR_PALACE_COMPONENT",
        `${scope === "decadal" ? "大限" : "流年"}四宫动态槽含有错层或未知事实。`,
      );
    }
    if (index === 0 && value.period_palace_name !== unit.palace_name) {
      return unavailable(
        "MISMATCHED_PERIOD_FOCUS_PALACE",
        `${scope === "decadal" ? "大限" : "流年"}焦点动态槽没有保持同一主题宫位。`,
      );
    }
    const stars = Array.isArray(value.stars) ? value.stars : null;
    if (!stars) {
      return unavailable("MALFORMED_PERIOD_STARS", "阶段动态槽缺少可核对的星曜数组。");
    }
    const seen = new Set();
    const modifiers = [];
    for (const star of stars) {
      const meaning = getZiweiPeriodStarModifier(star?.name);
      if (!meaning || seen.has(star.name)) {
        return unavailable(
          "UNREGISTERED_PERIOD_STAR",
          "阶段动态槽含有未登记、畸形或重复的运限星曜，停止专业阶段综合。",
        );
      }
      seen.add(star.name);
      modifiers.push({
        fact_id: value.fact_id,
        star: star.name,
        modifier_class: meaning.modifier_class,
        plain_zh: meaning.plain_zh,
      });
    }
    groups.push({
      relation_role: roles[index],
      relation_offset: offsets[index],
      slot: {
        fact_id: value.fact_id,
        period_palace_name: value.period_palace_name,
        natal_palace_name: value.natal_palace_name,
      },
      modifiers,
    });
  }
  return { ok: true, groups, fact_ids: [...ids] };
}

function deriveBoundedPhase(claim, facts, route, assessmentMode) {
  const context = resolveNatalContext(claim, facts, "/facts/phase_topic_units");
  if (!context.ok) return context;
  const unit = context.unit;
  if (unit.palace_name !== context.topic_meaning.primary_palace) {
    return unavailable("MISMATCHED_PHASE_TOPIC", "阶段主题没有保持同一登记主题与同一宫位。");
  }
  const natalUnit = facts.get(unit.natal_topic_unit_id);
  const decadalSlot = facts.get(unit.decadal_star_palace_id);
  const yearlySlot = facts.get(unit.yearly_star_palace_id);
  const target = facts.get(unit.target_fact_id);
  const phaseValidity = facts.get(unit.phase_validity_fact_id);
  const periodLenses = decadalSlot && yearlySlot
    ? derivePeriodTransformationLenses(unit, facts, decadalSlot, yearlySlot)
    : unavailable("MISSING_PHASE_SLOTS", "阶段主题缺少大限或流年主题槽。 ");
  if (!periodLenses.ok) return periodLenses;
  const decadalConditions = derivePeriodConditionGroups(unit, facts, "decadal");
  if (!decadalConditions.ok) return decadalConditions;
  const yearlyConditions = derivePeriodConditionGroups(unit, facts, "yearly");
  if (!yearlyConditions.ok) return yearlyConditions;
  const natalComponents = Array.isArray(natalUnit?.value?.component_palace_ids)
    ? natalUnit.value.component_palace_ids : [];
  const required = [...new Set([
    unit.fact_id,
    unit.natal_topic_unit_id,
    natalUnit?.value?.relation_fact_id,
    ...natalComponents,
    unit.target_fact_id,
    unit.phase_validity_fact_id,
    unit.decadal_star_palace_id,
    unit.yearly_star_palace_id,
    ...decadalConditions.fact_ids,
    ...yearlyConditions.fact_ids,
    ...periodLenses.fact_ids,
  ])];
  const structureIsExact = natalUnit
    && pathMatches(natalUnit.path, "/facts/topic_units")
    && natalUnit.value.topic === claim.topic
    && natalUnit.value.primary_palace_id === unit.natal_palace_id
    && natalComponents.length === 4
    && new Set(natalComponents).size === 4
    && decadalSlot
    && pathMatches(decadalSlot.path, "/facts/periods/decadal/star_palaces")
    && decadalSlot.value.period_palace_name === unit.palace_name
    && yearlySlot
    && pathMatches(yearlySlot.path, "/facts/periods/yearly/star_palaces")
    && yearlySlot.value.period_palace_name === unit.palace_name
    && target
    && pathMatches(target.path, "/facts/periods/target")
    && canonicalDate(target.value.requested_date)
    && phaseValidity
    && pathMatches(phaseValidity.path, "/facts/periods/phase_validity")
    && canonicalDate(phaseValidity.value.valid_from)
    && canonicalDate(phaseValidity.value.valid_to)
    && phaseValidity.value.valid_from <= target.value.requested_date
    && target.value.requested_date <= phaseValidity.value.valid_to
    && hasEveryFactId(claim, required);
  if (!structureIsExact) {
    return unavailable(
      "INCOMPLETE_OR_MIXED_PHASE_EVIDENCE",
      "阶段含义需要同一主题下完整且一致的本盘、长期阶段、年度阶段与目标日期事实。",
    );
  }
  const axes = derivePalaceAxisGroups(natalUnit.value, facts);
  if (!axes.ok) return axes;
  const binding = baseBinding(route, assessmentMode, context.topic_meaning, unit, context.primary_palace);
  binding.palace_axis_groups = axes.groups;
  binding.transformation_lenses = periodLenses.lenses;
  binding.phase = {
    target_fact_id: unit.target_fact_id,
    requested_date: target.value.requested_date,
    phase_validity_fact_id: unit.phase_validity_fact_id,
    yearly_calendar_year: phaseValidity.value.yearly_calendar_year,
    boundary_conventions: phaseValidity.value.boundary_conventions,
    window: {
      kind: "bounded",
      start: phaseValidity.value.valid_from,
      end: phaseValidity.value.valid_to,
    },
    natal_topic_unit_id: unit.natal_topic_unit_id,
    decadal_star_palace_id: unit.decadal_star_palace_id,
    yearly_star_palace_id: unit.yearly_star_palace_id,
    decadal_component_star_palace_ids: [...decadalConditions.fact_ids],
    yearly_component_star_palace_ids: [...yearlyConditions.fact_ids],
    component_relation_offsets: [0, 4, 8, 6],
  };
  binding.source_fact_ids = [...new Set([
    unit.fact_id,
    ...axes.source_fact_ids,
    unit.target_fact_id,
    unit.phase_validity_fact_id,
    unit.decadal_star_palace_id,
    unit.yearly_star_palace_id,
    ...decadalConditions.fact_ids,
    ...yearlyConditions.fact_ids,
    ...periodLenses.fact_ids,
  ])];
  return { ok: true, status: "generated", binding };
}

/**
 * Derive one closed-vocabulary Zi Wei meaning binding.
 *
 * Success: { ok: true, status: "generated", binding }
 * Graceful refusal: { ok: false, status: "unavailable", reason_code,
 * reason_zh, fallback }
 *
 * `applicableRules` accepts rule objects, rule IDs, or a Set of either. When it
 * is omitted, claim.rule_ids is used. The function never mutates its inputs.
 */
export function deriveZiweiMeaningBinding(claim, calculation, applicableRules = null) {
  if (!isRecord(claim)) return unavailable("INVALID_CLAIM", "需要一个结构化 claim 才能推导含义绑定。");
  if (!isRecord(calculation) || calculation.system !== "ziwei" || !isRecord(calculation.facts)) {
    return unavailable("INVALID_ZIWEI_CALCULATION", "含义层只接受一份完整的紫微斗数计算结果。");
  }
  try {
    const envelopeErrors = verifyCalculationEnvelope(calculation);
    if (envelopeErrors.length) {
      return unavailable("UNVERIFIED_CALCULATION_ENVELOPE", `紫微计算封装未通过核验：${envelopeErrors[0]}`);
    }
    const factVerification = verifyCalculationFacts(calculation);
    if (factVerification.errors.length) {
      return unavailable("UNREPLAYABLE_CALCULATION", `紫微事实未通过当前引擎重算：${factVerification.errors[0]}`);
    }
  } catch {
    return unavailable("UNREPLAYABLE_CALCULATION", "紫微事实无法安全重算，停止生成深层含义。");
  }
  if (claim.system !== "ziwei") return unavailable("SYSTEM_MISMATCH", "claim.system 必须与紫微计算一致。");
  const route = ROUTE_BY_SCOPE.get(claim.scope);
  if (!route) return unavailable("UNSUPPORTED_MEANING_SCOPE", "该 scope 不在机器绑定的紫微深层含义范围内。");
  const claimRules = new Set(Array.isArray(claim.rule_ids) ? claim.rule_ids : []);
  const availableRules = normalizedRuleIds(applicableRules, claim);
  if (!claimRules.has(route.rule_id) || !availableRules.has(route.rule_id)) {
    return unavailable("MISSING_APPLICABLE_RULE", `该含义路径需要适用规则 ${route.rule_id}。`);
  }
  const requestedAssessmentMode = claim.assessment?.mode ?? route.default_assessment_mode;
  if (!route.assessment_modes.includes(requestedAssessmentMode)) {
    return unavailable(
      "UNSUPPORTED_ASSESSMENT_MODE",
      `该含义路径只允许 ${route.assessment_modes.join("、")}，不能生成其他类型的判断。`,
    );
  }
  const facts = collectFacts(calculation.facts);
  if (route.rule_id === "R-ZW-007") return deriveNatalTopicAxes(claim, facts, route, requestedAssessmentMode);
  if (route.rule_id === "R-ZW-008") return deriveNatalTransformation(claim, facts, route, requestedAssessmentMode);
  return deriveBoundedPhase(claim, facts, route, requestedAssessmentMode);
}

function inspectBinding(binding, calculation) {
  const errors = [];
  if (!isRecord(binding)) return { errors: ["binding must be an object"] };
  if (!isRecord(calculation) || calculation.system !== "ziwei" || !isRecord(calculation.facts)) {
    return { errors: ["calculation must be a Zi Wei calculation"] };
  }
  try {
    const envelopeErrors = verifyCalculationEnvelope(calculation);
    if (envelopeErrors.length) {
      return { errors: [`calculation envelope is invalid: ${envelopeErrors[0]}`] };
    }
    const factVerification = verifyCalculationFacts(calculation);
    if (factVerification.errors.length) {
      return { errors: [`calculation facts do not match a current-engine replay: ${factVerification.errors[0]}`] };
    }
  } catch {
    return { errors: ["calculation cannot be safely replayed by the current engine"] };
  }
  const expectedMeta = {
    schema: BINDING_SCHEMA,
    registry_id: ZIWEI_MEANING_REGISTRY_META.registry_id,
    system: "ziwei",
    origin: ZIWEI_MEANING_REGISTRY_META.origin,
    review_status: ZIWEI_MEANING_REGISTRY_META.review_status,
    predictive_validity: ZIWEI_MEANING_REGISTRY_META.predictive_validity,
    professional_label_allowed: ZIWEI_MEANING_REGISTRY_META.professional_label_allowed,
    event_generation: ZIWEI_MEANING_REGISTRY_META.event_generation,
  };
  for (const [field, expected] of Object.entries(expectedMeta)) {
    if (binding[field] !== expected) errors.push(`${field} does not match the closed meaning registry`);
  }
  const topic = getZiweiTopicMeaning(binding.topic_meaning_id);
  if (!topic || topic.topic !== binding.topic) errors.push("topic meaning is unknown or mismatched");
  const route = [...ROUTE_BY_SCOPE.values()].find((candidate) => candidate.route === binding.route);
  if (
    !route
    || route.rule_id !== binding.rule_id
    || !route.assessment_modes.includes(binding.assessment_mode)
  ) {
    errors.push("route, rule, and assessment mode are inconsistent");
  }
  const facts = collectFacts(calculation.facts);
  const expectedUnitPrefix = binding.route === "bounded_phase_theme"
    ? "/facts/phase_topic_units" : "/facts/topic_units";
  const topicUnit = facts.get(binding.topic_unit_id);
  if (
    !topicUnit
    || !pathMatches(topicUnit.path, expectedUnitPrefix)
    || topicUnit.value.topic !== binding.topic
  ) {
    errors.push("topic_unit_id is not the exact registered topic unit for this route");
  }
  const expectedPrimaryPalaceId = binding.route === "bounded_phase_theme"
    ? topicUnit?.value?.natal_palace_id : topicUnit?.value?.primary_palace_id;
  const primaryPalace = facts.get(binding.primary_palace?.fact_id);
  if (
    !primaryPalace
    || !pathMatches(primaryPalace.path, "/facts/palaces")
    || binding.primary_palace?.fact_id !== expectedPrimaryPalaceId
    || primaryPalace.value.name !== binding.primary_palace?.name
    || (topic && primaryPalace.value.name !== topic.primary_palace)
  ) {
    errors.push("primary palace binding is not an exact calculation fact");
  }
  const axisUnit = binding.route === "bounded_phase_theme"
    ? facts.get(topicUnit?.value?.natal_topic_unit_id)
    : topicUnit;
  let expectedGroups = [];
  let expectedAxisSourceFactIds = [];
  if (["natal_topic_axes", "bounded_phase_theme"].includes(binding.route) && primaryPalace) {
    const axes = derivePalaceAxisGroups(axisUnit?.value, facts);
    if (!axes.ok) errors.push(`${axes.reason_code}: ${axes.reason_zh}`);
    else {
      expectedGroups = axes.groups;
      expectedAxisSourceFactIds = axes.source_fact_ids;
    }
  }
  if (!isDeepStrictEqual(binding.palace_axis_groups, expectedGroups)) {
    errors.push("palace_axis_groups must equal all four exact relation groups and every registered major star in each palace");
  }

  let expectedLenses = [];
  let expectedSourceFactIds = [];
  let expectedPeriodConditionGroups = { decadal: [], yearly: [] };
  if (binding.route === "natal_topic_axes" && topicUnit) {
    expectedSourceFactIds = expectedAxisSourceFactIds;
  } else if (binding.route === "natal_transformation_process" && topicUnit) {
    const ids = Array.isArray(topicUnit.value.natal_mutagen_fact_ids)
      ? topicUnit.value.natal_mutagen_fact_ids : [];
    const sourceIds = new Set([topicUnit.value.fact_id, topicUnit.value.primary_palace_id]);
    for (const factId of ids) {
      const fact = facts.get(factId);
      const meaning = getZiweiTransformationMeaning(fact?.value?.mutagen);
      const palace = facts.get(fact?.value?.palace_id);
      if (
        !fact
        || !pathMatches(fact.path, "/facts/structure/mutagen_locations")
        || !meaning
        || !palace
        || !pathMatches(palace.path, "/facts/palaces")
        || palace.value.name !== fact.value.palace
      ) {
        errors.push("a natal transformation source fact is invalid");
        continue;
      }
      sourceIds.add(fact.value.palace_id);
      sourceIds.add(factId);
      expectedLenses.push({
        meaning_id: meaning.meaning_id,
        fact_id: factId,
        star: fact.value.star,
        transformation: fact.value.mutagen,
        palace: fact.value.palace,
      });
    }
    expectedLenses.sort((left, right) => left.fact_id.localeCompare(right.fact_id)
      || left.meaning_id.localeCompare(right.meaning_id));
    expectedSourceFactIds = [...sourceIds].sort();
  } else if (binding.route === "bounded_phase_theme" && topicUnit) {
    const decadalSlot = facts.get(topicUnit.value.decadal_star_palace_id);
    const yearlySlot = facts.get(topicUnit.value.yearly_star_palace_id);
    const derived = decadalSlot && yearlySlot
      ? derivePeriodTransformationLenses(topicUnit.value, facts, decadalSlot, yearlySlot)
      : unavailable("MISSING_PHASE_SLOTS", "阶段主题缺少大限或流年主题槽。");
    const decadalConditions = derivePeriodConditionGroups(topicUnit.value, facts, "decadal");
    const yearlyConditions = derivePeriodConditionGroups(topicUnit.value, facts, "yearly");
    if (!decadalConditions.ok) errors.push(`${decadalConditions.reason_code}: ${decadalConditions.reason_zh}`);
    if (!yearlyConditions.ok) errors.push(`${yearlyConditions.reason_code}: ${yearlyConditions.reason_zh}`);
    if (decadalConditions.ok && yearlyConditions.ok) {
      expectedPeriodConditionGroups = {
        decadal: decadalConditions.groups,
        yearly: yearlyConditions.groups,
      };
    }
    if (!derived.ok) errors.push(`${derived.reason_code}: ${derived.reason_zh}`);
    else {
      expectedLenses = derived.lenses;
      expectedSourceFactIds = [...new Set([
        topicUnit.value.fact_id,
        ...expectedAxisSourceFactIds,
        topicUnit.value.target_fact_id,
        topicUnit.value.phase_validity_fact_id,
        topicUnit.value.decadal_star_palace_id,
        topicUnit.value.yearly_star_palace_id,
        ...(decadalConditions.ok ? decadalConditions.fact_ids : []),
        ...(yearlyConditions.ok ? yearlyConditions.fact_ids : []),
        ...derived.fact_ids,
      ])];
    }
  }
  if (!isDeepStrictEqual(binding.transformation_lenses, expectedLenses)) {
    errors.push("transformation_lenses must equal every registered transformation in the exact selected topic route");
  }
  if (!isDeepStrictEqual(binding.source_fact_ids, expectedSourceFactIds)) {
    errors.push("source_fact_ids must equal the complete mechanically selected fact set");
  }

  if (binding.route === "bounded_phase_theme") {
    const target = facts.get(binding.phase?.target_fact_id);
    const validity = facts.get(binding.phase?.phase_validity_fact_id);
    const requestedDate = target?.value?.requested_date;
    const expectedPhase = topicUnit && target && validity ? {
      target_fact_id: topicUnit.value.target_fact_id,
      requested_date: requestedDate,
      phase_validity_fact_id: topicUnit.value.phase_validity_fact_id,
      yearly_calendar_year: validity.value.yearly_calendar_year,
      boundary_conventions: validity.value.boundary_conventions,
      window: {
        kind: "bounded",
        start: validity.value.valid_from,
        end: validity.value.valid_to,
      },
      natal_topic_unit_id: topicUnit.value.natal_topic_unit_id,
      decadal_star_palace_id: topicUnit.value.decadal_star_palace_id,
      yearly_star_palace_id: topicUnit.value.yearly_star_palace_id,
      decadal_component_star_palace_ids: topicUnit.value.decadal_component_star_palace_ids,
      yearly_component_star_palace_ids: topicUnit.value.yearly_component_star_palace_ids,
      component_relation_offsets: topicUnit.value.component_relation_offsets,
    } : null;
    if (
      !target
      || !pathMatches(target.path, "/facts/periods/target")
      || !validity
      || !pathMatches(validity.path, "/facts/periods/phase_validity")
      || !canonicalDate(requestedDate)
      || !isDeepStrictEqual(binding.phase, expectedPhase)
      || expectedGroups.length !== 4
      || expectedGroups[0]?.major_star_axes?.length === 0
      || expectedLenses.length === 0
      || expectedPeriodConditionGroups.decadal.length !== 4
      || expectedPeriodConditionGroups.yearly.length !== 4
    ) {
      errors.push("bounded phase must match the exact target-date decadal/yearly snapshot validity and registered meaning floor");
    }
  } else if (Object.hasOwn(binding, "phase")) {
    errors.push("only the bounded phase route may contain phase data");
  }
  const axisGroups = expectedGroups.map((group) => ({
    ...group,
    entries: group.major_star_axes.map((axis) => {
      const palace = facts.get(axis.fact_id)?.value;
      const starData = Array.isArray(palace?.major_stars)
        ? palace.major_stars.find((star) => star?.name === axis.star)
        : null;
      return {
        axis,
        group,
        meaning: getZiweiMajorStarMeaning(axis.meaning_id),
        star_data: starData,
      };
    }).filter((entry) => entry.meaning && entry.star_data),
    modifier_entries: (() => {
      const palace = facts.get(group.palace.fact_id)?.value;
      const stars = [
        ...(Array.isArray(palace?.minor_stars)
          ? palace.minor_stars.map((star) => ({ star_data: star, star_group: "minor" })) : []),
        ...(Array.isArray(palace?.adjective_stars)
          ? palace.adjective_stars.map((star) => ({ star_data: star, star_group: "adjective" })) : []),
      ];
      return stars.map((entry) => ({
        ...entry,
        meaning: getZiweiContextStarModifier(entry.star_data?.name),
      })).filter((entry) => entry.meaning);
    })(),
  }));
  for (const group of axisGroups) {
    group.combination = getZiweiMajorStarCombination(group.entries.map((entry) => entry.axis.star));
  }
  const starEntries = axisGroups.flatMap((group) => group.entries);
  const transformationEntries = expectedLenses.map((lens) => ({
    lens,
    meaning: getZiweiTransformationMeaning(lens.meaning_id),
  })).filter((entry) => entry.meaning);
  return {
    errors,
    topic,
    route,
    star_meanings: starEntries.map((entry) => entry.meaning),
    star_entries: starEntries,
    axis_groups: axisGroups,
    period_condition_groups: expectedPeriodConditionGroups,
    transformation_meanings: transformationEntries.map((entry) => entry.meaning),
    transformation_entries: transformationEntries,
  };
}

function relationRoleLabel(role) {
  if (role === "focus") return "主宫（直接做法）";
  if (role === "trine_plus_4") return "三合背景一";
  if (role === "trine_plus_8") return "三合背景二";
  return "对向背景（需要协调的一端）";
}

function palaceLabel(name) {
  return typeof name === "string" && name.endsWith("宫") ? name : `${name}宫`;
}

const BRIGHTNESS_PLAIN_ZH = new Map([
  ["庙", "表达较直接，通常较容易发挥"],
  ["旺", "力量较足，容易成为这一宫的明显倾向"],
  ["得", "具备发挥条件，但仍要看同宫与会照"],
  ["利", "在合适条件下较容易发挥"],
  ["平", "表现较中性，更依赖现实环境与选择"],
  ["不", "发挥容易受条件牵制"],
  ["陷", "较容易先表现为压力或过度的一面"],
]);

function focusBrightnessPlainSummary(axisGroups) {
  const focusGroup = axisGroups.find((group) => group.relation_role === "focus");
  const conditions = [...new Set((focusGroup?.entries || [])
    .map((entry) => BRIGHTNESS_PLAIN_ZH.get(entry.star_data?.brightness))
    .filter(Boolean))];
  return conditions.length
    ? `主宫的星曜强弱条件显示：${conditions.join("；")}`
    : "主宫没有可进一步翻成白话的星曜强弱标签";
}

function focusPlainSummary(axisGroups, side) {
  const focusGroup = axisGroups.find((group) => group.relation_role === "focus");
  if (focusGroup?.combination) {
    return side === "strength" ? focusGroup.combination.core_zh : focusGroup.combination.risk_zh;
  }
  return (focusGroup?.entries || []).map((entry) => side === "strength"
    ? entry.meaning.plain_strength_zh
    : entry.meaning.plain_risk_zh).join("；");
}

const MODIFIER_CLASS_HEADLINES = new Map([
  ["support", "协作与表达支持"],
  ["resource", "资源承托"],
  ["pressure", "摩擦或突发压力"],
  ["movement", "移动与转换"],
  ["relationship", "关系互动"],
  ["resolution", "缓冲与解题"],
]);

function natalConditionHeadline(axisGroups) {
  const labels = [...new Set(axisGroups.flatMap((group) => group.modifier_entries)
    .map((entry) => MODIFIER_CLASS_HEADLINES.get(entry.meaning.modifier_class))
    .filter(Boolean))];
  return labels.length ? `盘中还要同时考虑${labels.join("、")}` : "盘中没有本规则包已登记的额外辅煞条件";
}

function processPlainSummary(transformationEntries) {
  return transformationEntries.map((entry) => entry.meaning.process_lens_zh).join("；");
}

function transformationProcessPhrase(entry) {
  const scope = entry.lens.scope === "decadal" ? "大限"
    : entry.lens.scope === "yearly" ? "流年" : "本命";
  const location = entry.lens.scope
    ? `作用于本命${palaceLabel(entry.lens.natal_palace)}`
    : `落${palaceLabel(entry.lens.palace)}`;
  return `${scope}${entry.lens.star}化${entry.lens.transformation}${location}的过程“${entry.meaning.process_lens_zh}”`;
}

function periodScopeLabel(scope) {
  return scope === "decadal" ? "大限环境" : "流年触发";
}

function periodRelationPlainLabel(role) {
  if (role === "focus") return "主题本身";
  if (role === "trine_plus_4") return "支撑背景一";
  if (role === "trine_plus_8") return "支撑背景二";
  return "需要协调的一端";
}

function periodConditionPlainSummary(groups, scope) {
  const rows = groups.flatMap((group) => {
    if (group.modifiers.length === 0) return [];
    const conditions = [...new Set(group.modifiers.map((modifier) => (
      MODIFIER_CLASS_HEADLINES.get(modifier.modifier_class)
      || modifier.plain_zh
    )))].join("、");
    return [`${periodRelationPlainLabel(group.relation_role)}偏向${conditions}`];
  });
  return rows.length
    ? `${periodScopeLabel(scope)}里，${rows.join("；")}`
    : `${periodScopeLabel(scope)}的四个位置没有本规则包已登记的额外修饰星`;
}

function periodConditionCriteriaBasis(periodConditionGroups) {
  const rows = ["decadal", "yearly"].flatMap((scope) => {
    const groups = periodConditionGroups?.[scope] || [];
    const registered = groups.flatMap((group) => group.modifiers.map((modifier) => (
      `${periodRelationPlainLabel(group.relation_role)}的${modifier.plain_zh}`
    )));
    return registered.length ? [`${periodScopeLabel(scope)}（${registered.join("；")}）`] : [];
  });
  return rows.length ? rows.join("；") : "本阶段没有需要核对的已登记额外运限星条件";
}

function canonicalCriteria(
  binding,
  topic,
  route,
  starEntries,
  transformationEntries,
  periodConditionGroups,
) {
  const topicCode = TOPIC_CODES.get(topic.topic);
  const routeCode = route.criterion_route;
  const processBasis = transformationEntries.map(transformationProcessPhrase).join("；");
  const focusAxisBasis = starEntries
    .filter((entry) => entry.group.relation_role === "focus")
    .map((entry) => `${entry.axis.star}在${palaceLabel(entry.axis.palace)}的双向轴`)
    .join("、");
  let supportObservable;
  let contradictObservable;
  if (binding.route === "natal_topic_axes") {
    supportObservable = `至少两份相隔不少于30日的带日期同期记录，均按四个固定宫位组逐组填写；焦点必需轴（${focusAxisBasis}）逐项注明现实事项及所对应的一端，非空背景组也分别记录而不充当焦点组`;
    contradictObservable = `至少两份相隔不少于30日且四组字段完整的同期记录，均显示焦点必需轴（${focusAxisBasis}）中至少一项无法对应现实事项，并持续记录到另一个明确机制；背景组出现不能替代该反证`;
  } else if (binding.route === "natal_transformation_process") {
    supportObservable = `至少两份相隔不少于30日的带日期同期记录，在${topic.label_zh}的具体过程栏中，都能逐项归入同一冻结过程：${processBasis}`;
    contradictObservable = `至少两份相隔不少于30日且字段完整的同期记录，逐项核对后均未出现任何冻结过程（${processBasis}），并持续记录到相反或不同的现实机制`;
  } else {
    const periodBasis = periodConditionCriteriaBasis(periodConditionGroups);
    supportObservable = `在冻结区间内，至少两份相隔不少于30日的带日期同期记录，每份都在同一项${topic.label_zh}现实事项中逐项标明焦点必需轴（${focusAxisBasis}），并分别核对${periodBasis}及全部冻结主题槽阶段过程（${processBasis}）；本命、大限、流年三层不互相替代`;
    contradictObservable = `在冻结区间内，至少两份相隔不少于30日且字段完整的同期记录，均显示焦点必需轴（${focusAxisBasis}）、已登记阶段条件（${periodBasis}）或冻结主题槽阶段过程（${processBasis}）中的至少一项持续无法对应，并同时记录到另一个更明确的现实机制；背景层出现不能免除该反证`;
  }
  return [
    {
      criterion_id: `K-ZW-${topicCode}-${routeCode}-SUPPORT`,
      polarity: "supports",
      observable: supportObservable,
      evidence_source: "contemporaneous_record",
    },
    {
      criterion_id: `K-ZW-${topicCode}-${routeCode}-CONTRADICT`,
      polarity: "contradicts",
      observable: contradictObservable,
      evidence_source: "contemporaneous_record",
    },
    {
      criterion_id: `K-ZW-${topicCode}-${routeCode}-UNCLEAR`,
      polarity: "unclear",
      observable: "可用的同期记录少于两份、两份记录相隔不足30日，或记录缺少日期、同一现实事项、逐项焦点轴、逐项已登记阶段条件、逐项阶段过程或替代机制中的必要字段，因而无法按上述冻结标准判断",
      evidence_source: "contemporaneous_record",
    },
  ];
}

/**
 * Produce the complete typed relation list for one already verified binding.
 * The result is deterministic and deliberately excludes user-selected subsets.
 */
export function canonicalZiweiSemanticBindings(binding, calculation) {
  const inspected = inspectBinding(binding, calculation);
  if (inspected.errors.length) {
    throw new TypeError(`cannot bind semantics for invalid Zi Wei meaning binding: ${inspected.errors[0]}`);
  }
  const stars = inspected.star_entries.map(({ axis, star_data: starData }) => ({
    kind: "star_in_palace",
    fact_id: axis.fact_id,
    star: axis.star,
    palace: axis.palace,
    star_group: "major",
    ...(starData?.brightness ? { brightness: starData.brightness } : {}),
  }));
  const contextStars = inspected.axis_groups.flatMap((group) => (
    group.modifier_entries.map((entry) => ({
      kind: "star_in_palace",
      fact_id: group.palace.fact_id,
      star: entry.star_data.name,
      palace: group.palace.name,
      star_group: entry.star_group,
    }))
  ));
  const periodStars = ["decadal", "yearly"].flatMap((scope) => (
    inspected.period_condition_groups[scope].flatMap((group) => (
      group.modifiers.map((modifier) => ({
        kind: "period_star_in_slot",
        fact_id: group.slot.fact_id,
        topic_unit_id: binding.topic_unit_id,
        scope,
        relation_role: group.relation_role,
        star: modifier.star,
        period_palace: group.slot.period_palace_name,
        natal_palace: group.slot.natal_palace_name,
      }))
    ))
  ));
  const transformations = inspected.transformation_entries.map(({ lens }) => (
    lens.scope ? {
      kind: "period_transformation",
      fact_id: lens.fact_id,
      scope: lens.scope,
      star: lens.star,
      transformation: lens.transformation,
      natal_palace: lens.natal_palace,
    } : {
      kind: "mutagen_in_palace",
      fact_id: lens.fact_id,
      star: lens.star,
      transformation: lens.transformation,
      palace: lens.palace,
    }
  ));
  return [...stars, ...contextStars, ...periodStars, ...transformations];
}

/**
 * Render the five result-facing fields from a verified meaning binding.
 *
 * This function is deterministic. It does not use claim prose as input and it
 * never emits a named concrete event. Programmer misuse (a malformed or
 * calculation-mismatched binding) throws TypeError; ordinary domain failures
 * should be handled through deriveZiweiMeaningBinding's unavailable result.
 */
export function canonicalZiweiNarrative(binding, calculation) {
  const inspected = inspectBinding(binding, calculation);
  if (inspected.errors.length) {
    throw new TypeError(`cannot render invalid Zi Wei meaning binding: ${inspected.errors[0]}`);
  }
  const {
    topic, route, axis_groups: axisGroups, star_entries: starEntries,
    transformation_entries: transformationEntries,
    period_condition_groups: periodConditionGroups,
  } = inspected;
  const markers = topic.markers_zh.join("、");
  const processPlain = processPlainSummary(transformationEntries);
  const focusStrength = focusPlainSummary(axisGroups, "strength");
  const focusRisk = focusPlainSummary(axisGroups, "risk");
  const focusBrightness = focusBrightnessPlainSummary(axisGroups);
  const natalConditions = natalConditionHeadline(axisGroups);
  const criteria = canonicalCriteria(
    binding,
    topic,
    route,
    starEntries,
    transformationEntries,
    periodConditionGroups,
  );

  if (binding.route === "natal_topic_axes") {
    return {
      statement: `${topic.label_zh}的主线是：发挥“${focusStrength}”的能力，同时防止“${focusRisk}”。${natalConditions}。现实中重点看${markers}。这不构成具体事件判断。`,
      reasoning_summary: `这部分先看你在${topic.label_zh}里最核心的做事方式，再看哪些背景会支持或牵制它。重点不是给每颗星加分，而是看“${focusStrength}”能否反复出现，以及“${focusRisk}”是否造成实际代价。${focusBrightness}。三合和对向位置只补充背景，不能代替主宫。`,
      alternative_readings: [
        "如果连续的现实记录主要由别的原因解释，或主宫所列倾向长期对不上，就应把这条看法降级，而不是拿背景宫位补成命中。",
        "如果只有一次偶发体验，或同一件事既能解释成优势也能解释成风险，目前资料就还不够。",
      ],
      practical_reflection: `接下来一个月记下两次具体的${topic.label_zh}情境：当时你怎么做、哪里顺、哪里卡，再看主宫所列的能力与风险是否反复出现。`,
      assessment: {
        mode: "current_reflection",
        domain: topic.topic,
        window: { kind: "current" },
        criteria,
      },
    };
  }

  if (binding.route === "natal_transformation_process") {
    return {
      statement: `${topic.label_zh}还要同时留意这些过程：${processPlain}。它们说明事情更可能从哪里变顺、变忙或产生摩擦，不构成具体事件判断，也不代表某个结果必然发生。`,
      reasoning_summary: "这部分看的是事情怎样推进，不是预先判定结果好坏：哪些环节更容易得到资源、承担责任、被看见，或需要反复处理。盘里的相关变化都要一起考虑，不能只挑听起来有利的部分，也不能由任何一项直接判断具体结果。",
      alternative_readings: [
        "如果连续的现实记录都没有出现这些过程，或更能由另一个明确机制解释，这条传统解释就没有得到支持。",
        "如果只在事后回忆中觉得相似，缺少当时留下的记录，目前只能算资料不清。",
      ],
      practical_reflection: `记录两次具体过程：资源怎样进入、责任怎样增加、哪些地方反复或需要额外成本；只比较过程，不先猜结果。`,
      assessment: {
        mode: "current_reflection",
        domain: topic.topic,
        window: { kind: "current" },
        criteria,
      },
    };
  }

  const decadalPlain = periodConditionPlainSummary(periodConditionGroups.decadal, "decadal");
  const yearlyPlain = periodConditionPlainSummary(periodConditionGroups.yearly, "yearly");
  return {
    statement: `${binding.phase.window.start} 至 ${binding.phase.window.end}，${topic.label_zh}先以本命的“${focusStrength}”为底色，同时管理“${focusRisk}”。${decadalPlain}。${yearlyPlain}。主题槽四化过程还强调${processPlain}。${natalConditions}。这是观察重点，不构成具体事件判断。`,
    reasoning_summary: `这部分先看长期形成的做事底色，再看当前一段较长时期的环境，最后看目标年份带来的触发。${focusBrightness}；它只说明底色容易怎样发挥。后两层只说明哪些条件在当前阶段更明显，不能替代本命主线；三合和对向位置也只能补充背景。时间段按大限和流年同时保持不变的实际区间来定，不直接套一整个公历年。这里不把星曜合成吉凶分数，也不从这些条件直接推出具体事件。`,
    alternative_readings: [
      "如果现实记录只像三方或对向背景，却没有主宫的关键做法，或大限、流年的已登记条件与四化过程持续对不上，就不能说这条阶段主线得到支持。",
      "如果记录少于两次、相隔不足30日，或主要靠事后回忆补充，结论应保留为不清楚。",
    ],
    practical_reflection: `在这段时间保存两次相隔至少30日的${topic.label_zh}记录：写下具体事项、你的做法、实际阻力和资源变化，再按本命、大限、流年三层核对，而不是事后只挑一条相似处。`,
    assessment: {
      mode: binding.assessment_mode,
      domain: topic.topic,
      window: { ...binding.phase.window },
      criteria,
    },
  };
}

/**
 * Recompute a binding and all five canonical result fields.
 *
 * Call as:
 *   validateZiweiMeaningBinding(claim.meaning_binding, claim, calculation, rules)
 *
 * Returns { valid, errors, expected_binding, expected_narrative, derivation }.
 * It never mutates inputs and does not throw for user-supplied invalid data.
 */
export function validateZiweiMeaningBinding(binding, claim, calculation, applicableRules = null) {
  const errors = [];
  const derivation = deriveZiweiMeaningBinding(claim, calculation, applicableRules);
  if (!derivation.ok) {
    errors.push(`${derivation.reason_code}: ${derivation.reason_zh}`);
    return {
      valid: false,
      errors,
      expected_binding: null,
      expected_narrative: null,
      derivation,
    };
  }
  if (!isDeepStrictEqual(binding, derivation.binding)) {
    errors.push("meaning binding must exactly equal the binding mechanically derived from the claim and calculation");
  }
  let expectedNarrative = null;
  let expectedSemanticBindings = null;
  try {
    expectedSemanticBindings = canonicalZiweiSemanticBindings(derivation.binding, calculation);
    expectedNarrative = canonicalZiweiNarrative(derivation.binding, calculation);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "canonical Zi Wei narrative generation failed");
  }
  if (expectedSemanticBindings && !isDeepStrictEqual(claim?.semantic_bindings, expectedSemanticBindings)) {
    errors.push("semantic_bindings must exactly equal every relation mechanically selected by the closed Zi Wei meaning route");
  }
  if (expectedNarrative) {
    for (const field of CANONICAL_NARRATIVE_FIELDS) {
      if (!isDeepStrictEqual(claim?.[field], expectedNarrative[field])) {
        errors.push(`${field} must exactly equal the canonical Zi Wei meaning rendering`);
      }
    }
  }
  return {
    valid: errors.length === 0,
    errors,
    expected_binding: derivation.binding,
    expected_semantic_bindings: expectedSemanticBindings,
    expected_narrative: expectedNarrative,
    derivation,
  };
}
