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
  assert.equal(result.facts.structure.palace_relations.length, 12);
  assert.equal(result.facts.structure.mutagen_locations.length, 4);
  assert.equal(Object.hasOwn(result.facts, "periods"), false);
  assert.deepEqual(verifyCalculationEnvelope(result), []);
});

test("target_date exposes calculation-only requested-date decadal and yearly facts", () => {
  const result = calculate("ziwei", { ...fixture, target_date: "2026-08-23" });
  const periods = result.facts.periods;
  assert.equal(result.input.target_date, "2026-08-23");
  assert.equal(periods.mode, "target-date-decadal-yearly");
  assert.deepEqual(periods.target, {
    fact_id: "F-ZW-T01",
    kind: "calculation_fact",
    requested_date: "2026-08-23",
    iztro_solar_date: "2026-8-23",
    iztro_lunar_date: "二〇二六年七月十一",
    target_time_index: 0,
    target_time_policy: "date-only target evaluated at explicit Zi Wei time index 0; only decadal and yearly facts are retained",
  });

  assert.equal(periods.decadal.name, "大限");
  assert.equal(periods.decadal.index, 2);
  assert.equal(periods.decadal.sequence_index, 2);
  assert.equal(periods.decadal.heavenly_stem, "庚");
  assert.equal(periods.decadal.earthly_branch, "辰");
  assert.deepEqual(periods.decadal.nominal_age_range, [23, 32]);
  assert.deepEqual(periods.decadal.calendar_year_range, [2022, 2031]);
  assert.deepEqual(periods.decadal.focus, {
    natal_palace_id: "F-ZW-P03",
    natal_palace_index: 2,
    natal_palace_name: "夫妻",
    period_palace_name: "命宫",
  });
  assert.deepEqual(
    periods.decadal.mutagens.map(({ transformation, star }) => ({ transformation, star })),
    [
      { transformation: "禄", star: "太阳" },
      { transformation: "权", star: "武曲" },
      { transformation: "科", star: "太阴" },
      { transformation: "忌", star: "天同" },
    ],
  );
  assert.equal(periods.decadal.star_palaces.length, 12);
  assert.ok(periods.decadal.star_palaces.every((slot) => slot.natal_palace_id && slot.fact_id));

  assert.equal(periods.yearly.name, "流年");
  assert.equal(periods.yearly.index, 4);
  assert.equal(periods.yearly.sequence_index, 4);
  assert.equal(periods.yearly.calendar_year, 2026);
  assert.equal(periods.yearly.nominal_age, 27);
  assert.equal(periods.yearly.heavenly_stem, "丙");
  assert.equal(periods.yearly.earthly_branch, "午");
  assert.deepEqual(
    periods.yearly.mutagens.map(({ transformation, star }) => ({ transformation, star })),
    [
      { transformation: "禄", star: "天同" },
      { transformation: "权", star: "天机" },
      { transformation: "科", star: "文昌" },
      { transformation: "忌", star: "廉贞" },
    ],
  );
  assert.equal(periods.yearly.star_palaces.length, 12);
  assert.ok(periods.yearly.star_palaces.every((slot) => slot.yearly_cycle_stars));
  assert.match(periods.interpretation_limit, /no auspiciousness, event, or outcome/);
  assert.equal(result.meta.period_api, "iztro horoscope() + decadalList() + yearlyList()");
  assert.deepEqual(verifyCalculationEnvelope(result), []);
});

test("Zi Wei period facts distinguish palace index from list sequence and remain deterministic", () => {
  const input = { ...fixture, target_date: "2100-12-31" };
  const first = calculate("ziwei", input, "ziwei-default-v1");
  calculate("ziwei", { ...fixture, target_date: "2026-02-04" }, "ziwei-zhongzhou-v1");
  const second = calculate("ziwei", input, "ziwei-default-v1");
  assert.equal(first.facts.periods.decadal.index, 7);
  assert.equal(first.facts.periods.decadal.sequence_index, 9);
  assert.equal(first.facts.periods.yearly.index, 6);
  assert.equal(first.facts.periods.yearly.sequence_index, 8);
  assert.equal(first.facts.periods.yearly.calendar_year, 2100);
  assert.equal(first.facts_hash, second.facts_hash);
  assert.deepEqual(first.facts, second.facts);
});

