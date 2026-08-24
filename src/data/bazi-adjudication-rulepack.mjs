/**
 * BaZi v0.5 professional adjudication rule pack.
 *
 * This pack is deliberately qualitative.  It records competing traditional
 * lenses, their prerequisites, and their defeaters.  It contains no element
 * weights, confidence percentages, or cross-school averaging.
 */

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

export const BAZI_ADJUDICATION_STATES = deepFreeze({
  established: "成立",
  damaged: "受损",
  broken: "破格",
  rescued: "救应",
  unresolved: "未决",
});

export const BAZI_DIRECTION_ONTOLOGY = deepFreeze({
  比肩: { kind: "ten_god", members: ["比肩"] },
  劫财: { kind: "ten_god", members: ["劫财"] },
  食神: { kind: "ten_god", members: ["食神"] },
  伤官: { kind: "ten_god", members: ["伤官"] },
  正财: { kind: "ten_god", members: ["正财"] },
  偏财: { kind: "ten_god", members: ["偏财"] },
  正官: { kind: "ten_god", members: ["正官"] },
  七杀: { kind: "ten_god", members: ["七杀"] },
  正印: { kind: "ten_god", members: ["正印"] },
  偏印: { kind: "ten_god", members: ["偏印"] },
  比劫: { kind: "ten_god_group", members: ["比肩", "劫财"] },
  食伤: { kind: "ten_god_group", members: ["食神", "伤官"] },
  财星: { kind: "ten_god_group", members: ["正财", "偏财"] },
  官杀: { kind: "ten_god_group", members: ["正官", "七杀"] },
  印星: { kind: "ten_god_group", members: ["正印", "偏印"] },
  财印: { kind: "ten_god_group", members: ["正财", "偏财", "正印", "偏印"] },
  木: { kind: "element", members: ["木"] },
  火: { kind: "element", members: ["火"] },
  土: { kind: "element", members: ["土"] },
  金: { kind: "element", members: ["金"] },
  水: { kind: "element", members: ["水"] },
});

export const BAZI_ADJUDICATION_RULEPACK_META = deepFreeze({
  rulepack_id: "bazi-professional-adjudication-v0.5",
  school_scope: "bounded_ziping_competing_lenses",
  version: "0.5.0",
  synthesis_policy: "independent_lenses_then_explicit_conflict",
  quantitative_policy: "no_scores_no_weights_no_school_averaging",
  phase_policy: "natal_baseline_then_decadal_environment_then_yearly_trigger",
  event_policy: "no_named_event_prediction",
  route_closure_policy: "visible_presence_can_close_a_screening_predicate_but_cannot_close_location_strength_or_effect",
  source_audit_status: "ziping_chapter_9_and_27_anchored_with_bounded_machine_routes",
  sources: [
    {
      id: "SRC-BZ-LUNAR-TS-1.8.6",
      source_status: "registry_verified_implementation_provenance_only",
      supports: ["pillars", "hidden_stems", "ten_god_labels", "growth_phase_labels"],
      does_not_support: ["strength_verdict", "pattern_success", "useful_god", "prediction"],
    },
    {
      id: "SRC-BZ-SANMING-WIKISOURCE",
      source_status: "registry_verified_historical_provenance_only",
      supports: ["four_pillars_vocabulary", "ten_god_vocabulary", "stem_branch_relations"],
      does_not_support: ["empirical_accuracy", "universal_school_priority"],
    },
    {
      id: "SRC-BZ-ZIPING-ZHENQUAN-NLC",
      title: "子平真诠",
      source_status: "primary_scan_chapter_9_and_27_verified",
      url: "https://upload.wikimedia.org/wikipedia/commons/f/fe/NLC416-11jh010455-35296_%E5%AD%90%E5%B9%B3%E7%9C%9F%E8%A9%AE.pdf",
      supports: ["month_command_pattern", "formation_damage_rescue", "whole_decade_period_reading"],
      does_not_support: ["project_shortcuts_as_complete_ziping", "empirical_predictive_accuracy"],
    },
    {
      id: "SRC-BZ-DITIAN-SUI-WIKISOURCE",
      title: "滴天髓",
      source_status: "registry_verified_method_provenance_only",
      intended_scope: ["strength_and_global_tendency", "root_and_support", "natal_luck_year_hierarchy"],
    },
    {
      id: "SRC-BZ-QIONGTONG-WIKISOURCE",
      title: "穷通宝鉴",
      source_status: "primary_transcription_120_entry_source_mention_index_verified",
      intended_scope: ["climate_source_mentions_and_chart_location_screening"],
      does_not_support: ["fixed_priority_order_without_entry_conditions", "useful_god_efficacy", "prediction"],
    },
  ],
});

