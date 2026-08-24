import { SOURCES, getSourceById } from "./source-registry.mjs";

const ruleDefinitions = [
  {
    id: "R-BZ-001", system: "bazi", summary: "Read the calculated Four Pillars as chart structure.",
    allowed_scopes: ["pillar_structure", "chart_structure", "calculation_audit"],
    required_fact_prefixes: ["/facts/pillars", "/facts/stable_pillars", "/facts/structure"], minimum_fact_references: 1,
    source_ids: ["SRC-BZ-LUNAR-TS-1.8.6", "SRC-BZ-SANMING-WIKISOURCE"], interpretation_ceiling: "traditional_structure",
    permitted_epistemic_status: ["calculation_fact", "traditional_rule", "interpretation", "unresolved"], protective: false,
  },
  {
    id: "R-BZ-002", system: "bazi", summary: "Use Ten Gods only as bounded traditional relational vocabulary.",
    allowed_scopes: ["ten_god_relation"],
    required_fact_prefixes: ["/facts/pillars", "/facts/structure/day_master", "/facts/structure/occurrence_counts"],
    minimum_fact_references: 1, source_ids: ["SRC-BZ-LUNAR-TS-1.8.6", "SRC-BZ-SANMING-WIKISOURCE"],
    interpretation_ceiling: "traditional_structure", permitted_epistemic_status: ["traditional_rule", "unresolved"], protective: false,
  },
  {
    id: "R-BZ-003", system: "bazi", summary: "Describe time and day-boundary profile effects without adding interpretation.",
    allowed_scopes: ["time_profile", "day_boundary", "profile_comparison", "calculation_audit"],
    required_fact_prefixes: ["/facts/resolved_time", "/facts/mode"], minimum_fact_references: 1,
    material_fact_paths: ["/facts/resolved_time", "/facts/mode"],
    source_ids: [], interpretation_ceiling: "calculation_only",
    permitted_epistemic_status: ["calculation_fact", "unresolved"], protective: false,
  },
  {
    id: "R-BZ-004", system: "bazi", summary: "Keep unknown birth-time effects explicit and sensitivity-bounded.",
    allowed_scopes: ["unknown_time_sensitivity", "uncertainty"],
    required_fact_prefixes: ["/facts/stable_pillars", "/facts/time_pillar", "/facts/mode"], minimum_fact_references: 1,
    material_fact_paths: ["/facts/time_pillar"],
    required_fact_values: [{ path: "/facts/mode", equals: "unknown-time-sensitivity" }],
    source_ids: [], interpretation_ceiling: "uncertainty_only",
    permitted_epistemic_status: ["calculation_fact", "unresolved"], protective: true,
  },
  {
    id: "R-BZ-005", system: "bazi",
    summary: "Adjudicate one month-command pattern only through an explicitly registered compound formation, damage, and paired-rescue route.",
    allowed_scopes: ["pattern_adjudication", "disease_remedy"],
    required_fact_prefixes: ["/facts/pillars", "/facts/structure/day_master", "/facts/structure/relationships"],
    required_fact_groups: [["/facts/pillars"], ["/facts/structure/day_master"]],
    minimum_fact_references: 2,
    source_ids: ["SRC-BZ-LUNAR-TS-1.8.6", "SRC-BZ-ZIPING-ZHENQUAN-NLC", "SRC-BZ-DITIAN-SUI-WIKISOURCE"],
    interpretation_ceiling: "typed_adjudication_binding_required",
    permitted_epistemic_status: ["unresolved"], protective: true,
  },
  {
    id: "R-BZ-006", system: "bazi",
    summary: "Read a target phase in the fixed order natal baseline, full decadal environment, yearly trigger, and exact registered interactions.",
    allowed_scopes: ["phase_activation", "target_period_synthesis"],
    required_fact_prefixes: [
      "/facts/pillars", "/facts/structure/relationships", "/facts/luck_cycles/decadal", "/facts/luck_cycles/target",
    ],
    required_fact_groups: [["/facts/pillars"], ["/facts/luck_cycles/decadal"], ["/facts/luck_cycles/target"]],
    minimum_fact_references: 3,
    source_ids: ["SRC-BZ-LUNAR-TS-1.8.6", "SRC-BZ-ZIPING-ZHENQUAN-NLC", "SRC-BZ-DITIAN-SUI-WIKISOURCE"],
    interpretation_ceiling: "typed_adjudication_binding_required",
    permitted_epistemic_status: ["unresolved"], protective: true,
  },
  {
    id: "R-BZ-007", system: "bazi",
    summary: "Select exactly one Day-Stem x solar-month source scope, screen mentioned-stem locations, and keep climate use unresolved until segment, role, and condition prerequisites close.",
    allowed_scopes: ["climate_adjudication"],
    required_fact_prefixes: ["/facts/pillars", "/facts/structure/month_context", "/facts/structure/month_command"],
    required_fact_groups: [["/facts/pillars"], ["/facts/structure/month_context"]],
    minimum_fact_references: 2,
    source_ids: ["SRC-BZ-QIONGTONG-WIKISOURCE"],
    interpretation_ceiling: "typed_adjudication_binding_required",
    permitted_epistemic_status: ["unresolved"], protective: true,
  },
  {
    id: "R-BZ-008", system: "bazi",
    summary: "Propose a passage route only when both visible controlling elements and the fixed generating mediator can be replayed from the chart.",
    allowed_scopes: ["passage_adjudication"],
    required_fact_prefixes: ["/facts/pillars", "/facts/structure/visible_force_evidence"],
    required_fact_groups: [["/facts/pillars"], ["/facts/structure/visible_force_evidence"]],
    minimum_fact_references: 2,
    source_ids: ["SRC-BZ-DITIAN-SUI-WIKISOURCE"],
    interpretation_ceiling: "typed_adjudication_binding_required",
    permitted_epistemic_status: ["unresolved"], protective: true,
  },
  {
    id: "R-ZW-001", system: "ziwei", summary: "Relate named stars to their calculated palace context without event certainty.",
    allowed_scopes: ["star_palace_context"],
    required_fact_prefixes: ["/facts/palaces"],
    minimum_fact_references: 1, source_ids: ["SRC-ZW-IZTRO-2.6.0", "SRC-ZW-ZIWEI-QUANSHU"],
    interpretation_ceiling: "traditional_structure", permitted_epistemic_status: ["calculation_fact", "traditional_rule", "unresolved"], protective: false,
  },
  {
    id: "R-ZW-002", system: "ziwei", summary: "Use soul/body labels as traditional chart labels, not fixed personality diagnoses.",
    allowed_scopes: ["soul_body_labels", "reflective_theme"],
    required_fact_prefixes: ["/facts/summary", "/facts/stable_summary"], minimum_fact_references: 1,
    material_fact_paths: [
      "/facts/summary/soul_star", "/facts/summary/body_star", "/facts/summary/five_elements_class",
      "/facts/summary/soul_palace_branch", "/facts/summary/body_palace_branch",
    ],
    source_ids: ["SRC-ZW-IZTRO-2.6.0", "SRC-ZW-ZIWEI-QUANSHU"], interpretation_ceiling: "bounded_reflection",
    permitted_epistemic_status: ["traditional_rule", "unresolved"], protective: false,
  },
  {
    id: "R-ZW-003", system: "ziwei", summary: "Report the chart's indexed periods as calculated labels only.",
    allowed_scopes: ["period_indexing", "calculation_audit"], required_fact_prefixes: ["/facts/palaces"],
    minimum_fact_references: 1, source_ids: ["SRC-ZW-IZTRO-2.6.0"], interpretation_ceiling: "traditional_structure",
    permitted_epistemic_status: ["calculation_fact", "traditional_rule", "unresolved"], protective: false,
  },
  {
    id: "R-ZW-004", system: "ziwei", summary: "Keep unknown birth-time chart variation explicit.",
    allowed_scopes: ["unknown_time_sensitivity", "uncertainty"],
    required_fact_prefixes: ["/facts/stable_summary", "/facts/single_chart", "/facts/mode"], minimum_fact_references: 1,
    material_fact_paths: ["/facts/single_chart/status"],
    required_fact_values: [{ path: "/facts/mode", equals: "unknown-time-sensitivity" }],
    source_ids: [], interpretation_ceiling: "uncertainty_only",
    permitted_epistemic_status: ["calculation_fact", "unresolved"], protective: true,
  },
  {
    id: "R-ZW-005", system: "ziwei", summary: "Report explicit target-date decadal and yearly output as calculation structure only.",
    allowed_scopes: ["target_period_calculation", "period_indexing", "calculation_audit"],
    required_fact_prefixes: ["/facts/periods/target", "/facts/periods/decadal", "/facts/periods/yearly"],
    minimum_fact_references: 1,
    source_ids: ["SRC-ZW-IZTRO-2.6.0"], interpretation_ceiling: "calculation_only",
    permitted_epistemic_status: ["calculation_fact", "unresolved"], protective: false,
  },
  {
    id: "R-ZW-006", system: "ziwei", summary: "Report legacy three-layer phase structure only when natal, decadal, and yearly context are all cited.",
    allowed_scopes: ["phase_structure", "life_stage_structure"],
    required_fact_prefixes: ["/facts/palaces", "/facts/periods/decadal", "/facts/periods/yearly"],
    required_fact_groups: [["/facts/palaces"], ["/facts/periods/decadal"], ["/facts/periods/yearly"]],
    minimum_fact_references: 3,
    source_ids: ["SRC-ZW-IZTRO-HOROSCOPE-GUIDE"], interpretation_ceiling: "calculation_only",
    permitted_epistemic_status: ["calculation_fact", "unresolved"], protective: false,
  },
  {
    id: "R-ZW-007", system: "ziwei",
    summary: "Interpret one supported life topic only through its machine-bound target palace and complete three-directions/four-alignments unit.",
    allowed_scopes: ["topic_synthesis"],
    allowed_topics: ["overview", "career_study", "wealth_resources", "relationships", "wellbeing_rhythm"],
    allowed_profile_ids: ["ziwei-default-v1", "ziwei-zhongzhou-v1"],
    required_topic_unit_kind: "natal",
    required_fact_prefixes: ["/facts/topic_units", "/facts/palaces", "/facts/structure/palace_relations"],
    required_fact_groups: [["/facts/topic_units"], ["/facts/palaces"], ["/facts/structure/palace_relations"]],
    minimum_fact_references: 6,
    source_ids: ["SRC-ZW-IZTRO-2.6.0", "SRC-ZW-IZTRO-PALACE-GUIDE"],
    interpretation_ceiling: "bounded_reflection",
    permitted_epistemic_status: ["interpretation", "unresolved"], protective: false,
  },
  {
    id: "R-ZW-008", system: "ziwei",
    summary: "Read a natal transformation only when its actual star, palace, and selected topic unit are bound together.",
    allowed_scopes: ["topic_transformation"],
    allowed_topics: ["overview", "career_study", "wealth_resources", "relationships", "wellbeing_rhythm"],
    allowed_profile_ids: ["ziwei-default-v1", "ziwei-zhongzhou-v1"],
    required_topic_unit_kind: "natal_with_mutagen",
    required_fact_prefixes: ["/facts/topic_units", "/facts/palaces", "/facts/structure/mutagen_locations"],
    required_fact_groups: [["/facts/topic_units"], ["/facts/palaces"], ["/facts/structure/mutagen_locations"]],
    minimum_fact_references: 4,
    source_ids: ["SRC-ZW-IZTRO-2.6.0", "SRC-ZW-IZTRO-MUTAGEN-GUIDE"],
    interpretation_ceiling: "bounded_reflection",
    permitted_epistemic_status: ["interpretation", "unresolved"], protective: false,
  },
  {
    id: "R-ZW-009", system: "ziwei",
    summary: "Synthesize a target phase only from one machine-bound topic across natal, decadal, and yearly layers.",
    allowed_scopes: ["phase_topic_synthesis"],
    allowed_topics: ["overview", "career_study", "wealth_resources", "relationships", "wellbeing_rhythm"],
    allowed_profile_ids: ["ziwei-default-v1", "ziwei-zhongzhou-v1"],
    required_topic_unit_kind: "phase",
    required_fact_prefixes: [
      "/facts/phase_topic_units", "/facts/topic_units", "/facts/palaces",
      "/facts/structure/palace_relations",
      "/facts/periods/target",
      "/facts/periods/phase_validity",
      "/facts/periods/decadal/star_palaces", "/facts/periods/decadal/mutagens",
      "/facts/periods/yearly/star_palaces", "/facts/periods/yearly/mutagens",
    ],
    required_fact_groups: [
      ["/facts/phase_topic_units"], ["/facts/topic_units"], ["/facts/palaces"],
      ["/facts/periods/target"],
      ["/facts/periods/phase_validity"],
      ["/facts/periods/decadal/star_palaces"], ["/facts/periods/yearly/star_palaces"],
    ],
    minimum_fact_references: 7,
    source_ids: ["SRC-ZW-IZTRO-2.6.0", "SRC-ZW-IZTRO-PALACE-GUIDE", "SRC-ZW-IZTRO-HOROSCOPE-GUIDE"],
    interpretation_ceiling: "bounded_reflection",
    permitted_epistemic_status: ["interpretation", "unresolved"], protective: false,
  },
  {
    id: "R-WA-001", system: "western", summary: "Use calculated ecliptic longitude and zodiac placement as the factual base.",
    allowed_scopes: ["zodiac_placement", "zodiac_theme", "calculation_audit"],
    required_fact_prefixes: [
      "/facts/planets", "/facts/planet_ranges", "/facts/structure/sign_distribution", "/facts/structure/reference_points",
    ], minimum_fact_references: 1,
    source_ids: ["SRC-WA-ASTRONOMY-2.1.19", "SRC-WA-TETRABIBLOS-PG70850"], interpretation_ceiling: "bounded_reflection",
    permitted_epistemic_status: ["calculation_fact", "traditional_rule", "interpretation", "unresolved"], protective: false,
  },
  {
    id: "R-WA-002", system: "western", summary: "Treat angles and whole-sign houses as profile-specific calculated conventions.",
    allowed_scopes: ["houses", "angles", "house_availability", "calculation_audit"],
    required_fact_prefixes: ["/facts/houses", "/facts/angles", "/facts/structure/house_occupancy"], minimum_fact_references: 1,
    material_fact_paths: ["/facts/houses", "/facts/angles"],
    source_ids: [], interpretation_ceiling: "calculation_only",
    permitted_epistemic_status: ["calculation_fact", "unresolved"], protective: false,
  },
  {
    id: "R-WA-003", system: "western", summary: "Use computed aspects as bounded traditional relational prompts.",
    allowed_scopes: ["aspects", "aspect_theme"],
    required_fact_prefixes: ["/facts/aspects", "/facts/structure/tight_aspects"], minimum_fact_references: 1,
    source_ids: ["SRC-WA-TETRABIBLOS-PG70850"], interpretation_ceiling: "bounded_reflection",
    permitted_epistemic_status: ["traditional_rule", "interpretation", "unresolved"], protective: false,
  },
  {
    id: "R-WA-004", system: "western", summary: "Report calculated apparent motion state without treating it as an event forecast.",
    allowed_scopes: ["motion_state", "calculation_audit"], required_fact_prefixes: ["/facts/planets"],
    minimum_fact_references: 1, source_ids: ["SRC-WA-ASTRONOMY-2.1.19"], interpretation_ceiling: "calculation_only",
    permitted_epistemic_status: ["calculation_fact", "unresolved"], protective: false,
  },
  {
    id: "R-WA-005", system: "western",
    summary: "Read one life topic through its primary whole-sign house or bounded luminary fallback, keeping the traditional ruler as primary and every occupant as a co-significator, then chart ruler, luminaries, tight aspects, and unscored seven-planet condition.",
    allowed_scopes: ["topic_synthesis", "natal_adjudication"],
    allowed_topics: ["overview", "career_study", "wealth_resources", "relationships", "family_social", "wellbeing_rhythm"],
    required_fact_prefixes: ["/facts/planets", "/facts/houses", "/facts/aspects", "/facts/structure/traditional_conditions"],
    required_fact_groups: [["/facts/planets"], ["/facts/structure/traditional_conditions"]],
    minimum_fact_references: 2,
    source_ids: ["SRC-WA-ASTRONOMY-2.1.19", "SRC-WA-TETRABIBLOS-PG70850"],
    interpretation_ceiling: "bounded_reflection",
    permitted_epistemic_status: ["interpretation", "unresolved"], protective: true,
  },
  {
    id: "R-TR-001", system: "tarot", summary: "Bind each card to its declared spread position.",
    allowed_scopes: ["spread_position", "reflective_theme"], required_fact_prefixes: ["/facts/cards"],
    minimum_fact_references: 1, source_ids: [], interpretation_ceiling: "bounded_reflection",
    permitted_epistemic_status: ["calculation_fact", "interpretation", "unresolved"], protective: false,
  },
  {
    id: "R-TR-002", system: "tarot", summary: "Use upright or reversed card orientation as bounded traditional vocabulary.",
    allowed_scopes: ["card_orientation", "reflective_theme"], required_fact_prefixes: ["/facts/cards"],
    minimum_fact_references: 1, source_ids: ["SRC-TR-WAITE-WIKISOURCE"], interpretation_ceiling: "bounded_reflection",
    permitted_epistemic_status: ["traditional_rule", "interpretation", "unresolved"], protective: false,
  },
  {
    id: "R-TR-003", system: "tarot", summary: "Synthesize declared spread positions and card-composition patterns as a reflective comparison without turning repetitions into votes.",
    allowed_scopes: ["multi_card_synthesis", "reflective_theme"],
    required_fact_prefixes: ["/facts/cards", "/facts/spread", "/facts/structure"],
    minimum_fact_references: 2, source_ids: [], interpretation_ceiling: "bounded_reflection",
    permitted_epistemic_status: ["interpretation", "unresolved"], protective: false,
  },
  {
    id: "R-TR-004", system: "tarot", summary: "Keep the user-supplied, seeded, or unseeded draw provenance visible.",
    allowed_scopes: ["draw_provenance", "calculation_audit"], required_fact_prefixes: ["/facts/mode"],
    material_fact_paths: ["/facts/mode"],
    minimum_fact_references: 1, source_ids: [], interpretation_ceiling: "calculation_only",
    permitted_epistemic_status: ["calculation_fact", "unresolved"], protective: true,
  },
  {
    id: "R-YJ-001", system: "iching", summary: "Read and report the six lines in bottom-to-top order.",
    allowed_scopes: ["line_order", "calculation_audit"], required_fact_prefixes: ["/facts/lines"],
    minimum_fact_references: 1, source_ids: ["SRC-YJ-ZHOUYI-WIKISOURCE"], interpretation_ceiling: "traditional_structure",
    permitted_epistemic_status: ["calculation_fact", "traditional_rule", "unresolved"], protective: false,
  },
  {
    id: "R-YJ-002", system: "iching", summary: "Transform only the explicitly marked changing lines.",
    allowed_scopes: ["line_transformation", "calculation_audit"],
    required_fact_prefixes: ["/facts/lines", "/facts/changing_lines"], minimum_fact_references: 1,
    material_fact_paths: ["/facts/changing_lines"],
    required_fact_groups: [["/facts/lines"], ["/facts/changing_lines"]],
    source_ids: [], interpretation_ceiling: "calculation_only",
    permitted_epistemic_status: ["calculation_fact", "unresolved"], protective: false,
  },
  {
    id: "R-YJ-003", system: "iching", summary: "Identify and structurally compare the primary and transformed hexagrams.",
    allowed_scopes: ["hexagram_identity", "structural_comparison"],
    required_fact_prefixes: ["/facts/primary", "/facts/transformed"], minimum_fact_references: 1,
    required_fact_groups: [["/facts/primary"], ["/facts/transformed"]],
    source_ids: ["SRC-YJ-ZHOUYI-WIKISOURCE"], interpretation_ceiling: "bounded_reflection",
    permitted_epistemic_status: ["calculation_fact", "traditional_rule", "interpretation", "unresolved"], protective: false,
  },
  {
    id: "R-YJ-004", system: "iching", summary: "Keep user-supplied, seeded, or unseeded cast provenance visible.",
    allowed_scopes: ["cast_provenance", "calculation_audit"], required_fact_prefixes: ["/facts/mode"],
    material_fact_paths: ["/facts/mode"],
    minimum_fact_references: 1, source_ids: [], interpretation_ceiling: "calculation_only",
    permitted_epistemic_status: ["calculation_fact", "unresolved"], protective: true,
  },
  {
    id: "R-YJ-005", system: "iching",
    summary: "Select zero, one, multiple, or all changing lines through one frozen protocol and keep centrality, position, and correspondence as unscored structural checks.",
    allowed_scopes: ["changing_line_adjudication", "structural_reflection"],
    required_fact_prefixes: ["/facts/lines", "/facts/structure/reading_selector", "/facts/structure/line_features"],
    required_fact_groups: [["/facts/lines"], ["/facts/structure/reading_selector"]],
    minimum_fact_references: 2,
    source_ids: [], interpretation_ceiling: "bounded_reflection",
    permitted_epistemic_status: ["interpretation", "unresolved"], protective: true,
  },
  {
    id: "R-MH-001", system: "meihua", summary: "Derive trigram indices with the profile's eight-remainder convention.",
    allowed_scopes: ["number_to_trigram", "calculation_audit"],
    required_fact_prefixes: ["/facts/upper_trigram", "/facts/lower_trigram"], minimum_fact_references: 1,
    required_fact_groups: [["/facts/upper_trigram"], ["/facts/lower_trigram"]],
    source_ids: ["SRC-MH-MEIHUA-WIKISOURCE"], interpretation_ceiling: "traditional_structure",
    permitted_epistemic_status: ["calculation_fact", "traditional_rule", "unresolved"], protective: false,
  },
  {
    id: "R-MH-002", system: "meihua", summary: "Preserve the profile's upper/lower trigram assignment.",
    allowed_scopes: ["upper_lower_assignment", "calculation_audit"],
    required_fact_prefixes: ["/facts/upper_trigram", "/facts/lower_trigram"], minimum_fact_references: 1,
    required_fact_groups: [["/facts/upper_trigram"], ["/facts/lower_trigram"]],
    source_ids: ["SRC-MH-MEIHUA-WIKISOURCE"], interpretation_ceiling: "traditional_structure",
    permitted_epistemic_status: ["calculation_fact", "traditional_rule", "unresolved"], protective: false,
  },
  {
    id: "R-MH-003", system: "meihua", summary: "Derive the moving line with the profile's six-remainder convention.",
    allowed_scopes: ["moving_line_derivation", "calculation_audit"], required_fact_prefixes: ["/facts/moving_line"],
    minimum_fact_references: 1, source_ids: ["SRC-MH-MEIHUA-WIKISOURCE"], interpretation_ceiling: "traditional_structure",
    permitted_epistemic_status: ["calculation_fact", "traditional_rule", "unresolved"], protective: false,
  },
  {
    id: "R-MH-004", system: "meihua", summary: "Flip only the calculated moving line to form the transformed hexagram.",
    allowed_scopes: ["line_transformation", "calculation_audit"],
    required_fact_prefixes: ["/facts/primary", "/facts/transformed", "/facts/moving_line"], minimum_fact_references: 1,
    required_fact_groups: [["/facts/primary"], ["/facts/transformed"], ["/facts/moving_line"]],
    source_ids: [], interpretation_ceiling: "calculation_only",
    permitted_epistemic_status: ["calculation_fact", "unresolved"], protective: false,
  },
  {
    id: "R-MH-005", system: "meihua",
    summary: "Assign body and use from the moving half, derive the mutual hexagram, and compare the directional Five-Element relation before and after change without inventing seasonal strength or timing.",
    allowed_scopes: ["body_use_adjudication", "mutual_hexagram_structure", "reflective_theme"],
    required_fact_prefixes: ["/facts/structure/body_use", "/facts/structure/mutual", "/facts/structure/seasonal_strength", "/facts/structure/timing"],
    required_fact_groups: [["/facts/structure/body_use"], ["/facts/structure/mutual"]],
    minimum_fact_references: 2,
    source_ids: ["SRC-MH-MEIHUA-WIKISOURCE"], interpretation_ceiling: "bounded_reflection",
    permitted_epistemic_status: ["traditional_rule", "interpretation", "unresolved"], protective: true,
  },
];

