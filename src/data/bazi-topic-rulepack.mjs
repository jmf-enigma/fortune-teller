/**
 * Closed BaZi topic routes.
 *
 * These routes translate already-calculated structural facts into bounded
 * topic axes. They do not turn a Ten-God label into an event, rank, income,
 * marriage outcome, diagnosis, or probability.
 */

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

export const BAZI_TOPIC_RULEPACK_META = deepFreeze({
  rulepack_id: "bazi-closed-topic-routes-v0.6",
  version: "0.6.0",
  scope: "career_study_wealth_resources_relationships",
  synthesis_policy: "located_natal_facts_then_bounded_topic_routes_then_phase_activation",
  quantitative_policy: "no_scores_no_weights_no_element_counts",
  event_policy: "no_named_event_prediction",
  predictive_validity: "not_established",
  source_refs: [
    "SRC-BZ-ZIPING-ZHENQUAN-NLC",
    "SRC-BZ-DITIAN-SUI-WIKISOURCE",
    "SRC-BZ-SANMING-WIKISOURCE",
  ],
  interpretation_limit: "传统主题映射只用于整理盘内结构；现实结果仍须用现实资料核对。",
  mapping_provenance: {
    status: "project_authored_bounded_mapping",
    rule_id: "R-BZ-009",
    note_zh: "古籍来源只支持十神、日支、原局与岁运层次等传统框架；本文件的三主题白话分类和现实核对问题是项目自拟整理，不冒充古籍原句。",
  },
});

export const BAZI_TOPIC_RULES = deepFreeze({
  career_study: {
    label_zh: "事业与学习",
    axes: [
      {
        axis_id: "career_responsibility",
        label_zh: "职责与约束",
        ten_gods: ["正官", "七杀"],
        plain_zh: "看职责、规范、压力任务怎样进入你的做事方式",
      },
      {
        axis_id: "career_learning_support",
        label_zh: "学习与方法支持",
        ten_gods: ["正印", "偏印"],
        plain_zh: "看知识、方法、训练和支持条件能否接住任务",
      },
      {
        axis_id: "career_output",
        label_zh: "表达与成果输出",
        ten_gods: ["食神", "伤官"],
        plain_zh: "看想法怎样变成表达、作品、解决方案或可交付成果",
      },
    ],
    routes: [
      {
        route_id: "career_responsibility_with_support",
        label_zh: "职责与支持同见",
        requires_axis: ["career_responsibility", "career_learning_support"],
        plain_zh: "盘内同时出现职责要求与学习支持；现实中要核对的是，训练和方法是否真的能接住责任。",
      },
      {
        route_id: "career_output_meets_standards",
        label_zh: "输出与规范同见",
        requires_axis: ["career_output", "career_responsibility"],
        plain_zh: "盘内同时出现输出与规范；重点不是断升迁，而是检查表达、创新和制度要求能否接上。",
      },
      {
        route_id: "career_learning_to_output",
        label_zh: "学习与输出同见",
        requires_axis: ["career_learning_support", "career_output"],
        plain_zh: "盘内同时出现学习支持与成果输出；重点核对所学能否形成稳定产出，而非只停在准备阶段。",
      },
    ],
    boundary_zh: "不据此预测录取、考试、升职、职位高低或具体职业。",
  },
  wealth_resources: {
    label_zh: "财富与资源",
    axes: [
      {
        axis_id: "wealth_resource",
        label_zh: "资源取得与配置",
        ten_gods: ["正财", "偏财"],
        plain_zh: "看稳定资源、流动机会、交换责任和配置方式",
      },
      {
        axis_id: "wealth_output",
        label_zh: "产出转化",
        ten_gods: ["食神", "伤官"],
        plain_zh: "看表达、产品或成果怎样形成可交换的价值",
      },
      {
        axis_id: "wealth_shared_boundary",
        label_zh: "共同资源边界",
        ten_gods: ["比肩", "劫财"],
        plain_zh: "看同辈合作、竞争和共同资源怎样分配",
      },
    ],
    routes: [
      {
        route_id: "wealth_output_to_resource",
        label_zh: "产出与资源同见",
        requires_axis: ["wealth_output", "wealth_resource"],
        plain_zh: "盘内同时出现产出与资源轴；现实中应核对成果是否真的形成稳定交换，而不是把“有财星”写成有钱。",
      },
      {
        route_id: "wealth_resource_boundary",
        label_zh: "资源与边界同见",
        requires_axis: ["wealth_resource", "wealth_shared_boundary"],
        plain_zh: "盘内同时出现资源与共同分配轴；重点核对合作、竞争、所有权和责任边界。",
      },
    ],
    boundary_zh: "不据此预测收入金额、贫富等级、投资回报、中奖或破财事件。",
  },
  relationships: {
    label_zh: "长期关系",
    axes: [],
    routes: [],
    day_branch_policy: "day_branch_is_primary_context_not_a_marriage_outcome",
    spouse_star_policy: "only_when_chart_sex_parameter_is_explicit_and_never_as_partner_description",
    spouse_star_school_variance_zh: "男命财星、女命官杀只作本规则包采用的传统补充口径；正偏并读、取用轻重及现代适用方式存在流派差异。",
    boundary_zh: "不据此判断忠诚、婚姻次数、对象外貌、结婚离婚日期或关系必然结果。",
  },
});

export const BAZI_RELATIONSHIP_FACT_MEANINGS = deepFreeze({
  branch_repetition: {
    label_zh: "伏吟/同支",
    plain_zh: "同一相处模式被重复强调；要用现实记录区分稳定延续与反复卡住。",
  },
  branch_self_punishment: {
    label_zh: "自刑候选",
    plain_zh: "重复模式可能伴随自我牵制；具体强度和含义仍有流派差异。",
  },
  branch_six_harmony: {
    label_zh: "六合",
    plain_zh: "存在连接、协商或靠近的结构条件，但“合”本身不等于关系结果好。",
  },
  branch_clash: {
    label_zh: "相冲",
    plain_zh: "存在节奏、位置或安排上的直接拉动；重点核对怎样调整，而不是直接断分离。",
  },
  branch_harm: {
    label_zh: "相害",
    plain_zh: "存在较隐蔽的不顺手或互相牵制；需要现实沟通证据，不能直接写成背叛。",
  },
  branch_break: {
    label_zh: "相破",
    plain_zh: "既有安排可能出现松动或配合不稳；不单凭这一项断关系破裂。",
  },
  branch_punishment: {
    label_zh: "相刑",
    plain_zh: "存在规则、边界或反复摩擦的候选；两支是否足以成刑要保留流派边界。",
  },
  branch_full_three_punishment: {
    label_zh: "三刑齐全",
    plain_zh: "完整三支结构已出现，但仍只提示边界与摩擦议题，不命名具体事件。",
  },
});

export function getBaziTopicRule(topic) {
  return typeof topic === "string" && Object.hasOwn(BAZI_TOPIC_RULES, topic)
    ? BAZI_TOPIC_RULES[topic]
    : null;
}
