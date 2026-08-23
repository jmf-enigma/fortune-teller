import { Temporal } from "@js-temporal/polyfill";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { makeEnvelope } from "../core/result.mjs";
import { FortuneTellerError } from "../core/errors.mjs";
import { resolveProfile } from "../core/profiles.mjs";
import {
  civilDayBounds,
  hourToZiweiIndex,
  normalizeBirthInput,
  resolveCalculationTime,
  resolveZonedCalculationTime,
  serializeResolvedTime,
} from "../core/time.mjs";

const UNKNOWN_TIME_SCAN_SECONDS = 60;
const require = createRequire(import.meta.url);

function loadIsolatedIztro() {
  const filename = require.resolve("iztro/dist/iztro.min.js");
  const commonJsModule = { exports: {} };
  runInNewContext(
    readFileSync(filename, "utf8"),
    { module: commonJsModule, exports: commonJsModule.exports, self: {} },
    { filename },
  );
  const isolated = commonJsModule.exports?.astro;
  if (!isolated?.withOptions || !isolated?.getConfig) {
    throw new Error("the pinned iztro bundle did not expose the expected calculation API");
  }
  return isolated;
}

const astro = loadIsolatedIztro();

function normalizeGender(value) {
  const key = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (["男", "male", "m"].includes(key)) return "男";
  if (["女", "female", "f"].includes(key)) return "女";
  throw new FortuneTellerError(
    "MISSING_CHART_SEX",
    "ziwei requires chart_sex=male or chart_sex=female because the traditional algorithm uses a binary calculation parameter; this need not describe gender identity",
  );
}

function ensureValidatedRange(birth) {
  const year = Number(birth.date.slice(0, 4));
  if (year < 1900 || year > 2100) {
    throw new FortuneTellerError("OUTSIDE_VALIDATED_RANGE", "Zi Wei dates are currently release-tested only from 1900 through 2100");
  }
}

function libraryConfig(profile) {
  return {
    yearDivide: profile.year_divide,
    horoscopeDivide: profile.horoscope_divide,
    ageDivide: profile.age_divide,
    dayDivide: profile.day_divide,
    algorithm: profile.algorithm,
  };
}

function cloneConfigTable(table) {
  return Object.fromEntries(
    Object.entries(table || {}).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value]),
  );
}

function replaceConfigTable(target, source) {
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, cloneConfigTable(source));
}

function withCanonicalLibraryConfig(profile, calculate) {
  // iztro exposes configuration as a process-global singleton. Clear its two
  // additive tables for this synchronous calculation, then restore the host's
  // exact prior state so another iztro consumer cannot change our chart facts.
  const current = astro.getConfig();
  const previous = {
    mutagens: cloneConfigTable(current.mutagens),
    brightness: cloneConfigTable(current.brightness),
    yearDivide: current.yearDivide,
    horoscopeDivide: current.horoscopeDivide,
    ageDivide: current.ageDivide,
    dayDivide: current.dayDivide,
    algorithm: current.algorithm,
  };
  replaceConfigTable(current.mutagens, {});
  replaceConfigTable(current.brightness, {});
  astro.config(libraryConfig(profile));
  try {
    return calculate();
  } finally {
    const active = astro.getConfig();
    replaceConfigTable(active.mutagens, previous.mutagens);
    replaceConfigTable(active.brightness, previous.brightness);
    astro.config({
      yearDivide: previous.yearDivide,
      horoscopeDivide: previous.horoscopeDivide,
      ageDivide: previous.ageDivide,
      dayDivide: previous.dayDivide,
      algorithm: previous.algorithm,
    });
  }
}

function iztroDate(plainDateTime) {
  return `${plainDateTime.year}-${plainDateTime.month}-${plainDateTime.day}`;
}

function compactStar(star) {
  return {
    name: star.name,
    type: star.type,
    scope: star.scope,
    ...(star.brightness ? { brightness: star.brightness } : {}),
    ...(star.mutagen ? { mutagen: star.mutagen } : {}),
  };
}

