import test from "node:test";
import assert from "node:assert/strict";
import { calculate, verifyCalculationFacts } from "../src/index.mjs";

const FIXTURE = {
  date: "2000-08-16",
  time: "04:00",
  timezone: "Asia/Shanghai",
  chart_sex: "female",
  target_date: "2026-08-23",
};
const COMPONENT_OFFSETS = [0, 4, 8, 6];

function expectedComponentIds(period, focusFactId) {
  const focus = period.star_palaces.find((slot) => slot.fact_id === focusFactId);
  assert.ok(focus, `missing focus slot ${focusFactId}`);
  const byNatalIndex = new Map(period.star_palaces.map((slot) => [slot.natal_palace_index, slot]));
  assert.deepEqual([...byNatalIndex.keys()].sort((left, right) => left - right), [...Array(12).keys()]);
  return COMPONENT_OFFSETS.map((offset) => (
    byNatalIndex.get((focus.natal_palace_index + offset) % 12).fact_id
  ));
}

test("Zi Wei phase topics expose complete same-period four-palace dynamic slots", () => {
  const calculation = calculate("ziwei", FIXTURE);
  const { periods, phase_topic_units: units } = calculation.facts;
  const decadalIds = new Set(periods.decadal.star_palaces.map((slot) => slot.fact_id));
  const yearlyIds = new Set(periods.yearly.star_palaces.map((slot) => slot.fact_id));

  for (const unit of units) {
    assert.deepEqual(unit.component_relation_offsets, COMPONENT_OFFSETS);
    assert.deepEqual(
      unit.decadal_component_star_palace_ids,
      expectedComponentIds(periods.decadal, unit.decadal_star_palace_id),
    );
    assert.deepEqual(
      unit.yearly_component_star_palace_ids,
      expectedComponentIds(periods.yearly, unit.yearly_star_palace_id),
    );
    assert.equal(unit.decadal_component_star_palace_ids[0], unit.decadal_star_palace_id);
    assert.equal(unit.yearly_component_star_palace_ids[0], unit.yearly_star_palace_id);
    assert.equal(new Set(unit.decadal_component_star_palace_ids).size, 4);
    assert.equal(new Set(unit.yearly_component_star_palace_ids).size, 4);
    assert.ok(unit.decadal_component_star_palace_ids.every((factId) => decadalIds.has(factId)));
    assert.ok(unit.yearly_component_star_palace_ids.every((factId) => yearlyIds.has(factId)));
    assert.ok(unit.decadal_component_star_palace_ids.every((factId) => !yearlyIds.has(factId)));
    assert.ok(unit.yearly_component_star_palace_ids.every((factId) => !decadalIds.has(factId)));
    assert.match(unit.derivation, /within each period independently/u);
    assert.match(unit.derivation, /offsets 0, \+4, \+8, and \+6/u);
  }

  const career = units.find((unit) => unit.topic === "career_study");
  assert.deepEqual(career.decadal_component_star_palace_ids, [
    "F-ZW-DS07", "F-ZW-DS11", "F-ZW-DS03", "F-ZW-DS01",
  ]);
  assert.deepEqual(career.yearly_component_star_palace_ids, [
    "F-ZW-YS09", "F-ZW-YS01", "F-ZW-YS05", "F-ZW-YS03",
  ]);
});

test("Zi Wei target-date replay reproduces every dynamic component slot", () => {
  const calculation = calculate("ziwei", FIXTURE, "ziwei-default-v1");
  const verification = verifyCalculationFacts(calculation);
  assert.equal(calculation.input.target_date, FIXTURE.target_date);
  assert.equal(verification.status, "replayed_facts");
  assert.deepEqual(verification.errors, []);

  const replay = calculate("ziwei", FIXTURE, "ziwei-default-v1");
  assert.deepEqual(replay.facts.phase_topic_units, calculation.facts.phase_topic_units);
});

test("Zi Wei replay rejects one mixed-period component-slot tamper", () => {
  const calculation = calculate("ziwei", FIXTURE);
  const tampered = structuredClone(calculation);
  const career = tampered.facts.phase_topic_units.find((unit) => unit.topic === "career_study");
  career.decadal_component_star_palace_ids[1] = career.yearly_component_star_palace_ids[1];

  const verification = verifyCalculationFacts(tampered);
  assert.equal(verification.status, "replayed_facts");
  assert.match(verification.errors.join("\n"), /facts do not match a current-engine replay/u);
});
