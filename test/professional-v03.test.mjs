import test from "node:test";
import assert from "node:assert/strict";
import {
  bindReadingToCalculations,
  calculate,
  INTERPRETATION_PROFILES,
  validateReading,
  verifyCalculationFacts,
} from "../src/index.mjs";
import {
  calculateFactsHash,
  calculateReproducibilityHash,
  verifyCalculationEnvelope,
} from "../src/core/result.mjs";
import {
  canonicalZiweiNarrative,
  canonicalZiweiSemanticBindings,
  deriveZiweiMeaningBinding,
} from "../src/core/meaning-layer.mjs";
import {
  canonicalTechnicalSummary,
  validateClaimSemantics,
} from "../src/core/claim-semantics.mjs";
import {
  getZiweiContextStarModifier,
  getZiweiMajorStarCombination,
  getZiweiPeriodStarModifier,
  ZIWEI_CONTEXT_STAR_MODIFIERS,
  ZIWEI_MAJOR_STAR_COMBINATIONS,
  ZIWEI_PERIOD_STAR_MODIFIERS,
} from "../src/data/ziwei-sanhe-rulepack.mjs";

const ZIWEI_BIRTH = {
  date: "2000-08-16",
  time: "04:00",
  timezone: "Asia/Shanghai",
  chart_sex: "female",
};

const ZIWEI_MULTI_MUTAGEN_BIRTH = {
  date: "1998-01-01",
  time: "00:00",
  timezone: "Asia/Shanghai",
  chart_sex: "female",
};

function interpretationProfile(id) {
  const profile = INTERPRETATION_PROFILES.find((item) => item.id === id);
  assert.ok(profile, `missing interpretation profile ${id}`);
  return profile;
}

function assertValid(payload) {
  const validation = validateReading(payload);
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  return validation;
}

function assertInvalid(payload, expected) {
  const validation = validateReading(payload);
  assert.equal(validation.valid, false, "expected reading validation to fail");
  assert.match(validation.errors.join("\n"), expected);
  return validation;
}

function currentAssessment(domain, prefix) {
  return {
    mode: "current_reflection",
    domain,
    window: { kind: "current" },
    criteria: [
      {
        criterion_id: `K-${prefix}-support`,
        polarity: "supports",
        observable: "连续两次独立记录都显示核心职责、资源与期限能够明确核对",
        evidence_source: "contemporaneous_record",
      },
      {
        criterion_id: `K-${prefix}-contradict`,
        polarity: "contradicts",
        observable: "连续两次独立记录显示核心职责、资源或期限仍存在直接冲突",
        evidence_source: "contemporaneous_record",
      },
    ],
  };
}

function requestedEvidence(factIds) {
  return factIds.map((ref, index) => ({
    ref,
    role: index === 1 ? "constraint" : "support",
  }));
}

function expectedPalaceAxisGroups(calculation, natalUnit) {
  const relation = calculation.facts.structure.palace_relations.find(
    (item) => item.fact_id === natalUnit.relation_fact_id,
  );
  assert.ok(relation);
  const groupSpecs = [
    { relation_role: "focus", relation_offset: 0 },
    { relation_role: "trine_plus_4", relation_offset: 4 },
    { relation_role: "trine_plus_8", relation_offset: 8 },
    { relation_role: "opposite_plus_6", relation_offset: 6 },
  ];
  return relation.four_directions_palace_ids.map((palaceId, index) => {
    const palace = calculation.facts.palaces.find((item) => item.fact_id === palaceId);
    assert.ok(palace);
    return {
      ...groupSpecs[index],
      palace: { fact_id: palace.fact_id, name: palace.name },
      major_star_axes: palace.major_stars.map((star) => ({
        fact_id: palace.fact_id,
        star: star.name,
        palace: palace.name,
      })),
    };
  });
}

function projectedPalaceAxisGroups(groups) {
  return groups.map((group) => ({
    relation_role: group.relation_role,
    relation_offset: group.relation_offset,
    palace: group.palace,
    major_star_axes: group.major_star_axes.map(({ fact_id: factId, star, palace }) => ({
      fact_id: factId,
      star,
      palace,
    })),
  }));
}

function flattenedPalaceStarNames(binding) {
  return binding.palace_axis_groups.flatMap((group) => group.major_star_axes.map((axis) => axis.star));
}

function expectedNatalSemanticStars(calculation, natalUnit) {
  const groups = expectedPalaceAxisGroups(calculation, natalUnit);
  const palaces = groups.map((group) => calculation.facts.palaces.find(
    (palace) => palace.fact_id === group.palace.fact_id,
  ));
  const major = palaces.flatMap((palace) => palace.major_stars.map((star) => ({
    kind: "star_in_palace",
    fact_id: palace.fact_id,
    star: star.name,
    palace: palace.name,
    star_group: "major",
    ...(star.brightness ? { brightness: star.brightness } : {}),
  })));
  const modifiers = palaces.flatMap((palace) => [
    ...palace.minor_stars.map((star) => ({ star, star_group: "minor" })),
    ...palace.adjective_stars.map((star) => ({ star, star_group: "adjective" })),
  ].filter(({ star }) => getZiweiContextStarModifier(star.name)).map(({ star, star_group: starGroup }) => ({
    kind: "star_in_palace",
    fact_id: palace.fact_id,
    star: star.name,
    palace: palace.name,
    star_group: starGroup,
  })));
  return { major, modifiers };
}

function expectedPeriodSemanticStars(calculation, unit) {
  const roles = ["focus", "trine_plus_4", "trine_plus_8", "opposite_plus_6"];
  return ["decadal", "yearly"].flatMap((scope) => (
    unit[`${scope}_component_star_palace_ids`].flatMap((factId, index) => {
      const slot = calculation.facts.periods[scope].star_palaces.find((item) => item.fact_id === factId);
      assert.ok(slot);
      return slot.stars.map((star) => {
        assert.ok(getZiweiPeriodStarModifier(star.name), `unregistered period modifier ${star.name}`);
        return {
          kind: "period_star_in_slot",
          fact_id: factId,
          topic_unit_id: unit.fact_id,
          scope,
          relation_role: roles[index],
          star: star.name,
          period_palace: slot.period_palace_name,
          natal_palace: slot.natal_palace_name,
        };
      });
    })
  ));
}

function deepNextSteps() {
  return [{
    id: "close-reading",
    label: "结束本次解读",
    action: "close",
    available: true,
    requires_input: [],
    reuses_frozen_calculation: true,
  }];
}

function makeIChingReading(calculation = calculate("iching", {
  question: "我是否应该继续推进这个机会？",
  lines: [7, 7, 7, 7, 7, 7],
})) {
  const profile = interpretationProfile("iching-structural-reflective-v1");
  const statement = "先用可核对的条件整理当前选择，再决定是否继续推进。";
  return bindReadingToCalculations({
    calculation,
    reading: {
      system: "iching",
      level: "standard",
      title: "当前选择的结构化反思",
      user_focus: "是否继续推进当前机会",
      disclaimer: "传统术数只作反思参考，不是经过验证的预测。",
      summary: statement,
      claims: [{
        claim_id: "C-iching-current",
        topic: "current_situation",
        statement,
        epistemic_status: "interpretation",
        system: "iching",
        profile: calculation.profile.id,
        scope: "structural_comparison",
        fact_ids: ["F-YJ-H01", "F-YJ-H02"],
        rule_ids: ["R-YJ-003"],
        calculation_certainty: "high",
        input_sensitivity: { label: "stable", coverage: null },
        school_stability: "not_assessed",
        source_status: "verified",
        source_ids: ["SRC-YJ-ZHOUYI-WIKISOURCE"],
        interpretation_profile_id: profile.id,
        rule_pack_hash: profile.rule_pack_hash,
        assessment: currentAssessment("current_situation", "iching"),
        practical_reflection: "把仍待确认的条件逐项写下，并用现实资料核对。",
      }],
      uncertainty_summary: "卦象不能替代现实资料，也不能保证选择结果。",
      next_steps: [],
    },
  });
}

function makeCanonicalUnresolvedReading() {
  const calculation = calculate("iching", {
    question: "现有资料能否判断这件事的具体结果？",
    lines: [7, 7, 7, 7, 7, 7],
  });
  const placeholder = "现有资料不足，先保留未决。";
  return bindReadingToCalculations({
    calculation,
    reading: {
      system: "iching",
      level: "standard",
      title: "占位标题",
      disclaimer: "占位边界",
      summary: placeholder,
      claims: [{
        claim_id: "C-iching-unresolved",
        topic: "decision",
        statement: placeholder,
        epistemic_status: "unresolved",
        system: "iching",
        profile: calculation.profile.id,
        scope: "structural_comparison",
        fact_ids: ["F-YJ-H01"],
        rule_ids: [],
        calculation_certainty: "unavailable",
        input_sensitivity: { label: "unavailable", coverage: null },
        school_stability: "not_assessed",
        source_status: "unavailable",
        source_ids: [],
      }],
      next_steps: [],
    },
  });
}

function makeCanonicalMultiSystemReading() {
  const calculations = [
    calculate("iching", { question: "当前选择", lines: [7, 7, 7, 7, 7, 7] }),
    calculate("tarot", { question: "当前选择", spread: "one", cards: ["The Fool"] }),
  ];
  const statement = "先分别核对两个传统体系的计算事实。";
  return bindReadingToCalculations({
    calculations,
    reading: {
      system: ["iching", "tarot"],
      level: "standard",
      title: "占位标题",
      disclaimer: "占位边界",
      summary: statement,
      claims: [
        {
          claim_id: "C-multi-iching",
          topic: "current_situation",
          statement,
          epistemic_status: "calculation_fact",
          system: "iching",
          profile: calculations[0].profile.id,
          scope: "primary_hexagram_identity",
          fact_ids: ["F-YJ-H01"],
          rule_ids: [],
          calculation_certainty: "high",
          input_sensitivity: { label: "stable", coverage: null },
          school_stability: "stable",
          source_status: "engine_documented",
          source_ids: [],
        },
        {
          claim_id: "C-multi-tarot",
          topic: "current_situation",
          statement: "再核对塔罗牌面事实。",
          epistemic_status: "calculation_fact",
          system: "tarot",
          profile: calculations[1].profile.id,
          scope: "card_identity",
          fact_ids: ["F-TR-001"],
          rule_ids: [],
          calculation_certainty: "high",
          input_sensitivity: { label: "stable", coverage: null },
          school_stability: "stable",
          source_status: "engine_documented",
          source_ids: [],
        },
      ],
      next_steps: [],
    },
  });
}

