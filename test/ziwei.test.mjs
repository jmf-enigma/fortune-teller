import test from "node:test";
import assert from "node:assert/strict";
import { calculate } from "../src/index.mjs";
import { verifyCalculationEnvelope } from "../src/core/result.mjs";

const fixture = { date: "2000-08-16", time: "04:00", timezone: "Asia/Shanghai", chart_sex: "female" };

test("Zi Wei wrapper exposes the iztro fixture and all twelve palaces", () => {
  const result = calculate("ziwei", fixture);
  assert.equal(result.facts.summary.chinese_date, "庚辰 甲申 丙午 庚寅");
  assert.equal(result.facts.summary.soul_star, "破军");
  assert.equal(result.facts.summary.body_star, "文昌");
  assert.equal(result.facts.palaces.length, 12);
  assert.ok(result.facts.palaces.every((palace) => palace.fact_id));
  assert.deepEqual(verifyCalculationEnvelope(result), []);
});

test("unknown Zi Wei time scans early and late Zi separately", () => {
  const result = calculate("ziwei", { date: "2000-08-16", timezone: "Asia/Shanghai", chart_sex: "female" });
  assert.equal(result.facts.single_chart.status, "unavailable");
  assert.equal(result.sensitivity.candidate_count, 13);
  assert.equal(result.sensitivity.probe_count, 1441);
  assert.equal(result.sensitivity.scan_resolution_seconds, 60);
  assert.match(result.sensitivity.candidates[0].civil_probe_range.start_local, /T00:00:00\+08:00/);
  assert.match(result.sensitivity.candidates.at(-1).civil_probe_range.end_local, /T23:59:59\+08:00/);
  assert.deepEqual(
    result.sensitivity.candidates.map((candidate) => candidate.calculation_time_index),
    [...Array(13).keys()],
  );
});

test("unknown Zi Wei time scans actual instants on spring and fall DST days", () => {
  const spring = calculate("ziwei", {
    date: "2024-03-31", timezone: "Europe/Berlin", chart_sex: "female",
  });
  const fall = calculate("ziwei", {
    date: "2024-10-27", timezone: "Europe/Berlin", chart_sex: "female",
  });
  assert.equal(spring.sensitivity.probe_count, 23 * 60 + 1);
  assert.equal(fall.sensitivity.probe_count, 25 * 60 + 1);
  assert.equal(spring.sensitivity.candidate_count, 13);
  assert.equal(fall.sensitivity.candidate_count, 13);
  assert.match(spring.sensitivity.candidates[1].civil_probe_range.end_local, /\+01:00\[Europe\/Berlin\]/);
  assert.match(spring.sensitivity.candidates[2].civil_probe_range.start_local, /\+02:00\[Europe\/Berlin\]/);
});

test("traditional chart sex is required and is not inferred", () => {
  assert.throws(
    () => calculate("ziwei", { date: "2000-08-16", timezone: "Asia/Shanghai" }),
    (error) => error.code === "INPUT_SCHEMA_VIOLATION" && /chart_sex/.test(error.message),
  );
});