function compactPalace(palace, index) {
  return {
    fact_id: `F-ZW-P${String(index + 1).padStart(2, "0")}`,
    kind: "calculation_fact",
    index: palace.index,
    name: palace.name,
    is_body_palace: palace.isBodyPalace,
    is_original_palace: palace.isOriginalPalace,
    heavenly_stem: palace.heavenlyStem,
    earthly_branch: palace.earthlyBranch,
    major_stars: palace.majorStars.map(compactStar),
    minor_stars: palace.minorStars.map(compactStar),
    adjective_stars: palace.adjectiveStars.map(compactStar),
    changsheng_12: palace.changsheng12,
    boshi_12: palace.boshi12,
    jiangqian_12: palace.jiangqian12,
    suiqian_12: palace.suiqian12,
    decadal: palace.decadal,
    ages: palace.ages,
  };
}

function makeChart(date, timeIndex, gender, profile) {
  const result = structuredClone(astro.withOptions({
    type: "solar",
    dateStr: date,
    timeIndex,
    gender,
    fixLeap: profile.fix_leap_month,
    language: "zh-CN",
    config: libraryConfig(profile),
  }).toJSON());
  return {
    summary: {
      gender: result.gender,
      solar_date: result.solarDate,
      lunar_date: result.lunarDate,
      chinese_date: result.chineseDate,
      time: result.time,
      time_range: result.timeRange,
      zodiac: result.zodiac,
      western_sign: result.sign,
      soul_star: result.soul,
      body_star: result.body,
      five_elements_class: result.fiveElementsClass,
      soul_palace_branch: result.earthlyBranchOfSoulPalace,
      body_palace_branch: result.earthlyBranchOfBodyPalace,
    },
    palaces: result.palaces.map(compactPalace),
  };
}

function chartSignature(chart) {
  return chart.palaces.map((palace) => ({
    palace: palace.name,
    branch: palace.earthly_branch,
    major_stars: palace.major_stars.map((star) => star.name),
  }));
}