function makeNatalCareerReading(calculation = calculate("ziwei", ZIWEI_BIRTH)) {
  const profile = interpretationProfile("ziwei-sanhe-bounded-v1");
  const unit = calculation.facts.topic_units.find((item) => item.topic === "career_study");
  assert.ok(unit);
  const primaryPalace = calculation.facts.palaces.find((palace) => palace.fact_id === unit.primary_palace_id);
  const primaryStar = primaryPalace?.major_stars?.[0];
  assert.ok(primaryPalace && primaryStar);
  const factIds = [unit.fact_id, unit.relation_fact_id, ...unit.component_palace_ids];
  assert.equal(new Set(factIds).size, 6);
  const statement = "事业学习主题需要把职责、资源与协作关系一起核对，不由单一传统线索下结论。";
  return bindReadingToCalculations({
    calculation,
    reading: {
      system: "ziwei",
      level: "deep",
      title: "事业与学习主题深读",
      user_focus: "事业与学习中的现实结构",
      disclaimer: "紫微斗数属于传统解释体系，不是经过验证的事件预测。",
      summary: statement,
      claims: [{
        claim_id: "C-ziwei-career",
        topic: "career_study",
        statement,
        epistemic_status: "interpretation",
        system: "ziwei",
        profile: calculation.profile.id,
        scope: "topic_synthesis",
        fact_ids: factIds,
        rule_ids: ["R-ZW-007"],
        topic_unit_id: unit.fact_id,
        semantic_bindings: [{
          kind: "star_in_palace",
          fact_id: primaryPalace.fact_id,
          star: primaryStar.name,
          palace: primaryPalace.name,
          star_group: "major",
        }],
        evidence_bindings: requestedEvidence(factIds),
        reasoning_summary: "完整主题单元只提供传统结构前提，结论仍需现实职责和资源记录支持。",
        alternative_readings: ["若现实职责与资源记录并不一致，应保留未决并缩小解释范围。"],
        calculation_certainty: "high",
        input_sensitivity: { label: "stable", coverage: null },
        school_stability: "profile_specific",
        source_status: "verified",
        source_ids: ["SRC-ZW-IZTRO-2.6.0", "SRC-ZW-IZTRO-PALACE-GUIDE"],
        interpretation_profile_id: profile.id,
        rule_pack_hash: profile.rule_pack_hash,
        assessment: currentAssessment("career_study", "career"),
        practical_reflection: "分别核对职责边界、可用资源与协作关系，不依据单星作决定。",
      }],
      uncertainty_summary: "单一主题结构不能推出具体事件，现实记录与输入口径仍优先。",
      next_steps: deepNextSteps(),
    },
  });
}

function makeCareerPhaseReading(calculation = calculate("ziwei", {
  ...ZIWEI_BIRTH,
  target_date: "2026-08-23",
}), assessmentMode = "bounded_phase", topic = "career_study", bindingOptions = null) {
  const profile = interpretationProfile("ziwei-sanhe-bounded-v1");
  const unit = calculation.facts.phase_topic_units.find((item) => item.topic === topic);
  assert.ok(unit);
  const natalUnit = calculation.facts.topic_units.find((item) => item.fact_id === unit.natal_topic_unit_id);
  assert.ok(natalUnit);
  const natalPalace = calculation.facts.palaces.find((palace) => palace.fact_id === unit.natal_palace_id);
  assert.ok(natalPalace);
  const star = natalPalace.major_stars[0];
  assert.ok(star);
  const periodTransformations = [
    ...unit.decadal_transformation_fact_ids.map((factId) => ({ scope: "decadal", factId })),
    ...unit.yearly_transformation_fact_ids.map((factId) => ({ scope: "yearly", factId })),
  ].map(({ scope, factId }) => {
    const fact = calculation.facts.periods[scope].mutagens.find((item) => item.fact_id === factId);
    const slotId = unit[`${scope}_star_palace_id`];
    const slot = calculation.facts.periods[scope].star_palaces.find((item) => item.fact_id === slotId);
    const location = fact?.natal_locations?.find((item) => item.natal_palace_id === slot?.natal_palace_id);
    assert.ok(fact && location);
    return {
      kind: "period_transformation",
      fact_id: factId,
      scope,
      star: fact.star,
      transformation: fact.transformation,
      natal_palace: location.natal_palace_name,
    };
  });
  const factIds = [...new Set([
    unit.fact_id,
    unit.natal_topic_unit_id,
    unit.natal_palace_id,
    unit.target_fact_id,
    unit.phase_validity_fact_id,
    unit.decadal_star_palace_id,
    unit.yearly_star_palace_id,
    ...unit.decadal_component_star_palace_ids,
    ...unit.yearly_component_star_palace_ids,
    ...unit.decadal_transformation_fact_ids,
    ...unit.yearly_transformation_fact_ids,
    natalUnit.relation_fact_id,
    ...natalUnit.component_palace_ids,
  ])];
  const statement = "指定阶段主题需要同时核对本命轴、阶段过程与同期现实记录。";
  return bindReadingToCalculations({
    calculation,
    ...(bindingOptions ? { binding_options: bindingOptions } : {}),
    reading: {
      system: "ziwei",
      level: "deep",
      title: "事业与学习阶段深读",
      user_focus: "指定日期所处的事业与学习阶段",
      disclaimer: "阶段索引属于传统解释结构，不是经过验证的事件预测。",
      summary: statement,
      claims: [{
        claim_id: `C-ziwei-${topic}-phase`,
        topic,
        statement,
        epistemic_status: "interpretation",
        system: "ziwei",
        profile: calculation.profile.id,
        scope: "phase_topic_synthesis",
        fact_ids: factIds,
        rule_ids: ["R-ZW-009"],
        topic_unit_id: unit.fact_id,
        semantic_bindings: [{
          kind: "star_in_palace",
          fact_id: natalPalace.fact_id,
          star: star.name,
          palace: natalPalace.name,
          star_group: "major",
        }, ...periodTransformations],
        evidence_bindings: requestedEvidence(factIds),
        reasoning_summary: "三个时间层已限定到同一事业主题，但结构本身不能替代现实记录。",
        alternative_readings: ["若阶段内没有对应的现实记录，只能保留为未获支持的传统假设。"],
        calculation_certainty: "high",
        input_sensitivity: { label: "stable", coverage: null },
        school_stability: "profile_specific",
        source_status: "verified",
        source_ids: [
          "SRC-ZW-IZTRO-2.6.0",
          "SRC-ZW-IZTRO-PALACE-GUIDE",
          "SRC-ZW-IZTRO-HOROSCOPE-GUIDE",
        ],
        interpretation_profile_id: profile.id,
        rule_pack_hash: profile.rule_pack_hash,
        assessment: {
          mode: assessmentMode,
          domain: topic,
          window: {
            kind: "bounded",
            start: calculation.facts.periods.phase_validity.valid_from,
            end: calculation.facts.periods.phase_validity.valid_to,
          },
          criteria: [
            {
              criterion_id: "K-phase-support",
              polarity: "supports",
              observable: "年度岗位记录显示职责、协作对象或资源配置出现可核对的集中调整",
              evidence_source: "contemporaneous_record",
            },
            {
              criterion_id: "K-phase-contradict",
              polarity: "contradicts",
              observable: "年度岗位记录显示职责、协作对象与资源配置均保持稳定无明显调整",
              evidence_source: "contemporaneous_record",
            },
          ],
        },
        practical_reflection: "按月保存职责、资源和协作变化记录，年底再对照而不事后改口径。",
      }],
      uncertainty_summary: "阶段结构不等于事件结论，必须用预先固定的时间窗和现实记录核对。",
      next_steps: deepNextSteps(),
    },
  });
}

function makeEmptyPrimaryPalaceDraft() {
  const calculation = calculate("ziwei", {
    date: "2001-01-01",
    time: "00:00",
    timezone: "Asia/Shanghai",
    chart_sex: "female",
  });
  const profile = interpretationProfile("ziwei-sanhe-bounded-v1");
  const unit = calculation.facts.topic_units.find((item) => item.topic === "overview");
  assert.ok(unit);
  const primaryPalace = calculation.facts.palaces.find((palace) => palace.fact_id === unit.primary_palace_id);
  assert.ok(primaryPalace);
  assert.deepEqual(primaryPalace.major_stars, []);
  const supportingPalace = calculation.facts.palaces.find(
    (palace) => unit.component_palace_ids.includes(palace.fact_id) && palace.major_stars.length > 0,
  );
  assert.ok(supportingPalace);
  const factIds = [unit.fact_id, unit.relation_fact_id, ...unit.component_palace_ids];
  const statement = "人生整体取向只先核对完整主题结构，不补写主宫不存在的主星含义。";
  return {
    calculation,
    reading: {
      system: "ziwei",
      level: "deep",
      title: "空主宫降级边界测试",
      user_focus: "人生整体取向",
      disclaimer: "传统术数只作反思参考，不是经过验证的预测。",
      summary: statement,
      claims: [{
        claim_id: "C-ziwei-empty-primary",
        topic: "overview",
        statement,
        epistemic_status: "interpretation",
        system: "ziwei",
        profile: calculation.profile.id,
        scope: "topic_synthesis",
        fact_ids: factIds,
        rule_ids: ["R-ZW-007"],
        topic_unit_id: unit.fact_id,
        semantic_bindings: [{
          kind: "star_in_palace",
          fact_id: supportingPalace.fact_id,
          star: supportingPalace.major_stars[0].name,
          palace: supportingPalace.name,
          star_group: "major",
        }],
        evidence_bindings: requestedEvidence(factIds),
        reasoning_summary: "主宫没有登记主星时，封闭含义层必须停止，不从关联宫位借星补结论。",
        alternative_readings: ["只保留可核验的主题结构事实。"],
        calculation_certainty: "high",
        input_sensitivity: { label: "stable", coverage: null },
        school_stability: "profile_specific",
        source_status: "verified",
        source_ids: ["SRC-ZW-IZTRO-2.6.0", "SRC-ZW-IZTRO-PALACE-GUIDE"],
        interpretation_profile_id: profile.id,
        rule_pack_hash: profile.rule_pack_hash,
        assessment: currentAssessment("overview", "empty-primary"),
        practical_reflection: "只查看排盘事实，不生成主星轴向解释。",
      }],
      uncertainty_summary: "空主宫不授权借用其他宫位主星生成深层含义。",
      next_steps: deepNextSteps(),
    },
  };
}

