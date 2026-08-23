#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { asFortuneTellerError, FortuneTellerError } from "../src/core/errors.mjs";

let calculate;
let METHODS;
let validateReading;

async function ensureFortuneTellerLoaded() {
  if (calculate && METHODS && validateReading) return;
  try {
    ({ calculate, METHODS, validateReading } = await import("../src/index.mjs"));
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
    ["calculate", new Set(["_", "system", "input", "json", "profile", "output", "compact", "pretty", "help"])],
    ["validate-reading", new Set(["_", "input", "json", "output", "compact", "pretty", "help"])],
    ["interactive", new Set(["_", "help"])],
  ]);
  const allowed = allowedByCommand.get(command);
  if (!allowed) throw new FortuneTellerError("UNKNOWN_COMMAND", "unknown command");
  const unknown = Object.keys(args).filter((key) => !allowed.has(key));
  if (unknown.length) throw new FortuneTellerError("INVALID_COMMAND_ARGUMENT", `received ${unknown.length} unknown command flag(s)`);
  if (args._.length) {
    throw new FortuneTellerError("INVALID_COMMAND_ARGUMENT", `received ${args._.length} unexpected positional argument(s)`);
  }
  for (const key of ["input", "output", "profile", "system"]) {
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
  if (command !== "methods" && args.json != null && typeof args.json !== "string") {
    throw new FortuneTellerError("INVALID_COMMAND_ARGUMENT", "--json requires an inline JSON value");
  }
  if (command === "methods" && args.json != null && args.json !== true) {
    throw new FortuneTellerError("INVALID_COMMAND_ARGUMENT", "methods --json does not take a value");
  }
  if (args.input != null && args.json != null) {
    throw new FortuneTellerError("INVALID_COMMAND_ARGUMENT", "use --input or --json, not both");
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

function printHelp() {
  stdout.write(`Fortune Teller\n\n`);
  stdout.write(`Commands:\n`);
  stdout.write(`  methods\n`);
  stdout.write(`  calculate --system <id> --input <file|-> [--profile <file>] [--output <new-file>]\n`);
  stdout.write(`  validate-reading --input <file|->\n`);
  stdout.write(`  interactive\n`);
  stdout.write(`\nUse --json '{...}' instead of --input for a small inline request.\n`);
}

function isPlainJsonObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function concise(result) {
  const facts = result.facts;
  if (result.system === "bazi") {
    return facts.pillars
      ? facts.pillars.map((item) => `${item.pillar}: ${item.stem_branch}`).join(" | ")
      : facts.stable_pillars.map((item) => `${item.pillar}: ${item.alternatives.map((x) => x.value).join("/")}`).join(" | ");
  }
  if (result.system === "ziwei") {
    return facts.summary
      ? `命主 ${facts.summary.soul_star} | 身主 ${facts.summary.body_star} | ${facts.summary.five_elements_class}`
      : `未知时辰：已生成 ${result.sensitivity.candidate_count} 个连续计算候选时段`;
  }
  if (result.system === "western") {
    return facts.planets
      ? facts.planets.map((item) => `${item.label_zh} ${item.sign_zh} ${item.degree_in_sign}°`).join(" | ")
      : `未知时刻：${facts.planet_ranges.filter((item) => item.sign_status !== "stable").length} 个星体跨星座边界`;
  }
  if (result.system === "tarot") return facts.cards.map((item) => `${item.position}: ${item.title_zh} (${item.orientation})`).join(" | ");
  if (result.system === "iching") return `${facts.primary.king_wen_number} ${facts.primary.name} → ${facts.transformed.king_wen_number} ${facts.transformed.name}`;
  if (result.system === "meihua") return `${facts.primary.king_wen_number} ${facts.primary.name} → ${facts.transformed.king_wen_number} ${facts.transformed.name}`;
  return result.system;
}

async function askYes(rl, prompt, defaultYes = false) {
  const suffix = defaultYes ? "Y/n" : "y/N";
  const answer = (await rl.question(`${prompt} ${suffix}：`)).trim().toLowerCase();
  if (!answer) return defaultYes;
  return answer === "y" || answer === "yes" || answer === "是";
}

async function chooseProfile(rl, system) {
  const method = METHODS.find((item) => item.id === system);
  const profiles = method?.profiles || [];
  stdout.write("可用 profile：\n");
  profiles.forEach((profile, index) => stdout.write(`  ${index + 1}. ${profile.id} [${profile.status}]\n`));
  const choice = (await rl.question("选择序号（默认 1）：")).trim();
  if (!choice) return profiles[0]?.id || {};
  const index = Number(choice) - 1;
  if (!Number.isInteger(index) || !profiles[index]) throw new FortuneTellerError("INVALID_CHOICE", "profile 序号无效");
  return profiles[index].id;
}

async function askTarot(rl) {
  const question = await rl.question("请给一个聚焦问题：");
  const spread = (await rl.question("牌阵 one/three/decision/situation-action-outcome/celtic-cross（默认 three）：")).trim() || "three";
  const positions = new Map([
    ["one", ["focus"]],
    ["three", ["past", "present", "future"]],
    ["decision", ["option-a", "option-b", "decision-lens"]],
    ["situation-action-outcome", ["situation", "action", "outcome"]],
    ["celtic-cross", ["present", "challenge", "foundation", "recent-past", "possibility", "near-future", "self", "environment", "hopes-and-fears", "outcome"]],
  ]).get(spread);
  if (!positions) throw new FortuneTellerError("INVALID_SPREAD", "牌阵名称无效");
  stdout.write("抽取来源：1 本地安全随机  2 replay seed  3 实体/手工牌面\n");
  const source = (await rl.question("请选择（默认 1）：")).trim() || "1";
  const input = { question, spread };
  if (source === "1") input.reveal_seed = await askYes(rl, "是否回显 seed 供你自行保存和重放？");
  else if (source === "2") input.seed = await rl.question("请输入非空 replay seed：");
  else if (source === "3") {
    input.cards = [];
    for (const position of positions) {
      const card = await rl.question(`${position} 牌名或 ID：`);
      const orientation = (await rl.question(`${position} 方向 upright/reversed（默认 upright）：`)).trim() || "upright";
      input.cards.push({ card, orientation });
    }
  } else throw new FortuneTellerError("INVALID_CHOICE", "抽取来源必须是 1、2 或 3");
  return input;
}

async function askIching(rl) {
  const question = await rl.question("请给一个聚焦问题：");
  stdout.write("起卦来源：1 本地安全三钱  2 replay seed  3 实体/手工六爻\n");
  const source = (await rl.question("请选择（默认 1）：")).trim() || "1";
  const input = { question };
  if (source === "1") input.reveal_seed = await askYes(rl, "是否回显 seed 供你自行保存和重放？");
  else if (source === "2") input.seed = await rl.question("请输入非空 replay seed：");
  else if (source === "3") {
    const text = await rl.question("请输入自下而上的 6 个爻值（6/7/8/9，以逗号分隔）：");
    input.lines = text.split(",").map((value) => Number(value.trim()));
  } else throw new FortuneTellerError("INVALID_CHOICE", "起卦来源必须是 1、2 或 3");
  return input;
}

async function askBirth(rl, { ziwei = false, western = false } = {}) {
  const input = {
    date: await rl.question("出生日期 YYYY-MM-DD："),
    time: await rl.question("出生时间 HH:mm（不知道可留空）："),
    timezone: await rl.question("IANA 时区（如 Asia/Shanghai）："),
  };
  if (!input.time) delete input.time;
  if (ziwei) input.chart_sex = await rl.question("排盘阴阳参数 male/female（仅用于传统算法）：");
  const coordinates = await rl.question(western ? "纬度,经度（如 31.23,121.47；可留空但将无宫位）：" : "纬度,经度（真太阳时才需要，默认可留空）：");
  if (coordinates.trim()) {
    if (coordinates.includes("，")) throw new FortuneTellerError("INVALID_COORDINATE", "经纬度请使用英文逗号分隔");
    const values = coordinates.split(",").map((value) => value.trim());
    if (values.length !== 2 || values.some((value) => value === "")) {
      throw new FortuneTellerError("INVALID_COORDINATE", "经纬度必须成对填写，例如 31.23,121.47");
    }
    const [latitude, longitude] = values.map(Number);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new FortuneTellerError("INVALID_COORDINATE", "经纬度必须是有限数字");
    }
    input.latitude = latitude;
    input.longitude = longitude;
  }
  return input;
}

async function interactive() {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    stdout.write("本工具默认离线、不保存资料。传统术数结果用于反思与娱乐，不是经验证的预测。\n");
    stdout.write("1 八字  2 紫微  3 西洋本命盘  4 塔罗  5 周易三钱  6 梅花两数\n");
    const choice = await rl.question("请选择：");
    const system = new Map([
      ["1", "bazi"], ["2", "ziwei"], ["3", "western"],
      ["4", "tarot"], ["5", "iching"], ["6", "meihua"],
    ]).get(choice.trim());
    if (!system) throw new FortuneTellerError("INVALID_CHOICE", "请选择 1 到 6");
    let input;
    if (system === "bazi") input = await askBirth(rl);
    if (system === "ziwei") input = await askBirth(rl, { ziwei: true });
    if (system === "western") input = await askBirth(rl, { western: true });
    if (system === "tarot") input = await askTarot(rl);
    if (system === "iching") input = await askIching(rl);
    if (system === "meihua") {
      input = {
        question: await rl.question("问题（可留空）："),
        first_number: Number(await rl.question("第一个正整数：")),
        second_number: Number(await rl.question("第二个正整数：")),
      };
      const movingLine = (await rl.question("动爻 1–6（留空则按两数规则计算）：")).trim();
      if (movingLine) input.moving_line = Number(movingLine);
    }
    const profile = await chooseProfile(rl, system);
    stdout.write(`\n请确认：\n${JSON.stringify({ system, input, profile }, null, 2)}\n`);
    if (!await askYes(rl, "按以上信息在本地计算？", true)) {
      stdout.write("已取消，未计算也未保存。\n");
      return;
    }
    const result = calculate(system, input, profile);
    stdout.write(`\n${concise(result)}\n`);
    if (result.warnings.length) stdout.write(`提示：\n- ${result.warnings.join("\n- ")}\n`);
    stdout.write(`事实哈希：${result.facts_hash}\n`);
    stdout.write(`完整审计哈希：${result.reproducibility_hash}\n`);
    if (result.meta?.rng?.replay_seed) stdout.write(`复现种子：${result.meta.rng.replay_seed}\n`);
    if (await askYes(rl, "查看完整审计 JSON？")) await emit(result);
  } finally {
    rl.close();
  }
}

async function main() {
  const [command = "help", ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  if (command === "help") {
    if (args._.length || Object.keys(args).some((key) => !["_", "help"].includes(key)) || (args.help != null && args.help !== true)) {
      throw new FortuneTellerError("INVALID_COMMAND_ARGUMENT", "help accepts no arguments other than --help");
    }
    return printHelp();
  }
  validateCommandArgs(command, args);
  if (args.help) return printHelp();
  if (["methods", "interactive", "calculate", "validate-reading"].includes(command)) {
    await ensureFortuneTellerLoaded();
  }
  if (command === "methods") return emit({ schema_version: "1.0.0", methods: METHODS }, args);
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
  if (command === "validate-reading") {
    const payload = await readJson(args.input, args.json);
    const result = validateReading(payload);
    await emit(result, args);
    if (!result.valid) process.exitCode = 2;
    return;
  }
  throw new FortuneTellerError("UNKNOWN_COMMAND", "unknown command");
}

main().catch((error) => {
  const known = asFortuneTellerError(error);
  process.stderr.write(`${JSON.stringify({ error: { code: known.code, message: known.message, details: known.details } }, null, 2)}\n`);
  process.exitCode = 1;
});
