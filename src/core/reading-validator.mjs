import { isDeepStrictEqual } from "node:util";
import { contentHash, stableJson } from "./hash.mjs";
import { CALCULATION_SYSTEMS, isPlainJsonValue, verifyCalculationEnvelope } from "./result.mjs";
import { FortuneTellerError } from "./errors.mjs";
import { getRuleById } from "../data/rule-registry.mjs";
import { getSourceById } from "../data/source-registry.mjs";
import { getInterpretationProfileById } from "../data/interpretation-profile-registry.mjs";
import { isCanonicalRegisteredProfile } from "./profiles.mjs";
import { canonicalCalculationFactStatement, canonicalTechnicalSummary, validateClaimSemantics } from "./claim-semantics.mjs";
import { verifyCalculationFacts } from "./calculation-verifier.mjs";
import {
  canonicalZiweiSemanticBindings,
  canonicalZiweiNarrative,
  deriveZiweiMeaningBinding,
  validateZiweiMeaningBinding,
} from "./meaning-layer.mjs";

const SUPPORTED_SYSTEMS = new Set(CALCULATION_SYSTEMS);
const CLAIM_STATUSES = new Set(["calculation_fact", "traditional_rule", "interpretation", "unresolved"]);
const CALCULATION_CERTAINTY = new Set(["high", "qualified", "unavailable"]);
const SENSITIVITY_LABELS = new Set(["stable", "partly_stable", "boundary_sensitive", "unavailable", "not_assessed"]);
const SCHOOL_STABILITY = new Set(["stable", "profile_specific", "disputed", "not_assessed"]);
const SOURCE_STATUS = new Set(["verified", "engine_documented", "unavailable", "disputed"]);
const EVIDENCE_ROLES = new Set(["support", "constraint", "context"]);
const ASSESSMENT_MODES = new Set([
  "current_reflection", "bounded_phase", "prospective_hypothesis",
]);
const ASSESSMENT_EVIDENCE_SOURCES = new Set([
  "self_report", "contemporaneous_record", "administrative_record", "third_party_record",
]);
const ASSESSMENT_POLARITIES = new Set(["supports", "contradicts", "unclear"]);
const BARNUM_CRITERION_PATTERN = /(?:既.{0,20}也|有时.{0,20}有时|可能.{0,20}(?:也可能|又可能)|视情况|因人而异|都说不准)|\b(?:sometimes.{0,30}sometimes|it depends|could be either|may or may not|everyone is different)\b/iu;
const CLAIM_TOPICS = new Set([
  "overview", "current_situation", "decision", "career_study", "wealth_resources",
  "relationships", "family_social", "wellbeing_rhythm", "life_stage", "other",
]);
const CLAIM_TOPIC_LABELS = new Map([
  ["overview", "整体主题"], ["current_situation", "当前情况"], ["decision", "当前选择"],
  ["career_study", "事业与学习"], ["wealth_resources", "财富与资源"],
  ["relationships", "长期关系"], ["family_social", "家庭与社交"],
  ["wellbeing_rhythm", "身心节律"], ["life_stage", "人生阶段"], ["other", "所问主题"],
]);
const UNRESOLVED_REASON_KINDS = new Set([
  "input_missing", "rule_unavailable", "reality_evidence_missing", "conflicting_evidence", "unspecified",
]);
const DEEP_LEVELS = new Set(["deep", "audit"]);
const FRESH_DRAW_SYSTEMS = new Set(["tarot", "iching"]);
const FRESH_CALCULATION_INPUT_FIELDS = new Set([
  "system", "profile", "question", "new_question", "cards", "lines", "spread", "seed", "draw", "cast",
  "draw_source", "cast_source", "reveal_seed",
]);
const FRESH_DRAW_OPERATION_INPUT_FIELDS = new Set([
  "question", "new_question", "cards", "lines", "spread", "seed", "draw", "cast",
  "draw_source", "cast_source", "reveal_seed",
]);
const NEXT_STEP_INPUT_FIELDS = new Set([
  "user_focus", "source", "system", "profile", "question", "new_question",
  "date", "birth_date", "time", "birth_time", "timezone", "location", "place",
  "chart_sex", "sex", "target_date", "coordinates", "latitude", "longitude", "disambiguation",
  "spread", "cards", "lines", "seed", "draw", "cast", "draw_source", "cast_source", "reveal_seed",
  "first_number", "second_number", "moving_line",
]);
const MULTI_SYSTEM_TARGETED_ACTIONS = new Set([
  "change_focus", "new_reading", "correct_input", "compare_profile",
]);
const MATERIAL_WARNING_CODES = new Set(["CALENDAR_DAY_PROFILE_QUALIFIED"]);
const NEXT_STEP_ACTIONS = new Set([
  "deepen", "change_focus", "inspect_evidence", "inspect_sensitivity", "compare_profile", "correct_input",
  "new_reading", "audit", "export", "reflect", "close",
]);
const SYSTEM_RESULT_LABELS = new Map([
  ["bazi", "八字"], ["ziwei", "紫微斗数"], ["western", "西方占星"],
  ["tarot", "塔罗"], ["iching", "易经"], ["meihua", "梅花易数"],
]);
const LEVEL_RESULT_LABELS = new Map([
  ["quick", "简要结果"], ["standard", "解读结果"], ["deep", "深度解读"], ["audit", "核对报告"],
]);
const NEXT_STEP_LABELS = new Map([
  ["deepen", "继续深入当前主题"],
  ["change_focus", "查看同一排盘的另一个主题"],
  ["inspect_evidence", "查看排盘与传统依据"],
  ["inspect_sensitivity", "查看输入变化的影响"],
  ["compare_profile", "比较另一种传统排法"],
  ["correct_input", "更正输入资料"],
  ["new_reading", "开始一次新解读"],
  ["audit", "查看核对报告"],
  ["export", "导出本次结果"],
  ["reflect", "记录现实反馈"],
  ["close", "结束本次解读"],
]);
const CANONICAL_DISCLAIMER = "以下内容属于传统文化反思，不是经科学验证的现实预测；重要决定请结合事实并独立判断。";
const CANONICAL_UNCERTAINTY = "排盘可以复算，传统含义仍不能确认具体事件或保证现实结果。";
const CANONICAL_UNAVAILABLE_REASON = "当前资料或功能条件不足，暂不能执行这一步。";
const FRESH_DRAW_LABEL_PATTERN = /(?:新(?:的)?问题|换(?:个|一个|另一个)?问题|改问|换(?:个|一个)?主题|另一件事|换(?:一)?组牌|另(?:问一题|起一卦)|重新(?:抽(?:一?(?:张|组|副|次))?牌|起(?:一)?卦|提问|占问)|再(?:抽(?:一?(?:张|组|副|次))?牌|起(?:一)?卦)|\b(?:new|another|different)\s+(?:question|draw|cast)\b|\b(?:re[- ]?draw|recast)\b|\b(?:draw|cast)\s+again\b)/iu;
const EXPLICIT_UNRESOLVED_PATTERN = /(?:不确定|无法判断|不能判断|尚不能判断|暂时不能判断|无法确定|不能确定|无法确认|不能确认|信息不足|证据不足|资料不足|不可判断)|\b(?:uncertain|unknown|unresolved|cannot determine|can't determine|cannot conclude|can't conclude|insufficient (?:information|evidence)|not enough (?:information|evidence))\b/iu;
const NEGATED_UNRESOLVED_PATTERN = /\b(?:not|never)\s+(?:at\s+all\s+)?(?:uncertain|unknown|unresolved)\b|(?:并非|不是|并不|绝非)\s*(?:不确定|未知|未解决|无法判断|不能判断|无法确定|不能确定|无法确认|不能确认|信息不足|证据不足|资料不足|不可判断)/giu;
const FUTURE_CONTEXT_PATTERN = /(?:未来|今后|接下来|往后|之后|届时|来年|翌年|明年|后年|明天|稍后|下(?:周|月|个月|季度|半年|一年)|(?:第|过)?[零〇一二两三四五六七八九十百千万\d]+(?:天|周|个月|月|年)(?:后|内)?|20\d{2}(?:年|[-/.]\d{1,2}(?:[-/.]\d{1,2})?))|\b(?:future|tomorrow|next\s+(?:week|month|quarter|year)|within\s+\d+\s+(?:days?|weeks?|months?|years?)|in\s+\d+\s+(?:days?|weeks?|months?|years?)|(?:by|in)\s+20\d{2}|eventually|later)\b/iu;
const FUTURE_ASSERTION_PATTERN = /(?:会(?:被|成为|得到|获得|失去|去|到|在|做|当|离|结|发|遇|收|拿|成|出|入|升|降|赚|亏|生|怀|换|转|考|读|搬|买|卖|裁|留|移|担|继续|开始|结束)|将(?:会|被|要|在|于|从|由|有|成为|得到|获得|失去|去|到|做|当|离|结|发|遇|收|拿|成|出|入|升|降|赚|亏|生|怀|换|转|考|读|搬|买|卖|裁|留|移|担|继续|开始|结束)|即将|必将|终将|肯定(?:会|将)?|一定(?:会|将)?|必然(?:会|将)?|必定(?:会|将)?|注定(?:会|将)?|预计(?:会|将)?|大概率(?:会|将)?|高概率(?:会|将)?)|\b(?:will|shall)\b|\b(?:is|are|am)\s+going\s+to\b|\b(?:is|are)\s+(?:certain|sure|bound|likely)\s+to\b/iu;
const FUTURE_QUALIFIER_PATTERN = /(?:如果|假如|若(?:是|果)?|可能|也许|或许|未必|不一定|倾向于|有机会|取决于|视.{0,12}而定|在.{0,18}(?:前提|条件)下|不能(?:判断|确定|确认|保证|推断|说明|预测)|无法(?:判断|确定|确认|保证|推断|说明|预测)|不(?:作|做|构成|生成|提供|用于)?(?:事件)?(?:判断|保证|推断|说明|预测)|不足以|不代表|不意味着|尚不确定|仍不确定|目前不确定)|\b(?:if|unless|may|might|could|possibly|perhaps|uncertain|unknown|unresolved|depends?\s+on|subject\s+to|cannot\s+(?:determine|conclude|confirm|guarantee|show|predict)|can't\s+(?:determine|conclude|confirm|guarantee|show|predict)|does\s+not\s+(?:mean|show|guarantee|predict)|not\s+(?:guaranteed|a\s+prediction)|insufficient)\b/iu;
const FUTURE_RECORD_ACTION_PATTERN = /(?:记录|保存|收集|核对|观察|检查|比较|复盘|列出|标明|询问|确认|准备资料|建立记录)|\b(?:record|save|collect|check|compare|review|observe|document|track)\b/iu;
const WHETHER_PATTERN = /(?:是否|能否|会不会)|\bwhether\b/iu;

function canonicalReadingTitle(reading) {
  const systems = Array.isArray(reading?.system) ? reading.system : [reading?.system];
  const systemLabel = systems.length === 1
    ? (SYSTEM_RESULT_LABELS.get(systems[0]) || "传统体系")
    : "多体系对照";
  return `${systemLabel}｜${LEVEL_RESULT_LABELS.get(reading?.level) || "解读结果"}`;
}

function canonicalUserFocus(reading) {
  const labels = [...new Set((reading?.claims || [])
    .map((claim) => CLAIM_TOPIC_LABELS.get(claim?.topic))
    .filter(Boolean))];
  return labels.length ? labels.join("、") : "所问主题";
}

function canonicalUncertaintySummary(calculations) {
  const qualifiedCalendar = calculations.some((calculation) =>
    Array.isArray(calculation?.warnings)
    && calculation.warnings.some((warning) => typeof warning === "string"
      && warning.startsWith("CALENDAR_DAY_PROFILE_QUALIFIED")));
  return qualifiedCalendar
    ? `${CANONICAL_UNCERTAINTY} 其中海外出生日期沿用出生地民用日；不同流派的换日口径可能不同。`
    : CANONICAL_UNCERTAINTY;
}

function canonicalNextStepLabel(step) {
  if (step?.action === "new_reading" && step?.target_system === "tarot") return "用新问题重新抽牌";
  if (step?.action === "new_reading" && step?.target_system === "iching") return "用新问题重新起卦";
  const base = NEXT_STEP_LABELS.get(step?.action) || "继续操作";
  return step?.available === false ? `${base}（暂不可用）` : base;
}

function canonicalizePresentation(reading, calculations) {
  reading.title = canonicalReadingTitle(reading);
  reading.user_focus = canonicalUserFocus(reading);
  reading.disclaimer = CANONICAL_DISCLAIMER;
  reading.uncertainty_summary = canonicalUncertaintySummary(calculations);
  const systems = Array.isArray(reading.system) ? reading.system : [reading.system];
  if (systems.length > 1) reading.cross_system = { relationship: "not_compared" };
  else delete reading.cross_system;
  const materialWarningCodes = [...new Set(calculations.flatMap(warningCodes))];
  if (materialWarningCodes.length) reading.warning_acknowledgements = materialWarningCodes;
  else delete reading.warning_acknowledgements;
  if (!Array.isArray(reading.next_steps)) return;
  for (const step of reading.next_steps) {
    if (!step || typeof step !== "object" || Array.isArray(step)) continue;
    step.label = canonicalNextStepLabel(step);
    if (step.available === false) step.reason = CANONICAL_UNAVAILABLE_REASON;
    else delete step.reason;
  }
}

function canonicalUnresolvedNarrative(claim) {
  const topic = CLAIM_TOPIC_LABELS.get(claim?.topic) || "所问主题";
  if (claim?.unresolved_reason_kind === "rule_unavailable") {
    return {
      statement: `关于${topic}，这套已登记规则暂时无法形成可靠判断。`,
      reasoning_summary: "原因是当前规则覆盖不足，不是你少填了出生资料；本轮不会用自由发挥补出结果。",
      alternative_readings: ["以后只有在对应规则与反例条件完成核验后，才重新开启这条判断。"],
      practical_reflection: "先保留已核验的盘面事实；不要为了得到一个答案而改用没有来源边界的断语。",
    };
  }
  if (claim?.unresolved_reason_kind === "conflicting_evidence") {
    return {
      statement: `关于${topic}，现有依据互相冲突，暂时无法判断。`,
      reasoning_summary: "支持与反对条件同时存在，选择较顺眼的一边会造成假精确。",
      alternative_readings: ["只有冲突条件被新的可核对事实消除时，才重新裁决。"],
      practical_reflection: "把相反证据并列保留，先核对资料与规则前提，不用结果倒推。",
    };
  }
  if (claim?.unresolved_reason_kind === "reality_evidence_missing") {
    return {
      statement: `关于${topic}，现实记录还不足，暂时无法判断是否贴合。`,
      reasoning_summary: "排盘事实已经保留，但缺少同期、可反驳的现实记录来核对这条解释。",
      alternative_readings: ["补齐同一观察窗口内的支持与反对记录后，再核对是否需要改判。"],
      practical_reflection: "记录具体日期、情境、行动和结果，避免只回忆最吻合的一次。",
    };
  }
  return {
    statement: `关于${topic}，当前资料不足，无法判断具体结果。`,
    reasoning_summary: "现有计算只支持列出已核验的排盘事实，不支持从这些事实确定现实结果。",
    alternative_readings: ["补充可靠的现实资料后，可以重新核对当前条件；这不会把传统含义变成事件预测。"],
    practical_reflection: "先核实现实资料与可观察条件，再决定是否需要继续讨论。",
  };
}

const VISIBLE_BACKSTAGE_PATTERNS = [
  {
    category: "calculation profile metadata",
    pattern: /(?:\bprofile[_ -]?(?:id|specific|version)\b|\b(?:calculation|chart|active)\s+profiles?\b|\bprofile\s*[:=]|(?:计算|排盘)口径|口径\s*(?:ID|编号|版本))/iu,
  },
  {
    category: "warning metadata",
    // Deliberately does not reject the ordinary English word "warning" by itself.
    pattern: /(?:\bwarnings?[_ -]?(?:codes?|counts?|acknowledg(?:e)?ments?)\b|(?:警告|提示)(?:代码|编号|数量|计数))/iu,
  },
  {
    category: "sensitivity metadata",
    pattern: /(?:\b(?:input|inspect)[_ -]?sensitivity\b|\bsensitivity[_ -]?(?:label|coverage|count)\b|\bsensitivity\s*[:=]|(?:输入|计算)敏感性|敏感性\s*(?:标签|覆盖|计数|[:=：]))/iu,
  },
  {
    category: "calculation count metadata",
    pattern: /(?:\b(?:candidate|sample|probe)[_ -]?counts?\b|\b(?:candidates?|samples?|probes?)\b.{0,16}\b\d+\b|\b\d+\b.{0,8}\b(?:candidates?|samples?|probes?)\b|(?:候选(?:盘|时段|时间|结果)?|探针|扫描点|样本)(?:数量|数|总数|共有|共|有|为|[:：]|\s|了){0,8}(?:\d+|[零〇一二两三四五六七八九十百千万]+)|(?:\d+|[零〇一二两三四五六七八九十百千万]+)\s*个?\s*(?:候选盘|候选时段|候选时间|候选结果|探针|扫描点|样本)|扫描(?:了|共|点数|数量|[:：]|\s){0,8}(?:\d+|[零〇一二两三四五六七八九十百千万]+)\s*(?:个点|点|次)?|后台\s*(?:共|一共|总共)?\s*(?:出了|生成(?:了)?|得到|产出(?:了)?)\s*(?:\d+|[零〇一二两三四五六七八九十百千万]+)\s*张盘)/iu,
  },
  {
    category: "hash metadata",
    pattern: /(?:\b(?:facts?|reproducibility|calculation|audit|record)[_ -]?hash(?:es)?\b|\bsha[-_ ]?256\b|(?:事实|完整记录|可复现性|重现性|审计)?(?:哈希|核对码))/iu,
  },
  {
    category: "version metadata",
    pattern: /(?:\b(?:engine|schema|runtime|dependency|library)[_ -]?versions?\b|\b(?:engine|schema|library)\s+v?\d+\.\d+|(?:引擎|模式|架构|运行时|依赖|库)(?:的)?版本)/iu,
  },
  {
    category: "profile or runtime configuration metadata",
    pattern: /(?:\b(?:time_basis|fix_leap_month|calendar_day_basis|year_divide|horoscope_divide|age_divide|day_divide|aspect_orbs_degrees|coin_values|line_order|trigram_order|modulo_zero_maps_to_last|period_api|dependency_config_isolation|interpretation_included)\b|\b(?:node|icu|tzdb|library|temporal_polyfill|profile|meta)\s*[:=])/iu,
  },
  {
    category: "evidence identifier metadata",
    pattern: /(?:\b(?:fact|rule|source)[_ -]?ids?\b|(?:事实|规则|来源)\s*(?:ID|编号|标识))/iu,
  },
  {
    category: "evidence trace identifier",
    pattern: /\b(?:F|R|SRC)-[A-Z0-9][A-Z0-9_-]*\b/u,
  },
  {
    category: "audit status metadata",
    pattern: /\b(?:calculation_certainty|school_stability|source_status|profile_specific|engine_documented|not_assessed|partly_stable|boundary_sensitive)\b/iu,
  },
];

// This is deliberately a conservative lexical floor, not a semantic safety proof.
// It catches a small class of explicit dangerous or deterministic phrases; a passing
// reading still requires human/agent judgment about implication, context, and negation.
const LEXICAL_SAFETY_PATTERNS = [
  {
    category: "unearned certification or accuracy claim",
    patterns: [
      /(?:已|已经|获得|通过|具备)?(?:专业|专家|命理师|占星师)(?:认证|审定|审核|背书)|(?:科学|临床|实证)(?:验证|证实)(?:准确|有效)?/u,
      /(?:现实|预测|算命|命理|占卜)?准确率(?:达到|高达|为|是|[:：])?\s*(?:百分之)?[零〇一二三四五六七八九十百\d.]+\s*%?/u,
      /\b(?:professionally|expert)[ -]?(?:certified|validated|endorsed)\b|\b(?:predictive|divinatory) accuracy\s*(?:is|of|:)?\s*\d+(?:\.\d+)?\s*%/iu,
    ],
  },
  {
    category: "fatalistic certainty",
    patterns: [
      /\b(?:this|the (?:chart|reading|cards?|hexagram))\s+proves?\s+(?:that\s+)?(?:you|he|she|they)\s+will\b/iu,
      /(?:^|[.!?。！？]\s*)guaranteed by (?:fate|destiny)\b/iu,
      /\b(?:you are|you(?:'|’)re)\s+destined to\b/iu,
      /(?:^|[。！？]\s*)(?:你|他|她)?(?:命中注定|注定(?:会|要)|必然(?:会|要)|一定(?:会|要)|百分之百(?:会|能))/u,
    ],
  },
  {
    category: "high-risk financial action",
    patterns: [
      /\b(?:invest|bet|stake|risk|put)\s+(?:everything|all\s+(?:your\s+)?(?:money|savings|assets?))\b/iu,
      /\bgo\s+all[- ]in\b/iu,
      /(?:^|[。！？]\s*)(?:建议|你(?:应该|必须|可以))?(?:立即)?(?:梭哈|全仓(?:买入|投入|下注)|借钱(?:投资|下注|炒股|炒币))/u,
    ],
  },
  {
    category: "unsafe medical direction",
    patterns: [
      /(?:^|[.!?。！？]\s*)(?:you\s+(?:should|must|can)\s+)?(?:stop|skip|refuse)\s+(?:taking\s+)?(?:medication|medicine|treatment|medical care)\b/iu,
      /(?:^|[。！？]\s*)(?:建议|你(?:应该|必须|可以))?(?:立即)?(?:停药|停止治疗|拒绝治疗|不要看医生|无需就医)/u,
    ],
  },
  {
    category: "death or diagnostic certainty",
    patterns: [
      /\b(?:you|he|she|they)\s+will\s+die\b/iu,
      /\b(?:you are|you(?:'|’)re)\s+(?:pregnant|terminally ill)\b/iu,
      /(?:^|[。！？]\s*)(?:你|他|她)(?:会|将|必定)(?:死|死亡)|(?:死亡日期|死期)|(?:你|她)(?:已经)?怀孕了/u,
    ],
  },
  {
    category: "coercive third-party certainty",
    patterns: [
      /\b(?:he|she|they|your partner)\s+(?:is|are)\s+(?:definitely|certainly)\s+(?:cheating|lying)\b/iu,
      /(?:^|[。！？]\s*)(?:他|她|你的伴侣)(?:肯定|一定|必然)(?:出轨|撒谎)/u,
    ],
  },
];

function collectFactIds(value, target = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) collectFactIds(item, target);
  } else if (value && typeof value === "object") {
    if (typeof value.fact_id === "string") target.add(value.fact_id);
    for (const child of Object.values(value)) collectFactIds(child, target);
  }
  return target;
}

function escapePointerToken(token) {
  return token.replaceAll("~", "~0").replaceAll("/", "~1");
}

function collectFactReferences(value, path = "/facts", target = new Map()) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectFactReferences(item, `${path}/${index}`, target));
  } else if (value && typeof value === "object") {
    if (typeof value.fact_id === "string") target.set(value.fact_id, path);
    for (const [key, child] of Object.entries(value)) {
      collectFactReferences(child, `${path}/${escapePointerToken(key)}`, target);
    }
  }
  return target;
}