function makeNatalCareerTransformationReading(calculation = calculate("ziwei", ZIWEI_MULTI_MUTAGEN_BIRTH)) {
  const profile = interpretationProfile("ziwei-sanhe-bounded-v1");
  const unit = calculation.facts.topic_units.find((item) => item.topic === "career_study");
  assert.ok(unit);
  const transformations = unit.natal_mutagen_fact_ids.map((factId) => {
    const transformation = calculation.facts.structure.mutagen_locations.find((item) => item.fact_id === factId);
    assert.ok(transformation);
    return transformation;
  });
  assert.ok(transformations.length > 1);
  const factIds = [...new Set([
    unit.fact_id,
    unit.primary_palace_id,
    ...transformations.flatMap((item) => [item.palace_id, item.fact_id]),
  ])];
  const statement = "事业主题中存在一项已绑定的传统结构线索；是否贴合要看现实职责与资源记录。";
  return bindReadingToCalculations({
    calculation,
    reading: {
      system: "ziwei",
      level: "deep",
      title: "事业主题四化核对",
      user_focus: "事业主题中的四化结构",
      disclaimer: "四化属于传统解释结构，不是经过验证的事件预测。",
      summary: statement,
      claims: [{
        claim_id: "C-ziwei-career-transformation",
        topic: "career_study",
        statement,
        epistemic_status: "interpretation",
        system: "ziwei",
        profile: calculation.profile.id,
        scope: "topic_transformation",
        fact_ids: factIds,
        rule_ids: ["R-ZW-008"],
        topic_unit_id: unit.fact_id,
        semantic_bindings: transformations.map((transformation) => ({
          kind: "mutagen_in_palace",
          fact_id: transformation.fact_id,
          star: transformation.star,
          transformation: transformation.mutagen,
          palace: transformation.palace,
        })),
        evidence_bindings: requestedEvidence(factIds),
        reasoning_summary: "该关系已限定在事业主题单元内，不能单独推出事件或结果。",
        alternative_readings: ["若现实记录不支持该主题，应保留为未获支持的传统解释。"],
        calculation_certainty: "high",
        input_sensitivity: { label: "stable", coverage: null },
        school_stability: "profile_specific",
        source_status: "verified",
        source_ids: ["SRC-ZW-IZTRO-2.6.0", "SRC-ZW-IZTRO-MUTAGEN-GUIDE"],
        interpretation_profile_id: profile.id,
        rule_pack_hash: profile.rule_pack_hash,
        assessment: currentAssessment("career_study", "career-transformation"),
        practical_reflection: "用职责和资源记录核对主题，不把单一传统线索当成事件结论。",
      }],
      uncertainty_summary: "单一四化关系不能推出具体事件或结果。",
      next_steps: deepNextSteps(),
    },
  });
}

test("a changed I Ching calculation cannot reuse a reading bound to the old cast", () => {
  const frozen = makeIChingReading();
  assertValid(frozen);
  const replacement = calculate("iching", {
    question: "我是否应该继续推进这个机会？",
    lines: [8, 8, 8, 8, 8, 8],
  });
  const stale = structuredClone(frozen);
  stale.calculation = replacement;

  const validation = assertInvalid(stale, /calculation_bindings|calculation_facts_hash/u);
  assert.match(validation.errors.join("\n"), /must match the supplied calculation set exactly|does not match exactly one supplied calculation/u);
});

test("tampering one immutable evidence or calculation hash invalidates the reading", async (t) => {
  const cases = [
    {
      name: "evidence path",
      mutate: (payload) => { payload.reading.claims[0].evidence_bindings[0].path = "/facts/transformed"; },
      expected: /path does not match the cited fact reference/u,
    },
    {
      name: "evidence value hash",
      mutate: (payload) => { payload.reading.claims[0].evidence_bindings[0].value_hash = "0".repeat(64); },
      expected: /value_hash does not match the cited fact value/u,
    },
    {
      name: "claim calculation hash",
      mutate: (payload) => { payload.reading.claims[0].calculation_facts_hash = "0".repeat(64); },
      expected: /calculation_facts_hash does not match exactly one supplied calculation/u,
    },
    {
      name: "reading calculation binding hash",
      mutate: (payload) => { payload.reading.calculation_bindings[0].facts_hash = "0".repeat(64); },
      expected: /calculations\[0\] must have exactly one matching reading\.calculation_bindings entry/u,
    },
  ];

  for (const scenario of cases) {
    await t.test(scenario.name, () => {
      const payload = makeIChingReading();
      assertValid(payload);
      scenario.mutate(payload);
      assertInvalid(payload, scenario.expected);
    });
  }
});

test("a calculation envelope with duplicate fact IDs fails even when its hashes are refreshed", () => {
  const calculation = structuredClone(calculate("iching", {
    question: "检查事实标识唯一性",
    lines: [7, 7, 7, 7, 7, 7],
  }));
  calculation.facts.transformed.fact_id = calculation.facts.primary.fact_id;
  calculation.facts_hash = calculateFactsHash(calculation);
  calculation.reproducibility_hash = calculateReproducibilityHash(calculation);

  assert.deepEqual(verifyCalculationEnvelope(calculation), ["facts contain 1 duplicate fact_id value(s)"]);
  const validReading = makeIChingReading();
  assert.throws(
    () => bindReadingToCalculations({ ...validReading, calculation }),
    (error) => error.code === "INVALID_CALCULATION_ENVELOPE" && /duplicate fact_id/u.test(error.message),
  );
});

test("a Barnum-style both-sides interpretation is rejected", () => {
  const payload = makeIChingReading();
  assertValid(payload);
  payload.reading.summary = "面对同一选择，你有时积极主动，有时又会谨慎退让。";
  payload.reading.claims[0].statement = payload.reading.summary;
  assertInvalid(payload, /statement uses a Barnum-style both-sides formulation/u);
});

test("an interpretation cannot smuggle a false I Ching identity into free prose", () => {
  const payload = makeIChingReading();
  assertValid(payload);
  payload.reading.summary = "本卦为坤，因此应先观察现实条件。";
  payload.reading.claims[0].statement = payload.reading.summary;
  assertInvalid(payload, /protected iching technical assertion/u);
});

test("the Zi Wei synthesis rule pack exposes every registered 24/14/11 entry through exact lookups", () => {
  assert.equal(ZIWEI_MAJOR_STAR_COMBINATIONS.length, 24);
  assert.equal(ZIWEI_CONTEXT_STAR_MODIFIERS.length, 14);
  assert.equal(ZIWEI_PERIOD_STAR_MODIFIERS.length, 11);

  assert.equal(
    new Set(ZIWEI_MAJOR_STAR_COMBINATIONS.map((item) => item.combination_id)).size,
    24,
  );
  assert.equal(new Set(ZIWEI_CONTEXT_STAR_MODIFIERS.map((item) => item.star)).size, 14);
  assert.equal(new Set(ZIWEI_PERIOD_STAR_MODIFIERS.map((item) => item.key)).size, 11);
  for (const registry of [
    ZIWEI_MAJOR_STAR_COMBINATIONS,
    ZIWEI_CONTEXT_STAR_MODIFIERS,
    ZIWEI_PERIOD_STAR_MODIFIERS,
  ]) {
    assert.equal(Object.isFrozen(registry), true);
    assert.ok(registry.every((item) => Object.isFrozen(item)));
  }
  assert.ok(ZIWEI_MAJOR_STAR_COMBINATIONS.every((item) => Object.isFrozen(item.stars)));

  for (const combination of ZIWEI_MAJOR_STAR_COMBINATIONS) {
    assert.strictEqual(getZiweiMajorStarCombination(combination.stars), combination);
    assert.strictEqual(getZiweiMajorStarCombination([...combination.stars].reverse()), combination);
  }
  for (const modifier of ZIWEI_CONTEXT_STAR_MODIFIERS) {
    assert.strictEqual(getZiweiContextStarModifier(modifier.star), modifier);
  }
  for (const modifier of ZIWEI_PERIOD_STAR_MODIFIERS) {
    if (modifier.key === "年解") {
      assert.strictEqual(getZiweiPeriodStarModifier("年解"), modifier);
    } else {
      assert.strictEqual(getZiweiPeriodStarModifier(`运${modifier.key}`), modifier);
      assert.strictEqual(getZiweiPeriodStarModifier(`流${modifier.key}`), modifier);
    }
  }
  assert.equal(getZiweiMajorStarCombination(["紫微", "不存在"]), null);
  assert.equal(getZiweiContextStarModifier("不存在"), null);
  assert.equal(getZiweiPeriodStarModifier("运不存在"), null);
});

