import test from "node:test";
import assert from "node:assert/strict";
import { calculate } from "../src/index.mjs";
import { verifyCalculationFacts } from "../src/core/calculation-verifier.mjs";
import {
  canonicalZiweiNarrative,
  deriveZiweiMeaningBinding,
} from "../src/core/meaning-layer.mjs";
import { adjudicateZiweiReading } from "../src/core/ziwei-reading-adjudicator.mjs";
import { ZIWEI_PATTERN_EVIDENCE_META } from "../src/core/ziwei-pattern-evidence.mjs";
import { verifyCalculationEnvelope } from "../src/core/result.mjs";
import {
  detectPatterns,
  VERIFIED_PATTERN_RULES,
  VERIFIED_ZIWEI_PATTERN_RULE_COUNT,
  ZIWEI_TRADITIONAL_PATTERN_BOUNDARIES,
  ZIWEI_TRADITIONAL_PATTERN_CATALOG_COUNT,
} from "../src/data/ziwei-traditional-patterns-mingyu.mjs";

const BASE = {
  date: "1980-01-15",
  time: "08:00",
  timezone: "Asia/Shanghai",
  chart_sex: "male",
};

const SYNTHETIC_PALACE_NAMES = [
  "命", "兄弟", "夫妻", "子女", "财帛", "疾厄",
  "迁移", "交友", "官禄", "田宅", "福德", "父母",
];
const SYNTHETIC_BRANCHES = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"];
const STAR_GROUPS = ["major_stars", "minor_stars", "other_stars"];

function syntheticPalaces(configure) {
  const palaces = SYNTHETIC_PALACE_NAMES.map((name, index) => ({
    index,
    name,
    is_body_palace: index === 5,
    is_original_palace: false,
    heavenly_stem: "甲",
    earthly_branch: SYNTHETIC_BRANCHES[index],
    major_stars: [],
    minor_stars: [],
    other_stars: [],
    scope_stars: [],
    empty_state: true,
    opposite_palace_index: (index + 6) % 12,
    surrounded_palace_indexes: [index, (index + 4) % 12, (index + 8) % 12, (index + 6) % 12],
  }));
  configure(palaces);
  for (const palace of palaces) palace.empty_state = palace.major_stars.length === 0;
  return palaces;
}

function addStar(palaces, palaceIndex, group, name, extra = {}) {
  palaces[palaceIndex][group].push({ name, ...extra });
}

function removeStar(palaces, palaceIndex, name) {
  for (const group of STAR_GROUPS) {
    palaces[palaceIndex][group] = palaces[palaceIndex][group].filter((star) => star.name !== name);
  }
}

const RARE_PATTERN_PREDICATE_FIXTURES = [
  {
    id: "jun-chen-qing-hui",
    positive(palaces) {
      addStar(palaces, 0, "major_stars", "紫微");
      addStar(palaces, 0, "minor_stars", "左辅");
      addStar(palaces, 0, "minor_stars", "右弼");
    },
    breakOne(palaces) { removeStar(palaces, 0, "右弼"); },
  },
  {
    id: "zuo-you-jia-ming",
    positive(palaces) {
      addStar(palaces, 11, "minor_stars", "左辅");
      addStar(palaces, 1, "minor_stars", "右弼");
    },
    breakOne(palaces) { removeStar(palaces, 1, "右弼"); },
  },
  {
    id: "liang-chong-hua-gai",
    positive(palaces) {
      addStar(palaces, 0, "minor_stars", "禄存");
      addStar(palaces, 0, "major_stars", "武曲", { birth_mutagen: "禄" });
      addStar(palaces, 0, "other_stars", "地空");
    },
    breakOne(palaces) { removeStar(palaces, 0, "地空"); },
  },
  {
    id: "yu-xiu-tian-xiang",
    positive(palaces) {
      addStar(palaces, 10, "minor_stars", "文昌");
      addStar(palaces, 10, "minor_stars", "文曲");
    },
    breakOne(palaces) { removeStar(palaces, 10, "文曲"); },
  },
  {
    id: "wen-xing-chao-ming",
    positive(palaces) {
      addStar(palaces, 0, "minor_stars", "文昌");
      addStar(palaces, 0, "minor_stars", "文曲");
    },
    breakOne(palaces) { removeStar(palaces, 0, "文曲"); },
  },
  {
    id: "xing-qiu-jia-yin",
    positive(palaces) {
      addStar(palaces, 0, "major_stars", "廉贞");
      addStar(palaces, 0, "other_stars", "天刑");
    },
    breakOne(palaces) { removeStar(palaces, 0, "天刑"); },
  },
  {
    id: "kong-jie-jia-ming",
    positive(palaces) {
      addStar(palaces, 11, "other_stars", "地空");
      addStar(palaces, 1, "other_stars", "地劫");
    },
    breakOne(palaces) { removeStar(palaces, 1, "地劫"); },
  },
  {
    id: "liang-chang-miao-wang",
    positive(palaces) {
      addStar(palaces, 0, "major_stars", "天梁", { brightness: "庙" });
      addStar(palaces, 0, "minor_stars", "文昌", { brightness: "旺" });
    },
    breakOne(palaces) {
      palaces[0].minor_stars.find((star) => star.name === "文昌").brightness = "利";
    },
  },
  {
    id: "feng-liu-cai-zhang",
    positive(palaces) {
      addStar(palaces, 0, "major_stars", "贪狼");
      addStar(palaces, 0, "minor_stars", "陀罗");
    },
    breakOne(palaces) { palaces[0].earthly_branch = "卯"; },
  },
];

