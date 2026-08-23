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
});

test("unknown Western time uses a full real-day minute scan and omits angles and houses", () => {
  const result = calculate("western", { date: "2000-01-01", timezone: "UTC" });
  assert.equal(result.facts.angles.status, "unavailable");
  assert.equal(result.facts.houses.status, "unavailable");
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