test("R-ZW-007 accepts a deep career reading only with its complete bound topic unit", () => {
  const payload = makeNatalCareerReading();
  assertValid(payload);
  const claim = payload.reading.claims[0];
  const unit = payload.calculation.facts.topic_units.find((item) => item.fact_id === claim.topic_unit_id);
  assert.equal(claim.meaning_binding.schema, "fortune-teller/ziwei-meaning-binding/v2");
  assert.deepEqual(new Set(claim.fact_ids), new Set([
    unit.fact_id,
    unit.relation_fact_id,
    ...unit.component_palace_ids,
  ]));
  assert.deepEqual(new Set(claim.evidence_bindings.map((item) => item.role)), new Set(["support", "constraint"]));
  assert.deepEqual(
    claim.meaning_binding.palace_axis_groups.map((group) => ({
      relation_role: group.relation_role,
      relation_offset: group.relation_offset,
      palace: group.palace.name,
      stars: group.major_star_axes.map((axis) => axis.star),
    })),
    [
      { relation_role: "focus", relation_offset: 0, palace: "官禄", stars: ["廉贞", "天府"] },
      { relation_role: "trine_plus_4", relation_offset: 4, palace: "财帛", stars: ["武曲", "天相"] },
      { relation_role: "trine_plus_8", relation_offset: 8, palace: "命宫", stars: ["紫微"] },
      { relation_role: "opposite_plus_6", relation_offset: 6, palace: "夫妻", stars: ["七杀"] },
    ],
  );
  assert.ok(
    claim.meaning_binding.palace_axis_groups
      .flatMap((group) => group.major_star_axes)
      .every((axis) => /^ZW-STAR-[A-Z]+$/u.test(axis.meaning_id)),
  );
});

test("canonical Zi Wei semantics preserve every main-star brightness and every registered natal modifier", () => {
  const payload = makeNatalCareerReading();
  assertValid(payload);
  const claim = payload.reading.claims[0];
  const natalUnit = payload.calculation.facts.topic_units.find(
    (unit) => unit.fact_id === claim.topic_unit_id,
  );
  const expected = expectedNatalSemanticStars(payload.calculation, natalUnit);
  const major = claim.semantic_bindings.filter(
    (binding) => binding.kind === "star_in_palace" && binding.star_group === "major",
  );
  const modifiers = claim.semantic_bindings.filter(
    (binding) => binding.kind === "star_in_palace" && binding.star_group !== "major",
  );
  assert.deepEqual(major, expected.major);
  assert.ok(major.length > 0 && major.every((binding) => Object.hasOwn(binding, "brightness")));
  assert.deepEqual(modifiers, expected.modifiers);
  assert.ok(modifiers.length > 0, "fixture must exercise typed natal context-star bindings");

  const missingBrightness = structuredClone(payload);
  delete missingBrightness.reading.claims[0].semantic_bindings.find(
    (binding) => binding.kind === "star_in_palace" && binding.star_group === "major",
  ).brightness;
  assertInvalid(
    missingBrightness,
    /complete mechanical Zi Wei semantic binding set|technical_summary must exactly equal/u,
  );

  const missingModifier = structuredClone(payload);
  const omittedIndex = missingModifier.reading.claims[0].semantic_bindings.findIndex(
    (binding) => binding.kind === "star_in_palace" && binding.star_group !== "major",
  );
  assert.notEqual(omittedIndex, -1);
  missingModifier.reading.claims[0].semantic_bindings.splice(omittedIndex, 1);
  assertInvalid(
    missingModifier,
    /complete mechanical Zi Wei semantic binding set|technical_summary must exactly equal/u,
  );
});

test("R-ZW-007 preserves an empty non-focus palace group instead of dropping or borrowing an axis", () => {
  const payload = makeNatalCareerReading(calculate("ziwei", {
    date: "2001-01-01",
    time: "00:00",
    timezone: "Asia/Shanghai",
    chart_sex: "female",
  }));
  assertValid(payload);
  const groups = payload.reading.claims[0].meaning_binding.palace_axis_groups;
  assert.equal(groups.length, 4);
  assert.ok(groups[0].major_star_axes.length > 0);
  assert.ok(groups.slice(1).some((group) => group.major_star_axes.length === 0));
  assert.ok(groups.slice(1).some((group) => group.major_star_axes.length > 0));
  assert.deepEqual(
    projectedPalaceAxisGroups(groups),
    expectedPalaceAxisGroups(
      payload.calculation,
      payload.calculation.facts.topic_units.find((unit) => unit.topic === "career_study"),
    ),
  );
});

test("the binder freezes ordinary result-facing presentation instead of trusting draft prose", () => {
  const payload = makeNatalCareerReading();
  assertValid(payload);
  assert.equal(payload.reading.title, "紫微斗数｜深度解读");
  assert.equal(payload.reading.user_focus, "事业与学习");
  assert.equal(
    payload.reading.disclaimer,
    "以下内容属于传统文化反思，不是经科学验证的现实预测；重要决定请结合事实并独立判断。",
  );
  assert.equal(
    payload.reading.uncertainty_summary,
    "排盘可以复算，传统含义仍不能确认具体事件或保证现实结果。",
  );
  assert.equal(payload.reading.next_steps[0].label, "结束本次解读");
  assert.equal(Object.hasOwn(payload.reading.next_steps[0], "reason"), false);
  assert.equal(Object.hasOwn(payload.reading, "warning_acknowledgements"), false);
  assert.equal(Object.hasOwn(payload.reading, "cross_system"), false);
});

test("result-facing presentation rejects injected prose, warning codes, or cross-system winners", async (t) => {
  const cases = [
    ["title", (reading) => { reading.title = "明年事业大吉"; }, /canonical system-and-level result label/u],
    ["user focus", (reading) => { reading.user_focus = "明年一定会升职"; }, /canonical unique claim-topic labels/u],
    ["disclaimer", (reading) => { reading.disclaimer = "仅供参考，但明年一定升职。"; }, /canonical non-prediction boundary/u],
    ["uncertainty", (reading) => { reading.uncertainty_summary = "细节未定，但收入翻番。"; }, /canonical calculation-and-interpretation boundary/u],
    ["next-step label", (reading) => { reading.next_steps[0].label = "查看明年喜讯"; }, /canonical action label/u],
    ["warning code", (reading) => { reading.warning_acknowledgements = ["FAKE_WARNING"]; }, /exactly equal the material warning codes/u],
    ["cross-system winner", (reading) => {
      reading.cross_system = { relationship: "not_compared", winner: "ziwei" };
    }, /only one registered relationship label|voting or a declared winner/u],
  ];
  for (const [name, mutate, expected] of cases) {
    await t.test(name, () => {
      const payload = makeNatalCareerReading();
      mutate(payload.reading);
      assertInvalid(payload, expected);
    });
  }
});

test("material calculation warnings are mechanically acknowledged in the result-facing boundary", () => {
  const calculation = calculate("ziwei", {
    ...ZIWEI_BIRTH,
    timezone: "UTC",
  });
  const initial = makeNatalCareerReading(calculation);
  initial.reading.claims[0].calculation_certainty = "qualified";
  const payload = bindReadingToCalculations(initial);
  assertValid(payload);
  assert.deepEqual(payload.reading.warning_acknowledgements, ["CALENDAR_DAY_PROFILE_QUALIFIED"]);
  assert.match(payload.reading.uncertainty_summary, /出生地民用日/u);

  delete payload.reading.warning_acknowledgements;
  assertInvalid(payload, /must exactly equal the material warning codes|must include CALENDAR_DAY_PROFILE_QUALIFIED/u);
});

test("cross-system presentation is absent for one system and fixed to not_compared for multiple systems", () => {
  const single = makeNatalCareerReading();
  assert.equal(Object.hasOwn(single.reading, "cross_system"), false);
  single.reading.cross_system = { relationship: "not_compared" };
  assertInvalid(single, /cross_system.*single|single-system.*cross_system|must be absent/u);

  const multi = makeCanonicalMultiSystemReading();
  assertValid(multi);
  assert.equal(multi.reading.title, "多体系对照｜解读结果");
  assert.deepEqual(multi.reading.cross_system, { relationship: "not_compared" });

  multi.reading.cross_system.relationship = "complementary_context";
  assertInvalid(multi, /cross_system.*canonical|must equal.*not_compared|exactly not_compared/u);
});

test("a fabricated Zi Wei star-palace relation fails semantic verification", () => {
  const payload = makeNatalCareerReading();
  assertValid(payload);
  const claim = payload.reading.claims[0];
  assert.equal(claim.semantic_bindings[0].star, "廉贞");
  assert.equal(claim.semantic_bindings[0].palace, "官禄");

  claim.semantic_bindings[0].palace = "命宫";

  assertInvalid(payload, /does not match an actual star-in-palace fact|complete mechanical Zi Wei semantic binding set/u);
});

test("reverse palace-first wording cannot hide a fabricated Zi Wei relation", () => {
  const payload = makeNatalCareerReading();
  assertValid(payload);
  const claim = payload.reading.claims[0];
  claim.statement = "事业学习主题需要整体核对；官禄宫中有紫微，只作为结构线索。";
  payload.reading.summary = claim.statement;
  assertInvalid(payload, /unverified 紫微-in-官禄 relation|canonical Zi Wei meaning rendering/u);
});

test("even a correct technical relation must stay in the mechanical technical summary", () => {
  const payload = makeNatalCareerReading();
  assertValid(payload);
  const claim = payload.reading.claims[0];
  const semantic = claim.semantic_bindings[0];
  claim.statement = `事业学习主题需连同完整三方四正核对；${semantic.star}实际位于${semantic.palace}宫。`;
  payload.reading.summary = claim.statement;
  assertInvalid(payload, /protected ziwei technical assertion|canonical Zi Wei meaning rendering/u);
});

test("a named Zi Wei transformation must match its exact star and transformation", () => {
  const payload = makeNatalCareerTransformationReading();
  assertValid(payload);
  const claim = payload.reading.claims[0];
  const actual = claim.semantic_bindings[0].transformation;
  claim.semantic_bindings[0].transformation = actual === "禄" ? "权" : "禄";
  assertInvalid(payload, /fields do not exactly match|does not match an actual natal transformation fact/u);
});

