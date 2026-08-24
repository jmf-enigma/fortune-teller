#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { asFortuneTellerError, FortuneTellerError } from "../src/core/errors.mjs";

let calculate;
let adjudicate;
let adjudicateBazi;
let recommendMethods;
let METHODS;
let validateReading;
let bindReadingToCalculations;
let freezeBlindCheck;
let scoreBlindCheck;
let verifyBlindCheckReading;
let verifyBlindCheckRecord;
let RULES;
let SOURCES;
let INTERPRETATION_PROFILES;
let SOURCE_VERIFICATION_NOTE;
let normalizeBirthInput;
let resolveCalculationTime;
let civilDayBounds;

async function ensureFortuneTellerLoaded() {
  if (
    calculate && adjudicate && adjudicateBazi && recommendMethods && METHODS && validateReading && bindReadingToCalculations
    && freezeBlindCheck && scoreBlindCheck && verifyBlindCheckReading && verifyBlindCheckRecord
    && RULES && SOURCES && INTERPRETATION_PROFILES && SOURCE_VERIFICATION_NOTE
    && normalizeBirthInput && resolveCalculationTime && civilDayBounds
  ) return;
  try {
    const [api, time] = await Promise.all([
      import("../src/index.mjs"),
      import("../src/core/time.mjs"),
    ]);
    ({
      calculate,
      adjudicate,
      adjudicateBazi,
      recommendMethods,
      METHODS,
      validateReading,
      bindReadingToCalculations,
      freezeBlindCheck,
      scoreBlindCheck,
      verifyBlindCheckReading,
      verifyBlindCheckRecord,
      RULES,
      SOURCES,
      INTERPRETATION_PROFILES,
      SOURCE_VERIFICATION_NOTE,
    } = api);
    ({ normalizeBirthInput, resolveCalculationTime, civilDayBounds } = time);
  } catch (error) {
    throw new FortuneTellerError(
      "DEPENDENCY_LOAD_FAILED",
      "could not load the local calculation engines; run npm ci --ignore-scripts in the Skill directory",
      { cause: error?.code || error?.name || "unknown" },
    );
  }
}

function parseArgs(values) {
  const parsed = Object.create(null);
  parsed._ = [];
  const seen = new Set();
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) {
      parsed._.push(value);
      continue;
    }
    const flag = value.slice(2);
    const separator = flag.indexOf("=");
    const rawKey = separator === -1 ? flag : flag.slice(0, separator);
    const inline = separator === -1 ? undefined : flag.slice(separator + 1);
    if (!rawKey || rawKey === "_") {
      throw new FortuneTellerError("INVALID_COMMAND_ARGUMENT", "invalid command flag name");
    }
    if (seen.has(rawKey)) {
      throw new FortuneTellerError("INVALID_COMMAND_ARGUMENT", "a command flag may be supplied only once");
    }
    seen.add(rawKey);
    if (inline !== undefined) parsed[rawKey] = inline;
    else if (values[index + 1] && !values[index + 1].startsWith("--")) parsed[rawKey] = values[++index];
    else parsed[rawKey] = true;
  }
  return parsed;
}

function validateCommandArgs(command, args) {
  const allowedByCommand = new Map([
    ["methods", new Set(["_", "json", "output", "compact", "pretty", "help"])],
    ["sources", new Set(["_", "system", "output", "compact", "pretty", "help"])],
    ["route", new Set(["_", "input", "json", "output", "compact", "pretty", "help"])],
    ["calculate", new Set(["_", "system", "input", "json", "profile", "output", "compact", "pretty", "help"])],
    ["adjudicate", new Set(["_", "input", "json", "output", "compact", "pretty", "help"])],
    ["adjudicate-bazi", new Set(["_", "input", "json", "output", "compact", "pretty", "help"])],
    ["validate-reading", new Set(["_", "input", "json", "output", "compact", "pretty", "help"])],
    ["bind-reading", new Set(["_", "input", "json", "output", "compact", "pretty", "help"])],
    ["render-reading", new Set(["_", "input", "json", "output", "help"])],
    ["freeze-check", new Set(["_", "input", "json", "reading", "claim-ids", "output", "compact", "pretty", "help"])],
    ["verify-check", new Set(["_", "input", "json", "record", "reading", "output", "compact", "pretty", "help"])],
    ["score-check", new Set(["_", "input", "json", "record", "reading", "adjudications", "output", "compact", "pretty", "help"])],
    ["interactive", new Set(["_", "help"])],
  ]);
  const allowed = allowedByCommand.get(command);
  if (!allowed) throw new FortuneTellerError("UNKNOWN_COMMAND", "unknown command");
  const unknown = Object.keys(args).filter((key) => !allowed.has(key));
  if (unknown.length) throw new FortuneTellerError("INVALID_COMMAND_ARGUMENT", `received ${unknown.length} unknown command flag(s)`);
  if (args._.length) {
    throw new FortuneTellerError("INVALID_COMMAND_ARGUMENT", `received ${args._.length} unexpected positional argument(s)`);
  }
  for (const key of ["input", "output", "profile", "system", "reading", "record", "adjudications", "claim-ids"]) {
    if (args[key] != null && typeof args[key] !== "string") {
      throw new FortuneTellerError("INVALID_COMMAND_ARGUMENT", `--${key} requires a value`);
    }
    if (typeof args[key] === "string" && args[key].length === 0) {
      throw new FortuneTellerError("INVALID_COMMAND_ARGUMENT", `--${key} requires a non-empty value`);
    }
  }
  for (const key of ["compact", "pretty", "help"]) {
    if (args[key] != null && args[key] !== true) {
      throw new FortuneTellerError("INVALID_COMMAND_ARGUMENT", `--${key} does not take a value`);
    }
  }
  if (!["methods", "sources"].includes(command) && args.json != null && typeof args.json !== "string") {
    throw new FortuneTellerError("INVALID_COMMAND_ARGUMENT", "--json requires an inline JSON value");
  }
  if (command === "methods" && args.json != null && args.json !== true) {
    throw new FortuneTellerError("INVALID_COMMAND_ARGUMENT", "methods --json does not take a value");
  }
  if (args.input != null && args.json != null) {
    throw new FortuneTellerError("INVALID_COMMAND_ARGUMENT", "use --input or --json, not both");
  }
  const splitInputs = {
    "freeze-check": ["reading", "claim-ids"],
    "verify-check": ["record", "reading"],
    "score-check": ["record", "reading", "adjudications"],
  }[command];
  if (splitInputs) {
    const supplied = splitInputs.filter((key) => args[key] != null);
    if (supplied.length && (args.input != null || args.json != null)) {
      throw new FortuneTellerError(
        "INVALID_COMMAND_ARGUMENT",
        `use --input/--json or the complete ${command} file set, not both`,
      );
    }
    if (supplied.length && supplied.length !== splitInputs.length) {
      throw new FortuneTellerError(
        "INVALID_COMMAND_ARGUMENT",
        `${command} split-file mode requires: ${splitInputs.map((key) => `--${key}`).join(", ")}`,
      );
    }
  }
  if (args.compact && args.pretty) {
    throw new FortuneTellerError("INVALID_COMMAND_ARGUMENT", "use --compact or --pretty, not both");
  }
}

async function readText(path) {
  if (path === "-") {
    const chunks = [];
    for await (const chunk of stdin) chunks.push(chunk);
    return Buffer.concat(chunks).toString("utf8");
  }
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    throw new FortuneTellerError(
      "INPUT_READ_FAILED",
      "could not read the requested JSON file",
      { cause: error?.code || "unknown" },
    );
  }
}

async function readJson(path, inline) {
  const text = inline != null ? inline : await readText(path || "-");
  try {
    return JSON.parse(text);
  } catch {
    throw new FortuneTellerError("INVALID_JSON", "could not parse JSON", { cause: "JSON_SYNTAX_ERROR" });
  }
}

