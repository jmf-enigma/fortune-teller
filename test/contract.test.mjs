import test from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { astro } from "iztro";
import { calculate, METHODS, validateReading } from "../src/index.mjs";
import { calculateFactsHash, calculateReproducibilityHash } from "../src/core/result.mjs";

test("method discovery exposes live schemas, profiles, and usage", () => {
  const stable = METHODS.filter((method) => method.status !== "planned");
  assert.ok(stable.every((method) => method.usage && method.inputSchema && method.profiles.length));
  assert.equal(METHODS.find((method) => method.id === "liuyao").engine, null);
});

test("the exported method registry cannot be mutated to weaken validation", () => {
  const method = METHODS.find((item) => item.id === "iching");
  assert.throws(() => { method.inputSchema.additionalProperties = true; }, TypeError);
  assert.throws(
    () => calculate("iching", { question: "fixture", lines: [7, 7, 7, 7, 7, 7], typo: true }),
    (error) => error.code === "INPUT_SCHEMA_VIOLATION",
  );
});

test("CLI accepts system inside a request envelope", () => {
  const request = JSON.stringify({ system: "iching", input: { question: "fixture", lines: [7, 7, 7, 7, 7, 7] } });
  const result = spawnSync(process.execPath, ["scripts/fortune-teller.mjs", "calculate", "--input", "-", "--compact"], {
    cwd: new URL("..", import.meta.url),
    input: request,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).facts.primary.king_wen_number, 1);
});

test("CLI rejects null JSON as a stable request error", () => {
  const result = spawnSync(process.execPath, ["scripts/fortune-teller.mjs", "calculate", "--system", "iching", "--json", "null"], {
    cwd: new URL("..", import.meta.url), encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stderr).error.code, "INVALID_REQUEST_ENVELOPE");
});

test("CLI JSON parse errors do not echo private input", () => {
  const secret = "TOPSECRET_987654";
  const result = spawnSync(process.execPath, [
    "scripts/fortune-teller.mjs", "calculate", "--system", "bazi", "--json", `{"private": ${secret}}`,
  ], { cwd: new URL("..", import.meta.url), encoding: "utf8" });
  assert.equal(result.status, 1);
  const error = JSON.parse(result.stderr).error;
  assert.equal(error.code, "INVALID_JSON");
  assert.equal(error.details.cause, "JSON_SYNTAX_ERROR");
  assert.doesNotMatch(result.stderr, new RegExp(secret));
});

test("CLI does not treat explicit null, false, or empty envelope fields as omitted", () => {
  const requests = [
    { system: null, input: { question: "fixture", lines: [7, 7, 7, 7, 7, 7] } },
    { system: "iching", input: { question: "fixture", lines: [7, 7, 7, 7, 7, 7] }, profile: null },
    { system: "iching", input: { question: "fixture", lines: [7, 7, 7, 7, 7, 7] }, profile: false },
    { system: "iching", input: { question: "fixture", lines: [7, 7, 7, 7, 7, 7] }, profile: "" },
    { system: "iching", input: { question: "fixture", lines: [7, 7, 7, 7, 7, 7] }, profile: { id: "" } },
  ];
  for (const request of requests) {
    const result = spawnSync(process.execPath, [
      "scripts/fortune-teller.mjs", "calculate", "--system", "iching", "--json", JSON.stringify(request),
    ], { cwd: new URL("..", import.meta.url), encoding: "utf8" });
    assert.equal(result.status, 1, result.stdout);
    assert.equal(JSON.parse(result.stderr).error.code, "INVALID_REQUEST_ENVELOPE");
  }
});

test("CLI preserves strict registry-profile validation", () => {
  const request = {
    system: "iching",
    input: { question: "fixture", lines: [7, 7, 7, 7, 7, 7] },
    profile: { id: "iching-three-coin-v1", config: {}, typo: true },
  };
  const result = spawnSync(process.execPath, [
    "scripts/fortune-teller.mjs", "calculate", "--json", JSON.stringify(request),
  ], { cwd: new URL("..", import.meta.url), encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stderr).error.code, "INVALID_PROFILE");
});

test("CLI rejects missing, conflicting, and misspelled flags", () => {
  const invocations = [
    ["calculate", "--system", "iching", "--input"],
    ["calculate", "--system", "iching", "--input", "fixture.json", "--json", "{}"],
    ["calculate", "--system", "iching", "--json", "{}", "--outpt", "result.json"],
    ["calculate", "--system=iching", "--json", "{}", "--profile="],
    ["calculate", "--system", "tarot", "--system", "iching", "--json", "{}"],
    ["calculate", "--system", "iching", "--json", "{}", "--json", "{}"],
    ["methods", "--output", "first.json", "--output", "second.json"],
    ["methods", "--help", "--unknown", "secret"],
    ["methods", "--__proto__"],
    ["methods", "--constructor"],
    ["methods", "--_"],
    ["methods", "--=secret"],
    ["methods", "--output="],
  ];
  for (const invocation of invocations) {
    const result = spawnSync(process.execPath, ["scripts/fortune-teller.mjs", ...invocation], {
      cwd: new URL("..", import.meta.url), encoding: "utf8",
    });
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stderr).error.code, "INVALID_COMMAND_ARGUMENT");
  }
});

