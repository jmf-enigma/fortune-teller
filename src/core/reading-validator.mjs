import { stableJson } from "./hash.mjs";
import { CALCULATION_SYSTEMS, isPlainJsonValue, verifyCalculationEnvelope } from "./result.mjs";
import { getRuleById } from "../data/rule-registry.mjs";
import { getSourceById } from "../data/source-registry.mjs";

const SUPPORTED_SYSTEMS = new Set(CALCULATION_SYSTEMS);
const CLAIM_STATUSES = new Set(["calculation_fact", "traditional_rule", "interpretation", "unresolved"]);
const CALCULATION_CERTAINTY = new Set(["high", "qualified", "unavailable"]);
const SENSITIVITY_LABELS = new Set(["stable", "partly_stable", "boundary_sensitive", "unavailable"]);
const SCHOOL_STABILITY = new Set(["stable", "profile_specific", "disputed", "not_assessed"]);
const SOURCE_STATUS = new Set(["verified", "engine_documented", "unavailable", "disputed"]);
const CLAIM_TOPICS = new Set([
  "overview", "current_situation", "decision", "career_study", "wealth_resources",
  "relationships", "family_social", "wellbeing_rhythm", "life_stage", "other",
]);
const DEEP_LEVELS = new Set(["deep", "audit"]);
const STRUCTURED_NEXT_STEP_LEVELS = new Set(["standard", "deep", "audit"]);
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
const FRESH_DRAW_LABEL_PATTERN = /(?:新(?:的)?问题|换(?:个|一个|另一个)?问题|改问|换(?:个|一个)?主题|另一件事|换(?:一)?组牌|另(?:问一题|起一卦)|重新(?:抽(?:一?(?:张|组|副|次))?牌|起(?:一)?卦|提问|占问)|再(?:抽(?:一?(?:张|组|副|次))?牌|起(?:一)?卦)|\b(?:new|another|different)\s+(?:question|draw|cast)\b|\b(?:re[- ]?draw|recast)\b|\b(?:draw|cast)\s+again\b)/iu;
const EXPLICIT_UNRESOLVED_PATTERN = /(?:不确定|无法判断|不能判断|尚不能判断|暂时不能判断|无法确定|不能确定|无法确认|不能确认|信息不足|证据不足|资料不足|不可判断)|\b(?:uncertain|unknown|unresolved|cannot determine|can't determine|cannot conclude|can't conclude|insufficient (?:information|evidence)|not enough (?:information|evidence))\b/iu;
const NEGATED_UNRESOLVED_PATTERN = /\b(?:not|never)\s+(?:at\s+all\s+)?(?:uncertain|unknown|unresolved)\b|(?:并非|不是|并不|绝非)\s*(?:不确定|未知|未解决|无法判断|不能判断|无法确定|不能确定|无法确认|不能确认|信息不足|证据不足|资料不足|不可判断)/giu;
const FUTURE_CONTEXT_PATTERN = /(?:未来|今后|接下来|往后|之后|届时|明年|后年|明天|下(?:周|月|个月|季度|半年|一年)|第[零〇一二两三四五六七八九十百千万\d]+(?:个月|年)|\b20\d{2}年)|\b(?:future|tomorrow|next\s+(?:week|month|quarter|year)|within\s+\d+\s+(?:days?|weeks?|months?|years?)|in\s+\d+\s+(?:days?|weeks?|months?|years?)|(?:by|in)\s+20\d{2}|eventually)\b/iu;
const CHINESE_FUTURE_OUTCOME_SOURCE = "上升|上涨|增长|涨|下降|下跌|跌|增加|减少|改善|恶化|成功|失败|发生|出现|获得|得到|失去|结婚|分手|离职|入职|升职|晋升|发财|赚钱|盈利|亏损|康复|生病|怀孕|实现|成为|遇到|收到|拿到|继续|转变|改变|好转|结束|开始|变得";
const ENGLISH_FUTURE_OUTCOME_SOURCE = "rise|grow|increase|decrease|decline|improve|worsen|succeed|fail|happen|occur|receive|obtain|lose|marry|separate|resign|join|promote|profit|earn|recover|become|change|continue|start|end";
const FUTURE_OUTCOME_PATTERN = new RegExp(`(?:${CHINESE_FUTURE_OUTCOME_SOURCE})|\\b(?:${ENGLISH_FUTURE_OUTCOME_SOURCE})(?:s|d|ed|ing)?\\b`, "iu");
const FUTURE_ASSERTION_PATTERN = new RegExp(
  `(?:(?:会|将)(?=.{0,3}(?:${CHINESE_FUTURE_OUTCOME_SOURCE}))|(?:必将|终将|肯定|一定|必然|必定|注定|预计|大概率|高概率)(?=.{0,24}(?:${CHINESE_FUTURE_OUTCOME_SOURCE}))|必(?=(?:${CHINESE_FUTURE_OUTCOME_SOURCE})))|\\b(?:will|shall)\\b|\\b(?:is|are|am)\\s+going\\s+to\\b|\\b(?:is|are)\\s+(?:certain|sure|bound)\\s+to\\b`,
  "iu",
);
const FUTURE_QUALIFIER_PATTERN = /(?:如果|假如|若(?:是|果)?|可能|也许|或许|未必|不一定|倾向于|有机会|取决于|视.{0,12}而定|在.{0,18}(?:前提|条件)下|不能(?:判断|确定|确认|保证|推断|说明)|无法(?:判断|确定|确认|保证|推断|说明)|不足以|不代表|不意味着|不保证|尚不确定|仍不确定|目前不确定)|\b(?:if|unless|may|might|could|possibly|perhaps|uncertain|unknown|unresolved|depends?\s+on|subject\s+to|cannot\s+(?:determine|conclude|confirm|guarantee|show)|can't\s+(?:determine|conclude|confirm|guarantee|show)|does\s+not\s+(?:mean|show|guarantee)|not\s+guaranteed|insufficient)\b/iu;

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

function containsUnconditionalFutureAssertion(value) {
  const text = normalizeVisibleText(value);
  if (!text) return false;
  const sentences = text.match(/[^。！？.!?]+[。！？.!?]?/gu) || [text];
  return sentences.some((sentence) => {
    if (/[?？]\s*$/u.test(sentence)) return false;
    const sentenceHasFutureContext = FUTURE_CONTEXT_PATTERN.test(sentence);
    const clauses = sentence
      .replace(/[。！？.!?]+\s*$/gu, "")
      .split(/[;；]|(?:，|,)?\s*(?:但(?:是)?|不过|然而)\s*|\b(?:but|however)\b/iu)
      .filter(Boolean);
    return clauses.some((clause) => {
      const assertion = FUTURE_ASSERTION_PATTERN.exec(clause);
      if ((!sentenceHasFutureContext && !FUTURE_CONTEXT_PATTERN.test(clause)) || !assertion) return false;
      return !FUTURE_QUALIFIER_PATTERN.test(clause.slice(0, assertion.index));
    });
  });
}

function containsFutureOutcomeLanguage(value) {
  const text = normalizeVisibleText(value);
  return Boolean(text && FUTURE_CONTEXT_PATTERN.test(text) && FUTURE_OUTCOME_PATTERN.test(text));
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
      else if (step?.available === true) add(`reading.next_steps[${index}].label`, step.label);
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
  const structured = STRUCTURED_NEXT_STEP_LEVELS.has(reading.level);
  const systems = Array.isArray(reading.system) ? reading.system : [reading.system];
  const multiSystem = systems.length > 1;
  if (deep && reading.next_steps.length === 0) errors.push(`reading.level=${reading.level} requires at least one structured next step`);
  const ids = new Set();
  reading.next_steps.forEach((step, index) => {
    const at = `reading.next_steps[${index}]`;
    if (typeof step === "string") {
      if (structured) errors.push(`${at} must be a structured object for reading.level=${reading.level}`);
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
    if (step.reason != null && (typeof step.reason !== "string" || !step.reason.trim())) errors.push(`${at}.reason must be a non-empty string`);
    if (step.available === false && (typeof step.reason !== "string" || !step.reason.trim())) {
      errors.push(`${at}.reason is required when available=false`);
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
  calculations.forEach((item, index) => {
    for (const error of verifyCalculationEnvelope(item)) errors.push(`calculations[${index}] ${error}`);
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
  if (!reading || typeof reading !== "object" || Array.isArray(reading)) errors.push("reading is required");
  const claims = reading?.claims;
  const readingKeys = new Set([
    "system", "level", "title", "user_focus", "disclaimer", "summary", "claims", "uncertainty_summary",
    "warning_acknowledgements", "cross_system", "next_steps",
  ]);
  if (reading && typeof reading === "object") {
    const unknownReadingKeys = Object.keys(reading).filter((key) => !readingKeys.has(key));
    if (unknownReadingKeys.length) errors.push(`reading contains ${unknownReadingKeys.length} unknown field(s)`);
    if (typeof reading.system !== "string" && !Array.isArray(reading.system)) errors.push("reading.system is required");
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
    for (const field of ["title", "user_focus"]) {
      if (Object.hasOwn(reading, field) && (typeof reading[field] !== "string" || !reading[field].trim())) {
        errors.push(`reading.${field} must be a non-empty string`);
      }
    }
    if (typeof reading.disclaimer !== "string" || !reading.disclaimer.trim()) errors.push("reading.disclaimer is required");
    if (typeof reading.summary !== "string" || !reading.summary.trim()) {
      errors.push("reading.summary must be a non-empty string");
    }
    if (Object.hasOwn(reading, "uncertainty_summary") && typeof reading.uncertainty_summary !== "string") {
      errors.push("reading.uncertainty_summary must be a string");
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
    if (
      Object.hasOwn(reading, "cross_system")
      && (!reading.cross_system || typeof reading.cross_system !== "object" || Array.isArray(reading.cross_system))
    ) {
      errors.push("reading.cross_system must be an object");
    }
    if (!Array.isArray(reading.next_steps)) errors.push("reading.next_steps must be an array");
    if (DEEP_LEVELS.has(reading.level)) {
      if (typeof reading.uncertainty_summary !== "string" || !reading.uncertainty_summary.trim()) {
        errors.push(`reading.level=${reading.level} requires a non-empty uncertainty_summary`);
      }
    }
    const requiredWarningCodes = [...new Set(calculations.flatMap(warningCodes))];
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
  for (const item of calculations) collectFactIds(item?.facts, availableFacts);
  const claimIds = new Set();

  if (Array.isArray(claims)) {
    for (const [index, claim] of claims.entries()) {
      const at = `reading.claims[${index}]`;
      if (!claim || typeof claim !== "object") {
        errors.push(`${at} must be an object`);
        continue;
      }
      const claimKeys = new Set([
        "claim_id", "statement", "topic", "epistemic_status", "system", "profile", "scope", "fact_ids", "rule_ids",
        "reasoning_summary", "dependencies", "calculation_certainty", "input_sensitivity", "school_stability",
        "source_status", "source_ids", "alternative_readings", "practical_reflection",
      ]);
      const unknownClaimKeys = Object.keys(claim).filter((key) => !claimKeys.has(key));
      if (unknownClaimKeys.length) errors.push(`${at} contains ${unknownClaimKeys.length} unknown field(s)`);
      if (typeof claim.claim_id !== "string" || !claim.claim_id) errors.push(`${at}.claim_id is required`);
      else if (!/^C-[A-Za-z0-9_-]+$/.test(claim.claim_id)) errors.push(`${at}.claim_id has an invalid format`);
      else if (claimIds.has(claim.claim_id)) errors.push(`${at}.claim_id is duplicated`);
      else claimIds.add(claim.claim_id);
      if (typeof claim.statement !== "string" || !claim.statement.trim()) errors.push(`${at}.statement is required`);
      if (claim.epistemic_status === "calculation_fact" && containsFutureOutcomeLanguage(claim.statement)) {
        errors.push(`${at}.statement classified as calculation_fact cannot state a future outcome`);
      }
      if (Object.hasOwn(claim, "topic") && !CLAIM_TOPICS.has(claim.topic)) errors.push(`${at}.topic is invalid`);
      if (!CLAIM_STATUSES.has(claim.epistemic_status)) errors.push(`${at}.epistemic_status is invalid`);
      if (typeof claim.system !== "string" || !claim.system) errors.push(`${at}.system is required`);
      else if (!SUPPORTED_SYSTEMS.has(claim.system)) errors.push(`${at}.system is unsupported`);
      if (claim.profile == null || (typeof claim.profile !== "string" && (typeof claim.profile !== "object" || Array.isArray(claim.profile)))) {
        errors.push(`${at}.profile must be a string or object`);
      }
      const systemCalculations = calculations.filter((item) => item?.system === claim.system);
      if (typeof claim.system === "string" && systemCalculations.length === 0) {
        errors.push(`${at}.system does not match any supplied calculation`);
      }
      const matchingCalculation = systemCalculations.find((item) => profileMatches(claim.profile, item.profile));
      if (systemCalculations.length > 0 && claim.profile != null && !matchingCalculation) {
        errors.push(`${at}.profile does not match a supplied calculation for the declared system`);
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
      for (const field of ["dependencies", "alternative_readings"]) {
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
        && typeof claim.statement === "string"
        && !explicitlyStatesUncertainty(claim.statement)
      ) {
        errors.push(`${at}.statement must explicitly say that the point is uncertain or cannot be determined`);
      }
      if (
        claim.epistemic_status === "unresolved"
        && containsFutureOutcomeLanguage(claim.statement)
        && !/(?:是否|能否|会不会)|\bwhether\b/iu.test(normalizeVisibleText(claim.statement))
      ) {
        errors.push(`${at}.statement with future outcome language must frame it as an unresolved whether question`);
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
      const broadContainers = broadFactContainerPaths(citedFactPaths, factReferences);
      if (broadContainers.length) {
        errors.push(`${at} cites ${broadContainers.length} broad fact container(s); cite individual fact IDs or one exact fact object`);
      }
      const factPaths = canonicalFactPaths(citedFactPaths, factReferences);
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
        if (ruleApplicable) applicableRules.push(rule);
      }
      if (claim.epistemic_status === "interpretation" && applicableRules.length === 0) {
        errors.push(`${at} interpretation requires at least one applicable rule_id`);
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