test("fixed Mingyu catalog keeps exactly 55 reproducible rules and 32 refusal boundaries", () => {
  assert.equal(VERIFIED_ZIWEI_PATTERN_RULE_COUNT, 55);
  assert.equal(VERIFIED_PATTERN_RULES.length, 55);
  assert.equal(ZIWEI_TRADITIONAL_PATTERN_BOUNDARIES.length, 32);
  assert.equal(Object.isFrozen(VERIFIED_PATTERN_RULES), true);
  assert.equal(Object.isFrozen(VERIFIED_PATTERN_RULES[0]), true);
  assert.equal(Object.isFrozen(ZIWEI_TRADITIONAL_PATTERN_BOUNDARIES), true);
  assert.equal(Object.isFrozen(ZIWEI_TRADITIONAL_PATTERN_BOUNDARIES[0]), true);
  assert.equal(ZIWEI_TRADITIONAL_PATTERN_CATALOG_COUNT, 87);
  assert.equal(new Set(VERIFIED_PATTERN_RULES.map((rule) => rule.id)).size, 55);
  assert.equal(new Set(ZIWEI_TRADITIONAL_PATTERN_BOUNDARIES.map((item) => item.name)).size, 32);
  assert.ok(VERIFIED_PATTERN_RULES.every((rule) => (
    /^https:\/\/zh\.wikisource\.org\/w\/index\.php\?/u.test(rule.sourceUrl)
    && /oldid=(?:2665454|2268626)/u.test(rule.sourceUrl)
    && typeof rule.calculation === "string"
    && rule.calculation.length > 5
    && !Object.hasOwn(rule, "traditionalInterpretation")
    && !Object.hasOwn(rule, "sourceQuote")
  )));
  assert.ok(ZIWEI_TRADITIONAL_PATTERN_BOUNDARIES.every((item) => (
    /oldid=(?:2665454|2268626)/u.test(item.source)
    && typeof item.reason === "string"
    && !Object.hasOwn(item, "quote")
  )));
  assert.equal(ZIWEI_PATTERN_EVIDENCE_META.upstream_commit, "bd6963b9b562cbef77c50227b625c0d3e7b36021");
  assert.equal(ZIWEI_PATTERN_EVIDENCE_META.license, "MIT");
});

test("nine rare Mingyu rules each have a minimal positive and one-predicate negative fixture", () => {
  for (const fixture of RARE_PATTERN_PREDICATE_FIXTURES) {
    const positivePalaces = syntheticPalaces(fixture.positive);
    const positive = detectPatterns({
      palaces: positivePalaces,
      birthYearHeavenlyStem: "甲",
    }).find((pattern) => pattern.id === fixture.id);
    assert.ok(positive, `${fixture.id} positive fixture`);
    assert.ok(positive.matched_conditions.length > 0, `${fixture.id} carries matched predicates`);
    assert.ok(positive.palace_indexes.length > 0, `${fixture.id} carries palace evidence`);

    const negativePalaces = structuredClone(positivePalaces);
    fixture.breakOne(negativePalaces);
    const negativeIds = detectPatterns({
      palaces: negativePalaces,
      birthYearHeavenlyStem: "甲",
    }).map((pattern) => pattern.id);
    assert.equal(negativeIds.includes(fixture.id), false, `${fixture.id} one-predicate negative fixture`);
  }
});

