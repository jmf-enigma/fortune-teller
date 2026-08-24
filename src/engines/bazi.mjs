import { Solar } from "lunar-typescript";
import { Temporal } from "@js-temporal/polyfill";
import { makeEnvelope } from "../core/result.mjs";
import { FortuneTellerError } from "../core/errors.mjs";
import { resolveProfile } from "../core/profiles.mjs";
import {
  civilDayBounds,
  normalizeBirthInput,
  resolveCalculationTime,
  resolveZonedCalculationTime,
  serializeResolvedTime,
} from "../core/time.mjs";

const PILLAR_PARTS = ["Year", "Month", "Day", "Time"];
const PILLAR_LABELS = ["year", "month", "day", "time"];
const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const STEM_ELEMENTS = ["木", "木", "火", "火", "土", "土", "金", "金", "水", "水"];
const BRANCH_ELEMENTS = ["水", "土", "木", "木", "土", "火", "火", "土", "金", "金", "土", "水"];
const NAYIN = [
  "海中金", "炉中火", "大林木", "路旁土", "剑锋金", "山头火", "涧下水", "城头土", "白蜡金", "杨柳木",
  "泉中水", "屋上土", "霹雳火", "松柏木", "长流水", "沙中金", "山下火", "平地木", "壁上土", "金箔金",
  "覆灯火", "天河水", "大驿土", "钗钏金", "桑柘木", "大溪水", "沙中土", "天上火", "石榴木", "大海水",
];
const XUN_STARTS = ["甲子", "甲戌", "甲申", "甲午", "甲辰", "甲寅"];
const XUN_VOID = ["戌亥", "申酉", "午未", "辰巳", "寅卯", "子丑"];
const CALENDAR_REFERENCE_OFFSET = "+08:00";
const STEM_COMBINATIONS = [["甲", "己"], ["乙", "庚"], ["丙", "辛"], ["丁", "壬"], ["戊", "癸"]];
const BRANCH_HARMONIES = [["子", "丑"], ["寅", "亥"], ["卯", "戌"], ["辰", "酉"], ["巳", "申"], ["午", "未"]];
const BRANCH_CLASHES = [["子", "午"], ["丑", "未"], ["寅", "申"], ["卯", "酉"], ["辰", "戌"], ["巳", "亥"]];
const BRANCH_THREE_HARMONIES = [
  { branches: ["申", "子", "辰"], element: "水" },
  { branches: ["亥", "卯", "未"], element: "木" },
  { branches: ["寅", "午", "戌"], element: "火" },
  { branches: ["巳", "酉", "丑"], element: "金" },
];

function ensureCalendarReferenceOffset(zoned, birth) {
  if (zoned.offset === CALENDAR_REFERENCE_OFFSET) return;
  throw new FortuneTellerError(
    "UNSUPPORTED_BAZI_CALENDAR_OFFSET",
    "BaZi calendar boundaries are currently safe only when every admitted birth instant uses UTC+08:00; astronomical-instant year/month boundary calculation is not yet implemented for other offsets",
    {
      timezone: birth.timezone,
      actual_offset: zoned.offset,
      required_offset: CALENDAR_REFERENCE_OFFSET,
      guidance: "Do not convert the recorded local time by hand. Use a calculator with astronomical-instant solar-term boundaries or wait for that profile to be implemented.",
    },
  );
}

function call(object, name) {
  return object[name]();
}

function sexagenaryIndex(stem, branch) {
  return Array.from({ length: 60 }, (_, index) => index)
    .find((index) => STEMS[index % 10] === stem && BRANCHES[index % 12] === branch);
}

function tenGod(dayStem, otherStem) {
  const day = STEMS.indexOf(dayStem);
  const other = STEMS.indexOf(otherStem);
  const dayElement = Math.floor(day / 2);
  const otherElement = Math.floor(other / 2);
  const samePolarity = day % 2 === other % 2;
  if (dayElement === otherElement) return samePolarity ? "比肩" : "劫财";
  if ((dayElement + 1) % 5 === otherElement) return samePolarity ? "食神" : "伤官";
  if ((dayElement + 2) % 5 === otherElement) return samePolarity ? "偏财" : "正财";
  if ((otherElement + 1) % 5 === dayElement) return samePolarity ? "偏印" : "正印";
  return samePolarity ? "七杀" : "正官";
}

