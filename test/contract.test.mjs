import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { astro } from "iztro";
import {
  bindReadingToCalculations,
  calculate,
  INTERPRETATION_PROFILES,
  METHODS,
  validateReading,
} from "../src/index.mjs";
import { calculateFactsHash, calculateReproducibilityHash } from "../src/core/result.mjs";
import { RULES } from "../src/data/rule-registry.mjs";
import { SOURCES, SOURCE_VERIFICATION_NOTE } from "../src/data/source-registry.mjs";

function calculationFactReading(calculation, factId) {
  const reading = {
    system: calculation.system,
    level: "standard",
    disclaimer: "Traditional reflection only; verify important decisions independently.",
    summary: "One calculated item is available for reflection.",
    claims: [{
      claim_id: "C-FIXTURE",
      statement: "One calculated item is available for reflection.",
      epistemic_status: "calculation_fact",
      system: calculation.system,
      profile: calculation.profile.id,
      fact_ids: [factId],
      rule_ids: [],
      calculation_certainty: "high",
      input_sensitivity: { label: "stable", coverage: null },
      school_stability: "stable",
      source_status: "engine_documented",
      source_ids: [],
    }],
    next_steps: [{
      id: "close",
      label: "Finish this reflection",
      action: "close",
      available: true,
      requires_input: [],
      reuses_frozen_calculation: true,
    }],
  };
  return bindReadingToCalculations({ calculation, reading }).reading;
}

function interpretationContract(system, topic = "overview") {
  const profile = INTERPRETATION_PROFILES.find((item) => item.system === system);
  assert.ok(profile, `missing interpretation profile for ${system}`);
  return {
    topic,
    interpretation_profile_id: profile.id,
    rule_pack_hash: profile.rule_pack_hash,
    assessment: {
      mode: "current_reflection",
      domain: topic,
      window: { kind: "current" },
      criteria: [
        {
          criterion_id: "K-support",
          polarity: "supports",
          observable: "A dated record shows the named topic receiving repeated concrete attention.",
          evidence_source: "contemporaneous_record",
        },
        {
          criterion_id: "K-contradict",
          polarity: "contradicts",
          observable: "A dated record shows no concrete activity in the named topic during the review window.",
          evidence_source: "contemporaneous_record",
        },
      ],
    },
  };
}

