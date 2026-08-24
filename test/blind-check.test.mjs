import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { contentHash } from "../src/core/hash.mjs";
import {
  BLIND_CHECK_OUTCOMES,
  freezeBlindCheck,
  scoreBlindCheck,
  verifyBlindCheckReading,
  verifyBlindCheckRecord,
} from "../src/core/blind-check.mjs";
import {
  bindReadingToCalculations, calculate, INTERPRETATION_PROFILES, validateReading,
} from "../src/index.mjs";

const READING_SCOPE = "fortune-teller/validated-reading/v1";
const READING_PAYLOAD_SCOPE = "fortune-teller/complete-reading-payload/v1";
const RECEIPT_SCOPE = "fortune-teller/blind-check-validation-receipt/v1";
const COMMITMENT_SCOPE = "fortune-teller/blind-check/v3";

function prospectiveAssessment(topic, index, label, validity) {
  return {
    mode: "prospective_hypothesis",
    domain: topic,
    window: { kind: "bounded", start: validity.valid_from, end: validity.valid_to },
    criteria: [
      {
        criterion_id: `K-${index}-support`,
        polarity: "supports",
        observable: `至少两份分开留存的同期记录都显示${label}反复成为现实安排重点。`,
        evidence_source: "contemporaneous_record",
      },
      {
        criterion_id: `K-${index}-contradict`,
        polarity: "contradicts",
        observable: `窗口内连续记录均未显示${label}成为现实安排重点。`,
        evidence_source: "contemporaneous_record",
      },
      {
        criterion_id: `K-${index}-unclear`,
        polarity: "unclear",
        observable: `同期记录缺失或相互冲突，无法确认${label}是否反复突出。`,
        evidence_source: "contemporaneous_record",
      },
    ],
  };
}

function fixtureReadingPayload() {
  const calculation = calculate("ziwei", {
    date: "2000-08-16",
    time: "04:00",
    timezone: "Asia/Shanghai",
    chart_sex: "female",
    target_date: "2028-06-01",
  });
  const profile = INTERPRETATION_PROFILES.find((item) => item.id === "ziwei-sanhe-bounded-v1");
  const topicLabels = new Map([
    ["overview", "人生整体主题"],
    ["career_study", "事业学习主题"],
    ["wealth_resources", "财富资源主题"],
    ["relationships", "关系互动主题"],
    ["wellbeing_rhythm", "身心节律主题"],
  ]);
  const validity = calculation.facts.periods.phase_validity;
  const eligibleUnits = calculation.facts.phase_topic_units.filter((unit) => {
    const processCount = unit.decadal_transformation_fact_ids.length
      + unit.yearly_transformation_fact_ids.length;
    const palace = calculation.facts.palaces.find((item) => item.fact_id === unit.natal_palace_id);
    return processCount > 0 && palace?.major_stars?.length > 0;
  });
  assert.ok(eligibleUnits.length >= 3, "fixture needs three actual process-bearing topics for the tally test");
  const claims = eligibleUnits.slice(0, 3).map((unit, index) => {
    const label = topicLabels.get(unit.topic);
    const statement = `传统阶段框架只提出待核对问题：在 ${validity.valid_from} 至 ${validity.valid_to}，${label}是否反复突出。`;
    const natalUnit = calculation.facts.topic_units.find((item) => item.fact_id === unit.natal_topic_unit_id);
    const natalPalace = calculation.facts.palaces.find((item) => item.fact_id === unit.natal_palace_id);
    const star = natalPalace.major_stars[0];
    const factIds = [...new Set([
      unit.fact_id,
      unit.natal_topic_unit_id,
      unit.natal_palace_id,
      natalUnit.relation_fact_id,
      ...natalUnit.component_palace_ids,
      unit.target_fact_id,
      unit.phase_validity_fact_id,
      unit.decadal_star_palace_id,
      unit.yearly_star_palace_id,
      ...unit.decadal_component_star_palace_ids,
      ...unit.yearly_component_star_palace_ids,
      ...unit.decadal_transformation_fact_ids,
      ...unit.yearly_transformation_fact_ids,
    ])];
    return {
      claim_id: `C-prospective-${index + 1}`,
      statement,
      topic: unit.topic,
      epistemic_status: "interpretation",
      system: "ziwei",
      profile: calculation.profile.id,
      scope: "phase_topic_synthesis",
      fact_ids: factIds,
      rule_ids: ["R-ZW-009"],
      topic_unit_id: unit.fact_id,
      semantic_bindings: [{
        kind: "star_in_palace",
        fact_id: natalPalace.fact_id,
        star: star.name,
        palace: natalPalace.name,
        star_group: "major",
      }],
      calculation_certainty: "high",
      input_sensitivity: { label: "stable", coverage: null },
      school_stability: "profile_specific",
      source_status: "verified",
      source_ids: [
        "SRC-ZW-IZTRO-2.6.0",
        "SRC-ZW-IZTRO-PALACE-GUIDE",
        "SRC-ZW-IZTRO-HOROSCOPE-GUIDE",
      ],
      interpretation_profile_id: profile.id,
      rule_pack_hash: profile.rule_pack_hash,
      assessment: prospectiveAssessment(unit.topic, index, label, validity),
      practical_reflection: `在冻结区间内保存现实记录，区间结束后再核对${label}是否反复突出。`,
    };
  });
  return bindReadingToCalculations({
    calculation,
    reading: {
      system: "ziwei",
      level: "standard",
      disclaimer: "紫微斗数属于传统解释体系，不是经过验证的事件预测。",
      summary: claims[0].statement,
      uncertainty_summary: "只核对预先固定主题是否反复突出，不把主题扩写成具体事件。",
      claims,
      next_steps: [],
    },
  });
}

