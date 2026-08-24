import {
  detectPatterns,
  VERIFIED_PATTERN_RULES,
  VERIFIED_ZIWEI_PATTERN_RULE_COUNT,
  ZIWEI_TRADITIONAL_PATTERN_BOUNDARIES,
  ZIWEI_TRADITIONAL_PATTERN_CATALOG_COUNT,
} from "../data/ziwei-traditional-patterns-mingyu.mjs";

export const ZIWEI_PATTERN_EVIDENCE_META = Object.freeze({
  schema: "fortune-teller/ziwei-named-pattern-evidence/v1",
  rule_id: "R-ZW-010",
  upstream_repository: "https://github.com/Brhiza/mingyu",
  upstream_commit: "bd6963b9b562cbef77c50227b625c0d3e7b36021",
  upstream_path: "packages/core/src/ziwei/iztro/pattern-detection.ts",
  license: "MIT",
  registered_rule_count: VERIFIED_ZIWEI_PATTERN_RULE_COUNT,
  refusal_boundary_count: ZIWEI_TRADITIONAL_PATTERN_BOUNDARIES.length,
  catalog_count: ZIWEI_TRADITIONAL_PATTERN_CATALOG_COUNT,
  aggregation: "none",
  event_prediction: "disallowed",
});

function normalizePalaceName(name) {
  return typeof name === "string" && name.endsWith("宫") ? name.slice(0, -1) : name;
}

function adaptStar(star) {
  return {
    name: star.name,
    kind: star.type,
    scope: star.scope,
    ...(star.brightness ? { brightness: star.brightness } : {}),
    ...(star.mutagen ? { birth_mutagen: star.mutagen } : {}),
  };
}

function adaptPalaces(palaces, structure) {
  const palaceByFactId = new Map(palaces.map((palace) => [palace.fact_id, palace]));
  const relationByFocus = new Map(
    structure.palace_relations.map((relation) => [relation.focus_palace_id, relation]),
  );
  return palaces.map((palace) => {
    const relation = relationByFocus.get(palace.fact_id);
    if (!relation) throw new Error(`Zi Wei pattern adapter could not resolve ${palace.name}'s relation`);
    const opposite = palaceByFactId.get(relation.opposite_palace_id);
    const surrounded = relation.four_directions_palace_ids.map((factId) => palaceByFactId.get(factId));
    if (!opposite || surrounded.some((item) => !item)) {
      throw new Error(`Zi Wei pattern adapter could not resolve ${palace.name}'s complete four-palace unit`);
    }
    return {
      index: palace.index,
      name: palace.name,
      is_body_palace: palace.is_body_palace,
      is_original_palace: palace.is_original_palace,
      heavenly_stem: palace.heavenly_stem,
      earthly_branch: palace.earthly_branch,
      major_stars: palace.major_stars.map(adaptStar),
      minor_stars: palace.minor_stars.map(adaptStar),
      other_stars: palace.adjective_stars.map(adaptStar),
      scope_stars: [],
      empty_state: palace.major_stars.length === 0,
      opposite_palace_index: opposite.index,
      surrounded_palace_indexes: surrounded.map((item) => item.index),
    };
  });
}

function sourceLocator(record) {
  return {
    title: record.sourceTitle,
    url: record.sourceUrl,
  };
}

function boundaryLocator(record) {
  const match = /^(https:\/\/[^（]+)(.*)$/u.exec(record.source);
  return {
    url: match?.[1] || record.source,
    locator_zh: match?.[2]?.replace(/^（|）$/gu, "") || null,
  };
}

function localPalaceIdsByIndex(palaces) {
  return new Map(palaces.map((palace) => [palace.index, palace.fact_id]));
}

/**
 * Evaluate the fixed 55-rule catalog against one already calculated natal
 * chart. The returned JSON contains only match mechanics, unmet requirements,
 * source locators, and explicit refusal boundaries. It contains no traditional
 * outcome prose, score, vote, probability, event, or timing claim.
 */