test("CLI inline flag values preserve additional equals signs", () => {
  const request = JSON.stringify({ question: "a=b", lines: [7, 7, 7, 7, 7, 7] });
  const result = spawnSync(process.execPath, [
    "scripts/fortune-teller.mjs", "calculate", "--system=iching", `--json=${request}`, "--compact",
  ], { cwd: new URL("..", import.meta.url), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).input.question, "a=b");
});

test("CLI prototype-like command names return UNKNOWN_COMMAND instead of crashing", () => {
  for (const command of ["__proto__", "constructor", "toString", "hasOwnProperty"]) {
    const result = spawnSync(process.execPath, ["scripts/fortune-teller.mjs", command], {
      cwd: new URL("..", import.meta.url), encoding: "utf8",
    });
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stderr).error.code, "UNKNOWN_COMMAND");
  }
});

test("interactive lookups reject prototype-like choices without an internal error", async () => {
  const systemChoice = spawnSync(process.execPath, ["scripts/fortune-teller.mjs", "interactive"], {
    cwd: new URL("..", import.meta.url), input: "__proto__\n", encoding: "utf8",
  });
  assert.equal(systemChoice.status, 1);
  assert.equal(JSON.parse(systemChoice.stderr).error.code, "INVALID_CHOICE");

  const child = spawn(process.execPath, ["scripts/fortune-teller.mjs", "interactive"], {
    cwd: new URL("..", import.meta.url), stdio: ["pipe", "pipe", "pipe"],
  });
  let transcript = "";
  let stderr = "";
  let stage = 0;
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.stdout.on("data", (chunk) => {
    transcript += chunk;
    if (stage === 0 && transcript.includes("请选择：")) { stage = 1; child.stdin.write("4\n"); }
    if (stage === 1 && transcript.includes("请给一个聚焦问题：")) { stage = 2; child.stdin.write("fixture\n"); }
    if (stage === 2 && transcript.includes("牌阵 one/three")) { stage = 3; child.stdin.write("__proto__\n"); }
  });
  const status = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  assert.equal(status, 1);
  assert.equal(JSON.parse(stderr).error.code, "INVALID_SPREAD");
});

test("interactive Meihua flow confirms, calculates, and offers the audit output", async () => {
  const child = spawn(process.execPath, ["scripts/fortune-teller.mjs", "interactive"], {
    cwd: new URL("..", import.meta.url), stdio: ["pipe", "pipe", "pipe"],
  });
  const steps = [
    ["请选择：", "6\n"],
    ["问题（可留空）：", "fixture\n"],
    ["第一个正整数：", "8\n"],
    ["第二个正整数：", "13\n"],
    ["动爻 1–6", "4\n"],
    ["选择序号（默认 1）：", "\n"],
    ["按以上信息在本地计算？", "\n"],
    ["查看完整审计 JSON？", "\n"],
  ];
  let transcript = "";
  let stderr = "";
  let stage = 0;
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.stdout.on("data", (chunk) => {
    transcript += chunk;
    while (stage < steps.length && transcript.includes(steps[stage][0])) {
      child.stdin.write(steps[stage][1]);
      stage += 1;
    }
  });
  const status = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("interactive smoke test timed out"));
    }, 5_000);
    child.once("error", (error) => { clearTimeout(timeout); reject(error); });
    child.once("close", (code) => { clearTimeout(timeout); resolve(code); });
  });
  assert.equal(status, 0, stderr);
  assert.equal(stage, steps.length);
  assert.match(transcript, /"moving_line": 4/);
  assert.match(transcript, /事实哈希：/);
  assert.equal(stderr, "");
});

test("CLI refuses to overwrite an existing output file with a stable error", () => {
  const result = spawnSync(process.execPath, ["scripts/fortune-teller.mjs", "methods", "--output", "package.json"], {
    cwd: new URL("..", import.meta.url), encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stderr).error.code, "OUTPUT_EXISTS");
  assert.doesNotMatch(result.stderr, /package\.json/);
});

test("CLI positional-argument errors do not echo private values", () => {
  const secret = "PRIVATE_BIRTH_NOTE_864209";
  const result = spawnSync(process.execPath, ["scripts/fortune-teller.mjs", "methods", secret], {
    cwd: new URL("..", import.meta.url), encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stderr).error.code, "INVALID_COMMAND_ARGUMENT");
  assert.doesNotMatch(result.stderr, new RegExp(secret));
});