function freezeInput(payload = fixtureReadingPayload()) {
  return {
    reading_payload: payload,
    claim_ids: payload.reading.claims.map((claim) => claim.claim_id),
  };
}

function jsonClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertErrorCode(code) {
  return (error) => {
    assert.equal(error.code, code);
    assert.ok(Array.isArray(error.details.errors));
    return true;
  };
}

function completePayloadHash(readingPayload) {
  return contentHash({ scope: READING_PAYLOAD_SCOPE, reading_payload: readingPayload });
}

function resealRecord(record) {
  record.validation_receipt.receipt_hash = contentHash({
    scope: RECEIPT_SCOPE,
    validator_contract: record.validation_receipt.validator_contract,
    status: record.validation_receipt.status,
    validated_at: record.validation_receipt.validated_at,
    release_version: record.validation_receipt.release_version,
    engine_versions: record.validation_receipt.engine_versions,
    reading_payload_hash: record.validation_receipt.reading_payload_hash,
  });
  record.commitment.hash = contentHash({
    scope: COMMITMENT_SCOPE,
    schema_version: record.schema_version,
    record_type: record.record_type,
    frozen_at: record.frozen_at,
    reading_binding: record.reading_binding,
    validation_receipt: record.validation_receipt,
    hypotheses: record.hypotheses,
  });
}

function historicalFixture() {
  const readingPayload = jsonClone(fixtureReadingPayload());
  readingPayload.reading.claims.forEach((claim) => {
    claim.statement = claim.statement.replaceAll("2028", "2021").replaceAll("2029", "2021");
    claim.assessment.window = { kind: "bounded", start: "2021-01-01", end: "2021-12-31" };
  });
  readingPayload.reading.summary = readingPayload.reading.claims[0].statement;

  const record = jsonClone(freezeBlindCheck(freezeInput()));
  record.frozen_at = "2020-12-01T00:00:00.000Z";
  record.hypotheses.forEach((hypothesis, index) => {
    hypothesis.statement = readingPayload.reading.claims[index].statement;
    hypothesis.window = { start: "2021-01-01", end: "2021-12-31" };
  });
  record.reading_binding.reading_payload_hash = completePayloadHash(readingPayload);
  record.reading_binding.reading_hash = contentHash({ scope: READING_SCOPE, reading: readingPayload.reading });
  record.validation_receipt.validated_at = record.frozen_at;
  record.validation_receipt.reading_payload_hash = record.reading_binding.reading_payload_hash;
  resealRecord(record);
  return { record, readingPayload };
}