const MEANING_RULES = new Set(["R-ZW-007", "R-ZW-008", "R-ZW-009"]);

function assessmentModes(rule) {
  if (!rule.permitted_epistemic_status.includes("interpretation")) return [];
  if (["R-ZW-007", "R-ZW-008"].includes(rule.id)) return ["current_reflection"];
  if (rule.id === "R-ZW-009") return ["bounded_phase", "prospective_hypothesis"];
  return ["current_reflection"];
}

const rules = ruleDefinitions.map((rule) => ({
  ...rule,
  allowed_assessment_modes: assessmentModes(rule),
  meaning_pack_id: MEANING_RULES.has(rule.id) ? "ziwei-bounded-meanings-v1" : null,
  meaning_family: rule.id === "R-ZW-007" ? "natal_topic_axes"
    : rule.id === "R-ZW-008" ? "natal_transformation_lenses"
      : rule.id === "R-ZW-009" ? "phase_topic_axes_and_processes" : null,
  canonical_narrative_required: MEANING_RULES.has(rule.id),
  professional_depth_allowed: MEANING_RULES.has(rule.id),
  source_status: rule.source_ids.length > 0 ? "verified" : "engine_documented",
}));

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

export const RULES = deepFreeze(rules);
const RULE_BY_ID = new Map(RULES.map((rule) => [rule.id, rule]));