test("method discovery exposes live schemas, profiles, and usage", () => {
  const stable = METHODS.filter((method) => method.status !== "planned");
  assert.ok(stable.every((method) => method.usage && method.inputSchema && method.profiles.length));
  assert.ok(METHODS.every((method) => method.quality?.predictive_validity === "not_established"));
  assert.ok(stable.every((method) => method.quality.source_coverage === "partial"));
  assert.ok(stable.every((method) => ["wrapper_conformant", "profile_specific"].includes(method.quality.calculation_status)));
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

test("CLI root --help is usable and documents envelope and command-specific inline JSON", () => {
  const result = spawnSync(process.execPath, ["scripts/fortune-teller.mjs", "--help"], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /calculate \[--system <id>\]/u);
  assert.match(result.stdout, /system inside a request envelope/u);
  assert.match(result.stdout, /score-check/u);
});

test("CLI exposes auditable source and rule registries with optional system filtering", () => {
  const result = spawnSync(process.execPath, [
    "scripts/fortune-teller.mjs", "sources", "--system", "bazi", "--compact",
  ], { cwd: new URL("..", import.meta.url), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.filter, "bazi");
  assert.ok(payload.sources.length >= 2);
  assert.ok(payload.sources.every((source) => source.systems.includes("bazi")));
  assert.ok(payload.rules.length >= 4);
  assert.ok(payload.rules.every((rule) => rule.system === "bazi"));
  assert.match(payload.verification_note, /does not validate divinatory predictions/);
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
    assert.doesNotThrow(() => calculate("bazi", { date, time: "23:59:59", timezone: "Etc/GMT-8" }));
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
  const validPayload = bindReadingToCalculations({
    calculation,
    reading: {
      system: "iching",
      level: "standard",
      disclaimer: "Traditional reflective interpretation, not a validated prediction.",
      summary: "This is a traditional interpretive prompt.",
      claims: [{
        claim_id: "C-01",
        statement: "This is a traditional interpretive prompt.",
        epistemic_status: "interpretation",
        system: "iching",
        profile: calculation.profile.id,
        fact_ids: ["F-YJ-H01", "F-YJ-H02"],
        rule_ids: ["R-YJ-003"],
        scope: "hexagram_identity",
        calculation_certainty: "high",
        input_sensitivity: { label: "stable", coverage: null },
        school_stability: "profile_specific",
        source_status: "verified",
        source_ids: ["SRC-YJ-ZHOUYI-WIKISOURCE"],
        ...interpretationContract("iching", "overview"),
      }],
      next_steps: [],
    },
  });
  const valid = validateReading(validPayload);
  assert.equal(valid.valid, true);
  const invalidPayload = structuredClone(validPayload);
  invalidPayload.reading.prediction_probability = 0.9;
  invalidPayload.reading.claims[0].fact_ids = ["missing"];
  invalidPayload.reading.claims[0].rule_ids = [];
  const invalid = validateReading(invalidPayload);
  assert.equal(invalid.valid, false);
  assert.match(invalid.errors.join("\n"), /unknown fact_id/);
  assert.match(invalid.errors.join("\n"), /predictive probability/);
});

test("reading summaries are non-empty and every level requires structured next steps", () => {
  const calculation = calculate("iching", { question: "fixture", lines: [7, 7, 7, 7, 7, 7] });
  const reading = calculationFactReading(calculation, "F-YJ-H01");

  reading.summary = "   ";
  const blank = validateReading({ calculation, reading });
  assert.equal(blank.valid, false);
  assert.match(blank.errors.join("\n"), /summary must be a non-empty string/);

  reading.summary = "A different unbound conclusion.";
  const unbound = validateReading({ calculation, reading });
  assert.equal(unbound.valid, false);
  assert.match(unbound.errors.join("\n"), /summary must equal the first claim statement/);

  reading.summary = `  ${reading.claims[0].statement}\n`;
  reading.next_steps = ["Tell me more"];
  const standard = validateReading({ calculation, reading });
  assert.equal(standard.valid, false);
  assert.match(standard.errors.join("\n"), /structured (?:action )?object/);

  reading.level = "quick";
  reading.title = "易经｜简要结果";
  const quickString = validateReading({ calculation, reading });
  assert.equal(quickString.valid, false);
  assert.match(quickString.errors.join("\n"), /structured (?:action )?object/);
  reading.next_steps = [];
  const quick = validateReading({ calculation, reading });
  assert.equal(quick.valid, true, quick.errors.join("\n"));
});

test("all six systems reject a calculation fact whose visible sentence says the opposite", () => {
  const cases = [
    [calculate("bazi", { date: "2000-08-16", time: "04:00", timezone: "Asia/Shanghai" }), "F-BZ-003", "日柱为甲子。"],
    [calculate("ziwei", { date: "2000-08-16", time: "04:00", timezone: "Asia/Shanghai", chart_sex: "male" }), "F-ZW-P01", "紫微位于财帛宫。"],
    [calculate("western", { date: "2000-08-16", time: "04:00", timezone: "Asia/Shanghai" }), "F-WA-P01", "太阳位于白羊座且处于逆行。"],
    [calculate("tarot", { question: "fixture", spread: "one", cards: ["The Fool"] }), "F-TR-001", "焦点位抽到恶魔逆位。"],
    [calculate("iching", { question: "fixture", lines: [7, 7, 7, 7, 7, 7] }), "F-YJ-H01", "本卦为坤。"],
    [calculate("meihua", { first_number: 1, second_number: 1 }), "F-MH-T01", "上卦为坤。"],
  ];
  for (const [calculation, factId, falseStatement] of cases) {
    const reading = calculationFactReading(calculation, factId);
    const baseline = validateReading({ calculation, reading });
    assert.equal(baseline.valid, true, `${calculation.system}: ${baseline.errors.join("\n")}`);
    reading.summary = falseStatement;
    reading.claims[0].statement = falseStatement;
    const result = validateReading({ calculation, reading });
    assert.equal(result.valid, false, `${calculation.system} unexpectedly accepted a false sentence`);
    assert.match(result.errors.join("\n"), /calculation_fact statement must exactly equal the canonical fact rendering/u);
  }
});

test("ordinary visible reading fields reject audit labels and exact calculation metadata", () => {
  const calculation = calculate("iching", { question: "fixture", lines: [7, 7, 7, 7, 7, 7] });
  const cases = [
    ["title technical profile ID", (reading) => { reading.title = `profile_id=${calculation.profile.id}`; }, /contains backstage technical data/],
    ["user focus exact profile ID", (reading) => { reading.user_focus = calculation.profile.id; }, /canonical unique claim-topic labels/],
    ["user focus technical assignment", (reading) => { reading.user_focus = "node=24.9.0"; }, /canonical unique claim-topic labels/],
    ["disclaimer technical schema version", (reading) => { reading.disclaimer = `schema_version=${calculation.schema_version}`; }, /contains backstage technical data/],
    ["summary exact facts hash", (reading) => { reading.summary = calculation.facts_hash; }, /contains backstage technical data/],
    ["claim fact ID", (reading) => { reading.claims[0].statement = "F-YJ-H01"; }, /contains backstage technical data/],
    ["practical rule ID", (reading) => { reading.claims[0].practical_reflection = "rule_id R-YJ-003"; }, /contains backstage technical data/],
    ["uncertainty exact reproducibility hash", (reading) => {
      reading.uncertainty_summary = calculation.reproducibility_hash;
    }, /contains backstage technical data/],
    ["visible next-step source ID", (reading) => { reading.next_steps[0].label = "source_id SRC-YJ-ZHOUYI-WIKISOURCE"; }, /contains backstage technical data/],
    ["sensitivity label", (reading) => { reading.summary = "Input sensitivity is stable."; }, /contains backstage technical data/],
    ["quick warning count", (reading) => {
      reading.level = "quick";
      reading.next_steps = ["warning_count: 1"];
    }, /contains backstage technical data/],
  ];

  for (const [label, mutate, expected] of cases) {
    const reading = calculationFactReading(calculation, "F-YJ-H01");
    mutate(reading);
    const result = validateReading({ calculation, reading });
    assert.equal(result.valid, false, `${label} unexpectedly passed`);
    assert.match(result.errors.join("\n"), expected, label);
  }

  const ordinaryWarning = calculationFactReading(calculation, "F-YJ-H01");
  ordinaryWarning.user_focus = "A warning sign in the contract terms deserves independent review.";
  const reboundWarning = bindReadingToCalculations({ calculation, reading: ordinaryWarning }).reading;
  assert.equal(reboundWarning.user_focus, "所问主题");
  const accepted = validateReading({ calculation, reading: reboundWarning });
  assert.equal(accepted.valid, true, accepted.errors.join("\n"));

  for (const text of [
    "A public professional profile can be useful context.",
    "这类决定对价格敏感性很高，需要多做一轮现实核实。",
    "A meta-analysis can inform a library-based review.",
    "我整理了13张盘面设计草图，准备逐张核对。",
  ]) {
    const reading = calculationFactReading(calculation, "F-YJ-H01");
    reading.user_focus = text;
    const rebound = bindReadingToCalculations({ calculation, reading }).reading;
    assert.equal(rebound.user_focus, "所问主题");
    const naturalLanguage = validateReading({ calculation, reading: rebound });
    assert.equal(naturalLanguage.valid, true, `${text}: ${naturalLanguage.errors.join("\n")}`);
  }

  const ordinaryUserFocus = calculationFactReading(calculation, "F-YJ-H01");
  ordinaryUserFocus.user_focus = `I am comparing 3 candidates and package ${calculation.engine_version}.`;
  const reboundUserFocus = bindReadingToCalculations({ calculation, reading: ordinaryUserFocus }).reading;
  assert.equal(reboundUserFocus.user_focus, "所问主题");
  const ordinaryUserFocusResult = validateReading({ calculation, reading: reboundUserFocus });
  assert.equal(ordinaryUserFocusResult.valid, true, ordinaryUserFocusResult.errors.join("\n"));

  for (const text of [
    "后台共得到13个候选盘，并扫描了1441个点。",
    "后台出了13张盘。",
    "horoscope_divide=exact；library_version=2.6.0。",
    "node=24.9.0；icu:77.1；tzdb=2025a。",
  ]) {
    const reading = calculationFactReading(calculation, "F-YJ-H01");
    reading.summary = text;
    reading.claims[0].statement = text;
    const result = validateReading({ calculation, reading });
    assert.equal(result.valid, false, `${text} unexpectedly passed`);
    assert.match(result.errors.join("\n"), /contains backstage technical data/);
  }

  const ziwei = calculate("ziwei", {
    date: "2000-08-16", time: "04:00", timezone: "Asia\/Shanghai", chart_sex: "male",
  });
  const leakedLibraryVersion = calculationFactReading(ziwei, "F-ZW-P01");
  leakedLibraryVersion.summary = `底层库版本为 ${ziwei.meta.library_version}。`;
  leakedLibraryVersion.claims[0].statement = leakedLibraryVersion.summary;
  const versionResult = validateReading({ calculation: ziwei, reading: leakedLibraryVersion });
  assert.equal(versionResult.valid, false);
  assert.match(versionResult.errors.join("\n"), /calculation library version|version metadata/);

  const unknownTimeBazi = calculate("bazi", { date: "2000-08-16", timezone: "Asia/Shanghai" });
  const leakedWarningDetail = calculationFactReading(unknownTimeBazi, "F-BZ-U01");
  leakedWarningDetail.user_focus = unknownTimeBazi.warnings[0];
  leakedWarningDetail.claims[0].calculation_certainty = "qualified";
  leakedWarningDetail.claims[0].input_sensitivity = {
    label: "stable",
    coverage: `${unknownTimeBazi.sensitivity.candidate_count}/${unknownTimeBazi.sensitivity.candidate_count}`,
  };
  leakedWarningDetail.claims[0].school_stability = "profile_specific";
  const warningBaseline = structuredClone(leakedWarningDetail);
  warningBaseline.user_focus = "所问主题";
  const warningBaselineResult = validateReading({ calculation: unknownTimeBazi, reading: warningBaseline });
  assert.equal(warningBaselineResult.valid, true, warningBaselineResult.errors.join("\n"));
  const warningDetailResult = validateReading({ calculation: unknownTimeBazi, reading: leakedWarningDetail });
  assert.equal(warningDetailResult.valid, false);
  assert.match(
    warningDetailResult.errors.join("\n"),
    /backstage technical data \(calculation warning detail\)|canonical unique claim-topic labels/u,
  );
});

test("Tarot and I Ching new-question choices cannot reuse a frozen draw or cast", () => {
  const cases = [
    [
      calculate("tarot", { question: "old question", spread: "one", cards: ["The Fool"] }),
      "F-TR-001",
      "重新抽牌问一个新问题",
    ],
    [
      calculate("iching", { question: "old question", lines: [7, 7, 7, 7, 7, 7] }),
      "F-YJ-H01",
      "换一个新问题，重新起卦",
    ],
  ];

  for (const [calculation, factId, label] of cases) {
    const reading = calculationFactReading(calculation, factId);
    reading.next_steps = [{
      id: "new-question",
      label,
      action: "change_focus",
      available: true,
      requires_input: ["question"],
      reuses_frozen_calculation: true,
    }];
    const invalid = validateReading({ calculation, reading });
    assert.equal(invalid.valid, false);
    assert.match(invalid.errors.join("\n"), /fresh Tarot\/I Ching question or draw/);

    reading.next_steps[0].action = "new_reading";
    reading.next_steps[0].reuses_frozen_calculation = false;
    const rebound = bindReadingToCalculations({ calculation, reading }).reading;
    const valid = validateReading({ calculation, reading: rebound });
    assert.equal(valid.valid, true, valid.errors.join("\n"));
  }

  const tarotCalculation = cases[0][0];
  for (const label of ["改问另一件事", "换个主题", "换一组牌"]) {
    const reading = calculationFactReading(tarotCalculation, "F-TR-001");
    reading.next_steps[0] = {
      id: "change-focus",
      label,
      action: "change_focus",
      available: true,
      requires_input: ["question"],
      reuses_frozen_calculation: true,
    };
    const result = validateReading({ calculation: tarotCalculation, reading });
    assert.equal(result.valid, false, `${label} unexpectedly reused the frozen draw`);
    assert.match(result.errors.join("\n"), /action=new_reading/);
  }

  const calculation = cases[1][0];
  const quick = calculationFactReading(calculation, "F-YJ-H01");
  quick.level = "quick";
  quick.next_steps = ["Ask a new question and make a new draw"];
  const unstructured = validateReading({ calculation, reading: quick });
  assert.equal(unstructured.valid, false);
  assert.match(unstructured.errors.join("\n"), /action=new_reading/);

  for (const field of [
    "question", "new_question", "cards", "lines", "spread", "seed", "draw", "cast",
    "draw_source", "cast_source", "reveal_seed",
  ]) {
    const reading = calculationFactReading(tarotCalculation, "F-TR-001");
    reading.next_steps = [{
      id: "continue",
      label: "继续探索",
      action: "change_focus",
      available: true,
      requires_input: [field],
      reuses_frozen_calculation: true,
    }];
    const invalid = validateReading({ calculation: tarotCalculation, reading });
    assert.equal(invalid.valid, false, `${field} unexpectedly reused the frozen draw`);
    assert.match(invalid.errors.join("\n"), /requires_input changes a Tarot\/I Ching question, draw, or cast/);
  }

  const evidenceFilter = calculationFactReading(tarotCalculation, "F-TR-001");
  evidenceFilter.next_steps = [{
    id: "filter-source", label: "核对传统来源", action: "inspect_evidence", available: true,
    requires_input: ["source"], reuses_frozen_calculation: true,
  }];
  const reboundEvidenceFilter = bindReadingToCalculations({
    calculation: tarotCalculation,
    reading: evidenceFilter,
  }).reading;
  const evidenceFilterResult = validateReading({
    calculation: tarotCalculation,
    reading: reboundEvidenceFilter,
  });
  assert.equal(evidenceFilterResult.valid, true, evidenceFilterResult.errors.join("\n"));

  const unknownInput = calculationFactReading(tarotCalculation, "F-TR-001");
  unknownInput.next_steps[0].requires_input = ["another_question_typo"];
  const unknownInputResult = validateReading({ calculation: tarotCalculation, reading: unknownInput });
  assert.equal(unknownInputResult.valid, false);
  assert.match(unknownInputResult.errors.join("\n"), /unknown input field/);
});

test("a specific future-income timing interpretation cannot bypass the rule floor", () => {
  const calculation = calculate("tarot", {
    question: "未来三个月收入如何？", spread: "one", cards: ["The Fool"],
  });
  const reading = calculationFactReading(calculation, "F-TR-001");
  reading.summary = "关于未来三个月收入与应期的具体判断。";
  reading.claims[0] = {
    ...reading.claims[0],
    statement: "未来三个月收入会上升，具体应期在第三个月。",
    epistemic_status: "interpretation",
    rule_ids: [],
    source_status: "unavailable",
  };
  reading.summary = reading.claims[0].statement;
  const result = validateReading({ calculation, reading });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /interpretation requires at least one applicable rule_id/);
  assert.match(
    result.errors.join("\n"),
    /unconditional future outcome assertion|cannot introduce prospective content outside the closed Zi Wei phase route/u,
  );
});

test("future assertions are status-aware, prefix-qualified, and checked in every visible result field", () => {
  const calculation = calculate("iching", { question: "未来三个月收入如何？", lines: [7, 7, 7, 7, 7, 7] });
  const base = calculationFactReading(calculation, "F-YJ-H01");

  const mislabeledFact = structuredClone(base);
  mislabeledFact.summary = "如果现实条件不变，未来三个月收入可能会上升。";
  mislabeledFact.claims[0].statement = mislabeledFact.summary;
  const factResult = validateReading({ calculation, reading: mislabeledFact });
  assert.equal(factResult.valid, false);
  assert.match(
    factResult.errors.join("\n"),
    /classified as calculation_fact cannot state a future outcome|calculation_fact statement must exactly equal the canonical fact rendering/u,
  );

  const assertiveUnresolved = structuredClone(base);
  assertiveUnresolved.summary = "未来三个月收入会上升，第三个月最明显。";
  Object.assign(assertiveUnresolved.claims[0], {
    statement: assertiveUnresolved.summary,
    epistemic_status: "unresolved",
    calculation_certainty: "unavailable",
    school_stability: "not_assessed",
    source_status: "unavailable",
    source_ids: [],
    rule_ids: [],
  });
  const unresolvedResult = validateReading({ calculation, reading: assertiveUnresolved });
  assert.equal(unresolvedResult.valid, false);
  assert.match(unresolvedResult.errors.join("\n"), /canonical unresolved rendering/u);
  assert.match(unresolvedResult.errors.join("\n"), /unconditional future outcome assertion|canonical unresolved rendering/u);

  const honestUnresolved = bindReadingToCalculations({
    calculation,
    reading: structuredClone(assertiveUnresolved),
  }).reading;
  const honestResult = validateReading({ calculation, reading: honestUnresolved });
  assert.equal(honestResult.valid, true, honestResult.errors.join("\n"));
  assert.equal(honestUnresolved.user_focus, "所问主题");
  assert.match(honestUnresolved.claims[0].statement, /当前资料不足，无法判断具体结果/u);

  const disguisedAssertion = structuredClone(honestUnresolved);
  disguisedAssertion.summary = "无法判断具体多少，但明年收入会增加。";
  disguisedAssertion.claims[0].statement = disguisedAssertion.summary;
  const disguisedResult = validateReading({ calculation, reading: disguisedAssertion });
  assert.equal(disguisedResult.valid, false);
  assert.match(disguisedResult.errors.join("\n"), /canonical unresolved rendering|unconditional future outcome assertion/u);

  const negatedUnresolved = structuredClone(honestUnresolved);
  negatedUnresolved.summary = "This point is not unresolved; it is certain.";
  negatedUnresolved.claims[0].statement = negatedUnresolved.summary;
  const negatedUnresolvedResult = validateReading({ calculation, reading: negatedUnresolved });
  assert.equal(negatedUnresolvedResult.valid, false);
  assert.match(negatedUnresolvedResult.errors.join("\n"), /canonical unresolved rendering|must explicitly say that the point is uncertain/u);

  const rhetoricalDenial = structuredClone(honestUnresolved);
  rhetoricalDenial.summary = "未来收入不确定？不，明年必升职。";
  rhetoricalDenial.claims[0].statement = rhetoricalDenial.summary;
  const rhetoricalDenialResult = validateReading({ calculation, reading: rhetoricalDenial });
  assert.equal(rhetoricalDenialResult.valid, false);
  assert.match(rhetoricalDenialResult.errors.join("\n"), /canonical unresolved rendering|must keep every prospective clause explicitly unresolved/u);
  assert.match(rhetoricalDenialResult.errors.join("\n"), /unconditional future outcome assertion|canonical unresolved rendering/u);

  for (const text of [
    "明年收入肯定上涨。",
    "预计明年收入增长。",
    "未来三个月收入大概率上涨。",
  ]) {
    const synonymFact = structuredClone(base);
    synonymFact.summary = text;
    synonymFact.claims[0].statement = text;
    const synonymResult = validateReading({ calculation, reading: synonymFact });
    assert.equal(synonymResult.valid, false, `${text} unexpectedly passed`);
    assert.match(synonymResult.errors.join("\n"), /classified as calculation_fact cannot state a future outcome|calculation_fact statement must exactly equal the canonical fact rendering/u);
    assert.match(synonymResult.errors.join("\n"), /unconditional future outcome assertion|calculation_fact statement must exactly equal the canonical fact rendering/u);
  }

  const conditionalInterpretation = structuredClone(base);
  conditionalInterpretation.summary = "如果现实条件不变，未来三个月可能会继续呈现相同的反思主题。";
  Object.assign(conditionalInterpretation.claims[0], {
    statement: conditionalInterpretation.summary,
    epistemic_status: "interpretation",
    scope: "structural_comparison",
    fact_ids: ["F-YJ-H01", "F-YJ-H02"],
    rule_ids: ["R-YJ-003"],
    school_stability: "profile_specific",
    source_status: "verified",
    source_ids: ["SRC-YJ-ZHOUYI-WIKISOURCE"],
    ...interpretationContract("iching", "overview"),
  });
  const conditionalPayload = bindReadingToCalculations({ calculation, reading: conditionalInterpretation });
  const conditionalResult = validateReading(conditionalPayload);
  assert.equal(conditionalResult.valid, false);
  assert.match(conditionalResult.errors.join("\n"), /cannot introduce prospective content outside the closed Zi Wei phase route/u);

  const currentInterpretation = structuredClone(conditionalInterpretation);
  currentInterpretation.summary = "先按现实条件整理当前选择，再决定是否继续推进。";
  currentInterpretation.claims[0].statement = currentInterpretation.summary;
  const boundCurrentInterpretation = bindReadingToCalculations({ calculation, reading: currentInterpretation }).reading;
  assert.equal(validateReading({ calculation, reading: boundCurrentInterpretation }).valid, true);

  const ordinaryNoun = structuredClone(boundCurrentInterpretation);
  ordinaryNoun.summary = "未来的职业机会值得先做现实核实。";
  ordinaryNoun.claims[0].statement = ordinaryNoun.summary;
  const ordinaryNounResult = validateReading({ calculation, reading: ordinaryNoun });
  assert.equal(ordinaryNounResult.valid, false);
  assert.match(ordinaryNounResult.errors.join("\n"), /cannot introduce prospective content outside the closed Zi Wei phase route/u);

  for (const text of [
    "明年继续核对现实条件。",
    "到2027年先核对条件，再作决定。",
  ]) {
    const practicalAdvice = structuredClone(boundCurrentInterpretation);
    practicalAdvice.claims[0].practical_reflection = text;
    const practicalAdviceResult = validateReading({ calculation, reading: practicalAdvice });
    assert.equal(practicalAdviceResult.valid, true, `${text}: ${practicalAdviceResult.errors.join("\n")}`);
  }

  for (const mutate of [
    (reading) => { reading.summary = "未来三个月收入会上升，但尚不确定具体幅度。"; reading.claims[0].statement = reading.summary; },
    (reading) => { reading.summary = "也许明年过程会变；收入一定会上升。"; reading.claims[0].statement = reading.summary; },
    (reading) => { reading.summary = "也许过程会变，但明年收入一定会上升。"; reading.claims[0].statement = reading.summary; },
    (reading) => { reading.title = "明年收入会上升"; },
    (reading) => { reading.next_steps[0].label = "明年收入会上升"; },
  ]) {
    const reading = structuredClone(boundCurrentInterpretation);
    mutate(reading);
    const result = validateReading({ calculation, reading });
    assert.equal(result.valid, false);
    assert.match(
      result.errors.join("\n"),
      /unconditional future outcome assertion|cannot introduce prospective content outside the closed Zi Wei phase route|cannot frame a result or action as a future event/u,
    );
  }
});

test("professional source and rule registries are narrow, complete, and internally linked", () => {
  const systems = new Set(SOURCES.flatMap((source) => source.systems));
  assert.deepEqual([...systems].sort(), ["bazi", "iching", "meihua", "tarot", "western", "ziwei"]);
  assert.match(SOURCE_VERIFICATION_NOTE, /does not validate divinatory predictions/);
  const sources = new Map(SOURCES.map((source) => [source.id, source]));
  for (const source of SOURCES) {
    assert.equal(source.verification_status, "verified");
    assert.equal(source.verified_as, "provenance_and_scope_only");
    assert.match(source.url, /^https:\/\//);
    assert.match(source.verified_on, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(source.scope.length > 20);
    assert.ok(source.limitations.length > 20);
    assert.ok(source.supported_rule_ids.length > 0);
  }
  for (const rule of RULES) {
    assert.ok(rule.allowed_scopes.length > 0);
    assert.ok(rule.required_fact_prefixes.every((prefix) => prefix.startsWith("/facts/")));
    assert.ok(rule.interpretation_ceiling.length > 0);
    assert.ok(rule.permitted_epistemic_status.length > 0);
    if (rule.required_fact_groups) {
      assert.ok(rule.required_fact_groups.length > 1);
      assert.ok(rule.required_fact_groups.flat().every((prefix) => rule.required_fact_prefixes.includes(prefix)));
    }
    if (rule.material_fact_paths) {
      assert.ok(rule.material_fact_paths.length > 0);
      assert.equal(new Set(rule.material_fact_paths).size, rule.material_fact_paths.length);
      assert.ok(rule.material_fact_paths.every((path) => rule.required_fact_prefixes.some(
        (prefix) => path === prefix || path.startsWith(`${prefix}/`),
      )));
    }
    if (rule.required_fact_values) {
      assert.ok(rule.required_fact_values.every((requirement) => Object.hasOwn(requirement, "equals")));
    }
    assert.equal(rule.source_status, rule.source_ids.length > 0 ? "verified" : "engine_documented");
    for (const sourceId of rule.source_ids) {
      const source = sources.get(sourceId);
      assert.ok(source);
      assert.ok(source.systems.includes(rule.system));
      assert.ok(source.supported_rule_ids.includes(rule.id));
    }
  }
});

test("reading validator enforces rule scope, fact applicability, ceiling, and source bundle", () => {
  const calculation = calculate("iching", { question: "fixture", lines: [7, 7, 7, 7, 7, 7] });
  const reading = bindReadingToCalculations({ calculation, reading: {
    system: "iching", level: "standard", disclaimer: "Not a validated prediction.", summary: "The source orders the six lines from bottom to top.",
    claims: [{
      claim_id: "C-01", statement: "The source orders the six lines from bottom to top.",
      epistemic_status: "traditional_rule", system: "iching", profile: calculation.profile.id,
      scope: "line_order", fact_ids: ["F-YJ-L1"], rule_ids: ["R-YJ-001"], calculation_certainty: "high",
      input_sensitivity: { label: "stable", coverage: null }, school_stability: "stable",
      source_status: "verified", source_ids: ["SRC-YJ-ZHOUYI-WIKISOURCE"],
    }],
    next_steps: [],
  } }).reading;
  assert.equal(validateReading({ calculation, reading }).valid, true);

  const wrongFact = structuredClone(reading);
  wrongFact.claims[0].fact_ids = ["F-YJ-H01"];
  assert.match(validateReading({ calculation, reading: wrongFact }).errors.join("\n"), /allowed fact prefix/);

  const wrongScope = structuredClone(reading);
  wrongScope.claims[0].scope = "wealth_forecast";
  assert.match(validateReading({ calculation, reading: wrongScope }).errors.join("\n"), /scope is not allowed/);

  const ceilingBreach = structuredClone(reading);
  ceilingBreach.claims[0].epistemic_status = "interpretation";
  assert.match(validateReading({ calculation, reading: ceilingBreach }).errors.join("\n"), /interpretation ceiling/);

  const missingSource = structuredClone(reading);
  missingSource.claims[0].source_status = "engine_documented";
  missingSource.claims[0].source_ids = [];
  assert.match(validateReading({ calculation, reading: missingSource }).errors.join("\n"), /source\(s\) required by rule/);
});

test("compound comparison rules require evidence from every declared fact group", () => {
  const calculation = calculate("iching", { question: "fixture", lines: [7, 7, 7, 7, 7, 7] });
  const completeReading = bindReadingToCalculations({ calculation, reading: {
    system: "iching", level: "standard", disclaimer: "Not a validated prediction.", summary: "The primary and transformed hexagrams are structurally compared.",
    claims: [{
      claim_id: "C-COMPOUND", statement: "The primary and transformed hexagrams are structurally compared.",
      epistemic_status: "traditional_rule", system: "iching", profile: calculation.profile.id,
      scope: "structural_comparison", fact_ids: ["F-YJ-H01", "F-YJ-H02"], rule_ids: ["R-YJ-003"],
      calculation_certainty: "high", input_sensitivity: { label: "stable", coverage: null },
      school_stability: "stable", source_status: "verified", source_ids: ["SRC-YJ-ZHOUYI-WIKISOURCE"],
    }],
    next_steps: [],
  } }).reading;
  assert.equal(validateReading({ calculation, reading: completeReading }).valid, true);
  const missingReading = structuredClone(completeReading);
  missingReading.claims[0].fact_ids = ["F-YJ-H01"];
  const missing = validateReading({ calculation, reading: missingReading });
  assert.equal(missing.valid, false);
  assert.match(missing.errors.join("\n"), /required fact group 2/);
});

test("derived professional structure facts are valid rule evidence without claiming strength scores", () => {
  const calculation = calculate("bazi", {
    date: "2000-08-16", time: "04:00", timezone: "Asia/Shanghai",
  });
  const reading = bindReadingToCalculations({ calculation, reading: {
    system: "bazi", level: "standard", disclaimer: "Traditional structure, not a validated prediction.",
    summary: "The emitted element counts are separate unweighted occurrence counts.",
    claims: [{
      claim_id: "C-STRUCTURE", statement: "The emitted element counts are separate unweighted occurrence counts.",
      epistemic_status: "traditional_rule", system: "bazi", profile: calculation.profile.id,
      scope: "chart_structure", fact_ids: ["F-BZ-S03"], rule_ids: ["R-BZ-001"],
      calculation_certainty: "high", input_sensitivity: { label: "stable", coverage: null },
      school_stability: "profile_specific", source_status: "verified",
      source_ids: ["SRC-BZ-LUNAR-TS-1.8.6", "SRC-BZ-SANMING-WIKISOURCE"],
    }],
    next_steps: [],
  } }).reading;
  const result = validateReading({ calculation, reading });
  assert.equal(result.valid, true, result.errors.join("\n"));
});

test("Zi Wei star-palace interpretation cannot be padded with relation-only facts", () => {
  const calculation = calculate("ziwei", {
    date: "2000-08-16", time: "04:00", timezone: "Asia/Shanghai", chart_sex: "male",
  });
  const reading = bindReadingToCalculations({ calculation, reading: {
    system: "ziwei", level: "deep", disclaimer: "Traditional reflection, not a validated prediction.",
    summary: "Two palace/star entries are considered together as a bounded traditional theme.",
    uncertainty_summary: "The interpretation remains bounded and non-predictive.",
    claims: [{
      claim_id: "C-ZW-STAR", statement: "Two palace/star entries are considered together as a bounded traditional theme.",
      epistemic_status: "traditional_rule", system: "ziwei", profile: calculation.profile.id,
      scope: "star_palace_context", fact_ids: ["F-ZW-P01", "F-ZW-P05"], rule_ids: ["R-ZW-001"],
      evidence_bindings: [
        { ref: "F-ZW-P01", role: "support" },
        { ref: "F-ZW-P05", role: "constraint" },
      ],
      reasoning_summary: "The interpretation must retain actual palace entries containing the named stars.",
      alternative_readings: ["The same placements may support a different emphasis within the same school."],
      calculation_certainty: "high", input_sensitivity: { label: "stable", coverage: null },
      school_stability: "profile_specific", source_status: "verified",
      source_ids: ["SRC-ZW-IZTRO-2.6.0", "SRC-ZW-ZIWEI-QUANSHU"],
    }],
    next_steps: [{
      id: "inspect-evidence", label: "Inspect palace entries", action: "inspect_evidence", available: true,
      requires_input: [], reuses_frozen_calculation: true,
    }],
  } }).reading;
  const palaceBound = validateReading({ calculation, reading });
  assert.equal(palaceBound.valid, true, palaceBound.errors.join("\n"));
  const relationReading = structuredClone(reading);
  relationReading.claims[0].fact_ids = ["F-ZW-R01", "F-ZW-R02"];
  const relationOnly = validateReading({ calculation, reading: relationReading });
  assert.equal(relationOnly.valid, false);
  assert.match(relationOnly.errors.join("\n"), /allowed fact prefix/);
});

test("Zi Wei phase-topic synthesis requires one exact natal, decadal, and yearly topic unit", () => {
  const calculation = calculate("ziwei", {
    date: "2000-08-16", time: "04:00", timezone: "Asia/Shanghai", chart_sex: "male",
    target_date: "2026-08-23",
  });
  const phaseUnit = calculation.facts.phase_topic_units.find((item) => item.topic === "career_study");
  const natalUnit = calculation.facts.topic_units.find((item) => item.fact_id === phaseUnit.natal_topic_unit_id);
  const natalPalace = calculation.facts.palaces.find((item) => item.fact_id === phaseUnit.natal_palace_id);
  const phaseFactIds = [...new Set([
    phaseUnit.fact_id,
    phaseUnit.natal_topic_unit_id,
    phaseUnit.natal_palace_id,
    natalUnit.relation_fact_id,
    ...natalUnit.component_palace_ids,
    phaseUnit.target_fact_id,
    phaseUnit.phase_validity_fact_id,
    phaseUnit.decadal_star_palace_id,
    phaseUnit.yearly_star_palace_id,
    ...phaseUnit.decadal_component_star_palace_ids,
    ...phaseUnit.yearly_component_star_palace_ids,
    ...phaseUnit.decadal_transformation_fact_ids,
    ...phaseUnit.yearly_transformation_fact_ids,
  ])];
  const contract = interpretationContract("ziwei", "career_study");
  contract.assessment = {
    ...contract.assessment,
    mode: "bounded_phase",
    window: {
      kind: "bounded",
      start: calculation.facts.periods.phase_validity.valid_from,
      end: calculation.facts.periods.phase_validity.valid_to,
    },
  };
  const reading = bindReadingToCalculations({ calculation, reading: {
    system: "ziwei", level: "deep", disclaimer: "Traditional reflection, not a validated prediction.",
    summary: "The career topic is compared across one machine-bound natal, decadal, and yearly unit.",
    uncertainty_summary: "This phase reading cannot predict a future outcome and may vary across traditional schools.",
    claims: [{
      claim_id: "C-ZW-PHASE", statement: "The career topic is compared across one machine-bound natal, decadal, and yearly unit.",
      epistemic_status: "interpretation", system: "ziwei", profile: calculation.profile.id,
      scope: "phase_topic_synthesis",
      fact_ids: phaseFactIds,
      rule_ids: ["R-ZW-009"],
      topic_unit_id: "F-ZW-PH02",
      semantic_bindings: [{
        kind: "star_in_palace", fact_id: natalPalace.fact_id,
        star: natalPalace.major_stars[0].name, palace: natalPalace.name, star_group: "major",
      }],
      evidence_bindings: phaseFactIds.map((ref, index) => ({
        ref,
        role: index === phaseFactIds.length - 1 ? "constraint" : "support",
      })),
      reasoning_summary: "The natal palace supplies the baseline, the decadal scope supplies the longer context, and the yearly scope supplies the selected-year emphasis.",
      alternative_readings: ["The same structure may show up as attention or responsibility rather than a concrete external event."],
      practical_reflection: "Review one observable decision in this area before making a large commitment.",
      calculation_certainty: "high", input_sensitivity: { label: "stable", coverage: null },
      school_stability: "profile_specific", source_status: "verified",
      source_ids: ["SRC-ZW-IZTRO-2.6.0", "SRC-ZW-IZTRO-PALACE-GUIDE", "SRC-ZW-IZTRO-HOROSCOPE-GUIDE"],
      ...contract,
    }],
    next_steps: [{
      id: "inspect-evidence", label: "See why this phase was highlighted", action: "inspect_evidence",
      available: true, requires_input: [], reuses_frozen_calculation: true,
    }],
  } }).reading;
  const complete = validateReading({ calculation, reading });
  assert.equal(complete.valid, true, complete.errors.join("\n"));

  const missingYearReading = structuredClone(reading);
  missingYearReading.claims[0].fact_ids = phaseFactIds.filter(
    (factId) => factId !== phaseUnit.yearly_star_palace_id,
  );
  const missingYear = validateReading({ calculation, reading: missingYearReading });
  assert.equal(missingYear.valid, false);
  assert.match(
    missingYear.errors.join("\n"),
    /required fact group 7|same-topic natal, target-date, exact phase-validity, decadal(?:\/yearly four-palace|, yearly), and transformation facts/u,
  );
});

test("unknown-time rules require the calculation mode value, not only its path", () => {
  const knownBazi = calculate("bazi", { date: "2000-08-16", time: "04:00", timezone: "Asia/Shanghai" });
  const knownZiwei = calculate("ziwei", {
    date: "2000-08-16", time: "04:00", timezone: "Asia/Shanghai", chart_sex: "male",
  });
  for (const [calculation, ruleId] of [[knownBazi, "R-BZ-004"], [knownZiwei, "R-ZW-004"]]) {
    const reading = calculationFactReading(calculation, "jsonptr:/facts/mode");
    reading.summary = "This calculation used unknown-time sensitivity.";
    Object.assign(reading.claims[0], {
      claim_id: `C-${calculation.system}`,
      statement: reading.summary,
      epistemic_status: "unresolved",
      scope: "unknown_time_sensitivity",
      rule_ids: [ruleId],
      calculation_certainty: "qualified",
      input_sensitivity: { label: "unavailable", coverage: null },
      school_stability: "profile_specific",
    });
    const result = validateReading({ calculation, reading });
    assert.equal(result.valid, false);
    assert.match(result.errors.join("\n"), /requires cited \/facts\/mode to equal "unknown-time-sensitivity"/);
  }
});

test("overseas Zi Wei warnings must survive into the reading contract", () => {
  const calculation = calculate("ziwei", {
    date: "2000-08-16", time: "04:00", timezone: "UTC", chart_sex: "male",
  });
  const reading = bindReadingToCalculations({ calculation, reading: {
    system: "ziwei", level: "standard", disclaimer: "Traditional chart labels, not a validated prediction.",
    summary: "The first palace entry is present in this calculation.",
    uncertainty_summary: "This chart retains the birthplace-civil day outside UTC+08:00; lineages may differ.",
    warning_acknowledgements: ["CALENDAR_DAY_PROFILE_QUALIFIED"],
    claims: [{
      claim_id: "C-ZW-OVERSEAS", statement: "The first palace entry is present in this calculation.",
      epistemic_status: "calculation_fact", system: "ziwei", profile: calculation.profile.id,
      fact_ids: ["F-ZW-P01"], rule_ids: [], calculation_certainty: "qualified",
      input_sensitivity: { label: "stable", coverage: null }, school_stability: "profile_specific",
      source_status: "engine_documented", source_ids: [],
    }],
    next_steps: [],
  } }).reading;
  const acknowledged = validateReading({ calculation, reading });
  assert.equal(acknowledged.valid, true, acknowledged.errors.join("\n"));

  const omittedReading = structuredClone(reading);
  delete omittedReading.uncertainty_summary;
  delete omittedReading.warning_acknowledgements;
  omittedReading.claims[0].calculation_certainty = "high";
  omittedReading.claims[0].school_stability = "stable";
  const omitted = validateReading({ calculation, reading: omittedReading });
  assert.equal(omitted.valid, false);
  assert.match(omitted.errors.join("\n"), /warning_acknowledgements must include CALENDAR_DAY_PROFILE_QUALIFIED/);
  assert.match(omitted.errors.join("\n"), /calculation_certainty must be qualified/);
  assert.match(omitted.errors.join("\n"), /school_stability must be profile_specific/);

  const leakedWarningCode = structuredClone(reading);
  leakedWarningCode.summary = "CALENDAR_DAY_PROFILE_QUALIFIED";
  const leaked = validateReading({ calculation, reading: leakedWarningCode });
  assert.equal(leaked.valid, false);
  assert.match(leaked.errors.join("\n"), /backstage technical data \(calculation warning code\)/);
});

test("deep readings require alternatives, reasoning, uncertainty, and structured follow-ups", () => {
  const calculation = calculate("tarot", {
    question: "fixture", spread: "three", cards: ["The Fool", "The Magician", "The High Priestess"],
  });
  const reading = bindReadingToCalculations({ calculation, reading: {
    system: "tarot", level: "deep", disclaimer: "Traditional reflection, not a validated prediction.",
    summary: "The first two position-card pairs can prompt a bounded comparison of beginning and agency.",
    uncertainty_summary: "Card language is tradition-bound and supports more than one reflective reading.",
    claims: [{
      claim_id: "C-01", statement: "The first two position-card pairs can prompt a bounded comparison of beginning and agency.",
      epistemic_status: "interpretation", system: "tarot", profile: calculation.profile.id,
      scope: "reflective_theme", fact_ids: ["F-TR-001", "F-TR-002"], rule_ids: ["R-TR-002", "R-TR-003"],
      reasoning_summary: "Two frozen position-card facts support a comparison; the cited source supplies only bounded orientation vocabulary.",
      alternative_readings: ["The same pair can instead foreground tension between experimentation and over-control."],
      practical_reflection: "Name one small reversible experiment before committing.",
      calculation_certainty: "high", input_sensitivity: { label: "stable", coverage: null },
      school_stability: "profile_specific", source_status: "verified", source_ids: ["SRC-TR-WAITE-WIKISOURCE"],
      evidence_bindings: [
        { ref: "F-TR-001", role: "support" },
        { ref: "F-TR-002", role: "constraint" },
      ],
      ...interpretationContract("tarot", "current_situation"),
    }],
    next_steps: [{
      id: "inspect-evidence", label: "Inspect the claim evidence", action: "inspect_evidence", available: true,
      requires_input: [], reuses_frozen_calculation: true,
    }],
  } }).reading;
  const valid = validateReading({ calculation, reading });
  assert.equal(valid.valid, true, valid.errors.join("\n"));

  const shallow = structuredClone(reading);
  delete shallow.uncertainty_summary;
  delete shallow.claims[0].reasoning_summary;
  shallow.claims[0].alternative_readings = [];
  shallow.next_steps = ["Tell me more"];
  const invalid = validateReading({ calculation, reading: shallow });
  assert.equal(invalid.valid, false);
  assert.match(invalid.errors.join("\n"), /uncertainty_summary/);
  assert.match(invalid.errors.join("\n"), /reasoning_summary/);
  assert.match(invalid.errors.join("\n"), /alternative_readings/);
  assert.match(invalid.errors.join("\n"), /structured (?:action )?object/);
});

test("deep interpretive claims cannot pass with a single cited fact", () => {
  const calculation = calculate("tarot", {
    question: "fixture", spread: "three", cards: ["The Fool", "The Magician", "The High Priestess"],
  });
  const validReading = bindReadingToCalculations({ calculation, reading: {
    system: "tarot", level: "deep", disclaimer: "Traditional reflection, not a validated prediction.",
    summary: "Two frozen position-card facts support a bounded comparison.",
    uncertainty_summary: "The traditional card vocabulary permits more than one reading.",
    claims: [{
      claim_id: "C-ONE", statement: "Two frozen position-card facts support a bounded comparison.",
      epistemic_status: "interpretation", system: "tarot", profile: calculation.profile.id,
      scope: "reflective_theme", fact_ids: ["F-TR-001", "F-TR-002"], rule_ids: ["R-TR-002", "R-TR-003"],
      evidence_bindings: [
        { ref: "F-TR-001", role: "support" },
        { ref: "F-TR-002", role: "constraint" },
      ],
      reasoning_summary: "The claim cites two distinct frozen position-card facts.", alternative_readings: ["Another context could foreground a different prompt."],
      calculation_certainty: "high", input_sensitivity: { label: "stable", coverage: null },
      school_stability: "profile_specific", source_status: "verified", source_ids: ["SRC-TR-WAITE-WIKISOURCE"],
      ...interpretationContract("tarot", "current_situation"),
    }],
    next_steps: [{
      id: "close", label: "Close", action: "close", available: true, requires_input: [],
      reuses_frozen_calculation: true,
    }],
  } }).reading;
  assert.equal(validateReading({ calculation, reading: validReading }).valid, true);

  const reading = structuredClone(validReading);
  reading.summary = "This is only one bounded card observation.";
  reading.claims[0].statement = reading.summary;
  reading.claims[0].fact_ids = ["F-TR-001"];
  reading.claims[0].rule_ids = ["R-TR-002"];
  const result = validateReading({ calculation, reading });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /at least two distinct material fact roots/);
  reading.claims[0].fact_ids.push("jsonptr:/facts/mode");
  const padded = validateReading({ calculation, reading });
  assert.equal(padded.valid, false);
  assert.match(padded.errors.join("\n"), /not covered by any cited rule/);

  reading.claims[0].fact_ids = ["jsonptr:/facts/cards/0/fact_id", "jsonptr:/facts/cards/0/kind"];
  reading.claims[0].rule_ids = ["R-TR-002", "R-TR-003"];
  const leafAliasPadding = validateReading({ calculation, reading });
  assert.equal(leafAliasPadding.valid, false);
  assert.match(leafAliasPadding.errors.join("\n"), /at least two distinct material fact roots/);
  assert.match(leafAliasPadding.errors.join("\n"), /rule R-TR-003 requires 2 cited fact/);

  reading.claims[0].fact_ids = ["jsonptr:/facts/cards", "F-TR-001"];
  const containerAliasPadding = validateReading({ calculation, reading });
  assert.equal(containerAliasPadding.valid, false);
  assert.match(containerAliasPadding.errors.join("\n"), /broad fact container/);
});

test("deep fact counts exclude explanatory metadata under a broad rule prefix", () => {
  const calculation = calculate("bazi", {
    date: "2000-08-16", time: "04:00", timezone: "Asia/Shanghai",
  });
  const validReading = bindReadingToCalculations({ calculation, reading: {
    system: "bazi", level: "deep", disclaimer: "Traditional structure, not a validated prediction.",
    summary: "Two calculated pillars support a bounded structural comparison.",
    uncertainty_summary: "The comparison remains traditional structure rather than a validated prediction.",
    claims: [{
      claim_id: "C-BZ-METADATA", statement: "Two calculated pillars support a bounded structural comparison.",
      epistemic_status: "interpretation", system: "bazi", profile: calculation.profile.id,
      scope: "chart_structure", fact_ids: ["F-BZ-001", "F-BZ-002"],
      rule_ids: ["R-BZ-001"], reasoning_summary: "The two cited pillar objects are distinct material chart facts.",
      alternative_readings: ["Another pillar or emitted structural fact would be needed for a compound reading."],
      evidence_bindings: [
        { ref: "F-BZ-001", role: "support" },
        { ref: "F-BZ-002", role: "constraint" },
      ],
      calculation_certainty: "high", input_sensitivity: { label: "stable", coverage: null },
      school_stability: "profile_specific", source_status: "verified",
      source_ids: ["SRC-BZ-LUNAR-TS-1.8.6", "SRC-BZ-SANMING-WIKISOURCE"],
      ...interpretationContract("bazi", "overview"),
    }],
    next_steps: [{
      id: "inspect-evidence", label: "Inspect evidence", action: "inspect_evidence", available: true,
      requires_input: [], reuses_frozen_calculation: true,
    }],
  } }).reading;
  assert.equal(validateReading({ calculation, reading: validReading }).valid, true);

  const reading = structuredClone(validReading);
  reading.summary = "This claim should remain a one-fact observation.";
  reading.claims[0].statement = reading.summary;
  reading.claims[0].fact_ids = ["F-BZ-001", "jsonptr:/facts/structure/basis"];
  const result = validateReading({ calculation, reading });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /at least two distinct material fact roots/);
  assert.match(result.errors.join("\n"), /not covered by any cited rule/);
});

test("malicious I Ching certainty and all-in advice fails the applicability and lexical floors", () => {
  const calculation = calculate("iching", { question: "fixture", lines: [7, 7, 7, 7, 7, 7] });
  const reading = calculationFactReading(calculation, "F-YJ-H01");
  Object.assign(reading, {
    level: "deep",
    summary: "This proves you will become rich tomorrow.",
    uncertainty_summary: "No uncertainty.",
    next_steps: [{
      id: "act-now", label: "Invest everything now", action: "reflect", available: true,
      requires_input: [], reuses_frozen_calculation: true,
    }],
  });
  Object.assign(reading.claims[0], {
    claim_id: "C-ATTACK",
    statement: reading.summary,
    epistemic_status: "interpretation",
    scope: "wealth_forecast",
    rule_ids: ["R-YJ-001"],
    reasoning_summary: "Guaranteed by fate.",
    alternative_readings: ["No alternative is possible."],
    practical_reflection: "Invest everything now.",
    school_stability: "stable",
    source_status: "verified",
    source_ids: ["SRC-YJ-ZHOUYI-WIKISOURCE"],
    ...interpretationContract("iching", "wealth_resources"),
  });
  const result = validateReading({ calculation, reading });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /scope is not allowed/);
  assert.match(result.errors.join("\n"), /allowed fact prefix/);
  assert.match(result.errors.join("\n"), /lexical safety gate: fatalistic certainty/);
  assert.match(result.errors.join("\n"), /lexical safety gate: high-risk financial action/);
});

test("reading validator returns errors instead of crashing on wrong ID types", () => {
  const calculation = calculate("iching", { question: "fixture", lines: [7, 7, 7, 7, 7, 7] });
  const reading = calculationFactReading(calculation, "F-YJ-H01");
  reading.claims[0].fact_ids = [42];
  reading.claims[0].source_ids = "oops";
  const result = validateReading({ calculation, reading });
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
    const reading = calculationFactReading(calculation, "F-YJ-H01");
    Object.assign(reading.claims[0], {
      epistemic_status: "traditional_rule", system, rule_ids: ["R-X"],
      calculation_certainty: "unavailable", input_sensitivity: { label: "unavailable", coverage: null },
      school_stability: "not_assessed", source_status: "unavailable", source_ids: [],
    });
    const result = validateReading({ calculation, reading });
    assert.equal(result.valid, false);
    assert.match(result.errors.join("\n"), /unsupported|does not match|unknown rule_id/);
  }
});

