/**
 * Qiong Tong Bao Jian climate-source screening index.
 *
 * This is an independently transcribed lookup of stems mentioned in each Day
 * Stem x solar-month source scope.  The arrays are deliberately unordered:
 * the text often gives primary, paired, auxiliary, alternative, conditional,
 * inherent, or even contraindicated roles.  Until those conditions are
 * machine-closed, this pack screens source mentions and chart locations only.
 * It never turns stem presence into an effective useful-god, wealth, rank,
 * health, or event claim.
 */

const MONTHS = Object.freeze([
  ["寅", "正月"], ["卯", "二月"], ["辰", "三月"], ["巳", "四月"],
  ["午", "五月"], ["未", "六月"], ["申", "七月"], ["酉", "八月"],
  ["戌", "九月"], ["亥", "十月"], ["子", "十一月"], ["丑", "十二月"],
]);

// Source-mentioned stems only. Their array position is not a priority order.
// Some rows are sourced from an explicitly grouped seasonal passage; those
// entries are marked below and must not be presented as if the source supplied
// a separate month paragraph.
const MENTIONED_STEMS_BY_ENTRY = Object.freeze({
  甲: [
    ["丙", "癸"], ["庚", "丁", "戊"], ["庚", "壬"], ["癸", "丁", "庚"],
    ["癸", "丁", "庚"], ["丁", "庚"], ["丁", "庚"], ["丁", "丙", "庚"],
    ["丁", "壬", "癸", "庚"], ["庚", "丁", "丙", "戊"], ["丁", "庚", "丙"], ["庚", "丁"],
  ],
  乙: [
    ["丙", "癸"], ["丙", "癸"], ["癸", "丙"], ["癸", "辛", "丙"],
    ["癸", "丙"], ["丙", "癸"], ["己", "丙", "癸"], ["癸", "丙"],
    ["癸", "辛"], ["丙", "戊"], ["丙"], ["丙", "戊"],
  ],
  丙: [
    ["壬", "庚"], ["壬"], ["壬", "甲"], ["壬", "庚"],
    ["壬", "庚"], ["壬", "庚"], ["壬", "戊"], ["壬"],
    ["甲", "壬"], ["甲", "戊", "庚"], ["壬", "戊"], ["壬", "甲"],
  ],
  丁: [
    ["庚"], ["庚", "甲"], ["甲", "庚"], ["甲", "庚"],
    ["壬", "庚", "甲"], ["甲", "壬", "庚"], ["甲", "丙", "庚"], ["甲", "丙", "庚"],
    ["甲", "庚"], ["甲", "庚"], ["甲", "庚", "戊"], ["甲", "庚"],
  ],
  戊: [
    ["丙", "甲", "癸"], ["丙", "甲", "癸"], ["甲", "丙", "癸"], ["甲", "丙", "癸"],
    ["壬", "甲", "丙"], ["癸", "丙", "甲"], ["丙", "癸", "甲"], ["丙", "癸"],
    ["甲", "癸", "丙"], ["甲", "丙"], ["丙", "甲"], ["丙", "甲"],
  ],
  己: [
    ["丙", "戊"], ["甲", "癸", "丙"], ["丙", "癸", "甲"], ["癸", "丙"],
    ["癸", "丙"], ["癸", "丙"], ["癸", "丙", "辛"], ["癸", "丙", "辛"],
    ["甲", "癸", "丙"], ["丙", "甲", "戊"], ["丙", "甲"], ["丙", "甲"],
  ],
  庚: [
    ["丙", "甲"], ["丁", "甲"], ["甲", "丁"], ["壬", "戊", "丙"],
    ["壬", "癸"], ["丁", "甲"], ["丁", "甲"], ["丁", "甲", "丙"],
    ["甲", "壬"], ["丁", "丙", "甲"], ["丁", "甲", "丙"], ["丙", "丁", "甲"],
  ],
  辛: [
    ["己", "壬", "庚"], ["壬", "甲"], ["壬", "甲"], ["壬", "癸", "甲"],
    ["壬", "己", "癸"], ["壬", "庚"], ["壬", "甲", "戊"], ["壬", "甲"],
    ["壬", "甲"], ["壬", "丙"], ["壬", "丙", "戊"], ["丙", "壬"],
  ],
  壬: [
    ["庚", "丙", "戊"], ["戊", "辛", "庚"], ["甲", "庚"], ["壬", "辛", "庚"],
    ["癸", "庚"], ["辛", "甲", "癸"], ["戊", "丁"], ["甲", "庚"],
    ["甲", "丙"], ["戊", "丙", "庚"], ["戊", "丙"], ["丙", "甲", "丁"],
  ],
  癸: [
    ["辛", "丙", "庚"], ["庚", "辛"], ["丙", "辛", "甲"], ["辛", "庚", "壬"],
    ["庚", "辛", "壬"], ["庚", "辛", "壬"], ["丁", "甲"], ["辛", "丙"],
    ["辛", "甲", "癸"], ["庚", "辛"], ["丙", "辛"], ["丙", "壬", "丁"],
  ],
});