test("CLI semantic time errors do not echo private birth values", () => {
  const fixtures = [
    {
      input: { date: "2024-03-10", time: "02:31", timezone: "America/New_York" },
      privateValues: ["2024-03-10", "02:31", "America/New_York"],
    },
    {
      input: { date: "2024-03-11", time: "02:31", timezone: "PRIVATE/ZONE_48261" },
      privateValues: ["2024-03-11", "02:31", "PRIVATE/ZONE_48261"],
    },
  ];
  for (const fixture of fixtures) {
    const result = spawnSync(process.execPath, [
      "scripts/fortune-teller.mjs", "calculate", "--system", "bazi", "--json", JSON.stringify(fixture.input),
    ], { cwd: new URL("..", import.meta.url), encoding: "utf8" });
    assert.equal(result.status, 1);
    for (const privateValue of fixture.privateValues) assert.doesNotMatch(result.stderr, new RegExp(privateValue.replaceAll("/", "\\/")));
  }
});

test("CLI schema errors do not echo unknown private fields or values", () => {
  const secretKey = "PRIVATE_DIAGNOSIS_57219";
  const secretValue = "PRIVATE_VALUE_83640";
  const input = { date: "2000-08-16", timezone: "Asia/Shanghai", [secretKey]: secretValue };
  const result = spawnSync(process.execPath, [
    "scripts/fortune-teller.mjs", "calculate", "--system", "bazi", "--json", JSON.stringify(input),
  ], { cwd: new URL("..", import.meta.url), encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stderr).error.code, "INPUT_SCHEMA_VIOLATION");
  assert.doesNotMatch(result.stderr, new RegExp(`${secretKey}|${secretValue}`));
});

test("CLI reports file-read failures without leaking the requested path", () => {
  const missing = "/definitely/not/here/private-birth-record.json";
  const result = spawnSync(process.execPath, [
    "scripts/fortune-teller.mjs", "calculate", "--system", "bazi", "--input", missing,
  ], { cwd: new URL("..", import.meta.url), encoding: "utf8" });
  assert.equal(result.status, 1);
  const error = JSON.parse(result.stderr).error;
  assert.equal(error.code, "INPUT_READ_FAILED");
  assert.equal(error.details.cause, "ENOENT");
  assert.doesNotMatch(error.message, /private-birth-record/);
});