test("reading validator rejects tampered envelopes and mismatched claim bindings", () => {
  const calculation = calculate("iching", { question: "fixture", lines: [7, 7, 7, 7, 7, 7] });
  const reading = calculationFactReading(calculation, "F-YJ-H01");
  const tampered = structuredClone(calculation);
  tampered.facts.primary.name = "tampered";
  reading.system = "western";
  Object.assign(reading.claims[0], {
    epistemic_status: "interpretation", system: "western", profile: "made-up-profile",
    rule_ids: ["R-FAKE-001"], source_status: "verified", source_ids: ["S-FAKE"],
    ...interpretationContract("western", "overview"),
  });
  const result = validateReading({ calculation: tampered, reading });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /facts_hash does not match/);
  assert.match(result.errors.join("\n"), /reading.system must match/);
  assert.match(result.errors.join("\n"), /system does not match/);
  assert.match(result.errors.join("\n"), /unknown rule_id/);
  assert.match(result.errors.join("\n"), /unknown source_id/);
});

test("reading validator enforces the calculation schema at runtime", () => {
  const calculation = calculate("iching", { question: "fixture", lines: [7, 7, 7, 7, 7, 7] });
  const boundReading = calculationFactReading(calculation, "F-YJ-H01");
  const makeReading = (system = calculation.system) => {
    const reading = structuredClone(boundReading);
    reading.system = system;
    reading.claims[0].system = system;
    return reading;
  };

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
  assert.match(shapeResult.errors.join("\n"), /uncertainty_summary must be a string|canonical calculation-and-interpretation boundary/u);
  assert.match(shapeResult.errors.join("\n"), /cross_system must be an object|cross_system must be absent/u);
});