test("a claim topic cannot be relabeled away from its bound Zi Wei topic unit", () => {
  const payload = makeNatalCareerReading();
  assertValid(payload);
  payload.reading.claims[0].topic = "wealth_resources";
  payload.reading.claims[0].assessment.domain = "wealth_resources";
  assertInvalid(payload, /topic does not match the cited topic unit/u);
});

test("R-ZW-009 accepts one-topic natal-decadal-yearly synthesis and rejects cross-topic mixing", () => {
  const valid = makeCareerPhaseReading();
  assertValid(valid);

  const careerUnit = valid.calculation.facts.phase_topic_units.find((item) => item.topic === "career_study");
  const wealthUnit = valid.calculation.facts.phase_topic_units.find((item) => item.topic === "wealth_resources");
  assert.ok(careerUnit && wealthUnit);
  const mixedDraft = structuredClone(valid);
  const claim = mixedDraft.reading.claims[0];
  const yearlyIndex = claim.fact_ids.indexOf(careerUnit.yearly_star_palace_id);
  assert.notEqual(yearlyIndex, -1);
  claim.fact_ids[yearlyIndex] = wealthUnit.yearly_star_palace_id;
  assert.throws(
    () => bindReadingToCalculations(mixedDraft),
    (error) => error.code === "MEANING_LAYER_UNAVAILABLE"
      && /INCOMPLETE_OR_MIXED_PHASE_EVIDENCE/u.test(error.message),
  );
});

test("a custom Zi Wei calculation profile cannot be presented as a registered interpretation", () => {
  const calculation = calculate("ziwei", ZIWEI_BIRTH, { day_divide: "current" });
  assert.match(calculation.profile.id, /^ziwei-custom-/u);
  const payload = makeNatalCareerReading(calculation);
  const validation = assertInvalid(payload, /custom or unreviewed calculation profile/u);
  assert.match(validation.errors.join("\n"), /interpretation_profile_id does not permit this custom or unreviewed calculation profile/u);
});

test("a relabeled custom Zi Wei profile cannot impersonate a registered profile", () => {
  const calculation = calculate("ziwei", ZIWEI_BIRTH, { day_divide: "current" });
  assert.match(calculation.profile.id, /^ziwei-custom-/u);
  calculation.profile.id = "ziwei-default-v1";
  calculation.facts_hash = calculateFactsHash(calculation);
  calculation.reproducibility_hash = calculateReproducibilityHash(calculation);
  assert.deepEqual(verifyCalculationEnvelope(calculation), []);

  assert.throws(
    () => makeNatalCareerReading(calculation),
    (error) => error.code === "CALCULATION_FACTS_NOT_SELF_CONSISTENT"
      && /PROFILE_ID_CONFIG_MISMATCH/u.test(error.message),
  );
});

test("calculation envelopes reject a self-rehashed unknown engine version", () => {
  const calculation = calculate("iching", {
    question: "版本边界测试",
    lines: [7, 7, 7, 7, 7, 7],
  });
  calculation.engine_version = "999.0.0";
  calculation.facts_hash = calculateFactsHash(calculation);
  calculation.reproducibility_hash = calculateReproducibilityHash(calculation);
  assert.deepEqual(verifyCalculationEnvelope(calculation), ["engine_version must be 0.5.0"]);
  assert.throws(
    () => bindReadingToCalculations({ ...makeIChingReading(), calculation }),
    (error) => error.code === "INVALID_CALCULATION_ENVELOPE" && /engine_version/u.test(error.message),
  );
});

test("birth-chart facts must replay from normalized input even after an attacker rehashes them", () => {
  const calculation = calculate("bazi", {
    date: "2000-08-16",
    time: "04:00",
    timezone: "Asia/Shanghai",
  });
  calculation.facts.pillars[0].stem_branch = "甲子";
  calculation.facts_hash = calculateFactsHash(calculation);
  calculation.reproducibility_hash = calculateReproducibilityHash(calculation);
  assert.deepEqual(verifyCalculationEnvelope(calculation), []);
  assert.match(verifyCalculationFacts(calculation).errors.join("\n"), /current-engine replay/u);
  assert.throws(
    () => bindReadingToCalculations({ ...makeIChingReading(), calculation }),
    (error) => error.code === "CALCULATION_FACTS_NOT_SELF_CONSISTENT",
  );
});

test("quality status is mechanically derived and cannot claim certification or validated accuracy", () => {
  const payload = makeIChingReading();
  assert.deepEqual(payload.reading.quality_status, {
    calculation_verification: [{ system: "iching", status: "user_supplied_recomputed" }],
    technical_assertions: "typed_bindings_only",
    narrative_status: "not_machine_verified",
    review_status: "automated_fixture_reviewed",
    professional_label_allowed: false,
    predictive_validity: "not_established",
  });

  const relabeled = structuredClone(payload);
  relabeled.reading.quality_status.professional_label_allowed = true;
  relabeled.reading.quality_status.predictive_validity = "established";
  assertInvalid(relabeled, /quality_status must be mechanically derived/u);

  const advertised = structuredClone(payload);
  advertised.reading.claims[0].statement = "本结果已获专业认证，现实预测准确率达到百分之九十。";
  advertised.reading.summary = advertised.reading.claims[0].statement;
  assertInvalid(advertised, /unearned certification or accuracy claim/u);
});

test("Zi Wei topic rules reject extra facts used as cross-topic padding", () => {
  const natal = makeNatalCareerReading();
  const natalUnit = natal.calculation.facts.topic_units.find((item) => item.topic === "career_study");
  const outsidePalace = natal.calculation.facts.palaces.find((item) => !natalUnit.component_palace_ids.includes(item.fact_id));
  assert.ok(outsidePalace);
  const paddedNatal = structuredClone(natal);
  paddedNatal.reading.claims[0].fact_ids.push(outsidePalace.fact_id);
  assertInvalid(bindReadingToCalculations(paddedNatal), /outside the selected natal topic unit/u);

  const transformed = makeNatalCareerTransformationReading();
  const transformedUnit = transformed.calculation.facts.topic_units.find((item) => item.topic === "career_study");
  const outsideTransformation = transformed.calculation.facts.structure.mutagen_locations.find(
    (item) => !transformedUnit.natal_mutagen_fact_ids.includes(item.fact_id),
  );
  assert.ok(outsideTransformation);
  const paddedTransformation = structuredClone(transformed);
  paddedTransformation.reading.claims[0].fact_ids.push(outsideTransformation.fact_id, outsideTransformation.palace_id);
  assertInvalid(bindReadingToCalculations(paddedTransformation), /outside the selected natal topic transformation unit/u);

  const phase = makeCareerPhaseReading();
  const wealthPhase = phase.calculation.facts.phase_topic_units.find((item) => item.topic === "wealth_resources");
  const paddedPhase = structuredClone(phase);
  paddedPhase.reading.claims[0].fact_ids.push(wealthPhase.fact_id);
  assertInvalid(bindReadingToCalculations(paddedPhase), /outside the selected same-topic phase unit/u);
});

test("the closed Zi Wei meaning layer accepts only its three canonical routes", async (t) => {
  const cases = [
    {
      name: "R-ZW-007 current natal topic axes",
      payload: makeNatalCareerReading(),
      ruleId: "R-ZW-007",
      route: "natal_topic_axes",
      mode: "current_reflection",
    },
    {
      name: "R-ZW-008 current transformation process",
      payload: makeNatalCareerTransformationReading(),
      ruleId: "R-ZW-008",
      route: "natal_transformation_process",
      mode: "current_reflection",
    },
    {
      name: "R-ZW-009 bounded phase",
      payload: makeCareerPhaseReading(),
      ruleId: "R-ZW-009",
      route: "bounded_phase_theme",
      mode: "bounded_phase",
    },
    {
      name: "R-ZW-009 prospective phase hypothesis",
      payload: makeCareerPhaseReading(undefined, "prospective_hypothesis"),
      ruleId: "R-ZW-009",
      route: "bounded_phase_theme",
      mode: "prospective_hypothesis",
    },
  ];

  for (const scenario of cases) {
    await t.test(scenario.name, () => {
      assertValid(scenario.payload);
      const claim = scenario.payload.reading.claims[0];
      assert.equal(claim.meaning_binding.rule_id, scenario.ruleId);
      assert.equal(claim.meaning_binding.route, scenario.route);
      assert.equal(claim.meaning_binding.assessment_mode, scenario.mode);
      assert.equal(claim.meaning_binding.schema, "fortune-teller/ziwei-meaning-binding/v2");
      assert.equal(claim.assessment.mode, scenario.mode);
      assert.match(claim.statement, /不构成具体事件判断|不构成结果或具体事件保证|不生成或保证任何具体事件/u);
      if (scenario.ruleId === "R-ZW-007" || scenario.ruleId === "R-ZW-009") {
        const natalUnit = scenario.payload.calculation.facts.topic_units.find(
          (item) => item.fact_id === (
            scenario.ruleId === "R-ZW-009"
              ? scenario.payload.calculation.facts.phase_topic_units.find(
                (phaseUnit) => phaseUnit.fact_id === claim.topic_unit_id,
              ).natal_topic_unit_id
              : claim.topic_unit_id
          ),
        );
        assert.deepEqual(
          projectedPalaceAxisGroups(claim.meaning_binding.palace_axis_groups),
          expectedPalaceAxisGroups(scenario.payload.calculation, natalUnit),
          "the binding must preserve all four relation groups and every registered star in calculation order",
        );
        const expectedAxisSourceIds = [
          natalUnit.fact_id,
          natalUnit.relation_fact_id,
          ...natalUnit.component_palace_ids,
        ];
        if (scenario.ruleId === "R-ZW-007") {
          assert.deepEqual(claim.meaning_binding.source_fact_ids, expectedAxisSourceIds);
        }
        assert.equal(claim.meaning_binding.palace_axis_groups.length, 4);
        assert.ok(claim.meaning_binding.palace_axis_groups[0].major_star_axes.length > 0);
        assert.ok(
          claim.meaning_binding.palace_axis_groups.slice(1)
            .some((group) => group.major_star_axes.length > 0),
        );
      }
      if (scenario.ruleId === "R-ZW-008") {
        const unit = scenario.payload.calculation.facts.topic_units.find(
          (item) => item.fact_id === claim.topic_unit_id,
        );
        assert.equal(claim.meaning_binding.transformation_lenses.length, unit.natal_mutagen_fact_ids.length);
      }
      if (scenario.ruleId === "R-ZW-009") {
        const unit = scenario.payload.calculation.facts.phase_topic_units.find(
          (item) => item.fact_id === claim.topic_unit_id,
        );
        const natalUnit = scenario.payload.calculation.facts.topic_units.find(
          (item) => item.fact_id === unit.natal_topic_unit_id,
        );
        assert.ok(claim.fact_ids.includes(unit.target_fact_id), "the target-date fact must be explicit evidence");
        assert.deepEqual(claim.meaning_binding.source_fact_ids, [
          ...new Set([
            unit.fact_id,
            natalUnit.fact_id,
            natalUnit.relation_fact_id,
            ...natalUnit.component_palace_ids,
            unit.target_fact_id,
            unit.phase_validity_fact_id,
            unit.decadal_star_palace_id,
            unit.yearly_star_palace_id,
            ...unit.decadal_component_star_palace_ids,
            ...unit.yearly_component_star_palace_ids,
            ...unit.decadal_transformation_fact_ids,
            ...unit.yearly_transformation_fact_ids,
          ]),
        ]);
        const validity = scenario.payload.calculation.facts.periods.phase_validity;
        assert.deepEqual(claim.assessment.window, {
          kind: "bounded",
          start: validity.valid_from,
          end: validity.valid_to,
        });
        assert.deepEqual(
          claim.meaning_binding.phase.decadal_component_star_palace_ids,
          unit.decadal_component_star_palace_ids,
        );
        assert.deepEqual(
          claim.meaning_binding.phase.yearly_component_star_palace_ids,
          unit.yearly_component_star_palace_ids,
        );
        assert.deepEqual(claim.meaning_binding.phase.component_relation_offsets, [0, 4, 8, 6]);
        assert.ok(claim.assessment.criteria.some((item) => item.polarity === "unclear"));
      }
    });
  }
});