function normalizedTimePillar(eightChar, hour) {
  const branchIndex = hour === 23 ? 0 : Math.floor((hour + 1) / 2);
  const dayStem = eightChar.getDayGan();
  const stemIndex = ((STEMS.indexOf(dayStem) % 5) * 2 + branchIndex) % 10;
  const stem = STEMS[stemIndex];
  const branch = BRANCHES[branchIndex];
  const cycleIndex = sexagenaryIndex(stem, branch);
  const xunIndex = Math.floor(cycleIndex / 10);
  return {
    stem_branch: `${stem}${branch}`,
    heavenly_stem: stem,
    earthly_branch: branch,
    five_element_pair: `${STEM_ELEMENTS[stemIndex]}${BRANCH_ELEMENTS[branchIndex]}`,
    ten_god_stem: tenGod(dayStem, stem),
    nayin: NAYIN[Math.floor(cycleIndex / 2)],
    xun: XUN_STARTS[xunIndex],
    xun_void: XUN_VOID[xunIndex],
    upstream_stem_branch: eightChar.getTime(),
  };
}

function pillarFact(eightChar, prefix, label, index, timeNormalization = null) {
  const base = {
    fact_id: `F-BZ-${String(index + 1).padStart(3, "0")}`,
    kind: "calculation_fact",
    pillar: label,
    stem_branch: call(eightChar, `get${prefix}`),
    heavenly_stem: call(eightChar, `get${prefix}Gan`),
    earthly_branch: call(eightChar, `get${prefix}Zhi`),
    five_element_pair: call(eightChar, `get${prefix}WuXing`),
    hidden_stems: call(eightChar, `get${prefix}HideGan`),
    ten_god_stem: call(eightChar, `get${prefix}ShiShenGan`),
    ten_gods_hidden_stems: call(eightChar, `get${prefix}ShiShenZhi`),
    growth_phase: call(eightChar, `get${prefix}DiShi`),
    nayin: call(eightChar, `get${prefix}NaYin`),
    xun: call(eightChar, `get${prefix}Xun`),
    xun_void: call(eightChar, `get${prefix}XunKong`),
  };
  if (!timeNormalization) return base;
  const normalized = timeNormalization.upstream_stem_branch !== timeNormalization.stem_branch;
  if (!normalized) {
    return {
      ...base,
      audit: { upstream_stem_branch: timeNormalization.upstream_stem_branch, normalized_for_selected_day_boundary: false },
    };
  }
  return {
    ...base,
    stem_branch: timeNormalization.stem_branch,
    heavenly_stem: timeNormalization.heavenly_stem,
    earthly_branch: timeNormalization.earthly_branch,
    five_element_pair: timeNormalization.five_element_pair,
    ten_god_stem: timeNormalization.ten_god_stem,
    nayin: timeNormalization.nayin,
    xun: timeNormalization.xun,
    xun_void: timeNormalization.xun_void,
    audit: {
      upstream_stem_branch: timeNormalization.upstream_stem_branch,
      normalized_for_selected_day_boundary: true,
    },
  };
}

function countValues(values) {
  const counts = Object.create(null);
  for (const value of values) counts[value] = (counts[value] || 0) + 1;
  return counts;
}

function pairedRelationships(pillars, field, pairs, type, startIndex) {
  const relationships = [];
  for (let left = 0; left < pillars.length; left += 1) {
    for (let right = left + 1; right < pillars.length; right += 1) {
      const values = [pillars[left][field], pillars[right][field]];
      if (!pairs.some((pair) => pair.every((value) => values.includes(value)))) continue;
      relationships.push({
        fact_id: `F-BZ-R${String(startIndex + relationships.length).padStart(2, "0")}`,
        kind: "derived_calculation_fact",
        relationship: type,
        values,
        pillar_ids: [pillars[left].fact_id, pillars[right].fact_id],
        pillars: [pillars[left].pillar, pillars[right].pillar],
      });
    }
  }
  return relationships;
}

