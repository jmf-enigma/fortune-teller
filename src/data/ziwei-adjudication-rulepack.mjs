/**
 * Closed policies for the Zi Wei v0.4 adjudication layer.
 *
 * This file contains adjudication mechanics and bounded wording, not a claim
 * that any traditional rule predicts real-world events. Named formations must
 * be supplied by a reviewed, profile-specific rule record; the adjudicator
 * never invents a formation from a loose star list.
 */

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

export const ZIWEI_ADJUDICATION_RULEPACK_META = Object.freeze({
  rulepack_id: "ziwei-professional-adjudication-v0.4",
  schema: "fortune-teller/ziwei-adjudication/v1",
  system: "ziwei",
  origin: "project_authored_adjudication_policy",
  review_status: "registered_candidate_and_exact_predicate_binding_tested",
  predictive_validity: "not_established",
  professional_label_allowed: false,
  aggregation_policy: "profiles_are_independent_no_vote_no_average",
  event_generation: "disallowed",
});

export const ZIWEI_ADJUDICATION_STATES = Object.freeze([
  "candidate",
  "established",
  "damaged",
  "broken",
  "rescued",
  "unresolved",
]);

export const ZIWEI_ADJUDICATION_TRANSITIONS = Object.freeze([
  {
    transition_id: "ZW-ADJ-T01",
    from: "candidate",
    to: "established",
    trigger: "all establishment predicates are present",
    blocked_by: "a material uncertain or conflicting predicate",
  },
  {
    transition_id: "ZW-ADJ-T02",
    from: "established",
    to: "damaged",
    trigger: "at least one registered damage predicate is present",
    blocked_by: "the establishment predicates are incomplete",
  },
  {
    transition_id: "ZW-ADJ-T03",
    from: "damaged",
    to: "broken",
    trigger: "at least one registered break predicate is present",
    blocked_by: "the establishment predicates are incomplete",
  },
  {
    transition_id: "ZW-ADJ-T04",
    from: "broken",
    to: "rescued",
    trigger: "all registered rescue predicates are present after a break",
    blocked_by: "there is no break, or the rescue chain is incomplete",
  },
  {
    transition_id: "ZW-ADJ-T05",
    from: "any_material_state",
    to: "unresolved",
    trigger: "a referenced predicate is uncertain or carries conflicting statuses",
    blocked_by: "all referenced predicates have one unambiguous status",
  },
]);

export const ZIWEI_ADJUDICATION_PROFILES = Object.freeze({
  sanhe: Object.freeze({
    profile_id: "sanhe",
    label_zh: "三合结构",
    question_zh: "主宫、两组三方与对宫是否形成完整结构，助力与压力如何改变成色？",
    admissible_evidence: Object.freeze([
      "palace_relation",
      "star_in_palace",
      "brightness",
      "support_condition",
      "pressure_condition",
    ]),
    formation_boundary_zh: "必须使用一个完整三方四正证据组；不能挑选四宫中有利的部分。",
    empty_palace_policy: "opposite_major_stars_context_only",
    phase_policy: "complete_natal_decadal_yearly_structure",
  }),
  flying_sihua: Object.freeze({
    profile_id: "flying_sihua",
    label_zh: "飞星／四化路径",
    question_zh: "禄、权、科、忌从何宫发出、落到何宫，是否有自化或往返路径？",
    admissible_evidence: Object.freeze([
      "natal_transformation",
      "palace_stem_transformation",
      "incoming_transformation",
      "self_transformation",
      "transformation_route",
    ]),
    formation_boundary_zh: "四化必须同时绑定星、发出宫、落入宫与作用层；不能把四化做吉凶加总。",
    empty_palace_policy: "not_used_for_transformation_routes",
    phase_policy: "same_topic_transformations_in_all_three_layers",
  }),
  zhongzhou: Object.freeze({
    profile_id: "zhongzhou",
    label_zh: "中州结构",
    question_zh: "先定星系与宫位结构，再看庙旺落陷、辅煞与四化如何使格局成立或改判？",
    admissible_evidence: Object.freeze([
      "palace_relation",
      "star_system",
      "star_in_palace",
      "brightness",
      "support_condition",
      "pressure_condition",
      "bounded_transformation_context",
    ]),
    formation_boundary_zh: "格局名只是候选；须逐项核对成立、受损、破格与解救条件。",
    empty_palace_policy: "opposite_major_stars_context_only",
    phase_policy: "complete_natal_decadal_yearly_structure",
  }),
});