export const BAZI_ADJUDICATION_RULES = deepFreeze([
  {
    id: "R-BZ-A04-001",
    lens: "adjudication",
    summary: "Keep plausible readings as competing hypotheses until their own prerequisites are met.",
    source_status: "project_authored_audit_guard",
    source_refs: [],
    prerequisites: ["replay-verified known-time BaZi calculation", "four emitted pillars"],
    requires: ["state", "supporting_evidence", "contrary_evidence", "change_conditions"],
    forbids: ["score averaging", "majority vote across schools", "silent conflict suppression"],
  },
  {
    id: "R-BZ-A04-002",
    lens: "strength",
    summary: "Test strong and weak Day-Master hypotheses separately from month context, roots, visible support, and visible pressure.",
    source_status: "historical_method_provenance_pending_rule_level_source_audit",
    source_refs: ["SRC-BZ-SANMING-WIKISOURCE", "SRC-BZ-DITIAN-SUI-WIKISOURCE"],
    prerequisites: ["month hidden-stem Ten-God order", "root locations", "visible stem Ten-God relations"],
    requires: ["both strong and weak hypotheses", "no pooled element total"],
    forbids: ["fixed hidden-stem weights", "single strength percentage", "missing-element shortcut"],
  },
  {
    id: "R-BZ-A04-003",
    lens: "pattern",
    summary: "Treat the month-command pattern as a candidate, then record formation, damage, breakage, and rescue as a state history.",
    source_status: "primary_chapter_anchored_bounded_machine_routes",
    source_refs: ["SRC-BZ-ZIPING-ZHENQUAN-NLC"],
    prerequisites: ["month-command Ten God", "declared formation route", "paired damage and rescue conditions"],
    requires: ["candidate label", "matched formation route", "state history", "paired damage and rescue evidence", "coverage boundary"],
    forbids: ["pattern name from element count", "calling every month-command label a completed pattern"],
  },
  {
    id: "R-BZ-A04-004",
    lens: "useful_god_views",
    summary: "Keep pattern, support/balance, climate, passage, and disease/remedy views independent.",
    source_status: "project_authored_conflict_guard_with_historical_method_anchors",
    source_refs: ["SRC-BZ-ZIPING-ZHENQUAN-NLC", "SRC-BZ-DITIAN-SUI-WIKISOURCE", "SRC-BZ-QIONGTONG-WIKISOURCE"],
    prerequisites: ["each lens has its own applicable facts", "unavailable source tables remain unavailable"],
    requires: ["lens-specific conclusion", "lens-specific change condition", "ontology-expanded directions", "conflict only from an explicit exclusion"],
    forbids: ["one universal useful element", "fixed priority across all charts", "averaging different schools"],
  },
  {
    id: "R-BZ-A04-005",
    lens: "phase",
    summary: "The natal adjudication remains the baseline; a decade changes the environment and a year only marks a trigger.",
    source_status: "classical_hierarchy_anchored_bounded_interaction_rulepack",
    source_refs: ["SRC-BZ-ZIPING-ZHENQUAN-NLC", "SRC-BZ-DITIAN-SUI-WIKISOURCE"],
    prerequisites: ["natal adjudication", "replay-verified luck-cycle facts emitted inside the BaZi calculation"],
    requires: ["natal baseline", "decadal environment", "yearly trigger"],
    forbids: ["external period fallback", "year replaces natal structure", "period stem alone names an event", "whole-life verdict from one year"],
  },
  {
    id: "R-BZ-A04-006",
    lens: "communication",
    summary: "Present conclusion first, then plain language, basis, change conditions, and reality checks.",
    source_status: "project_authored_communication_contract",
    source_refs: [],
    prerequisites: ["adjudication completed or explicitly unavailable"],
    requires: ["conclusion", "plain_language", "basis", "change_conditions", "reality_checks"],
    forbids: ["technical metadata before the result", "fatalistic language", "specific event names"],
  },
]);

const COMMON_PATTERN_SOURCE = {
  source_status: "primary_chapter_anchored_bounded_machine_routes",
  source_refs: ["SRC-BZ-ZIPING-ZHENQUAN-NLC", "chapter_9_formation_failure_rescue"],
  prerequisites: [
    "month-branch hidden-stem candidates are available without claiming the exact human commander",
    "visible stems are kept separate from hidden stems",
    "only explicitly encoded compound routes may change state",
  ],
};