function chartStructure(pillars) {
  const day = pillars.find((pillar) => pillar.pillar === "day");
  const month = pillars.find((pillar) => pillar.pillar === "month");
  const dayStemIndex = STEMS.indexOf(day.heavenly_stem);
  const visibleStems = pillars.map((pillar) => pillar.heavenly_stem);
  const branches = pillars.map((pillar) => pillar.earthly_branch);
  const hiddenStems = pillars.flatMap((pillar) => pillar.hidden_stems);
  const relationships = [
    ...pairedRelationships(pillars, "heavenly_stem", STEM_COMBINATIONS, "stem_five_combination", 1),
  ];
  relationships.push(...pairedRelationships(
    pillars,
    "earthly_branch",
    BRANCH_HARMONIES,
    "branch_six_harmony",
    relationships.length + 1,
  ));
  relationships.push(...pairedRelationships(
    pillars,
    "earthly_branch",
    BRANCH_CLASHES,
    "branch_clash",
    relationships.length + 1,
  ));
  for (const group of BRANCH_THREE_HARMONIES) {
    if (!group.branches.every((branch) => branches.includes(branch))) continue;
    const participants = pillars.filter((pillar) => group.branches.includes(pillar.earthly_branch));
    relationships.push({
      fact_id: `F-BZ-R${String(relationships.length + 1).padStart(2, "0")}`,
      kind: "derived_calculation_fact",
      relationship: "branch_full_three_harmony",
      values: group.branches,
      traditional_element_label: group.element,
      pillar_ids: participants.map((pillar) => pillar.fact_id),
      pillars: participants.map((pillar) => pillar.pillar),
    });
  }
  return {
    basis: "transparent structural derivations only; counts are unweighted occurrences, not a strength, pattern, or useful-god score",
    day_master: {
      fact_id: "F-BZ-S01",
      kind: "derived_calculation_fact",
      heavenly_stem: day.heavenly_stem,
      element: STEM_ELEMENTS[dayStemIndex],
      polarity: dayStemIndex % 2 === 0 ? "yang" : "yin",
      source_pillar_id: day.fact_id,
    },
    month_context: {
      fact_id: "F-BZ-S02",
      kind: "derived_calculation_fact",
      earthly_branch: month.earthly_branch,
      branch_element: BRANCH_ELEMENTS[BRANCHES.indexOf(month.earthly_branch)],
      source_pillar_id: month.fact_id,
      interpretation_limit: "month branch is exposed as context; no seasonal strength is inferred",
    },
    occurrence_counts: {
      fact_id: "F-BZ-S03",
      kind: "derived_calculation_fact",
      visible_stem_elements: countValues(visibleStems.map((stem) => STEM_ELEMENTS[STEMS.indexOf(stem)])),
      branch_elements: countValues(branches.map((branch) => BRANCH_ELEMENTS[BRANCHES.indexOf(branch)])),
      hidden_stem_elements: countValues(hiddenStems.map((stem) => STEM_ELEMENTS[STEMS.indexOf(stem)])),
      visible_ten_gods: countValues(pillars.map((pillar) => pillar.ten_god_stem)),
      hidden_ten_gods: countValues(pillars.flatMap((pillar) => pillar.ten_gods_hidden_stems)),
      interpretation_limit: "visible stems, branches, and hidden stems are deliberately not pooled or weighted",
    },
    relationships,
  };
}

