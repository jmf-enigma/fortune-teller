import { Solar } from "lunar-typescript";
import { Temporal } from "@js-temporal/polyfill";
import { makeEnvelope } from "../core/result.mjs";
import { FortuneTellerError } from "../core/errors.mjs";
import { resolveProfile } from "../core/profiles.mjs";
import {
  civilDayBounds,
  normalizeBirthInput,
  normalizeDate,
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
const STEM_CLASHES = [["甲", "庚"], ["乙", "辛"], ["丙", "壬"], ["丁", "癸"]];
const BRANCH_HARMS = [["子", "未"], ["丑", "午"], ["寅", "巳"], ["卯", "辰"], ["申", "亥"], ["酉", "戌"]];
const BRANCH_BREAKS = [["子", "酉"], ["丑", "辰"], ["寅", "亥"], ["卯", "午"], ["巳", "申"], ["未", "戌"]];
const BRANCH_PUNISHMENTS = [["寅", "巳"], ["巳", "申"], ["申", "寅"], ["丑", "戌"], ["戌", "未"], ["未", "丑"], ["子", "卯"]];
const BRANCH_THREE_PUNISHMENTS = [
  { branches: ["寅", "巳", "申"], label: "寅巳申三刑" },
  { branches: ["丑", "戌", "未"], label: "丑戌未三刑" },
];
const SELF_PUNISHMENT_BRANCHES = new Set(["辰", "午", "酉", "亥"]);
const BRANCH_HIDDEN_STEMS = Object.freeze({
  子: ["癸"], 丑: ["己", "癸", "辛"], 寅: ["甲", "丙", "戊"], 卯: ["乙"],
  辰: ["戊", "乙", "癸"], 巳: ["丙", "戊", "庚"], 午: ["丁", "己"], 未: ["己", "丁", "乙"],
  申: ["庚", "壬", "戊"], 酉: ["辛"], 戌: ["戊", "辛", "丁"], 亥: ["壬", "甲"],
});
const BRANCH_THREE_HARMONIES = [
  { branches: ["申", "子", "辰"], element: "水" },
  { branches: ["亥", "卯", "未"], element: "木" },
  { branches: ["寅", "午", "戌"], element: "火" },
  { branches: ["巳", "酉", "丑"], element: "金" },
];
const BRANCH_THREE_MEETINGS = [
  { branches: ["寅", "卯", "辰"], element: "木" },
  { branches: ["巳", "午", "未"], element: "火" },
  { branches: ["申", "酉", "戌"], element: "金" },
  { branches: ["亥", "子", "丑"], element: "水" },
];
const SEASON_BY_BRANCH = Object.freeze({
  寅: ["spring", "early", "木"], 卯: ["spring", "middle", "木"], 辰: ["spring", "late", "木"],
  巳: ["summer", "early", "火"], 午: ["summer", "middle", "火"], 未: ["summer", "late", "火"],
  申: ["autumn", "early", "金"], 酉: ["autumn", "middle", "金"], 戌: ["autumn", "late", "金"],
  亥: ["winter", "early", "水"], 子: ["winter", "middle", "水"], 丑: ["winter", "late", "水"],
});
const HIDDEN_STEM_POSITIONS = ["main", "middle", "residual"];
const BAZI_LUCK_ONSET_SECT = 2;
const BAZI_LUCK_PERIOD_COUNT = 24;

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

function stemBranchLayerFact(factId, stemBranch, dayStem, extra = {}) {
  const [heavenlyStem, earthlyBranch] = [...stemBranch];
  const hiddenStems = BRANCH_HIDDEN_STEMS[earthlyBranch] || [];
  return {
    fact_id: factId,
    kind: "calculation_fact",
    stem_branch: stemBranch,
    heavenly_stem: heavenlyStem,
    earthly_branch: earthlyBranch,
    stem_element: STEM_ELEMENTS[STEMS.indexOf(heavenlyStem)],
    branch_element: BRANCH_ELEMENTS[BRANCHES.indexOf(earthlyBranch)],
    ten_god_stem: tenGod(dayStem, heavenlyStem),
    hidden_stems: hiddenStems,
    ten_gods_hidden_stems: hiddenStems.map((stem) => tenGod(dayStem, stem)),
    ...extra,
  };
}

function matchesUndirectedPair(left, right, pairs) {
  return pairs.some(([first, second]) => (
    (first === left && second === right) || (first === right && second === left)
  ));
}

function punishmentQualification(left, right) {
  if ([left, right].includes("子") && [left, right].includes("卯")) {
    return {
      configuration_status: "two_branch_relation_complete",
      school_variance: "the meaning and severity of the 子卯 punishment still vary by school and require whole-chart adjudication",
    };
  }
  return {
    configuration_status: "pair_component_of_three_branch_punishment",
    school_variance: "some schools read the pair component; stricter schools require the complete three-branch configuration, so this pair alone is not a closed damage verdict",
  };
}

function stemControlDirection(left, right) {
  const leftElement = Math.floor(STEMS.indexOf(left) / 2);
  const rightElement = Math.floor(STEMS.indexOf(right) / 2);
  if ((leftElement + 2) % 5 === rightElement) return "left_controls_right";
  if ((rightElement + 2) % 5 === leftElement) return "right_controls_left";
  return null;
}

function periodInteractionFacts(natalPillars, decadal, yearly = null, factPrefix = "F-BZ-I") {
  const interactions = [];
  const seen = new Set();
  const nextFactId = () => `${factPrefix}${String(interactions.length + 1).padStart(2, "0")}`;
  const add = (relationship, left, right, extra = {}) => {
    const key = JSON.stringify([relationship, left.fact_id, right.fact_id, extra.traditional_element_label || null]);
    if (seen.has(key)) return;
    seen.add(key);
    interactions.push({
      fact_id: nextFactId(),
      kind: "derived_calculation_fact",
      relationship,
      layer_fact_ids: [left.fact_id, right.fact_id],
      layers: [left.layer, right.layer],
      values: [left.stem_branch, right.stem_branch],
      ...extra,
    });
  };
  const relate = (left, right) => {
    if (left.heavenly_stem === right.heavenly_stem) add("stem_repetition", left, right);
    if (matchesUndirectedPair(left.heavenly_stem, right.heavenly_stem, STEM_COMBINATIONS)) {
      add("stem_five_combination", left, right);
    }
    if (matchesUndirectedPair(left.heavenly_stem, right.heavenly_stem, STEM_CLASHES)) add("stem_clash", left, right);
    const controlDirection = stemControlDirection(left.heavenly_stem, right.heavenly_stem);
    if (controlDirection) add("stem_control", left, right, { control_direction: controlDirection });
    if (left.earthly_branch === right.earthly_branch) {
      add("branch_repetition", left, right);
      if (SELF_PUNISHMENT_BRANCHES.has(left.earthly_branch)) add("branch_self_punishment", left, right);
    }
    if (matchesUndirectedPair(left.earthly_branch, right.earthly_branch, BRANCH_HARMONIES)) {
      add("branch_six_harmony", left, right);
    }
    const branchClash = matchesUndirectedPair(left.earthly_branch, right.earthly_branch, BRANCH_CLASHES);
    if (branchClash) add("branch_clash", left, right);
    if (matchesUndirectedPair(left.earthly_branch, right.earthly_branch, BRANCH_HARMS)) add("branch_harm", left, right);
    if (matchesUndirectedPair(left.earthly_branch, right.earthly_branch, BRANCH_BREAKS)) add("branch_break", left, right);
    if (matchesUndirectedPair(left.earthly_branch, right.earthly_branch, BRANCH_PUNISHMENTS)) {
      add("branch_punishment", left, right, punishmentQualification(left.earthly_branch, right.earthly_branch));
    }
    if (left.stem_branch === right.stem_branch) {
      add(right.layer === "natal" ? "layer_natal_pillar_repetition" : "decadal_yearly_repetition", left, right);
    }
    if (controlDirection && branchClash) add("heavenly_control_earthly_clash", left, right);
  };
  const activeLayers = [
    { ...decadal, layer: "decadal" },
    ...(yearly ? [{ ...yearly, layer: "yearly" }] : []),
  ].filter((item) => item?.fact_id);
  const natalLayers = natalPillars.map((pillar) => ({ ...pillar, layer: "natal" }));
  for (const active of activeLayers) {
    for (const natal of natalLayers) relate(active, natal);
  }
  if (activeLayers.length > 1) relate(activeLayers[1], activeLayers[0]);

  const natalBranches = new Set(natalLayers.map((item) => item.earthly_branch));
  const allLayers = [...natalLayers, ...activeLayers];
  for (const [relationship, groups] of [
    ["active_layer_completes_three_harmony", BRANCH_THREE_HARMONIES],
    ["active_layer_completes_three_meeting", BRANCH_THREE_MEETINGS],
  ]) {
    for (const group of groups) {
      const participants = allLayers.filter((item) => group.branches.includes(item.earthly_branch));
      const present = new Set(participants.map((item) => item.earthly_branch));
      const activeParticipants = participants.filter((item) => item.layer !== "natal");
      if (
        group.branches.every((branch) => present.has(branch))
        && !group.branches.every((branch) => natalBranches.has(branch))
        && activeParticipants.length > 0
      ) {
        interactions.push({
          fact_id: nextFactId(),
          kind: "derived_calculation_fact",
          relationship,
          layer_fact_ids: uniqueFactIds(participants.map((item) => item.fact_id)),
          layers: [...new Set(participants.map((item) => item.layer))],
          values: group.branches,
          traditional_element_label: group.element,
        });
      }
    }
  }
  for (const group of BRANCH_THREE_PUNISHMENTS) {
    const participants = allLayers.filter((item) => group.branches.includes(item.earthly_branch));
    const present = new Set(participants.map((item) => item.earthly_branch));
    const activeParticipants = participants.filter((item) => item.layer !== "natal");
    if (
      group.branches.every((branch) => present.has(branch))
      && !group.branches.every((branch) => natalBranches.has(branch))
      && activeParticipants.length > 0
    ) {
      interactions.push({
        fact_id: nextFactId(),
        kind: "derived_calculation_fact",
        relationship: "active_layer_completes_three_punishment",
        layer_fact_ids: uniqueFactIds(participants.map((item) => item.fact_id)),
        layers: [...new Set(participants.map((item) => item.layer))],
        values: group.branches,
        traditional_label: group.label,
        configuration_status: "complete_three_branch_configuration",
        interpretation_limit: "configuration completion is a structural fact, not an event, severity, or outcome verdict",
      });
    }
  }
  return interactions;
}

function uniqueFactIds(values) {
  return [...new Set(values)];
}

function plainDateTimeFromLibrarySolar(solar) {
  const [dateText, timeText] = solar.toYmdHms().split(" ");
  return Temporal.PlainDateTime.from(`${dateText}T${timeText}`);
}

function plainDateTimeText(value) {
  return value.toString({ smallestUnit: "second" });
}

function comparePlainDateTimes(left, right) {
  return Temporal.PlainDateTime.compare(left, right);
}

function exactYearPillarsForDate(date, dayStem) {
  const parsed = Temporal.PlainDate.from(date);
  const probes = [
    { label: "day_start", hour: 0, minute: 0, second: 0 },
    { label: "day_end", hour: 23, minute: 59, second: 59 },
  ].map((probe) => {
    const solar = Solar.fromYmdHms(
      parsed.year,
      parsed.month,
      parsed.day,
      probe.hour,
      probe.minute,
      probe.second,
    );
    const stemBranch = solar.getLunar().getEightChar().getYear();
    return { ...probe, stem_branch: stemBranch };
  });
  const alternatives = [...new Set(probes.map((probe) => probe.stem_branch))];
  if (alternatives.length === 1) {
    return {
      status: "resolved_for_full_civil_date",
      yearly: stemBranchLayerFact("F-BZ-Y01", alternatives[0], dayStem, {
        date,
        boundary_basis: "solar-term year pillar; stable at both ends of the requested civil date",
      }),
    };
  }
  return {
    status: "solar_term_boundary_on_requested_date",
    yearly: null,
    yearly_alternatives: alternatives.map((stemBranch, index) => stemBranchLayerFact(
      `F-BZ-Y01${String.fromCharCode(65 + index)}`,
      stemBranch,
      dayStem,
      { date, boundary_basis: "requested date contains the solar-term year transition" },
    )),
  };
}

function activeLuckPeriodForDate(date, onset, decadal) {
  const dayStart = Temporal.PlainDate.from(date).toPlainDateTime({ hour: 0 });
  const dayEnd = dayStart.add({ days: 1 });
  const periodAt = (moment) => decadal.find((period) => (
    comparePlainDateTimes(moment, Temporal.PlainDateTime.from(period.start_local)) >= 0
    && comparePlainDateTimes(moment, Temporal.PlainDateTime.from(period.end_local_exclusive)) < 0
  ));
  const atStart = periodAt(dayStart);
  const atEnd = periodAt(dayEnd.subtract({ nanoseconds: 1 }));
  if (atStart?.fact_id === atEnd?.fact_id) {
    if (atStart) return { status: "resolved_for_full_civil_date", active_decadal_fact_id: atStart.fact_id };
    if (comparePlainDateTimes(dayEnd, onset) <= 0) {
      return { status: "before_first_decadal_luck_cycle", active_decadal_fact_id: null };
    }
    return { status: "outside_released_luck_cycle_table", active_decadal_fact_id: null };
  }
  return {
    status: "luck_cycle_boundary_on_requested_date",
    active_decadal_fact_id: null,
    active_decadal_alternatives: [...new Set([atStart?.fact_id || "pre_luck", atEnd?.fact_id || "pre_luck"])],
  };
}

function luckCycleFacts(chart, input) {
  if (!input.chart_sex) {
    return {
      fact_id: "F-BZ-L01",
      kind: "calculation_fact",
      status: "not_requested",
      reason: "chart_sex was not supplied, so luck-cycle direction and periods were not inferred",
    };
  }
  const value = chart.resolved.local;
  const solar = Solar.fromYmdHms(value.year, value.month, value.day, value.hour, value.minute, value.second);
  const eightChar = solar.getLunar().getEightChar();
  const gender = input.chart_sex === "male" ? 1 : 0;
  const yun = eightChar.getYun(gender, BAZI_LUCK_ONSET_SECT);
  const onset = plainDateTimeFromLibrarySolar(yun.getStartSolar());
  const dayStem = chart.pillars.find((pillar) => pillar.pillar === "day").heavenly_stem;
  const libraryPeriods = yun.getDaYun(BAZI_LUCK_PERIOD_COUNT).slice(1);
  const decadal = libraryPeriods.map((period, index) => {
    const start = onset.add({ years: index * 10 });
    const end = onset.add({ years: (index + 1) * 10 });
    return stemBranchLayerFact(`F-BZ-D${String(index + 1).padStart(2, "0")}`, period.getGanZhi(), dayStem, {
      index: index + 1,
      start_year: period.getStartYear(),
      end_year: period.getEndYear(),
      start_age: period.getStartAge(),
      end_age: period.getEndAge(),
      start_local: plainDateTimeText(start),
      end_local_exclusive: plainDateTimeText(end),
      boundary_note: "exact onset anniversary is used; start_year/end_year are the dependency's conventional year labels",
    });
  });
  const facts = {
    fact_id: "F-BZ-L01",
    kind: "calculation_fact",
    status: input.target_date ? "available_with_target" : "available",
    chart_sex_parameter: input.chart_sex,
    direction: yun.isForward() ? "forward" : "backward",
    direction_basis: "year-stem polarity and the explicitly supplied traditional male/female algorithm parameter",
    start: {
      fact_id: "F-BZ-L02",
      kind: "calculation_fact",
      local_date_time: plainDateTimeText(onset),
      elapsed_years: yun.getStartYear(),
      elapsed_months: yun.getStartMonth(),
      elapsed_days: yun.getStartDay(),
      elapsed_hours: yun.getStartHour(),
      method: "pinned minute conversion: 4320 minutes per traditional year, 360 per month, 12 per day",
      school_variance: "other schools may use a different onset conversion; this result does not average them",
    },
    decadal,
  };
  if (!input.target_date) return facts;
  const activePeriod = activeLuckPeriodForDate(input.target_date, onset, decadal);
  const yearly = exactYearPillarsForDate(input.target_date, dayStem);
  facts.target = {
    fact_id: "F-BZ-T01",
    kind: "calculation_fact",
    date: input.target_date,
    ...activePeriod,
    yearly_status: yearly.status,
    yearly: yearly.yearly,
    ...(yearly.yearly_alternatives ? { yearly_alternatives: yearly.yearly_alternatives } : {}),
    interpretation_limit: "the decadal layer is context and the yearly layer is a trigger; neither layer alone names an event or probability",
  };
  const activeDecadal = facts.target.active_decadal_fact_id
    ? decadal.find((period) => period.fact_id === facts.target.active_decadal_fact_id)
    : null;
  facts.target.decadal_interactions = activeDecadal
    ? periodInteractionFacts(chart.pillars, activeDecadal, null, "F-BZ-DI")
    : [];
  if (activeDecadal && facts.target.yearly) {
    facts.target.interaction_status = "resolved";
    facts.target.interactions = periodInteractionFacts(chart.pillars, activeDecadal, facts.target.yearly);
  } else {
    facts.target.interaction_status = "unavailable_at_boundary";
    facts.target.interactions = [];
  }
  return facts;
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
      const qualification = type === "branch_punishment"
        ? punishmentQualification(values[0], values[1]) : {};
      relationships.push({
        fact_id: `F-BZ-R${String(startIndex + relationships.length).padStart(2, "0")}`,
        kind: "derived_calculation_fact",
        relationship: type,
        values,
        pillar_ids: [pillars[left].fact_id, pillars[right].fact_id],
        pillars: [pillars[left].pillar, pillars[right].pillar],
        ...qualification,
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
    "heavenly_stem",
    STEM_CLASHES,
    "stem_clash",
    relationships.length + 1,
  ));
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
  relationships.push(...pairedRelationships(
    pillars,
    "earthly_branch",
    BRANCH_HARMS,
    "branch_harm",
    relationships.length + 1,
  ));
  relationships.push(...pairedRelationships(
    pillars,
    "earthly_branch",
    BRANCH_BREAKS,
    "branch_break",
    relationships.length + 1,
  ));
  relationships.push(...pairedRelationships(
    pillars,
    "earthly_branch",
    BRANCH_PUNISHMENTS,
    "branch_punishment",
    relationships.length + 1,
  ));
  for (let left = 0; left < pillars.length; left += 1) {
    for (let right = left + 1; right < pillars.length; right += 1) {
      if (pillars[left].heavenly_stem === pillars[right].heavenly_stem) {
        relationships.push({
          fact_id: `F-BZ-R${String(relationships.length + 1).padStart(2, "0")}`,
          kind: "derived_calculation_fact",
          relationship: "stem_repetition",
          values: [pillars[left].heavenly_stem, pillars[right].heavenly_stem],
          pillar_ids: [pillars[left].fact_id, pillars[right].fact_id],
          pillars: [pillars[left].pillar, pillars[right].pillar],
        });
      }
      if (pillars[left].earthly_branch !== pillars[right].earthly_branch) continue;
      relationships.push({
        fact_id: `F-BZ-R${String(relationships.length + 1).padStart(2, "0")}`,
        kind: "derived_calculation_fact",
        relationship: SELF_PUNISHMENT_BRANCHES.has(pillars[left].earthly_branch)
          ? "branch_self_punishment" : "branch_repetition",
        values: [pillars[left].earthly_branch, pillars[right].earthly_branch],
        pillar_ids: [pillars[left].fact_id, pillars[right].fact_id],
        pillars: [pillars[left].pillar, pillars[right].pillar],
      });
    }
  }
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
  for (const group of BRANCH_THREE_MEETINGS) {
    if (!group.branches.every((branch) => branches.includes(branch))) continue;
    const participants = pillars.filter((pillar) => group.branches.includes(pillar.earthly_branch));
    relationships.push({
      fact_id: `F-BZ-R${String(relationships.length + 1).padStart(2, "0")}`,
      kind: "derived_calculation_fact",
      relationship: "branch_full_three_meeting",
      values: group.branches,
      traditional_element_label: group.element,
      pillar_ids: participants.map((pillar) => pillar.fact_id),
      pillars: participants.map((pillar) => pillar.pillar),
    });
  }
  for (const group of BRANCH_THREE_PUNISHMENTS) {
    if (!group.branches.every((branch) => branches.includes(branch))) continue;
    const participants = pillars.filter((pillar) => group.branches.includes(pillar.earthly_branch));
    relationships.push({
      fact_id: `F-BZ-R${String(relationships.length + 1).padStart(2, "0")}`,
      kind: "derived_calculation_fact",
      relationship: "branch_full_three_punishment",
      values: group.branches,
      traditional_label: group.label,
      configuration_status: "complete_three_branch_configuration",
      pillar_ids: participants.map((pillar) => pillar.fact_id),
      pillars: participants.map((pillar) => pillar.pillar),
      interpretation_limit: "configuration completion is a structural fact, not an event, severity, or outcome verdict",
    });
  }
  let rootEvidenceCounter = 1;
  const rootEvidence = pillars.flatMap((pillar) => pillar.hidden_stems.flatMap((stem, index) => {
    const relation = stem === day.heavenly_stem
      ? "same_stem_root"
      : STEM_ELEMENTS[STEMS.indexOf(stem)] === STEM_ELEMENTS[dayStemIndex]
        ? "same_element_peer_root" : null;
    if (!relation) return [];
    return [{
      fact_id: `F-BZ-RT${String(rootEvidenceCounter++).padStart(2, "0")}`,
      kind: "derived_calculation_fact",
      source_pillar_id: pillar.fact_id,
      pillar: pillar.pillar,
      earthly_branch: pillar.earthly_branch,
      hidden_stem: stem,
      hidden_position: HIDDEN_STEM_POSITIONS[index] || `position-${index + 1}`,
      relation,
      ten_god: pillar.ten_gods_hidden_stems[index],
      interpretation_limit: "root location is emitted without a numerical weight; clashes, combinations, and transformations require separate adjudication",
    }];
  }));
  const visibleForceEvidence = pillars.filter((pillar) => pillar.pillar !== "day").map((pillar, index) => ({
    fact_id: `F-BZ-VF${String(index + 1).padStart(2, "0")}`,
    kind: "derived_calculation_fact",
    source_pillar_id: pillar.fact_id,
    pillar: pillar.pillar,
    heavenly_stem: pillar.heavenly_stem,
    ten_god: pillar.ten_god_stem,
    force_family: ["比肩", "劫财", "正印", "偏印"].includes(pillar.ten_god_stem)
      ? "support" : ["食神", "伤官"].includes(pillar.ten_god_stem)
        ? "output" : ["正财", "偏财"].includes(pillar.ten_god_stem)
          ? "resource_exchange" : "authority_pressure",
    interpretation_limit: "one visible stem is one located fact, not one point in a strength score",
  }));
  const [season, seasonStage, seasonalElement] = SEASON_BY_BRANCH[month.earthly_branch];
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
      interpretation_limit: "month branch and traditional season label are exposed as context; no seasonal strength verdict is inferred",
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
    month_command: {
      fact_id: "F-BZ-S04",
      kind: "derived_calculation_fact",
      source_pillar_id: month.fact_id,
      earthly_branch: month.earthly_branch,
      candidates_in_library_order: month.hidden_stems.map((stem, index) => ({
        hidden_stem: stem,
        ten_god: month.ten_gods_hidden_stems[index],
        hidden_position: HIDDEN_STEM_POSITIONS[index] || `position-${index + 1}`,
      })),
      exact_commander_status: "unresolved_without_solar_term_segment_rule",
      interpretation_limit: "the first hidden stem is the branch main qi; this release does not pretend it is the exact day-specific commander",
    },
    seasonal_context: {
      fact_id: "F-BZ-S05",
      kind: "derived_calculation_fact",
      source_pillar_id: month.fact_id,
      season,
      season_stage: seasonStage,
      traditional_season_element: seasonalElement,
      interpretation_limit: "season labels are categorical context, not a hidden weight or a complete strength decision",
    },
    root_evidence: rootEvidence,
    visible_force_evidence: visibleForceEvidence,
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
  const normalizedBirth = normalizeBirthInput(rawInput);
  const birth = {
    ...normalizedBirth,
    ...(rawInput.chart_sex ? { chart_sex: rawInput.chart_sex } : {}),
    ...(rawInput.target_date ? { target_date: normalizeDate(rawInput.target_date) } : {}),
  };
  ensureValidatedRange(birth);
  if (birth.target_date) {
    ensureValidatedRange({ date: birth.target_date });
    if (birth.target_date < birth.date) {
      throw new FortuneTellerError("TARGET_BEFORE_BIRTH", "BaZi target_date cannot be earlier than the birth date");
    }
  }
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
      luck_cycles: luckCycleFacts(chart, birth),
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
