import test from "node:test";
import assert from "node:assert/strict";
import { calculate } from "../src/index.mjs";
import { adjudicateZiweiReading } from "../src/core/ziwei-reading-adjudicator.mjs";

const BIRTH = {
  date: "2000-08-16",
  time: "04:00",
  timezone: "Asia/Shanghai",
  chart_sex: "male",
};

test("Zi Wei result-first wrapper binds one natal topic to its exact four-palace route", () => {
  const calculation = calculate("ziwei", BIRTH);
  const result = adjudicateZiweiReading(calculation, { topic: "career_study" });
  assert.equal(result.status, "qualified");
  assert.equal(result.layer, "natal");
  assert.equal(result.lenses.route, "natal_topic_axes");
  assert.equal(result.lenses.palace_axis_groups.length, 4);
  assert.ok(result.basis.length >= 6);
  assert.match(result.conclusion, /事业|学业|具体事件判断/u);
  assert.equal(result.safeguards.score_used, false);
  assert.equal(result.safeguards.borrowed_star_used, false);
});

test("Zi Wei wrapper prefers a closed target-date natal-decadal-yearly route", () => {
  const calculation = calculate("ziwei", { ...BIRTH, target_date: "2026-08-24" });
  const result = adjudicateZiweiReading(calculation, { topic: "career_study" });
  assert.equal(result.status, "completed");
  assert.equal(result.layer, "phase");
  assert.equal(result.lenses.route, "bounded_phase_theme");
  assert.equal(result.lenses.phase.requested_date, "2026-08-24");
  assert.equal(result.lenses.phase.decadal_component_star_palace_ids.length, 4);
  assert.equal(result.lenses.phase.yearly_component_star_palace_ids.length, 4);
  assert.match(result.plain_language, /本命|大限|流年/u);
});

test("Zi Wei natal-only option does not silently include a requested phase", () => {
  const calculation = calculate("ziwei", { ...BIRTH, target_date: "2026-08-24" });
  const result = adjudicateZiweiReading(calculation, { topic: "overview", phase: "natal" });
  assert.equal(result.layer, "natal");
  assert.equal(Object.hasOwn(result.lenses, "phase"), false);
});

test("unknown Zi Wei time refuses to choose one candidate chart", () => {
  const calculation = calculate("ziwei", {
    date: BIRTH.date,
    timezone: BIRTH.timezone,
    chart_sex: BIRTH.chart_sex,
  });
  const result = adjudicateZiweiReading(calculation);
  assert.equal(result.status, "unavailable");
  assert.match(result.plain_language, /不从候选盘中挑一张/u);
  assert.equal(result.safeguards.named_event_prediction_used, false);
});

test("Zi Wei wrapper refuses unsupported topics and replay-breaking facts", () => {
  const calculation = calculate("ziwei", BIRTH);
  const family = adjudicateZiweiReading(calculation, { topic: "family_social" });
  assert.equal(family.status, "unavailable");
  assert.match(family.plain_language, /不拿关系宫或命宫替代/u);
  assert.throws(
    () => adjudicateZiweiReading(calculation, { topic: "health_diagnosis" }),
    (error) => error.code === "ZIWEI_READING_ADJUDICATION_TOPIC_INVALID",
  );
  const forged = structuredClone(calculation);
  forged.facts.palaces[0].name = "命宫";
  assert.throws(
    () => adjudicateZiweiReading(forged),
    (error) => error.code === "ZIWEI_READING_ADJUDICATION_FACTS_UNVERIFIED",
  );
});