function factValueHash(calculation, ref, path, value) {
  return contentHash({ v: 1, system: calculation.system, ref, path, value });
}

function calculationBindingFor(calculation) {
  return {
    system: calculation.system,
    profile: structuredClone(calculation.profile),
    facts_hash: calculation.facts_hash,
    reproducibility_hash: calculation.reproducibility_hash,
  };
}

function bindingMatchesCalculation(binding, calculation) {
  return binding?.system === calculation?.system
    && profileMatches(binding?.profile, calculation?.profile)
    && binding?.facts_hash === calculation?.facts_hash
    && binding?.reproducibility_hash === calculation?.reproducibility_hash;
}

function resolveEvidenceBinding(calculation, ref, role = "support") {
  const references = collectFactReferences(calculation.facts);
  const path = claimedFactPath(ref, references, calculation);
  if (!path) {
    throw new FortuneTellerError("UNKNOWN_EVIDENCE_REFERENCE", "cannot bind an unknown fact reference");
  }
  const observed = valueAtFactPath(calculation, path);
  if (!observed.found) {
    throw new FortuneTellerError("UNKNOWN_EVIDENCE_REFERENCE", "cannot resolve the cited fact value");
  }
  if (!EVIDENCE_ROLES.has(role)) {
    throw new FortuneTellerError("INVALID_EVIDENCE_ROLE", "evidence role must be support, constraint, or context");
  }
  return { ref, path, value_hash: factValueHash(calculation, ref, path, observed.value), role };
}

function hasJsonPointer(root, id) {
  if (!id.startsWith("jsonptr:/facts/")) return false;
  const tokens = id.slice("jsonptr:/".length).split("/").map((token) => token.replaceAll("~1", "/").replaceAll("~0", "~"));
  let cursor = root;
  for (const token of tokens) {
    if (cursor == null || (typeof cursor !== "object") || !Object.hasOwn(cursor, token)) return false;
    cursor = cursor[token];
  }
  return true;
}

function valueAtFactPath(calculation, path) {
  if (!path.startsWith("/facts/")) return { found: false, value: undefined };
  const tokens = path.slice(1).split("/").map((token) => token.replaceAll("~1", "/").replaceAll("~0", "~"));
  let cursor = calculation;
  for (const token of tokens) {
    if (cursor == null || typeof cursor !== "object" || !Object.hasOwn(cursor, token)) {
      return { found: false, value: undefined };
    }
    cursor = cursor[token];
  }
  return { found: true, value: cursor };
}

function claimedFactPath(id, factReferences, calculation) {
  if (typeof id !== "string") return null;
  if (id.startsWith("jsonptr:/facts/") && hasJsonPointer(calculation, id)) return id.slice("jsonptr:".length);
  return factReferences.get(id) ?? null;
}

function pathMatchesPrefix(path, prefix) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function canonicalFactPaths(paths, factReferences) {
  const roots = [...new Set(factReferences.values())];
  const canonical = [];
  for (const path of paths) {
    const descendants = roots.filter((root) => root !== path && pathMatchesPrefix(root, path));
    if (descendants.length) {
      canonical.push(...descendants);
      continue;
    }
    let nearest = null;
    for (const root of roots) {
      if (pathMatchesPrefix(path, root) && (nearest == null || root.length > nearest.length)) nearest = root;
    }
    canonical.push(nearest ?? path);
  }
  return [...new Set(canonical)];
}

function broadFactContainerPaths(paths, factReferences) {
  const roots = [...new Set(factReferences.values())];
  return paths.filter((path) => roots.some((root) => root !== path && pathMatchesPrefix(root, path)));
}

function ruleCoversMaterialPath(rule, path, identifiedFactRoots) {
  const underAllowedPrefix = rule.required_fact_prefixes.some((prefix) => pathMatchesPrefix(path, prefix));
  if (!underAllowedPrefix) return false;
  return identifiedFactRoots.has(path)
    || rule.material_fact_paths?.includes(path)
    || rule.required_fact_values?.some((requirement) => requirement.path === path)
    || false;
}

function collectStrings(value, target = []) {
  if (typeof value === "string") target.push(value.normalize("NFKC"));
  else if (Array.isArray(value)) value.forEach((item) => collectStrings(item, target));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => collectStrings(item, target));
  return target;
}

function normalizeVisibleText(value) {
  return typeof value === "string" ? value.normalize("NFKC").replace(/\s+/gu, " ").trim() : "";
}

function explicitlyStatesUncertainty(value) {
  const normalized = normalizeVisibleText(value);
  const declarativeText = (normalized.match(/[^。！？.!?]+[。！？.!?]?/gu) || [normalized])
    .filter((sentence) => !/[?？]\s*$/u.test(sentence))
    .join(" ");
  const text = declarativeText.replace(NEGATED_UNRESOLVED_PATTERN, " ");
  return EXPLICIT_UNRESOLVED_PATTERN.test(text);
}

function isCanonicalDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function validateAssessment(claim, at, errors) {
  const assessment = claim.assessment;
  if (!assessment || typeof assessment !== "object" || Array.isArray(assessment)) {
    errors.push(`${at}.assessment is required for interpretation claims`);
    return;
  }
  const allowed = new Set(["mode", "domain", "window", "criteria"]);
  const unknown = Object.keys(assessment).filter((key) => !allowed.has(key));
  if (unknown.length) errors.push(`${at}.assessment contains ${unknown.length} unknown field(s)`);
  if (!ASSESSMENT_MODES.has(assessment.mode)) errors.push(`${at}.assessment.mode is invalid`);
  if (BARNUM_CRITERION_PATTERN.test(normalizeVisibleText(claim.statement))) {
    errors.push(`${at}.statement uses a Barnum-style both-sides formulation`);
  }
  if (assessment.domain !== claim.topic) errors.push(`${at}.assessment.domain must equal claim.topic`);
  const window = assessment.window;
  if (!window || typeof window !== "object" || Array.isArray(window)) {
    errors.push(`${at}.assessment.window must be an object`);
  } else {
    const unknownWindow = Object.keys(window).filter((key) => !["kind", "start", "end"].includes(key));
    if (unknownWindow.length) errors.push(`${at}.assessment.window contains ${unknownWindow.length} unknown field(s)`);
    if (!["current", "bounded"].includes(window.kind)) errors.push(`${at}.assessment.window.kind is invalid`);
    if (window.kind === "current" && (Object.hasOwn(window, "start") || Object.hasOwn(window, "end"))) {
      errors.push(`${at}.assessment current window must not add start or end`);
    }
    if (window.kind === "bounded") {
      if (!isCanonicalDate(window.start) || !isCanonicalDate(window.end) || window.start > window.end) {
        errors.push(`${at}.assessment bounded window requires canonical start <= end`);
      }
    }
    if (["bounded_phase", "prospective_hypothesis"].includes(assessment.mode)
      && window.kind !== "bounded") {
      errors.push(`${at}.assessment.mode=${assessment.mode} requires a bounded window`);
    }
  }
  if (!Array.isArray(assessment.criteria) || assessment.criteria.length < 2) {
    errors.push(`${at}.assessment.criteria requires at least two observable criteria`);
    return;
  }
  const criterionIds = new Set();
  const observables = new Set();
  const polarities = new Set();
  const narrative = [claim.statement, claim.reasoning_summary, ...(claim.alternative_readings || [])]
    .filter((item) => typeof item === "string")
    .map(normalizeVisibleText);
  assessment.criteria.forEach((criterion, index) => {
    const criterionAt = `${at}.assessment.criteria[${index}]`;
    if (!criterion || typeof criterion !== "object" || Array.isArray(criterion)) {
      errors.push(`${criterionAt} must be an object`);
      return;
    }
    const unknownCriterion = Object.keys(criterion)
      .filter((key) => !["criterion_id", "polarity", "observable", "evidence_source"].includes(key));
    if (unknownCriterion.length) errors.push(`${criterionAt} contains ${unknownCriterion.length} unknown field(s)`);
    if (typeof criterion.criterion_id !== "string" || !/^K-[A-Za-z0-9_-]+$/.test(criterion.criterion_id)) {
      errors.push(`${criterionAt}.criterion_id is invalid`);
    } else if (criterionIds.has(criterion.criterion_id)) {
      errors.push(`${criterionAt}.criterion_id is duplicated`);
    } else criterionIds.add(criterion.criterion_id);
    if (!ASSESSMENT_POLARITIES.has(criterion.polarity)) errors.push(`${criterionAt}.polarity is invalid`);
    else polarities.add(criterion.polarity);
    const observable = normalizeVisibleText(criterion.observable);
    if ([...observable].length < 12) errors.push(`${criterionAt}.observable is too vague or short`);
    if (BARNUM_CRITERION_PATTERN.test(observable)) errors.push(`${criterionAt}.observable uses a Barnum-style non-criterion`);
    if (observables.has(observable)) errors.push(`${criterionAt}.observable is duplicated`);
    if (observable) observables.add(observable);
    if (narrative.some((text) => text === observable || (observable.length >= 12 && text.includes(observable)))) {
      errors.push(`${criterionAt}.observable must be an independent reality check, not copied from the narrative`);
    }
    if (!ASSESSMENT_EVIDENCE_SOURCES.has(criterion.evidence_source)) {
      errors.push(`${criterionAt}.evidence_source is invalid`);
    }
  });
  for (const required of ["supports", "contradicts"]) {
    if (!polarities.has(required)) errors.push(`${at}.assessment.criteria requires a ${required} criterion`);
  }
  if (assessment.mode === "prospective_hypothesis"
    && !polarities.has("unclear")) {
    errors.push(`${at}.assessment hypothesis mode requires an unclear criterion`);
  }
}

function factObjectById(calculation, id) {
  if (!calculation || typeof id !== "string") return null;
  const references = collectFactReferences(calculation.facts);
  const path = references.get(id);
  if (!path) return null;
  const observed = valueAtFactPath(calculation, path);
  return observed.found ? { path, value: observed.value } : null;
}

function validateTopicUnitRule(claim, at, rule, calculation, factIds, errors) {
  if (!rule.required_topic_unit_kind) return;
  if (rule.allowed_topics && !rule.allowed_topics.includes(claim.topic)) {
    errors.push(`${at}.topic is not covered by rule ${rule.id}`);
  }
  if (
    rule.allowed_profile_ids
    && (
      !rule.allowed_profile_ids.includes(calculation?.profile?.id)
      || !isCanonicalRegisteredProfile(claim.system, calculation?.profile)
    )
  ) {
    errors.push(`${at} rule ${rule.id} is not available for this custom or unreviewed calculation profile`);
  }
  if (typeof claim.topic_unit_id !== "string" || !factIds.includes(claim.topic_unit_id)) {
    errors.push(`${at}.topic_unit_id must be cited in fact_ids for rule ${rule.id}`);
    return;
  }
  const resolved = factObjectById(calculation, claim.topic_unit_id);
  const expectedPrefix = rule.required_topic_unit_kind === "phase"
    ? "/facts/phase_topic_units"
    : "/facts/topic_units";
  if (!resolved || !pathMatchesPrefix(resolved.path, expectedPrefix)) {
    errors.push(`${at}.topic_unit_id is not the required ${rule.required_topic_unit_kind} topic unit`);
    return;
  }
  const unit = resolved.value;
  if (unit.topic !== claim.topic) errors.push(`${at}.topic does not match the cited topic unit`);
  const requireRefs = (refs, label) => {
    const missing = refs.filter((ref) => typeof ref !== "string" || !factIds.includes(ref));
    if (missing.length) errors.push(`${at} must cite ${label} from the selected topic unit`);
  };
  const rejectRefsOutside = (allowedRefs, label) => {
    const allowed = new Set(allowedRefs.filter((ref) => typeof ref === "string"));
    const outside = factIds.filter((ref) => !allowed.has(ref));
    if (outside.length) errors.push(`${at} cites ${outside.length} fact(s) outside the selected ${label}`);
  };
  if (rule.required_topic_unit_kind === "natal") {
    const allowed = [
      claim.topic_unit_id,
      unit.primary_palace_id,
      unit.relation_fact_id,
      ...(unit.component_palace_ids || []),
    ];
    requireRefs([unit.primary_palace_id, unit.relation_fact_id, ...(unit.component_palace_ids || [])], "all natal topic and three-directions/four-alignments facts");
    rejectRefsOutside(allowed, "natal topic unit");
  } else if (rule.required_topic_unit_kind === "natal_with_mutagen") {
    requireRefs([unit.primary_palace_id], "the topic palace fact");
    const transformationIds = Array.isArray(unit.natal_mutagen_fact_ids) ? unit.natal_mutagen_fact_ids : [];
    if (transformationIds.length === 0) {
      errors.push(`${at} selected topic unit has no registered natal transformation to interpret`);
    }
    requireRefs(transformationIds, "every natal transformation in the selected topic unit");
    const transformationPalaceIds = transformationIds
      .map((id) => factObjectById(calculation, id)?.value?.palace_id)
      .filter((id) => typeof id === "string");
    requireRefs(transformationPalaceIds, "the actual palace fact containing every cited transformation star");
    rejectRefsOutside([
      claim.topic_unit_id,
      unit.primary_palace_id,
      unit.relation_fact_id,
      ...(unit.component_palace_ids || []),
      ...transformationIds,
    ], "natal topic transformation unit");
    const semanticTransformationIds = (claim.semantic_bindings || [])
      .filter((binding) => binding?.kind === "mutagen_in_palace")
      .map((binding) => binding.fact_id)
      .sort();
    if (stableJson(semanticTransformationIds) !== stableJson([...transformationIds].sort())) {
      errors.push(`${at}.semantic_bindings must bind every natal transformation in the selected topic unit exactly once`);
    }
    const semanticOutside = (claim.semantic_bindings || []).filter((binding) =>
      binding?.kind === "mutagen_in_palace" && !transformationIds.includes(binding.fact_id));
    if (semanticOutside.length) {
      errors.push(`${at}.semantic_bindings contains a transformation outside the selected topic unit`);
    }
  } else if (rule.required_topic_unit_kind === "phase") {
    const natalUnit = factObjectById(calculation, unit.natal_topic_unit_id)?.value;
    const natalComponents = Array.isArray(natalUnit?.component_palace_ids)
      ? natalUnit.component_palace_ids : [];
    requireRefs([
      unit.natal_topic_unit_id,
      natalUnit?.relation_fact_id,
      ...natalComponents,
      unit.target_fact_id,
      unit.phase_validity_fact_id,
      unit.decadal_star_palace_id,
      unit.yearly_star_palace_id,
      ...(Array.isArray(unit.decadal_component_star_palace_ids) ? unit.decadal_component_star_palace_ids : []),
      ...(Array.isArray(unit.yearly_component_star_palace_ids) ? unit.yearly_component_star_palace_ids : []),
      ...(Array.isArray(unit.decadal_transformation_fact_ids) ? unit.decadal_transformation_fact_ids : []),
      ...(Array.isArray(unit.yearly_transformation_fact_ids) ? unit.yearly_transformation_fact_ids : []),
    ], "the same-topic natal, target-date, exact phase-validity, decadal/yearly four-palace, and transformation facts");
    rejectRefsOutside([
      claim.topic_unit_id,
      unit.natal_topic_unit_id,
      natalUnit?.relation_fact_id,
      ...natalComponents,
      unit.target_fact_id,
      unit.phase_validity_fact_id,
      unit.decadal_period_id,
      unit.decadal_star_palace_id,
      ...(unit.decadal_component_star_palace_ids || []),
      ...(unit.decadal_transformation_fact_ids || []),
      unit.yearly_period_id,
      unit.yearly_star_palace_id,
      ...(unit.yearly_component_star_palace_ids || []),
      ...(unit.yearly_transformation_fact_ids || []),
    ], "same-topic phase unit");
    const natalPalaceIds = new Set(natalComponents);
    const phaseSemanticOutside = (claim.semantic_bindings || []).filter((binding) => {
      if (binding?.kind === "star_in_palace") return !natalPalaceIds.has(binding.fact_id);
      if (binding?.kind === "period_star_in_slot") {
        const allowed = binding.scope === "decadal"
          ? unit.decadal_component_star_palace_ids
          : binding.scope === "yearly" ? unit.yearly_component_star_palace_ids : [];
        return binding.topic_unit_id !== unit.fact_id || !allowed?.includes(binding.fact_id);
      }
      if (binding?.kind !== "period_transformation") return false;
      const allowed = binding.scope === "decadal"
        ? unit.decadal_transformation_fact_ids
        : binding.scope === "yearly" ? unit.yearly_transformation_fact_ids : [];
      return !allowed?.includes(binding.fact_id);
    });
    if (phaseSemanticOutside.length) {
      errors.push(`${at}.semantic_bindings contains a relation outside the selected same-topic phase unit`);
    }
  }
}

