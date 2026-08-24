import { FortuneTellerError } from "./errors.mjs";

const CANONICAL_GOALS = new Set(["life_overview", "life_domain", "current_question"]);
const QUESTION_KINDS = new Set(["open", "decision_action", "change_structure", "two_number_meihua"]);
const LIFE_DOMAINS = new Set([
  "career_study", "wealth_resources", "relationships", "family_social", "wellbeing_rhythm",
]);

const GOAL_ALIASES = Object.freeze({
  birth_overview: { goal: "life_overview", question_kind: null },
  current_decision: { goal: "current_question", question_kind: "decision_action" },
  current_action: { goal: "current_question", question_kind: "decision_action" },
  current_decision_action: { goal: "current_question", question_kind: "decision_action" },
  change_structure: { goal: "current_question", question_kind: "change_structure" },
  two_number_meihua: { goal: "current_question", question_kind: "two_number_meihua" },
});

const AVAILABLE_DATA_KEYS = new Set([
  "birth_date",
  "birth_time",
  "timezone",
  "chart_sex",
  "coordinates",
  "focused_question",
  "first_number",
  "second_number",
  "tarot_cards",
  "iching_lines",
]);

const PREFERENCE_KEYS = new Set([
  "wants_period_timing",
  "wants_western_houses",
  "allow_local_generation",
]);

const METHOD_LABELS = Object.freeze({
  bazi: "四柱八字",
  ziwei: "紫微斗数",
  western: "西洋本命盘",
  tarot: "塔罗",
  iching: "周易三钱",
  meihua: "梅花两数",
});

const DATA_LABELS = Object.freeze({
  birth_date: "出生日期",
  birth_time: "出生时刻",
  timezone: "出生地时区",
  chart_sex: "传统排盘所需的顺逆参数",
  coordinates: "出生地经纬度",
  focused_question: "一句聚焦问题",
  first_number: "第一个正整数",
  second_number: "第二个正整数",
  tarot_cards: "实体或手动录入的塔罗牌",
  iching_lines: "自下而上的六个实体爻值",
});

export const METHOD_ROUTER_META = Object.freeze({
  schema: "fortune-teller/method-router/v1",
  routing_basis: "question_and_data_fit_only",
  comparison_boundary: "只比较问题类型、已提供资料和当前实现范围；不把排序解释成任何方法天生更可靠。",
  predictive_validity: "not_established",
});

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function assertKnownKeys(value, allowed, at) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new FortuneTellerError(
        "METHOD_ROUTER_INPUT_INVALID",
        `${at} contains unsupported field ${key}`,
      );
    }
  }
}

function normalizeBooleanMap(value, allowed, at, defaults = {}) {
  if (value === undefined) return { ...defaults };
  if (!isPlainObject(value)) {
    throw new FortuneTellerError("METHOD_ROUTER_INPUT_INVALID", `${at} must be an object`);
  }
  assertKnownKeys(value, allowed, at);
  const normalized = { ...defaults };
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== "boolean") {
      throw new FortuneTellerError("METHOD_ROUTER_INPUT_INVALID", `${at}.${key} must be boolean`);
    }
    normalized[key] = item;
  }
  return normalized;
}