async function emit(value, options = {}) {
  const text = `${JSON.stringify(value, null, options.compact ? 0 : 2)}\n`;
  if (!options.output) {
    stdout.write(text);
    return;
  }
  try {
    await writeFile(options.output, text, { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if (error?.code === "EEXIST") throw new FortuneTellerError("OUTPUT_EXISTS", "refusing to overwrite the existing output file");
    throw new FortuneTellerError("OUTPUT_WRITE_FAILED", "could not create the requested output file", { cause: error?.code || "unknown" });
  }
}

async function emitText(value, options = {}) {
  const output = value.endsWith("\n") ? value : `${value}\n`;
  if (!options.output) {
    stdout.write(output);
    return;
  }
  try {
    await writeFile(options.output, output, { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if (error?.code === "EEXIST") throw new FortuneTellerError("OUTPUT_EXISTS", "refusing to overwrite the existing output file");
    throw new FortuneTellerError("OUTPUT_WRITE_FAILED", "could not create the requested output file", { cause: error?.code || "unknown" });
  }
}

function printHelp() {
  stdout.write(`Fortune Teller\n\n`);
  stdout.write(`Commands:\n`);
  stdout.write(`  methods\n`);
  stdout.write(`  sources [--system <id>]\n`);
  stdout.write(`  route --input <goal-and-data-file|-> [--output <new-file>]\n`);
  stdout.write(`  calculate [--system <id>] --input <file|-> [--profile <file>] [--output <new-file>]\n`);
  stdout.write(`  adjudicate --input <calculation-file|-> [--output <new-file>]\n`);
  stdout.write(`  adjudicate-bazi --input <calculation-file|-> [--output <new-file>]\n`);
  stdout.write(`  validate-reading --input <file|->\n`);
  stdout.write(`  bind-reading --input <file|->\n`);
  stdout.write(`  render-reading --input <file|-> [--output <new-file>]\n`);
  stdout.write(`  freeze-check --reading <file> --claim-ids <id,id> [--output <new-file>]\n`);
  stdout.write(`  verify-check --record <file> --reading <file>\n`);
  stdout.write(`  score-check --record <file> --reading <file> --adjudications <file> [--output <new-file>]\n`);
  stdout.write(`  interactive\n`);
  stdout.write(`\nThe three blind-check commands also accept one composite --input file; use --json='{...}' for a small inline request.\n`);
  stdout.write(`For route, calculate, adjudicate, adjudicate-bazi, validate-reading, or bind-reading, use --json='{...}' instead of --input for a small inline request.\n`);
  stdout.write(`calculate also accepts system inside a request envelope, so --system is optional in that form.\n`);
}

function isPlainJsonObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const SYSTEM_LABELS = Object.freeze({
  bazi: "四柱八字",
  ziwei: "紫微斗数",
  western: "西洋本命盘",
  tarot: "塔罗",
  iching: "周易三钱",
  meihua: "梅花两数",
});

const PROFILE_LABELS = Object.freeze({
  "bazi-civil-midnight-consistent-v1": "民用时间、午夜换日（推荐）",
  "bazi-civil-zi-start-consistent-v1": "民用时间、23:00 子初换日（部分流派）",
  "ziwei-default-v1": "默认排盘口径（推荐）",
  "ziwei-zhongzhou-v1": "中州派口径（受限支持）",
  "western-tropical-whole-sign-v1": "热带黄道、整宫制",
  "tarot-rws-local-v1": "RWS 牌名、包含逆位（推荐）",
  "tarot-rws-upright-only-v1": "RWS 牌名、仅正位",
  "iching-three-coin-v1": "传统三钱法、六爻自下而上",
  "meihua-two-number-v1": "固定两数起卦（预览）",
});

const PROFILE_STATUS_LABELS = Object.freeze({
  stable: "稳定",
  qualified: "受限",
  experimental: "实验",
  preview: "预览",
});

const GOAL_LABELS = Object.freeze({
  life_overview: "人生整体与重要阶段",
  life_domain: "一个重点领域",
  current_question: "当前一件事或一个选择",
  explicit_method: "按指定方法查看",
});

const DOMAIN_LABELS = Object.freeze({
  career_study: "事业与学业",
  wealth_resources: "财富与资源",
  relationships: "感情与长期关系",
  family_social: "家庭与人际",
  wellbeing_rhythm: "身心节奏",
});

const PILLAR_LABELS_ZH = Object.freeze({ year: "年柱", month: "月柱", day: "日柱", time: "时柱" });
const ORIENTATION_LABELS_ZH = Object.freeze({ upright: "正位", reversed: "逆位" });
const MOTION_STATE_LABELS_ZH = Object.freeze({
  direct: "顺行",
  retrograde: "逆行",
  "stationary-or-uncertain": "停滞或方向不确定",
});
const ZIWEI_SENSITIVITY_LABELS_ZH = Object.freeze({
  soul_star: "命主星",
  body_star: "身主星",
  five_elements_class: "五行局",
  soul_palace_branch: "命宫地支",
  body_palace_branch: "身宫地支",
});
const RELATIONSHIP_LABELS_ZH = Object.freeze({
  stem_five_combination: "天干五合",
  branch_six_harmony: "地支六合",
  branch_clash: "地支相冲",
  branch_full_three_harmony: "地支三合齐全",
});
const TAROT_POSITION_LABELS_ZH = Object.freeze({
  focus: "核心提示",
  past: "过去",
  present: "现在",
  future: "未来视角",
  "option-a": "方案 A",
  "option-b": "方案 B",
  "decision-lens": "决策视角",
  situation: "现状",
  action: "可控行动",
  outcome: "结果视角",
  challenge: "挑战",
  foundation: "基础",
  "recent-past": "近期过去",
  possibility: "可能方向",
  "near-future": "近期未来视角",
  self: "自身位置",
  environment: "环境",
  "hopes-and-fears": "期待与担忧",
});

const TAROT_SPREADS = Object.freeze([
  { id: "one", label: "单张：一个核心提示", positions: ["focus"] },
  { id: "three", label: "三张：过去、现在、未来视角（推荐）", positions: ["past", "present", "future"] },
  { id: "decision", label: "决策：方案 A、方案 B、决策视角", positions: ["option-a", "option-b", "decision-lens"] },
  { id: "situation-action-outcome", label: "现状、行动、结果视角", positions: ["situation", "action", "outcome"] },
  {
    id: "celtic-cross",
    label: "凯尔特十字：十张深入展开",
    positions: ["present", "challenge", "foundation", "recent-past", "possibility", "near-future", "self", "environment", "hopes-and-fears", "outcome"],
  },
]);

const READING_TOPIC_LABELS = Object.freeze({
  overview: "整体重点",
  current_situation: "当前局面",
  decision: "决策重点",
  career_study: "事业与学业",
  wealth_resources: "财富与资源",
  relationships: "感情与关系",
  family_social: "家庭与人际",
  wellbeing_rhythm: "身心节奏",
  life_stage: "人生阶段",
  other: "其他重点",
});

const READING_TOPIC_ORDER = Object.freeze([
  "overview", "current_situation", "decision", "career_study", "wealth_resources",
  "relationships", "family_social", "wellbeing_rhythm", "life_stage", "other", "untagged",
]);

function compactText(value) {
  return typeof value === "string" ? value.replace(/\s+/gu, " ").trim() : "";
}

function readableSentenceBlock(value) {
  const normalized = compactText(value);
  const sentences = normalized.match(/[^。！？]+[。！？]?/gu)?.map((item) => item.trim()).filter(Boolean) || [];
  return sentences.length >= 3 ? sentences.map((sentence) => `- ${sentence}`).join("\n") : normalized;
}

function readableClauseBlock(value) {
  const normalized = compactText(value).replace(/。$/u, "");
  const clauses = normalized.split("；").map((item) => item.trim()).filter(Boolean);
  return clauses.length >= 3 ? clauses.map((clause) => `- ${clause}`).join("\n") : compactText(value);
}

function shortenText(value, maximum = 180) {
  const normalized = compactText(value);
  const characters = [...normalized];
  return characters.length <= maximum ? normalized : `${characters.slice(0, maximum - 1).join("")}…`;
}

const ORDINARY_READING_BACKSTAGE_PATTERNS = Object.freeze([
  {
    category: "audit_field",
    pattern: /\b(?:facts_hash|reproducibility_hash|engine_version|schema_version|library_version|warning_acknowledgements|calculation_certainty|input_sensitivity|school_stability|source_status|source_ids|fact_ids|rule_ids|profile_specific|engine_documented|not_assessed|partly_stable|boundary_sensitive|inspect_sensitivity|time_basis|fix_leap_month|calendar_day_basis|year_divide|horoscope_divide|age_divide|day_divide|aspect_orbs_degrees|coin_values|line_order|trigram_order|modulo_zero_maps_to_last|period_api|dependency_config_isolation|interpretation_included)\b/iu,
  },
  {
    category: "technical_key",
    pattern: /(?:\b(?:time_basis|fix_leap_month|calendar_day_basis|year_divide|horoscope_divide|age_divide|day_divide|aspect_orbs_degrees|coin_values|line_order|trigram_order|modulo_zero_maps_to_last|period_api|dependency_config_isolation|interpretation_included)\b|\b(?:node|icu|tzdb|library|temporal_polyfill|profile|meta)\s*[:=])/iu,
  },
  { category: "trace_id", pattern: /\b(?:F-[A-Z0-9_-]+|R-[A-Z0-9_-]+|SRC-[A-Z0-9_-]+)\b/u },
  { category: "hash_like_value", pattern: /\b[a-f0-9]{64}\b/iu },
  {
    category: "candidate_coverage",
    pattern: /(?:(?:candidate|sample|probe|coverage|候选|样本|扫描|覆盖).{0,12}\b\d+\/\d+\b|\b\d+\/\d+\b.{0,12}(?:candidate|sample|probe|coverage|候选|样本|扫描|覆盖)|\b(?:candidates?|samples?|probes?)\b.{0,16}\b\d+\b|\b\d+\b.{0,8}\b(?:candidates?|samples?|probes?)\b|(?:候选(?:盘|时段|时间|结果)?|探针|扫描点|样本)(?:数量|数|总数|共有|共|有|为|[:：]|\s|了){0,8}(?:\d+|[零〇一二两三四五六七八九十百千万]+)|(?:\d+|[零〇一二两三四五六七八九十百千万]+)\s*个?\s*(?:候选盘|候选时段|候选时间|候选结果|探针|扫描点|样本)|扫描(?:了|共|点数|数量|[:：]|\s){0,8}(?:\d+|[零〇一二两三四五六七八九十百千万]+)\s*(?:个点|点|次)?|后台\s*(?:共|一共|总共)?\s*(?:出了|生成(?:了)?|得到|产出(?:了)?)\s*(?:\d+|[零〇一二两三四五六七八九十百千万]+)\s*张盘)/iu,
  },
]);

function collectCompoundBackstageKeys(value, target = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectCompoundBackstageKeys(item, target));
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (/^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)+$/iu.test(key)) target.add(key.normalize("NFKC").toLowerCase());
      collectCompoundBackstageKeys(child, target);
    }
  }
  return target;
}

function containsBackstageToken(text, token) {
  const normalized = text.normalize("NFKC").toLowerCase();
  let index = normalized.indexOf(token);
  while (index !== -1) {
    const before = normalized[index - 1];
    const after = normalized[index + token.length];
    const tokenCharacter = /[a-z0-9._-]/u;
    if ((!before || !tokenCharacter.test(before)) && (!after || !tokenCharacter.test(after))) return true;
    index = normalized.indexOf(token, index + 1);
  }
  return false;
}

function ordinaryReadingPresentationIssues(payload, renderedText) {
  const readingWithoutUserFocus = { ...payload.reading, user_focus: undefined };
  const nonFocusRenderedText = renderReadingText(readingWithoutUserFocus);
  const issues = ORDINARY_READING_BACKSTAGE_PATTERNS
    .filter(({ pattern }) => pattern.test(nonFocusRenderedText))
    .map(({ category }) => category);
  const userFocus = compactText(payload?.reading?.user_focus);
  if (/\b(?:node|icu|tzdb|library|temporal_polyfill|profile|meta)\s*[:=]/iu.test(userFocus)) {
    issues.push("technical_key");
  }
  const calculations = Array.isArray(payload?.calculations)
    ? payload.calculations
    : payload?.calculation ? [payload.calculation] : [];
  const exactBackstageValues = calculations.flatMap((calculation) => [
    calculation?.profile?.id,
    calculation?.facts_hash,
    calculation?.reproducibility_hash,
    ...(Array.isArray(calculation?.warnings)
      ? calculation.warnings.flatMap((warning) => {
        if (typeof warning !== "string") return [];
        const code = /^([A-Z][A-Z0-9_]{2,})(?::|$)/u.exec(warning)?.[1];
        return [warning, code];
      })
      : []),
  ]).filter((value) => typeof value === "string" && value.length > 0);
  if (exactBackstageValues.some((value) => containsBackstageToken(renderedText, value.normalize("NFKC").toLowerCase()))) {
    issues.push("calculation_audit_value");
  }
  const technicalKeys = new Set();
  for (const calculation of calculations) {
    collectCompoundBackstageKeys(calculation?.profile, technicalKeys);
    collectCompoundBackstageKeys(calculation?.meta, technicalKeys);
    collectCompoundBackstageKeys(calculation?.sensitivity, technicalKeys);
  }
  if ([...technicalKeys].some((key) => containsBackstageToken(nonFocusRenderedText, key))) issues.push("calculation_technical_key");
  return [...new Set(issues)];
}

function renderReadingText(reading) {
  const sections = [];
  const readingSystems = Array.isArray(reading.system) ? reading.system : [reading.system];
  const multiSystem = readingSystems.length > 1;
  sections.push(compactText(reading.title) || "你的解读");

  const userFocus = compactText(reading.user_focus);
  if (userFocus) sections.push(`这次重点看：${userFocus}`);

  const summary = compactText(reading.summary);
  if (summary && !multiSystem) sections.push(`先说结论\n${readableSentenceBlock(summary)}`);
  if (multiSystem) {
    sections.push("综合说明\n各方法分别呈现，不合并投票，也不选胜者；相同之处只作为需要现实核对的共同主题。 ");
  }

  const timelineRows = [];
  for (const claim of reading.claims) {
    const phase = claim?.meaning_binding?.phase;
    const window = claim?.assessment?.window;
    if (window?.kind !== "bounded" || !window.start || !window.end) continue;
    const label = READING_TOPIC_LABELS[claim.topic] || "所问主题";
    const systemLabel = multiSystem ? `${SYSTEM_LABELS[claim.system] || claim.system}｜` : "";
    const target = phase?.requested_date ? `，目标日 ${phase.requested_date}` : "";
    const row = `- ${systemLabel}${label}：本命结构 → ${window.start} 至 ${window.end} 的阶段重点${target} → 区间结束后重新看下一阶段`;
    if (!timelineRows.includes(row)) timelineRows.push(row);
  }
  if (timelineRows.length) sections.push(`阶段时间轴\n${timelineRows.join("\n")}`);

  const renderTopicGroups = (systemClaims, system = null) => {
    const claimsByTopic = new Map();
    systemClaims.forEach(({ claim, index }) => {
      const topic = claim.topic || "untagged";
      if (!claimsByTopic.has(topic)) claimsByTopic.set(topic, []);
      claimsByTopic.get(topic).push({ claim, index });
    });
    const systemSections = [];
    if (system) {
      const first = systemClaims[0]?.claim;
      if (first) systemSections.push(`先说结论\n${readableSentenceBlock(compactText(first.statement))}`);
    }
    for (const topic of READING_TOPIC_ORDER) {
      const topicClaims = claimsByTopic.get(topic);
      if (!topicClaims?.length) continue;
      const cards = [];
      for (const { claim, index } of topicClaims) {
        const isSummaryClaim = !multiSystem
          && index === 0
          && compactText(claim.statement).normalize("NFKC") === summary.normalize("NFKC");
        const isSystemLead = multiSystem && claim === systemClaims[0]?.claim;
        const lines = [];
        if (!isSummaryClaim && !isSystemLead) lines.push(`结论：${compactText(claim.statement)}`);
        const reasoning = compactText(claim.reasoning_summary);
        if (reasoning) lines.push(`白话解读：\n${readableSentenceBlock(reasoning)}`);
        const technicalSummary = compactText(claim.technical_summary);
        if (technicalSummary) lines.push(`盘面依据（术语）：\n${readableClauseBlock(technicalSummary)}`);
        if (Array.isArray(claim.alternative_readings)) {
          const alternatives = claim.alternative_readings.map(compactText).filter(Boolean);
          if (alternatives.length) lines.push(`什么情况要改判：\n${alternatives.map((item) => `- ${item}`).join("\n")}`);
        }
        const reflection = compactText(claim.practical_reflection);
        if (reflection) lines.push(`现实提醒：${reflection}`);
        if (lines.length) cards.push(lines.join("\n"));
      }
      if (cards.length) systemSections.push(`${READING_TOPIC_LABELS[topic] || "解读重点"}\n${cards.join("\n\n")}`);
    }
    return systemSections;
  };
  if (multiSystem) {
    for (const system of readingSystems) {
      const systemClaims = reading.claims
        .map((claim, index) => ({ claim, index }))
        .filter(({ claim }) => claim.system === system);
      const systemSections = renderTopicGroups(systemClaims, system);
      if (systemSections.length) sections.push(`${SYSTEM_LABELS[system] || system}\n${systemSections.join("\n\n")}`);
    }
  } else {
    for (const block of renderTopicGroups(reading.claims.map((claim, index) => ({ claim, index })))) sections.push(block);
  }

  const realityChecks = [];
  if (reading.level === "audit") {
    for (const claim of reading.claims) {
      if (claim?.epistemic_status !== "interpretation" || !Array.isArray(claim?.assessment?.criteria)) continue;
      const topicLabel = READING_TOPIC_LABELS[claim.topic] || "这项判断";
      const label = multiSystem ? `${SYSTEM_LABELS[claim.system] || claim.system}｜${topicLabel}` : topicLabel;
      for (const criterion of claim.assessment.criteria) {
        const observable = compactText(criterion?.observable);
        if (!observable) continue;
        if (criterion.polarity === "supports") {
          realityChecks.push(`- ${label}｜比较贴合时：${observable}`);
        } else if (criterion.polarity === "contradicts") {
          realityChecks.push(`- ${label}｜需要改判时：${observable}`);
        } else if (criterion.polarity === "unclear") {
          realityChecks.push(`- ${label}｜资料还不够时：${observable}`);
        }
      }
    }
  }
  if (realityChecks.length) {
    sections.push(`怎么判断这条解读是否贴合\n${realityChecks.join("\n")}`);
  }

  const uncertainty = compactText(reading.uncertainty_summary);
  if (uncertainty) sections.push(`需要留意\n${uncertainty}`);

  const nextSteps = reading.next_steps
    .map((step) => {
      if (typeof step === "string") return compactText(step);
      if (step?.available !== true) return "";
      const label = compactText(step.label);
      return multiSystem && step.target_system
        ? `${SYSTEM_LABELS[step.target_system] || step.target_system}｜${label}` : label;
    })
    .filter(Boolean);
  if (nextSteps.length) {
    sections.push(`接下来可以看\n${nextSteps.map((label, index) => `${index + 1}. ${label}`).join("\n")}`);
  }

  const disclaimer = shortenText(reading.disclaimer);
  if (disclaimer) sections.push(disclaimer);
  return `${sections.join("\n\n")}\n`;
}