function validateZiweiSemanticBindings(claim, at, calculation, factIds, errors) {
  if (claim.system !== "ziwei" || claim.epistemic_status !== "interpretation") return;
  const bindings = claim.semantic_bindings;
  if (!Array.isArray(bindings) || bindings.length === 0) {
    errors.push(`${at}.semantic_bindings must identify at least one actual Zi Wei star or transformation used`);
    return;
  }
  const verified = [];
  bindings.forEach((binding, index) => {
    const bindingAt = `${at}.semantic_bindings[${index}]`;
    if (!binding || typeof binding !== "object" || Array.isArray(binding)) {
      errors.push(`${bindingAt} must be an object`);
      return;
    }
    if (!factIds.includes(binding.fact_id)) errors.push(`${bindingAt}.fact_id must also appear in claim.fact_ids`);
    if (
      binding.kind === "period_star_in_slot"
      && (typeof binding.topic_unit_id !== "string" || !factIds.includes(binding.topic_unit_id))
    ) {
      errors.push(`${bindingAt}.topic_unit_id must also appear in claim.fact_ids`);
    }
    const resolved = factObjectById(calculation, binding.fact_id);
    if (!resolved) {
      errors.push(`${bindingAt}.fact_id is unknown`);
      return;
    }
    if (binding.kind === "star_in_palace") {
      const allowed = new Set(["kind", "fact_id", "star", "palace", "star_group", "brightness"]);
      if (Object.keys(binding).some((key) => !allowed.has(key))) errors.push(`${bindingAt} contains unknown fields`);
      const groupKey = { major: "major_stars", minor: "minor_stars", adjective: "adjective_stars" }[binding.star_group];
      const matchedStar = groupKey && Array.isArray(resolved.value?.[groupKey])
        ? resolved.value[groupKey].find((star) => star.name === binding.star) : null;
      const matches = pathMatchesPrefix(resolved.path, "/facts/palaces")
        && resolved.value?.name === binding.palace
        && matchedStar
        && (!Object.hasOwn(binding, "brightness") || matchedStar.brightness === binding.brightness);
      if (!matches) errors.push(`${bindingAt} does not match an actual star-in-palace fact`);
      else verified.push(binding);
      return;
    }
    if (binding.kind === "mutagen_in_palace") {
      const allowed = new Set(["kind", "fact_id", "star", "transformation", "palace"]);
      if (Object.keys(binding).some((key) => !allowed.has(key))) errors.push(`${bindingAt} contains unknown fields`);
      const matches = pathMatchesPrefix(resolved.path, "/facts/structure/mutagen_locations")
        && resolved.value?.star === binding.star
        && resolved.value?.mutagen === binding.transformation
        && resolved.value?.palace === binding.palace;
      if (!matches) errors.push(`${bindingAt} does not match an actual natal transformation fact`);
      else verified.push(binding);
      return;
    }
    if (binding.kind === "period_transformation") {
      const allowed = new Set(["kind", "fact_id", "scope", "star", "transformation", "natal_palace"]);
      if (Object.keys(binding).some((key) => !allowed.has(key))) errors.push(`${bindingAt} contains unknown fields`);
      const prefix = binding.scope === "decadal" ? "/facts/periods/decadal/mutagens"
        : binding.scope === "yearly" ? "/facts/periods/yearly/mutagens" : null;
      const matches = prefix && pathMatchesPrefix(resolved.path, prefix)
        && resolved.value?.star === binding.star
        && resolved.value?.transformation === binding.transformation
        && Array.isArray(resolved.value?.natal_locations)
        && resolved.value.natal_locations.some((location) => location?.natal_palace_name === binding.natal_palace);
      if (!matches) errors.push(`${bindingAt} does not match an actual period transformation fact`);
      else verified.push(binding);
      return;
    }
    if (binding.kind === "period_star_in_slot") {
      const allowed = new Set([
        "kind", "fact_id", "topic_unit_id", "scope", "relation_role",
        "star", "period_palace", "natal_palace",
      ]);
      if (Object.keys(binding).some((key) => !allowed.has(key))) errors.push(`${bindingAt} contains unknown fields`);
      const unit = calculation?.facts?.phase_topic_units?.find(
        (item) => item?.fact_id === binding.topic_unit_id,
      );
      const componentIds = binding.scope === "decadal"
        ? unit?.decadal_component_star_palace_ids
        : binding.scope === "yearly" ? unit?.yearly_component_star_palace_ids : null;
      const roleByIndex = ["focus", "trine_plus_4", "trine_plus_8", "opposite_plus_6"];
      const componentIndex = Array.isArray(componentIds) ? componentIds.indexOf(binding.fact_id) : -1;
      const prefix = binding.scope === "decadal" ? "/facts/periods/decadal/star_palaces"
        : binding.scope === "yearly" ? "/facts/periods/yearly/star_palaces" : null;
      const matches = prefix
        && componentIndex >= 0
        && roleByIndex[componentIndex] === binding.relation_role
        && pathMatchesPrefix(resolved.path, prefix)
        && resolved.value?.period_palace_name === binding.period_palace
        && resolved.value?.natal_palace_name === binding.natal_palace
        && Array.isArray(resolved.value?.stars)
        && resolved.value.stars.some((star) => star?.name === binding.star);
      if (!matches) errors.push(`${bindingAt} does not match an actual period star in the selected dynamic four-palace slot`);
      else verified.push(binding);
      return;
    }
    errors.push(`${bindingAt}.kind is invalid`);
  });

  const text = normalizeVisibleText(`${claim.statement || ""} ${claim.reasoning_summary || ""}`);
  const palaces = calculation?.facts?.palaces || [];
  const palaceNames = palaces.map((palace) => palace.name).filter(Boolean);
  const starNames = [...new Set(palaces.flatMap((palace) => [
    ...(palace.major_stars || []), ...(palace.minor_stars || []), ...(palace.adjective_stars || []),
  ]).map((star) => star.name).filter(Boolean))];
  const hasPositiveRelation = (pattern) => {
    const match = pattern.exec(text);
    if (!match) return false;
    return !/(?:不|并非|不是|未|没有|无)/u.test(match[1] || "");
  };
  for (const star of starNames.filter((name) => text.includes(name))) {
    if (!verified.some((binding) => binding.star === star)) {
      errors.push(`${at} mentions Zi Wei star ${star} without a verified semantic binding`);
    }
    for (const palace of palaceNames) {
      const escapedStar = star.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
      const escapedPalace = palace.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
      const starFirst = new RegExp(`${escapedStar}([^。！？,，;；]{0,8})(?:位于|落在|坐守|坐于|守在|在|入)[^。！？,，;；]{0,5}${escapedPalace}(?:宫)?`, "u");
      const palaceFirst = new RegExp(`${escapedPalace}(?:宫)?([^。！？,，;；]{0,5})(?:有|见|坐守|坐|落|入|汇聚)[^。！？,，;；]{0,8}${escapedStar}`, "u");
      const possessive = new RegExp(`${escapedPalace}(?:宫)?([^。！？,，;；]{0,3})(?:内|中|里)?的${escapedStar}`, "u");
      if (
        (hasPositiveRelation(starFirst) || hasPositiveRelation(palaceFirst) || hasPositiveRelation(possessive))
        && !verified.some((binding) =>
          binding.star === star
          && (
            (binding.kind === "star_in_palace" && binding.palace === palace)
            || (binding.kind === "mutagen_in_palace" && binding.palace === palace)
            || (binding.kind === "period_transformation" && binding.natal_palace === palace)
          ))) {
        errors.push(`${at} states an unverified ${star}-in-${palace} relation`);
      }
    }
    for (const transformation of ["禄", "权", "科", "忌"]) {
      const transformed = new RegExp(`${star}[^。！？,，;；]{0,4}化${transformation}`, "u");
      if (!transformed.test(text)) continue;
      const matchingTransformations = verified.filter((binding) =>
        binding.star === star && binding.transformation === transformation);
      if (matchingTransformations.length === 0) {
        errors.push(`${at} states an unverified ${star}-transforms-to-${transformation} relation`);
        continue;
      }
      const decadalContext = new RegExp(`大限[^。！？]{0,18}${star}[^。！？]{0,4}化${transformation}|${star}[^。！？]{0,4}化${transformation}[^。！？]{0,18}大限`, "u");
      const yearlyContext = new RegExp(`流年[^。！？]{0,18}${star}[^。！？]{0,4}化${transformation}|${star}[^。！？]{0,4}化${transformation}[^。！？]{0,18}流年`, "u");
      if (decadalContext.test(text) && !matchingTransformations.some((binding) =>
        binding.kind === "period_transformation" && binding.scope === "decadal")) {
        errors.push(`${at} states an unverified decadal ${star}-transforms-to-${transformation} relation`);
      }
      if (yearlyContext.test(text) && !matchingTransformations.some((binding) =>
        binding.kind === "period_transformation" && binding.scope === "yearly")) {
        errors.push(`${at} states an unverified yearly ${star}-transforms-to-${transformation} relation`);
      }
    }
  }
}

function containsUnconditionalFutureAssertion(value) {
  const text = normalizeVisibleText(value);
  if (!text) return false;
  const sentences = text.match(/[^。！？.!?]+[。！？.!?]?/gu) || [text];
  return sentences.some((sentence) => {
    if (/[?？]\s*$/u.test(sentence) || WHETHER_PATTERN.test(sentence)) return false;
    const clauses = sentence
      .replace(/[。！？.!?]+\s*$/gu, "")
      .split(/[;；]|(?:，|,)?\s*(?:但(?:是)?|不过|然而|却|可是|可实际上|但实际上|其实却)\s*|(?:，|,)\s*(?:实际上|其实|最终|结果(?:是)?)\s*|\b(?:but|however|yet|nevertheless)\b/iu)
      .filter(Boolean);
    return clauses.some((clause) => {
      const assertion = FUTURE_ASSERTION_PATTERN.exec(clause);
      if (!assertion) return false;
      return !FUTURE_QUALIFIER_PATTERN.test(clause.slice(0, assertion.index));
    });
  });
}

function explicitlyProtectsAgainstPrediction(value) {
  const text = normalizeVisibleText(value).replace(NEGATED_UNRESOLVED_PATTERN, " ");
  return /(?:不能|无法|不可|不宜|不应)(?:据此)?(?:判断|确定|确认|保证|推断|说明|预测)|不(?:作|做|构成|生成|提供|用于)?(?:任何|具体)?(?:事件|结果)?(?:判断|保证|推断|说明|预测)|不足以(?:判断|确定|确认|保证|推断|说明|预测)|不代表|不意味着|尚不确定|仍不确定|目前不确定|信息不足|证据不足|资料不足|不可判断|\b(?:cannot|can't)\s+(?:determine|conclude|confirm|guarantee|show|predict)\b|\bdoes\s+not\s+(?:mean|show|guarantee|predict)\b|\bnot\s+(?:guaranteed|a\s+prediction)\b|\binsufficient\b/iu.test(text);
}

function containsUnsupportedFutureContext(value, { allowRecordAction = false } = {}) {
  const text = normalizeVisibleText(value);
  if (!text) return false;
  const sentences = text.match(/[^。！？.!?]+[。！？.!?]?/gu) || [text];
  return sentences.some((sentence) => {
    const sentenceHasContext = FUTURE_CONTEXT_PATTERN.test(sentence);
    const clauses = sentence
      .replace(/[。！？.!?]+\s*$/gu, "")
      .split(/[;；]|(?:，|,)?\s*(?:但(?:是)?|不过|然而|却|可是|可实际上|但实际上|其实却)\s*|(?:，|,)\s*(?:实际上|其实|最终|结果(?:是)?)\s*|\b(?:but|however|yet|nevertheless)\b/iu)
      .filter(Boolean);
    return clauses.some((clause) => {
      const prospective = sentenceHasContext
        || FUTURE_CONTEXT_PATTERN.test(clause)
        || FUTURE_ASSERTION_PATTERN.test(clause);
      if (!prospective) return false;
      if (/[?？]\s*$/u.test(clause) || WHETHER_PATTERN.test(clause)) return false;
      if (explicitlyProtectsAgainstPrediction(clause)) return false;
      if (
        allowRecordAction
        && FUTURE_RECORD_ACTION_PATTERN.test(clause)
        && !containsUnconditionalFutureAssertion(clause)
      ) return false;
      return true;
    });
  });
}

function containsUnsafeUnresolvedClause(value) {
  const text = normalizeVisibleText(value);
  if (!text) return false;
  const sentences = text.match(/[^。！？.!?]+[。！？.!?]?/gu) || [text];
  return sentences.some((sentence) => {
    const clauses = sentence
      .replace(/[。！？.!?]+\s*$/gu, "")
      .split(/[;；]|(?:，|,)?\s*(?:但(?:是)?|不过|然而|却|可是|可实际上|但实际上|其实却)\s*|(?:，|,)\s*(?:实际上|其实|最终|结果(?:是)?)\s*|\b(?:but|however|yet|nevertheless)\b/iu)
      .filter(Boolean);
    return clauses.some((clause) => {
      if (/[?？]\s*$/u.test(clause) || WHETHER_PATTERN.test(clause)) return false;
      if (explicitlyStatesUncertainty(clause) || explicitlyProtectsAgainstPrediction(clause)) {
        return containsUnconditionalFutureAssertion(clause);
      }
      return true;
    });
  });
}

function claimInterpretiveTexts(claim) {
  const entries = [];
  const add = (path, value) => {
    if (typeof value === "string") entries.push({ path, value });
  };
  add("statement", claim?.statement);
  add("reasoning_summary", claim?.reasoning_summary);
  add("practical_reflection", claim?.practical_reflection);
  if (Array.isArray(claim?.alternative_readings)) {
    claim.alternative_readings.forEach((value, index) => add(`alternative_readings[${index}]`, value));
  }
  if (Array.isArray(claim?.dependencies)) {
    claim.dependencies.forEach((value, index) => add(`dependencies[${index}]`, value));
  }
  if (Array.isArray(claim?.assessment?.criteria)) {
    claim.assessment.criteria.forEach((criterion, index) =>
      add(`assessment.criteria[${index}].observable`, criterion?.observable));
  }
  return entries;
}

function validateClaimFutureBoundary(claim, at, errors) {
  const entries = claimInterpretiveTexts(claim);
  const canonicalPhaseRoute = claim?.system === "ziwei"
    && claim?.epistemic_status === "interpretation"
    && claim?.scope === "phase_topic_synthesis"
    && Array.isArray(claim?.rule_ids)
    && claim.rule_ids.includes("R-ZW-009");
  for (const entry of entries) {
    if (containsUnconditionalFutureAssertion(entry.value)) {
      errors.push(`${at}.${entry.path} contains an unconditional future outcome assertion`);
      continue;
    }
    // Unresolved prose is exact-rendered and compared field-for-field below.
    // The generic future assertion check above remains active, while the exact
    // comparison avoids a second heuristic rejecting our own fixed template.
    if (claim?.epistemic_status === "unresolved") continue;
    if (
      ["traditional_rule", "interpretation"].includes(claim?.epistemic_status)
      && !canonicalPhaseRoute
      && containsUnsupportedFutureContext(entry.value, {
        allowRecordAction: entry.path === "practical_reflection" || entry.path.startsWith("assessment.criteria"),
      })
    ) {
      errors.push(`${at}.${entry.path} cannot introduce prospective content outside the closed Zi Wei phase route`);
    }
  }
}

function collectCompoundKeys(value, target = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectCompoundKeys(item, target));
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (/^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)+$/iu.test(key)) target.add(key.normalize("NFKC").toLowerCase());
      collectCompoundKeys(child, target);
    }
  }
  return target;
}