test("all five canonical Zi Wei result fields reject even one-field prose tampering", async (t) => {
  const cases = [
    {
      name: "statement",
      mutate(payload) {
        payload.reading.claims[0].statement += " 另作解释。";
        payload.reading.summary = payload.reading.claims[0].statement;
      },
      expected: /statement must exactly equal the canonical Zi Wei meaning rendering/u,
    },
    {
      name: "reasoning_summary",
      mutate(payload) { payload.reading.claims[0].reasoning_summary += " 另加一条未绑定理由。"; },
      expected: /reasoning_summary must exactly equal the canonical Zi Wei meaning rendering/u,
    },
    {
      name: "alternative_readings",
      mutate(payload) { payload.reading.claims[0].alternative_readings[0] += " 另加解释。"; },
      expected: /alternative_readings must exactly equal the canonical Zi Wei meaning rendering/u,
    },
    {
      name: "practical_reflection",
      mutate(payload) { payload.reading.claims[0].practical_reflection += " 再凭直觉判断。"; },
      expected: /practical_reflection must exactly equal the canonical Zi Wei meaning rendering/u,
    },
    {
      name: "assessment",
      mutate(payload) { payload.reading.claims[0].assessment.criteria[0].observable += " 并接受口头回忆。"; },
      expected: /assessment must exactly equal the canonical Zi Wei meaning rendering/u,
    },
  ];

  for (const scenario of cases) {
    await t.test(scenario.name, () => {
      const payload = makeNatalCareerReading();
      scenario.mutate(payload);
      assertInvalid(payload, scenario.expected);
    });
  }
});

test("a Zi Wei v2 four-palace binding cannot omit a star or relabel/reorder a relation group", async (t) => {
  await t.test("omitted star axis", () => {
    const payload = makeNatalCareerReading();
    const groups = payload.reading.claims[0].meaning_binding.palace_axis_groups;
    assert.ok(groups[0].major_star_axes.length > 1);
    groups[0].major_star_axes.pop();
    assertInvalid(payload, /meaning binding must exactly equal the binding mechanically derived/u);
  });

  await t.test("relabeled star meaning", () => {
    const payload = makeNatalCareerReading();
    payload.reading.claims[0].meaning_binding.palace_axis_groups[0]
      .major_star_axes[0].meaning_id = "ZW-STAR-ZIWEI";
    assertInvalid(payload, /meaning binding must exactly equal the binding mechanically derived/u);
  });

  await t.test("relabeled relation role", () => {
    const payload = makeNatalCareerReading();
    payload.reading.claims[0].meaning_binding.palace_axis_groups[0].relation_role = "trine_plus_4";
    assertInvalid(payload, /meaning binding must exactly equal the binding mechanically derived/u);
  });

  await t.test("reordered four-palace groups", () => {
    const payload = makeNatalCareerReading();
    const groups = payload.reading.claims[0].meaning_binding.palace_axis_groups;
    [groups[1], groups[2]] = [groups[2], groups[1]];
    assertInvalid(payload, /meaning binding must exactly equal the binding mechanically derived/u);
  });
});

test("R-ZW-008 fails closed when a reader cherry-picks only one of several natal transformations", () => {
  const payload = makeNatalCareerTransformationReading();
  const claim = payload.reading.claims[0];
  const unit = payload.calculation.facts.topic_units.find((item) => item.fact_id === claim.topic_unit_id);
  assert.ok(unit.natal_mutagen_fact_ids.length > 1);
  const keptId = unit.natal_mutagen_fact_ids[0];
  const keptFact = payload.calculation.facts.structure.mutagen_locations.find((item) => item.fact_id === keptId);
  claim.fact_ids = [...new Set([unit.fact_id, unit.primary_palace_id, keptFact.palace_id, keptId])];
  claim.semantic_bindings = claim.semantic_bindings.filter(
    (binding) => binding.kind === "mutagen_in_palace" && binding.fact_id === keptId,
  );

  assert.throws(
    () => bindReadingToCalculations(payload),
    (error) => error.code === "MEANING_LAYER_UNAVAILABLE"
      && /INCOMPLETE_TRANSFORMATION_EVIDENCE/u.test(error.message),
  );
});

test("R-ZW-009 fails closed without a bound period transformation process", () => {
  const calculation = calculate("ziwei", {
    ...ZIWEI_BIRTH,
    target_date: "2029-06-01",
  });
  const unit = calculation.facts.phase_topic_units.find((item) => item.topic === "career_study");
  assert.deepEqual([
    ...unit.decadal_transformation_fact_ids,
    ...unit.yearly_transformation_fact_ids,
  ], []);
  assert.throws(
    () => makeCareerPhaseReading(calculation),
    (error) => error.code === "MEANING_LAYER_UNAVAILABLE"
      && /NO_BOUND_PHASE_PROCESS_LENS/u.test(error.message),
  );
});

test("an explicit per-claim fallback preserves a valid unresolved result when the closed rule is unavailable", () => {
  const calculation = calculate("ziwei", {
    ...ZIWEI_BIRTH,
    target_date: "2029-06-01",
  });
  const payload = makeCareerPhaseReading(
    calculation,
    "bounded_phase",
    "career_study",
    { meaning_unavailable: "degrade_claim" },
  );
  const claim = payload.reading.claims[0];
  assert.equal(claim.epistemic_status, "unresolved");
  assert.equal(claim.unresolved_reason_kind, "rule_unavailable");
  assert.match(claim.reasoning_summary, /规则覆盖不足/u);
  assert.match(claim.reasoning_summary, /不是你少填了出生资料/u);
  assert.equal(Object.hasOwn(claim, "meaning_binding"), false);
  assert.equal(Object.hasOwn(claim, "assessment"), false);
  assert.equal(Object.hasOwn(payload, "binding_options"), false);
  const validation = validateReading(payload);
  assert.equal(validation.valid, true, validation.errors.join("\n"));
});

test("R-ZW-009 cannot omit one of several bound period transformations", () => {
  const calculation = calculate("ziwei", {
    ...ZIWEI_BIRTH,
    target_date: "2027-06-01",
  });
  const payload = makeCareerPhaseReading(calculation, "bounded_phase", "relationships");
  const claim = payload.reading.claims[0];
  const unit = calculation.facts.phase_topic_units.find((item) => item.fact_id === claim.topic_unit_id);
  const transformationIds = [
    ...unit.decadal_transformation_fact_ids,
    ...unit.yearly_transformation_fact_ids,
  ];
  assert.ok(transformationIds.length > 1);
  const omittedId = transformationIds.at(-1);
  claim.fact_ids = claim.fact_ids.filter((factId) => factId !== omittedId);
  claim.semantic_bindings = claim.semantic_bindings.filter((binding) => binding.fact_id !== omittedId);

  assert.throws(
    () => bindReadingToCalculations(payload),
    (error) => error.code === "MEANING_LAYER_UNAVAILABLE"
      && /INCOMPLETE_OR_MIXED_PHASE_EVIDENCE/u.test(error.message),
  );
});

test("R-ZW-009 cannot omit or reorder one period's four dynamic component slots", async (t) => {
  await t.test("omitted decadal component evidence", () => {
    const payload = makeCareerPhaseReading();
    const claim = payload.reading.claims[0];
    const unit = payload.calculation.facts.phase_topic_units.find(
      (item) => item.fact_id === claim.topic_unit_id,
    );
    const omittedId = unit.decadal_component_star_palace_ids[1];
    claim.fact_ids = claim.fact_ids.filter((factId) => factId !== omittedId);
    assert.throws(
      () => bindReadingToCalculations(payload),
      (error) => error.code === "MEANING_LAYER_UNAVAILABLE"
        && /INCOMPLETE_OR_MIXED_PHASE_EVIDENCE/u.test(error.message),
    );
  });

  await t.test("reordered yearly component binding", () => {
    const payload = makeCareerPhaseReading();
    const ids = payload.reading.claims[0].meaning_binding.phase.yearly_component_star_palace_ids;
    [ids[1], ids[2]] = [ids[2], ids[1]];
    assertInvalid(payload, /meaning binding must exactly equal the binding mechanically derived/u);
  });
});

