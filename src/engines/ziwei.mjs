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
  normalizeDate,
  resolveCalculationTime,
  resolveZonedCalculationTime,
  serializeResolvedTime,
} from "../core/time.mjs";

const UNKNOWN_TIME_SCAN_SECONDS = 60;
const PERIOD_TARGET_TIME_INDEX = 0;
const MUTAGEN_LABELS = ["禄", "权", "科", "忌"];
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

function normalizeTargetDate(value) {
  if (value == null) return null;
  try {
    return normalizeDate(value);
  } catch {
    throw new FortuneTellerError(
      "INVALID_TARGET_DATE",
      "target_date must be a valid Gregorian calendar date in YYYY-MM-DD form",
    );
  }
}

function ensureTargetValidatedRange(targetDate) {
  if (!targetDate) return;
  const year = Number(targetDate.slice(0, 4));
  if (year < 1900 || year > 2100) {
    throw new FortuneTellerError(
      "TARGET_OUTSIDE_VALIDATED_RANGE",
      "Zi Wei target dates are currently release-tested only from 1900 through 2100",
    );
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

function periodCoverageError() {
  return new FortuneTellerError(
    "TARGET_OUTSIDE_DECADAL_COVERAGE",
    "iztro did not resolve target_date to one covered 大限 and matching 流年 for this natal chart and profile",
  );
}

function sameValues(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function periodRecordMatches(current, listed) {
  return current.index === listed.index
    && current.heavenlyStem === listed.heavenlyStem
    && current.earthlyBranch === listed.earthlyBranch
    && sameValues(current.palaceNames, listed.palaceNames)
    && sameValues(current.mutagen, listed.mutagen);
}

function natalStarLocations(starName, palaces) {
  const locations = [];
  for (const palace of palaces) {
    for (const [starGroup, stars] of [
      ["major", palace.major_stars],
      ["minor", palace.minor_stars],
      ["adjective", palace.adjective_stars],
    ]) {
      for (const star of stars) {
        if (star.name !== starName) continue;
        locations.push({
          natal_palace_id: palace.fact_id,
          natal_palace_index: palace.index,
          natal_palace_name: palace.name,
          star_group: starGroup,
        });
      }
    }
  }
  return locations;
}

function compactPeriodMutagens(period, palaces, factPrefix) {
  if (!Array.isArray(period.mutagen) || period.mutagen.length !== MUTAGEN_LABELS.length) {
    throw new Error("iztro period mutagen output did not contain the documented four-star order");
  }
  return period.mutagen.map((star, index) => ({
    fact_id: `${factPrefix}M${index + 1}`,
    kind: "calculation_fact",
    transformation: MUTAGEN_LABELS[index],
    star,
    natal_locations: natalStarLocations(star, palaces),
  }));
}

function compactPeriodStarPalaces(period, palaces, factPrefix, yearlyDecStar = null) {
  if (
    !Array.isArray(period.palaceNames)
    || period.palaceNames.length !== 12
    || !Array.isArray(period.stars)
    || period.stars.length !== 12
  ) {
    throw new Error("iztro period palace/star output did not contain twelve indexed palace slots");
  }
  if (
    yearlyDecStar
    && (
      !Array.isArray(yearlyDecStar.suiqian12)
      || yearlyDecStar.suiqian12.length !== 12
      || !Array.isArray(yearlyDecStar.jiangqian12)
      || yearlyDecStar.jiangqian12.length !== 12
    )
  ) {
    throw new Error("iztro yearly cycle-star output did not contain twelve indexed palace slots");
  }
  const palaceByIndex = new Map(palaces.map((palace) => [palace.index, palace]));
  return period.palaceNames.map((periodPalaceName, palaceIndex) => {
    const natalPalace = palaceByIndex.get(palaceIndex);
    if (!natalPalace) throw new Error("iztro natal palace indices did not cover every period palace slot");
    return {
      fact_id: `${factPrefix}S${String(palaceIndex + 1).padStart(2, "0")}`,
      kind: "calculation_fact",
      natal_palace_id: natalPalace.fact_id,
      natal_palace_index: natalPalace.index,
      natal_palace_name: natalPalace.name,
      period_palace_name: periodPalaceName,
      stars: period.stars[palaceIndex].map(compactStar),
      ...(yearlyDecStar ? {
        yearly_cycle_stars: {
          suiqian_12: yearlyDecStar.suiqian12[palaceIndex],
          jiangqian_12: yearlyDecStar.jiangqian12[palaceIndex],
        },
      } : {}),
    };
  });
}

function compactPeriod(period, palaces, factPrefix, extra = {}) {
  const focusPalace = palaces.find((palace) => palace.index === period.index);
  if (!focusPalace) throw new Error("iztro period focus index did not match a natal palace");
  const { yearly_dec_star_raw: yearlyDecStar = null, ...extraFields } = extra;
  return {
    fact_id: `${factPrefix}00`,
    kind: "calculation_fact",
    name: period.name,
    index: period.index,
    heavenly_stem: period.heavenlyStem,
    earthly_branch: period.earthlyBranch,
    focus: {
      natal_palace_id: focusPalace.fact_id,
      natal_palace_index: focusPalace.index,
      natal_palace_name: focusPalace.name,
      period_palace_name: period.palaceNames[period.index],
    },
    ...extraFields,
    mutagens: compactPeriodMutagens(period, palaces, factPrefix),
    star_palaces: compactPeriodStarPalaces(period, palaces, factPrefix, yearlyDecStar),
  };
}

function calculatePeriodFacts(functionalChart, targetDate, palaces) {
  if (
    typeof functionalChart.horoscope !== "function"
    || typeof functionalChart.decadalList !== "function"
    || typeof functionalChart.yearlyList !== "function"
  ) {
    throw new Error("the pinned iztro chart did not expose the expected horoscope APIs");
  }
  const functionalHoroscope = functionalChart.horoscope(targetDate, PERIOD_TARGET_TIME_INDEX);
  if (typeof functionalHoroscope?.toJSON !== "function") {
    throw new Error("the pinned iztro horoscope did not expose the expected serialization API");
  }
  const horoscope = structuredClone(functionalHoroscope.toJSON());
  const decadals = JSON.parse(JSON.stringify(functionalChart.decadalList()));
  if (horoscope.decadal?.name !== "大限") throw periodCoverageError();
  const matchingDecadalIndices = decadals.flatMap((candidate, index) => (
    periodRecordMatches(horoscope.decadal, candidate) ? [index] : []
  ));
  if (matchingDecadalIndices.length !== 1) throw periodCoverageError();
  const decadalSequenceIndex = matchingDecadalIndices[0];
  const activeDecadal = decadals[decadalSequenceIndex];
  const yearlyList = JSON.parse(JSON.stringify(functionalChart.yearlyList(decadalSequenceIndex)));
  const matchingYearIndices = yearlyList.flatMap((candidate, index) => (
    periodRecordMatches(horoscope.yearly, candidate) ? [index] : []
  ));
  if (matchingYearIndices.length !== 1) throw periodCoverageError();
  const yearlySequenceIndex = matchingYearIndices[0];
  const activeYear = yearlyList[yearlySequenceIndex];
  if (
    activeYear.year < activeDecadal.yearRange[0]
    || activeYear.year > activeDecadal.yearRange[1]
    || activeYear.age < activeDecadal.ageRange[0]
    || activeYear.age > activeDecadal.ageRange[1]
  ) {
    throw periodCoverageError();
  }

  const yearlyDecStar = horoscope.yearly.yearlyDecStar;
  const decadal = compactPeriod(horoscope.decadal, palaces, "F-ZW-D", {
    sequence_index: decadalSequenceIndex,
    nominal_age_range: [...activeDecadal.ageRange],
    calendar_year_range: [...activeDecadal.yearRange],
    indexed_natal_palace_name: activeDecadal.palaceName,
  });
  const yearly = compactPeriod(horoscope.yearly, palaces, "F-ZW-Y", {
    sequence_index: yearlySequenceIndex,
    calendar_year: activeYear.year,
    nominal_age: activeYear.age,
    yearly_dec_star_raw: yearlyDecStar,
  });
  return {
    mode: "target-date-decadal-yearly",
    target: {
      fact_id: "F-ZW-T01",
      kind: "calculation_fact",
      requested_date: targetDate,
      iztro_solar_date: horoscope.solarDate,
      iztro_lunar_date: horoscope.lunarDate,
      target_time_index: PERIOD_TARGET_TIME_INDEX,
      target_time_policy: "date-only target evaluated at explicit Zi Wei time index 0; only decadal and yearly facts are retained",
    },
    decadal,
    yearly,
    interpretation_limit: "calculated period indexing, palace mapping, mutagens, and stars only; no auspiciousness, event, or outcome is inferred",
  };
}

function palaceStructure(palaces) {
  const byIndex = new Map(palaces.map((palace, arrayIndex) => [palace.index, { palace, arrayIndex }]));
  const atOffset = (palace, offset) => {
    const targetIndex = ((palace.index + offset) % 12 + 12) % 12;
    return byIndex.get(targetIndex)?.palace;
  };
  const palaceRelations = palaces.map((palace, index) => {
    const trines = [atOffset(palace, 4), atOffset(palace, 8)];
    const opposite = atOffset(palace, 6);
    if (trines.some((item) => !item) || !opposite) {
      throw new Error("iztro palace indices are not a complete 0-11 cycle");
    }
    return {
      fact_id: `F-ZW-R${String(index + 1).padStart(2, "0")}`,
      kind: "derived_calculation_fact",
      focus_palace_id: palace.fact_id,
      focus_palace: palace.name,
      trine_palace_ids: trines.map((item) => item.fact_id),
      trine_palaces: trines.map((item) => item.name),
      opposite_palace_id: opposite.fact_id,
      opposite_palace: opposite.name,
      four_directions_palace_ids: [palace.fact_id, ...trines.map((item) => item.fact_id), opposite.fact_id],
      derivation: "palace index offsets +4, +8, and +6 on the complete twelve-palace cycle",
    };
  });
  const mutagenLocations = [];
  for (const palace of palaces) {
    for (const [star_group, stars] of [
      ["major", palace.major_stars],
      ["minor", palace.minor_stars],
      ["adjective", palace.adjective_stars],
    ]) {
      for (const star of stars) {
        if (!star.mutagen) continue;
        mutagenLocations.push({
          fact_id: `F-ZW-M${String(mutagenLocations.length + 1).padStart(2, "0")}`,
          kind: "derived_calculation_fact",
          mutagen: star.mutagen,
          star: star.name,
          star_group,
          palace_id: palace.fact_id,
          palace: palace.name,
          derivation: "copied from the pinned iztro natal-star mutagen field",
        });
      }
    }
  }
  return {
    basis: "structural index only; no single-star or predictive interpretation is implied",
    palace_relations: palaceRelations,
    mutagen_locations: mutagenLocations,
  };
}

function makeChart(date, timeIndex, gender, profile, targetDate = null) {
  const functionalChart = astro.withOptions({
    type: "solar",
    dateStr: date,
    timeIndex,
    gender,
    fixLeap: profile.fix_leap_month,
    language: "zh-CN",
    config: libraryConfig(profile),
  });
  const result = structuredClone(functionalChart.toJSON());
  const palaces = result.palaces.map(compactPalace);
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
    palaces,
    structure: palaceStructure(palaces),
    ...(targetDate ? { periods: calculatePeriodFacts(functionalChart, targetDate, palaces) } : {}),
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
      ...(candidates.some((candidate) => candidate.calculation_time_example.utc_offset !== "+08:00") ? [
        "CALENDAR_DAY_PROFILE_QUALIFIED: this chart uses the declared birthplace-civil calendar day outside UTC+08:00; other Zi Wei lineages may use a different Chinese-calendar reference day.",
      ] : []),
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
    const targetDate = normalizeTargetDate(rawInput.target_date);
    ensureTargetValidatedRange(targetDate);
    const gender = normalizeGender(rawInput.chart_sex ?? rawInput.gender);
    if (!birth.time && targetDate) {
      throw new FortuneTellerError(
        "TARGET_DATE_REQUIRES_BIRTH_TIME",
        "Zi Wei decadal/yearly facts require one resolved natal chart; target_date cannot be used when birth time is unknown",
      );
    }
    if (!birth.time) return unknownTimeCalculation(birth, gender, profile);
    const resolved = resolveCalculationTime(birth, profile.time_basis);
    if (
      targetDate
      && Temporal.PlainDate.compare(Temporal.PlainDate.from(targetDate), resolved.local.toPlainDate()) < 0
    ) {
      throw new FortuneTellerError("TARGET_BEFORE_BIRTH", "target_date cannot be earlier than the resolved birth date");
    }
    const timeIndex = hourToZiweiIndex(resolved.local.hour);
    const chart = makeChart(iztroDate(resolved.local), timeIndex, gender, profile, targetDate);
    const warnings = [];
    if (resolved.zoned.offset !== "+08:00") {
      warnings.push("CALENDAR_DAY_PROFILE_QUALIFIED: this chart uses the declared birthplace-civil calendar day outside UTC+08:00; other Zi Wei lineages may use a different Chinese-calendar reference day.");
    }
    return makeEnvelope({
      system: "ziwei",
      profile,
      input: {
        ...birth,
        chart_sex: gender === "男" ? "male" : "female",
        ...(targetDate ? { target_date: targetDate } : {}),
      },
      facts: {
        mode: "known-time",
        resolved_time: serializeResolvedTime(resolved, birth.disambiguation),
        time_index: timeIndex,
        summary: chart.summary,
        palaces: chart.palaces,
        structure: chart.structure,
        ...(chart.periods ? { periods: chart.periods } : {}),
      },
      warnings,
      meta: {
        library: "iztro",
        library_version: "2.6.0",
        library_role: "Zi Wei chart calculation",
        dependency_config_isolation: "private pinned iztro realm with canonical per-calculation config",
        ...(targetDate ? { period_api: "iztro horoscope() + decadalList() + yearlyList()" } : {}),
        interpretation_included: false,
      },
    });
  });
}