function visibleReadingFields(reading) {
  const fields = [];
  const add = (path, value) => {
    if (typeof value === "string") fields.push({ path, text: value.normalize("NFKC") });
  };
  add("reading.title", reading?.title);
  add("reading.user_focus", reading?.user_focus);
  add("reading.disclaimer", reading?.disclaimer);
  add("reading.summary", reading?.summary);
  add("reading.uncertainty_summary", reading?.uncertainty_summary);
  if (Array.isArray(reading?.claims)) {
    reading.claims.forEach((claim, index) => {
      add(`reading.claims[${index}].statement`, claim?.statement);
      add(`reading.claims[${index}].practical_reflection`, claim?.practical_reflection);
    });
  }
  if (Array.isArray(reading?.next_steps)) {
    reading.next_steps.forEach((step, index) => {
      if (typeof step === "string") add(`reading.next_steps[${index}]`, step);
      else {
        add(`reading.next_steps[${index}].label`, step?.label);
        add(`reading.next_steps[${index}].reason`, step?.reason);
      }
    });
  }
  return fields;
}

function protectedCalculationValues(calculations) {
  const values = [];
  const add = (category, value) => {
    if (typeof value === "string" && value.length > 0) {
      values.push({ category, value: value.normalize("NFKC").toLowerCase() });
    }
  };
  for (const calculation of calculations) {
    // Only high-specificity values are rejected without a nearby technical label.
    // Generic version strings are low-entropy and can occur innocently.
    add("calculation profile identifier", calculation?.profile?.id);
    add("calculation facts hash", calculation?.facts_hash);
    add("calculation reproducibility hash", calculation?.reproducibility_hash);
    if (Array.isArray(calculation?.warnings)) {
      for (const warning of calculation.warnings) {
        if (typeof warning !== "string") continue;
        add("calculation warning detail", warning);
        const code = /^([A-Z][A-Z0-9_]{2,})(?::|$)/u.exec(warning)?.[1];
        add("calculation warning code", code);
      }
    }
  }
  const unique = new Map(values.map((entry) => [`${entry.category}\u0000${entry.value}`, entry]));
  return [...unique.values()];
}

function protectedCalculationKeys(calculations) {
  const keys = new Set();
  for (const calculation of calculations) {
    collectCompoundKeys(calculation?.profile, keys);
    collectCompoundKeys(calculation?.meta, keys);
    collectCompoundKeys(calculation?.sensitivity, keys);
  }
  return [...keys];
}

function containsProtectedValue(text, protectedValue) {
  const normalized = text.toLowerCase();
  let index = normalized.indexOf(protectedValue);
  while (index !== -1) {
    const before = normalized[index - 1];
    const after = normalized[index + protectedValue.length];
    const tokenCharacter = /[a-z0-9._-]/u;
    if ((!before || !tokenCharacter.test(before)) && (!after || !tokenCharacter.test(after))) return true;
    index = normalized.indexOf(protectedValue, index + 1);
  }
  return false;
}

function validateVisibleReadingText(reading, calculations, errors) {
  const protectedValues = protectedCalculationValues(calculations);
  const protectedKeys = protectedCalculationKeys(calculations);
  for (const { path, text } of visibleReadingFields(reading)) {
    const userFocus = path === "reading.user_focus";
    if (!userFocus && containsUnconditionalFutureAssertion(text)) {
      errors.push(`${path} contains an unconditional future outcome assertion`);
    }
    if (
      !userFocus
      && (path === "reading.title" || path.startsWith("reading.next_steps"))
      && FUTURE_CONTEXT_PATTERN.test(text)
    ) {
      errors.push(`${path} cannot frame a result or action as a future event`);
    }
    if (
      !userFocus
      && ["reading.disclaimer", "reading.uncertainty_summary"].includes(path)
      && containsUnsupportedFutureContext(text, { allowRecordAction: false })
    ) {
      errors.push(`${path} may mention the future only to state an explicit non-prediction or uncertainty boundary`);
    }
    const categories = new Set();
    if (!userFocus) {
      for (const { category, pattern } of VISIBLE_BACKSTAGE_PATTERNS) {
        if (pattern.test(text)) categories.add(category);
      }
    }
    for (const { category, value } of protectedValues) {
      if (containsProtectedValue(text, value)) categories.add(category);
    }
    if (!userFocus) {
      for (const key of protectedKeys) {
        if (containsProtectedValue(text, key)) categories.add("calculation technical key");
      }
    } else if (/\b(?:node|icu|tzdb|library|temporal_polyfill|profile|meta)\s*[:=]/iu.test(text)) {
      categories.add("profile or runtime configuration metadata");
    }
    for (const category of categories) {
      errors.push(`${path} contains backstage technical data (${category})`);
    }
  }
}

function lexicalSafetyCategories(reading) {
  const text = [];
  collectStrings(reading?.title, text);
  collectStrings(reading?.summary, text);
  collectStrings(reading?.uncertainty_summary, text);
  collectStrings(reading?.cross_system, text);
  collectStrings(reading?.next_steps, text);
  if (Array.isArray(reading?.claims)) {
    for (const claim of reading.claims) {
      collectStrings(claim?.statement, text);
      collectStrings(claim?.reasoning_summary, text);
      collectStrings(claim?.alternative_readings, text);
      collectStrings(claim?.practical_reflection, text);
    }
  }
  return LEXICAL_SAFETY_PATTERNS
    .filter(({ patterns }) => text.some((item) => patterns.some((pattern) => pattern.test(item))))
    .map(({ category }) => category);
}

function warningCodes(calculation) {
  if (!Array.isArray(calculation?.warnings)) return [];
  return calculation.warnings
    .filter((warning) => typeof warning === "string")
    .map((warning) => warning.split(":", 1)[0])
    .filter((code) => MATERIAL_WARNING_CODES.has(code));
}

function validateNextSteps(reading, errors) {
  if (!Array.isArray(reading?.next_steps)) return;
  const deep = DEEP_LEVELS.has(reading.level);
  const systems = Array.isArray(reading.system) ? reading.system : [reading.system];
  const multiSystem = systems.length > 1;
  if (deep && reading.next_steps.length === 0) errors.push(`reading.level=${reading.level} requires at least one structured next step`);
  const ids = new Set();
  reading.next_steps.forEach((step, index) => {
    const at = `reading.next_steps[${index}]`;
    if (typeof step === "string") {
      errors.push(`${at} must be a structured action object`);
      if (systems.some((system) => FRESH_DRAW_SYSTEMS.has(system)) && FRESH_DRAW_LABEL_PATTERN.test(step)) {
        errors.push(`${at} describes a fresh Tarot/I Ching question or draw and must use action=new_reading with reuses_frozen_calculation=false`);
      }
      return;
    }
    if (!step || typeof step !== "object" || Array.isArray(step)) {
      errors.push(`${at} must be a string or structured object`);
      return;
    }
    const allowed = new Set(["id", "label", "action", "available", "requires_input", "reuses_frozen_calculation", "target_system", "reason"]);
    const unknown = Object.keys(step).filter((key) => !allowed.has(key));
    if (unknown.length) errors.push(`${at} contains ${unknown.length} unknown field(s)`);
    if (typeof step.id !== "string" || !/^[a-z][a-z0-9_-]*$/.test(step.id)) errors.push(`${at}.id has an invalid format`);
    else if (ids.has(step.id)) errors.push(`${at}.id is duplicated`);
    else ids.add(step.id);
    if (typeof step.label !== "string" || !step.label.trim()) errors.push(`${at}.label is required`);
    else if (step.label !== canonicalNextStepLabel(step)) errors.push(`${at}.label must equal the canonical action label`);
    if (!NEXT_STEP_ACTIONS.has(step.action)) errors.push(`${at}.action is invalid`);
    if (typeof step.available !== "boolean") errors.push(`${at}.available must be a boolean`);
    if (typeof step.reuses_frozen_calculation !== "boolean") errors.push(`${at}.reuses_frozen_calculation must be a boolean`);
    const targetSystemValid = typeof step.target_system === "string"
      && SUPPORTED_SYSTEMS.has(step.target_system)
      && systems.includes(step.target_system);
    if (step.target_system != null && !targetSystemValid) {
      errors.push(`${at}.target_system must name a system included in reading.system`);
    }
    const targetSystem = targetSystemValid ? step.target_system : (multiSystem ? null : systems[0]);
    const labelRequestsFreshDraw = step.available === true
      && typeof step.label === "string"
      && FRESH_DRAW_LABEL_PATTERN.test(step.label);
    if (step.action === "change_focus" && step.reuses_frozen_calculation !== true) {
      errors.push(`${at}.action=change_focus must reuse the frozen calculation`);
    }
    if (step.action === "new_reading" && step.reuses_frozen_calculation !== false) {
      errors.push(`${at}.action=new_reading must not reuse the frozen calculation`);
    }
    const requiresInputValid = Array.isArray(step.requires_input)
      && step.requires_input.every((item) => typeof item === "string" && NEXT_STEP_INPUT_FIELDS.has(item));
    if (!Array.isArray(step.requires_input) || step.requires_input.some((item) => typeof item !== "string" || !item.trim())) {
      errors.push(`${at}.requires_input must be an array of non-empty strings`);
    } else if (new Set(step.requires_input).size !== step.requires_input.length) {
      errors.push(`${at}.requires_input contains duplicates`);
    } else if (!requiresInputValid) {
      errors.push(`${at}.requires_input contains an unknown input field`);
    } else if (
      FRESH_DRAW_SYSTEMS.has(targetSystem)
      && step.requires_input.some((item) => FRESH_CALCULATION_INPUT_FIELDS.has(item))
      && (step.action !== "new_reading" || step.reuses_frozen_calculation !== false)
    ) {
      errors.push(`${at}.requires_input changes a Tarot/I Ching question, draw, or cast and must use action=new_reading with reuses_frozen_calculation=false`);
    }
    const hasFreshDrawInput = Array.isArray(step.requires_input)
      && step.requires_input.some((item) => FRESH_DRAW_OPERATION_INPUT_FIELDS.has(item));
    if (
      labelRequestsFreshDraw
      && (
        !FRESH_DRAW_SYSTEMS.has(targetSystem)
        || step.action !== "new_reading"
        || step.reuses_frozen_calculation !== false
        || !hasFreshDrawInput
      )
    ) {
      errors.push(`${at} describes a fresh Tarot/I Ching question or draw but its target_system, action, requires_input, or reuse semantics do not start one`);
    }
    if (
      multiSystem
      && (
        (Array.isArray(step.requires_input) && step.requires_input.length > 0)
        || MULTI_SYSTEM_TARGETED_ACTIONS.has(step.action)
        || labelRequestsFreshDraw
      )
      && !targetSystemValid
    ) {
      errors.push(`${at}.target_system is required for this multi-system action`);
    }
    if (step.available === false && step.reason !== CANONICAL_UNAVAILABLE_REASON) {
      errors.push(`${at}.reason must equal the canonical unavailable explanation`);
    }
    if (step.available === true && Object.hasOwn(step, "reason")) {
      errors.push(`${at}.reason is not allowed when available=true`);
    }
  });
}

function includesForbiddenProbability(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(includesForbiddenProbability);
  return Object.entries(value).some(([key, child]) =>
    ["prediction_probability", "accuracy_probability", "confidence_percentage"].includes(key)
      || includesForbiddenProbability(child));
}

function containsForbiddenVoteKey(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsForbiddenVoteKey);
  return Object.entries(value).some(([key, child]) =>
    ["winner", "vote"].includes(key) || containsForbiddenVoteKey(child));
}

function profileMatches(claimProfile, calculationProfile) {
  if (typeof claimProfile === "string") return claimProfile === calculationProfile?.id;
  return claimProfile && calculationProfile && stableJson(claimProfile) === stableJson(calculationProfile);
}

function sensitivityTotal(calculation) {
  const sensitivity = calculation?.sensitivity;
  if (!sensitivity || typeof sensitivity !== "object") return null;
  for (const value of [
    sensitivity.candidate_count,
    sensitivity.sample_count,
    sensitivity.candidates?.length,
    sensitivity.variants?.length,
  ]) {
    if (Number.isInteger(value) && value > 0) return value;
  }
  return null;
}

function sensitivityClass(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const status = value.sign_status ?? value.status;
  if (status === "stable") return "stable";
  if (["boundary-sensitive", "time-sensitive", "variable", "partly-stable"].includes(status)) return "sensitive";
  if (status === "unavailable") return "unavailable";
  return null;
}

function derivedInputSensitivity(calculation, factIds) {
  const total = sensitivityTotal(calculation);
  if (calculation?.sensitivity == null) return { label: "not_assessed", coverage: null };
  const references = collectFactReferences(calculation.facts);
  const classes = new Set();
  for (const factId of factIds) {
    const path = claimedFactPath(factId, references, calculation);
    const observed = typeof path === "string" ? valueAtFactPath(calculation, path) : { found: false };
    const classification = observed.found ? sensitivityClass(observed.value) : null;
    if (classification) classes.add(classification);
  }
  let label;
  if (classes.has("unavailable")) label = "unavailable";
  else if (classes.has("sensitive") && classes.has("stable")) label = "partly_stable";
  else if (classes.has("sensitive")) label = "boundary_sensitive";
  else if (classes.has("stable")) label = "stable";
  else label = "unavailable";
  return { label, coverage: total == null ? null : `${total}/${total}` };
}

function canonicalQualityStatus(calculations) {
  return {
    calculation_verification: calculations.map((calculation) => {
      const verification = safeVerifyCalculationFacts(calculation);
      return { system: calculation?.system ?? "unknown", status: verification.status };
    }),
    technical_assertions: "typed_bindings_only",
    narrative_status: "not_machine_verified",
    review_status: "automated_fixture_reviewed",
    professional_label_allowed: false,
    predictive_validity: "not_established",
  };
}

function safeVerifyCalculationEnvelope(calculation) {
  try {
    return verifyCalculationEnvelope(calculation);
  } catch (error) {
    return [`calculation envelope verification failed safely: ${error instanceof Error ? error.message : "invalid structure"}`];
  }
}

function safeVerifyCalculationFacts(calculation) {
  try {
    return verifyCalculationFacts(calculation);
  } catch (error) {
    return {
      status: "unavailable",
      errors: [`calculation fact verification failed safely: ${error instanceof Error ? error.message : "invalid structure"}`],
    };
  }
}