function completeAdjudications(record) {
  const targetOutcomes = ["supported", "contradicted", "unclear"];
  return record.hypotheses.map((hypothesis, hypothesisIndex) => ({
    hypothesis_id: hypothesis.hypothesis_id,
    criteria: hypothesis.criteria.map((criterion) => {
      const target = targetOutcomes[hypothesisIndex % targetOutcomes.length];
      const result = target === "supported"
        ? (criterion.polarity === "supports" ? "met" : "not_met")
        : target === "contradicted"
          ? (criterion.polarity === "contradicts" ? "met" : "not_met")
          : (criterion.polarity === "unclear" ? "met" : "not_met");
      return {
        criterion_id: criterion.criterion_id,
        result,
        observed_on: hypothesisIndex === 0 ? "2021-03-15" : "2021-12-30",
        source_type: criterion.evidence_source,
        observation: result === "met" && criterion.polarity === "unclear"
          ? "同期记录之间存在冲突，无法确认该项标准是否满足。"
          : result === "met"
            ? "同期正式记录显示这一项冻结标准已经满足。"
            : "同期完整记录显示这一项冻结标准并未满足。",
      };
    }),
  }));
}

test("freezeBlindCheck derives hypotheses from validated prospective claims and binds their provenance", () => {
  const input = freezeInput();
  const original = jsonClone(input);
  const record = freezeBlindCheck(input);

  assert.equal(record.schema_version, "3.0.0");
  assert.equal(record.commitment.scope, COMMITMENT_SCOPE);
  assert.match(record.reading_binding.reading_payload_hash, /^[a-f0-9]{64}$/);
  assert.match(record.reading_binding.reading_hash, /^[a-f0-9]{64}$/);
  assert.equal(record.validation_receipt.status, "valid_at_freeze");
  assert.equal(record.validation_receipt.reading_payload_hash, record.reading_binding.reading_payload_hash);
  assert.deepEqual(record.hypotheses[0].criteria, input.reading_payload.reading.claims[0].assessment.criteria);
  assert.deepEqual(record.reading_binding.systems, ["ziwei"]);
  assert.deepEqual(record.reading_binding.claim_bindings.map((item) => item.claim_id), input.claim_ids);
  assert.deepEqual(record.hypotheses.map((item) => item.statement), input.reading_payload.reading.claims.map((item) => item.statement));
  assert.deepEqual(verifyBlindCheckRecord(jsonClone(record)), { valid: true, errors: [] });
  assert.deepEqual(verifyBlindCheckReading(jsonClone(record), jsonClone(input.reading_payload)), { valid: true, errors: [] });

  input.reading_payload.reading.claims[0].statement = "事后改写";
  assert.equal(record.hypotheses[0].statement, original.reading_payload.reading.claims[0].statement);
  assert.throws(() => { record.hypotheses[0].window.end = "2028-01-01"; }, TypeError);
});

test("freezeBlindCheck rejects free hypotheses, invalid readings, non-prospective claims, and past windows", () => {
  assert.throws(
    () => freezeBlindCheck({ hypotheses: [{ statement: "可以事后自由填写。" }] }),
    assertErrorCode("BLIND_CHECK_INPUT_INVALID"),
  );

  const tampered = freezeInput();
  tampered.reading_payload.reading.claims[0].calculation_facts_hash = "0".repeat(64);
  assert.throws(() => freezeBlindCheck(tampered), assertErrorCode("BLIND_CHECK_INPUT_INVALID"));

  const current = freezeInput();
  current.reading_payload.reading.claims[0].assessment.mode = "current_reflection";
  current.reading_payload.reading.claims[0].assessment.window = { kind: "current" };
  assert.throws(() => freezeBlindCheck(current), assertErrorCode("BLIND_CHECK_INPUT_INVALID"));

  const past = freezeInput();
  past.reading_payload.reading.claims[0].assessment.window = {
    kind: "bounded", start: "2020-01-01", end: "2020-12-31",
  };
  assert.throws(() => freezeBlindCheck(past), assertErrorCode("BLIND_CHECK_INPUT_INVALID"));
});

test("verifyBlindCheckReading rejects later wording, rule-pack, profile, or calculation substitution", () => {
  const payload = fixtureReadingPayload();
  const record = freezeBlindCheck(freezeInput(payload));
  const mutations = [
    (copy) => { copy.reading.summary = "不同的事后叙述。"; copy.reading.claims[0].statement = copy.reading.summary; },
    (copy) => { copy.reading.claims[0].rule_pack_hash = "0".repeat(64); },
    (copy) => { copy.reading.claims[0].interpretation_profile_id = "another-profile"; },
    (copy) => { copy.reading.calculation_bindings[0].facts_hash = "0".repeat(64); },
  ];
  for (const mutate of mutations) {
    const altered = jsonClone(payload);
    mutate(altered);
    const result = verifyBlindCheckReading(record, altered);
    assert.equal(result.valid, false);
  }
});

