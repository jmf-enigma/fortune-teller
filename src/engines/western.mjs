import {
  Body,
  Ecliptic,
  GeoVector,
  Observer,
  RotateVector,
  Rotation_ECT_EQD,
  Rotation_EQD_HOR,
  Spherical,
  VectorFromSphere,
} from "astronomy-engine";
import { makeEnvelope } from "../core/result.mjs";
import { FortuneTellerError } from "../core/errors.mjs";
import { resolveProfile } from "../core/profiles.mjs";
import { civilDayBounds, normalizeBirthInput, localDateTime } from "../core/time.mjs";

function ensureValidatedRange(birth) {
  const year = Number(birth.date.slice(0, 4));
  if (year < 1900 || year > 2100) {
    throw new FortuneTellerError("OUTSIDE_VALIDATED_RANGE", "Western chart dates are currently release-tested only from 1900 through 2100");
  }
}

const BODIES = [
  ["sun", "太阳", Body.Sun],
  ["moon", "月亮", Body.Moon],
  ["mercury", "水星", Body.Mercury],
  ["venus", "金星", Body.Venus],
  ["mars", "火星", Body.Mars],
  ["jupiter", "木星", Body.Jupiter],
  ["saturn", "土星", Body.Saturn],
  ["uranus", "天王星", Body.Uranus],
  ["neptune", "海王星", Body.Neptune],
  ["pluto", "冥王星", Body.Pluto],
];

const SIGNS = [
  ["Aries", "白羊座"], ["Taurus", "金牛座"], ["Gemini", "双子座"], ["Cancer", "巨蟹座"],
  ["Leo", "狮子座"], ["Virgo", "处女座"], ["Libra", "天秤座"], ["Scorpio", "天蝎座"],
  ["Sagittarius", "射手座"], ["Capricorn", "摩羯座"], ["Aquarius", "水瓶座"], ["Pisces", "双鱼座"],
];

const ASPECT_ANGLES = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180,
};

function normalizeDegrees(value) {
  return ((value % 360) + 360) % 360;
}

function signedDelta(from, to) {
  return ((to - from + 540) % 360) - 180;
}

function round(value, digits = 6) {
  return Number(value.toFixed(digits));
}

function zodiacPosition(longitude) {
  const normalized = normalizeDegrees(longitude);
  const signIndex = Math.floor(normalized / 30);
  return {
    longitude: round(normalized),
    sign_index: signIndex,
    sign: SIGNS[signIndex][0],
    sign_zh: SIGNS[signIndex][1],
    degree_in_sign: round(normalized % 30),
  };
}

function longitudeAt(body, date) {
  return normalizeDegrees(Ecliptic(GeoVector(body, date, true)).elon);
}

function planetFacts(date) {
  return BODIES.map(([id, labelZh, body], index) => {
    const coordinates = Ecliptic(GeoVector(body, date, true));
    const longitude = normalizeDegrees(coordinates.elon);
    const before = longitudeAt(body, new Date(date.getTime() - 12 * 60 * 60 * 1000));
    const after = longitudeAt(body, new Date(date.getTime() + 12 * 60 * 60 * 1000));
    const motion = signedDelta(before, after);
    const uncertain = Math.abs(motion) <= 2 / 60;
    return {
      fact_id: `F-WA-P${String(index + 1).padStart(2, "0")}`,
      kind: "calculation_fact",
      body: id,
      label_zh: labelZh,
      ...zodiacPosition(longitude),
      ecliptic_latitude: round(coordinates.elat),
      distance_au: round(coordinates.vec.Length()),
      motion_degrees_per_day: round(motion),
      motion_state: uncertain ? "stationary-or-uncertain" : motion < 0 ? "retrograde" : "direct",
      retrograde: uncertain ? null : motion < 0,
    };
  });
}

function calculateAngles(date, latitude, longitude) {
  const observer = new Observer(latitude, longitude, 0);
  const ectToEqd = Rotation_ECT_EQD(date);
  const eqdToHor = Rotation_EQD_HOR(date, observer);
  const horizonVector = (eclipticLongitude) => {
    const ect = VectorFromSphere(new Spherical(0, eclipticLongitude, 1), date);
    return RotateVector(eqdToHor, RotateVector(ectToEqd, ect));
  };
  const roots = (component) => {
    const a = horizonVector(0)[component];
    const b = horizonVector(90)[component];
    const root = normalizeDegrees(Math.atan2(-a, b) * 180 / Math.PI);
    return [root, normalizeDegrees(root + 180)];
  };
  const asc = roots("z").find((longitudeValue) => horizonVector(longitudeValue).y < 0);
  const mc = roots("y").find((longitudeValue) => horizonVector(longitudeValue).z > 0);
  const ascVector = horizonVector(asc);
  const mcVector = horizonVector(mc);
  return {
    ascendant: { fact_id: "F-WA-A01", kind: "calculation_fact", ...zodiacPosition(asc) },
    midheaven: { fact_id: "F-WA-A02", kind: "calculation_fact", ...zodiacPosition(mc) },
    audit: {
      method: "Astronomy Engine ECT→EQD→HOR rotation roots; no atmospheric refraction",
      ascendant_east_horizon_y: round(ascVector.y, 10),
      ascendant_horizon_residual_z: round(ascVector.z, 10),
      midheaven_above_horizon_z: round(mcVector.z, 10),
      midheaven_meridian_residual_y: round(mcVector.y, 10),
    },
  };
}