function chartFromResolved(resolved, profile) {
  const value = resolved.local;
  const solar = Solar.fromYmdHms(value.year, value.month, value.day, value.hour, value.minute, value.second);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();
  eightChar.setSect(profile.day_boundary === "zi-start" ? 1 : 2);
  const normalizedTime = normalizedTimePillar(eightChar, value.hour);
  const pillars = PILLAR_PARTS.map((prefix, index) => pillarFact(
    eightChar,
    prefix,
    PILLAR_LABELS[index],
    index,
    prefix === "Time" ? normalizedTime : null,
  ));
  return {
    resolved,
    solar_date: solar.toYmdHms(),
    lunar_date: lunar.toString(),
    pillars,
    auxiliary: {
      fetal_origin: eightChar.getTaiYuan(),
      fetal_breath: eightChar.getTaiXi(),
      life_palace: eightChar.getMingGong(),
      body_palace: eightChar.getShenGong(),
    },
  };
}

function chartAt(birth, profile) {
  const resolved = resolveCalculationTime(birth, profile.time_basis);
  ensureCalendarReferenceOffset(resolved.zoned, birth);
  return chartFromResolved(resolved, profile);
}

function ensureValidatedRange(birth) {
  const year = Number(birth.date.slice(0, 4));
  if (year < 1900 || year > 2100) {
    throw new FortuneTellerError("OUTSIDE_VALIDATED_RANGE", "BaZi dates are currently release-tested only from 1900 through 2100");
  }
}

function pillarSignatureAt(plainDateTime, profile) {
  const solar = Solar.fromYmdHms(
    plainDateTime.year,
    plainDateTime.month,
    plainDateTime.day,
    plainDateTime.hour,
    plainDateTime.minute,
    plainDateTime.second,
  );
  const eightChar = solar.getLunar().getEightChar();
  eightChar.setSect(profile.day_boundary === "zi-start" ? 1 : 2);
  return [eightChar.getYear(), eightChar.getMonth(), eightChar.getDay(), normalizedTimePillar(eightChar, plainDateTime.hour).stem_branch];
}

function boundarySensitiveWithinTwoMinutes(resolved, profile) {
  const before = pillarSignatureAt(resolved.local.subtract({ minutes: 2 }), profile);
  const after = pillarSignatureAt(resolved.local.add({ minutes: 2 }), profile);
  return before.some((value, index) => value !== after[index]);
}

function nearBoundary(resolved) {
  const minute = resolved.local.hour * 60 + resolved.local.minute + resolved.local.second / 60;
  const boundaries = Array.from({ length: 13 }, (_, index) => ((index * 120 + 60) % 1440));
  const distance = Math.min(...boundaries.map((boundary) => {
    const raw = Math.abs(minute - boundary);
    return Math.min(raw, 1440 - raw);
  }));
  return distance <= 2;
}

function stableValues(candidates, path) {
  const counts = new Map();
  for (const candidate of candidates) {
    const value = path(candidate);
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].map(([value, regime_count]) => ({ value, regime_count }));
}