function normalizeRequest(rawRequest) {
  if (!isPlainObject(rawRequest)) {
    throw new FortuneTellerError("METHOD_ROUTER_INPUT_INVALID", "method routing request must be an object");
  }
  assertKnownKeys(rawRequest, new Set(["goal", "domain", "question_kind", "available_data", "preferences"]), "request");

  if (typeof rawRequest.goal !== "string" || !rawRequest.goal.trim()) {
    throw new FortuneTellerError("METHOD_ROUTER_INPUT_INVALID", "request.goal is required");
  }
  const suppliedGoal = rawRequest.goal.trim();
  const alias = GOAL_ALIASES[suppliedGoal] || null;
  const goal = alias?.goal || suppliedGoal;
  if (!CANONICAL_GOALS.has(goal)) {
    throw new FortuneTellerError(
      "METHOD_ROUTER_INPUT_INVALID",
      "request.goal must describe a life overview, one life domain, or a current question",
    );
  }

  if (rawRequest.question_kind !== undefined && typeof rawRequest.question_kind !== "string") {
    throw new FortuneTellerError("METHOD_ROUTER_INPUT_INVALID", "request.question_kind must be a string");
  }
  const suppliedQuestionKind = rawRequest.question_kind?.trim() || null;
  if (alias?.question_kind && suppliedQuestionKind && suppliedQuestionKind !== alias.question_kind) {
    throw new FortuneTellerError(
      "METHOD_ROUTER_INPUT_INVALID",
      "request.goal and request.question_kind describe different current-question routes",
    );
  }
  const questionKind = goal === "current_question"
    ? (alias?.question_kind || suppliedQuestionKind || "open")
    : null;
  if (questionKind && !QUESTION_KINDS.has(questionKind)) {
    throw new FortuneTellerError(
      "METHOD_ROUTER_INPUT_INVALID",
      `request.question_kind must be one of: ${[...QUESTION_KINDS].join(", ")}`,
    );
  }
  if (goal !== "current_question" && suppliedQuestionKind) {
    throw new FortuneTellerError(
      "METHOD_ROUTER_INPUT_INVALID",
      "request.question_kind is only allowed for a current-question route",
    );
  }

  if (rawRequest.domain !== undefined && typeof rawRequest.domain !== "string") {
    throw new FortuneTellerError("METHOD_ROUTER_INPUT_INVALID", "request.domain must be a string");
  }
  const domain = rawRequest.domain?.trim() || null;
  if (goal === "life_domain" && !LIFE_DOMAINS.has(domain)) {
    throw new FortuneTellerError(
      "METHOD_ROUTER_INPUT_INVALID",
      `request.domain is required for life_domain and must be one of: ${[...LIFE_DOMAINS].join(", ")}`,
    );
  }
  if (goal !== "life_domain" && domain) {
    throw new FortuneTellerError(
      "METHOD_ROUTER_INPUT_INVALID",
      "request.domain is only allowed for a life_domain route",
    );
  }

  return {
    goal,
    domain,
    question_kind: questionKind,
    available_data: normalizeBooleanMap(rawRequest.available_data, AVAILABLE_DATA_KEYS, "request.available_data"),
    preferences: normalizeBooleanMap(
      rawRequest.preferences,
      PREFERENCE_KEYS,
      "request.preferences",
      {
        wants_period_timing: false,
        wants_western_houses: false,
        allow_local_generation: true,
      },
    ),
  };
}

function missing(field, impact, why) {
  return { field, label: DATA_LABELS[field], impact, why };
}

function makeOption({ system, fit, reason, missingData = [], limits = [], selectionCue, supported = true }) {
  const uniqueMissing = [];
  const seen = new Set();
  for (const item of missingData) {
    const signature = `${item.field}\u0000${item.impact}`;
    if (!seen.has(signature)) {
      seen.add(signature);
      uniqueMissing.push(item);
    }
  }
  const hasBlockingGap = uniqueMissing.some((item) => (
    item.impact === "blocks_method" || item.impact === "blocks_requested_scope"
  ));
  const hasScopeGap = uniqueMissing.some((item) => item.impact === "limits_scope");
  const readiness = !supported
    ? "unavailable"
    : hasBlockingGap
    ? "needs_data"
    : (hasScopeGap || system === "meihua" ? "ready_with_limits" : "ready");
  return {
    system,
    label: METHOD_LABELS[system],
    fit,
    readiness,
    reason,
    selection_cue: selectionCue,
    supported,
    missing_data: uniqueMissing,
    limits: [...new Set(limits)],
  };
}

function birthBaseMissing(data) {
  const result = [];
  if (!data.birth_date) {
    result.push(missing("birth_date", "blocks_method", "没有出生日期就不能建立出生盘。"));
  }
  if (!data.timezone) {
    result.push(missing("timezone", "blocks_method", "需要时区把民用日期和时刻放到一致的时间基准。"));
  }
  return result;
}

function baziOption(data, preferences, domain = null) {
  const missingData = birthBaseMissing(data);
  const limits = [];
  if (!data.birth_time) {
    missingData.push(missing(
      "birth_time",
      "limits_scope",
      "仍可分析全天稳定或分段成立的结构，但不会替你猜一个时柱。",
    ));
    limits.push("未知时辰时不返回单一时柱，时柱相关结论和阶段细节会省略或分段呈现。");
  }
  if (preferences.wants_period_timing && !data.chart_sex) {
    missingData.push(missing(
      "chart_sex",
      "limits_scope",
      "当前大运顺逆计算需要这个传统二元参数；它不会被当作身份判断。",
    ));
  }
  if (preferences.wants_period_timing && (!data.birth_time || !data.chart_sex)) {
    limits.push("缺少出生时刻或传统顺逆参数时，不能生成指定日期的大运流年重判链。");
  }
  return makeOption({
    system: "bazi",
    fit: domain ? "supporting" : "parallel",
    reason: domain
      ? "当前已闭合的八字结果层只做整体旺衰、格局与阶段路线，不把十神直接泛化成指定人生领域。"
      : "适合把出生资料组织成四柱结构，并查看季节条件、格局成败与阶段触发；时辰未知时仍可做受限分析。",
    selectionCue: domain
      ? "若要看八字整体结构，请改选人生整体；本轮指定领域不返回一个无依据的套话答案。"
      : "想看四柱、旺衰证据、格局条件和已实现的大运流年链时选它。",
    missingData,
    limits: domain ? [...limits, "当前版本尚未安装八字指定领域的闭合主题路由。"] : limits,
    supported: !domain,
  });
}