function assignWholeSignHouses(planets, ascendant) {
  const firstSign = ascendant.sign_index;
  return planets.map((planet) => ({
    body: planet.body,
    house: ((planet.sign_index - firstSign + 12) % 12) + 1,
  }));
}

function aspectFacts(planets, orbs) {
  const facts = [];
  for (let left = 0; left < planets.length; left += 1) {
    for (let right = left + 1; right < planets.length; right += 1) {
      const separation = Math.abs(signedDelta(planets[left].longitude, planets[right].longitude));
      for (const [aspect, exact] of Object.entries(ASPECT_ANGLES)) {
        const orb = Math.abs(separation - exact);
        if (orb <= orbs[aspect]) {
          facts.push({
            fact_id: `F-WA-X${String(facts.length + 1).padStart(3, "0")}`,
            kind: "calculation_fact",
            body_1: planets[left].body,
            body_2: planets[right].body,
            aspect,
            exact_angle: exact,
            separation_degrees: round(separation),
            orb_degrees: round(orb),
          });
          break;
        }
      }
    }
  }
  return facts;
}

function unknownTimeCalculation(birth, profile) {
  const { start, end } = civilDayBounds(birth);
  const startMs = Number(start.epochMilliseconds);
  const endMs = Number(end.epochMilliseconds);
  const sampleDates = [];
  for (let epoch = startMs; epoch < endMs; epoch += 60 * 1000) sampleDates.push(new Date(epoch));
  sampleDates.push(new Date(endMs));
  const samples = sampleDates.map(planetFacts);
  const ranges = samples[0].map((first, index) => {
    const track = samples.map((sample) => sample[index]);
    const signs = [...new Set(track.map((item) => item.sign))];
    let cursor = track[0].longitude;
    let minimum = cursor;
    let maximum = cursor;
    for (const point of track.slice(1)) {
      cursor += signedDelta(normalizeDegrees(cursor), point.longitude);
      minimum = Math.min(minimum, cursor);
      maximum = Math.max(maximum, cursor);
    }
    return {
      fact_id: `F-WA-U${String(index + 1).padStart(2, "0")}`,
      kind: "calculation_fact",
      body: first.body,
      start_longitude: first.longitude,
      end_longitude: track.at(-1).longitude,
      unwrapped_minimum_longitude: round(minimum),
      unwrapped_maximum_longitude: round(maximum),
      sign_status: signs.length === 1 ? "stable" : "boundary-sensitive",
      sign_candidates: signs,
    };
  });
  return makeEnvelope({
    system: "western",
    profile,
    input: birth,
    facts: {
      mode: "unknown-time-day-scan",
      planet_ranges: ranges,
      angles: { status: "unavailable", reason: "birth time was not supplied" },
      houses: { status: "unavailable", reason: "birth time was not supplied" },
    },
    warnings: [
      "No birth time was supplied. Ascendant, Midheaven, houses, and angle-dependent claims are omitted.",
      "Planet ranges are 60-second sampled bounds across every real instant of the local civil day, not exact continuous extrema or probability intervals.",
    ],
    sensitivity: {
      local_day_start_utc: start.toInstant().toString({ smallestUnit: "second" }),
      local_day_end_utc: end.toInstant().toString({ smallestUnit: "second" }),
      sample_count: sampleDates.length,
      sample_interval: "60 seconds plus exact day end",
    },
    meta: {
      library: "astronomy-engine",
      library_version: "2.1.19",
      zodiac: "tropical",
      interpretation_included: false,
    },
  });
}

export function calculateWestern(rawInput, profileOverride = {}) {
  const profile = resolveProfile("western", profileOverride);
  const birth = normalizeBirthInput(rawInput, { requireCoordinatePair: true });
  ensureValidatedRange(birth);
  if (!birth.time) return unknownTimeCalculation(birth, profile);
  const local = localDateTime(birth);
  const date = new Date(Number(local.epochMilliseconds));
  const planets = planetFacts(date);
  const aspects = aspectFacts(planets, profile.aspect_orbs_degrees);
  const warnings = [];
  let angles = null;
  let houses = null;
  if (birth.latitude != null && birth.longitude != null && Math.abs(birth.latitude) < 89.9) {
    angles = calculateAngles(date, birth.latitude, birth.longitude);
    houses = {
      system: "whole-sign",
      first_house_sign: angles.ascendant.sign,
      placements: assignWholeSignHouses(planets, angles.ascendant),
    };
  } else if (birth.latitude != null && Math.abs(birth.latitude) >= 89.9) {
    warnings.push("Latitude is too close to a geographic pole for a stable Ascendant; angles and houses are omitted.");
  } else {
    warnings.push("Latitude/longitude were not supplied. Ascendant, Midheaven, and houses are omitted.");
  }
  return makeEnvelope({
    system: "western",
    profile,
    input: birth,
    facts: {
      mode: "known-time",
      utc_instant: local.toInstant().toString({ smallestUnit: "second" }),
      planets,
      angles,
      houses,
      aspects,
    },
    warnings,
    meta: {
      library: "astronomy-engine",
      library_version: "2.1.19",
      coordinate_frame: "geocentric tropical ecliptic of date",
      interpretation_included: false,
    },
  });
}