const QUIT_WORDS = new Set(["q", "quit", "退出"]);

class InteractiveQuit extends Error {}

function profileLabel(profile) {
  const id = typeof profile === "string" ? profile : profile?.id;
  return PROFILE_LABELS[id] || id || "默认口径";
}

function methodFor(system) {
  return METHODS.find((item) => item.id === system);
}

function defaultProfile(system) {
  return methodFor(system)?.profiles?.[0]?.id || {};
}

function isQuit(answer) {
  return QUIT_WORDS.has(answer.trim().toLowerCase());
}

async function ask(rl, prompt, { allowEmpty = false } = {}) {
  let answer;
  try {
    answer = (await rl.question(prompt)).trim();
  } catch (error) {
    if (error?.code === "ABORT_ERR" || error?.code === "ERR_USE_AFTER_CLOSE") throw new InteractiveQuit();
    throw error;
  }
  if (isQuit(answer)) throw new InteractiveQuit();
  if (!allowEmpty && !answer) return null;
  return answer;
}

async function askMenu(rl, prompt, choices, defaultValue = null) {
  const lookup = new Map(choices.map(({ keys, value }) => keys.map((key) => [key, value])).flat());
  while (true) {
    const answer = await ask(rl, prompt, { allowEmpty: defaultValue != null });
    if ((answer == null || answer === "") && defaultValue != null) return defaultValue;
    if (answer != null && lookup.has(answer.toLowerCase())) return lookup.get(answer.toLowerCase());
    stdout.write("没有识别这个选项，请按提示重新输入；随时输入 q 可退出。\n");
  }
}

async function askValidated(rl, prompt, validate, { allowEmpty = false, transform = (value) => value } = {}) {
  while (true) {
    const answer = await ask(rl, prompt, { allowEmpty });
    if (allowEmpty && (answer == null || answer === "")) return undefined;
    if (answer == null) {
      stdout.write("这里需要填写内容；随时输入 q 可退出。\n");
      continue;
    }
    const message = validate(answer);
    if (!message) return transform(answer);
    stdout.write(`${message}\n`);
  }
}

function validateDate(value, system) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return "日期格式应为 YYYY-MM-DD，例如 2000-08-16。";
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    return "这个公历日期不存在，请检查年、月、日。";
  }
  const range = methodFor(system)?.validated_date_range;
  if (range && (value < range.min || value > range.max)) return `当前发布测试范围是 ${range.min} 至 ${range.max}。`;
  return null;
}

function validateTime(value) {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return "时间格式应为 HH:mm，例如 04:30；不知道可直接回车。";
  const [, hour, minute, second = "00"] = match.map(String);
  if (Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) return "时间超出有效范围，请按 24 小时制重新输入。";
  return null;
}

function validateTimezone(value) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date(0));
    return null;
  } catch {
    return "时区名称无法识别。中国大陆常用 Asia/Shanghai，香港常用 Asia/Hong_Kong；请输入 IANA 时区。";
  }
}

function parseCoordinatePair(value) {
  const parts = value.split(/[,，]/).map((item) => item.trim());
  if (parts.length !== 2 || parts.some((item) => item === "")) return null;
  const [latitude, longitude] = parts.map(Number);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

function positiveIntegerMessage(value, maximum = Number.MAX_SAFE_INTEGER) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > maximum) return `请输入 1 至 ${maximum} 之间的正整数。`;
  return null;
}

async function askDate(rl, system, current) {
  return askValidated(rl, `出生日期（公历 YYYY-MM-DD${current ? `，当前 ${current}` : ""}）：`, (value) => validateDate(value, system));
}

async function askTargetDate(rl, birthDate, current) {
  return askValidated(
    rl,
    `想看哪个日期所处的阶段？（公历 YYYY-MM-DD；留空只看本命${current ? `，当前 ${current}` : ""}）：`,
    (value) => {
      const invalid = validateDate(value, "ziwei");
      if (invalid) return invalid;
      return value < birthDate ? "目标日期不能早于出生日期。" : null;
    },
    { allowEmpty: true },
  );
}

async function askTime(rl, current) {
  return askValidated(
    rl,
    `出生时间（24 小时制 HH:mm；不知道直接回车${current ? `，当前 ${current}` : ""}）：`,
    validateTime,
    { allowEmpty: true },
  );
}

async function askTimezone(rl, current) {
  return askValidated(
    rl,
    `出生地时区（中国大陆 Asia/Shanghai，香港 Asia/Hong_Kong${current ? `，当前 ${current}` : ""}）：`,
    validateTimezone,
  );
}

async function askCoordinates(rl, current = null) {
  const currentText = current ? `，当前 ${current.latitude},${current.longitude}` : "";
  return askValidated(
    rl,
    `请输入纬度,经度（例如 31.23,121.47${currentText}）：`,
    (value) => parseCoordinatePair(value) ? null : "经纬度应成对填写，纬度范围 -90~90、经度范围 -180~180。",
    { transform: parseCoordinatePair },
  );
}

async function askOptionalCoordinates(rl) {
  return askValidated(
    rl,
    "经纬度（用于上升点、中天和宫位；格式 纬度,经度，例如 31.23,121.47；只看行星可留空）：",
    (value) => parseCoordinatePair(value) ? null : "经纬度应成对填写，纬度范围 -90~90、经度范围 -180~180。",
    { allowEmpty: true, transform: parseCoordinatePair },
  );
}

async function askChartSex(rl, system = "ziwei") {
  stdout.write(system === "bazi"
    ? "该传统二元参数只用于决定八字大运顺逆，不用于推断或评价身份。\n"
    : "该参数只用于紫微斗数的传统排盘算法，不用于推断身份。\n");
  return askMenu(rl, "请选择排盘参数：1 男  2 女：", [
    { keys: ["1", "男", "male"], value: "male" },
    { keys: ["2", "女", "female"], value: "female" },
  ]);
}

async function collectBirth(rl, system, { includeTargetDate = false } = {}) {
  const input = {
    date: await askDate(rl, system),
  };
  const time = await askTime(rl);
  if (time) input.time = time;
  input.timezone = await askTimezone(rl);
  if (system === "western" && time) {
    const coordinates = await askOptionalCoordinates(rl);
    if (coordinates) Object.assign(input, coordinates);
  }
  if (["bazi", "ziwei"].includes(system) && includeTargetDate && !time) {
    stdout.write("出生时刻未知时可以比较候选本命结构，但不能可靠定位指定日期的大限与流年；本轮先不做阶段计算。\n");
  }
  if (system === "ziwei" || (system === "bazi" && includeTargetDate && time)) {
    input.chart_sex = await askChartSex(rl, system);
    if (time && includeTargetDate) {
      const targetDate = await askTargetDate(rl, input.date);
      if (targetDate) input.target_date = targetDate;
    }
  }
  return input;
}

async function askTarotSpread(rl) {
  stdout.write("牌阵选择：\n");
  TAROT_SPREADS.forEach((spread, index) => stdout.write(`  ${index + 1}. ${spread.label}\n`));
  return askMenu(
    rl,
    "请选择牌阵（默认 2）：",
    TAROT_SPREADS.map((spread, index) => ({ keys: [String(index + 1), spread.id], value: spread.id })),
    "three",
  );
}

async function askTarotSource(rl, spread) {
  stdout.write("抽牌方式：1 本地安全随机（推荐）  2 使用回放种子  3 录入实体牌  4 随机并显示回放种子\n");
  const source = await askMenu(rl, "请选择（默认 1）：", [
    { keys: ["1"], value: "random" },
    { keys: ["2"], value: "seed" },
    { keys: ["3"], value: "cards" },
    { keys: ["4"], value: "random-reveal" },
  ], "random");
  if (source === "seed") {
    const seed = await askValidated(rl, "请输入回放种子（它只是复现凭据，不是灵验度指标）：", (value) => value ? null : "种子不能为空。");
    return { seed };
  }
  if (source === "random-reveal") return { reveal_seed: true };
  if (source === "random") return { reveal_seed: false };
  const positions = TAROT_SPREADS.find((item) => item.id === spread).positions;
  const cards = [];
  for (const position of positions) {
    const label = TAROT_POSITION_LABELS_ZH[position] || position;
    const card = await askValidated(rl, `${label}：请输入牌名或牌 ID：`, (value) => value ? null : "牌名不能为空。");
    const orientation = await askMenu(rl, `${label}：1 正位  2 逆位（默认 1）：`, [
      { keys: ["1", "正位", "upright"], value: "upright" },
      { keys: ["2", "逆位", "reversed"], value: "reversed" },
    ], "upright");
    cards.push({ card, orientation });
  }
  return { cards };
}

async function collectTarot(rl) {
  const question = await askValidated(
    rl,
    "请用一句话写下这次想反思的聚焦问题：",
    (value) => value.length <= 1000 ? null : "问题最多 1000 个字符，请稍微缩短。",
  );
  const spread = await askTarotSpread(rl);
  return { question, spread, ...await askTarotSource(rl, spread) };
}