export function buildZiweiPatternEvidence({ palaces, structure, birth_year_heavenly_stem }) {
  const adaptedPalaces = adaptPalaces(palaces, structure);
  const detected = detectPatterns({
    palaces: adaptedPalaces,
    birthYearHeavenlyStem: birth_year_heavenly_stem,
  });
  const detectedById = new Map(detected.map((record) => [record.id, record]));
  const palaceIdByIndex = localPalaceIdsByIndex(palaces);
  const evaluationContext = { birthYearHeavenlyStem: birth_year_heavenly_stem };
  const evaluations = VERIFIED_PATTERN_RULES.map((rule, index) => {
    const match = detectedById.get(rule.id);
    const evaluable = rule.canEvaluate?.(evaluationContext) ?? true;
    return {
      fact_id: `F-ZW-G${String(index + 1).padStart(2, "0")}`,
      kind: "derived_calculation_fact",
      pattern_id: rule.id,
      traditional_name: rule.name,
      display_label_zh: rule.description,
      status: !evaluable ? "input_missing" : match ? "matched" : "not_matched",
      source_locator: sourceLocator(rule),
      required_condition_zh: rule.calculation,
      ...(match ? {
        matched_conditions_zh: [...match.matched_conditions],
        matched_palace_ids: match.palace_indexes.map((palaceIndex) => palaceIdByIndex.get(palaceIndex)),
        matched_palace_names: [...match.palace_names],
        matched_star_names: [...match.star_names],
      } : {
        unmet_boundary_zh: evaluable
          ? "当前盘面没有完整满足这条登记规则；不把部分相似条件升级为命中。"
          : "必要的生年天干输入缺失，本条不作命中或未命中判断。",
      }),
      interpretation_limit: "只证明登记条件是否满足；不生成传统事件断语、整盘吉凶或现实概率。",
    };
  });
  const refusalBoundaries = ZIWEI_TRADITIONAL_PATTERN_BOUNDARIES.map((boundary, index) => ({
    fact_id: `F-ZW-B${String(index + 1).padStart(2, "0")}`,
    kind: "source_boundary_fact",
    boundary_id: `ziwei-refusal-${String(index + 1).padStart(2, "0")}`,
    traditional_name: boundary.name,
    display_label_zh: "原典条件未闭合，拒绝自动判断",
    status: "refused_not_uniquely_reproducible",
    source_locator: boundaryLocator(boundary),
    refusal_reason_zh: boundary.reason,
    interpretation_limit: "原典条件不闭合、与当前固定排盘体系冲突，或依赖未实现运限时，拒绝伪造命中。",
  }));
  const evaluatedRuleCount = evaluations.filter((item) => item.status !== "input_missing").length;
  const matchedRuleCount = evaluations.filter((item) => item.status === "matched").length;
  return {
    schema: ZIWEI_PATTERN_EVIDENCE_META.schema,
    rule_id: ZIWEI_PATTERN_EVIDENCE_META.rule_id,
    provenance: {
      repository: ZIWEI_PATTERN_EVIDENCE_META.upstream_repository,
      commit: ZIWEI_PATTERN_EVIDENCE_META.upstream_commit,
      path: ZIWEI_PATTERN_EVIDENCE_META.upstream_path,
      license: ZIWEI_PATTERN_EVIDENCE_META.license,
    },
    coverage: {
      registered_rule_count: VERIFIED_ZIWEI_PATTERN_RULE_COUNT,
      evaluated_rule_count: evaluatedRuleCount,
      unevaluated_rule_count: VERIFIED_ZIWEI_PATTERN_RULE_COUNT - evaluatedRuleCount,
      matched_rule_count: matchedRuleCount,
      not_matched_rule_count: evaluatedRuleCount - matchedRuleCount,
      refusal_boundary_count: refusalBoundaries.length,
      catalog_count: ZIWEI_TRADITIONAL_PATTERN_CATALOG_COUNT,
    },
    evaluations,
    refusal_boundaries: refusalBoundaries,
    aggregation: "none",
    specific_event: null,
    interpretation_limit: "每条规则独立保留；不投票、不加权、不按命中数量推导吉凶、概率、事件或固定应期。",
  };
}