test("period-star bindings cite their phase topic, require exact offsets, and cover both four-palace layers", () => {
  const payload = makeCareerPhaseReading();
  assertValid(payload);
  const claim = payload.reading.claims[0];
  const unit = payload.calculation.facts.phase_topic_units.find(
    (item) => item.fact_id === claim.topic_unit_id,
  );
  const periodBindings = claim.semantic_bindings.filter(
    (binding) => binding.kind === "period_star_in_slot",
  );
  assert.deepEqual(periodBindings, expectedPeriodSemanticStars(payload.calculation, unit));
  assert.ok(periodBindings.some((binding) => binding.relation_role !== "focus"));
  assert.ok(periodBindings.every((binding) => claim.fact_ids.includes(binding.topic_unit_id)));

  const one = periodBindings[0];
  assert.ok(one, "fixture must expose at least one typed period-star binding");
  assert.throws(
    () => canonicalTechnicalSummary(payload.calculation, [one], [one.fact_id]),
    (error) => error.code === "INVALID_SEMANTIC_BINDING"
      && /topic_unit_id must also appear in fact_ids/u.test(error.message),
  );
  const exactFactIds = [one.fact_id, one.topic_unit_id];
  const technicalSummary = canonicalTechnicalSummary(payload.calculation, [one], exactFactIds);
  const directClaim = {
    system: "ziwei",
    epistemic_status: "traditional_rule",
    statement: "只测试机器绑定。",
    fact_ids: exactFactIds,
    semantic_bindings: [one],
    technical_summary: technicalSummary,
  };
  assert.equal(validateClaimSemantics(directClaim, payload.calculation).valid, true);

  const malformedOffsets = structuredClone(payload.calculation);
  malformedOffsets.facts.phase_topic_units.find(
    (item) => item.fact_id === one.topic_unit_id,
  ).component_relation_offsets = [6, 4, 8, 0];
  assert.throws(
    () => canonicalTechnicalSummary(malformedOffsets, [one], exactFactIds),
    (error) => error.code === "INVALID_SEMANTIC_BINDING"
      && /kind does not match the cited calculation fact/u.test(error.message),
  );
  const malformedValidation = validateClaimSemantics(directClaim, malformedOffsets);
  assert.equal(malformedValidation.valid, false);
  assert.match(malformedValidation.errors.join("\n"), /kind does not match the cited calculation fact/u);
});

test("R-ZW-009 binds dynamic stars across all four period palaces but transformations only at the topic slot", () => {
  const payload = makeCareerPhaseReading();
  assertValid(payload);
  const claim = payload.reading.claims[0];
  const calculation = payload.calculation;
  const unit = calculation.facts.phase_topic_units.find((item) => item.fact_id === claim.topic_unit_id);
  const actualPeriodStars = claim.semantic_bindings.filter(
    (binding) => binding.kind === "period_star_in_slot",
  );
  assert.deepEqual(actualPeriodStars, expectedPeriodSemanticStars(calculation, unit));
  assert.deepEqual(unit.component_relation_offsets, [0, 4, 8, 6]);
  assert.equal(unit.decadal_component_star_palace_ids.length, 4);
  assert.equal(unit.yearly_component_star_palace_ids.length, 4);

  const actualTransformations = claim.semantic_bindings.filter(
    (binding) => binding.kind === "period_transformation",
  );
  const exactTopicSlotTransformationIds = [
    ...unit.decadal_transformation_fact_ids,
    ...unit.yearly_transformation_fact_ids,
  ];
  assert.deepEqual(
    actualTransformations.map((binding) => binding.fact_id).sort(),
    [...exactTopicSlotTransformationIds].sort(),
  );

  const fourPalaceTransformationIds = new Set();
  for (const scope of ["decadal", "yearly"]) {
    const slots = unit[`${scope}_component_star_palace_ids`].map((factId) => (
      calculation.facts.periods[scope].star_palaces.find((slot) => slot.fact_id === factId)
    ));
    const focusNatalPalaceId = slots[0].natal_palace_id;
    for (const transformation of calculation.facts.periods[scope].mutagens) {
      const locations = transformation.natal_locations.filter((location) => (
        slots.some((slot) => slot.natal_palace_id === location.natal_palace_id)
      ));
      if (locations.length) fourPalaceTransformationIds.add(transformation.fact_id);
      if (exactTopicSlotTransformationIds.includes(transformation.fact_id)) {
        assert.ok(locations.some((location) => location.natal_palace_id === focusNatalPalaceId));
      }
    }
  }
  const excludedBackgroundTransformationIds = [...fourPalaceTransformationIds].filter(
    (factId) => !exactTopicSlotTransformationIds.includes(factId),
  );
  assert.ok(
    excludedBackgroundTransformationIds.length > 0,
    "fixture must contain a non-focus four-palace transformation to prove it is excluded",
  );
  assert.ok(actualTransformations.every(
    (binding) => !excludedBackgroundTransformationIds.includes(binding.fact_id),
  ));
});

test("different primary stars and different transformations mechanically change assessment criteria", () => {
  const starA = makeCareerPhaseReading(calculate("ziwei", {
    date: "1998-01-01", time: "00:00", timezone: "Asia/Shanghai", chart_sex: "female",
    target_date: "2026-08-23",
  }));
  const starB = makeCareerPhaseReading(calculate("ziwei", {
    date: "2001-01-01", time: "00:00", timezone: "Asia/Shanghai", chart_sex: "female",
    target_date: "2026-08-23",
  }));
  const starClaimA = starA.reading.claims[0];
  const starClaimB = starB.reading.claims[0];
  assert.deepEqual(
    starClaimA.meaning_binding.transformation_lenses.map((item) => [item.star, item.transformation]),
    starClaimB.meaning_binding.transformation_lenses.map((item) => [item.star, item.transformation]),
    "the star-axis comparison fixture must hold its period process fixed",
  );
  assert.notDeepEqual(
    flattenedPalaceStarNames(starClaimA.meaning_binding),
    flattenedPalaceStarNames(starClaimB.meaning_binding),
  );
  assert.notDeepEqual(starClaimA.assessment.criteria, starClaimB.assessment.criteria);

  const processA = makeCareerPhaseReading(calculate("ziwei", {
    ...ZIWEI_BIRTH, target_date: "2026-08-23",
  }));
  const processB = makeCareerPhaseReading(calculate("ziwei", {
    ...ZIWEI_BIRTH, target_date: "2027-06-01",
  }));
  const processClaimA = processA.reading.claims[0];
  const processClaimB = processB.reading.claims[0];
  assert.deepEqual(
    flattenedPalaceStarNames(processClaimA.meaning_binding),
    flattenedPalaceStarNames(processClaimB.meaning_binding),
    "the process comparison fixture must hold its natal star axes fixed",
  );
  assert.notDeepEqual(
    processClaimA.meaning_binding.transformation_lenses.map((item) => [item.star, item.transformation]),
    processClaimB.meaning_binding.transformation_lenses.map((item) => [item.star, item.transformation]),
  );
  assert.notDeepEqual(processClaimA.assessment.criteria, processClaimB.assessment.criteria);
});

test("duplicate closed Zi Wei claims cannot repeat the same chart, topic, route, mode, and window", () => {
  const payload = makeNatalCareerReading();
  const duplicate = structuredClone(payload.reading.claims[0]);
  duplicate.claim_id = "C-ziwei-career-duplicate";
  payload.reading.claims.push(duplicate);
  assertInvalid(payload, /duplicates an existing closed Zi Wei meaning claim/u);
});

test("R-ZW-009 cannot shorten or shift the mechanically derived exact phase window", () => {
  const payload = makeCareerPhaseReading();
  const claim = payload.reading.claims[0];
  claim.meaning_binding.phase.window.end = "2027-02-04";
  claim.assessment.window.end = "2027-02-04";
  assertInvalid(
    payload,
    /meaning binding must exactly equal the binding mechanically derived|assessment must exactly equal the canonical Zi Wei meaning rendering/u,
  );
});

test("R-ZW-007 and R-ZW-008 fail closed for bounded or prospective assessment modes", async (t) => {
  const cases = [
    ["R-ZW-007 bounded", makeNatalCareerReading, "bounded_phase"],
    ["R-ZW-007 prospective", makeNatalCareerReading, "prospective_hypothesis"],
    ["R-ZW-008 bounded", makeNatalCareerTransformationReading, "bounded_phase"],
    ["R-ZW-008 prospective", makeNatalCareerTransformationReading, "prospective_hypothesis"],
  ];

  for (const [name, makePayload, mode] of cases) {
    await t.test(name, () => {
      const payload = makePayload();
      const claim = payload.reading.claims[0];
      claim.assessment = {
        ...claim.assessment,
        mode,
        window: { kind: "bounded", start: "2026-01-01", end: "2026-12-31" },
      };
      if (mode === "prospective_hypothesis") {
        claim.assessment.criteria.push({
          criterion_id: `K-${claim.claim_id}-unclear`,
          polarity: "unclear",
          observable: "同期带日期资料不足，无法判断所列主题是否持续出现",
          evidence_source: "contemporaneous_record",
        });
      }
      assert.throws(
        () => bindReadingToCalculations(payload),
        (error) => error.code === "MEANING_LAYER_UNAVAILABLE"
          && /UNSUPPORTED_ASSESSMENT_MODE/u.test(error.message),
      );
    });
  }
});