async function askIchingSource(rl) {
  stdout.write("起卦方式：1 本地安全三钱（推荐）  2 使用回放种子  3 录入实体六爻  4 随机并显示回放种子\n");
  const source = await askMenu(rl, "请选择（默认 1）：", [
    { keys: ["1"], value: "random" },
    { keys: ["2"], value: "seed" },
    { keys: ["3"], value: "lines" },
    { keys: ["4"], value: "random-reveal" },
  ], "random");
  if (source === "seed") {
    return {
      seed: await askValidated(rl, "请输入回放种子：", (value) => value ? null : "种子不能为空。"),
    };
  }
  if (source === "random-reveal") return { reveal_seed: true };
  if (source === "random") return { reveal_seed: false };
  return {
    lines: await askValidated(
      rl,
      "请输入自下而上的 6 个爻值（6/7/8/9，以逗号分隔）：",
      (value) => {
        const values = value.split(/[,，\s]+/).filter(Boolean).map(Number);
        return values.length === 6 && values.every((item) => [6, 7, 8, 9].includes(item))
          ? null
          : "必须按自下而上的顺序输入 6 个爻值，每个只能是 6、7、8 或 9。";
      },
      { transform: (value) => value.split(/[,，\s]+/).filter(Boolean).map(Number) },
    ),
  };
}

async function collectIching(rl) {
  const question = await askValidated(
    rl,
    "请用一句话写下这次想反思的聚焦问题：",
    (value) => value.length <= 1000 ? null : "问题最多 1000 个字符，请稍微缩短。",
  );
  return { question, ...await askIchingSource(rl) };
}

async function collectMeihua(rl) {
  const question = await ask(rl, "问题（可留空）：", { allowEmpty: true });
  stdout.write(
    "固定两数口径说明：会计算体用、互卦和五行作用方向；不含时间起卦、季节旺衰或精准应期。继续输入第一个数字即表示接受这个范围；输入 q 可取消。\n",
  );
  const firstNumber = await askValidated(rl, "第一个正整数：", positiveIntegerMessage, { transform: Number });
  const secondNumber = await askValidated(rl, "第二个正整数：", positiveIntegerMessage, { transform: Number });
  return {
    ...(question ? { question } : {}),
    first_number: firstNumber,
    second_number: secondNumber,
  };
}

async function collectInput(rl, route) {
  const { system } = route;
  if (["bazi", "ziwei", "western"].includes(system)) {
    return collectBirth(rl, system, {
      includeTargetDate: ["bazi", "ziwei"].includes(system) && ["life_overview", "life_domain"].includes(route.goal),
    });
  }
  if (system === "tarot") return collectTarot(rl);
  if (system === "iching") return collectIching(rl);
  return collectMeihua(rl);
}

async function chooseBirthSystem(rl, domain = null) {
  if (domain === "family_social") {
    stdout.write("当前“家庭与人际”只有西洋本命盘安装了可闭合的主题宫路线；紫微需要分开田宅、父母、兄弟、交友等宫，八字也尚未安装指定领域路由。\n");
    return askMenu(rl, "请选择出生盘方式（默认 1）：", [
      { keys: ["1", "西占", "western"], value: "western" },
    ], "western");
  }
  if (domain) {
    stdout.write("适合这个重点领域的方式：\n");
    stdout.write("  1. 紫微斗数（主题宫、三方四正；时辰明确时可加看阶段）\n");
    stdout.write("  2. 西洋本命盘（主题宫、宫主星与相位；需时刻和经纬度）\n");
    stdout.write("八字当前只闭合整体格局与阶段路线，不会把泛化十神套成这个领域的答案。\n");
    return askMenu(rl, "请选择出生盘方式（默认 1）：", [
      { keys: ["1", "紫微", "ziwei"], value: "ziwei" },
      { keys: ["2", "西占", "western"], value: "western" },
    ], "ziwei");
  }
  stdout.write("适合出生资料的方式：\n");
  stdout.write("  1. 紫微斗数（宫位主题；时刻明确时可加看指定日期的大限与流年）\n");
  stdout.write("  2. 四柱八字（看旺衰竞争假设、格局成败救应及大运流年引动）\n");
  stdout.write("  3. 西洋本命盘（看本命结构；当前不算行运）\n");
  return askMenu(rl, "请选择出生盘方式（默认 1）：", [
    { keys: ["1", "紫微", "ziwei"], value: "ziwei" },
    { keys: ["2", "八字", "bazi"], value: "bazi" },
    { keys: ["3", "西占", "western"], value: "western" },
  ], "ziwei");
}

async function chooseExplicitSystem(rl) {
  stdout.write("可用方法：\n");
  stdout.write("  1. 四柱八字  2. 紫微斗数  3. 西洋本命盘\n");
  stdout.write("  4. 塔罗  5. 周易三钱  6. 梅花两数（固定两数口径）\n");
  return askMenu(rl, "请选择具体方法：", [
    { keys: ["1", "八字", "bazi"], value: "bazi" },
    { keys: ["2", "紫微", "ziwei"], value: "ziwei" },
    { keys: ["3", "西占", "western"], value: "western" },
    { keys: ["4", "塔罗", "tarot"], value: "tarot" },
    { keys: ["5", "周易", "iching"], value: "iching" },
    { keys: ["6", "梅花", "meihua"], value: "meihua" },
  ]);
}

async function chooseGoalAndSystem(rl) {
  stdout.write("这次你最想看什么？\n");
  stdout.write("  1. 人生整体与重要阶段\n");
  stdout.write("  2. 只看一个方面：事业、财富、感情、家庭或身心节奏\n");
  stdout.write("  3. 当前一件事或一个选择\n");
  stdout.write("  4. 我已经知道想用哪种方法\n");
  const goal = await askMenu(rl, "请选择想看的内容：", [
    { keys: ["1"], value: "life_overview" },
    { keys: ["2"], value: "life_domain" },
    { keys: ["3"], value: "current_question" },
    { keys: ["4"], value: "explicit_method" },
  ]);

  if (goal === "life_overview") {
    return { goal, focus: GOAL_LABELS[goal], system: await chooseBirthSystem(rl) };
  }
  if (goal === "life_domain") {
    stdout.write("想重点看：1 事业与学业  2 财富与资源  3 感情与长期关系  4 家庭与人际  5 身心节奏\n");
    const domain = await askMenu(rl, "请选择重点领域：", [
      { keys: ["1"], value: "career_study" },
      { keys: ["2"], value: "wealth_resources" },
      { keys: ["3"], value: "relationships" },
      { keys: ["4"], value: "family_social" },
      { keys: ["5"], value: "wellbeing_rhythm" },
    ]);
    return { goal, domain, focus: DOMAIN_LABELS[domain], system: await chooseBirthSystem(rl, domain) };
  }
  if (goal === "current_question") {
    stdout.write("适合当前问题的方式：1 塔罗（拆局面与行动）  2 周易三钱（看主卦、动爻与变化结构）  3 梅花两数（已有两个数时）\n");
    const system = await askMenu(rl, "请选择问事方式（默认 1）：", [
      { keys: ["1", "塔罗", "tarot"], value: "tarot" },
      { keys: ["2", "周易", "iching"], value: "iching" },
      { keys: ["3", "梅花", "meihua"], value: "meihua" },
    ], "tarot");
    return { goal, focus: GOAL_LABELS[goal], system };
  }
  const system = await chooseExplicitSystem(rl);
  return { goal, focus: `${GOAL_LABELS[goal]}：${SYSTEM_LABELS[system]}`, system };
}

async function chooseProfileAdvanced(rl, state) {
  const profiles = methodFor(state.system)?.profiles || [];
  if (profiles.length <= 1) {
    stdout.write(`本方法只有一个可用口径，已采用：${profileLabel(profiles[0])}。\n`);
    state.profile = profiles[0]?.id || {};
    return;
  }
  stdout.write("\n高级口径（不确定时保留推荐项即可）：\n");
  profiles.forEach((profile, index) => {
    const status = PROFILE_STATUS_LABELS[profile.status] || profile.status;
    stdout.write(`  ${index + 1}. ${profileLabel(profile)}［${status}］\n`);
  });
  state.profile = await askMenu(
    rl,
    "请选择口径（默认 1）：",
    profiles.map((profile, index) => ({ keys: [String(index + 1)], value: profile.id })),
    profiles[0].id,
  );
}

function birthRows(system, input) {
  const rows = [
    ["日期", `${input.date}（公历）`],
    ["时间", input.time || "未知；会核对不同出生时段带来的变化"],
    ["时区", input.timezone],
  ];
  if (system === "ziwei") {
    rows.push(["排盘参数", input.chart_sex === "male" ? "男" : "女"]);
    if (input.target_date) rows.push(["想看的日期", input.target_date]);
    if (ziweiCalendarDayIsQualified(input)) {
      rows.push(["海外日期提醒", "这张盘按出生地当天处理；有些紫微流派对海外出生日期采用不同规则，结果可能变化"]);
    }
  }
  if (system === "bazi" && input.chart_sex) {
    rows.push(["大运顺逆参数", input.chart_sex === "male" ? "男" : "女"]);
    if (input.target_date) rows.push(["想看的日期", input.target_date]);
  }
  if (input.disambiguation === "earlier") rows.push(["重复时刻", "采用夏令时回拨中较早出现的一次"]);
  if (input.disambiguation === "later") rows.push(["重复时刻", "采用夏令时回拨中较晚出现的一次"]);
  if (input.latitude != null && input.longitude != null) rows.push(["坐标", `${input.latitude}, ${input.longitude}`]);
  else if (system === "western" && input.time) rows.push(["坐标", "未提供；上升点、中天和宫位将省略"]);
  return rows;
}

function inspectRepeatedLocalTime(input) {
  if (!input?.time) return { kind: "not-exact" };
  try {
    const birth = normalizeBirthInput(input);
    const earlier = resolveCalculationTime({ ...birth, disambiguation: "earlier" });
    const later = resolveCalculationTime({ ...birth, disambiguation: "later" });
    if (earlier.utc_instant.epochNanoseconds !== later.utc_instant.epochNanoseconds) {
      return {
        kind: "overlap",
        earlier: { utc: earlier.utc_instant.toString(), offset: earlier.zoned.offset },
        later: { utc: later.utc_instant.toString(), offset: later.zoned.offset },
      };
    }
    return { kind: "unambiguous", resolved: earlier };
  } catch {
    return { kind: "gap-or-invalid" };
  }
}

function ziweiCalendarDayIsQualified(input) {
  try {
    const birth = normalizeBirthInput(input);
    const repeated = inspectRepeatedLocalTime(birth);
    if (repeated.kind === "overlap") {
      return repeated.earlier.offset !== "+08:00" || repeated.later.offset !== "+08:00";
    }
    if (birth.time && repeated.kind === "unambiguous") return repeated.resolved.zoned.offset !== "+08:00";
    const bounds = civilDayBounds(birth);
    return bounds.start.offset !== "+08:00" || bounds.end.offset !== "+08:00";
  } catch {
    return true;
  }
}

function confirmationRows(state) {
  const { system, input, profile } = state;
  if (["bazi", "ziwei", "western"].includes(system)) return birthRows(system, input);
  if (system === "tarot") {
    const spread = TAROT_SPREADS.find((item) => item.id === input.spread);
    const source = input.cards ? "实体牌录入" : input.seed ? "回放种子" : input.reveal_seed ? "本地随机（显示回放种子）" : "本地安全随机";
    return [["问题", input.question], ["牌阵", spread?.label || input.spread], ["抽牌方式", source]];
  }
  if (system === "iching") {
    const source = input.lines ? "实体六爻录入" : input.seed ? "回放种子" : input.reveal_seed ? "本地随机（显示回放种子）" : "本地安全三钱";
    return [["问题", input.question], ["起卦方式", source]];
  }
  return [
    ...(input.question ? [["问题", input.question]] : []),
    ["第一个数", String(input.first_number)],
    ["第二个数", String(input.second_number)],
    ["动爻", "按两数规则自动计算"],
  ];
}

function showConfirmation(state) {
  stdout.write("\n请核对这次要看的内容：\n");
  stdout.write(`- 你想看：${state.focus}\n`);
  stdout.write(`- 使用：${SYSTEM_LABELS[state.system]}\n`);
  for (const [label, value] of confirmationRows(state)) stdout.write(`- ${label}：${value}\n`);
  stdout.write("程序不会主动联网或写入文件；终端或宿主软件可能保留屏幕记录。\n");
}