export const BAZI_MONTH_COMMAND_PATTERN_RULES = deepFreeze({
  正官: {
    ...COMMON_PATTERN_SOURCE,
    label: "正官格候选",
    maintain: ["财星", "印星"], damage: ["伤官"], rescue: ["正印", "偏印"],
    formation_routes: [
      { id: "F-OFFICER-WEALTH", label: "官逢财", all: ["visible:财星"] },
      { id: "F-OFFICER-PRINT", label: "官逢印", all: ["visible:印星"] },
    ],
    damage_routes: [
      { id: "D-OFFICER-HURT", label: "官逢伤", all: ["visible:伤官"], closure: "presence_closed_effect_unresolved" },
      { id: "D-OFFICER-BRANCH", label: "月令官星一侧见刑冲破害", all: ["month:刑冲破害"], closure: "screening_only" },
    ],
    rescue_routes: [
      { id: "R-OFFICER-HURT-PRINT", label: "透印解伤护官", for_damage: "D-OFFICER-HURT", all: ["visible:印星"], closure: "presence_closed_effect_unresolved" },
    ],
  },
  七杀: {
    ...COMMON_PATTERN_SOURCE,
    label: "七杀格候选",
    maintain: ["食神", "印星"], damage: ["财星"], rescue: ["食神", "伤官"],
    formation_routes: [
      { id: "F-KILL-CONTROLLED", label: "有根有助而七杀有制", all: ["strength:can_carry", "visible:食伤"] },
      { id: "F-KILL-PRINT", label: "杀印相生", all: ["visible:印星"] },
    ],
    damage_routes: [
      { id: "D-KILL-WEALTH", label: "七杀逢财增杀", all: ["visible:财星"], closure: "presence_closed_effect_unresolved" },
    ],
    rescue_routes: [
      { id: "R-KILL-WEALTH-FOOD", label: "食神制杀以解财增杀", for_damage: "D-KILL-WEALTH", all: ["visible:食神"], closure: "presence_closed_effect_unresolved" },
    ],
  },
  正财: {
    ...COMMON_PATTERN_SOURCE,
    label: "正财格候选",
    maintain: ["食伤", "正官"], damage: ["七杀", "比劫"], rescue: ["食神", "正官"],
    formation_routes: [
      { id: "F-WEALTH-OFFICER", label: "财生官", all: ["visible:正官"] },
      { id: "F-WEALTH-FOOD-STRONG", label: "食伤生财而有根带比", all: ["visible:食伤", "strength:can_carry", "visible:比劫"] },
    ],
    damage_routes: [
      { id: "D-WEALTH-KILL", label: "财格透七杀", all: ["visible:七杀"], closure: "presence_closed_effect_unresolved" },
      { id: "D-WEALTH-ROBBERY", label: "比劫争财", all: ["visible:比劫"], closure: "presence_closed_effect_unresolved" },
    ],
    rescue_routes: [
      { id: "R-WEALTH-KILL-FOOD", label: "食神制杀以存财", for_damage: "D-WEALTH-KILL", all: ["visible:食神"], closure: "presence_closed_effect_unresolved" },
      { id: "R-WEALTH-ROBBERY-OFFICER", label: "官星制比劫以护财", for_damage: "D-WEALTH-ROBBERY", all: ["visible:正官"], closure: "presence_closed_effect_unresolved" },
    ],
  },
  偏财: {
    ...COMMON_PATTERN_SOURCE,
    label: "偏财格候选",
    maintain: ["食伤", "正官"], damage: ["七杀", "比劫"], rescue: ["食神", "正官"],
    formation_routes: [
      { id: "F-WEALTH-OFFICER", label: "财生官", all: ["visible:正官"] },
      { id: "F-WEALTH-FOOD-STRONG", label: "食伤生财而有根带比", all: ["visible:食伤", "strength:can_carry", "visible:比劫"] },
    ],
    damage_routes: [
      { id: "D-WEALTH-KILL", label: "财格透七杀", all: ["visible:七杀"], closure: "presence_closed_effect_unresolved" },
      { id: "D-WEALTH-ROBBERY", label: "比劫争财", all: ["visible:比劫"], closure: "presence_closed_effect_unresolved" },
    ],
    rescue_routes: [
      { id: "R-WEALTH-KILL-FOOD", label: "食神制杀以存财", for_damage: "D-WEALTH-KILL", all: ["visible:食神"], closure: "presence_closed_effect_unresolved" },
      { id: "R-WEALTH-ROBBERY-OFFICER", label: "官星制比劫以护财", for_damage: "D-WEALTH-ROBBERY", all: ["visible:正官"], closure: "presence_closed_effect_unresolved" },
    ],
  },
  正印: {
    ...COMMON_PATTERN_SOURCE,
    label: "正印格候选",
    maintain: ["官杀", "食伤"], damage: ["财星"], rescue: ["比肩", "劫财"],
    formation_routes: [
      { id: "F-PRINT-OFFICER", label: "官印相生", all: ["visible:正官"] },
      { id: "F-PRINT-OUTPUT", label: "身印有根有助而食伤泄秀", all: ["strength:can_carry", "visible:食伤"] },
    ],
    damage_routes: [
      { id: "D-PRINT-WEALTH", label: "财星坏印", all: ["visible:财星"], closure: "presence_closed_effect_unresolved" },
    ],
    rescue_routes: [
      { id: "R-PRINT-WEALTH-PEER", label: "比劫制财以护印", for_damage: "D-PRINT-WEALTH", all: ["visible:比劫"], closure: "presence_closed_effect_unresolved" },
    ],
  },
  偏印: {
    ...COMMON_PATTERN_SOURCE,
    label: "偏印格候选",
    maintain: ["官杀", "食伤"], damage: ["财星", "食神"], rescue: ["比肩", "劫财", "财星"],
    formation_routes: [
      { id: "F-PRINT-OFFICER", label: "官印相生", all: ["visible:正官"] },
      { id: "F-PRINT-OUTPUT", label: "身印有根有助而食伤泄秀", all: ["strength:can_carry", "visible:食伤"] },
    ],
    damage_routes: [
      { id: "D-PRINT-WEALTH", label: "财星坏印", all: ["visible:财星"], closure: "presence_closed_effect_unresolved" },
      { id: "D-OWL-FOOD", label: "枭印夺食", all: ["visible:食神"], closure: "presence_closed_effect_unresolved" },
    ],
    rescue_routes: [
      { id: "R-PRINT-WEALTH-PEER", label: "比劫制财以护印", for_damage: "D-PRINT-WEALTH", all: ["visible:比劫"], closure: "presence_closed_effect_unresolved" },
      { id: "R-OWL-FOOD-WEALTH", label: "财星制枭以护食", for_damage: "D-OWL-FOOD", all: ["visible:财星"], closure: "presence_closed_effect_unresolved" },
    ],
  },
  食神: {
    ...COMMON_PATTERN_SOURCE,
    label: "食神格候选",
    maintain: ["财星"], damage: ["偏印", "七杀"], rescue: ["财星"],
    formation_routes: [
      { id: "F-FOOD-WEALTH", label: "食神生财", all: ["visible:财星"] },
      { id: "F-FOOD-KILL-PRINT", label: "食带杀而无财，透印转入杀印路线", all: ["visible:七杀", "visible:印星", "absent:财星"] },
    ],
    damage_routes: [
      { id: "D-FOOD-OWL", label: "食神逢枭", all: ["visible:偏印"], closure: "presence_closed_effect_unresolved" },
      { id: "D-FOOD-WEALTH-KILL", label: "食神生财而又露杀", all: ["visible:财星", "visible:七杀"], closure: "screening_only" },
    ],
    rescue_routes: [
      { id: "R-FOOD-OWL-WEALTH", label: "财星制枭护食", for_damage: "D-FOOD-OWL", all: ["visible:财星"], closure: "presence_closed_effect_unresolved" },
    ],
  },
  伤官: {
    ...COMMON_PATTERN_SOURCE,
    label: "伤官格候选",
    maintain: ["财星", "印星"], damage: ["正官", "七杀"], rescue: ["财星", "印星"],
    formation_routes: [
      { id: "F-HURT-WEALTH", label: "伤官生财", all: ["visible:财星"] },
      { id: "F-HURT-KILL-NO-WEALTH", label: "伤官带杀而无财", all: ["visible:七杀", "absent:财星"] },
    ],
    damage_routes: [
      { id: "D-HURT-OFFICER-NON-METAL-WATER", label: "非金水伤官见官", all: ["visible:正官", "command:not_metal_water"], closure: "presence_closed_effect_unresolved" },
    ],
    rescue_routes: [
      { id: "R-HURT-OFFICER-PRINT", label: "印星制伤以护官", for_damage: "D-HURT-OFFICER-NON-METAL-WATER", all: ["visible:印星"], closure: "presence_closed_effect_unresolved" },
    ],
  },
  比肩: {
    ...COMMON_PATTERN_SOURCE,
    label: "建禄候选",
    maintain: ["财星", "官杀", "食伤"], damage: [], rescue: ["财星", "官杀", "食伤"],
    formation_routes: [
      { id: "F-LU-OFFICER", label: "透官并见财印", all: ["visible:正官", "visible:财印"] },
      { id: "F-LU-WEALTH", label: "透财并见食伤", all: ["visible:财星", "visible:食伤"] },
      { id: "F-LU-KILL", label: "透杀而遇制", all: ["visible:七杀", "visible:食伤"] },
    ],
    damage_routes: [
      { id: "D-LU-WEALTH-ROBBERY", label: "禄格见财又逢比劫", all: ["visible:财星", "visible:比劫"], closure: "presence_closed_effect_unresolved" },
    ],
    rescue_routes: [
      { id: "R-LU-WEALTH-OFFICER", label: "官星制比劫以护财", for_damage: "D-LU-WEALTH-ROBBERY", all: ["visible:正官"], closure: "presence_closed_effect_unresolved" },
    ],
  },
  劫财: {
    ...COMMON_PATTERN_SOURCE,
    label: "月劫候选",
    maintain: ["财星", "官杀", "食伤"], damage: [], rescue: ["财星", "官杀", "食伤"],
    formation_routes: [
      { id: "F-JIE-OFFICER", label: "透官并见财印", all: ["visible:正官", "visible:财印"] },
      { id: "F-JIE-WEALTH", label: "透财并见食伤", all: ["visible:财星", "visible:食伤"] },
      { id: "F-JIE-KILL", label: "透杀而遇制", all: ["visible:七杀", "visible:食伤"] },
    ],
    damage_routes: [
      { id: "D-JIE-WEALTH-ROBBERY", label: "月劫见财又逢比劫", all: ["visible:财星", "visible:比劫"], closure: "presence_closed_effect_unresolved" },
    ],
    rescue_routes: [
      { id: "R-JIE-WEALTH-OFFICER", label: "官星制比劫以护财", for_damage: "D-JIE-WEALTH-ROBBERY", all: ["visible:正官"], closure: "presence_closed_effect_unresolved" },
    ],
  },
});