test("scoreBlindCheck derives a conservative three-state tally from complete criterion results", () => {
  const { record, readingPayload } = historicalFixture();
  const adjudications = completeAdjudications(record);
  const score = scoreBlindCheck(record, readingPayload, adjudications);

  assert.deepEqual(score.counts, { supported: 1, contradicted: 1, unclear: 1, total: 3 });
  assert.deepEqual(score.items.map((item) => item.adjudication), BLIND_CHECK_OUTCOMES);
  assert.equal(score.items[0].criterion_results[0].criterion_id, record.hypotheses[0].criteria[0].criterion_id);
  assert.equal(score.source_reading.reading_hash, record.reading_binding.reading_hash);
  assert.equal(score.assessment.adjudication_status, "mechanically_derived_from_complete_user_entered_criteria");
  assert.match(score.assessment.note_zh, /不独立核验.*不能证明/u);
  assert.equal(Object.hasOwn(score.counts, "hit_rate"), false);
  assert.equal(Object.hasOwn(score, "accuracy"), false);
  assert.throws(() => { score.items[0].criterion_results[0].observation = "改写"; }, TypeError);
});

test("scoreBlindCheck rejects early scoring and evidence not tied to frozen criteria or windows", () => {
  const futurePayload = fixtureReadingPayload();
  const futureRecord = freezeBlindCheck(freezeInput(futurePayload));
  const futureAdjudications = completeAdjudications(futureRecord);
  assert.throws(
    () => scoreBlindCheck(futureRecord, futurePayload, futureAdjudications),
    assertErrorCode("BLIND_CHECK_ADJUDICATION_INVALID"),
  );

  const { record, readingPayload } = historicalFixture();
  const cases = [
    (items) => { items[0].criteria[0].criterion_id = "K-not-frozen"; },
    (items) => { items[1].criteria[0].observed_on = "2022-01-01"; },
    (items) => { items[2].criteria[0].criterion_id = record.hypotheses[1].criteria[0].criterion_id; },
    (items) => { items[0].criteria[0].source_type = "memory_guess"; },
    (items) => { items[0].criteria[0].source_type = "administrative_record"; },
    (items) => { items[0].criteria = []; },
  ];
  for (const mutate of cases) {
    const adjudications = completeAdjudications(record);
    mutate(adjudications);
    assert.throws(
      () => scoreBlindCheck(record, readingPayload, adjudications),
      assertErrorCode("BLIND_CHECK_ADJUDICATION_INVALID"),
    );
  }
});

test("adjudicators cannot hard-fill a supported outcome beside a negative observation", () => {
  const { record, readingPayload } = historicalFixture();
  const legacyAttack = completeAdjudications(record);
  legacyAttack[0].outcome = "supported";
  legacyAttack[0].criteria[0].observation = "同期记录明确显示没有收到任何符合冻结标准的邀请。";
  assert.throws(
    () => scoreBlindCheck(record, readingPayload, legacyAttack),
    assertErrorCode("BLIND_CHECK_ADJUDICATION_INVALID"),
  );

  const derived = completeAdjudications(record);
  for (const item of derived[0].criteria) {
    const frozenCriterion = record.hypotheses[0].criteria
      .find((criterion) => criterion.criterion_id === item.criterion_id);
    item.result = frozenCriterion?.polarity === "contradicts" ? "met" : "not_met";
    item.observation = item.result === "met"
      ? "同期记录明确显示没有收到任何符合冻结标准的邀请。"
      : "同期记录显示这一项冻结标准没有得到满足。";
  }
  const score = scoreBlindCheck(record, readingPayload, derived);
  assert.equal(score.items[0].adjudication, "contradicted");
  assert.equal(Object.hasOwn(derived[0], "outcome"), false);
});