function ziweiMeaningSignature(claim, binding) {
  return stableJson({
    system: claim.system,
    calculation_facts_hash: claim.calculation_facts_hash,
    interpretation_profile_id: claim.interpretation_profile_id,
    rule_id: binding.rule_id,
    topic: binding.topic,
    topic_unit_id: binding.topic_unit_id,
    palace_axis_groups: binding.palace_axis_groups,
    transformation_lenses: binding.transformation_lenses,
    assessment_mode: binding.assessment_mode,
    window: binding.phase?.window ?? { kind: "current" },
  });
}

/**
 * Add immutable calculation and evidence-value bindings to a draft reading.
 * This is a mechanical preparation step, not semantic certification: the
 * resulting payload must still pass validateReading and narrative review.
 */
export function bindReadingToCalculations(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || !isPlainJsonValue(payload)) {
    throw new FortuneTellerError("INVALID_READING_PAYLOAD", "reading payload must be finite, acyclic plain JSON");
  }
  const hasCalculation = Object.hasOwn(payload, "calculation");
  const hasCalculations = Object.hasOwn(payload, "calculations");
  if (hasCalculation === hasCalculations) {
    throw new FortuneTellerError("INVALID_READING_PAYLOAD", "provide calculation or calculations, not both");
  }
  const unknownPayloadKeys = Object.keys(payload).filter((key) => ![
    "calculation", "calculations", "reading", "binding_options",
  ].includes(key));
  if (unknownPayloadKeys.length) {
    throw new FortuneTellerError("INVALID_READING_PAYLOAD", `reading payload contains ${unknownPayloadKeys.length} unknown field(s)`);
  }
  if (
    Object.hasOwn(payload, "binding_options")
    && (
      !payload.binding_options
      || typeof payload.binding_options !== "object"
      || Array.isArray(payload.binding_options)
    )
  ) {
    throw new FortuneTellerError("INVALID_READING_PAYLOAD", "binding_options must be a JSON object");
  }
  const unavailableMode = payload.binding_options?.meaning_unavailable ?? "strict";
  if (![
    "strict", "degrade_claim",
  ].includes(unavailableMode) || Object.keys(payload.binding_options || {}).some((key) => key !== "meaning_unavailable")) {
    throw new FortuneTellerError("INVALID_READING_PAYLOAD", "binding_options.meaning_unavailable must be strict or degrade_claim");
  }
  const calculations = hasCalculations ? payload.calculations : [payload.calculation];
  if (!Array.isArray(calculations) || calculations.length === 0) {
    throw new FortuneTellerError("INVALID_READING_PAYLOAD", "at least one calculation is required");
  }
  for (const calculation of calculations) {
    const envelopeErrors = safeVerifyCalculationEnvelope(calculation);
    if (envelopeErrors.length) {
      throw new FortuneTellerError("INVALID_CALCULATION_ENVELOPE", envelopeErrors[0]);
    }
    const factVerification = safeVerifyCalculationFacts(calculation);
    if (factVerification.errors.length) {
      throw new FortuneTellerError("CALCULATION_FACTS_NOT_SELF_CONSISTENT", factVerification.errors[0]);
    }
  }
  const draft = structuredClone(payload);
  delete draft.binding_options;
  const reading = draft.reading;
  if (!reading || typeof reading !== "object" || Array.isArray(reading) || !Array.isArray(reading.claims)) {
    throw new FortuneTellerError("INVALID_READING_PAYLOAD", "reading.claims must be an array");
  }
  canonicalizePresentation(reading, calculations);
  reading.calculation_bindings = calculations.map(calculationBindingFor);
  reading.quality_status = canonicalQualityStatus(calculations);
  for (const claim of reading.claims) {
    const systemCalculations = calculations.filter((item) => item.system === claim?.system);
    const matching = systemCalculations.filter((item) => profileMatches(claim?.profile, item.profile));
    if (matching.length !== 1) {
      throw new FortuneTellerError(
        "AMBIGUOUS_CLAIM_CALCULATION",
        "each claim must match exactly one supplied system/profile calculation before binding",
      );
    }
    const calculation = matching[0];
    claim.calculation_facts_hash = calculation.facts_hash;
    const requestedRoles = new Map();
    if (Array.isArray(claim.evidence_bindings)) {
      for (const binding of claim.evidence_bindings) {
        if (typeof binding?.ref === "string" && typeof binding?.role === "string") {
          requestedRoles.set(binding.ref, binding.role);
        }
      }
    }
    if (!Array.isArray(claim.fact_ids)) {
      throw new FortuneTellerError("INVALID_READING_PAYLOAD", "each claim requires fact_ids before binding");
    }
    claim.evidence_bindings = claim.fact_ids.map((ref) =>
      resolveEvidenceBinding(calculation, ref, requestedRoles.get(ref) || "support"));
    claim.input_sensitivity = derivedInputSensitivity(calculation, claim.fact_ids);
    if (claim.epistemic_status === "unresolved") {
      const previousStatement = claim.statement;
      Object.assign(claim, canonicalUnresolvedNarrative(claim));
      for (const field of [
        "assessment", "interpretation_profile_id", "rule_pack_hash", "meaning_binding",
        "semantic_bindings", "technical_summary",
      ]) delete claim[field];
      if (reading.summary === previousStatement) reading.summary = claim.statement;
    } else if (claim.epistemic_status === "calculation_fact") {
      const previousStatement = claim.statement;
      claim.statement = canonicalCalculationFactStatement(calculation, claim.fact_ids);
      if (reading.summary === previousStatement) reading.summary = claim.statement;
    }
    const declaredRules = Array.isArray(claim.rule_ids)
      ? claim.rule_ids.map((ruleId) => getRuleById(ruleId)).filter(Boolean)
      : [];
    const canonicalMeaningRules = declaredRules.filter((rule) => rule.canonical_narrative_required);
    if (claim.epistemic_status === "interpretation" && canonicalMeaningRules.length > 0) {
      const previousStatement = claim.statement;
      const derivation = deriveZiweiMeaningBinding(claim, calculation, canonicalMeaningRules);
      if (!derivation.ok) {
        if (unavailableMode === "degrade_claim") {
          claim.epistemic_status = "unresolved";
          claim.unresolved_reason_kind = "rule_unavailable";
          Object.assign(claim, canonicalUnresolvedNarrative(claim));
          for (const field of [
            "assessment", "interpretation_profile_id", "rule_pack_hash", "meaning_binding",
            "semantic_bindings", "technical_summary",
          ]) delete claim[field];
          continue;
        }
        throw new FortuneTellerError(
          "MEANING_LAYER_UNAVAILABLE",
          `${derivation.reason_code}: ${derivation.reason_zh}`,
          { fallback: derivation.fallback },
        );
      }
      claim.meaning_binding = derivation.binding;
      claim.semantic_bindings = canonicalZiweiSemanticBindings(derivation.binding, calculation);
      claim.technical_summary = canonicalTechnicalSummary(calculation, claim.semantic_bindings, claim.fact_ids);
      Object.assign(claim, canonicalZiweiNarrative(derivation.binding, calculation));
      if (reading.summary === previousStatement) reading.summary = claim.statement;
    } else if (Array.isArray(claim.semantic_bindings) && claim.semantic_bindings.length > 0) {
      claim.technical_summary = canonicalTechnicalSummary(calculation, claim.semantic_bindings, claim.fact_ids);
    }
  }
  if (typeof reading.claims[0]?.statement === "string") reading.summary = reading.claims[0].statement;
  return draft;
}

function validateCalculationBindings(reading, calculations, errors) {
  const bindings = reading?.calculation_bindings;
  if (!Array.isArray(bindings) || bindings.length === 0) {
    errors.push("reading.calculation_bindings must be a non-empty array");
    return;
  }
  const bindingKeys = new Set(["system", "profile", "facts_hash", "reproducibility_hash"]);
  const seen = new Set();
  bindings.forEach((binding, index) => {
    const at = `reading.calculation_bindings[${index}]`;
    if (!binding || typeof binding !== "object" || Array.isArray(binding)) {
      errors.push(`${at} must be an object`);
      return;
    }
    const unknown = Object.keys(binding).filter((key) => !bindingKeys.has(key));
    if (unknown.length) errors.push(`${at} contains ${unknown.length} unknown field(s)`);
    if (!SUPPORTED_SYSTEMS.has(binding.system)) errors.push(`${at}.system is invalid`);
    if (
      binding.profile == null
      || (typeof binding.profile !== "string" && (typeof binding.profile !== "object" || Array.isArray(binding.profile)))
    ) errors.push(`${at}.profile must be a string or object`);
    for (const field of ["facts_hash", "reproducibility_hash"]) {
      if (typeof binding[field] !== "string" || !/^[a-f0-9]{64}$/.test(binding[field])) {
        errors.push(`${at}.${field} must be a lowercase SHA-256 value`);
      }
    }
    let canonical;
    try { canonical = stableJson(binding); } catch { canonical = null; }
    if (canonical && seen.has(canonical)) errors.push(`${at} duplicates another calculation binding`);
    if (canonical) seen.add(canonical);
  });
  calculations.forEach((calculation, index) => {
    const matches = bindings.filter((binding) => bindingMatchesCalculation(binding, calculation));
    if (matches.length !== 1) {
      errors.push(`calculations[${index}] must have exactly one matching reading.calculation_bindings entry`);
    }
  });
  if (bindings.length !== calculations.length) {
    errors.push("reading.calculation_bindings must match the supplied calculation set exactly");
  }
}

