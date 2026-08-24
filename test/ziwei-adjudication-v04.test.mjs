import test from "node:test";
import assert from "node:assert/strict";
import {
  adjudicateZiweiEmptyPalace,
  adjudicateZiweiPattern,
  adjudicateZiweiPhase,
  adjudicateZiweiProfiles,
} from "../src/core/ziwei-adjudicator.mjs";
import {
  ZIWEI_ADJUDICATION_CANDIDATES,
  ZIWEI_ADJUDICATION_PROFILES,
  ZIWEI_ADJUDICATION_RULEPACK_META,
  ZIWEI_ADJUDICATION_STATES,
  ZIWEI_ADJUDICATION_TRANSITIONS,
} from "../src/data/ziwei-adjudication-rulepack.mjs";
import { calculate } from "../src/index.mjs";

const SANHE_CANDIDATE_ID = "ZW-ADJ-SANHE-TOPIC-STRUCTURE";
const FLYING_CANDIDATE_ID = "ZW-ADJ-FLYING-SIHUA-TOPIC-PROCESS";
const ZHONGZHOU_CANDIDATE_ID = "ZW-ADJ-ZHONGZHOU-TOPIC-BASELINE";
const TOPIC = "career_study";

function ziwei({ target = true } = {}) {
  return calculate("ziwei", {
    date: "2000-08-16",
    time: "04:00",
    timezone: "Asia/Shanghai",
    chart_sex: "female",
    ...(target ? { target_date: "2026-08-23" } : {}),
  });
}

const CALCULATION = ziwei();

function topicStructure(calculation, topic = TOPIC) {
  const unit = calculation.facts.topic_units.find((item) => item.topic === topic);
  assert.ok(unit);
  return {
    unit,
    factIds: [unit.fact_id, unit.relation_fact_id, ...unit.component_palace_ids],
  };
}

function phaseUnit(calculation, topic = TOPIC) {
  const unit = calculation.facts.phase_topic_units.find((item) => item.topic === topic);
  assert.ok(unit);
  return unit;
}

function structuralEvidence(calculation, topic = TOPIC) {
  return [{
    key: "complete_topic_structure",
    status: "present",
    evidence_kind: "palace_relation",
    fact_ids: topicStructure(calculation, topic).factIds,
  }];
}

function transformationEvidence(calculation, topic = TOPIC) {
  const { unit, factIds } = topicStructure(calculation, topic);
  return [{
    key: "complete_topic_transformations",
    status: unit.natal_mutagen_fact_ids.length > 0 ? "present" : "absent",
    evidence_kind: "transformation_route",
    fact_ids: unit.natal_mutagen_fact_ids.length > 0
      ? [...factIds, ...unit.natal_mutagen_fact_ids]
      : [],
  }];
}

function structuralPattern(overrides = {}) {
  return adjudicateZiweiPattern({
    profile_id: "sanhe",
    candidate_id: SANHE_CANDIDATE_ID,
    topic: TOPIC,
    calculation: CALCULATION,
    ...overrides,
  });
}

function structuralPhaseLayers(calculation, topic = TOPIC, overrides = {}) {
  const structure = topicStructure(calculation, topic);
  const unit = phaseUnit(calculation, topic);
  const ref = calculation.reproducibility_hash;
  return {
    natal: { topic, status: "present", calculation_ref: ref, fact_ids: structure.factIds },
    decadal: {
      topic,
      status: "present",
      calculation_ref: ref,
      fact_ids: [unit.decadal_period_id, ...unit.decadal_component_star_palace_ids],
    },
    yearly: {
      topic,
      status: "present",
      calculation_ref: ref,
      fact_ids: [unit.yearly_period_id, ...unit.yearly_component_star_palace_ids],
    },
    ...overrides,
  };
}

