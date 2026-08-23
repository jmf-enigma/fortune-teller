import test from "node:test";
import assert from "node:assert/strict";
import { calculate } from "../src/index.mjs";

test("BaZi matches the documented lunar library fixture", () => {
  const result = calculate("bazi", {
    date: "2005-12-23", time: "08:37", timezone: "Asia/Shanghai",
  });
  assert.deepEqual(result.facts.pillars.map((item) => item.stem_branch), ["乙酉", "戊子", "辛巳", "壬辰"]);
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