const GROUPED_LOCATORS = Object.freeze({
  "甲-午": "三夏甲木／五六月甲木／五月先癸后丁、庚金次之",
  "甲-未": "三夏甲木／五六月甲木／六月先丁后庚",
  "乙-丑": "三冬乙木（分月段落未单列）",
  "丁-申": "三秋丁火／七月丁火",
  "丁-酉": "三秋丁火／八月条件段",
  "丁-戌": "三秋丁火／九月条件段",
  "丁-亥": "三冬丁火",
  "丁-未": "三夏丁火／六月之丁",
  "丁-子": "三冬丁火（甲庚总论）／十一月丁火（条件段）",
  "丁-丑": "三冬丁火",
  "戊-寅": "三春戊土／正二月总论",
  "戊-卯": "三春戊土／正二月总论",
  "戊-子": "三冬戊土／十一二月",
  "戊-丑": "三冬戊土／十一二月",
  "己-巳": "三夏己土",
  "己-午": "三夏己土",
  "己-未": "三夏己土",
  "己-申": "三秋己土",
  "己-酉": "三秋己土",
  "己-戌": "三秋己土／九月补充",
  "己-亥": "三冬己土",
  "己-子": "三冬己土",
  "己-丑": "三冬己土",
});

const SEGMENT_SPLITS = Object.freeze({
  "乙-午": "原文区分上半月、下半月，并在金水多时改变路线；当前没有月内节气段事实。",
  "乙-酉": "原文区分秋分前后；当前没有可复核的秋分前后事实。",
  "癸-辰": "原文区分清明后与谷雨后；当前没有可复核的节气段事实。",
  "癸-未": "原文区分上下半月是否需要比劫；当前没有月内分段事实。",
  "壬-丑": "原文区分上下半月并另列丁甲辅佐条件；当前没有月内分段事实。",
});

const CONDITIONAL_ROLE_KEYS = new Set([
  "甲-卯", "甲-巳", "乙-申", "丙-申", "丙-亥",
  "丁-午", "丁-申", "丁-子", "己-寅", "辛-巳",
  "辛-午", "辛-酉", "辛-子", "壬-寅", "壬-未",
  "壬-酉", "癸-寅", "癸-巳", "癸-戌", "癸-丑",
]);

// Only roles independently checked against the registered transcription are
// encoded. All other rows remain source-mention screening entries.
const VERIFIED_ROLE_EXAMPLES = Object.freeze({
  "辛-子": [
    { stem: "壬", roles: ["primary"] },
    { stem: "丙", roles: ["paired_required"] },
    { stem: "戊", roles: ["conditional_rescue", "contraindicated_in_base_route"], condition: "壬多或水局时作救应；基础壬丙路线要求不见戊癸" },
  ],
  "丙-申": [
    { stem: "壬", roles: ["primary"] },
    { stem: "戊", roles: ["conditional_control"], condition: "壬多时" },
  ],
  "己-寅": [
    { stem: "丙", roles: ["primary"] },
    { stem: "戊", roles: ["conditional_rescue"], condition: "壬多时" },
  ],
  "丁-申": [
    { stem: "甲", roles: ["primary"] },
    { stem: "丙", roles: ["auxiliary"] },
    { stem: "庚", roles: ["inherent_in_month_branch"] },
  ],
  "丁-子": [
    { stem: "甲", roles: ["general_winter_pair"] },
    { stem: "庚", roles: ["general_winter_pair"] },
    { stem: "戊", roles: ["conditional_rescue"], condition: "壬争合或水重时" },
  ],
  "辛-午": [
    { stem: "己", roles: ["paired_required"] },
    { stem: "壬", roles: ["paired_required"] },
    { stem: "癸", roles: ["alternative"], condition: "无壬时" },
  ],
  "乙-酉": [
    { stem: "癸", roles: ["primary_before_秋分", "secondary_after_秋分"] },
    { stem: "丙", roles: ["primary_after_秋分"] },
  ],
  "壬-丑": [
    { stem: "丙", roles: ["primary_all_month"] },
    { stem: "甲", roles: ["auxiliary_lower_half"] },
    { stem: "丁", roles: ["conditional_auxiliary"] },
  ],
  "癸-辰": [
    { stem: "丙", roles: ["primary"] },
    { stem: "辛", roles: ["auxiliary_after_谷雨"] },
    { stem: "甲", roles: ["auxiliary_after_谷雨"] },
  ],
});

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