test("v0.4 keeps the state vocabulary but exposes only immutable replay-bound candidates", () => {
  assert.deepEqual(ZIWEI_ADJUDICATION_STATES, [
    "candidate", "established", "damaged", "broken", "rescued", "unresolved",
  ]);
  assert.equal(ZIWEI_ADJUDICATION_TRANSITIONS.length, 5);
  assert.deepEqual(Object.keys(ZIWEI_ADJUDICATION_PROFILES), ["sanhe", "flying_sihua", "zhongzhou"]);
  assert.deepEqual(Object.keys(ZIWEI_ADJUDICATION_CANDIDATES), [
    SANHE_CANDIDATE_ID,
    FLYING_CANDIDATE_ID,
    ZHONGZHOU_CANDIDATE_ID,
  ]);
  assert.equal(ZIWEI_ADJUDICATION_RULEPACK_META.professional_label_allowed, false);
  assert.equal(Object.isFrozen(ZIWEI_ADJUDICATION_CANDIDATES), true);
  assert.equal(Object.isFrozen(ZIWEI_ADJUDICATION_CANDIDATES[SANHE_CANDIDATE_ID].predicates), true);
  for (const candidate of Object.values(ZIWEI_ADJUDICATION_CANDIDATES)) {
    assert.match(candidate.claim_ceiling, /not_named_formation|not_route_formation/u);
    assert.deepEqual(candidate.conditions.damage.any_of, []);
    assert.deepEqual(candidate.conditions.break.any_of, []);
    assert.deepEqual(candidate.conditions.rescue.all_of, []);
  }
});

test("one registered structural candidate is derived from a replayed calculation", () => {
  const derived = structuralPattern();
  assert.equal(derived.state, "established");
  assert.deepEqual(derived.state_path, ["candidate", "established"]);
  assert.equal(derived.technical_basis.candidate_registry_locked, true);
  assert.equal(derived.technical_basis.calculation_ref, CALCULATION.reproducibility_hash);
  assert.deepEqual(derived.technical_basis.evidence[0].fact_ids, topicStructure(CALCULATION).factIds);
  assert.match(derived.conclusion_zh, /不等于完整命名格局识别/u);

  const asserted = structuralPattern({ evidence: structuralEvidence(CALCULATION) });
  assert.equal(asserted.state, "established");
});

test("arbitrary candidate objects and unknown candidate IDs are rejected", () => {
  assert.throws(() => adjudicateZiweiPattern({
    profile_id: "sanhe",
    candidate: {
      pattern_id: "FREE",
      label_zh: "任意自定义格",
      topic: TOPIC,
      profile_id: "sanhe",
      conditions: { establish: { all_of: ["made_up"] } },
    },
    topic: TOPIC,
    calculation: CALCULATION,
    evidence: [],
  }), /caller-supplied candidate objects are not accepted/u);

  assert.throws(() => adjudicateZiweiPattern({
    profile_id: "sanhe",
    candidate_id: "ZW-NOT-REGISTERED",
    topic: TOPIC,
    calculation: CALCULATION,
  }), /not in the immutable registry/u);
});

test("wrong evidence kind, status, path, or topic cannot satisfy a registered predicate", () => {
  const correct = structuralEvidence(CALCULATION)[0];
  assert.throws(() => structuralPattern({ evidence: [{ ...correct, evidence_kind: "star_in_palace" }] }), /does not exactly match/u);
  assert.throws(() => structuralPattern({ evidence: [{ ...correct, status: "absent", fact_ids: [] }] }), /does not exactly match/u);
  assert.throws(() => structuralPattern({ evidence: [{
    ...correct,
    fact_ids: [CALCULATION.facts.palaces[0].fact_id],
  }] }), /does not exactly match/u);
  assert.throws(() => structuralPattern({ evidence: [{
    ...correct,
    fact_ids: topicStructure(CALCULATION, "relationships").factIds,
  }] }), /does not exactly match/u);
});

test("pattern adjudication rejects a non-replayable envelope or fake envelope hash", () => {
  const tamperedFact = structuredClone(CALCULATION);
  tamperedFact.facts.topic_units.find((item) => item.topic === TOPIC).component_palace_ids[1] = "F-ZW-P12";
  assert.throws(() => structuralPattern({ calculation: tamperedFact }), /not replay-verifiable/u);

  const fakeHash = structuredClone(CALCULATION);
  fakeHash.reproducibility_hash = "f".repeat(64);
  assert.throws(() => structuralPattern({ calculation: fakeHash }), /reproducibility_hash does not match/u);
});

test("flying-Sihua structural candidate requires every replayed topic transformation", () => {
  const present = adjudicateZiweiPattern({
    profile_id: "flying_sihua",
    candidate_id: FLYING_CANDIDATE_ID,
    topic: TOPIC,
    calculation: CALCULATION,
    evidence: transformationEvidence(CALCULATION),
  });
  assert.equal(present.state, "established");

  const absent = adjudicateZiweiPattern({
    profile_id: "flying_sihua",
    candidate_id: FLYING_CANDIDATE_ID,
    topic: "relationships",
    calculation: CALCULATION,
    evidence: transformationEvidence(CALCULATION, "relationships"),
  });
  assert.equal(absent.state, "candidate");
  assert.deepEqual(absent.technical_basis.missing_establishment, ["complete_topic_transformations"]);
});