test("Zi Wei target-date year boundary follows the declared horoscope profile", () => {
  const input = { ...fixture, target_date: "2026-02-04" };
  const normal = calculate("ziwei", input, "ziwei-default-v1");
  const exact = calculate("ziwei", input, "ziwei-zhongzhou-v1");
  assert.equal(normal.profile.horoscope_divide, "normal");
  assert.equal(normal.facts.periods.yearly.calendar_year, 2025);
  assert.equal(`${normal.facts.periods.yearly.heavenly_stem}${normal.facts.periods.yearly.earthly_branch}`, "乙巳");
  assert.equal(exact.profile.horoscope_divide, "exact");
  assert.equal(exact.facts.periods.yearly.calendar_year, 2026);
  assert.equal(`${exact.facts.periods.yearly.heavenly_stem}${exact.facts.periods.yearly.earthly_branch}`, "丙午");
});

test("Zi Wei target-date facts fail closed without one resolved chart or period coverage", () => {
  assert.throws(
    () => calculate("ziwei", {
      date: fixture.date, timezone: fixture.timezone, chart_sex: fixture.chart_sex, target_date: "2026-08-23",
    }),
    (error) => error.code === "TARGET_DATE_REQUIRES_BIRTH_TIME",
  );
  assert.throws(
    () => calculate("ziwei", { ...fixture, target_date: "2026-02-30" }),
    (error) => error.code === "INVALID_TARGET_DATE",
  );
  assert.throws(
    () => calculate("ziwei", { ...fixture, target_date: "1999-12-31" }),
    (error) => error.code === "TARGET_BEFORE_BIRTH",
  );
  assert.throws(
    () => calculate("ziwei", { ...fixture, target_date: "2000-08-16" }),
    (error) => error.code === "TARGET_OUTSIDE_DECADAL_COVERAGE",
  );
  assert.throws(
    () => calculate("ziwei", { ...fixture, target_date: "2101-01-01" }),
    (error) => error.code === "TARGET_OUTSIDE_VALIDATED_RANGE",
  );
  assert.throws(
    () => calculate("ziwei", { ...fixture, target_date: "2026/08/23" }),
    (error) => error.code === "INPUT_SCHEMA_VIOLATION" && /target_date/.test(error.message),
  );
});

test("Zi Wei exposes auditable three-directions/four-directions and mutagen structure", () => {
  const result = calculate("ziwei", fixture);
  const lifePalace = result.facts.palaces.find((palace) => palace.name === "命宫");
  const relation = result.facts.structure.palace_relations.find(
    (item) => item.focus_palace_id === lifePalace.fact_id,
  );
  assert.deepEqual(new Set(relation.trine_palaces), new Set(["财帛", "官禄"]));
  assert.equal(relation.opposite_palace, "迁移");
  assert.equal(new Set(relation.four_directions_palace_ids).size, 4);
  assert.ok(result.facts.structure.mutagen_locations.every((item) => item.palace_id && item.star));
  assert.match(result.facts.structure.basis, /no single-star or predictive interpretation/);
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
  assert.match(spring.warnings.join("\n"), /CALENDAR_DAY_PROFILE_QUALIFIED/);
});

test("overseas Zi Wei calculation declares its birthplace-civil calendar-day convention", () => {
  const result = calculate("ziwei", {
    date: "2000-08-16", time: "04:00", timezone: "UTC", chart_sex: "female",
  });
  assert.equal(result.profile.calendar_day_basis, "birthplace-civil");
  assert.match(result.warnings.join("\n"), /other Zi Wei lineages/);
});

test("traditional chart sex is required and is not inferred", () => {
  assert.throws(
    () => calculate("ziwei", { date: "2000-08-16", timezone: "Asia/Shanghai" }),
    (error) => error.code === "INPUT_SCHEMA_VIOLATION" && /chart_sex/.test(error.message),
  );
});

test("Zi Wei solar-time overrides fail closed until calendar day and time-index clocks are separated", () => {
  for (const time_basis of ["mean-solar", "apparent-solar"]) {
    assert.throws(
      () => calculate("ziwei", {
        date: "2000-08-16", time: "00:30", timezone: "Asia/Shanghai",
        longitude: 0, chart_sex: "female",
      }, { time_basis }),
      (error) => error.code === "IMMUTABLE_PROFILE_FIELD",
    );
  }
});