async function editBirth(rl, state) {
  const options = [
    { key: "1", label: "出生日期", field: "date" },
    { key: "2", label: "出生时间", field: "time" },
    { key: "3", label: "出生地时区", field: "timezone" },
  ];
  if (state.system === "ziwei" || (
    state.system === "bazi"
    && state.input.time
    && (state.input.chart_sex || ["life_overview", "life_domain"].includes(state.goal))
  )) {
    options.push({ key: String(options.length + 1), label: state.system === "bazi" ? "大运顺逆参数" : "排盘参数", field: "chart_sex" });
  }
  if (["bazi", "ziwei"].includes(state.system) && state.input.time && state.input.chart_sex) {
    options.push({ key: String(options.length + 1), label: "想看的日期（大限与流年）", field: "target_date" });
  }
  if (state.system === "western") options.push({ key: String(options.length + 1), label: "经纬度（用于上升点和宫位）", field: "coordinates" });
  stdout.write("要修改哪一项？\n");
  options.forEach((item) => stdout.write(`  ${item.key}. ${item.label}\n`));
  const field = await askMenu(rl, "请选择：", options.map((item) => ({ keys: [item.key], value: item.field })));
  if (field === "date") state.input.date = await askDate(rl, state.system, state.input.date);
  if (field === "time") {
    const time = await askTime(rl, state.input.time);
    if (time) {
      const hadTime = Boolean(state.input.time);
      state.input.time = time;
      if (["bazi", "ziwei"].includes(state.system) && !hadTime && ["life_overview", "life_domain"].includes(state.goal)) {
        if (!state.input.chart_sex) state.input.chart_sex = await askChartSex(rl, state.system);
        const targetDate = await askTargetDate(rl, state.input.date, state.input.target_date);
        if (targetDate) state.input.target_date = targetDate;
      }
    } else {
      delete state.input.time;
      if (state.input.target_date) {
        delete state.input.target_date;
        stdout.write("已移除阶段日期：没有明确出生时刻时，不能定位大限与流年。\n");
      }
      if (state.system === "bazi") delete state.input.chart_sex;
    }
  }
  if (field === "timezone") state.input.timezone = await askTimezone(rl, state.input.timezone);
  if (["date", "time", "timezone"].includes(field)) {
    delete state.input.disambiguation;
    delete state.input.utc_offset;
  }
  if (field === "chart_sex") state.input.chart_sex = await askChartSex(rl, state.system);
  if (field === "target_date") {
    const targetDate = await askTargetDate(rl, state.input.date, state.input.target_date);
    if (targetDate) state.input.target_date = targetDate;
    else delete state.input.target_date;
  }
  if (field === "coordinates") {
    const coordinates = await askCoordinates(rl, state.input.latitude != null ? state.input : null);
    Object.assign(state.input, coordinates);
  }
}

async function confirmFrozenOutcomeReplacement(rl, system, changeLabel) {
  const isTarot = system === "tarot";
  const frozenLabel = isTarot ? "牌面" : "卦象";
  const newAction = isTarot ? "新抽取" : "新起卦";
  return askMenu(
    rl,
    `${frozenLabel}与原问题已经冻结。${changeLabel}会开始一次${newAction}；只有确认后才会替换当前结果并作废旧解读。1 继续  2 返回（默认 2）：`,
    [{ keys: ["1"], value: true }, { keys: ["2"], value: false }],
    false,
  );
}

async function editQuestionMethod(rl, state) {
  if (state.system === "tarot") {
    stdout.write("要修改哪一项？\n  1. 换一个问题（会明确重新抽牌）\n  2. 牌阵\n  3. 抽牌方式\n");
    const field = await askMenu(rl, "请选择：", [
      { keys: ["1"], value: "question" }, { keys: ["2"], value: "spread" }, { keys: ["3"], value: "source" },
    ]);
    if (field === "question") {
      const proceed = await confirmFrozenOutcomeReplacement(rl, "tarot", "换问题");
      if (!proceed) return;
      state.input.question = await askValidated(rl, "新的聚焦问题：", (value) => value.length <= 1000 ? null : "问题最多 1000 个字符。");
      delete state.input.cards;
      delete state.input.seed;
      delete state.input.reveal_seed;
      Object.assign(state.input, await askTarotSource(rl, state.input.spread));
      stdout.write("已明确开始新问题；下一步会生成一组新牌，旧牌面不会混入。\n");
      return { invalidatesPreviousReading: true };
    }
    if (field === "spread") {
      const proceed = await confirmFrozenOutcomeReplacement(rl, "tarot", "修改牌阵");
      if (!proceed) return;
      state.input.spread = await askTarotSpread(rl);
      delete state.input.cards;
      delete state.input.seed;
      delete state.input.reveal_seed;
      Object.assign(state.input, await askTarotSource(rl, state.input.spread));
      stdout.write("已确认开始新抽取；旧牌面会保留到新结果生成，随后旧解读作废。\n");
      return { invalidatesPreviousReading: true };
    }
    if (field === "source") {
      const proceed = await confirmFrozenOutcomeReplacement(rl, "tarot", "修改抽牌方式");
      if (!proceed) return;
      delete state.input.cards;
      delete state.input.seed;
      delete state.input.reveal_seed;
      Object.assign(state.input, await askTarotSource(rl, state.input.spread));
      stdout.write("已确认开始新抽取；旧牌面会保留到新结果生成，随后旧解读作废。\n");
      return { invalidatesPreviousReading: true };
    }
    return;
  }
  if (state.system === "iching") {
    const field = await askMenu(rl, "修改：1 换一个问题（会明确重新起卦）  2 起卦方式：", [
      { keys: ["1"], value: "question" }, { keys: ["2"], value: "source" },
    ]);
    if (field === "question") {
      const proceed = await confirmFrozenOutcomeReplacement(rl, "iching", "换问题");
      if (!proceed) return;
      state.input.question = await askValidated(rl, "新的聚焦问题：", (value) => value.length <= 1000 ? null : "问题最多 1000 个字符。");
      delete state.input.lines;
      delete state.input.seed;
      delete state.input.reveal_seed;
      Object.assign(state.input, await askIchingSource(rl));
      stdout.write("已明确开始新问题；下一步会重新起卦，旧卦不会混入。\n");
      return { invalidatesPreviousReading: true };
    } else {
      const proceed = await confirmFrozenOutcomeReplacement(rl, "iching", "修改起卦方式");
      if (!proceed) return;
      delete state.input.lines;
      delete state.input.seed;
      delete state.input.reveal_seed;
      Object.assign(state.input, await askIchingSource(rl));
      stdout.write("已确认开始新起卦；旧卦会保留到新结果生成，随后旧解读作废。\n");
      return { invalidatesPreviousReading: true };
    }
    return;
  }
  stdout.write("要修改哪一项？\n  1. 问题（会用新数字重新起卦）\n  2. 第一个数\n  3. 第二个数\n");
  const field = await askMenu(rl, "请选择：", [
    { keys: ["1"], value: "question" }, { keys: ["2"], value: "first" },
    { keys: ["3"], value: "second" },
  ]);
  if (field === "question") {
    const proceed = await confirmFrozenOutcomeReplacement(rl, "meihua", "换问题");
    if (!proceed) return;
    const question = await ask(rl, "新的问题（可留空）：", { allowEmpty: true });
    if (question) state.input.question = question;
    else delete state.input.question;
    state.input.first_number = await askValidated(rl, "新问题的第一个正整数：", positiveIntegerMessage, { transform: Number });
    state.input.second_number = await askValidated(rl, "新问题的第二个正整数：", positiveIntegerMessage, { transform: Number });
    stdout.write("已明确开始新问题并采用新数字；旧卦不会混入。\n");
    return { invalidatesPreviousReading: true };
  }
  if (field === "first" || field === "second") {
    const proceed = await confirmFrozenOutcomeReplacement(rl, "meihua", "修改起卦数字");
    if (!proceed) return;
    if (field === "first") state.input.first_number = await askValidated(rl, "新的第一个正整数：", positiveIntegerMessage, { transform: Number });
    else state.input.second_number = await askValidated(rl, "新的第二个正整数：", positiveIntegerMessage, { transform: Number });
    stdout.write("已确认重新起卦；旧卦会保留到新结果生成，随后旧解读作废。\n");
    return { invalidatesPreviousReading: true };
  }
}

async function editInput(rl, state) {
  if (["bazi", "ziwei", "western"].includes(state.system)) return editBirth(rl, state);
  return editQuestionMethod(rl, state);
}

function friendlyCalculationError(error) {
  const known = asFortuneTellerError(error);
  const messages = {
    INVALID_DATE: "公历日期无效，请修改日期。",
    INVALID_TIME: "出生时间无效，请修改时间。",
    INVALID_TIMEZONE: "时区无法识别，请修改时区。",
    INVALID_TIME_ZONE: "时区无法识别，请修改时区。",
    NONEXISTENT_LOCAL_TIME: "这个当地时间处于夏令时跳时区间，请核对出生记录。",
    AMBIGUOUS_LOCAL_TIME: "这个当地时间在夏令时回拨时出现两次，需要进一步确认。",
    AMBIGUOUS_OR_NONEXISTENT_LOCAL_TIME: "这个当地钟表时间存在夏令时重叠或跳时，需要进一步确认。",
    INVALID_COORDINATE: "经纬度无效，请重新填写。",
    INVALID_PROFILE: "所选计算口径与资料不匹配，请调整高级设置。",
    IMMUTABLE_PROFILE_FIELD: "所选口径包含当前未安全开放的改动，请保留已登记口径。",
    UNSUPPORTED_BAZI_CALENDAR_OFFSET: "为避免节气边界排错，当前八字只接受出生时实际 UTC 偏移为 +08:00 的民用时间；请勿手工换算出生时间。可改用其他可靠排盘器，或等待天文节气瞬间口径完成。",
    INVALID_TIME_PRECISION: "时间精度标记与输入不一致，请重新填写原始记录。",
    INPUT_SCHEMA_VIOLATION: "部分资料不符合计算要求，请返回修改。",
    MISSING_QUESTION: "问题不能为空，请返回修改。",
    INVALID_SPREAD: "牌阵选择无效，请返回修改。",
    INVALID_CARD: "实体牌名或方向无法识别，请返回修改。",
    INVALID_TARGET_DATE: "想看的日期无效，请修改。",
    TARGET_BEFORE_BIRTH: "想看的日期不能早于出生日期，请修改。",
    TARGET_OUTSIDE_VALIDATED_RANGE: "想看的日期超出当前测试范围，请修改。",
    TARGET_DATE_REQUIRES_BIRTH_TIME: "要看大限与流年，需要明确的出生时刻。",
    TARGET_OUTSIDE_DECADAL_COVERAGE: "这个日期不在当前引擎能可靠核对的大限范围内；可以改看成年后的日期或只看本命。",
  };
  return messages[known.code] || `本地引擎拒绝了这组输入（${known.code}）。请修改资料后再试。`;
}