export function getRuleById(id) {
  return RULE_BY_ID.get(id);
}

if (RULE_BY_ID.size !== RULES.length) throw new Error("rule registry contains duplicate IDs");
for (const rule of RULES) {
  if (
    !Array.isArray(rule.allowed_assessment_modes)
    || rule.allowed_assessment_modes.some((mode) =>
      !["current_reflection", "bounded_phase", "prospective_hypothesis"].includes(mode))
    || (!rule.permitted_epistemic_status.includes("interpretation") && rule.allowed_assessment_modes.length > 0)
  ) {
    throw new Error(`rule ${rule.id} has invalid assessment modes`);
  }
  if (rule.canonical_narrative_required !== Boolean(rule.meaning_pack_id && rule.meaning_family)) {
    throw new Error(`rule ${rule.id} has an inconsistent meaning-layer declaration`);
  }
  if (
    rule.material_fact_paths
    && (
      !Array.isArray(rule.material_fact_paths)
      || rule.material_fact_paths.length === 0
      || new Set(rule.material_fact_paths).size !== rule.material_fact_paths.length
      || rule.material_fact_paths.some((path) =>
        typeof path !== "string"
        || !path.startsWith("/facts/")
        || !rule.required_fact_prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)))
    )
  ) {
    throw new Error(`rule ${rule.id} has invalid material fact paths`);
  }
  if (
    rule.required_fact_groups
    && (
      !Array.isArray(rule.required_fact_groups)
      || rule.required_fact_groups.length === 0
      || rule.required_fact_groups.some((group) =>
        !Array.isArray(group)
        || group.length === 0
        || group.some((prefix) => !rule.required_fact_prefixes.includes(prefix)))
    )
  ) {
    throw new Error(`rule ${rule.id} has invalid required fact groups`);
  }
  if (
    rule.required_fact_values
    && (
      !Array.isArray(rule.required_fact_values)
      || rule.required_fact_values.length === 0
      || rule.required_fact_values.some((requirement) =>
        !requirement
        || typeof requirement !== "object"
        || Array.isArray(requirement)
        || typeof requirement.path !== "string"
        || !requirement.path.startsWith("/facts/")
        || !Object.hasOwn(requirement, "equals")
        || !rule.required_fact_prefixes.some((prefix) =>
          requirement.path === prefix || requirement.path.startsWith(`${prefix}/`)))
    )
  ) {
    throw new Error(`rule ${rule.id} has invalid required fact values`);
  }
  if (rule.source_status === "verified" && rule.source_ids.length === 0) {
    throw new Error(`verified rule ${rule.id} has no source bundle`);
  }
  if (rule.source_status === "engine_documented" && rule.source_ids.length > 0) {
    throw new Error(`engine-documented rule ${rule.id} unexpectedly cites external sources`);
  }
  for (const sourceId of rule.source_ids) {
    const source = getSourceById(sourceId);
    if (!source) throw new Error(`rule ${rule.id} cites unknown source ${sourceId}`);
    if (!source.systems.includes(rule.system) || !source.supported_rule_ids.includes(rule.id)) {
      throw new Error(`source ${sourceId} does not declare support for rule ${rule.id}`);
    }
  }
}
for (const source of SOURCES) {
  for (const ruleId of source.supported_rule_ids) {
    if (!RULE_BY_ID.has(ruleId)) throw new Error(`source ${source.id} cites unknown rule ${ruleId}`);
  }
}