test("reading validator reports malformed system types instead of coercing them", () => {
  const calculation = calculate("iching", { question: "fixture", lines: [7, 7, 7, 7, 7, 7] });
  const malformed = structuredClone(calculation);
  malformed.system = { toString: "private-value" };
  const reading = calculationFactReading(calculation, "F-YJ-H01");
  reading.system = ["iching", { toString: "private-value" }];
  const result = validateReading({ calculation: malformed, reading });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /system must be one of|entries must be supported|does not match/);
});

test("reading validator reports object sensitivity fields instead of coercing them", () => {
  const calculation = calculate("bazi", { date: "2000-08-16", timezone: "Asia/Shanghai" });
  const reading = calculationFactReading(calculation, "jsonptr:/facts/mode");
  reading.claims[0].calculation_certainty = "qualified";
  reading.claims[0].school_stability = "profile_specific";
  const base = { calculation, reading };
  assert.equal(validateReading(base).valid, true);
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
  const reading = bindReadingToCalculations({ calculation, reading: {
    system: "iching", level: "standard", disclaimer: "Not a validated prediction.", summary: "x",
    claims: [{
      claim_id: "C-01", statement: "x", epistemic_status: "calculation_fact", system: "iching",
      profile: calculation.profile.id, fact_ids: ["jsonptr:/facts/mode"], rule_ids: [],
      calculation_certainty: "high", input_sensitivity: { label: "stable", coverage: null },
      school_stability: "stable", source_status: "engine_documented", source_ids: [],
    }],
    next_steps: [],
  } }).reading;
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
  const payload = bindReadingToCalculations({
    calculation,
    reading: {
      system: "bazi", level: "standard", disclaimer: "Not a validated prediction.", summary: "x",
      claims: [{
        claim_id: "C-01", statement: "x", epistemic_status: "calculation_fact", system: "bazi",
        profile: calculation.profile.id, fact_ids: ["F-BZ-U01"], rule_ids: [], calculation_certainty: "qualified",
        input_sensitivity: { label: "partly_stable", coverage: "999/1" }, school_stability: "profile_specific",
        source_status: "engine_documented", source_ids: [],
      }],
      next_steps: [],
    },
  });
  payload.reading.claims[0].input_sensitivity = { label: "partly_stable", coverage: "999/1" };
  const result = validateReading(payload);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /0 <= n <= N/);
  assert.match(result.errors.join("\n"), /denominator must equal/);
});