function translateWarning(warning) {
  if (warning.startsWith("No birth time was supplied. No hour-pillar")) return "未提供出生时间，因此不会给出时柱解释。";
  if (warning.startsWith("The civil day was scanned")) return "已按 60 秒分辨率扫描当地真实民用日；边界是扫描界限，不冒充精确切换时刻。";
  if (warning.startsWith("Probe counts describe")) return "扫描覆盖数量不是出生时刻的概率，也不是预测置信度。";
  if (warning.startsWith("No birth time was supplied. A single Zi Wei")) return "未提供出生时间，因此不会合成一张紫微单盘。";
  if (warning.startsWith("Candidates are consecutive")) return "候选覆盖当地民用日内连续计算区间，并按指定时区处理夏令时跳时与重复时段。";
  if (warning.startsWith("The scan resolution is")) return "候选数和扫描点数只是覆盖诊断，不代表概率。";
  if (warning.startsWith("No birth time was supplied. Ascendant")) return "未提供出生时间，因此省略上升点、中天、宫位及依赖角点的结论。";
  if (warning.startsWith("Planet ranges are")) return "行星范围来自全天逐分钟扫描，不是精确连续极值或概率区间。";
  if (warning.startsWith("Latitude is too close")) return "纬度过于接近地理极点，无法稳定计算上升点，因此省略角点和宫位。";
  if (warning.startsWith("Latitude/longitude were not supplied")) return "未提供经纬度，因此省略上升点、中天和宫位。";
  if (warning.startsWith("Card keywords are")) return "牌义关键词仅用于传统反思，不是经过验证的预测。";
  if (warning.startsWith("Hexagram interpretation is")) return "卦象解释属于传统反思方法，不是经过验证的预测。";
  if (warning.startsWith("Meihua support is bounded")) return "梅花两数采用一种固定、可复算的起卦口径。";
  if (warning.startsWith("No time-based casting")) return "当前不含时间起卦、季节旺衰或精准应期。";
  if (warning.startsWith("LATE_ZI_UPSTREAM_MISMATCH")) return "晚子时边界已按所选日界重新统一时柱天干，避免混用两套口径。";
  if (warning.startsWith("CALENDAR_DAY_PROFILE_QUALIFIED")) return "当前紫微口径按出生地民用日换算；在 UTC+08:00 以外，其他流派可能采用不同的中国历法参考日。";
  if (warning.startsWith("Apparent solar time uses")) return "视太阳时采用有文档说明的近似均时差修正。";
  if (warning.startsWith("The adjusted time is within two minutes")) return "修正后时间距离时辰边界不足两分钟，建议比较相邻口径。";
  if (warning.startsWith("CALENDAR_BOUNDARY_NEAR")) return "输入时间靠近历法边界，前后两分钟内可能有柱位变化。";
  return `引擎提示：${warning}`;
}

function tarotPrompt(result, card) {
  const reference = result.meta?.card_keyword_references?.find(
    (item) => item.card_id === card.card_id && item.orientation === card.orientation,
  );
  if (!reference) return "";
  if (card.orientation === "reversed") {
    return `以“${card.title_zh}”的逆位传统主题为提问线索，检查当前位置的阻力、失衡或尚未补足的准备`;
  }
  return `以“${card.title_zh}”的正位传统主题为提问线索，检查当前位置的可用资源、行动空间与可逆下一步`;
}

function palaceLabel(name) {
  const label = String(name || "").trim();
  if (!label) return "未标注宫位";
  return label.endsWith("宫") ? label : `${label}宫`;
}

function resultSummaryLines(result) {
  const facts = result.facts;
  if (result.system === "bazi") {
    if (facts.pillars) {
      const lines = [`四柱：${facts.pillars.map((item) => `${PILLAR_LABELS_ZH[item.pillar]} ${item.stem_branch}`).join(" ｜ ")}`];
      const target = facts.luck_cycles?.target;
      if (target) {
        lines.unshift(`指定日期：${target.date || target.requested_date}`);
        const active = facts.luck_cycles.decadal?.find((item) => item.fact_id === target.active_decadal_fact_id);
        lines.push(active
          ? `当前大运：${active.stem_branch}（${active.start_local.slice(0, 10)} 起，至 ${active.end_local_exclusive.slice(0, 10)} 前）`
          : "当前大运：目标日处在起运边界，暂不硬选前后一步");
        lines.push(target.yearly
          ? `流年：${target.yearly.stem_branch}（以立春换年；目标日内唯一稳定）`
          : "流年：目标日处在立春节气边界，保留前后候选");
      }
      return lines;
    }
    const stable = facts.stable_pillars.map((item) => {
      const values = item.alternatives.map((alternative) => alternative.value).join(" / ");
      return `${PILLAR_LABELS_ZH[item.pillar]}：${values}${item.status === "stable" ? "（全天稳定）" : "（随时段变化）"}`;
    });
    return ["出生时辰未知：已比较出生当天所有真实时段。", ...stable, "时柱：暂时不能判断"];
  }
  if (result.system === "ziwei") {
    if (facts.summary) {
      const lines = [
        `命主星：${facts.summary.soul_star} ｜ 身主星：${facts.summary.body_star} ｜ ${facts.summary.five_elements_class}`,
        `命宫：${facts.summary.soul_palace_branch} ｜ 身宫：${facts.summary.body_palace_branch}`,
      ];
      if (facts.periods) {
        const { target, decadal, yearly } = facts.periods;
        lines.unshift(`指定日期：${target.requested_date}`);
        lines.push(`大限：${decadal.nominal_age_range[0]}–${decadal.nominal_age_range[1]} 岁（${decadal.calendar_year_range[0]}–${decadal.calendar_year_range[1]}），阶段命宫落本命${palaceLabel(decadal.focus.natal_palace_name)}`);
        lines.push(`流年：${yearly.calendar_year} 年，年度命宫落本命${palaceLabel(yearly.focus.natal_palace_name)}`);
      }
      return lines;
    }
    return ["出生时辰未知：已比较出生当天的候选盘；不会硬选其中一张。"];
  }
  if (result.system === "western") {
    if (facts.planets) return facts.planets.slice(0, 5).map((item) => `${item.label_zh}：${item.sign_zh} ${item.degree_in_sign}°`);
    const changed = facts.planet_ranges.filter((item) => item.sign_status !== "stable").length;
    return ["出生时刻未知：已比较出生当天所有真实时段。", `跨星座边界的星体：${changed} 个；上升点、中天和宫位暂时不能判断。`];
  }
  if (result.system === "tarot") {
    return facts.cards.map((card) => `${TAROT_POSITION_LABELS_ZH[card.position] || card.position}：${card.title_zh}（${ORIENTATION_LABELS_ZH[card.orientation]}）`);
  }
  if (result.system === "iching") {
    const changing = facts.changing_lines.length ? `；动爻：${facts.changing_lines.join("、")}` : "；无动爻";
    return [`本卦：第 ${facts.primary.king_wen_number} 卦 ${facts.primary.name}`, `变卦：第 ${facts.transformed.king_wen_number} 卦 ${facts.transformed.name}${changing}`];
  }
  return [
    `本卦：第 ${facts.primary.king_wen_number} 卦 ${facts.primary.name}`,
    `变卦：第 ${facts.transformed.king_wen_number} 卦 ${facts.transformed.name}`,
    `动爻：第 ${facts.moving_line.position_from_bottom} 爻`,
  ];
}

function safeProfessionalAdjudication(result, state = {}) {
  if (typeof adjudicate !== "function") return null;
  try {
    const topic = state.domain || "overview";
    return adjudicate(result, { topic });
  } catch {
    return null;
  }
}

function homeWarnings(result) {
  const prefixes = [
    "CALENDAR_DAY_PROFILE_QUALIFIED", "No birth time was supplied", "Latitude is too close",
    "Latitude/longitude were not supplied", "Meihua support is bounded", "No time-based casting",
  ];
  return result.warnings.filter((warning) => prefixes.some((prefix) => warning.startsWith(prefix)));
}

function showResultHome(result, state) {
  const professional = safeProfessionalAdjudication(result, state);
  stdout.write("\n＝＝＝＝ 排盘 / 抽取完成 ＝＝＝＝\n");
  stdout.write(`你想看：${state.focus}\n`);
  stdout.write(`使用：${SYSTEM_LABELS[result.system]}\n`);
  if (professional) {
    stdout.write("\n先说结论：\n");
    stdout.write(`${professional.conclusion}\n`);
    stdout.write(`${professional.plain_language}\n`);
    if (professional.phase?.decadal?.status === "available" || professional.phase?.yearly?.status === "available") {
      stdout.write("\n当前阶段：\n");
      if (professional.phase.decadal?.conclusion) stdout.write(`- ${professional.phase.decadal.conclusion}\n`);
      if (professional.phase.yearly?.conclusion) stdout.write(`- ${professional.phase.yearly.conclusion}\n`);
      if (professional.phase.joint_activation?.conclusion) stdout.write(`- ${professional.phase.joint_activation.conclusion}\n`);
    }
    stdout.write("\n盘面起点：\n");
  }
  for (const line of resultSummaryLines(result)) stdout.write(`${line}\n`);
  const visibleWarnings = homeWarnings(result);
  if (visibleWarnings.length) {
    stdout.write("\n需要留意：\n");
    for (const warning of visibleWarnings) stdout.write(`- ${translateWarning(warning)}\n`);
  }
  stdout.write("\n这是固定本地计算的结果起点，不把牌面或宫位直接冒充命运结论。\n");
  stdout.write("在 Agent 中使用 $fortune-teller 时，会沿用这一结果，先回答你关心的事，再按需展开为什么这样看；追问不会偷偷重排或重抽。\n");
}

function formatCounts(counts) {
  return Object.entries(counts || {}).map(([label, count]) => `${label}${count}`).join("、") || "无";
}

function showDetails(result, state = {}) {
  const facts = result.facts;
  stdout.write("\n—— 盘面 / 牌面重点 ——\n");
  if (result.system === "bazi" && facts.pillars) {
    for (const pillar of facts.pillars) {
      stdout.write(`${PILLAR_LABELS_ZH[pillar.pillar]} ${pillar.stem_branch}｜五行 ${pillar.five_element_pair}｜藏干 ${pillar.hidden_stems.join("、") || "无"}｜天干十神 ${pillar.ten_god_stem}｜纳音 ${pillar.nayin}\n`);
    }
    const structure = facts.structure;
    if (structure) {
      stdout.write(`结构事实：日主 ${structure.day_master.heavenly_stem}（${structure.day_master.polarity === "yang" ? "阳" : "阴"}${structure.day_master.element}）｜月令 ${structure.month_context.earthly_branch}（${structure.month_context.branch_element}）\n`);
      stdout.write(`五行出现次数：显干 ${formatCounts(structure.occurrence_counts.visible_stem_elements)}｜地支 ${formatCounts(structure.occurrence_counts.branch_elements)}｜藏干 ${formatCounts(structure.occurrence_counts.hidden_stem_elements)}\n`);
      stdout.write("注意：三组次数没有合并或加权，不等于旺衰、格局或用神判断。\n");
      if (structure.relationships.length) {
        stdout.write(`明示结构关系：${structure.relationships.map((item) => `${item.pillars.map((pillar) => PILLAR_LABELS_ZH[pillar]).join("-")} ${item.values.join("")}（${RELATIONSHIP_LABELS_ZH[item.relationship] || "结构关系"}）`).join("；")}\n`);
      }
    }
    const professional = safeProfessionalAdjudication(result, state);
    if (professional?.status === "completed") {
      stdout.write("\n—— 专业裁决 ——\n");
      stdout.write(`旺衰：${professional.lenses.strength.conclusion}\n`);
      stdout.write(`格局：${professional.lenses.pattern.conclusion}\n`);
      const activeViews = professional.lenses.useful_god_views.filter((view) => view.state !== "未决");
      if (activeViews.length) stdout.write(`在各自前提内成立的取用视角：${activeViews.map((view) => `${view.lens}（${view.conclusion}）`).join("；")}\n`);
      const climate = professional.lenses.useful_god_views.find((view) => view.lens === "调候");
      if (climate?.screening_completed) stdout.write(`调候筛查（未决）：${climate.conclusion}\n`);
      if (professional.lenses.conflicts.length) stdout.write(`流派分歧：${professional.lenses.conflicts.map((item) => item.explanation).join("；")}\n`);
      stdout.write(`改判边界：${professional.lenses.pattern.hypothesis.change_conditions.join("；")}\n`);
    }
    return;
  }
  if (result.system === "bazi") {
    stdout.write("出生时间未知；可在“为什么这样看 → 资料会影响哪些内容”中查看哪些结论会随时辰变化。\n");
    return;
  }
  if (result.system === "ziwei" && facts.palaces) {
    for (const palace of facts.palaces) {
      const stars = [...palace.major_stars, ...palace.minor_stars].map((star) => `${star.name}${star.brightness ? `（${star.brightness}）` : ""}`).join("、") || "无主/辅星记录";
      stdout.write(`${palaceLabel(palace.name)}［${palace.heavenly_stem}${palace.earthly_branch}］：${stars}${palace.is_body_palace ? "｜身宫" : ""}\n`);
    }
    const lifeRelation = facts.structure?.palace_relations?.find((item) => item.focus_palace === "命宫");
    if (lifeRelation) {
      stdout.write(`命宫三方四正结构：命宫 + ${lifeRelation.trine_palaces.join("、")} + 对宫${lifeRelation.opposite_palace}。这是宫位关系索引，不是单星吉凶结论。\n`);
    }
    if (facts.structure?.mutagen_locations?.length) {
      stdout.write(`引擎返回的四化落点：${facts.structure.mutagen_locations.map((item) => `${item.star}化${item.mutagen}在${item.palace}`).join("；")}。\n`);
    }
    if (facts.periods) {
      const { decadal, yearly } = facts.periods;
      stdout.write(`大限结构：${decadal.nominal_age_range[0]}–${decadal.nominal_age_range[1]} 岁，阶段命宫落本命${palaceLabel(decadal.focus.natal_palace_name)}；四化为${decadal.mutagens.map((item) => `${item.star}化${item.transformation}`).join("、")}。\n`);
      stdout.write(`流年结构：${yearly.calendar_year} 年，年度命宫落本命${palaceLabel(yearly.focus.natal_palace_name)}；四化为${yearly.mutagens.map((item) => `${item.star}化${item.transformation}`).join("、")}。\n`);
      stdout.write("阶段信息必须和本命、大限、流年一起看；它描述关注主题，不保证具体事件。\n");
    }
    return;
  }
  if (result.system === "western" && facts.planets) {
    for (const planet of facts.planets) {
      const motion = MOTION_STATE_LABELS_ZH[planet.motion_state] || planet.motion_state;
      const audit = planet.motion_audit?.consistent_direction ? "±6/12/24 小时窗口一致" : "窗口方向未一致";
      stdout.write(`${planet.label_zh}：${planet.sign_zh} ${planet.degree_in_sign}°（黄经 ${planet.longitude}°）｜视运动 ${motion}（${audit}）\n`);
    }
    if (facts.angles) stdout.write(`上升：${facts.angles.ascendant.sign_zh} ${facts.angles.ascendant.degree_in_sign}°｜中天：${facts.angles.midheaven.sign_zh} ${facts.angles.midheaven.degree_in_sign}°\n`);
    if (facts.structure) {
      stdout.write(`元素出现次数（十大天体各计一次）：${formatCounts(facts.structure.sign_distribution.unweighted_element_counts)}\n`);
      stdout.write(`模式出现次数（不加权）：${formatCounts(facts.structure.sign_distribution.unweighted_modality_counts)}\n`);
      if (facts.structure.tight_aspects.length) {
        stdout.write(`紧密相位（容许度 ≤2°）：${facts.structure.tight_aspects.map((item) => `${item.body_1}-${item.body_2} ${item.aspect} ${item.orb_degrees}°`).join("；")}\n`);
      }
      stdout.write("这些是描述性结构，不是支配力、尊贵力量、性格或预测评分。\n");
    }
    return;
  }
  if (result.system === "tarot") {
    for (const card of facts.cards) {
      const prompt = tarotPrompt(result, card);
      stdout.write(`${TAROT_POSITION_LABELS_ZH[card.position] || card.position}：${card.title_zh}（${ORIENTATION_LABELS_ZH[card.orientation]}）${prompt ? `｜可参考的反思线索：${prompt}` : ""}\n`);
    }
    return;
  }
  if (result.system === "iching") {
    for (const line of facts.lines) stdout.write(`第 ${line.position_from_bottom} 爻（自下而上）：${line.value}${facts.changing_lines.includes(line.position_from_bottom) ? "，动爻" : ""}\n`);
    return;
  }
  if (result.system === "meihua") {
    stdout.write(`上卦：${facts.upper_trigram.name}${facts.upper_trigram.symbol}（${facts.upper_trigram.image}）\n`);
    stdout.write(`下卦：${facts.lower_trigram.name}${facts.lower_trigram.symbol}（${facts.lower_trigram.image}）\n`);
    stdout.write(`动爻：第 ${facts.moving_line.position_from_bottom} 爻\n`);
    return;
  }
  stdout.write("本次没有更多盘面详情；可打开“为什么这样看”查看资料限制。\n");
}

