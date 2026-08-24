import test from "node:test";
import assert from "node:assert/strict";
import { Solar } from "lunar-typescript";
import { calculate } from "../src/index.mjs";

/*
 * Offline audit provenance (the upstream repository is never required at test time):
 *
 *   ShousenZHANG/chinese-fortune
 *   commit 4b960823e4e918d9dccc32090e5ad96833e4e427
 *
 * Fixture ideas and candidate values were checked against:
 *   - tests/test_bazi_integration.py:45-55, 101-123
 *   - tests/test_differential.py:59-111
 *   - scripts/bazi_calc.py:1477-1547
 *
 * The upstream CLI applies equation-of-time true-solar correction even at
 * longitude 120 / UTC+08:00. This project intentionally uses the recorded
 * civil clock. Its 23:00 day boundary is also a declared profile choice.
 * Therefore upstream values are audit candidates, not this project's oracle.
 */

const UPSTREAM = Object.freeze({
  repository: "ShousenZHANG/chinese-fortune",
  commit: "4b960823e4e918d9dccc32090e5ad96833e4e427",
});

const TIMEZONE = "Etc/GMT-8";
const MIDNIGHT = Object.freeze({ day_boundary: "midnight" });
const ZI_START = Object.freeze({
  id: "bazi-civil-zi-start-consistent-v1",
  day_boundary: "zi-start",
});

const FIXTURES = Object.freeze([
  {
    id: "known-chart-summer-1990",
    group: "ordinary",
    date: "1990-05-10",
    time: "14:00",
    expected: ["庚午", "辛巳", "乙亥", "癸未"],
    upstream: ["庚午", "辛巳", "乙亥", "癸未"],
  },
  {
    id: "known-chart-winter-2000",
    group: "ordinary",
    date: "2000-01-15",
    time: "12:00",
    expected: ["己卯", "丁丑", "壬申", "丙午"],
    upstream: ["己卯", "丁丑", "壬申", "丙午"],
  },
  {
    id: "sxtwl-end-to-end-1984",
    group: "ordinary",
    date: "1984-10-01",
    time: "12:00",
    expected: ["甲子", "癸酉", "戊辰", "戊午"],
    upstream: ["甲子", "癸酉", "戊辰", "戊午"],
  },
  {
    id: "hour-sweep-chou",
    group: "hour-sweep",
    date: "1988-09-17",
    time: "02:00",
    expected: ["戊辰", "辛酉", "乙亥", "丁丑"],
    upstream: ["戊辰", "辛酉", "乙亥", "丁丑"],
  },
  {
    id: "hour-sweep-chen",
    group: "hour-sweep",
    date: "1988-09-17",
    time: "08:00",
    expected: ["戊辰", "辛酉", "乙亥", "庚辰"],
    upstream: ["戊辰", "辛酉", "乙亥", "庚辰"],
  },
  {
    id: "hour-sweep-shen",
    group: "hour-sweep",
    date: "1988-09-17",
    time: "16:00",
    expected: ["戊辰", "辛酉", "乙亥", "甲申"],
    upstream: ["戊辰", "辛酉", "乙亥", "甲申"],
  },
  {
    id: "lichun-2000-before",
    group: "lichun-coarse",
    date: "2000-02-03",
    time: "12:00",
    expected: ["己卯", "丁丑", "辛卯", "甲午"],
    upstream: ["己卯", "丁丑", "辛卯", "甲午"],
  },
  {
    id: "lichun-2000-after",
    group: "lichun-coarse",
    date: "2000-02-05",
    time: "12:00",
    expected: ["庚辰", "戊寅", "癸巳", "戊午"],
    upstream: ["庚辰", "戊寅", "癸巳", "戊午"],
  },
  {
    id: "lichun-2024-before-exact-term",
    group: "lichun-exact",
    date: "2024-02-04",
    time: "16:00",
    expected: ["癸卯", "乙丑", "戊戌", "庚申"],
    upstream: ["癸卯", "乙丑", "戊戌", "庚申"],
  },
  {
    id: "lichun-2024-after-exact-term",
    group: "lichun-exact",
    date: "2024-02-04",
    time: "17:00",
    expected: ["甲辰", "丙寅", "戊戌", "辛酉"],
    upstream: ["甲辰", "丙寅", "戊戌", "庚申"],
    difference: "upstream true-solar correction moves 17:00 to 16:46, changing only the hour pillar",
  },
  {
    id: "jingzhe-2024-before-exact-term",
    group: "jieqi-exact",
    date: "2024-03-05",
    time: "10:00",
    expected: ["甲辰", "丙寅", "戊辰", "丁巳"],
    upstream: ["甲辰", "丙寅", "戊辰", "丁巳"],
  },
  {
    id: "jingzhe-2024-after-exact-term",
    group: "jieqi-exact",
    date: "2024-03-05",
    time: "11:00",
    expected: ["甲辰", "丁卯", "戊辰", "戊午"],
    upstream: ["甲辰", "丁卯", "戊辰", "丁巳"],
    difference: "upstream true-solar correction moves 11:00 to 10:48, changing only the hour pillar",
  },
  {
    id: "zi-early-midnight-profile",
    group: "zi-boundary",
    date: "2020-06-15",
    time: "00:30",
    expected: ["庚子", "壬午", "己丑", "甲子"],
    upstream: ["庚子", "壬午", "己丑", "甲子"],
  },
  {
    id: "zi-late-midnight-profile",
    group: "zi-boundary",
    date: "2020-06-15",
    time: "23:30",
    expected: ["庚子", "壬午", "己丑", "甲子"],
    dependencyExpected: ["庚子", "壬午", "己丑", "丙子"],
    upstream: ["庚子", "壬午", "己丑", "丙子"],
    difference: "the midnight profile repairs the dependency's mixed late-Zi day/hour convention",
  },
  {
    id: "zi-late-zi-start-profile",
    group: "zi-boundary",
    date: "2020-06-15",
    time: "23:30",
    profile: ZI_START,
    expected: ["庚子", "壬午", "庚寅", "丙子"],
    upstream: ["庚子", "壬午", "己丑", "丙子"],
    difference: "this project's zi-start profile advances the day at 23:00; upstream is fixed to sect 2",
  },
]);