test("missing criteria and a valid-but-wrong evidence source are rejected", () => {
  const { record, readingPayload } = historicalFixture();
  const missing = completeAdjudications(record);
  missing[0].criteria.pop();
  assert.throws(
    () => scoreBlindCheck(record, readingPayload, missing),
    assertErrorCode("BLIND_CHECK_ADJUDICATION_INVALID"),
  );

  const wrongSource = completeAdjudications(record);
  wrongSource[0].criteria[0].source_type = "administrative_record";
  assert.throws(
    () => scoreBlindCheck(record, readingPayload, wrongSource),
    (error) => error.code === "BLIND_CHECK_ADJUDICATION_INVALID"
      && error.details.errors.some((message) => /must equal the evidence_source frozen/u.test(message)),
  );
});

test("unclear results and conflicting met criteria conservatively derive unclear", () => {
  const { record, readingPayload } = historicalFixture();
  const unclear = completeAdjudications(record);
  unclear[0].criteria[0].result = "unclear";
  assert.equal(scoreBlindCheck(record, readingPayload, unclear).items[0].adjudication, "unclear");

  const conflict = completeAdjudications(record);
  conflict[0].criteria.forEach((item) => {
    const frozen = record.hypotheses[0].criteria.find((criterion) => criterion.criterion_id === item.criterion_id);
    item.result = frozen.polarity === "unclear" ? "not_met" : "met";
  });
  assert.equal(scoreBlindCheck(record, readingPayload, conflict).items[0].adjudication, "unclear");
});

test("freeze-time payload receipt remains verifiable after validator and engine versions move on", () => {
  const payload = fixtureReadingPayload();
  const record = jsonClone(freezeBlindCheck(freezeInput(payload)));
  const historicalPayload = jsonClone(payload);
  historicalPayload.calculation.engine_version = "0.2.0";
  assert.equal(validateReading(historicalPayload).valid, false);

  record.reading_binding.reading_payload_hash = completePayloadHash(historicalPayload);
  record.validation_receipt.validator_contract = "fortune-teller/reading-validator/v2";
  record.validation_receipt.release_version = "0.2.0";
  record.validation_receipt.engine_versions = ["0.2.0"];
  record.validation_receipt.reading_payload_hash = record.reading_binding.reading_payload_hash;
  resealRecord(record);

  assert.deepEqual(verifyBlindCheckRecord(record), { valid: true, errors: [] });
  assert.deepEqual(verifyBlindCheckReading(record, historicalPayload), { valid: true, errors: [] });
});

test("record commitment detects altered wording, provenance, dates, criteria, or order", () => {
  const record = freezeBlindCheck(freezeInput());
  const mutations = [
    (copy) => { copy.hypotheses[0].statement = "事后缩窄过的说法。"; },
    (copy) => { copy.hypotheses[0].window.end = "2028-12-31"; },
    (copy) => { copy.hypotheses[0].criteria[0].observable = "口头提到也算作支持。"; },
    (copy) => { copy.reading_binding.reading_hash = "0".repeat(64); },
    (copy) => { copy.validation_receipt.release_version = "9.9.9"; },
    (copy) => { copy.reading_binding.claim_bindings[0].rule_pack_hash = "0".repeat(64); },
    (copy) => { [copy.hypotheses[0], copy.hypotheses[1]] = [copy.hypotheses[1], copy.hypotheses[0]]; },
  ];
  for (const mutate of mutations) {
    const altered = jsonClone(record);
    mutate(altered);
    const result = verifyBlindCheckRecord(altered);
    assert.equal(result.valid, false);
    assert.match(result.errors.join("\n"), /(hash does not match|frozen order|hypothesis order)/);
  }
});

test("blind-check APIs reject non-JSON and incomplete adjudication values", () => {
  const cyclic = freezeInput();
  cyclic.self = cyclic;
  assert.throws(() => freezeBlindCheck(cyclic), assertErrorCode("BLIND_CHECK_INPUT_INVALID"));

  const { record, readingPayload } = historicalFixture();
  const incomplete = completeAdjudications(record).slice(0, 2);
  assert.throws(
    () => scoreBlindCheck(record, readingPayload, incomplete),
    assertErrorCode("BLIND_CHECK_ADJUDICATION_INVALID"),
  );
  const mismatchedReading = jsonClone(readingPayload);
  mismatchedReading.reading.summary = "事后替换的阅读。";
  mismatchedReading.reading.claims[0].statement = mismatchedReading.reading.summary;
  assert.throws(
    () => scoreBlindCheck(record, mismatchedReading, completeAdjudications(record)),
    assertErrorCode("BLIND_CHECK_READING_MISMATCH"),
  );
});