export const ZIWEI_STATE_LANGUAGE = Object.freeze({
  candidate: Object.freeze({
    conclusion_zh: "候选结构，已登记条件尚未齐全",
    plain_zh: "目前只看见部分轮廓，不能把它当成完整格局识别。",
  }),
  established: Object.freeze({
    conclusion_zh: "已登记结构条件齐全（不等于完整命名格局识别）",
    plain_zh: "当前只证明这条不可变注册规则的结构条件齐全；没有安装的格局条件仍然未知。",
  }),
  damaged: Object.freeze({
    conclusion_zh: "已登记结构成立，但命中受损条件",
    plain_zh: "核心结构仍在，不过已出现同一注册规则明定的压力条件。",
  }),
  broken: Object.freeze({
    conclusion_zh: "已登记关键条件被破坏，不能按完整结构解读",
    plain_zh: "虽然起初具备结构轮廓，但同一注册规则的破坏条件已经触发。",
  }),
  rescued: Object.freeze({
    conclusion_zh: "结构受破坏后见同一注册规则的完整解救链",
    plain_zh: "破坏条件并未消失，但同时出现了同一不可变规则明定的缓解路径。",
  }),
  unresolved: Object.freeze({
    conclusion_zh: "证据冲突或关键项不确定，暂不裁决",
    plain_zh: "现有资料支持互相冲突的判断，继续下结论会是假精确；先保留未决。",
  }),
});

export const ZIWEI_PHASE_TOPICS = Object.freeze({
  overview: Object.freeze({
    label_zh: "人生整体取向",
    natal_zh: "长期行动方式与优先事项构成本命基线",
    decadal_zh: "阶段环境放大角色安排、资源取舍与应对方式",
    yearly_zh: "当年触发点使优先级与行动节奏更需要被明确处理",
  }),
  career_study: Object.freeze({
    label_zh: "事业与学习",
    natal_zh: "职责承担、技能积累与角色偏好构成本命基线",
    decadal_zh: "阶段环境把职责、资源与协作条件推到前台",
    yearly_zh: "当年触发点要求更具体地安排优先级、边界与执行节奏",
  }),
  wealth_resources: Object.freeze({
    label_zh: "财富与资源",
    natal_zh: "资源取得、配置与管理方式构成本命基线",
    decadal_zh: "阶段环境使资源承托、约束与取舍更加显眼",
    yearly_zh: "当年触发点要求更具体地核对预算、责任与可承受成本",
  }),
  relationships: Object.freeze({
    label_zh: "长期关系",
    natal_zh: "互惠方式、协商习惯与边界安排构成本命基线",
    decadal_zh: "阶段环境放大关系中的角色分配、承诺与调整空间",
    yearly_zh: "当年触发点要求更直接地处理沟通、边界与双方投入",
  }),
  wellbeing_rhythm: Object.freeze({
    label_zh: "身心节律",
    natal_zh: "恢复方式、注意力与负荷管理构成本命基线",
    decadal_zh: "阶段环境使持续负荷与恢复条件更加突出",
    yearly_zh: "当年触发点要求更具体地调整节奏、休息与现实支持",
  }),
});

const CLOSED_PHASE_TOPIC_IDS = Object.freeze(Object.keys(ZIWEI_PHASE_TOPICS));

/**
 * This is deliberately a small registry of replay-checkable structural
 * candidates, not a corpus of traditional named formations. Callers select an
 * ID and topic; they cannot submit their own labels, predicates, or transitions.
 */