function unknownTimeCalculation(birth, profile) {
  const { start, end } = civilDayBounds(birth);
  const startEpoch = Number(start.epochMilliseconds);
  const endEpoch = Number(end.epochMilliseconds);
  const probeEpochs = [startEpoch];
  for (let epoch = startEpoch + 30_000; epoch < endEpoch; epoch += 60_000) probeEpochs.push(epoch);
  if (probeEpochs.at(-1) !== endEpoch) probeEpochs.push(endEpoch);
  const candidates = probeEpochs.map((epoch) => {
    const zoned = Temporal.Instant.fromEpochMilliseconds(epoch).toZonedDateTimeISO(birth.timezone);
    ensureCalendarReferenceOffset(zoned, birth);
    const resolved = resolveZonedCalculationTime(zoned, birth, profile.time_basis);
    const chart = chartFromResolved(resolved, profile);
    return {
      epoch,
      civil_probe: `${zoned.toPlainDateTime().toString({ smallestUnit: "second" })}${zoned.offset}`,
      calculation_probe: chart.resolved.local.toString({ smallestUnit: "second" }),
      year: chart.pillars[0].stem_branch,
      month: chart.pillars[1].stem_branch,
      day: chart.pillars[2].stem_branch,
      time: chart.pillars[3].stem_branch,
    };
  });
  const variants = [];
  for (const candidate of candidates) {
    const signature = [candidate.year, candidate.month, candidate.day, candidate.time].join("|");
    const previous = variants.at(-1);
    if (previous?.signature === signature) {
      previous.end_civil_probe = candidate.civil_probe;
      previous.end_calculation_probe = candidate.calculation_probe;
      previous.probe_count += 1;
    } else {
      variants.push({
        variant_id: `V-BZ-${String(variants.length + 1).padStart(2, "0")}`,
        signature,
        start_civil_probe: candidate.civil_probe,
        end_civil_probe: candidate.civil_probe,
        start_calculation_probe: candidate.calculation_probe,
        end_calculation_probe: candidate.calculation_probe,
        probe_count: 1,
        year: candidate.year,
        month: candidate.month,
        day: candidate.day,
        time: candidate.time,
      });
    }
  }
  const stable = {
    year: stableValues(variants, (item) => item.year),
    month: stableValues(variants, (item) => item.month),
    day: stableValues(variants, (item) => item.day),
  };
  const facts = Object.entries(stable).map(([pillar, values], index) => ({
    fact_id: `F-BZ-U${String(index + 1).padStart(2, "0")}`,
    kind: "calculation_fact",
    pillar,
    status: values.length === 1 ? "stable" : "time-sensitive",
    alternatives: values,
  }));
  return makeEnvelope({
    system: "bazi",
    profile,
    input: birth,
    facts: {
      mode: "unknown-time-sensitivity",
      stable_pillars: facts,
      time_pillar: { status: "unavailable", reason: "birth time was not supplied" },
    },
    warnings: [
      "No birth time was supplied. No hour-pillar interpretation is permitted.",
      "The civil day was scanned at 60-second resolution with exact day-edge probes; displayed variant boundaries are probe bounds, not exact transition timestamps.",
      "Probe counts describe scan coverage, not birth-time likelihood or predictive probability.",
    ],
    sensitivity: {
      candidate_count: variants.length,
      probe_count: candidates.length,
      coverage_unit: "consecutive pillar regimes found by a full civil-day scan",
      scan_resolution_seconds: 60,
      variants: variants.map(({ signature, ...variant }) => variant),
    },
    meta: {
      library: "lunar-typescript",
      library_version: "1.8.6",
      library_role: "calendar and Four Pillars calculation",
      interpretation_included: false,
    },
  });
}

export function calculateBazi(rawInput, profileOverride = {}) {
  const profile = resolveProfile("bazi", profileOverride);
  const birth = normalizeBirthInput(rawInput);
  ensureValidatedRange(birth);
  if (!birth.time) return unknownTimeCalculation(birth, profile);
  const chart = chartAt(birth, profile);
  const warnings = [];
  const timePillar = chart.pillars.find((pillar) => pillar.pillar === "time");
  if (timePillar.audit.normalized_for_selected_day_boundary) {
    warnings.push("LATE_ZI_UPSTREAM_MISMATCH: the hour stem was recomputed from the selected day pillar to avoid a mixed 23:00 boundary convention.");
  }
  if (profile.time_basis === "apparent-solar") {
    warnings.push("Apparent solar time uses a documented approximation to the equation of time.");
    if (nearBoundary(chart.resolved)) {
      warnings.push("The adjusted time is within two minutes of a double-hour boundary; compare adjacent profiles before interpretation.");
    }
  }
  if (boundarySensitiveWithinTwoMinutes(chart.resolved, profile)) {
    warnings.push("CALENDAR_BOUNDARY_NEAR: one or more pillars change within a ±2 minute audit window.");
  }
  return makeEnvelope({
    system: "bazi",
    profile,
    input: birth,
    facts: {
      mode: "known-time",
      resolved_time: serializeResolvedTime(chart.resolved, birth.disambiguation),
      solar_date: chart.solar_date,
      lunar_date: chart.lunar_date,
      pillars: chart.pillars,
      structure: chartStructure(chart.pillars),
      auxiliary: chart.auxiliary,
    },
    warnings,
    meta: {
      library: "lunar-typescript",
      library_version: "1.8.6",
      library_role: "calendar and Four Pillars calculation",
      interpretation_included: false,
    },
  });
}