test("known-time calculation exposes replayable condition evidence without outcome prose or voting", () => {
  const calculation = calculate("ziwei", BASE);
  const evidence = calculation.facts.pattern_evidence;
  assert.deepEqual(evidence.coverage, {
    registered_rule_count: 55,
    evaluated_rule_count: 55,
    unevaluated_rule_count: 0,
    matched_rule_count: 3,
    not_matched_rule_count: 52,
    refusal_boundary_count: 32,
    catalog_count: 87,
  });
  assert.deepEqual(
    evidence.evaluations.map((item) => item.pattern_id),
    ["ziwei-tianfu-tonggong", "fu-bi-gong-zhu", "zuo-you-chao-yuan"],
  );
  assert.equal(evidence.evaluation_detail, "matched_only_compact_record");
  assert.ok(evidence.evaluations.every((item) => !Object.hasOwn(item, "traditional_name")));
  assert.equal(evidence.aggregation, "none");
  assert.equal(evidence.specific_event, null);
  assert.equal(/traditional_interpretation|source_quote|probability|score|vote/iu.test(JSON.stringify(evidence)), false);
  assert.deepEqual(verifyCalculationEnvelope(calculation), []);
  assert.deepEqual(verifyCalculationFacts(calculation), { status: "replayed_facts", errors: [] });

  const result = adjudicateZiweiReading(calculation, { topic: "overview" });
  assert.equal(result.named_pattern_evidence.role, "supplemental_evidence_only");
  assert.equal(result.named_pattern_evidence.main_conclusion_effect, "none");
  assert.equal(result.named_pattern_evidence.matched_conditions.length, 3);
  assert.equal(result.named_pattern_evidence.detail, "compact");
  assert.equal(Object.hasOwn(result.named_pattern_evidence, "unmet_conditions"), false);
  assert.equal(Object.hasOwn(result.named_pattern_evidence, "refusal_boundaries"), false);
  assert.equal(Object.hasOwn(result.named_pattern_evidence, "advanced_evidence"), false);
  assert.ok(result.named_pattern_evidence.matched_conditions.every((item) => (
    typeof item.display_label_zh === "string" && !Object.hasOwn(item, "traditional_name")
  )));
  assert.ok(Buffer.byteLength(JSON.stringify(result)) < 15_000);
  assert.doesNotMatch(JSON.stringify(result), /一生孤贫|生不逢时/u);

  const auditResult = adjudicateZiweiReading(calculation, { topic: "overview", pattern_detail: "audit" });
  assert.equal(auditResult.named_pattern_evidence.unmet_conditions.length, 52);
  assert.equal(auditResult.named_pattern_evidence.refusal_boundaries.length, 32);
  const advancedNames = auditResult.named_pattern_evidence.advanced_evidence.traditional_labels
    .map((item) => item.traditional_name);
  assert.ok(advancedNames.includes("一生孤贫"));
  assert.ok(advancedNames.includes("生不逢时"));
  assert.doesNotMatch(result.conclusion, /一生孤贫|生不逢时|紫府同宫|辅弼拱主|左右朝垣/u);
  assert.doesNotMatch(result.plain_language, /一生孤贫|生不逢时|紫府同宫|辅弼拱主|左右朝垣/u);
  assert.match(auditResult.named_pattern_evidence.advanced_evidence.label_boundary_zh, /不是现实事件/u);

  const noPatterns = adjudicateZiweiReading(calculation, { topic: "overview", pattern_detail: "none" });
  assert.equal(Object.hasOwn(noPatterns, "named_pattern_evidence"), false);
});

test("pattern evidence is part of replay and cannot be edited after calculation", () => {
  const forged = structuredClone(calculate("ziwei", BASE));
  forged.facts.pattern_evidence.evaluations[0].status = "not_matched";
  assert.deepEqual(verifyCalculationFacts(forged), {
    status: "replayed_facts",
    errors: ["facts do not match a current-engine replay"],
  });
});

test("unknown-time sensitivity does not repeatedly generate or expose named-pattern evidence", () => {
  const calculation = calculate("ziwei", {
    date: "1980-01-15",
    timezone: "Asia/Shanghai",
    chart_sex: "male",
  });
  assert.equal(calculation.facts.mode, "unknown-time-sensitivity");
  assert.equal(Object.hasOwn(calculation.facts, "pattern_evidence"), false);
  assert.equal(/pattern_evidence|matched_rule_count/u.test(JSON.stringify(calculation.sensitivity)), false);
});

const EMPTY_PRIMARY_FIXTURES = [
  { topic: "overview", time: "00:00", target: "命宫", source: "迁移", stars: ["太阳", "太阴"] },
  { topic: "career_study", time: "04:00", target: "官禄", source: "夫妻", stars: ["太阳", "天梁"] },
  { topic: "wealth_resources", time: "16:00", target: "财帛", source: "福德", stars: ["太阳", "太阴"] },
  { topic: "relationships", time: "08:00", target: "夫妻", source: "官禄", stars: ["武曲", "贪狼"] },
  { topic: "wellbeing_rhythm", time: "00:00", target: "福德", source: "财帛", stars: ["天机", "巨门"] },
];