test("even prospective Zi Wei mode cannot hide promotion or resignation events in any canonical field", async (t) => {
  const cases = [
    ["statement", (claim) => { claim.statement += " 明年会升职。"; }],
    ["reasoning_summary", (claim) => { claim.reasoning_summary += " 明年会离职。"; }],
    ["alternative_readings", (claim) => { claim.alternative_readings[0] += " 明年会升职。"; }],
    ["practical_reflection", (claim) => { claim.practical_reflection += " 并判断明年会离职。"; }],
    ["assessment criterion", (claim) => { claim.assessment.criteria[0].observable += "，并证明明年会升职或离职"; }],
  ];

  for (const [name, mutate] of cases) {
    await t.test(name, () => {
      const payload = makeCareerPhaseReading(undefined, "prospective_hypothesis");
      const claim = payload.reading.claims[0];
      mutate(claim);
      if (name === "statement") payload.reading.summary = claim.statement;
      assertInvalid(payload, /canonical Zi Wei meaning rendering|unconditional future outcome assertion/u);
    });
  }
});

test("non-phase free text cannot turn softer future wording into a reading", async (t) => {
  const cases = [
    "来年即将迎来事业喜讯。",
    "接下来肯定有新的突破。",
    "未来也许会更顺。",
  ];
  for (const text of cases) {
    await t.test(text, () => {
      const payload = makeNatalCareerReading();
      payload.reading.claims[0].alternative_readings[0] = text;
      assertInvalid(payload, /unconditional future outcome assertion|cannot introduce prospective content outside the closed Zi Wei phase route|canonical Zi Wei meaning rendering/u);
    });
  }
});

test("an unresolved label cannot be reversed by a later certain clause", () => {
  const payload = makeCanonicalUnresolvedReading();
  assertValid(payload);
  const claim = payload.reading.claims[0];
  claim.statement = "目前无法判断是否会升职；但实际上明年肯定会升职。";
  payload.reading.summary = claim.statement;
  assertInvalid(
    payload,
    /must equal the canonical unresolved rendering|must keep every prospective clause explicitly unresolved|unconditional future outcome assertion/u,
  );
});

test("every free-text clause of an unresolved claim must remain independently unresolved", async (t) => {
  const reversal = "当前信息不足，无法判断未来是否会升职；但实际上明年一定会升职。";
  const cases = [
    ["statement", (claim) => { claim.statement = reversal; }],
    ["reasoning_summary", (claim) => { claim.reasoning_summary = reversal; }],
    ["alternative_readings", (claim) => { claim.alternative_readings = [reversal]; }],
    ["practical_reflection", (claim) => { claim.practical_reflection = reversal; }],
    ["assessment injection", (claim) => {
      claim.assessment = currentAssessment(claim.topic, "unresolved-injection");
      claim.assessment.criteria[0].observable = reversal;
    }],
  ];
  for (const [name, mutate] of cases) {
    await t.test(name, () => {
      const payload = makeCanonicalUnresolvedReading();
      assertValid(payload);
      const claim = payload.reading.claims[0];
      mutate(claim);
      if (name === "statement") payload.reading.summary = claim.statement;
      assertInvalid(
        payload,
        /must equal the canonical unresolved rendering|is not allowed for an unresolved claim|must keep every prospective clause explicitly unresolved|unconditional future outcome assertion/u,
      );
    });
  }
});

test("the binder emits one canonical unresolved result and strips interpretive machinery", () => {
  const payload = makeCanonicalUnresolvedReading();
  assertValid(payload);
  const claim = payload.reading.claims[0];
  assert.equal(claim.statement, "关于当前选择，当前资料不足，无法判断具体结果。");
  assert.equal(payload.reading.summary, claim.statement);
  assert.deepEqual(claim.alternative_readings, [
    "补充可靠的现实资料后，可以重新核对当前条件；这不会把传统含义变成事件预测。",
  ]);
  for (const field of [
    "assessment", "interpretation_profile_id", "rule_pack_hash", "meaning_binding",
    "semantic_bindings", "technical_summary",
  ]) {
    assert.equal(Object.hasOwn(claim, field), false, `${field} must be absent`);
  }
});

test("top-level result fields cannot carry an outcome prediction beside canonical claims", async (t) => {
  const cases = [
    ["title", (reading) => { reading.title = "明年一定会升职"; }],
    ["summary", (reading) => { reading.summary = "明年一定会升职。"; }],
    ["disclaimer", (reading) => { reading.disclaimer = "仅供参考，但明年一定会升职。"; }],
    ["uncertainty_summary", (reading) => { reading.uncertainty_summary = "细节不确定，但明年一定会离职。"; }],
    ["next-step label", (reading) => { reading.next_steps[0].label = "查看明年一定会升职的原因"; }],
  ];
  for (const [name, mutate] of cases) {
    await t.test(name, () => {
      const payload = makeNatalCareerReading();
      mutate(payload.reading);
      assertInvalid(payload, /unconditional future outcome assertion/u);
    });
  }
});

test("top-level summary cannot hide a future outcome as a noun phrase or idiom", async (t) => {
  for (const text of [
    "明年事业喜讯连连。",
    "2027年收入翻番。",
    "来年婚期落定。",
  ]) {
    await t.test(text, () => {
      const payload = makeCareerPhaseReading(undefined, "prospective_hypothesis");
      payload.reading.summary = text;
      assertInvalid(
        payload,
        /unconditional future outcome assertion|future outcome|summary must equal the first claim statement/u,
      );
    });
  }
});

test("every next-step label and reason is future-checked even when the choice is unavailable", async (t) => {
  const cases = [
    ["unavailable label", (step) => {
      step.available = false;
      step.label = "明年一定会升职";
      step.reason = "此入口暂不可用";
    }],
    ["available reason", (step) => {
      step.available = true;
      step.reason = "因为明年一定会升职";
    }],
    ["unavailable reason", (step) => {
      step.available = false;
      step.reason = "因为明年一定会离职";
    }],
  ];
  for (const [name, mutate] of cases) {
    await t.test(name, () => {
      const payload = makeNatalCareerReading();
      mutate(payload.reading.next_steps[0]);
      assertInvalid(payload, /unconditional future outcome assertion|cannot frame a result or action as a future event/u);
    });
  }
});

test("malformed nested Zi Wei facts fail validation without throwing", async (t) => {
  const base = makeCareerPhaseReading();
  const cases = [
    ["palace star array", (facts) => { facts.palaces[0].major_stars = { unexpected: true }; }],
    ["phase transformation IDs", (facts) => { facts.phase_topic_units[1].yearly_transformation_fact_ids = [null]; }],
    ["phase boundary conventions", (facts) => { facts.periods.phase_validity.boundary_conventions = []; }],
  ];
  for (const [name, mutate] of cases) {
    await t.test(name, () => {
      const payload = structuredClone(base);
      mutate(payload.calculation.facts);
      payload.calculation.facts_hash = calculateFactsHash(payload.calculation);
      payload.calculation.reproducibility_hash = calculateReproducibilityHash(payload.calculation);
      let validation;
      assert.doesNotThrow(() => { validation = validateReading(payload); });
      assert.equal(validation.valid, false);
      assert.ok(validation.errors.length > 0);
    });
  }
});

test("unknown, malformed, or duplicate component major stars fail closed instead of being skipped", async (t) => {
  const cases = [
    ["unknown star", (palace) => { palace.major_stars[0].name = "未登记主星"; }],
    ["malformed star", (palace) => { palace.major_stars[0] = { unexpected: true }; }],
    ["duplicate star", (palace) => { palace.major_stars.push(structuredClone(palace.major_stars[0])); }],
  ];
  for (const [name, mutate] of cases) {
    await t.test(name, () => {
      const payload = makeNatalCareerReading();
      const claim = payload.reading.claims[0];
      const unit = payload.calculation.facts.topic_units.find((item) => item.fact_id === claim.topic_unit_id);
      const palace = payload.calculation.facts.palaces.find(
        (item) => item.fact_id === unit.component_palace_ids[0],
      );
      mutate(palace);
      payload.calculation.facts_hash = calculateFactsHash(payload.calculation);
      payload.calculation.reproducibility_hash = calculateReproducibilityHash(payload.calculation);

      const derivation = deriveZiweiMeaningBinding(claim, payload.calculation);
      assert.equal(derivation.ok, false);
      assert.equal(derivation.status, "unavailable");
      assert.match(
        derivation.reason_code,
        /UNREPLAYABLE_CALCULATION|UNREGISTERED_COMPONENT_MAJOR_STAR/u,
      );
    });
  }
});

test("public Zi Wei meaning helpers reject a self-rehashed calculation that cannot replay", async (t) => {
  const payload = makeNatalCareerReading();
  const claim = payload.reading.claims[0];
  const forged = structuredClone(payload.calculation);
  forged.facts.palaces[0].major_stars[0].name = "未登记主星";
  forged.facts_hash = calculateFactsHash(forged);
  forged.reproducibility_hash = calculateReproducibilityHash(forged);

  for (const [name, helper] of [
    ["semantic bindings", canonicalZiweiSemanticBindings],
    ["canonical narrative", canonicalZiweiNarrative],
  ]) {
    await t.test(name, () => {
      assert.throws(
        () => helper(claim.meaning_binding, forged),
        /current-engine replay|cannot bind semantics for invalid|cannot render invalid/u,
      );
    });
  }
});

test("an empty registered topic primary palace fails closed instead of borrowing stars", () => {
  assert.throws(
    () => bindReadingToCalculations(makeEmptyPrimaryPalaceDraft()),
    (error) => error.code === "MEANING_LAYER_UNAVAILABLE"
      && /NO_REGISTERED_MAJOR_STAR/u.test(error.message),
  );
});

test("a non-Ziwei interpretation cannot opt into prospective hypothesis mode", () => {
  const payload = makeIChingReading();
  const claim = payload.reading.claims[0];
  claim.assessment = {
    mode: "prospective_hypothesis",
    domain: claim.topic,
    window: { kind: "bounded", start: "2026-09-01", end: "2026-12-31" },
    criteria: [
      ...claim.assessment.criteria,
      {
        criterion_id: "K-iching-unclear",
        polarity: "unclear",
        observable: "同期现实资料缺少日期或必要字段，无法判断是否支持本条主题",
        evidence_source: "contemporaneous_record",
      },
    ],
  };
  assertInvalid(payload, /assessment.mode is not allowed by rule R-YJ-003/u);
});
