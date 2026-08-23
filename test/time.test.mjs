import test from "node:test";
import assert from "node:assert/strict";
import { calculate } from "../src/index.mjs";
import {
  civilDayBounds,
  localDateTime,
  normalizeBirthInput,
  normalizeDate,
  resolveCalculationTime,
} from "../src/core/time.mjs";

test("calendar dates and IANA zones are validated strictly", () => {
  assert.throws(() => normalizeDate("2025-02-29"), (error) => error.code === "INVALID_DATE");
  assert.throws(
    () => normalizeBirthInput({ date: "2024-01-01", timezone: "Not/AZone" }),
    (error) => error.code === "INVALID_TIMEZONE",
  );
  for (const [system, extra] of [
    ["bazi", {}],
    ["ziwei", { chart_sex: "female" }],
    ["western", {}],
  ]) {
    assert.throws(
      () => calculate(system, { date: "2024-01-01", time: "12:00", timezone: "+08:00", ...extra }),
      (error) => error.code === "INVALID_TIMEZONE",
    );
  }
});

test("DST gap and overlap are rejected unless the overlap is explicitly resolved", () => {
  const gap = normalizeBirthInput({ date: "2024-03-10", time: "02:30", timezone: "America/New_York" });
  assert.throws(() => localDateTime(gap), (error) => error.code === "AMBIGUOUS_OR_NONEXISTENT_LOCAL_TIME");
  for (const disambiguation of ["earlier", "later"]) {
    const shiftedGap = normalizeBirthInput({ ...gap, disambiguation });
    assert.throws(() => localDateTime(shiftedGap), (error) => error.code === "AMBIGUOUS_OR_NONEXISTENT_LOCAL_TIME");
    for (const [system, extra] of [
      ["bazi", {}],
      ["ziwei", { chart_sex: "female" }],
      ["western", {}],
    ]) {
      assert.throws(
        () => calculate(system, { ...gap, ...extra, disambiguation }),
        (error) => error.code === "AMBIGUOUS_OR_NONEXISTENT_LOCAL_TIME",
      );
    }
  }

  const overlap = normalizeBirthInput({ date: "2024-11-03", time: "01:30", timezone: "America/New_York" });
  assert.throws(() => localDateTime(overlap), (error) => error.code === "AMBIGUOUS_OR_NONEXISTENT_LOCAL_TIME");
  const earlier = localDateTime(normalizeBirthInput({ ...overlap, disambiguation: "earlier" }));
  const later = localDateTime(normalizeBirthInput({ ...overlap, disambiguation: "later" }));
  assert.equal(Number(later.epochMilliseconds) - Number(earlier.epochMilliseconds), 3_600_000);
});

test("unknown-time scans reject instant-only offset and overlap controls", () => {
  for (const [system, extra] of [
    ["bazi", {}],
    ["ziwei", { chart_sex: "female" }],
    ["western", {}],
  ]) {
    const base = { date: "2024-03-10", timezone: "America/New_York", ...extra };
    assert.throws(
      () => calculate(system, { ...base, utc_offset: "+08:00" }),
      (error) => error.code === "INVALID_UTC_OFFSET",
    );
    assert.throws(
      () => calculate(system, { ...base, disambiguation: "earlier" }),
      (error) => error.code === "INVALID_DISAMBIGUATION",
    );
  }
});

test("an explicit UTC offset must agree with the named timezone", () => {
  const valid = normalizeBirthInput({
    date: "2024-11-03", time: "01:30", timezone: "America/New_York", utc_offset: "-04:00",
  });
  assert.equal(localDateTime(valid).offset, "-04:00");
  const invalid = normalizeBirthInput({
    date: "2024-11-03", time: "01:30", timezone: "America/New_York", utc_offset: "+08:00",
  });
  assert.throws(() => localDateTime(invalid), (error) => error.code === "INVALID_LOCAL_TIME_OR_OFFSET");

  for (const [utcOffset, disambiguation] of [["-04:00", "later"], ["-05:00", "earlier"]]) {
    for (const [system, extra] of [
      ["bazi", {}],
      ["ziwei", { chart_sex: "female" }],
      ["western", {}],
    ]) {
      assert.throws(
        () => calculate(system, {
          date: "2024-11-03", time: "01:30", timezone: "America/New_York",
          utc_offset: utcOffset, disambiguation, ...extra,
        }),
        (error) => error.code === "CONFLICTING_TIME_RESOLUTION",
      );
    }
  }
});

test("mean solar time is explicit and preserves the standard-meridian clock at 120E", () => {
  const birth = normalizeBirthInput({
    date: "2000-01-01", time: "08:00", timezone: "Asia/Shanghai", longitude: 120,
  });
  const resolved = resolveCalculationTime(birth, "mean-solar");
  assert.equal(resolved.local.toString({ smallestUnit: "second" }), "2000-01-01T08:00:00");
  assert.equal(resolved.correction_minutes, 0);
});

test("a civil date skipped by a timezone transition fails closed", () => {
  const skipped = normalizeBirthInput({ date: "2011-12-30", timezone: "Pacific/Apia" });
  assert.throws(() => civilDayBounds(skipped), (error) => error.code === "NONEXISTENT_CIVIL_DATE");
});