function showSensitivity(result) {
  stdout.write("\n—— 哪些内容会受资料影响 ——\n");
  if (!result.sensitivity) {
    stdout.write("本次使用了明确资料，没有生成出生时段候选。不同流派的排盘规则仍可能造成差异，可在技术记录中核对。\n");
    return;
  }
  if (result.system === "bazi") {
    for (const pillar of result.facts.stable_pillars) {
      const alternatives = pillar.alternatives.map((item) => item.value).join(" / ");
      stdout.write(`${PILLAR_LABELS_ZH[pillar.pillar]}：${pillar.status === "stable" ? "出生当天各时段都相同" : "会随出生时段变化"}｜${alternatives}\n`);
    }
    stdout.write("不知道出生时刻时，时柱不会硬猜；这里只说明哪些部分能定、哪些不能定。\n");
    return;
  }
  if (result.system === "ziwei") {
    for (const item of result.facts.stable_summary || []) {
      const values = item.alternatives?.map((alternative) => alternative.value).join(" / ") || "不可用";
      stdout.write(`${ZIWEI_SENSITIVITY_LABELS_ZH[item.field] || item.field}：${item.status === "stable" ? "出生当天各时段都相同" : "会随出生时段变化"}｜${values}\n`);
    }
    stdout.write("出生时刻未知，所以不选一张最讨喜的盘，也不提供指定年份的阶段判断。\n");
    return;
  }
  if (result.system === "western") {
    for (const range of result.facts.planet_ranges) stdout.write(`${range.label_zh}：${range.sign_candidates.map((item) => item.sign_zh || item).join(" / ")}｜${range.sign_status === "stable" ? "全天稳定" : "跨边界"}\n`);
    stdout.write("不知道出生时刻时，上升点、中天和宫位不能判断；行星跨界也只报告可能范围。\n");
    return;
  }
  stdout.write("本次没有需要在普通结果中展开的资料影响；完整记录可在技术核对中查看。\n");
}

async function showAudit(rl, result) {
  const allowed = await askMenu(
    rl,
    "技术记录会显示排盘口径、版本和核对码；完整 JSON 还可能含出生资料或问题。1 继续  2 返回（默认 2）：",
    [{ keys: ["1"], value: true }, { keys: ["2"], value: false }],
    false,
  );
  if (!allowed) return;
  stdout.write("\n—— 技术记录 ——\n");
  stdout.write(`计算口径 ID：${result.profile.id}\n`);
  stdout.write(`引擎版本：${result.engine_version}\n`);
  stdout.write(`事实核对码：${result.facts_hash}\n`);
  stdout.write(`完整记录核对码：${result.reproducibility_hash}\n`);
  if (result.meta?.rng?.replay_seed) stdout.write(`复现种子：${result.meta.rng.replay_seed}\n`);
  const full = await askMenu(
    rl,
    "1 查看完整 JSON  2 只看以上信息并返回（默认 2）：",
    [{ keys: ["1"], value: true }, { keys: ["2"], value: false }],
    false,
  );
  if (full) await emit(result);
}

async function showWhy(rl, result) {
  while (true) {
    stdout.write("\n为什么这样算：1 看资料会影响哪些内容  2 打开技术记录  3 返回\n");
    const action = await askMenu(rl, "请选择（默认 3）：", [
      { keys: ["1"], value: "sensitivity" },
      { keys: ["2"], value: "audit" },
      { keys: ["3"], value: "back" },
    ], "back");
    if (action === "back") return;
    if (action === "sensitivity") showSensitivity(result);
    if (action === "audit") await showAudit(rl, result);
  }
}

async function resultMenu(rl, result, state) {
  while (true) {
    stdout.write("\n接下来：1 看盘面 / 牌面重点  2 为什么这样看  3 修改资料或问题  4 新建一轮  5 结束\n");
    const action = await askMenu(rl, "请选择（默认 5）：", [
      { keys: ["1"], value: "details" },
      { keys: ["2"], value: "why" },
      { keys: ["3"], value: "edit" },
      { keys: ["4"], value: "new" },
      { keys: ["5"], value: "exit" },
    ], "exit");
    if (["edit", "new", "exit"].includes(action)) return action;
    if (action === "details") showDetails(result, state);
    if (action === "why") await showWhy(rl, result);
  }
}

function needsUnknownTimeScan(state) {
  return ["bazi", "ziwei", "western"].includes(state.system) && !state.input.time;
}

async function confirmAndCalculate(rl, state) {
  while (true) {
    showConfirmation(state);
    stdout.write("1 开始计算  2 修改资料  3 取消  4 高级口径\n");
    const action = await askMenu(rl, "按以上信息在本地计算？请选择（默认 1）：", [
      { keys: ["1", "y", "yes", "是"], value: "start" },
      { keys: ["2"], value: "edit" },
      { keys: ["3", "n", "no", "否"], value: "cancel" },
      { keys: ["4"], value: "profile" },
    ], "start");
    if (action === "cancel") return null;
    if (action === "edit") {
      await editInput(rl, state);
      continue;
    }
    if (action === "profile") {
      await chooseProfileAdvanced(rl, state);
      continue;
    }
    if (needsUnknownTimeScan(state)) {
      stdout.write("正在扫描出生当天所有真实存在的民用时刻并比较候选，请稍候；这可能需要几十秒……\n");
    } else {
      stdout.write("正在本地计算……\n");
    }
    try {
      return calculate(state.system, state.input, state.profile);
    } catch (error) {
      const known = asFortuneTellerError(error);
      if (known.code === "AMBIGUOUS_OR_NONEXISTENT_LOCAL_TIME" && state.input.time) {
        const repeated = inspectRepeatedLocalTime(state.input);
        if (repeated.kind === "overlap") {
          stdout.write("无法完成计算：这个当地时间在夏令时回拨时出现两次，请明确采用哪一次。\n");
          stdout.write(`较早一次：UTC ${repeated.earlier.utc}（当地偏移 ${repeated.earlier.offset}）\n`);
          stdout.write(`较晚一次：UTC ${repeated.later.utc}（当地偏移 ${repeated.later.offset}）\n`);
          const resolution = await askMenu(rl, "1 较早一次  2 较晚一次  3 修改出生时间  4 取消：", [
            { keys: ["1"], value: "earlier" }, { keys: ["2"], value: "later" },
            { keys: ["3"], value: "edit-time" }, { keys: ["4"], value: "cancel" },
          ]);
          if (resolution === "cancel") return null;
          if (resolution === "edit-time") {
            const time = await askTime(rl, state.input.time);
            if (time) state.input.time = time;
            else delete state.input.time;
            delete state.input.disambiguation;
          } else {
            state.input.disambiguation = resolution;
          }
          continue;
        }
        stdout.write("无法完成计算：这个当地时间处于夏令时跳时区间，在当地钟表上不存在；较早/较晚选项不能修复它。\n");
        const gapAction = await askMenu(rl, "1 修改出生时间  2 修改其他资料  3 取消：", [
          { keys: ["1"], value: "edit-time" }, { keys: ["2"], value: "edit" }, { keys: ["3"], value: "cancel" },
        ]);
        if (gapAction === "cancel") return null;
        if (gapAction === "edit-time") {
          const time = await askTime(rl, state.input.time);
          if (time) state.input.time = time;
          else delete state.input.time;
          delete state.input.disambiguation;
        } else {
          await editInput(rl, state);
        }
        continue;
      }
      stdout.write(`无法完成计算：${friendlyCalculationError(error)}\n`);
      const recovery = await askMenu(rl, "1 修改资料  2 调整高级口径  3 取消：", [
        { keys: ["1"], value: "edit" },
        { keys: ["2"], value: "profile" },
        { keys: ["3"], value: "cancel" },
      ]);
      if (recovery === "cancel") return null;
      if (recovery === "edit") await editInput(rl, state);
      if (recovery === "profile") await chooseProfileAdvanced(rl, state);
    }
  }
}