export function compactZiweiPatternEvidence(evidence) {
  if (!evidence) return null;
  return {
    schema: evidence.schema,
    rule_id: evidence.rule_id,
    provenance: { ...evidence.provenance },
    coverage: { ...evidence.coverage },
    evaluations: evidence.evaluations.filter((item) => item.status === "matched").map((item) => ({
      fact_id: item.fact_id,
      kind: item.kind,
      pattern_id: item.pattern_id,
      display_label_zh: item.display_label_zh,
      status: item.status,
      source_locator: { ...item.source_locator },
      matched_conditions_zh: [...item.matched_conditions_zh],
      matched_palace_ids: [...item.matched_palace_ids],
      matched_palace_names: [...item.matched_palace_names],
      matched_star_names: [...item.matched_star_names],
      interpretation_limit: item.interpretation_limit,
    })),
    evaluation_detail: "matched_only_compact_record",
    omitted_not_matched_count: evidence.coverage.not_matched_rule_count,
    omitted_refusal_boundary_count: evidence.coverage.refusal_boundary_count,
    aggregation: "none",
    specific_event: null,
    interpretation_limit: evidence.interpretation_limit,
  };
}

function fullEvidenceFromCalculation(calculation) {
  const facts = calculation?.facts;
  if (!facts?.pattern_evidence) return null;
  if (Array.isArray(facts.pattern_evidence.refusal_boundaries)) return facts.pattern_evidence;
  return buildZiweiPatternEvidence({
    palaces: facts.palaces,
    structure: facts.structure,
    birth_year_heavenly_stem: facts.summary?.chinese_date?.trim()?.slice(0, 1),
  });
}

export function resultFacingZiweiPatternEvidence(calculation, { detail = "compact" } = {}) {
  if (detail === "none") return null;
  const evidence = detail === "audit"
    ? fullEvidenceFromCalculation(calculation)
    : calculation?.facts?.pattern_evidence;
  if (!evidence) return null;
  const matchedConditions = evidence.evaluations.filter((item) => item.status === "matched").map((item) => ({
    pattern_id: item.pattern_id,
    display_label_zh: item.display_label_zh,
    fact_id: item.fact_id,
    matched_conditions_zh: [...item.matched_conditions_zh],
    matched_palace_names: [...item.matched_palace_names],
    matched_star_names: [...item.matched_star_names],
    source_locator: { ...item.source_locator },
  }));
  const unmetConditions = (evidence.evaluations || []).filter((item) => item.status !== "matched").map((item) => ({
    pattern_id: item.pattern_id,
    display_label_zh: item.display_label_zh,
    fact_id: item.fact_id,
    status: item.status,
    required_condition_zh: item.required_condition_zh,
    unmet_boundary_zh: item.unmet_boundary_zh,
    source_locator: { ...item.source_locator },
  }));
  const compact = {
    schema: evidence.schema,
    status: "evaluated",
    role: "supplemental_evidence_only",
    main_conclusion_effect: "none",
    display_summary_zh: matchedConditions.length > 0
      ? `已按固定来源逐条核对，当前有${matchedConditions.length}项盘面结构完整满足登记条件；它们不改写主题主结论。`
      : "已按固定来源逐条核对，当前没有完整满足的登记结构；这不表示不存在其他传统格局。",
    matched_conditions: matchedConditions,
    coverage: { ...evidence.coverage },
    detail: detail === "audit" ? "audit" : "compact",
    advanced_audit_available: true,
    aggregation: "none",
    specific_event: null,
    boundary_zh: evidence.interpretation_limit,
  };
  if (detail !== "audit") return compact;
  return {
    ...compact,
    unmet_conditions: unmetConditions,
    refusal_boundaries: evidence.refusal_boundaries.map((item) => ({
      boundary_id: item.boundary_id,
      display_label_zh: item.display_label_zh,
      fact_id: item.fact_id,
      status: item.status,
      source_locator: { ...item.source_locator },
      refusal_reason_zh: item.refusal_reason_zh,
    })),
    advanced_evidence: {
      traditional_labels: [
        ...evidence.evaluations.map((item) => ({
          fact_id: item.fact_id,
          pattern_id: item.pattern_id,
          traditional_name: item.traditional_name,
          source_locator: { ...item.source_locator },
        })),
        ...evidence.refusal_boundaries.map((item) => ({
          fact_id: item.fact_id,
          boundary_id: item.boundary_id,
          traditional_name: item.traditional_name,
          source_locator: { ...item.source_locator },
        })),
      ],
      label_boundary_zh: "传统格名仅用于定位原典规则，不是现实事件、人物评价、吉凶总评或用户结论。",
    },
  };
}
