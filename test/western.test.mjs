import test from "node:test";
import assert from "node:assert/strict";
import { calculate } from "../src/index.mjs";

test("J2000 wrapper fixture has stable apparent geocentric longitudes", () => {
  const result = calculate("western", {
    date: "2000-01-01", time: "12:00", timezone: "UTC", latitude: 51.4779, longitude: 0,
  });
  const byBody = Object.fromEntries(result.facts.planets.map((planet) => [planet.body, planet]));
  assert.ok(Math.abs(byBody.sun.longitude - 280.368739) < 1e-6);
  assert.ok(Math.abs(byBody.moon.longitude - 223.323891) < 1e-6);
  assert.equal(result.facts.angles.ascendant.sign, "Aries");
  assert.ok(result.facts.angles.audit.ascendant_east_horizon_y < 0);
  assert.ok(Math.abs(result.facts.angles.audit.ascendant_horizon_residual_z) < 1e-8);
  assert.ok(result.facts.angles.audit.midheaven_above_horizon_z > 0);
  assert.ok(Math.abs(result.facts.angles.audit.midheaven_meridian_residual_y) < 1e-8);
  assert.equal(result.facts.structure.sign_distribution.body_count, 10);
  assert.equal(
    Object.values(result.facts.structure.sign_distribution.unweighted_element_counts).reduce((sum, count) => sum + count, 0),
    10,
  );
  assert.ok(result.facts.structure.tight_aspects.every((item) => item.orb_degrees <= 2 && item.source_aspect_id));
  assert.match(result.facts.structure.basis, /no dominance, dignity, personality, or predictive score/);
});

test("unknown Western time uses a full real-day minute scan and omits angles and houses", () => {
  const result = calculate("western", { date: "2000-01-01", timezone: "UTC" });
  assert.equal(result.facts.angles.status, "unavailable");
  assert.equal(result.facts.houses.status, "unavailable");
  assert.equal(result.facts.planet_ranges.find((item) => item.body === "sun").label_zh, "太阳");
  assert.equal(result.sensitivity.sample_count, 1441);
  assert.equal(result.sensitivity.sample_interval, "60 seconds plus exact day end");
  assert.match(result.warnings.join("\n"), /Ascendant/);
});

test("unknown Western scan follows 23-hour and 25-hour civil days", () => {
  const spring = calculate("western", { date: "2024-03-31", timezone: "Europe/Berlin" });
  const fall = calculate("western", { date: "2024-10-27", timezone: "Europe/Berlin" });
  assert.equal(spring.sensitivity.sample_count, 23 * 60 + 1);
  assert.equal(fall.sensitivity.sample_count, 25 * 60 + 1);
});

test("Western coordinates must be supplied together, while both may be omitted", () => {
  for (const coordinate of [{ longitude: 0 }, { latitude: 51.4779 }]) {
    assert.throws(
      () => calculate("western", { date: "2000-01-01", time: "12:00", timezone: "UTC", ...coordinate }),
      (error) => error.code === "INPUT_SCHEMA_VIOLATION" && /required when/.test(error.message),
    );
  }
  const result = calculate("western", { date: "2000-01-01", time: "12:00", timezone: "UTC" });
  assert.equal(result.facts.planets.length, 10);
  assert.equal(result.facts.angles, null);
  assert.match(result.warnings.join("\n"), /Latitude\/longitude/);
});

test("slow outer planets use agreeing multi-window motion instead of a body-independent speed cutoff", () => {
  const result = calculate("western", {
    date: "2000-08-16", time: "04:00", timezone: "Asia/Shanghai",
  });
  const byBody = Object.fromEntries(result.facts.planets.map((planet) => [planet.body, planet]));
  for (const body of ["neptune", "pluto"]) {
    assert.equal(byBody[body].motion_state, "retrograde");
    assert.equal(byBody[body].retrograde, true);
    assert.equal(byBody[body].motion_audit.consistent_direction, true);
    assert.deepEqual(byBody[body].motion_audit.direction_signs, [-1]);
    assert.match(byBody[body].motion_method, /±6h, ±12h, and ±24h/);
  }
});

test("conflicting multi-window direction near a real station remains uncertain", () => {
  const result = calculate("western", {
    date: "2000-05-08", time: "12:15", timezone: "UTC",
  });
  const neptune = result.facts.planets.find((planet) => planet.body === "neptune");
  assert.equal(neptune.motion_state, "stationary-or-uncertain");
  assert.equal(neptune.retrograde, null);
  assert.equal(neptune.motion_audit.consistent_direction, false);
  assert.deepEqual(neptune.motion_audit.direction_signs, [-1, 1]);
});

test("Western calculation preserves the precision of the supplied clock time", () => {
  const minute = calculate("western", { date: "2000-01-01", time: "12:00", timezone: "UTC" });
  const second = calculate("western", { date: "2000-01-01", time: "12:00:30", timezone: "UTC" });
  const unknown = calculate("western", { date: "2000-01-01", timezone: "UTC" });
  assert.equal(minute.input.time_precision, "minute");
  assert.equal(second.input.time_precision, "second");
  assert.equal(unknown.input.time_precision, "unknown");
});