async function interactive() {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    stdout.write("Fortune Teller 中文向导\n");
    stdout.write("出生资料和私人问题只交给本地程序；不需要姓名或详细地址，程序不会主动联网或保存。\n");
    stdout.write("传统术数用于反思与娱乐，不是经过科学验证的预测。随时输入 q 可退出。\n\n");
    while (true) {
      const route = await chooseGoalAndSystem(rl);
      const state = {
        ...route,
        input: await collectInput(rl, route),
        profile: defaultProfile(route.system),
      };
      let result = await confirmAndCalculate(rl, state);
      if (!result) {
        stdout.write("已取消，没有计算，也没有写入文件。\n");
        return;
      }
      while (result) {
        showResultHome(result, state);
        const action = await resultMenu(rl, result, state);
        if (action === "exit") {
          stdout.write("已结束。本次资料未由程序写入文件。\n");
          return;
        }
        if (action === "new") break;
        const beforeEdit = JSON.stringify(state);
        const editEffect = await editInput(rl, state);
        if (JSON.stringify(state) === beforeEdit) {
          stdout.write("没有修改资料，继续沿用当前结果。\n");
          continue;
        }
        const previousResult = result;
        const recalculated = await confirmAndCalculate(rl, state);
        if (!recalculated) {
          stdout.write("已取消，没有新的计算，也没有写入文件。\n");
          return;
        }
        result = recalculated;
        if (editEffect?.invalidatesPreviousReading) {
          stdout.write("已生成新的牌面或卦象；旧解读作废，下面只使用新结果。\n");
        } else if (result.facts_hash === previousResult.facts_hash) {
          stdout.write("修改后的盘面或牌面事实没有变化；旧的事实部分仍成立，但问题表述与建议需要重新核对。\n");
        } else {
          stdout.write("关键资料已经改变，盘面或牌面也随之变化；旧解读作废，下面只使用新结果。\n");
        }
      }
      stdout.write("\n已清空本次内存状态，开始新的计算。\n");
    }
  } catch (error) {
    if (error instanceof InteractiveQuit) {
      stdout.write("\n已退出，没有写入文件。\n");
      return;
    }
    stdout.write(`\n向导无法继续：${friendlyCalculationError(error)}\n没有写入文件。\n`);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

async function main() {
  const rawArguments = process.argv.slice(2);
  if (rawArguments[0] === "--help") {
    if (rawArguments.length !== 1) {
      throw new FortuneTellerError("INVALID_COMMAND_ARGUMENT", "--help accepts no additional arguments");
    }
    return printHelp();
  }
  const [command = "help", ...rest] = rawArguments;
  const args = parseArgs(rest);
  if (command === "help") {
    if (args._.length || Object.keys(args).some((key) => !["_", "help"].includes(key)) || (args.help != null && args.help !== true)) {
      throw new FortuneTellerError("INVALID_COMMAND_ARGUMENT", "help accepts no arguments other than --help");
    }
    return printHelp();
  }
  validateCommandArgs(command, args);
  if (args.help) return printHelp();
  if ([
    "methods", "sources", "route", "interactive", "calculate", "adjudicate", "adjudicate-bazi", "bind-reading", "validate-reading", "render-reading",
    "freeze-check", "verify-check", "score-check",
  ].includes(command)) {
    await ensureFortuneTellerLoaded();
  }
  if (command === "methods") return emit({ schema_version: "1.0.0", methods: METHODS }, args);
  if (command === "sources") {
    if (args.system && !METHODS.some((method) => method.id === args.system)) {
      throw new FortuneTellerError("UNKNOWN_SYSTEM", "unknown calculation system");
    }
    const sources = args.system ? SOURCES.filter((source) => source.systems.includes(args.system)) : SOURCES;
    const rules = args.system ? RULES.filter((rule) => rule.system === args.system) : RULES;
    return emit({
      schema_version: "1.0.0",
      verification_note: SOURCE_VERIFICATION_NOTE,
      filter: args.system || null,
      sources,
      rules,
      interpretation_profiles: args.system
        ? INTERPRETATION_PROFILES.filter((profile) => profile.system === args.system)
        : INTERPRETATION_PROFILES,
    }, args);
  }
  if (command === "route") {
    const payload = await readJson(args.input, args.json);
    if (!isPlainJsonObject(payload)) {
      throw new FortuneTellerError("METHOD_ROUTER_INPUT_INVALID", "route input must be one goal-and-data JSON object");
    }
    return emit(recommendMethods(payload), args);
  }
  if (command === "interactive") return interactive();
  if (command === "calculate") {
    const payload = await readJson(args.input, args.json);
    if (!isPlainJsonObject(payload)) {
      throw new FortuneTellerError("INVALID_REQUEST_ENVELOPE", "calculation input must be a JSON object");
    }
    const looksEnveloped = Object.hasOwn(payload, "input") || Object.hasOwn(payload, "system") || Object.hasOwn(payload, "profile");
    if (looksEnveloped) {
      const unknown = Object.keys(payload).filter((key) => !["system", "input", "profile"].includes(key));
      if (unknown.length) throw new FortuneTellerError("INVALID_REQUEST_ENVELOPE", `request envelope contains ${unknown.length} unknown field(s)`);
      if (!Object.hasOwn(payload, "input")) throw new FortuneTellerError("INVALID_REQUEST_ENVELOPE", "request envelope requires input");
      if (!isPlainJsonObject(payload.input)) throw new FortuneTellerError("INVALID_REQUEST_ENVELOPE", "request.input must be a JSON object");
      if (Object.hasOwn(payload, "system") && (typeof payload.system !== "string" || !payload.system)) {
        throw new FortuneTellerError("INVALID_REQUEST_ENVELOPE", "request.system must be a non-empty method ID");
      }
      if (
        Object.hasOwn(payload, "profile")
        && !(
          (typeof payload.profile === "string" && payload.profile.length > 0)
          || isPlainJsonObject(payload.profile)
        )
      ) {
        throw new FortuneTellerError("INVALID_REQUEST_ENVELOPE", "request.profile must be a profile ID or JSON object");
      }
      if (
        isPlainJsonObject(payload.profile)
        && Object.hasOwn(payload.profile, "id")
        && (typeof payload.profile.id !== "string" || payload.profile.id.length === 0)
      ) {
        throw new FortuneTellerError("INVALID_REQUEST_ENVELOPE", "request.profile.id must be a non-empty profile ID");
      }
    }
    if (args.system && Object.hasOwn(payload, "system") && args.system !== payload.system) {
      throw new FortuneTellerError("CONFLICTING_SYSTEM", "command and request specify different calculation systems");
    }
    if (args.profile && Object.hasOwn(payload, "profile")) {
      throw new FortuneTellerError("CONFLICTING_PROFILE", "use either --profile or request.profile, not both");
    }
    const system = args.system || payload.system;
    if (!system) throw new FortuneTellerError("MISSING_SYSTEM", "provide --system or a system field in the request JSON");
    const rawProfile = args.profile
      ? await readJson(args.profile)
      : Object.hasOwn(payload, "profile") ? payload.profile : {};
    const input = looksEnveloped ? payload.input : payload;
    return emit(calculate(system, input, rawProfile), args);
  }
  if (command === "adjudicate-bazi") {
    const payload = await readJson(args.input, args.json);
    if (!isPlainJsonObject(payload)) {
      throw new FortuneTellerError("BAZI_ADJUDICATION_INPUT_INVALID", "adjudicate-bazi input must be one calculation object or {calculation, options}");
    }
    if (Object.hasOwn(payload, "calculation") || Object.hasOwn(payload, "options")) {
      const unknown = Object.keys(payload).filter((key) => !["calculation", "options"].includes(key));
      if (unknown.length || !isPlainJsonObject(payload.calculation)) {
        throw new FortuneTellerError("BAZI_ADJUDICATION_INPUT_INVALID", "the wrapper must contain calculation and optional options only");
      }
      if (Object.hasOwn(payload, "options") && !isPlainJsonObject(payload.options)) {
        throw new FortuneTellerError("BAZI_ADJUDICATION_INPUT_INVALID", "adjudication options must be a JSON object");
      }
      return emit(adjudicateBazi(payload.calculation, payload.options || {}), args);
    }
    return emit(adjudicateBazi(payload), args);
  }
  if (command === "adjudicate") {
    const payload = await readJson(args.input, args.json);
    if (!isPlainJsonObject(payload)) {
      throw new FortuneTellerError("ADJUDICATION_INPUT_INVALID", "adjudicate input must be one calculation object or {calculation, options}");
    }
    if (Object.hasOwn(payload, "calculation") || Object.hasOwn(payload, "options")) {
      const unknown = Object.keys(payload).filter((key) => !["calculation", "options"].includes(key));
      if (unknown.length || !isPlainJsonObject(payload.calculation)) {
        throw new FortuneTellerError("ADJUDICATION_INPUT_INVALID", "the wrapper must contain calculation and optional options only");
      }
      if (Object.hasOwn(payload, "options") && !isPlainJsonObject(payload.options)) {
        throw new FortuneTellerError("ADJUDICATION_INPUT_INVALID", "adjudication options must be a JSON object");
      }
      return emit(adjudicate(payload.calculation, payload.options || {}), args);
    }
    return emit(adjudicate(payload), args);
  }
  if (command === "validate-reading") {
    const payload = await readJson(args.input, args.json);
    const result = validateReading(payload);
    await emit(result, args);
    if (!result.valid) process.exitCode = 2;
    return;
  }
  if (command === "bind-reading") {
    const payload = await readJson(args.input, args.json);
    return emit(bindReadingToCalculations(payload), args);
  }
  if (command === "render-reading") {
    const payload = await readJson(args.input, args.json);
    const validation = validateReading(payload);
    if (!validation.valid) {
      throw new FortuneTellerError(
        "READING_VALIDATION_FAILED",
        "reading failed validation; use validate-reading for the technical error list",
        { error_count: validation.errors.length },
      );
    }
    const renderedText = renderReadingText(payload.reading);
    const presentationIssues = ordinaryReadingPresentationIssues(payload, renderedText);
    if (presentationIssues.length) {
      throw new FortuneTellerError(
        "READING_PRESENTATION_FAILED",
        "ordinary reading contains backstage audit material; use an evidence or audit view instead",
        { issue_categories: presentationIssues },
      );
    }
    return emitText(renderedText, args);
  }
  if (command === "freeze-check") {
    const payload = args.reading
      ? {
          reading_payload: await readJson(args.reading),
          claim_ids: args["claim-ids"].split(",").map((value) => value.trim()),
        }
      : await readJson(args.input, args.json);
    return emit(freezeBlindCheck(payload), args);
  }
  if (command === "verify-check") {
    const payload = args.record
      ? { record: await readJson(args.record), reading_payload: await readJson(args.reading) }
      : await readJson(args.input, args.json);
    let result;
    if (isPlainJsonObject(payload) && (Object.hasOwn(payload, "record") || Object.hasOwn(payload, "reading_payload"))) {
      const unknown = Object.keys(payload).filter((key) => !["record", "reading_payload"].includes(key));
      if (unknown.length || !Object.hasOwn(payload, "record") || !Object.hasOwn(payload, "reading_payload")) {
        throw new FortuneTellerError(
          "BLIND_CHECK_VERIFY_INPUT_INVALID",
          "reading-bound verify-check requires exactly record and reading_payload",
        );
      }
      result = verifyBlindCheckReading(payload.record, payload.reading_payload);
    } else {
      result = verifyBlindCheckRecord(payload);
    }
    await emit(result, args);
    if (!result.valid) process.exitCode = 2;
    return;
  }
  if (command === "score-check") {
    const payload = args.record
      ? {
          record: await readJson(args.record),
          reading_payload: await readJson(args.reading),
          adjudications: await readJson(args.adjudications),
        }
      : await readJson(args.input, args.json);
    if (
      !isPlainJsonObject(payload)
      || !Object.hasOwn(payload, "record")
      || !Object.hasOwn(payload, "reading_payload")
      || !Object.hasOwn(payload, "adjudications")
    ) {
      throw new FortuneTellerError(
        "BLIND_CHECK_SCORE_INPUT_INVALID",
        "score-check requires record, reading_payload, and adjudications",
      );
    }
    const unknown = Object.keys(payload).filter((key) => !["record", "reading_payload", "adjudications"].includes(key));
    if (unknown.length) {
      throw new FortuneTellerError("BLIND_CHECK_SCORE_INPUT_INVALID", "score-check received unknown fields");
    }
    return emit(scoreBlindCheck(payload.record, payload.reading_payload, payload.adjudications), args);
  }
  throw new FortuneTellerError("UNKNOWN_COMMAND", "unknown command");
}

main().catch((error) => {
  const known = asFortuneTellerError(error);
  process.stderr.write(`${JSON.stringify({ error: { code: known.code, message: known.message, details: known.details } }, null, 2)}\n`);
  process.exitCode = 1;
});