export const BAZI_VIEW_DEFINITIONS = deepFreeze({
  strength: {
    source_status: "historical_method_provenance_pending_rule_level_source_audit",
    source_refs: ["SRC-BZ-DITIAN-SUI-WIKISOURCE", "SRC-BZ-SANMING-WIKISOURCE"],
    prerequisites: ["month context", "roots", "visible support", "visible pressure"],
  },
  pattern: {
    source_status: "historical_method_provenance_pending_rule_level_source_audit",
    source_refs: ["SRC-BZ-ZIPING-ZHENQUAN-NLC"],
    prerequisites: ["month-command relation", "formation/damage/rescue evidence"],
  },
  climate: {
    source_status: "base_120_entry_lookup_installed_with_exception_boundary",
    source_refs: ["SRC-BZ-QIONGTONG-WIKISOURCE"],
    prerequisites: ["verified day-stem/month-branch base entry", "visible and hidden stem locations"],
  },
  support_balance: {
    source_status: "historical_method_provenance_pending_rule_level_source_audit",
    source_refs: ["SRC-BZ-DITIAN-SUI-WIKISOURCE"],
    prerequisites: ["strength hypothesis reaches a non-conflicted result"],
  },
  passage: {
    source_status: "bounded_visible_control_pair_and_mediator_route",
    source_refs: ["SRC-BZ-DITIAN-SUI-WIKISOURCE"],
    prerequisites: ["two opposed forces and a viable mediating relation are explicitly established"],
  },
  disease_remedy: {
    source_status: "project_authored_translation_of_pattern_damage_and_rescue",
    source_refs: ["SRC-BZ-ZIPING-ZHENQUAN-NLC"],
    prerequisites: ["specific damage condition", "specific corresponding rescue condition"],
  },
});

const RULE_BY_ID = new Map(BAZI_ADJUDICATION_RULES.map((rule) => [rule.id, rule]));

export function getBaziAdjudicationRule(id) {
  return RULE_BY_ID.get(id);
}

if (RULE_BY_ID.size !== BAZI_ADJUDICATION_RULES.length) {
  throw new Error("BaZi adjudication rule pack contains duplicate rule IDs");
}
