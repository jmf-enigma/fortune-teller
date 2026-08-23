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
  return chartFromResolved(resolveCalculationTime(birth, profile.time_basis), profile);
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