export function validateReading(payload) {
  const errors = [];
  const warnings = [];
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { valid: false, errors: ["payload must be an object"], warnings };
  }
  if (!isPlainJsonValue(payload)) {
    return { valid: false, errors: ["payload must contain only finite, acyclic plain JSON values"], warnings };
  }
  const unknownPayloadKeys = Object.keys(payload).filter((key) => !["calculation", "calculations", "reading"].includes(key));
  if (unknownPayloadKeys.length) errors.push(`payload contains ${unknownPayloadKeys.length} unknown field(s)`);
  const { calculation, calculations: rawCalculations, reading } = payload;
  const hasCalculation = Object.hasOwn(payload, "calculation");
  const hasCalculations = Object.hasOwn(payload, "calculations");
  if (hasCalculation && hasCalculations) errors.push("use calculation or calculations, not both");
  const suppliedCalculations = hasCalculations ? rawCalculations : hasCalculation ? [calculation] : [];
  const calculations = Array.isArray(suppliedCalculations) ? suppliedCalculations : [];
  if (!Array.isArray(suppliedCalculations) || calculations.length === 0) errors.push("calculation or calculations is required");
  const calculationBindings = new Set();
  const validCalculationObjects = new Set();
  calculations.forEach((item, index) => {
    const envelopeErrors = safeVerifyCalculationEnvelope(item);
    for (const error of envelopeErrors) errors.push(`calculations[${index}] ${error}`);
    const factVerification = safeVerifyCalculationFacts(item);
    for (const error of factVerification.errors) errors.push(`calculations[${index}] ${error}`);
    if (envelopeErrors.length === 0 && factVerification.errors.length === 0) {
      validCalculationObjects.add(item);
    }
    if (
      typeof item?.system === "string"
      && SUPPORTED_SYSTEMS.has(item.system)
      && item?.profile
      && typeof item.profile === "object"
      && !Array.isArray(item.profile)
    ) {
      const binding = `${item.system}\u0000${stableJson(item.profile)}`;
      if (calculationBindings.has(binding)) {
        errors.push(`calculations[${index}] duplicates a system/profile binding; validate same-profile people separately`);
      }
      calculationBindings.add(binding);
    }
  });
  const questionCalculations = calculations.filter((item) => (
    ["tarot", "iching", "meihua"].includes(item?.system)
    && typeof item?.input?.question === "string"
    && item.input.question.trim()
  ));
  if (questionCalculations.length > 1) {
    const normalizedQuestions = new Set(questionCalculations.map((item) => (
      item.input.question.normalize("NFKC").trim().replace(/\s+/gu, " ")
    )));
    if (normalizedQuestions.size > 1) {
      errors.push("multiple question-based systems in one reading must use the same normalized question");
    }
  }
  if (!reading || typeof reading !== "object" || Array.isArray(reading)) errors.push("reading is required");
  const claims = reading?.claims;
  const readingKeys = new Set([
    "system", "level", "title", "user_focus", "disclaimer", "summary", "claims", "uncertainty_summary",
    "warning_acknowledgements", "cross_system", "next_steps", "calculation_bindings", "quality_status",
  ]);
  if (reading && typeof reading === "object") {
    const unknownReadingKeys = Object.keys(reading).filter((key) => !readingKeys.has(key));
    if (unknownReadingKeys.length) errors.push(`reading contains ${unknownReadingKeys.length} unknown field(s)`);
    if (typeof reading.system !== "string" && !Array.isArray(reading.system)) errors.push("reading.system is required");
    validateCalculationBindings(reading, calculations, errors);
    const expectedQualityStatus = canonicalQualityStatus(calculations);
    if (stableJson(reading.quality_status) !== stableJson(expectedQualityStatus)) {
      errors.push("reading.quality_status must be mechanically derived from the supplied calculations and current release boundary");
    }
    if (typeof reading.system === "string" && !SUPPORTED_SYSTEMS.has(reading.system)) {
      errors.push(`reading.system must be one of: ${CALCULATION_SYSTEMS.join(", ")}`);
    }
    if (Array.isArray(reading.system) && reading.system.some((item) => !SUPPORTED_SYSTEMS.has(item))) {
      errors.push("reading.system entries must be supported system IDs");
    }
    const declaredSystems = typeof reading.system === "string" ? [reading.system] : reading.system;
    if (Array.isArray(declaredSystems)) {
      const expected = [...new Set(calculations
        .map((item) => item?.system)
        .filter((item) => typeof item === "string" && SUPPORTED_SYSTEMS.has(item)))].sort();
      const declaredStrings = declaredSystems.filter((item) => typeof item === "string");
      const declared = [...new Set(declaredStrings)].sort();
      if (declared.length !== declaredStrings.length) errors.push("reading.system contains duplicates");
      if (stableJson(declared) !== stableJson(expected)) {
        errors.push(`reading.system must match calculation systems: ${expected.join(", ")}`);
      }
    }
    if (!new Set(["quick", "standard", "deep", "audit"]).has(reading.level)) errors.push("reading.level is invalid");
    if (reading.title !== canonicalReadingTitle(reading)) {
      errors.push("reading.title must equal the canonical system-and-level result label");
    }
    if (Object.hasOwn(reading, "user_focus") && (typeof reading.user_focus !== "string" || !reading.user_focus.trim())) {
      errors.push("reading.user_focus must be a non-empty string");
    }
    if (reading.disclaimer !== CANONICAL_DISCLAIMER) {
      errors.push("reading.disclaimer must equal the canonical non-prediction boundary");
    }
    if (reading.user_focus !== canonicalUserFocus(reading)) {
      errors.push("reading.user_focus must equal the canonical unique claim-topic labels");
    }
    if (typeof reading.summary !== "string" || !reading.summary.trim()) {
      errors.push("reading.summary must be a non-empty string");
    }
    if (reading.uncertainty_summary !== canonicalUncertaintySummary(calculations)) {
      errors.push("reading.uncertainty_summary must equal the canonical calculation-and-interpretation boundary");
    }
    if (
      Object.hasOwn(reading, "warning_acknowledgements")
      && (
        !Array.isArray(reading.warning_acknowledgements)
        || reading.warning_acknowledgements.some((item) => typeof item !== "string" || !item.trim())
      )
    ) {
      errors.push("reading.warning_acknowledgements must be an array of non-empty warning codes");
    }
    if (
      Array.isArray(reading.warning_acknowledgements)
      && new Set(reading.warning_acknowledgements).size !== reading.warning_acknowledgements.length
    ) {
      errors.push("reading.warning_acknowledgements contains duplicates");
    }
    const readingSystems = Array.isArray(reading.system) ? reading.system : [reading.system];
    const expectedCrossSystem = readingSystems.length > 1 ? { relationship: "not_compared" } : undefined;
    if (
      (expectedCrossSystem && !isDeepStrictEqual(reading.cross_system, expectedCrossSystem))
      || (!expectedCrossSystem && Object.hasOwn(reading, "cross_system"))
    ) {
      errors.push("reading.cross_system must be absent for one system and exactly not_compared for multiple systems");
    }
    if (!Array.isArray(reading.next_steps)) errors.push("reading.next_steps must be an array");
    if (DEEP_LEVELS.has(reading.level)) {
      if (typeof reading.uncertainty_summary !== "string" || !reading.uncertainty_summary.trim()) {
        errors.push(`reading.level=${reading.level} requires a non-empty uncertainty_summary`);
      }
    }
    const requiredWarningCodes = [...new Set(calculations.flatMap(warningCodes))];
    const suppliedWarningCodes = Array.isArray(reading.warning_acknowledgements)
      ? [...reading.warning_acknowledgements].sort() : [];
    if (stableJson(suppliedWarningCodes) !== stableJson([...requiredWarningCodes].sort())) {
      errors.push("reading.warning_acknowledgements must exactly equal the material warning codes emitted by the supplied calculations");
    }
    if (requiredWarningCodes.length) {
      if (typeof reading.uncertainty_summary !== "string" || !reading.uncertainty_summary.trim()) {
        errors.push("material calculation warnings require a non-empty reading.uncertainty_summary");
      }
      for (const code of requiredWarningCodes) {
        if (!Array.isArray(reading.warning_acknowledgements) || !reading.warning_acknowledgements.includes(code)) {
          errors.push(`reading.warning_acknowledgements must include ${code}`);
        }
      }
    }
    validateNextSteps(reading, errors);
  }
  if (!Array.isArray(claims) || claims.length === 0) errors.push("reading.claims must be a non-empty array");
  const availableFacts = new Set();
  for (const item of calculations.filter((candidate) => validCalculationObjects.has(candidate))) {
    collectFactIds(item?.facts, availableFacts);
  }
  const claimIds = new Set();
  const meaningSignatures = new Set();

  if (Array.isArray(claims)) {
    const calculationSystems = [...new Set(calculations
      .map((item) => item?.system)
      .filter((item) => typeof item === "string" && SUPPORTED_SYSTEMS.has(item)))];
    for (const system of calculationSystems) {
      if (!claims.some((claim) => claim?.system === system)) {
        errors.push(`reading.claims must include at least one claim for declared system ${system}`);
      }
    }
    for (const [index, claim] of claims.entries()) {
      const at = `reading.claims[${index}]`;
      if (!claim || typeof claim !== "object") {
        errors.push(`${at} must be an object`);
        continue;
      }
      const claimKeys = new Set([
        "claim_id", "statement", "topic", "epistemic_status", "system", "profile", "scope", "fact_ids", "rule_ids",
        "reasoning_summary", "calculation_certainty", "input_sensitivity", "school_stability",
        "source_status", "source_ids", "alternative_readings", "practical_reflection",
        "calculation_facts_hash", "evidence_bindings", "assessment", "interpretation_profile_id",
        "rule_pack_hash", "topic_unit_id", "semantic_bindings", "meaning_binding",
        "technical_summary", "unresolved_reason_kind",
      ]);
      const unknownClaimKeys = Object.keys(claim).filter((key) => !claimKeys.has(key));
      if (unknownClaimKeys.length) errors.push(`${at} contains ${unknownClaimKeys.length} unknown field(s)`);
      if (typeof claim.claim_id !== "string" || !claim.claim_id) errors.push(`${at}.claim_id is required`);
      else if (!/^C-[A-Za-z0-9_-]+$/.test(claim.claim_id)) errors.push(`${at}.claim_id has an invalid format`);
      else if (claimIds.has(claim.claim_id)) errors.push(`${at}.claim_id is duplicated`);
      else claimIds.add(claim.claim_id);
      if (typeof claim.statement !== "string" || !claim.statement.trim()) errors.push(`${at}.statement is required`);
      if (claim.technical_summary != null && (typeof claim.technical_summary !== "string" || !claim.technical_summary.trim())) {
        errors.push(`${at}.technical_summary must be a non-empty string when present`);
      }
      if (Object.hasOwn(claim, "topic") && !CLAIM_TOPICS.has(claim.topic)) errors.push(`${at}.topic is invalid`);
      if (!CLAIM_STATUSES.has(claim.epistemic_status)) errors.push(`${at}.epistemic_status is invalid`);
      if (
        Object.hasOwn(claim, "unresolved_reason_kind")
        && !UNRESOLVED_REASON_KINDS.has(claim.unresolved_reason_kind)
      ) errors.push(`${at}.unresolved_reason_kind is invalid`);
      if (claim.epistemic_status !== "unresolved" && Object.hasOwn(claim, "unresolved_reason_kind")) {
        errors.push(`${at}.unresolved_reason_kind is allowed only for unresolved claims`);
      }
      validateClaimFutureBoundary(claim, at, errors);
      if (claim.epistemic_status === "interpretation") {
        if (!CLAIM_TOPICS.has(claim.topic)) errors.push(`${at}.topic is required for interpretation claims`);
        validateAssessment(claim, at, errors);
      }
      if (typeof claim.system !== "string" || !claim.system) errors.push(`${at}.system is required`);
      else if (!SUPPORTED_SYSTEMS.has(claim.system)) errors.push(`${at}.system is unsupported`);
      if (claim.profile == null || (typeof claim.profile !== "string" && (typeof claim.profile !== "object" || Array.isArray(claim.profile)))) {
        errors.push(`${at}.profile must be a string or object`);
      }
      const systemCalculations = calculations.filter((item) =>
        validCalculationObjects.has(item) && item?.system === claim.system);
      if (typeof claim.system === "string" && systemCalculations.length === 0) {
        errors.push(`${at}.system does not match any supplied calculation`);
      }
      if (typeof claim.calculation_facts_hash !== "string" || !/^[a-f0-9]{64}$/.test(claim.calculation_facts_hash)) {
        errors.push(`${at}.calculation_facts_hash must bind the claim to one supplied calculation`);
      }
      const profileCalculations = systemCalculations.filter((item) => profileMatches(claim.profile, item.profile));
      const matchingCalculations = profileCalculations.filter(
        (item) => item.facts_hash === claim.calculation_facts_hash,
      );
      const matchingCalculation = matchingCalculations.length === 1 ? matchingCalculations[0] : null;
      if (systemCalculations.length > 0 && claim.profile != null && profileCalculations.length === 0) {
        errors.push(`${at}.profile does not match a supplied calculation for the declared system`);
      } else if (profileCalculations.length > 0 && matchingCalculations.length !== 1) {
        errors.push(`${at}.calculation_facts_hash does not match exactly one supplied calculation`);
      }
      const factIds = Array.isArray(claim.fact_ids) ? claim.fact_ids : [];
      const ruleIds = Array.isArray(claim.rule_ids) ? claim.rule_ids : [];
      const sourceIds = Array.isArray(claim.source_ids) ? claim.source_ids : [];
      if (!Array.isArray(claim.fact_ids)) errors.push(`${at}.fact_ids must be an array`);
      if (!Array.isArray(claim.rule_ids)) errors.push(`${at}.rule_ids must be an array`);
      if (!CALCULATION_CERTAINTY.has(claim.calculation_certainty)) errors.push(`${at}.calculation_certainty is invalid`);
      if (!claim.input_sensitivity || !SENSITIVITY_LABELS.has(claim.input_sensitivity.label)) {
        errors.push(`${at}.input_sensitivity.label is invalid`);
      }
      if (claim.input_sensitivity && typeof claim.input_sensitivity === "object") {
        const extraSensitivity = Object.keys(claim.input_sensitivity).filter((key) => !["label", "coverage"].includes(key));
        if (extraSensitivity.length) errors.push(`${at}.input_sensitivity contains ${extraSensitivity.length} unknown field(s)`);
      }
      if (claim.input_sensitivity && !Object.hasOwn(claim.input_sensitivity, "coverage")) {
        errors.push(`${at}.input_sensitivity.coverage is required`);
      }
      if (!SCHOOL_STABILITY.has(claim.school_stability)) errors.push(`${at}.school_stability is invalid`);
      if (!SOURCE_STATUS.has(claim.source_status)) errors.push(`${at}.source_status is invalid`);
      if (!Array.isArray(claim.source_ids)) errors.push(`${at}.source_ids must be an array`);
      for (const [field, values] of [["fact_ids", factIds], ["rule_ids", ruleIds], ["source_ids", sourceIds]]) {
        if (new Set(values).size !== values.length) errors.push(`${at}.${field} contains duplicates`);
        if (values.some((value) => typeof value !== "string")) errors.push(`${at}.${field} entries must be strings`);
      }
      for (const field of ["alternative_readings"]) {
        if (
          claim[field] != null
          && (!Array.isArray(claim[field]) || claim[field].some((item) => typeof item !== "string" || !item.trim()))
        ) {
          errors.push(`${at}.${field} must be an array of non-empty strings`);
        }
      }
      for (const field of ["scope", "reasoning_summary"]) {
        if (claim[field] != null && typeof claim[field] !== "string") errors.push(`${at}.${field} must be a string`);
      }
      if (claim.practical_reflection != null && typeof claim.practical_reflection !== "string") {
        errors.push(`${at}.practical_reflection must be a string or null`);
      }
      if (
        claim.epistemic_status === "unresolved"
      ) {
        const expectedUnresolved = canonicalUnresolvedNarrative(claim);
        for (const field of ["statement", "reasoning_summary", "alternative_readings", "practical_reflection"]) {
          if (!isDeepStrictEqual(claim[field], expectedUnresolved[field])) {
            errors.push(`${at}.${field} must equal the canonical unresolved rendering`);
          }
        }
        for (const field of [
          "assessment", "interpretation_profile_id", "rule_pack_hash", "meaning_binding",
          "semantic_bindings", "technical_summary",
        ]) {
          if (Object.hasOwn(claim, field)) errors.push(`${at}.${field} is not allowed for an unresolved claim`);
        }
      }
      if (DEEP_LEVELS.has(reading.level)) {
        if (typeof claim.reasoning_summary !== "string" || !claim.reasoning_summary.trim()) {
          errors.push(`${at}.reasoning_summary is required for reading.level=${reading.level}`);
        }
        if (!Array.isArray(claim.alternative_readings) || claim.alternative_readings.length === 0) {
          errors.push(`${at}.alternative_readings must be non-empty for reading.level=${reading.level}`);
        }
      }
      if (claim.epistemic_status === "calculation_fact" && factIds.length === 0) errors.push(`${at} calculation_fact requires fact_ids`);
      if (claim.epistemic_status === "interpretation" && factIds.length === 0) errors.push(`${at} interpretation requires fact_ids`);
      for (const id of factIds) {
        if (
          typeof id === "string"
          && matchingCalculation
          && !collectFactIds(matchingCalculation.facts).has(id)
          && !hasJsonPointer(matchingCalculation, id)
        ) {
          errors.push(`${at} cites an unknown fact_id`);
        }
      }
      const factReferences = matchingCalculation ? collectFactReferences(matchingCalculation.facts) : new Map();
      const citedFactPaths = factIds
        .map((id) => claimedFactPath(id, factReferences, matchingCalculation))
        .filter((path) => typeof path === "string");
      const evidenceBindings = Array.isArray(claim.evidence_bindings) ? claim.evidence_bindings : [];
      if (!Array.isArray(claim.evidence_bindings)) {
        errors.push(`${at}.evidence_bindings must be an array`);
      } else {
        const bindingKeys = new Set(["ref", "path", "value_hash", "role"]);
        const seenRefs = new Set();
        evidenceBindings.forEach((binding, bindingIndex) => {
          const bindingAt = `${at}.evidence_bindings[${bindingIndex}]`;
          if (!binding || typeof binding !== "object" || Array.isArray(binding)) {
            errors.push(`${bindingAt} must be an object`);
            return;
          }
          const unknown = Object.keys(binding).filter((key) => !bindingKeys.has(key));
          if (unknown.length) errors.push(`${bindingAt} contains ${unknown.length} unknown field(s)`);
          if (typeof binding.ref !== "string") errors.push(`${bindingAt}.ref must be a string`);
          if (typeof binding.path !== "string" || !binding.path.startsWith("/facts/")) {
            errors.push(`${bindingAt}.path must be an exact /facts JSON pointer`);
          }
          if (typeof binding.value_hash !== "string" || !/^[a-f0-9]{64}$/.test(binding.value_hash)) {
            errors.push(`${bindingAt}.value_hash must be a lowercase SHA-256 value`);
          }
          if (!EVIDENCE_ROLES.has(binding.role)) errors.push(`${bindingAt}.role is invalid`);
          if (seenRefs.has(binding.ref)) errors.push(`${bindingAt}.ref is duplicated`);
          if (typeof binding.ref === "string") seenRefs.add(binding.ref);
          if (!matchingCalculation || typeof binding.ref !== "string") return;
          const expectedPath = claimedFactPath(binding.ref, factReferences, matchingCalculation);
          if (!expectedPath || binding.path !== expectedPath) {
            errors.push(`${bindingAt}.path does not match the cited fact reference`);
            return;
          }
          const observed = valueAtFactPath(matchingCalculation, expectedPath);
          const expectedHash = observed.found
            ? factValueHash(matchingCalculation, binding.ref, expectedPath, observed.value)
            : null;
          if (!expectedHash || binding.value_hash !== expectedHash) {
            errors.push(`${bindingAt}.value_hash does not match the cited fact value`);
          }
        });
        const expectedRefs = [...factIds].sort();
        const observedRefs = [...seenRefs].sort();
        if (stableJson(expectedRefs) !== stableJson(observedRefs)) {
          errors.push(`${at}.evidence_bindings refs must match fact_ids exactly`);
        }
      }
      const broadContainers = broadFactContainerPaths(citedFactPaths, factReferences);
      if (broadContainers.length) {
        errors.push(`${at} cites ${broadContainers.length} broad fact container(s); cite individual fact IDs or one exact fact object`);
      }
      const factPaths = canonicalFactPaths(citedFactPaths, factReferences);
      if (matchingCalculation && factIds.length > 0) {
        const semanticValidation = validateClaimSemantics(claim, matchingCalculation, factIds);
        errors.push(...semanticValidation.errors.map((error) => `${at} ${error}`));
      }
      const identifiedFactRoots = new Set(factReferences.values());
      const knownRules = [];
      const applicableRules = [];
      for (const id of ruleIds) {
        if (typeof id !== "string") continue;
        const rule = getRuleById(id);
        if (!rule) {
          errors.push(`${at} cites an unknown rule_id`);
          continue;
        }
        knownRules.push(rule);
        let ruleApplicable = matchingCalculation != null;
        if (rule.system !== claim.system) {
          ruleApplicable = false;
          errors.push(`${at} cites a rule_id for a different system`);
        }
        if (typeof claim.scope !== "string" || !claim.scope.trim()) {
          ruleApplicable = false;
          errors.push(`${at}.scope is required when rule_ids are cited`);
        } else if (!rule.allowed_scopes.includes(claim.scope)) {
          ruleApplicable = false;
          errors.push(`${at}.scope is not allowed by rule ${rule.id}`);
        }
        if (!rule.permitted_epistemic_status.includes(claim.epistemic_status)) {
          ruleApplicable = false;
          errors.push(`${at}.epistemic_status exceeds rule ${rule.id} interpretation ceiling`);
        }
        if (
          claim.epistemic_status === "interpretation"
          && !rule.allowed_assessment_modes.includes(claim.assessment?.mode)
        ) {
          ruleApplicable = false;
          errors.push(`${at}.assessment.mode is not allowed by rule ${rule.id}`);
        }
        const applicableFacts = factPaths.filter((path) => ruleCoversMaterialPath(rule, path, identifiedFactRoots));
        if (applicableFacts.length < rule.minimum_fact_references) {
          ruleApplicable = false;
          errors.push(`${at} rule ${rule.id} requires ${rule.minimum_fact_references} cited fact(s) under an allowed fact prefix`);
        }
        if (rule.required_fact_groups) {
          rule.required_fact_groups.forEach((group, groupIndex) => {
            const hasGroupFact = applicableFacts.some((path) => group.some((prefix) => pathMatchesPrefix(path, prefix)));
            if (!hasGroupFact) {
              ruleApplicable = false;
              errors.push(`${at} rule ${rule.id} is missing a cited fact for required fact group ${groupIndex + 1}`);
            }
          });
        }
        if (rule.required_fact_values) {
          for (const requirement of rule.required_fact_values) {
            const cited = factPaths.some((path) => path === requirement.path);
            const observed = matchingCalculation
              ? valueAtFactPath(matchingCalculation, requirement.path)
              : { found: false, value: undefined };
            if (!cited || !observed.found || stableJson(observed.value) !== stableJson(requirement.equals)) {
              ruleApplicable = false;
              errors.push(`${at} rule ${rule.id} requires cited ${requirement.path} to equal ${stableJson(requirement.equals)}`);
            }
          }
        }
        const missingRuleSources = rule.source_ids.filter((sourceId) => !sourceIds.includes(sourceId));
        if (missingRuleSources.length) {
          ruleApplicable = false;
          errors.push(`${at} is missing ${missingRuleSources.length} source(s) required by rule ${rule.id}`);
        }
        const topicErrorsBefore = errors.length;
        validateTopicUnitRule(claim, at, rule, matchingCalculation, factIds, errors);
        if (errors.length !== topicErrorsBefore) ruleApplicable = false;
        if (ruleApplicable) applicableRules.push(rule);
      }
      if (claim.epistemic_status === "interpretation" && applicableRules.length === 0) {
        errors.push(`${at} interpretation requires at least one applicable rule_id`);
      }
      if (claim.epistemic_status === "interpretation") {
        const interpretationProfile = getInterpretationProfileById(claim.interpretation_profile_id);
        if (!interpretationProfile) {
          errors.push(`${at}.interpretation_profile_id must name a registered interpretation profile`);
        } else {
          if (interpretationProfile.system !== claim.system) {
            errors.push(`${at}.interpretation_profile_id belongs to a different system`);
          }
          if (claim.rule_pack_hash !== interpretationProfile.rule_pack_hash) {
            errors.push(`${at}.rule_pack_hash does not match the registered interpretation profile`);
          }
          if (!interpretationProfile.allowed_calculation_profile_ids.includes(matchingCalculation?.profile?.id)) {
            errors.push(`${at}.interpretation_profile_id does not permit this custom or unreviewed calculation profile`);
          }
          if (!isCanonicalRegisteredProfile(claim.system, matchingCalculation?.profile)) {
            errors.push(`${at}.interpretation_profile_id requires the exact registered calculation profile, not a relabeled custom profile`);
          }
          const outsidePack = ruleIds.filter((ruleId) => !interpretationProfile.rule_ids.includes(ruleId));
          if (outsidePack.length) errors.push(`${at} cites rule_ids outside the selected interpretation rule pack`);
        }
        validateZiweiSemanticBindings(claim, at, matchingCalculation, factIds, errors);
      }
      const canonicalMeaningRules = applicableRules.filter((rule) => rule.canonical_narrative_required);
      if (claim.epistemic_status === "interpretation" && canonicalMeaningRules.length > 0) {
        const meaningValidation = validateZiweiMeaningBinding(
          claim.meaning_binding,
          claim,
          matchingCalculation,
          canonicalMeaningRules,
        );
        errors.push(...meaningValidation.errors.map((error) => `${at}.meaning_binding ${error}`));
        if (meaningValidation.expected_binding) {
          const signature = ziweiMeaningSignature(claim, meaningValidation.expected_binding);
          if (meaningSignatures.has(signature)) {
            errors.push(`${at}.meaning_binding duplicates an existing closed Zi Wei meaning claim`);
          } else meaningSignatures.add(signature);
        }
      } else if (Object.hasOwn(claim, "meaning_binding")) {
        errors.push(`${at}.meaning_binding is allowed only for an applicable closed Zi Wei interpretation rule`);
      }
      const materialFactPaths = factPaths.filter((path) => knownRules.some((rule) =>
        rule.system === claim.system && ruleCoversMaterialPath(rule, path, identifiedFactRoots)));
      if (
        DEEP_LEVELS.has(reading.level)
        && ["traditional_rule", "interpretation"].includes(claim.epistemic_status)
        && materialFactPaths.length < 2
      ) {
        errors.push(`${at} deep interpretive claims require at least two distinct material fact roots; aliases, metadata, and containers do not count`);
      }
      if (knownRules.length) {
        const uncoveredFactPaths = factPaths.filter((path) => !knownRules.some((rule) =>
          rule.system === claim.system && ruleCoversMaterialPath(rule, path, identifiedFactRoots)));
        if (uncoveredFactPaths.length) {
          errors.push(`${at} cites ${uncoveredFactPaths.length} fact(s) not covered by any cited rule`);
        }
      }
      const knownSources = [];
      for (const id of sourceIds) {
        if (typeof id !== "string") continue;
        const source = getSourceById(id);
        if (!source) {
          errors.push(`${at} cites an unknown source_id`);
          continue;
        }
        knownSources.push(source);
        if (!source.systems.includes(claim.system)) errors.push(`${at} cites a source_id for a different system`);
        if (knownRules.length && !knownRules.some((rule) => source.supported_rule_ids.includes(rule.id))) {
          errors.push(`${at} cites a source_id that does not support any cited rule`);
        }
      }
      if (claim.source_status === "verified" && knownSources.length === 0) {
        errors.push(`${at}.source_status=verified requires at least one known source_id`);
      }
      if (["engine_documented", "unavailable"].includes(claim.source_status) && sourceIds.length > 0) {
        errors.push(`${at}.source_status=${claim.source_status} cannot cite external source_ids`);
      }
      if (knownRules.some((rule) => rule.source_ids.length > 0) && !["verified", "disputed"].includes(claim.source_status)) {
        errors.push(`${at} source-backed rule_ids require source_status=verified or disputed`);
      }
      if (
        DEEP_LEVELS.has(reading.level)
        && ["traditional_rule", "interpretation"].includes(claim.epistemic_status)
        && !applicableRules.some((rule) => rule.source_ids.length > 0)
      ) {
        errors.push(`${at} deep interpretive claims require at least one source-backed applicable rule`);
      }
      if (DEEP_LEVELS.has(reading.level) && claim.epistemic_status === "interpretation") {
        const roles = new Set(evidenceBindings.map((binding) => binding?.role));
        if (!roles.has("support") || !roles.has("constraint")) {
          errors.push(`${at} deep interpretation requires both support and constraint evidence roles`);
        }
      }
      if (claim.epistemic_status === "traditional_rule" && ruleIds.length === 0) {
        errors.push(`${at} traditional_rule requires rule_ids`);
      }
      if (claim.calculation_certainty === "high" && matchingCalculation?.warnings?.length) {
        warnings.push(`${at} claims high calculation certainty although the calculation has warnings`);
      }
      if (warningCodes(matchingCalculation).includes("CALENDAR_DAY_PROFILE_QUALIFIED")) {
        if (claim.calculation_certainty !== "qualified") {
          errors.push(`${at}.calculation_certainty must be qualified for CALENDAR_DAY_PROFILE_QUALIFIED`);
        }
        if (claim.school_stability !== "profile_specific") {
          errors.push(`${at}.school_stability must be profile_specific for CALENDAR_DAY_PROFILE_QUALIFIED`);
        }
      }
      const coverage = claim.input_sensitivity?.coverage;
      const sensitivityLabel = claim.input_sensitivity?.label;
      const expectedTotal = sensitivityTotal(matchingCalculation);
      const expectedSensitivity = matchingCalculation
        ? derivedInputSensitivity(matchingCalculation, factIds)
        : null;
      if (expectedSensitivity && stableJson(claim.input_sensitivity) !== stableJson(expectedSensitivity)) {
        errors.push(`${at}.input_sensitivity must be mechanically derived from the cited facts`);
      }
      if (coverage !== null && coverage !== undefined && typeof coverage !== "string") {
        errors.push(`${at}.input_sensitivity.coverage must use n/N or null`);
      } else if (typeof coverage === "string" && !/^\d+\/\d+$/.test(coverage)) {
        errors.push(`${at}.input_sensitivity.coverage must use n/N or null`);
      } else if (typeof coverage === "string") {
        const [numerator, denominator] = coverage.split("/").map(Number);
        if (denominator <= 0 || numerator < 0 || numerator > denominator) {
          errors.push(`${at}.input_sensitivity.coverage must satisfy 0 <= n <= N and N > 0`);
        }
        if (expectedTotal == null) {
          errors.push(`${at}.input_sensitivity.coverage is not allowed without a candidate or sample total`);
        } else if (denominator !== expectedTotal) {
          errors.push(`${at}.input_sensitivity.coverage denominator must equal ${expectedTotal}`);
        }
        if (sensitivityLabel === "stable" && numerator !== denominator) {
          errors.push(`${at} stable coverage must include every candidate`);
        }
      } else if (expectedTotal != null && sensitivityLabel !== "unavailable") {
        errors.push(`${at} input sensitivity requires n/N coverage for ${expectedTotal} candidates or samples`);
      } else if (sensitivityLabel === "partly_stable") {
        errors.push(`${at} partly_stable sensitivity requires n/N coverage`);
      }
    }
  }

  if (
    typeof reading?.summary === "string"
    && typeof claims?.[0]?.statement === "string"
    && normalizeVisibleText(reading.summary) !== normalizeVisibleText(claims[0].statement)
  ) {
    errors.push("reading.summary must equal the first claim statement after text normalization");
  }

  if (includesForbiddenProbability(reading)) errors.push("reading contains a forbidden predictive probability field");
  if (containsForbiddenVoteKey(reading?.cross_system)) {
    errors.push("cross-system voting or a declared winner is not allowed");
  }
  validateVisibleReadingText(reading, calculations, errors);
  for (const category of lexicalSafetyCategories(reading)) {
    errors.push(`reading text triggered lexical safety gate: ${category}`);
  }
  return { valid: errors.length === 0, errors, warnings, fact_ids_available: [...availableFacts].sort() };
}