test("unknown-time sensitivity is mechanically derived for BaZi, Zi Wei, and Western", () => {
  const calculations = [
    calculate("bazi", { date: "2000-08-16", timezone: "Asia/Shanghai" }),
    calculate("ziwei", { date: "2000-08-16", timezone: "Asia/Shanghai", chart_sex: "male" }),
    calculate("western", { date: "2000-08-16", timezone: "Asia/Shanghai" }),
  ];
  const totalOf = (calculation) => calculation.sensitivity.candidate_count ?? calculation.sensitivity.sample_count;
  const makePayload = (calculation) => bindReadingToCalculations({
    calculation,
    reading: {
      system: calculation.system,
      level: "standard",
      disclaimer: "Not a validated prediction.",
      summary: "A calculated unknown-time mode fact.",
      claims: [{
        claim_id: "C-01",
        statement: "A calculated unknown-time mode fact.",
        epistemic_status: "calculation_fact",
        system: calculation.system,
        profile: calculation.profile.id,
        fact_ids: ["jsonptr:/facts/mode"],
        rule_ids: [],
        calculation_certainty: "qualified",
        input_sensitivity: { label: "stable", coverage: null },
        school_stability: "profile_specific",
        source_status: "engine_documented",
        source_ids: [],
      }],
      next_steps: [],
    },
  });

  for (const calculation of calculations) {
    const total = totalOf(calculation);
    const canonical = makePayload(calculation);
    assert.deepEqual(canonical.reading.claims[0].input_sensitivity, {
      label: "unavailable",
      coverage: `${total}/${total}`,
    });
    const complete = validateReading(canonical);
    assert.equal(complete.valid, true, complete.errors.join("\n"));

    for (const tamperedSensitivity of [
      { label: "stable", coverage: `${total}/${total}` },
      { label: "partly_stable", coverage: `1/${total}` },
      { label: "unavailable", coverage: null },
      { label: "unavailable", coverage: `${total - 1}/${total}` },
    ]) {
      const tampered = structuredClone(canonical);
      tampered.reading.claims[0].input_sensitivity = tamperedSensitivity;
      const validation = validateReading(tampered);
      assert.equal(validation.valid, false);
      assert.match(validation.errors.join("\n"), /mechanically derived|requires n\/N coverage/u);
    }
  }
});