test("five empty-primary-palace fixtures use exact opposite major-star names as context only", () => {
  for (const fixture of EMPTY_PRIMARY_FIXTURES) {
    const calculation = calculate("ziwei", {
      date: "1990-01-15",
      time: fixture.time,
      timezone: "Asia/Shanghai",
      chart_sex: "male",
    });
    const unit = calculation.facts.topic_units.find((item) => item.topic === fixture.topic);
    const target = calculation.facts.palaces.find((item) => item.fact_id === unit.primary_palace_id);
    const relation = calculation.facts.structure.palace_relations.find(
      (item) => item.fact_id === unit.relation_fact_id,
    );
    const source = calculation.facts.palaces.find((item) => item.fact_id === relation.opposite_palace_id);
    const context = calculation.facts.structure.empty_palace_contexts.find(
      (item) => item.fact_id === unit.primary_major_star_context_fact_id,
    );
    assert.equal(target.name, fixture.target, fixture.topic);
    assert.deepEqual(target.major_stars, [], fixture.topic);
    assert.equal(source.name, fixture.source, fixture.topic);
    assert.deepEqual(source.major_stars.map((star) => star.name), fixture.stars, fixture.topic);
    assert.equal(context.target_palace_id, target.fact_id, fixture.topic);
    assert.equal(context.source_palace_id, source.fact_id, fixture.topic);
    assert.equal(context.relation_fact_id, relation.fact_id, fixture.topic);
    assert.deepEqual(context.major_stars.map((star) => star.name), fixture.stars, fixture.topic);
    assert.ok(context.major_stars.every((star) => (
      star.borrowed_for === "context_only"
      && !Object.hasOwn(star, "brightness")
      && !Object.hasOwn(star, "mutagen")
    )), fixture.topic);

    const result = adjudicateZiweiReading(calculation, { topic: fixture.topic });
    const focus = result.lenses.palace_axis_groups[0];
    const semanticContexts = result.lenses.semantic_bindings.filter(
      (item) => item.kind === "opposite_major_star_context",
    );
    assert.equal(result.status, "qualified", fixture.topic);
    assert.equal(result.safeguards.opposite_context_used, true, fixture.topic);
    assert.equal(result.safeguards.opposite_context_policy, "exact_opposite_major_star_names_context_only_without_brightness_or_mutagen");
    assert.deepEqual(focus.major_star_axes, [], fixture.topic);
    assert.deepEqual(focus.context_only_major_star_axes.map((item) => item.star), fixture.stars, fixture.topic);
    assert.deepEqual(semanticContexts.map((item) => item.star), fixture.stars, fixture.topic);
    assert.ok(semanticContexts.every((item) => (
      item.borrowed_for === "context_only"
      && item.target_palace === fixture.target
      && item.source_palace === fixture.source
      && !Object.hasOwn(item, "brightness")
      && !Object.hasOwn(item, "mutagen")
    )), fixture.topic);
    assert.ok(result.basis.includes(context.fact_id), fixture.topic);
    assert.match(result.conclusion, /只借.*作辅助语境，不视为本宫坐守，也不借亮度或四化/u, fixture.topic);
  }
});

test("direct primary-star criteria retain complete star names instead of character splitting", () => {
  const calculation = calculate("ziwei", {
    date: "2000-08-16",
    time: "04:00",
    timezone: "Asia/Shanghai",
    chart_sex: "male",
  });
  const unit = calculation.facts.topic_units.find((item) => item.topic === "career_study");
  const claim = {
    system: "ziwei",
    scope: "topic_synthesis",
    topic: "career_study",
    topic_unit_id: unit.fact_id,
    rule_ids: ["R-ZW-007"],
    fact_ids: [unit.fact_id, unit.primary_palace_id, unit.relation_fact_id, ...unit.component_palace_ids],
    assessment: { mode: "current_reflection" },
  };
  const derivation = deriveZiweiMeaningBinding(claim, calculation, claim.rule_ids);
  assert.equal(derivation.ok, true);
  const narrative = canonicalZiweiNarrative(derivation.binding, calculation);
  const observable = narrative.assessment.criteria[0].observable;
  assert.match(observable, /廉贞在官禄宫的双向轴、天府在官禄宫的双向轴/u);
  assert.doesNotMatch(observable, /廉、贞|天、府/u);
});