test("Sanhe, flying-Sihua and Zhongzhou stay independent with no vote or average", () => {
  const result = adjudicateZiweiProfiles({
    requests: [
      { profile_id: "sanhe", candidate_id: SANHE_CANDIDATE_ID, topic: TOPIC, calculation: CALCULATION },
      { profile_id: "flying_sihua", candidate_id: FLYING_CANDIDATE_ID, topic: TOPIC, calculation: CALCULATION },
      { profile_id: "zhongzhou", candidate_id: ZHONGZHOU_CANDIDATE_ID, topic: TOPIC, calculation: CALCULATION },
    ],
  });
  assert.equal(result.aggregation, "none");
  assert.deepEqual(Object.keys(result.profiles), ["sanhe", "flying_sihua", "zhongzhou"]);
  assert.ok(Object.values(result.profiles).every((item) => item.formation.profile.independent));
  assert.equal("combined_state" in result, false);
  assert.equal(/score|vote|average/u.test(JSON.stringify(result)), false);
});

const EMPTY_TARGET = {
  fact_id: "F-ZW-P01",
  name: "命宫",
  major_stars: [],
  minor_stars: [{ name: "文昌" }],
};
const OPPOSITE_SOURCE = {
  fact_id: "F-ZW-P07",
  name: "迁移",
  major_stars: [{ name: "天机", brightness: "旺", mutagen: "权" }],
  minor_stars: [{ name: "左辅" }],
};
const RELATION = {
  fact_id: "F-ZW-R01",
  focus_palace_id: EMPTY_TARGET.fact_id,
  opposite_palace_id: OPPOSITE_SOURCE.fact_id,
};

test("empty-palace borrowing is explicit, opposite-only, bounded and non-mutating", () => {
  const targetBefore = structuredClone(EMPTY_TARGET);
  const sourceBefore = structuredClone(OPPOSITE_SOURCE);
  const silent = adjudicateZiweiEmptyPalace({
    profile_id: "zhongzhou",
    target_palace: EMPTY_TARGET,
    relation: RELATION,
    opposite_palace: OPPOSITE_SOURCE,
  });
  assert.equal(silent.status, "not_requested");

  const applied = adjudicateZiweiEmptyPalace({
    profile_id: "zhongzhou",
    target_palace: EMPTY_TARGET,
    relation: RELATION,
    opposite_palace: OPPOSITE_SOURCE,
    request: { explicit: true, fields: ["major_stars"] },
  });
  assert.equal(applied.status, "applied");
  assert.deepEqual(applied.borrowed_major_stars, [{
    name: "天机",
    source_palace_id: "F-ZW-P07",
    source_palace: "迁移",
    borrowed_for: "context_only",
  }]);
  assert.equal("brightness" in applied.borrowed_major_stars[0], false);
  assert.equal("mutagen" in applied.borrowed_major_stars[0], false);
  assert.deepEqual(EMPTY_TARGET, targetBefore);
  assert.deepEqual(OPPOSITE_SOURCE, sourceBefore);
});

test("empty-palace borrowing is reversible and flying-Sihua never uses it", () => {
  const correctedTarget = { ...EMPTY_TARGET, major_stars: [{ name: "紫微" }] };
  const revoked = adjudicateZiweiEmptyPalace({
    profile_id: "sanhe",
    target_palace: correctedTarget,
    relation: RELATION,
    opposite_palace: OPPOSITE_SOURCE,
    request: { explicit: true, fields: ["major_stars"] },
  });
  assert.equal(revoked.status, "revoked");
  assert.deepEqual(revoked.borrowed_major_stars, []);

  const flying = adjudicateZiweiEmptyPalace({
    profile_id: "flying_sihua",
    target_palace: EMPTY_TARGET,
    relation: RELATION,
    opposite_palace: OPPOSITE_SOURCE,
    request: { explicit: true, fields: ["major_stars"] },
  });
  assert.equal(flying.status, "not_applicable");
});