test("multi-envelope readings require unique system/profile bindings", () => {
  const first = calculate("iching", { question: "first", lines: [7, 7, 7, 7, 7, 7] });
  const second = calculate("iching", { question: "second", lines: [8, 8, 8, 8, 8, 8] });
  const reading = calculationFactReading(first, "F-YJ-H01");
  const result = validateReading({
    calculations: [first, second],
    reading,
  });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /duplicates a system\/profile binding/);
});

test("multi-system readings bind each claim to its own calculation", () => {
  const iching = calculate("iching", { question: "same focused question", lines: [7, 7, 7, 7, 7, 7] });
  const tarot = calculate("tarot", { question: "same focused question", spread: "one", cards: ["The Fool"] });
  const payload = bindReadingToCalculations({
    calculations: [iching, tarot],
    reading: {
      system: ["iching", "tarot"], level: "audit", disclaimer: "Not a validated prediction.", summary: "x",
      uncertainty_summary: "The calculations are fixed, while any interpretation remains reflective and non-predictive.",
      claims: [
        {
          claim_id: "C-YJ", statement: "x", epistemic_status: "calculation_fact", system: "iching",
          profile: iching.profile.id, fact_ids: ["F-YJ-H01"], rule_ids: [], calculation_certainty: "high",
          input_sensitivity: { label: "stable", coverage: null }, school_stability: "stable",
          source_status: "engine_documented", source_ids: [], reasoning_summary: "The cited fact is present in the frozen calculation.",
          alternative_readings: ["No alternative calculation is asserted for the fixed line input."],
        },
        {
          claim_id: "C-TR", statement: "y", epistemic_status: "calculation_fact", system: "tarot",
          profile: tarot.profile.id, fact_ids: ["F-TR-001"], rule_ids: [], calculation_certainty: "high",
          input_sensitivity: { label: "stable", coverage: null }, school_stability: "stable",
          source_status: "engine_documented", source_ids: [], reasoning_summary: "The cited card is present in the frozen calculation.",
          alternative_readings: ["No alternative calculation is asserted for the fixed card input."],
        },
      ],
      cross_system: { relationship: "different_construct" },
      next_steps: [{
        id: "inspect-evidence", label: "Inspect the evidence cards", action: "inspect_evidence", available: true,
        requires_input: [], reuses_frozen_calculation: true,
      }],
    },
  });
  assert.deepEqual(payload.reading.cross_system, { relationship: "not_compared" });
  assert.equal(payload.reading.user_focus, "所问主题");
  const result = validateReading(payload);
  assert.equal(result.valid, true, result.errors.join("\n"));
});