function publicPillars(fixture) {
  const result = calculate("bazi", {
    date: fixture.date,
    time: fixture.time,
    timezone: TIMEZONE,
  }, fixture.profile ?? MIDNIGHT);
  return { result, pillars: result.facts.pillars.map((pillar) => pillar.stem_branch) };
}

function dependencyPillars(fixture) {
  const [year, month, day] = fixture.date.split("-").map(Number);
  const [hour, minute] = fixture.time.split(":").map(Number);
  const eightChar = Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar().getEightChar();
  eightChar.setSect((fixture.profile ?? MIDNIGHT).day_boundary === "zi-start" ? 1 : 2);
  return [eightChar.getYear(), eightChar.getMonth(), eightChar.getDay(), eightChar.getTime()];
}

function byId(id) {
  return FIXTURES.find((fixture) => fixture.id === id);
}

test("BaZi UTC+08 golden fixtures stay pinned to the public boundary contract", () => {
  assert.equal(FIXTURES.length, 15);
  assert.equal(UPSTREAM.commit, "4b960823e4e918d9dccc32090e5ad96833e4e427");

  for (const fixture of FIXTURES) {
    const { result, pillars } = publicPillars(fixture);
    assert.deepEqual(pillars, fixture.expected, fixture.id);
    assert.equal(result.input.timezone, TIMEZONE, fixture.id);
  }
});

test("golden values remain checked against the pinned local lunar-typescript dependency", () => {
  for (const fixture of FIXTURES) {
    assert.deepEqual(
      dependencyPillars(fixture),
      fixture.dependencyExpected ?? fixture.expected,
      fixture.id,
    );
  }
});

test("every upstream disagreement is explicit and convention-scoped", () => {
  const differences = FIXTURES.filter((fixture) => fixture.difference);
  assert.deepEqual(differences.map((fixture) => fixture.id), [
    "lichun-2024-after-exact-term",
    "jingzhe-2024-after-exact-term",
    "zi-late-midnight-profile",
    "zi-late-zi-start-profile",
  ]);

  for (const fixture of FIXTURES) {
    const disagrees = !fixture.expected.every((pillar, index) => pillar === fixture.upstream[index]);
    assert.equal(disagrees, Boolean(fixture.difference), fixture.id);
  }

  const lateZi = publicPillars(byId("zi-late-midnight-profile")).result;
  assert.equal(lateZi.facts.pillars[3].audit.upstream_stem_branch, "丙子");
  assert.match(lateZi.warnings.join("\n"), /LATE_ZI_UPSTREAM_MISMATCH/);
});

test("fixture pairs discriminate the intended year, month, day, and hour boundaries", () => {
  const exactLichunBefore = publicPillars(byId("lichun-2024-before-exact-term")).pillars;
  const exactLichunAfter = publicPillars(byId("lichun-2024-after-exact-term")).pillars;
  assert.deepEqual(exactLichunBefore.slice(0, 3), ["癸卯", "乙丑", "戊戌"]);
  assert.deepEqual(exactLichunAfter.slice(0, 3), ["甲辰", "丙寅", "戊戌"]);

  const jingzheBefore = publicPillars(byId("jingzhe-2024-before-exact-term")).pillars;
  const jingzheAfter = publicPillars(byId("jingzhe-2024-after-exact-term")).pillars;
  assert.deepEqual(jingzheBefore.slice(0, 3), ["甲辰", "丙寅", "戊辰"]);
  assert.deepEqual(jingzheAfter.slice(0, 3), ["甲辰", "丁卯", "戊辰"]);

  const hourSweep = FIXTURES.filter((fixture) => fixture.group === "hour-sweep")
    .map((fixture) => publicPillars(fixture).pillars);
  assert.ok(hourSweep.every((pillars) => pillars.slice(0, 3).join("") === "戊辰辛酉乙亥"));
  assert.deepEqual(hourSweep.map((pillars) => pillars[3]), ["丁丑", "庚辰", "甲申"]);

  const ziEarly = publicPillars(byId("zi-early-midnight-profile")).pillars;
  const ziLateMidnight = publicPillars(byId("zi-late-midnight-profile")).pillars;
  const ziLateZiStart = publicPillars(byId("zi-late-zi-start-profile")).pillars;
  assert.deepEqual(ziEarly.slice(2), ["己丑", "甲子"]);
  assert.deepEqual(ziLateMidnight.slice(2), ["己丑", "甲子"]);
  assert.deepEqual(ziLateZiStart.slice(2), ["庚寅", "丙子"]);
});