function ziweiOption(data, preferences, domain = null) {
  const missingData = birthBaseMissing(data);
  const limits = [];
  if (!data.chart_sex) {
    missingData.push(missing(
      "chart_sex",
      "blocks_method",
      "紫微排盘算法要求明确这个传统二元参数；它不会被当作身份判断。",
    ));
  }
  if (!data.birth_time) {
    missingData.push(missing(
      "birth_time",
      domain ? "blocks_requested_scope" : "limits_scope",
      domain
        ? "指定领域需要一张唯一命盘来绑定主题宫与三方四正；未知时辰时不会从候选盘中挑一张。"
        : "仍可扫描当天不同排盘区间，但不会替你选定一张命盘。",
    ));
    limits.push("未知时辰时保留多个真实时段对应的盘面区间，不把其中一个说成确定结果。");
  }
  if (preferences.wants_period_timing && !data.birth_time) {
    limits.push("没有出生时刻时，不能生成指定日期的大限与流年主题链。");
  }
  return makeOption({
    system: "ziwei",
    fit: domain ? "direct" : "parallel",
    reason: domain === "family_social"
      ? "家庭与广义人际会跨田宅、父母、兄弟、交友等多宫；当前没有安装这一合并路线。"
      : "适合按宫位网络和主题轴看人生领域；时辰未知时会保留多个排盘区间，不会替你猜一张盘。",
    selectionCue: domain === "family_social"
      ? "当前请改用已支持家庭与社交主题宫位的西洋本命盘；不要拿夫妻宫或命宫代替多宫合判。"
      : "想按事业、关系、财富等宫位主题展开，并在资料足够时看阶段主题时选它。",
    missingData,
    limits: domain === "family_social"
      ? [...limits, "当前紫微封闭主题表不支持家庭与广义人际合并主题。"]
      : limits,
    supported: domain !== "family_social",
  });
}

function westernOption(data, preferences, domain = null) {
  const missingData = birthBaseMissing(data);
  const limits = ["当前实现只做本命结构，不做行运或事件时间预测。"];
  if (!data.birth_time) {
    missingData.push(missing(
      "birth_time",
      domain ? "blocks_requested_scope" : "limits_scope",
      domain
        ? "指定领域需要可靠出生时刻来建立上升和主题宫；未知时刻时只保留行星范围，不回答该领域。"
        : "仍可给出当天行星位置范围，但不会生成上升点、中天和宫位。",
    ));
  }
  if (!data.coordinates) {
    missingData.push(missing(
      "coordinates",
      domain ? "blocks_requested_scope" : "limits_scope",
      domain
        ? "指定领域需要经纬度来计算上升和主题宫；没有坐标时只做非宫位本命结构。"
        : "没有坐标仍可看行星、星座和相位；上升点、中天和宫位会省略。",
    ));
  }
  if (preferences.wants_western_houses && (!data.birth_time || !data.coordinates)) {
    limits.push("要看上升点、中天和宫位，需要同时提供出生时刻与经纬度。");
  }
  if (preferences.wants_period_timing) {
    limits.push("即使资料完整，当前西洋模块也不提供行运时点；可先做本命结构，不补写未实现的阶段预测。");
  }
  return makeOption({
    system: "western",
    fit: preferences.wants_period_timing ? "supporting" : domain ? "direct" : "parallel",
    reason: "适合看行星、星座、相位与传统本命条件；没有坐标时仍可完成不依赖宫位的部分。",
    selectionCue: "想用行星功能、相位关系和本命主题来整理性格与人生议题时选它。",
    missingData,
    limits,
  });
}

function questionMissing(data) {
  return data.focused_question
    ? []
    : [missing("focused_question", "blocks_method", "问事方法需要一句具体、可反思的聚焦问题。")];
}