test("a phase theme requires exact replayed natal, decadal, and yearly structures", () => {
  const supported = adjudicateZiweiPhase({
    profile_id: "sanhe",
    topic: TOPIC,
    layers: structuralPhaseLayers(CALCULATION),
    calculation: CALCULATION,
  });
  assert.equal(supported.status, "supported");
  assert.match(supported.conclusion_zh, /本命.*大限.*流年/u);
  assert.equal(supported.specific_event, null);
  assert.equal(supported.technical_basis.calculation_ref, CALCULATION.reproducibility_hash);
  assert.equal(supported.technical_basis.fact_ids_by_layer.decadal.length, 5);
  assert.equal(supported.technical_basis.fact_ids_by_layer.yearly.length, 5);
  assert.equal(/升职|录取|辞职|结婚|疾病|搬家|横财/u.test(JSON.stringify(supported)), false);

  for (const missingLayer of ["natal", "decadal", "yearly"]) {
    const layers = structuralPhaseLayers(CALCULATION);
    delete layers[missingLayer];
    const insufficient = adjudicateZiweiPhase({
      profile_id: "sanhe",
      topic: TOPIC,
      layers,
      calculation: CALCULATION,
    });
    assert.equal(insufficient.status, "insufficient", missingLayer);
    assert.equal(insufficient.phase_theme_zh, null);
  }
});

test("fake layer ref or fake envelope hash can never support a phase theme", () => {
  const correct = structuralPhaseLayers(CALCULATION);
  const fakeRef = adjudicateZiweiPhase({
    profile_id: "sanhe",
    topic: TOPIC,
    layers: { ...correct, yearly: { ...correct.yearly, calculation_ref: "FAKE" } },
    calculation: CALCULATION,
  });
  assert.equal(fakeRef.status, "unresolved");
  assert.equal(fakeRef.phase_theme_zh, null);

  const fakeHashCalculation = structuredClone(CALCULATION);
  fakeHashCalculation.reproducibility_hash = "0".repeat(64);
  const fakeHash = adjudicateZiweiPhase({
    profile_id: "sanhe",
    topic: TOPIC,
    layers: correct,
    calculation: fakeHashCalculation,
  });
  assert.equal(fakeHash.status, "unresolved");
  assert.equal(fakeHash.phase_theme_zh, null);
});

test("the same fact reused across layers cannot manufacture joint support", () => {
  const natal = structuralPhaseLayers(CALCULATION).natal;
  const reused = adjudicateZiweiPhase({
    profile_id: "sanhe",
    topic: TOPIC,
    calculation: CALCULATION,
    layers: { natal, decadal: { ...natal }, yearly: { ...natal } },
  });
  assert.equal(reused.status, "unresolved");
  assert.equal(reused.phase_theme_zh, null);
  assert.match(JSON.stringify(reused.layers), /reused|exact replay-derived/u);
});

test("missing structure and cross-topic facts cannot support the selected phase topic", () => {
  const correct = structuralPhaseLayers(CALCULATION);
  const missingStructure = adjudicateZiweiPhase({
    profile_id: "sanhe",
    topic: TOPIC,
    calculation: CALCULATION,
    layers: {
      ...correct,
      decadal: { ...correct.decadal, fact_ids: correct.decadal.fact_ids.slice(0, -1) },
    },
  });
  assert.equal(missingStructure.status, "unresolved");
  assert.equal(missingStructure.phase_theme_zh, null);

  const otherTopicYear = structuralPhaseLayers(CALCULATION, "relationships").yearly;
  const crossTopic = adjudicateZiweiPhase({
    profile_id: "sanhe",
    topic: TOPIC,
    calculation: CALCULATION,
    layers: { ...correct, yearly: { ...otherTopicYear, topic: TOPIC } },
  });
  assert.equal(crossTopic.status, "unresolved");
  assert.equal(crossTopic.phase_theme_zh, null);
});

test("a replayed chart without target-date structure remains unsupported", () => {
  const result = adjudicateZiweiPhase({
    profile_id: "sanhe",
    topic: TOPIC,
    calculation: ziwei({ target: false }),
    layers: {},
  });
  assert.equal(result.status, "insufficient");
  assert.equal(result.phase_theme_zh, null);
});

test("result-facing structural output is readable and exposes revision fields", () => {
  const result = structuralPattern();
  assert.match(result.conclusion_zh, /三方四正主题结构/u);
  assert.ok(result.plain_language_zh.length > 10);
  assert.ok(result.technical_basis.evidence.length > 0);
  assert.ok(result.change_conditions_zh.length > 0);
  assert.ok(result.reality_checks_zh.length > 0);
  assert.match(result.boundary_zh, /不是完整命名格局语料库/u);
});