test("CLI reports an actionable error when locked dependencies are not installed", () => {
  const temporary = mkdtempSync(join(tmpdir(), "fortune-teller-no-deps-"));
  try {
    mkdirSync(join(temporary, "scripts"));
    cpSync(new URL("../scripts/fortune-teller.mjs", import.meta.url), join(temporary, "scripts/fortune-teller.mjs"));
    cpSync(new URL("../src", import.meta.url), join(temporary, "src"), { recursive: true });
    const result = spawnSync(process.execPath, ["scripts/fortune-teller.mjs", "methods"], {
      cwd: temporary, encoding: "utf8",
    });
    assert.equal(result.status, 1);
    const error = JSON.parse(result.stderr).error;
    assert.equal(error.code, "DEPENDENCY_LOAD_FAILED");
    assert.match(error.message, /npm ci --ignore-scripts/);
    assert.doesNotMatch(result.stderr, /at .*\.mjs:/);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test("planned engines fail closed instead of improvising", () => {
  assert.throws(() => calculate("liuyao", {}), (error) => error.code === "SYSTEM_NOT_IMPLEMENTED");
});

test("birth-chart engines disclose and enforce their release-tested date range", () => {
  for (const system of ["bazi", "ziwei", "western"]) {
    const method = METHODS.find((item) => item.id === system);
    assert.deepEqual(method.validated_date_range, { min: "1900-01-01", max: "2100-12-31" });
  }
  assert.throws(
    () => calculate("bazi", { date: "1899-12-31", timezone: "UTC" }),
    (error) => error.code === "OUTSIDE_VALIDATED_RANGE",
  );
  assert.throws(
    () => calculate("ziwei", { date: "2101-01-01", timezone: "UTC", chart_sex: "male" }),
    (error) => error.code === "OUTSIDE_VALIDATED_RANGE",
  );
  assert.throws(
    () => calculate("western", { date: "2101-01-01", timezone: "UTC" }),
    (error) => error.code === "OUTSIDE_VALIDATED_RANGE",
  );
  for (const date of ["1900-01-01", "2100-12-31"]) {
    assert.doesNotThrow(() => calculate("bazi", { date, time: "23:59:59", timezone: "UTC" }));
    assert.doesNotThrow(() => calculate("ziwei", { date, time: "23:59:59", timezone: "UTC", chart_sex: "male" }));
    assert.doesNotThrow(() => calculate("western", { date, time: "23:59:59", timezone: "UTC" }));
  }
});

test("input typos fail closed instead of silently redrawing or changing defaults", () => {
  assert.throws(
    () => calculate("tarot", { question: "fixture", spread: "three", card: ["The Fool"] }),
    (error) => error.code === "INPUT_SCHEMA_VIOLATION",
  );
  assert.throws(
    () => calculate("iching", { question: "fixture", line: [7, 7, 7, 7, 7, 7] }),
    (error) => error.code === "INPUT_SCHEMA_VIOLATION",
  );
  assert.throws(
    () => calculate("meihua", { first_number: 1, second_number: 2, movingLine: 6 }),
    (error) => error.code === "INPUT_SCHEMA_VIOLATION",
  );
});

test("profile IDs cannot be spoofed or detached from their fixed configuration", () => {
  assert.throws(
    () => calculate("iching", { question: "fixture", lines: [7, 7, 7, 7, 7, 7] }, { id: "trusted-looking-id" }),
    (error) => error.code === "UNKNOWN_PROFILE_ID",
  );
  assert.throws(
    () => calculate("iching", { question: "fixture", lines: [7, 7, 7, 7, 7, 7] }, {
      id: "iching-three-coin-v1", coin_values: { heads: 99, tails: 1 }, line_order: "bottom-up",
    }),
    (error) => error.code === "PROFILE_ID_CONFIG_MISMATCH",
  );
  assert.throws(
    () => calculate("iching", { question: "fixture", lines: [7, 7, 7, 7, 7, 7] }, null),
    (error) => error.code === "INVALID_PROFILE",
  );
  assert.throws(
    () => calculate("iching", { question: "fixture", lines: [7, 7, 7, 7, 7, 7] }, { id: "" }),
    (error) => error.code === "INVALID_PROFILE",
  );
  assert.throws(
    () => calculate("iching", { question: "fixture", lines: [7, 7, 7, 7, 7, 7] }, {
      id: "not-real", config: { id: "iching-three-coin-v1" },
    }),
    (error) => error.code === "INVALID_PROFILE",
  );
  assert.throws(
    () => calculate("iching", { question: "fixture", lines: [7, 7, 7, 7, 7, 7] }, {
      id: "iching-three-coin-v1", config: { id: "" },
    }),
    (error) => error.code === "INVALID_PROFILE",
  );
  assert.throws(
    () => calculate("iching", { question: "fixture", lines: [7, 7, 7, 7, 7, 7] }, {
      id: "iching-three-coin-v1", status: "preview", config: {},
    }),
    (error) => error.code === "PROFILE_REGISTRY_METADATA_MISMATCH",
  );
});

test("prototype-like custom profile fields are rejected as unknown", () => {
  for (const key of ["__proto__", "constructor", "toString"]) {
    const profile = JSON.parse(`{"${key}":"private-value"}`);
    assert.throws(
      () => calculate("iching", { question: "fixture", lines: [7, 7, 7, 7, 7, 7] }, profile),
      (error) => error.code === "INVALID_PROFILE",
    );
  }
});

test("direct API input and profiles cannot inherit hidden optional fields", () => {
  const input = Object.create({ spread: "one" });
  input.question = "fixture";
  assert.throws(() => calculate("tarot", input), (error) => error.code === "INPUT_SCHEMA_VIOLATION");
  const profile = Object.create({ day_boundary: "zi-start" });
  assert.throws(
    () => calculate("bazi", { date: "2000-08-16", time: "04:00", timezone: "Asia/Shanghai" }, profile),
    (error) => error.code === "INVALID_PROFILE",
  );
  const cyclicProfile = { aspect_orbs_degrees: {} };
  cyclicProfile.aspect_orbs_degrees.self = cyclicProfile.aspect_orbs_degrees;
  assert.throws(
    () => calculate("western", { date: "2000-08-16", timezone: "UTC" }, cyclicProfile),
    (error) => error.code === "INVALID_PROFILE",
  );
  const cyclicCards = [];
  cyclicCards.push(cyclicCards);
  assert.throws(
    () => calculate("tarot", { question: "fixture", spread: "one", cards: cyclicCards }),
    (error) => error.code === "INPUT_SCHEMA_VIOLATION",
  );
  const getterProfile = {};
  Object.defineProperty(getterProfile, "reversals", {
    enumerable: true,
    get() { throw new Error("PROFILE_GETTER_SECRET"); },
  });
  assert.throws(
    () => calculate("tarot", { question: "fixture", spread: "one", cards: ["The Fool"] }, getterProfile),
    (error) => error.code === "INVALID_PROFILE" && !error.message.includes("PROFILE_GETTER_SECRET"),
  );
  const proxyProfile = new Proxy({}, { ownKeys() { throw new Error("PROFILE_PROXY_SECRET"); } });
  assert.throws(
    () => calculate("iching", { question: "fixture", lines: [7, 7, 7, 7, 7, 7] }, proxyProfile),
    (error) => error.code === "INVALID_PROFILE" && !error.message.includes("PROFILE_PROXY_SECRET"),
  );
});

test("custom profiles reject null fallbacks instead of mislabeling the calculation", () => {
  assert.throws(
    () => calculate("bazi", { date: "2000-08-16", time: "04:00", timezone: "Asia/Shanghai" }, { day_boundary: null }),
    (error) => error.code === "INVALID_PROFILE",
  );
  assert.throws(
    () => calculate("western", { date: "2000-08-16", time: "04:00", timezone: "Asia/Shanghai" }, { aspect_orbs_degrees: null }),
    (error) => error.code === "INVALID_PROFILE",
  );
  assert.throws(
    () => calculate("ziwei", {
      date: "2000-08-16", time: "04:00", timezone: "Asia/Shanghai", chart_sex: "female",
    }, { year_divide: null }),
    (error) => error.code === "INVALID_PROFILE",
  );
});

test("Tarot rejects prototype properties and profile-conflicting manual reversals", () => {
  assert.throws(
    () => calculate("tarot", { question: "fixture", spread: "toString" }),
    (error) => error.code === "INPUT_SCHEMA_VIOLATION",
  );
  assert.throws(
    () => calculate("tarot", {
      question: "fixture", spread: "one", cards: [{ card: "The Fool", orientation: "reversed" }],
    }, "tarot-rws-upright-only-v1"),
    (error) => error.code === "PROFILE_CARD_CONFLICT",
  );
  assert.throws(
    () => calculate("tarot", {
      question: "fixture", spread: "one", cards: [{ card: "The Fool", orientaton: "reversed" }],
    }),
    (error) => error.code === "INPUT_SCHEMA_VIOLATION",
  );
  assert.throws(
    () => calculate("tarot", {
      question: "fixture", spread: "one", cards: [{ card: "The Fool", id: "major-13" }],
    }),
    (error) => error.code === "INPUT_SCHEMA_VIOLATION",
  );
  const trimmedChinese = calculate("tarot", {
    question: "fixture", spread: "one", cards: [" 愚人 "],
  });
  assert.equal(trimmedChinese.facts.cards[0].card_id, "major-00");
});

test("Zi Wei profile calls do not pollute later calculations", () => {
  const input = { date: "2000-08-16", time: "04:00", timezone: "Asia/Shanghai", chart_sex: "female" };
  const firstDefault = calculate("ziwei", input, "ziwei-default-v1");
  calculate("ziwei", input, "ziwei-zhongzhou-v1");
  const secondDefault = calculate("ziwei", input, "ziwei-default-v1");
  assert.equal(firstDefault.facts_hash, secondDefault.facts_hash);
  assert.deepEqual(firstDefault.facts, secondDefault.facts);
});

test("Zi Wei calculations are isolated from host iztro configuration and plugins", () => {
  const input = { date: "2000-08-16", time: "04:00", timezone: "Asia/Shanghai", chart_sex: "female" };
  const baseline = calculate("ziwei", input, "ziwei-default-v1");
  const original = astro.getConfig();
  const originalTables = {
    brightness: structuredClone(original.brightness),
    mutagens: structuredClone(original.mutagens),
  };
  try {
    astro.config({
      brightness: { 紫微: Array(12).fill("陷") },
      mutagens: { 甲: ["破军", "巨门", "太阴", "贪狼"] },
      algorithm: "zhongzhou",
    });
    astro.loadPlugin(function polluteHostChart() {
      this.soul = "PLUGIN-POLLUTED";
      this.palaces[0].name = "PLUGIN-PALACE";
    });
    const hostState = structuredClone(astro.getConfig());
    const isolated = calculate("ziwei", input, "ziwei-default-v1");
    assert.equal(isolated.facts_hash, baseline.facts_hash);
    assert.deepEqual(isolated.facts, baseline.facts);
    assert.deepEqual(astro.getConfig(), hostState);
  } finally {
    const active = astro.getConfig();
    for (const key of Object.keys(active.brightness)) delete active.brightness[key];
    for (const key of Object.keys(active.mutagens)) delete active.mutagens[key];
    Object.assign(active.brightness, originalTables.brightness);
    Object.assign(active.mutagens, originalTables.mutagens);
    astro.config({
      yearDivide: original.yearDivide,
      horoscopeDivide: original.horoscopeDivide,
      ageDivide: original.ageDivide,
      dayDivide: original.dayDivide,
      algorithm: original.algorithm,
    });
  }
});

test("randomness inputs cannot be silently ignored", () => {
  assert.throws(
    () => calculate("tarot", { question: "fixture", spread: "one", cards: ["The Fool"], seed: "x" }),
    (error) => error.code === "CONFLICTING_RANDOMNESS_INPUT",
  );
  assert.throws(
    () => calculate("iching", { question: "fixture", lines: [7, 7, 7, 7, 7, 7], reveal_seed: true }),
    (error) => error.code === "INVALID_REVEAL_SEED",
  );
  assert.throws(
    () => calculate("tarot", { question: "fixture", seed: "" }),
    (error) => error.code === "INPUT_SCHEMA_VIOLATION",
  );
});

test("reading validator traces facts and rejects unsupported probabilities", () => {
  const calculation = calculate("iching", { question: "fixture", lines: [7, 7, 7, 7, 7, 7] });
  const valid = validateReading({
    calculation,
    reading: {
      system: "iching",
      level: "standard",
      disclaimer: "Traditional reflective interpretation, not a validated prediction.",
      summary: "Fixture",
      claims: [{
        claim_id: "C-01",
        statement: "This is a traditional interpretive prompt.",
        epistemic_status: "interpretation",
        system: "iching",
        profile: calculation.profile.id,
        fact_ids: ["F-YJ-H01"],
        rule_ids: ["R-YJ-001"],
        calculation_certainty: "high",
        input_sensitivity: { label: "stable", coverage: null },
        school_stability: "profile_specific",
        source_status: "engine_documented",
        source_ids: [],
      }],
      next_steps: [],
    },
  });
  assert.equal(valid.valid, true);
  const invalid = validateReading({
    calculation,
    reading: {
      system: "iching",
      level: "standard",
      disclaimer: "Traditional reflective interpretation, not a validated prediction.",
      summary: "Fixture",
      prediction_probability: 0.9,
      claims: [{
        claim_id: "C-01", statement: "x", epistemic_status: "interpretation", system: "iching",
        profile: calculation.profile.id, fact_ids: ["missing"], rule_ids: [], calculation_certainty: "high",
        input_sensitivity: { label: "stable", coverage: null }, school_stability: "profile_specific",
        source_status: "engine_documented", source_ids: [],
      }],
      next_steps: [],
    },
  });
  assert.equal(invalid.valid, false);
  assert.match(invalid.errors.join("\n"), /unknown fact_id/);
  assert.match(invalid.errors.join("\n"), /predictive probability/);
});

test("reading validator returns errors instead of crashing on wrong ID types", () => {
  const calculation = calculate("iching", { question: "fixture", lines: [7, 7, 7, 7, 7, 7] });
  const result = validateReading({
    calculation,
    reading: {
      system: "iching", level: "standard", disclaimer: "Not a validated prediction.", summary: "Fixture",
      claims: [{
        claim_id: "C-01", statement: "x", epistemic_status: "interpretation", system: "iching",
        profile: calculation.profile.id, fact_ids: [42], rule_ids: ["R-YJ-001"], calculation_certainty: "high",
        input_sensitivity: { label: "stable", coverage: null }, school_stability: "profile_specific",
        source_status: "engine_documented", source_ids: "oops",
      }],
      next_steps: [],
    },
  });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /fact_ids entries must be strings/);
  assert.match(result.errors.join("\n"), /source_ids must be an array/);

  const cyclic = { calculation, reading: {} };
  cyclic.reading.self = cyclic;
  const cyclicResult = validateReading(cyclic);
  assert.equal(cyclicResult.valid, false);
  assert.match(cyclicResult.errors.join("\n"), /finite, acyclic plain JSON/);
});

test("reading validator fails closed for prototype-like system IDs", () => {
  const calculation = calculate("iching", { question: "fixture", lines: [7, 7, 7, 7, 7, 7] });
  for (const system of ["__proto__", "constructor", "toString"]) {
    const result = validateReading({
      calculation,
      reading: {
        system: "iching", level: "standard", disclaimer: "Not a validated prediction.", summary: "Fixture",
        claims: [{
          claim_id: "C-01", statement: "x", epistemic_status: "traditional_rule", system,
          profile: calculation.profile.id, fact_ids: [], rule_ids: ["R-X"], calculation_certainty: "unavailable",
          input_sensitivity: { label: "unavailable", coverage: null }, school_stability: "not_assessed",
          source_status: "unavailable", source_ids: [],
        }],
        next_steps: [],
      },
    });
    assert.equal(result.valid, false);
    assert.match(result.errors.join("\n"), /unsupported|does not match|unknown rule_id/);
  }
});

test("reading validator rejects tampered envelopes and mismatched claim bindings", () => {
  const calculation = calculate("iching", { question: "fixture", lines: [7, 7, 7, 7, 7, 7] });
  const tampered = structuredClone(calculation);
  tampered.facts.primary.name = "tampered";
  const result = validateReading({
    calculation: tampered,
    reading: {
      system: "western", level: "standard", disclaimer: "Not a validated prediction.", summary: "Fixture",
      claims: [{
        claim_id: "C-01", statement: "x", epistemic_status: "interpretation", system: "western",
        profile: "made-up-profile", fact_ids: ["F-YJ-H01"], rule_ids: ["R-FAKE-001"],
        calculation_certainty: "high", input_sensitivity: { label: "stable", coverage: null },
        school_stability: "stable", source_status: "verified", source_ids: ["S-FAKE"],
      }],
      next_steps: [],
    },
  });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /facts_hash does not match/);
  assert.match(result.errors.join("\n"), /reading.system must match/);
  assert.match(result.errors.join("\n"), /system does not match/);
  assert.match(result.errors.join("\n"), /unknown rule_id/);
  assert.match(result.errors.join("\n"), /no verified source registry/);
});

test("reading validator enforces the calculation schema at runtime", () => {
  const calculation = calculate("iching", { question: "fixture", lines: [7, 7, 7, 7, 7, 7] });
  const makeReading = (system = calculation.system) => ({
    system,
    level: "standard",
    disclaimer: "Not a validated prediction.",
    summary: "Fixture",
    claims: [{
      claim_id: "C-01",
      statement: "Calculated hexagram fact.",
      epistemic_status: "calculation_fact",
      system,
      profile: calculation.profile.id,
      fact_ids: ["F-YJ-H01"],
      rule_ids: [],
      calculation_certainty: "high",
      input_sensitivity: { label: "stable", coverage: null },
      school_stability: "stable",
      source_status: "engine_documented",
      source_ids: [],
    }],
    next_steps: [],
  });

  const forgedSystem = structuredClone(calculation);
  forgedSystem.system = "fake";
  forgedSystem.facts_hash = calculateFactsHash(forgedSystem);
  forgedSystem.reproducibility_hash = calculateReproducibilityHash(forgedSystem);
  const forgedResult = validateReading({ calculation: forgedSystem, reading: makeReading("fake") });
  assert.equal(forgedResult.valid, false);
  assert.match(forgedResult.errors.join("\n"), /system must be one of/);
  assert.match(forgedResult.errors.join("\n"), /reading.system must be one of/);

  for (const generatedAt of ["0", "2020-01-01"]) {
    const looseTimestamp = structuredClone(calculation);
    looseTimestamp.generated_at = generatedAt;
    const timestampResult = validateReading({ calculation: looseTimestamp, reading: makeReading() });
    assert.equal(timestampResult.valid, false);
    assert.match(timestampResult.errors.join("\n"), /canonical UTC ISO date-time/);
  }

  const shapeResult = validateReading({
    calculation: null,
    calculations: [calculation],
    reading: { ...makeReading(), uncertainty_summary: 42, cross_system: "winner" },
  });
  assert.equal(shapeResult.valid, false);
  assert.match(shapeResult.errors.join("\n"), /use calculation or calculations/);
  assert.match(shapeResult.errors.join("\n"), /uncertainty_summary must be a string/);
  assert.match(shapeResult.errors.join("\n"), /cross_system must be an object/);
});

test("reading validator reports malformed system types instead of coercing them", () => {
  const calculation = calculate("iching", { question: "fixture", lines: [7, 7, 7, 7, 7, 7] });
  const malformed = structuredClone(calculation);
  malformed.system = { toString: "private-value" };
  const reading = {
    system: ["iching", { toString: "private-value" }],
    level: "standard",
    disclaimer: "Not a validated prediction.",
    summary: "Fixture",
    claims: [{
      claim_id: "C-01", statement: "x", epistemic_status: "calculation_fact", system: "iching",
      profile: calculation.profile.id, fact_ids: ["F-YJ-H01"], rule_ids: [], calculation_certainty: "high",
      input_sensitivity: { label: "stable", coverage: null }, school_stability: "stable",
      source_status: "engine_documented", source_ids: [],
    }],
    next_steps: [],
  };
  const result = validateReading({ calculation: malformed, reading });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /system must be one of|entries must be supported|does not match/);
});