function stableSummary(candidates, field) {
  const counts = new Map();
  for (const candidate of candidates) {
    const value = candidate.summary[field];
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return {
    fact_id: `F-ZW-S-${field.toUpperCase()}`,
    kind: "calculation_fact",
    field,
    status: counts.size === 1 ? "stable" : "time-sensitive",
    alternatives: [...counts.entries()].map(([value, regimeCount]) => ({ value, regime_count: regimeCount })),
  };
}

function scanUnknownTimeRegimes(birth, profile) {
  const { start, end } = civilDayBounds(birth);
  const startMs = Number(start.toInstant().epochMilliseconds);
  const endMs = Number(end.toInstant().epochMilliseconds);
  const stepMs = UNKNOWN_TIME_SCAN_SECONDS * 1_000;
  const instants = [];
  for (let epochMs = startMs; epochMs <= endMs; epochMs += stepMs) {
    instants.push(epochMs);
  }
  if (instants.at(-1) !== endMs) instants.push(endMs);

  const regimes = [];
  for (const epochMs of instants) {
    const instant = Temporal.Instant.fromEpochMilliseconds(epochMs);
    const zoned = instant.toZonedDateTimeISO(birth.timezone);
    const resolved = resolveZonedCalculationTime(zoned, birth, profile.time_basis);
    const timeIndex = hourToZiweiIndex(resolved.local.hour);
    const calculationDate = resolved.local.toPlainDate().toString();
    const key = `${calculationDate}|${timeIndex}`;
    const probe = { instant, zoned, resolved, timeIndex, calculationDate };
    const current = regimes.at(-1);
    if (current?.key === key) {
      current.end = probe;
      current.probe_count += 1;
    } else {
      regimes.push({ key, start: probe, end: probe, probe_count: 1 });
    }
  }
  return { regimes, probeCount: instants.length };
}

function serializeRegime(regime, regimeIndex, gender, profile) {
  const chart = makeChart(regime.start.calculationDate, regime.start.timeIndex, gender, profile);
  return {
    regime_index: regimeIndex,
    civil_probe_range: {
      start_local: regime.start.zoned.toString({ smallestUnit: "second" }),
      end_local: regime.end.zoned.toString({ smallestUnit: "second" }),
      start_instant: regime.start.instant.toString({ smallestUnit: "second" }),
      end_instant: regime.end.instant.toString({ smallestUnit: "second" }),
    },
    civil_probe_count: regime.probe_count,
    calculation_date: regime.start.calculationDate,
    calculation_time_index: regime.start.timeIndex,
    calculation_time_example: serializeResolvedTime(regime.start.resolved, "instant-scan"),
    summary: chart.summary,
    palace_signature: chartSignature(chart),
  };
}

function unknownTimeCalculation(birth, gender, profile) {
  const scan = scanUnknownTimeRegimes(birth, profile);
  const candidates = scan.regimes.map((regime, index) => serializeRegime(regime, index, gender, profile));
  const fields = [
    "soul_star", "body_star", "five_elements_class", "soul_palace_branch", "body_palace_branch",
  ];
  return makeEnvelope({
    system: "ziwei",
    profile,
    input: { ...birth, chart_sex: gender === "男" ? "male" : "female" },
    facts: {
      mode: "unknown-time-sensitivity",
      stable_summary: fields.map((field) => stableSummary(candidates, field)),
      single_chart: { status: "unavailable", reason: "birth time was not supplied" },
    },
    warnings: [
      "No birth time was supplied. A single Zi Wei chart must not be inferred from these candidates.",
      "Candidates are consecutive calculation-date/time-index regimes across every real instant of the civil day; skipped or repeated DST clock times are handled by the named timezone.",
      `The scan resolution is ${UNKNOWN_TIME_SCAN_SECONDS} seconds and includes both day edges. Regime and probe counts are coverage diagnostics, not probabilities.`,
    ],
    sensitivity: {
      candidate_count: candidates.length,
      probe_count: scan.probeCount,
      scan_resolution_seconds: UNKNOWN_TIME_SCAN_SECONDS,
      candidates,
    },
    meta: {
      library: "iztro",
      library_version: "2.6.0",
      library_role: "Zi Wei chart calculation",
      dependency_config_isolation: "private pinned iztro realm with canonical per-calculation config",
      interpretation_included: false,
    },
  });
}

export function calculateZiwei(rawInput, profileOverride = {}) {
  const profile = resolveProfile("ziwei", profileOverride);
  return withCanonicalLibraryConfig(profile, () => {
    const birth = normalizeBirthInput(rawInput);
    ensureValidatedRange(birth);
    const gender = normalizeGender(rawInput.chart_sex ?? rawInput.gender);
    if (!birth.time) return unknownTimeCalculation(birth, gender, profile);
    const resolved = resolveCalculationTime(birth, profile.time_basis);
    const timeIndex = hourToZiweiIndex(resolved.local.hour);
    const chart = makeChart(iztroDate(resolved.local), timeIndex, gender, profile);
    const warnings = [];
    if (profile.time_basis === "apparent-solar") {
      warnings.push("Apparent solar time uses a documented approximation to the equation of time.");
    }
    return makeEnvelope({
      system: "ziwei",
      profile,
      input: { ...birth, chart_sex: gender === "男" ? "male" : "female" },
      facts: {
        mode: "known-time",
        resolved_time: serializeResolvedTime(resolved, birth.disambiguation),
        time_index: timeIndex,
        summary: chart.summary,
        palaces: chart.palaces,
      },
      warnings,
      meta: {
        library: "iztro",
        library_version: "2.6.0",
        library_role: "Zi Wei chart calculation",
        dependency_config_isolation: "private pinned iztro realm with canonical per-calculation config",
        interpretation_included: false,
      },
    });
  });
}