test("blind-check JSON schemas are present and parseable", () => {
  for (const filename of [
    "blind-check-adjudications.schema.json",
    "blind-check-input.schema.json",
    "blind-check-record.schema.json",
    "blind-check-score.schema.json",
  ]) {
    const schema = JSON.parse(readFileSync(new URL(`../schemas/${filename}`, import.meta.url), "utf8"));
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
    assert.match(schema.$id, /^urn:fortune-teller:schema:blind-check-/);
  }
});

test("CLI verify-check can bind the preserved record back to the exact reading", () => {
  const readingPayload = fixtureReadingPayload();
  const record = freezeBlindCheck(freezeInput(readingPayload));
  const result = spawnSync(
    process.execPath,
    ["scripts/fortune-teller.mjs", "verify-check", `--json=${JSON.stringify({ record, reading_payload: readingPayload })}`, "--compact"],
    { cwd: new URL("..", import.meta.url), encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { valid: true, errors: [] });

  const altered = jsonClone(readingPayload);
  altered.reading.summary = "事后替换的标题。";
  altered.reading.claims[0].statement = altered.reading.summary;
  const rejected = spawnSync(
    process.execPath,
    ["scripts/fortune-teller.mjs", "verify-check", `--json=${JSON.stringify({ record, reading_payload: altered })}`, "--compact"],
    { cwd: new URL("..", import.meta.url), encoding: "utf8" },
  );
  assert.equal(rejected.status, 2, rejected.stderr);
  assert.equal(JSON.parse(rejected.stdout).valid, false);
});

test("CLI blind-check split-file mode avoids hand-merging large JSON payloads", (context) => {
  const directory = mkdtempSync(join(tmpdir(), "fortune-teller-blind-check-"));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const readingPath = join(directory, "reading.json");
  const recordPath = join(directory, "record.json");
  const readingPayload = fixtureReadingPayload();
  writeFileSync(readingPath, JSON.stringify(readingPayload));

  const frozen = spawnSync(process.execPath, [
    "scripts/fortune-teller.mjs", "freeze-check", "--reading", readingPath,
    "--claim-ids", "C-prospective-1,C-prospective-2", "--compact",
  ], { cwd: new URL("..", import.meta.url), encoding: "utf8" });
  assert.equal(frozen.status, 0, frozen.stderr);
  const record = JSON.parse(frozen.stdout);
  assert.deepEqual(record.reading_binding.claim_bindings.map((item) => item.claim_id), [
    "C-prospective-1", "C-prospective-2",
  ]);
  writeFileSync(recordPath, JSON.stringify(record));

  const verified = spawnSync(process.execPath, [
    "scripts/fortune-teller.mjs", "verify-check", "--record", recordPath,
    "--reading", readingPath, "--compact",
  ], { cwd: new URL("..", import.meta.url), encoding: "utf8" });
  assert.equal(verified.status, 0, verified.stderr);
  assert.deepEqual(JSON.parse(verified.stdout), { valid: true, errors: [] });

  const historical = historicalFixture();
  const historicalRecordPath = join(directory, "historical-record.json");
  const historicalReadingPath = join(directory, "historical-reading.json");
  const adjudicationsPath = join(directory, "adjudications.json");
  writeFileSync(historicalRecordPath, JSON.stringify(historical.record));
  writeFileSync(historicalReadingPath, JSON.stringify(historical.readingPayload));
  writeFileSync(adjudicationsPath, JSON.stringify(completeAdjudications(historical.record)));
  const scored = spawnSync(process.execPath, [
    "scripts/fortune-teller.mjs", "score-check", "--record", historicalRecordPath,
    "--reading", historicalReadingPath, "--adjudications", adjudicationsPath, "--compact",
  ], { cwd: new URL("..", import.meta.url), encoding: "utf8" });
  assert.equal(scored.status, 0, scored.stderr);
  assert.deepEqual(JSON.parse(scored.stdout).counts, {
    supported: 1, contradicted: 1, unclear: 1, total: 3,
  });
});