test("reading validator reports object sensitivity fields instead of coercing them", () => {
  const calculation = calculate("bazi", { date: "2000-08-16", timezone: "Asia/Shanghai" });
  const base = {
    calculation,
    reading: {
      system: "bazi", level: "audit", disclaimer: "Not a validated prediction.", summary: "Fixture",
      claims: [{
        claim_id: "C-01", statement: "x", epistemic_status: "calculation_fact", system: "bazi",
        profile: calculation.profile.id, fact_ids: ["jsonptr:/facts/mode"], rule_ids: [],
        calculation_certainty: "qualified", input_sensitivity: { label: "stable", coverage: null },
        school_stability: "profile_specific", source_status: "engine_documented", source_ids: [],
      }],
      next_steps: [],
    },
  };
  for (const field of ["label", "coverage"]) {
    const payload = structuredClone(base);
    payload.reading.claims[0].input_sensitivity[field] = { toString: "private-value" };
    const result = validateReading(payload);
    assert.equal(result.valid, false);
    assert.match(result.errors.join("\n"), new RegExp(`input_sensitivity\\.${field}|input sensitivity`));
  }
});

test("reading fact pointers cannot escape the calculation facts subtree", () => {
  const calculation = calculate("iching", { question: "fixture", lines: [7, 7, 7, 7, 7, 7] });
  const reading = {
    system: "iching", level: "standard", disclaimer: "Not a validated prediction.", summary: "Fixture",
    claims: [{
      claim_id: "C-01", statement: "x", epistemic_status: "calculation_fact", system: "iching",
      profile: calculation.profile.id, fact_ids: ["jsonptr:/facts/mode"], rule_ids: [],
      calculation_certainty: "high", input_sensitivity: { label: "stable", coverage: null },
      school_stability: "stable", source_status: "engine_documented", source_ids: [],
    }],
    next_steps: [],
  };
  assert.equal(validateReading({ calculation, reading }).valid, true);
  for (const pointer of ["jsonptr:/facts_hash", "jsonptr:/profile/id", "jsonptr:/warnings/0"]) {
    const escaped = structuredClone(reading);
    escaped.claims[0].fact_ids = [pointer];
    const result = validateReading({ calculation, reading: escaped });
    assert.equal(result.valid, false);
    assert.match(result.errors.join("\n"), /unknown fact_id/);
  }
});