test("multiple question-based systems must answer the same normalized question", () => {
  const iching = calculate("iching", { question: "是否继续这个项目？", lines: [7, 7, 7, 7, 7, 7] });
  const tarot = calculate("tarot", { question: "是否接受另一份工作？", spread: "one", cards: ["The Fool"] });
  const bound = bindReadingToCalculations({
    calculations: [iching, tarot],
    reading: {
      system: ["iching", "tarot"], level: "standard", summary: "x", claims: [
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
      next_steps: [],
    },
  });
  const result = validateReading(bound);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /must use the same normalized question/u);
});

test("multi-system next steps target one calculation before applying fresh-draw semantics", () => {
  const bazi = calculate("bazi", { date: "2000-08-16", time: "04:00", timezone: "Asia/Shanghai" });
  const tarot = calculate("tarot", { question: "current question", spread: "one", cards: ["The Fool"] });
  const reading = bindReadingToCalculations({ calculations: [bazi, tarot], reading: {
    system: ["bazi", "tarot"],
    level: "standard",
    disclaimer: "Traditional reflection only; verify important decisions independently.",
    summary: "One BaZi calculation fact is available for reflection.",
    claims: [
      {
        claim_id: "C-BZ", statement: "One BaZi calculation fact is available for reflection.",
        epistemic_status: "calculation_fact", system: "bazi", profile: bazi.profile.id,
        fact_ids: ["F-BZ-001"], rule_ids: [], calculation_certainty: "high",
        input_sensitivity: { label: "stable", coverage: null }, school_stability: "stable",
        source_status: "engine_documented", source_ids: [],
      },
      {
        claim_id: "C-TR", statement: "One Tarot calculation fact is available for reflection.",
        epistemic_status: "calculation_fact", system: "tarot", profile: tarot.profile.id,
        fact_ids: ["F-TR-001"], rule_ids: [], calculation_certainty: "high",
        input_sensitivity: { label: "stable", coverage: null }, school_stability: "stable",
        source_status: "engine_documented", source_ids: [],
      },
    ],
    next_steps: [{
      id: "compare-bazi-profile", label: "比较八字的另一种传统设置", action: "compare_profile",
      target_system: "bazi", available: true, requires_input: ["profile"], reuses_frozen_calculation: true,
    }],
  } }).reading;

  assert.equal(reading.next_steps[0].label, "比较另一种传统排法");
  const baziTarget = validateReading({ calculations: [bazi, tarot], reading });
  assert.equal(baziTarget.valid, true, baziTarget.errors.join("\n"));

  const tarotTarget = structuredClone(reading);
  tarotTarget.next_steps[0].target_system = "tarot";
  const tarotResult = validateReading({ calculations: [bazi, tarot], reading: tarotTarget });
  assert.equal(tarotResult.valid, false);
  assert.match(tarotResult.errors.join("\n"), /requires_input changes a Tarot\/I Ching question, draw, or cast/);

  const missingTarget = structuredClone(reading);
  delete missingTarget.next_steps[0].target_system;
  const missingTargetResult = validateReading({ calculations: [bazi, tarot], reading: missingTarget });
  assert.equal(missingTargetResult.valid, false);
  assert.match(missingTargetResult.errors.join("\n"), /target_system is required for this multi-system action/);

  const wrongTarget = structuredClone(reading);
  wrongTarget.next_steps[0].target_system = "western";
  const wrongTargetResult = validateReading({ calculations: [bazi, tarot], reading: wrongTarget });
  assert.equal(wrongTargetResult.valid, false);
  assert.match(wrongTargetResult.errors.join("\n"), /target_system must name a system included in reading.system/);

  const fakeBaziTarget = structuredClone(reading);
  fakeBaziTarget.next_steps[0] = {
    id: "fake-redraw", label: "重新抽牌问一个新问题", action: "reflect", target_system: "bazi",
    available: true, requires_input: [], reuses_frozen_calculation: true,
  };
  const fakeBaziTargetResult = validateReading({ calculations: [bazi, tarot], reading: fakeBaziTarget });
  assert.equal(fakeBaziTargetResult.valid, false);
  assert.match(fakeBaziTargetResult.errors.join("\n"), /target_system, action, requires_input, or reuse semantics do not start one/);

  const missingFreshTarget = structuredClone(fakeBaziTarget);
  delete missingFreshTarget.next_steps[0].target_system;
  const missingFreshTargetResult = validateReading({ calculations: [bazi, tarot], reading: missingFreshTarget });
  assert.equal(missingFreshTargetResult.valid, false);
  assert.match(missingFreshTargetResult.errors.join("\n"), /target_system is required for this multi-system action/);

  const missingFreshInput = structuredClone(fakeBaziTarget);
  Object.assign(missingFreshInput.next_steps[0], {
    action: "new_reading", target_system: "tarot", reuses_frozen_calculation: false,
  });
  const missingFreshInputResult = validateReading({ calculations: [bazi, tarot], reading: missingFreshInput });
  assert.equal(missingFreshInputResult.valid, false);
  assert.match(missingFreshInputResult.errors.join("\n"), /requires_input, or reuse semantics do not start one/);

  const coherentFreshAction = structuredClone(missingFreshInput);
  coherentFreshAction.next_steps[0].requires_input = ["question"];
  const reboundCoherentFreshAction = bindReadingToCalculations({
    calculations: [bazi, tarot],
    reading: coherentFreshAction,
  }).reading;
  const coherentFreshResult = validateReading({
    calculations: [bazi, tarot],
    reading: reboundCoherentFreshAction,
  });
  assert.equal(coherentFreshResult.valid, true, coherentFreshResult.errors.join("\n"));
});
