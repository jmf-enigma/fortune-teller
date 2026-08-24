import test from "node:test";
import assert from "node:assert/strict";
import { calculate } from "../src/index.mjs";

const BIRTH = Object.freeze({
  date: "2000-08-16",
  time: "04:00",
  timezone: "Asia/Shanghai",
});

test("BaZi luck cycles are opt-in and chart sex is never inferred", () => {
  const natalOnly = calculate("bazi", BIRTH);
  assert.equal(natalOnly.facts.luck_cycles.status, "not_requested");
  assert.match(natalOnly.facts.luck_cycles.reason, /not supplied/u);

  assert.throws(
    () => calculate("bazi", { ...BIRTH, target_date: "2026-08-24" }),
    (error) => error.code === "INPUT_SCHEMA_VIOLATION" && /chart_sex/u.test(error.message),
  );
  assert.throws(
    () => calculate("bazi", { date: BIRTH.date, timezone: BIRTH.timezone, chart_sex: "male" }),
    (error) => error.code === "INPUT_SCHEMA_VIOLATION" && /time/u.test(error.message),
  );
});

test("BaZi emits a deterministic exact-onset decadal schedule and target year layer", () => {
  const result = calculate("bazi", {
    ...BIRTH,
    chart_sex: "male",
    target_date: "2026-08-24",
  });
  const luck = result.facts.luck_cycles;
  assert.equal(luck.direction, "forward");
  assert.equal(luck.start.local_date_time, "2008-02-15T02:00:00");
  assert.equal(luck.decadal[0].stem_branch, "乙酉");
  assert.equal(luck.decadal[0].start_local, "2008-02-15T02:00:00");
  assert.equal(luck.decadal[0].end_local_exclusive, "2018-02-15T02:00:00");
  assert.equal(luck.target.active_decadal_fact_id, "F-BZ-D02");
  assert.equal(luck.target.yearly.stem_branch, "丙午");
  assert.equal(luck.target.yearly.ten_god_stem, "比肩");
  assert.equal(luck.target.interaction_status, "resolved");
  assert.ok(luck.target.interactions.some((item) => item.relationship === "heavenly_control_earthly_clash"));
  assert.ok(luck.target.interactions.some((item) => (
    item.relationship === "active_layer_completes_three_harmony"
    && item.traditional_element_label === "火"
  )));
  const exactRepetition = luck.target.interactions.filter((item) => (
    item.values[0] === "丙午" && item.values[1] === "丙午"
  ));
  assert.deepEqual(exactRepetition.map((item) => item.relationship), [
    "stem_repetition",
    "branch_repetition",
    "branch_self_punishment",
    "layer_natal_pillar_repetition",
  ]);
  assert.equal(new Set(luck.target.interactions.map((item) => item.fact_id)).size, luck.target.interactions.length);
});

test("BaZi target dates on exact luck-cycle or solar-term boundaries stay unresolved", () => {
  const onsetDate = calculate("bazi", {
    ...BIRTH,
    chart_sex: "male",
    target_date: "2008-02-15",
  }).facts.luck_cycles.target;
  assert.equal(onsetDate.status, "luck_cycle_boundary_on_requested_date");
  assert.equal(onsetDate.active_decadal_fact_id, null);
  assert.deepEqual(onsetDate.active_decadal_alternatives, ["pre_luck", "F-BZ-D01"]);

  const solarTermDate = calculate("bazi", {
    ...BIRTH,
    chart_sex: "male",
    target_date: "2026-02-04",
  }).facts.luck_cycles.target;
  assert.equal(solarTermDate.yearly_status, "solar_term_boundary_on_requested_date");
  assert.equal(solarTermDate.yearly, null);
  assert.deepEqual(solarTermDate.yearly_alternatives.map((item) => item.stem_branch), ["乙巳", "丙午"]);
  assert.equal(solarTermDate.interaction_status, "unavailable_at_boundary");
  assert.deepEqual(solarTermDate.interactions, []);
});

test("BaZi target date cannot precede birth", () => {
  assert.throws(
    () => calculate("bazi", {
      ...BIRTH,
      chart_sex: "female",
      target_date: "1999-12-31",
    }),
    (error) => error.code === "TARGET_BEFORE_BIRTH",
  );
});