test("reading validator checks sensitivity denominators", () => {
  const calculation = calculate("bazi", { date: "2000-08-16", timezone: "Asia/Shanghai" });
  const result = validateReading({
    calculation,
    reading: {
      system: "bazi", level: "audit", disclaimer: "Not a validated prediction.", summary: "Fixture",
      claims: [{
        claim_id: "C-01", statement: "x", epistemic_status: "calculation_fact", system: "bazi",
        profile: calculation.profile.id, fact_ids: ["F-BZ-U01"], rule_ids: [], calculation_certainty: "qualified",
        input_sensitivity: { label: "partly_stable", coverage: "999/1" }, school_stability: "profile_specific",
        source_status: "engine_documented", source_ids: [],
      }],
      next_steps: [],
    },
  });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /0 <= n <= N/);
  assert.match(result.errors.join("\n"), /denominator must equal/);
});

test("unknown-time sensitivity labels require real BaZi, Zi Wei, and Western coverage totals", () => {
  const calculations = [
    calculate("bazi", { date: "2000-08-16", timezone: "Asia/Shanghai" }),
    calculate("ziwei", { date: "2000-08-16", timezone: "Asia/Shanghai", chart_sex: "male" }),
    calculate("western", { date: "2000-08-16", timezone: "Asia/Shanghai" }),
  ];
  const totalOf = (calculation) => calculation.sensitivity.candidate_count ?? calculation.sensitivity.sample_count;
  const makePayload = (calculation, label, coverage) => ({
    calculation,
    reading: {
      system: calculation.system,
      level: "audit",
      disclaimer: "Not a validated prediction.",
      summary: "Fixture",
      claims: [{
        claim_id: "C-01",
        statement: "A calculated unknown-time mode fact.",
        epistemic_status: "calculation_fact",
        system: calculation.system,
        profile: calculation.profile.id,
        fact_ids: ["jsonptr:/facts/mode"],
        rule_ids: [],
        calculation_certainty: "qualified",
        input_sensitivity: { label, coverage },
        school_stability: "profile_specific",
        source_status: "engine_documented",
        source_ids: [],
      }],
      next_steps: [],
    },
  });

  for (const calculation of calculations) {
    const total = totalOf(calculation);
    for (const label of ["stable", "partly_stable", "boundary_sensitive"]) {
      const missing = validateReading(makePayload(calculation, label, null));
      assert.equal(missing.valid, false);
      assert.match(missing.errors.join("\n"), /requires n\/N coverage/);
    }
    const complete = validateReading(makePayload(calculation, "stable", `${total}/${total}`));
    assert.equal(complete.valid, true, complete.errors.join("\n"));
    const incompleteStable = validateReading(makePayload(calculation, "stable", `${total - 1}/${total}`));
    assert.equal(incompleteStable.valid, false);
    assert.match(incompleteStable.errors.join("\n"), /stable coverage must include every candidate/);
    const partial = validateReading(makePayload(calculation, "partly_stable", `1/${total}`));
    assert.equal(partial.valid, true, partial.errors.join("\n"));
  }
});

