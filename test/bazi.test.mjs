import test from "node:test";
import assert from "node:assert/strict";
import { calculate } from "../src/index.mjs";

test("BaZi matches the documented lunar library fixture", () => {
  const result = calculate("bazi", {
    date: "2005-12-23", time: "08:37", timezone: "Asia/Shanghai",
  });
  assert.deepEqual(result.facts.pillars.map((item) => item.stem_branch), ["乙酉", "戊子", "辛巳", "壬辰"]);
  assert.deepEqual(result.facts.structure.day_master, {
    fact_id: "F-BZ-S01", kind: "derived_calculation_fact", heavenly_stem: "辛", element: "金",
    polarity: "yin", source_pillar_id: "F-BZ-003",
  });
  assert.equal(result.facts.structure.occurrence_counts.visible_stem_elements.金, 1);
  assert.match(result.facts.structure.basis, /not a strength, pattern, or useful-god score/);
});

test("BaZi structural relationships stay bound to their source pillars", () => {
  const result = calculate("bazi", {
    date: "2025-01-13", time: "23:30", timezone: "Asia/Shanghai",
  });
  for (const relation of result.facts.structure.relationships) {
    assert.equal(relation.pillar_ids.length, relation.pillars.length);
    assert.ok(relation.pillar_ids.every((id) => /^F-BZ-00[1-4]$/.test(id)));
    assert.match(relation.fact_id, /^F-BZ-R\d{2}$/);
  }
  assert.equal(new Set(result.facts.structure.relationships.map((item) => item.fact_id)).size,
    result.facts.structure.relationships.length);
});

test("ordinary hour metadata preserves pinned upstream terminology", () => {
  const result = calculate("bazi", { date: "2000-01-05", time: "08:00", timezone: "Asia/Shanghai" });
  assert.equal(result.facts.pillars[3].stem_branch, "甲辰");
  assert.equal(result.facts.pillars[3].nayin, "覆灯火");
  assert.equal(result.facts.pillars[3].audit.normalized_for_selected_day_boundary, false);
});

test("midnight profile repairs the upstream late-Zi mixed convention", () => {
  const result = calculate("bazi", {
    date: "2025-01-13", time: "23:30", timezone: "Asia/Shanghai",
  }, { day_boundary: "midnight" });
  assert.equal(result.facts.pillars[2].stem_branch, "壬午");
  assert.equal(result.facts.pillars[3].stem_branch, "庚子");
  assert.equal(result.facts.pillars[3].audit.upstream_stem_branch, "壬子");
  assert.match(result.warnings.join("\n"), /LATE_ZI_UPSTREAM_MISMATCH/);
  assert.equal(result.profile.id, "bazi-civil-midnight-consistent-v1");
});

test("Zi-start profile uses the next day consistently", () => {
  const result = calculate("bazi", {
    date: "2025-01-13", time: "23:30", timezone: "Asia/Shanghai",
  }, { id: "bazi-civil-zi-start-consistent-v1", day_boundary: "zi-start" });
  assert.equal(result.facts.pillars[2].stem_branch, "癸未");
  assert.equal(result.facts.pillars[3].stem_branch, "壬子");
  assert.equal(result.facts.pillars[3].audit.normalized_for_selected_day_boundary, false);
});

test("unknown BaZi time never creates an hour pillar", () => {
  const result = calculate("bazi", { date: "2005-12-23", timezone: "Asia/Shanghai" });
  assert.equal(result.facts.mode, "unknown-time-sensitivity");
  assert.equal(result.facts.time_pillar.status, "unavailable");
  assert.ok(result.sensitivity.candidate_count >= 13);
  assert.ok(result.sensitivity.probe_count >= 1400);
});

test("unknown-time scan catches a solar-term transition before the old 00:30 midpoint", () => {
  const result = calculate("bazi", { date: "1910-02-05", timezone: "Asia/Shanghai" });
  const year = result.facts.stable_pillars.find((item) => item.pillar === "year");
  const month = result.facts.stable_pillars.find((item) => item.pillar === "month");
  for (const pillar of result.facts.stable_pillars) {
    assert.equal(
      pillar.alternatives.reduce((sum, alternative) => sum + alternative.regime_count, 0),
      result.sensitivity.candidate_count,
    );
  }
  assert.equal(year.status, "time-sensitive");
  assert.deepEqual(new Set(year.alternatives.map((item) => item.value)), new Set(["己酉", "庚戌"]));
  assert.equal(month.status, "time-sensitive");
  assert.deepEqual(new Set(month.alternatives.map((item) => item.value)), new Set(["丁丑", "戊寅"]));
});

test("identical deterministic BaZi inputs have identical hashes", () => {
  const input = { date: "2005-12-23", time: "08:37", timezone: "Asia/Shanghai" };
  assert.equal(calculate("bazi", input).reproducibility_hash, calculate("bazi", input).reproducibility_hash);
});

test("BaZi fails closed outside the dependency's UTC+08 calendar reference", () => {
  const sameInstant = [
    { date: "2024-02-04", time: "03:30", timezone: "America/New_York" },
    { date: "2024-02-04", time: "08:30", timezone: "UTC" },
  ];
  const shanghai = calculate("bazi", {
    date: "2024-02-04", time: "16:30", timezone: "Asia/Shanghai",
  });
  assert.equal(shanghai.facts.resolved_time.utc_instant, "2024-02-04T08:30:00Z");
  assert.deepEqual(shanghai.facts.pillars.slice(0, 2).map((pillar) => pillar.stem_branch), ["甲辰", "丙寅"]);
  for (const input of sameInstant) {
    assert.throws(
      () => calculate("bazi", input),
      (error) => error.code === "UNSUPPORTED_BAZI_CALENDAR_OFFSET" && /UTC\+08:00/.test(error.message),
    );
  }
  assert.throws(
    () => calculate("bazi", { date: "2024-02-04", timezone: "America/New_York" }),
    (error) => error.code === "UNSUPPORTED_BAZI_CALENDAR_OFFSET",
  );
});

test("BaZi solar-time overrides fail closed until term and local pillar clocks are separated", () => {
  assert.throws(
    () => calculate("bazi", {
      date: "2005-12-23", time: "08:37", timezone: "Asia/Shanghai", longitude: 121.47,
    }, { time_basis: "apparent-solar" }),
    (error) => error.code === "IMMUTABLE_PROFILE_FIELD",
  );
});

test("BaZi preserves whether birth time was supplied to minute, second, or not at all", () => {
  assert.equal(calculate("bazi", {
    date: "2005-12-23", time: "08:37", timezone: "Asia/Shanghai",
  }).input.time_precision, "minute");
  assert.equal(calculate("bazi", {
    date: "2005-12-23", time: "08:37:12", timezone: "Asia/Shanghai",
  }).input.time_precision, "second");
  assert.equal(calculate("bazi", {
    date: "2005-12-23", timezone: "Asia/Shanghai",
  }).input.time_precision, "unknown");
});
