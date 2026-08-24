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
const SIGN_ELEMENTS = ["fire", "earth", "air", "water", "fire", "earth", "air", "water", "fire", "earth", "air", "water"];
const SIGN_MODALITIES = ["cardinal", "fixed", "mutable", "cardinal", "fixed", "mutable", "cardinal", "fixed", "mutable", "cardinal", "fixed", "mutable"];

const ASPECT_ANGLES = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180,
};

const MOTION_WINDOWS_HOURS = [6, 12, 24];
const MOTION_NUMERICAL_EPSILON = 1e-9;

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

function centeredMotionRate(body, date, halfWindowHours) {
  const halfWindowMs = halfWindowHours * 60 * 60 * 1000;
  const before = longitudeAt(body, new Date(date.getTime() - halfWindowMs));
  const after = longitudeAt(body, new Date(date.getTime() + halfWindowMs));
  const elapsedDays = (2 * halfWindowHours) / 24;
  return signedDelta(before, after) / elapsedDays;
}

function motionFacts(body, date) {
  const rates = Object.fromEntries(MOTION_WINDOWS_HOURS.map((hours) => [
    `plus_minus_${hours}_hours`,
    centeredMotionRate(body, date, hours),
  ]));
  const resolvedSigns = Object.values(rates)
    .filter((rate) => Math.abs(rate) > MOTION_NUMERICAL_EPSILON)
    .map((rate) => Math.sign(rate));
  const distinctSigns = new Set(resolvedSigns);
  const directionIsConsistent = distinctSigns.size === 1;
  const direction = directionIsConsistent ? resolvedSigns[0] : null;
  const motion = rates.plus_minus_12_hours;
  return {
    motion_degrees_per_day: round(motion),
    motion_state: direction == null ? "stationary-or-uncertain" : direction < 0 ? "retrograde" : "direct",
    retrograde: direction == null ? null : direction < 0,
    motion_method: "centered ecliptic-longitude finite differences at ±6h, ±12h, and ±24h; direction is reported only when all resolved window signs agree",
    motion_audit: {
      numerical_zero_epsilon_degrees_per_day: MOTION_NUMERICAL_EPSILON,
      window_rates_degrees_per_day: Object.fromEntries(
        Object.entries(rates).map(([window, rate]) => [window, round(rate, 9)]),
      ),
      direction_signs: [...distinctSigns].sort(),
      consistent_direction: directionIsConsistent,
    },
  };
}

function planetFacts(date, { includeMotion = true } = {}) {
  return BODIES.map(([id, labelZh, body], index) => {
    const coordinates = Ecliptic(GeoVector(body, date, true));
    const longitude = normalizeDegrees(coordinates.elon);
    return {
      fact_id: `F-WA-P${String(index + 1).padStart(2, "0")}`,
      kind: "calculation_fact",
      body: id,
      label_zh: labelZh,
      ...zodiacPosition(longitude),
      ecliptic_latitude: round(coordinates.elat),
      distance_au: round(coordinates.vec.Length()),
      ...(includeMotion ? motionFacts(body, date) : {}),
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

function countValues(values) {
  const counts = Object.create(null);
  for (const value of values) counts[value] = (counts[value] || 0) + 1;
  return counts;
}

function chartStructure(planets, aspects, houses, angles) {
  const tightAspects = aspects
    .filter((aspect) => aspect.orb_degrees <= 2)
    .toSorted((left, right) => left.orb_degrees - right.orb_degrees || left.fact_id.localeCompare(right.fact_id))
    .map((aspect, index) => ({
      fact_id: `F-WA-T${String(index + 1).padStart(3, "0")}`,
      kind: "derived_calculation_fact",
      source_aspect_id: aspect.fact_id,
      body_1: aspect.body_1,
      body_2: aspect.body_2,
      aspect: aspect.aspect,
      orb_degrees: aspect.orb_degrees,
      selection_rule: "orb_degrees <= 2; presentation priority only",
    }));
  return {
    basis: "unweighted descriptive structure only; no dominance, dignity, personality, or predictive score is implied",
    sign_distribution: {
      fact_id: "F-WA-S01",
      kind: "derived_calculation_fact",
      body_count: planets.length,
      unweighted_element_counts: countValues(planets.map((planet) => SIGN_ELEMENTS[planet.sign_index])),
      unweighted_modality_counts: countValues(planets.map((planet) => SIGN_MODALITIES[planet.sign_index])),
      source_planet_ids: planets.map((planet) => planet.fact_id),
      interpretation_limit: "Sun through Pluto each count once; angles are excluded and counts do not establish dominance",
    },
    reference_points: {
      fact_id: "F-WA-S02",
      kind: "derived_calculation_fact",
      luminary_ids: planets.filter((planet) => ["sun", "moon"].includes(planet.body)).map((planet) => planet.fact_id),
      angle_ids: angles ? [angles.ascendant.fact_id, angles.midheaven.fact_id] : [],
    },
    tight_aspects: tightAspects,
    house_occupancy: houses ? {
      fact_id: "F-WA-S03",
      kind: "derived_calculation_fact",
      system: houses.system,
      unweighted_planet_counts: countValues(houses.placements.map((placement) => String(placement.house))),
      interpretation_limit: "occupancy is a count of emitted planet placements, not a house-strength score",
    } : null,
  };
}

function unknownTimeCalculation(birth, profile) {
  const { start, end } = civilDayBounds(birth);
  const startMs = Number(start.epochMilliseconds);
  const endMs = Number(end.epochMilliseconds);
  const sampleDates = [];
  for (let epoch = startMs; epoch < endMs; epoch += 60 * 1000) sampleDates.push(new Date(epoch));
  sampleDates.push(new Date(endMs));
  const samples = sampleDates.map((date) => planetFacts(date, { includeMotion: false }));
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
      label_zh: first.label_zh,
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
      structure: chartStructure(planets, aspects, houses, angles),
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