test("multi-envelope readings require unique system/profile bindings", () => {
  const first = calculate("iching", { question: "first", lines: [7, 7, 7, 7, 7, 7] });
  const second = calculate("iching", { question: "second", lines: [8, 8, 8, 8, 8, 8] });
  const result = validateReading({
    calculations: [first, second],
    reading: {
      system: "iching", level: "audit", disclaimer: "Not a validated prediction.", summary: "Fixture",
      claims: [{
        claim_id: "C-01", statement: "x", epistemic_status: "calculation_fact", system: "iching",
        profile: first.profile.id, fact_ids: ["F-YJ-H01"], rule_ids: [], calculation_certainty: "high",
        input_sensitivity: { label: "stable", coverage: null }, school_stability: "stable",
        source_status: "engine_documented", source_ids: [],
      }],
      next_steps: [],
    },
  });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /duplicates a system\/profile binding/);
});

test("multi-system readings bind each claim to its own calculation", () => {
  const iching = calculate("iching", { question: "first", lines: [7, 7, 7, 7, 7, 7] });
  const tarot = calculate("tarot", { question: "second", spread: "one", cards: ["The Fool"] });
  const result = validateReading({
    calculations: [iching, tarot],
    reading: {
      system: ["iching", "tarot"], level: "audit", disclaimer: "Not a validated prediction.", summary: "Fixture",
      claims: [
        {
          claim_id: "C-YJ", statement: "x", epistemic_status: "calculation_fact", system: "iching",
          profile: iching.profile.id, fact_ids: ["F-YJ-H01"], rule_ids: [], calculation_certainty: "high",
          input_sensitivity: { label: "stable", coverage: null }, school_stability: "stable",
          source_status: "engine_documented", source_ids: [],
        },
        {
          claim_id: "C-TR", statement: "y", epistemic_status: "calculation_fact", system: "tarot",
          profile: tarot.profile.id, fact_ids: ["F-TR-001"], rule_ids: [], calculation_certainty: "high",
          input_sensitivity: { label: "stable", coverage: null }, school_stability: "stable",
          source_status: "engine_documented", source_ids: [],
        },
      ],
      cross_system: { relationship: "different_construct" }, next_steps: [],
    },
  });
  assert.equal(result.valid, true, result.errors.join("\n"));
});
