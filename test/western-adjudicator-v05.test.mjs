import test from "node:test";
import assert from "node:assert/strict";
import { calculate } from "../src/index.mjs";
import { adjudicateWestern } from "../src/core/western-adjudicator.mjs";

const KNOWN = {
  date: "2000-01-01",
  time: "12:00",
  timezone: "UTC",
  latitude: 51.4779,
  longitude: 0,
};

test("Western structure records applying/separating aspects and unscored traditional conditions", () => {
  const calculation = calculate("western", KNOWN);
  assert.ok(calculation.facts.aspects.length > 0);
  assert.ok(calculation.facts.aspects.every((aspect) => (
    ["applying", "separating", "exact", "uncertain"].includes(aspect.phase)
    && aspect.audit_window_minutes === 60
  )));

  const traditional = calculation.facts.structure.traditional_conditions;
  assert.equal(traditional.rulership_scope, "traditional_seven_planets_only");
  assert.equal(traditional.essential_conditions.length, 10);
  assert.equal(traditional.angularity.length, 10);
  assert.ok(traditional.chart_ruler.source_planet_id);
  assert.match(traditional.interpretation_limit, /no dignity points/u);
});

test("Western adjudication follows one topic house and keeps concrete evidence paths", () => {
  const calculation = calculate("western", KNOWN);
  const result = adjudicateWestern(calculation, { topic: "career_study" });
  assert.equal(result.status, "completed");
  assert.equal(result.topic, "career_study");
  assert.equal(result.lenses.topic_axis.primary_house, 10);
  assert.ok(result.lenses.topic_axis.unit.planet_fact_id);
  assert.equal(result.lenses.topic_axis.selected_body, "saturn");
  assert.equal(result.lenses.topic_axis.selection_rule, "traditional_primary_house_ruler_with_all_occupants_as_co_significators");
  assert.deepEqual(result.lenses.topic_axis.occupants.map((item) => item.body), ["sun", "mercury"]);
  assert.match(result.conclusion, /传统宫主土星/u);
  assert.match(result.conclusion, /太阳、水星.*共同表征/u);
  assert.ok(result.basis.length >= 3);
  assert.match(result.conclusion, /第10宫/u);
  assert.match(result.plain_language, /最可用的一面/u);
  assert.equal(result.safeguards.score_used, false);
  assert.equal(result.safeguards.event_prediction_used, false);
});

test("known time without coordinates stays qualified and never invents houses", () => {
  const calculation = calculate("western", {
    date: "2000-01-01", time: "12:00", timezone: "UTC",
  });
  const result = adjudicateWestern(calculation, { topic: "relationships" });
  assert.equal(result.status, "qualified");
  assert.equal(result.lenses.topic_axis.primary_house, null);
  assert.equal(result.lenses.topic_axis.selection_rule, "luminary_axis_without_houses");
  assert.deepEqual(result.unresolved, ["上升点", "宫位", "主题宫主"]);
  assert.match(result.change_conditions[0], /补充可靠坐标/u);
});

test("unknown time limits Western adjudication to day-stable planet ranges", () => {
  const calculation = calculate("western", { date: "2000-01-01", timezone: "UTC" });
  const result = adjudicateWestern(calculation, { topic: "overview" });
  assert.equal(result.status, "qualified");
  assert.equal(result.lenses.houses.status, "unavailable");
  assert.equal(result.safeguards.unknown_time_houses_used, false);
  assert.match(result.conclusion, /出生时刻未知/u);
});

test("Western adjudication refuses invalid topics and replay-breaking mutations", () => {
  const calculation = calculate("western", KNOWN);
  assert.throws(
    () => adjudicateWestern(calculation, { topic: "health_diagnosis" }),
    (error) => error.code === "WESTERN_ADJUDICATION_TOPIC_INVALID",
  );

  const forged = structuredClone(calculation);
  forged.facts.planets[0].sign = "Pisces";
  assert.throws(
    () => adjudicateWestern(forged),
    (error) => error.code === "WESTERN_ADJUDICATION_FACTS_UNVERIFIED",
  );
});