function tarotOption(data, preferences, fit) {
  const missingData = questionMissing(data);
  if (!preferences.allow_local_generation && !data.tarot_cards) {
    missingData.push(missing(
      "tarot_cards",
      "blocks_method",
      "你不接受本地生成抽牌时，需要录入实体或手动抽出的牌。",
    ));
  }
  return makeOption({
    system: "tarot",
    fit,
    reason: fit === "direct"
      ? "牌阵可以把局面、行动和条件性结果分开，适合整理一个选择，但不会替你决定。"
      : "牌阵可以补充局面与行动视角，但不会替代卦象的主变结构。",
    selectionCue: "想把眼前局面拆成可行动的几个位置，并马上得到可读提示时选它。",
    missingData,
    limits: ["换问题要开始一次新抽牌；同一问题的已抽结果不会因追问而重抽。"],
  });
}

function ichingOption(data, preferences, fit) {
  const missingData = questionMissing(data);
  if (!preferences.allow_local_generation && !data.iching_lines) {
    missingData.push(missing(
      "iching_lines",
      "blocks_method",
      "你不接受本地三钱起卦时，需要录入实体起出的六个爻值。",
    ));
  }
  return makeOption({
    system: "iching",
    fit,
    reason: fit === "direct"
      ? "主卦、动爻和变卦适合描述当前结构怎样变化，不给两个方案投票。"
      : "适合检查选择前后的变化条件，但不会直接替方案排名或保证结果。",
    selectionCue: "想看局面从当前状态走向什么变化结构，以及哪些环节在动时选它。",
    missingData,
    limits: ["卦象提供结构化反思，不确认具体事件一定发生。"],
  });
}

function meihuaOption(data, fit) {
  const missingData = [];
  if (!data.first_number) {
    missingData.push(missing("first_number", "blocks_method", "固定两数起卦需要第一个正整数。"));
  }
  if (!data.second_number) {
    missingData.push(missing("second_number", "blocks_method", "固定两数起卦需要第二个正整数。"));
  }
  return makeOption({
    system: "meihua",
    fit,
    reason: "适合已经有两个正整数、并明确要按固定两数口径看本卦、动爻和变卦结构的情况。",
    selectionCue: "你已有两个数，而且接受当前只使用固定两数口径时选它。",
    missingData,
    limits: ["当前只支持固定两数起卦，不扩写成时间起卦，也不作应期保证。"],
  });
}

function birthOptions(data, preferences, domain = null) {
  return [
    baziOption(data, preferences, domain),
    ziweiOption(data, preferences, domain),
    westernOption(data, preferences, domain),
  ];
}

function currentQuestionOptions(questionKind, data, preferences) {
  if (questionKind === "decision_action") {
    return [
      tarotOption(data, preferences, "direct"),
      ichingOption(data, preferences, "supporting"),
      ...(data.first_number || data.second_number ? [meihuaOption(data, "supporting")] : []),
    ];
  }
  if (questionKind === "change_structure") {
    return [
      ichingOption(data, preferences, "direct"),
      meihuaOption(data, "supporting"),
      tarotOption(data, preferences, "supporting"),
    ];
  }
  if (questionKind === "two_number_meihua") {
    return [meihuaOption(data, "direct")];
  }
  return [
    tarotOption(data, preferences, "parallel"),
    ichingOption(data, preferences, "parallel"),
    meihuaOption(data, "supporting"),
  ];
}

/**
 * Recommend currently implemented methods by task and data fit.
 *
 * The caller supplies only data-availability booleans, so this routing step
 * never needs a birth date, question text, card name, line value, or number.
 */
export function recommendMethods(rawRequest) {
  const request = normalizeRequest(rawRequest);
  const isBirthRoute = request.goal === "life_overview" || request.goal === "life_domain";
  const options = isBirthRoute
    ? birthOptions(request.available_data, request.preferences, request.domain)
    : currentQuestionOptions(request.question_kind, request.available_data, request.preferences);
  const directCount = options.filter((option) => (
    ["direct", "parallel"].includes(option.fit) && option.readiness !== "unavailable"
  )).length;
  return deepFreeze({
    schema: METHOD_ROUTER_META.schema,
    goal: request.goal,
    domain: request.domain,
    question_kind: request.question_kind,
    routing_basis: METHOD_ROUTER_META.routing_basis,
    comparison_boundary: METHOD_ROUTER_META.comparison_boundary,
    presentation: directCount > 1 ? "parallel_options" : "focused_option",
    options,
    next_question: isBirthRoute
      ? "你更想看四柱格局与阶段、宫位主题，还是行星与相位？"
      : request.question_kind === "open"
        ? "你更想拆解下一步行动，还是看局面怎样变化？"
        : null,
  });
}