const rules = [];
for (const [dayStem, rows] of Object.entries(MENTIONED_STEMS_BY_ENTRY)) {
  if (rows.length !== MONTHS.length) throw new Error(`climate row ${dayStem} must contain twelve months`);
  rows.forEach((mentionedStems, index) => {
    const [monthBranch, monthLabel] = MONTHS[index];
    const key = `${dayStem}-${monthBranch}`;
    const grouped = GROUPED_LOCATORS[key];
    const segmentNote = SEGMENT_SPLITS[key];
    const conditionStatus = segmentNote
      ? "requires_solar_term_segment"
      : CONDITIONAL_ROLE_KEYS.has(key)
        ? "conditional_roles_not_adjudicated"
        : "source_mentions_screening_only";
    const verifiedRoles = VERIFIED_ROLE_EXAMPLES[key] || mentionedStems.map((stem) => ({
      stem,
      roles: ["source_mentioned_role_unresolved"],
    }));
    rules.push({
      id: `QT-${dayStem}-${monthBranch}`,
      day_stem: dayStem,
      month_branch: monthBranch,
      mentioned_stems: [...mentionedStems],
      stem_roles: verifiedRoles.map((item) => ({ ...item, roles: [...item.roles] })),
      applicability: {
        status: conditionStatus,
        missing_facts: segmentNote
          ? ["solar_term_segment"]
          : ["entry_specific_role_and_condition_closure"],
        note: segmentNote || "原文中的角色、组合、阻碍与例外尚未逐条闭合为机器规则。",
      },
      source_id: "SRC-BZ-QIONGTONG-WIKISOURCE",
      source_locator: grouped || `${monthLabel}${dayStem}${["甲", "乙"].includes(dayStem) ? "木" : ["丙", "丁"].includes(dayStem) ? "火" : ["戊", "己"].includes(dayStem) ? "土" : ["庚", "辛"].includes(dayStem) ? "金" : "水"}`,
      source_granularity: grouped ? "grouped_seasonal_or_month-pair_passage" : "month_entry",
      coverage: "source_mentioned_stems_screening_index",
      interpretation_limit: "Array position is not priority. Presence only screens source mentions and chart locations; role, applicability, efficacy, combinations, obstructions, exceptions, and classical outcome language are not generally adjudicated.",
    });
  });
}

export const BAZI_CLIMATE_RULEPACK_META = deepFreeze({
  rulepack_id: "bazi-qiongtong-climate-screening-v2",
  version: "0.5.0",
  source_id: "SRC-BZ-QIONGTONG-WIKISOURCE",
  entry_count: rules.length,
  coverage: "ten_day_stems_x_twelve_solar_month_branches_source_mention_screening_index",
  ordering_policy: "no_total_priority_order_without_entry_specific_role_and_condition_closure",
  adjudication_boundary: "source-mention and chart-location screening only; no useful-god efficacy, classical status, wealth, health, family, or event verdict",
});

export const BAZI_CLIMATE_RULES = deepFreeze(rules);
const RULE_BY_KEY = new Map(BAZI_CLIMATE_RULES.map((rule) => [`${rule.day_stem}-${rule.month_branch}`, rule]));

export function getBaziClimateRule(dayStem, monthBranch) {
  return RULE_BY_KEY.get(`${dayStem}-${monthBranch}`) || null;
}

if (BAZI_CLIMATE_RULES.length !== 120 || RULE_BY_KEY.size !== 120) {
  throw new Error("BaZi climate rule pack must contain exactly 120 unique screening entries");
}

for (const rule of BAZI_CLIMATE_RULES) {
  const mentioned = new Set(rule.mentioned_stems);
  if (!rule.stem_roles.every((item) => mentioned.has(item.stem))) {
    throw new Error(`${rule.id} role metadata must reference a source-mentioned stem`);
  }
}