export const ZIWEI_ADJUDICATION_CANDIDATES = deepFreeze({
  "ZW-ADJ-SANHE-TOPIC-STRUCTURE": {
    pattern_id: "ZW-ADJ-SANHE-TOPIC-STRUCTURE",
    label_zh: "三方四正主题结构",
    profile_id: "sanhe",
    topics: [...CLOSED_PHASE_TOPIC_IDS],
    claim_ceiling: "bounded_structure_presence_not_named_formation",
    conditions: {
      establish: { all_of: ["complete_topic_structure"] },
      damage: { any_of: [] },
      break: { any_of: [] },
      rescue: { all_of: [] },
    },
    predicates: {
      complete_topic_structure: {
        evidence_kind: "palace_relation",
        resolver: "complete_topic_structure",
      },
    },
    reality_checks_zh: [
      "现实记录是否同时涉及主题主宫、两组三方与对向协调，而不是只挑一项吻合？",
    ],
  },
  "ZW-ADJ-FLYING-SIHUA-TOPIC-PROCESS": {
    pattern_id: "ZW-ADJ-FLYING-SIHUA-TOPIC-PROCESS",
    label_zh: "主题槽四化位置结构",
    profile_id: "flying_sihua",
    topics: [...CLOSED_PHASE_TOPIC_IDS],
    claim_ceiling: "bounded_natal_topic_transformation_presence_not_route_formation",
    conditions: {
      establish: { all_of: ["complete_topic_transformations"] },
      damage: { any_of: [] },
      break: { any_of: [] },
      rescue: { all_of: [] },
    },
    predicates: {
      complete_topic_transformations: {
        evidence_kind: "transformation_route",
        resolver: "complete_topic_transformations",
      },
    },
    reality_checks_zh: [
      "是否完整保留主题四宫内每一条本命四化位置，而没有只挑方便的一条？",
    ],
  },
  "ZW-ADJ-ZHONGZHOU-TOPIC-BASELINE": {
    pattern_id: "ZW-ADJ-ZHONGZHOU-TOPIC-BASELINE",
    label_zh: "中州主题结构基线",
    profile_id: "zhongzhou",
    topics: [...CLOSED_PHASE_TOPIC_IDS],
    claim_ceiling: "bounded_structure_presence_not_named_formation",
    conditions: {
      establish: { all_of: ["complete_topic_structure"] },
      damage: { any_of: [] },
      break: { any_of: [] },
      rescue: { all_of: [] },
    },
    predicates: {
      complete_topic_structure: {
        evidence_kind: "palace_relation",
        resolver: "complete_topic_structure",
      },
    },
    reality_checks_zh: [
      "是否把这条主题结构与尚未登记的星系、亮度、辅煞和四化成败条件明确分开？",
    ],
  },
});

export const ZIWEI_EMPTY_PALACE_RULE = Object.freeze({
  rule_id: "ZW-ADJ-EMPTY-01",
  explicit_request_required: true,
  allowed_source_relation: "opposite_palace_only",
  allowed_fields: Object.freeze(["major_stars"]),
  borrowed_attributes: Object.freeze(["name"]),
  forbidden_fields: Object.freeze([
    "brightness",
    "mutagen",
    "minor_stars",
    "adjective_stars",
    "palace_stem_transformations",
  ]),
  use: "context_only_not_natal_placement",
  revocable_when: Object.freeze([
    "the target palace is no longer empty after calculation correction",
    "the opposite-palace relation changes",
    "the source palace or source stars change",
    "the selected profile does not permit borrowing",
  ]),
});

export const ZIWEI_EVIDENCE_STATUSES = Object.freeze([
  "present",
  "absent",
  "uncertain",
]);

export function getZiweiAdjudicationProfile(profileId) {
  return ZIWEI_ADJUDICATION_PROFILES[profileId] || null;
}

export function getZiweiAdjudicationCandidate(candidateId) {
  return ZIWEI_ADJUDICATION_CANDIDATES[candidateId] || null;
}

export function getZiweiPhaseTopic(topic) {
  return ZIWEI_PHASE_TOPICS[topic] || null;
}
