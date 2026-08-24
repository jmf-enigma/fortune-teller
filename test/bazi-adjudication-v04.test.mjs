import test from "node:test";
import assert from "node:assert/strict";
import { calculate } from "../src/index.mjs";
import { adjudicateBazi } from "../src/core/bazi-adjudicator.mjs";
import {
  BAZI_ADJUDICATION_RULEPACK_META,
  BAZI_ADJUDICATION_RULES,
  BAZI_ADJUDICATION_STATES,
  BAZI_DIRECTION_ONTOLOGY,
  BAZI_MONTH_COMMAND_PATTERN_RULES,
  BAZI_VIEW_DEFINITIONS,
} from "../src/data/bazi-adjudication-rulepack.mjs";

const BASE_INPUT = {
  date: "2000-08-16",
  time: "04:00",
  timezone: "Asia/Shanghai",
};

function bazi(input = BASE_INPUT) {
  return calculate("bazi", input);
}

function allKeys(value, output = []) {
  if (!value || typeof value !== "object") return output;
  for (const [key, child] of Object.entries(value)) {
    output.push(key);
    allKeys(child, output);
  }
  return output;
}

test("rule pack declares sources, prerequisites, and qualitative adjudication only", () => {
  assert.equal(BAZI_ADJUDICATION_RULEPACK_META.quantitative_policy, "no_scores_no_weights_no_school_averaging");
  assert.equal(BAZI_ADJUDICATION_RULEPACK_META.event_policy, "no_named_event_prediction");
  assert.match(BAZI_ADJUDICATION_RULEPACK_META.route_closure_policy, /presence.*cannot_close/u);
  assert.ok(BAZI_ADJUDICATION_RULEPACK_META.sources.every((source) => source.source_status));
  assert.ok(BAZI_ADJUDICATION_RULES.length >= 6);
  for (const rule of BAZI_ADJUDICATION_RULES) {
    assert.ok(rule.source_status);
    assert.ok(Array.isArray(rule.prerequisites) && rule.prerequisites.length > 0);
    assert.ok(Array.isArray(rule.forbids));
  }
  for (const rule of Object.values(BAZI_MONTH_COMMAND_PATTERN_RULES)) {
    assert.ok(rule.source_status);
    assert.ok(Array.isArray(rule.prerequisites) && rule.prerequisites.length > 0);
    assert.ok(Array.isArray(rule.maintain));
    assert.ok(Array.isArray(rule.damage));
    assert.ok(Array.isArray(rule.rescue));
    assert.ok(Array.isArray(rule.formation_routes) && rule.formation_routes.length > 0);
    assert.ok(Array.isArray(rule.damage_routes));
    assert.ok(Array.isArray(rule.rescue_routes));
    assert.ok([...rule.damage_routes, ...rule.rescue_routes].every((route) => route.closure !== "closed"));
  }
  for (const view of Object.values(BAZI_VIEW_DEFINITIONS)) {
    assert.ok(view.source_status);
    assert.ok(view.prerequisites.length > 0);
  }
  assert.deepEqual(BAZI_DIRECTION_ONTOLOGY.印星.members, ["正印", "偏印"]);
  assert.deepEqual(BAZI_DIRECTION_ONTOLOGY.食伤.members, ["食神", "伤官"]);
});

test("month-command transparency alone never upgrades a candidate to a completed pattern", () => {
  const result = adjudicateBazi(bazi()).lenses.pattern;
  assert.equal(result.hypothesis.label, "偏财格候选");
  assert.ok(result.transparent_fact_ids.length > 0);
  assert.equal(result.hypothesis.state, BAZI_ADJUDICATION_STATES.unresolved);
  assert.deepEqual(result.formation.matched_routes, []);
  assert.match(result.conclusion, /复合条件尚未齐|机器成格路线尚未安装/u);
});

test("a screening-only unresolved damage route cannot manufacture full rescue", () => {
  const result = adjudicateBazi(bazi({
    date: "1990-01-01", time: "12:00", timezone: "Asia/Shanghai",
  })).lenses.pattern;
  assert.equal(result.hypothesis.state, BAZI_ADJUDICATION_STATES.damaged);
  assert.ok(result.route_adjudication.active_damage_routes.some((item) => item.closure === "screening_only"));
  assert.ok(result.route_adjudication.active_rescue_routes.length > 0);
  assert.match(result.conclusion, /只判受损，不越级判(?:最终)?破格或救应/u);
});

test("presence-only rescue cannot erase unresolved damage or become an effective remedy", () => {
  const result = adjudicateBazi(bazi({
    date: "1980-02-09", time: "12:00", timezone: "Asia/Shanghai",
  }));
  assert.equal(result.lenses.pattern.hypothesis.label, "食神格候选");
  assert.equal(result.lenses.pattern.hypothesis.state, BAZI_ADJUDICATION_STATES.damaged);
  assert.ok(result.lenses.pattern.route_adjudication.active_rescue_routes.some((item) => (
    item.id === "R-FOOD-OWL-WEALTH" && item.closure === "presence_closed_effect_unresolved"
  )));
  const disease = result.lenses.useful_god_views.find((view) => view.lens === "病药");
  assert.equal(disease.state, BAZI_ADJUDICATION_STATES.unresolved);
  assert.deepEqual(disease.proposed_directions, []);
  assert.match(disease.conclusion, /候选病点|不把筛查信号升级成救应/u);

  const formerlyClosed = adjudicateBazi(bazi({
    date: "1993-06-08", time: "12:00", timezone: "Asia/Shanghai",
  })).lenses.useful_god_views.find((view) => view.lens === "病药");
  assert.equal(formerlyClosed.state, BAZI_ADJUDICATION_STATES.unresolved);
  assert.deepEqual(formerlyClosed.proposed_directions, []);
});

test("mixed natal facts keep strong and weak hypotheses visible instead of manufacturing a score", () => {
  const result = adjudicateBazi(bazi());
  assert.equal(result.status, "completed");
  assert.equal(result.schema_version, "bazi-adjudication-v0.5");
  assert.deepEqual(
    result.lenses.strength.hypotheses.map((item) => item.hypothesis_id),
    ["H-BZ-STRENGTH-STRONG", "H-BZ-STRENGTH-WEAK"],
  );
  assert.equal(result.lenses.strength.selected_hypothesis_id, null);
  assert.match(result.lenses.strength.conclusion, /保持未决|不把混合盘压成一个分数/u);
  assert.ok(result.lenses.strength.hypotheses.every((item) => item.supporting_evidence.length > 0));
  assert.ok(result.lenses.strength.hypotheses.every((item) => item.contrary_evidence.length > 0));
  assert.equal(allKeys(result).some((key) => ["score", "weight", "threshold", "probability"].includes(key)), false);
  assert.equal(result.safeguards.score_used, false);
  assert.equal(result.safeguards.school_average_used, false);
});

test("strength hypotheses can establish either route through explicit conjunctions", () => {
  const strong = adjudicateBazi(bazi({
    date: "1996-06-18", time: "12:00", timezone: "Asia/Shanghai",
  }));
  assert.equal(strong.lenses.strength.selected_hypothesis_id, "H-BZ-STRENGTH-STRONG");
  assert.equal(
    strong.lenses.strength.hypotheses.find((item) => item.hypothesis_id.endsWith("STRONG")).state,
    BAZI_ADJUDICATION_STATES.established,
  );

  const weak = adjudicateBazi(bazi({
    date: "2001-09-08", time: "12:00", timezone: "Asia/Shanghai",
  }));
  assert.equal(weak.lenses.strength.selected_hypothesis_id, "H-BZ-STRENGTH-WEAK");
  assert.equal(
    weak.lenses.strength.hypotheses.find((item) => item.hypothesis_id.endsWith("WEAK")).state,
    BAZI_ADJUDICATION_STATES.established,
  );
});

test("route-level carrying facts make the formerly unreachable formation routes executable", () => {
  const fixtures = [
    ["1980-01-03", "F-PRINT-OUTPUT"],
    ["1980-01-05", "F-KILL-CONTROLLED"],
    ["1980-02-07", "F-WEALTH-FOOD-STRONG"],
  ];
  for (const [date, routeId] of fixtures) {
    const pattern = adjudicateBazi(bazi({ date, time: "12:00", timezone: "Asia/Shanghai" })).lenses.pattern;
    assert.ok(pattern.formation.matched_routes.some((route) => route.id === routeId));
    assert.notEqual(pattern.hypothesis.state, BAZI_ADJUDICATION_STATES.unresolved);
  }
});

test("source-anchored presence routes preserve candidates without final breakage or rescue", () => {
  const rescueCandidate = adjudicateBazi(bazi({
    date: "1993-06-08", time: "12:00", timezone: "Asia/Shanghai",
  })).lenses.pattern;
  assert.equal(rescueCandidate.hypothesis.label, "正官格候选");
  assert.equal(rescueCandidate.hypothesis.state, BAZI_ADJUDICATION_STATES.damaged);
  assert.deepEqual(rescueCandidate.state_history, [
    BAZI_ADJUDICATION_STATES.established,
    BAZI_ADJUDICATION_STATES.damaged,
  ]);
  assert.ok(rescueCandidate.damage.length > 0);
  assert.ok(rescueCandidate.rescue.length > 0);
  assert.deepEqual(rescueCandidate.formation.matched_routes.map((item) => item.id), ["F-OFFICER-PRINT"]);
  assert.deepEqual(rescueCandidate.route_adjudication.active_damage_routes.map((item) => item.id), ["D-OFFICER-HURT"]);
  assert.deepEqual(rescueCandidate.route_adjudication.active_rescue_routes.map((item) => item.id), ["R-OFFICER-HURT-PRINT"]);
  assert.ok(rescueCandidate.route_adjudication.active_rescue_routes.every((item) => (
    item.closure === "presence_closed_effect_unresolved"
  )));

  const breakCandidate = adjudicateBazi(bazi({
    date: "1992-05-15", time: "12:00", timezone: "Asia/Shanghai",
  })).lenses.pattern;
  assert.equal(breakCandidate.hypothesis.state, BAZI_ADJUDICATION_STATES.damaged);
  assert.deepEqual(breakCandidate.state_history, [
    BAZI_ADJUDICATION_STATES.established,
    BAZI_ADJUDICATION_STATES.damaged,
  ]);
  assert.ok(breakCandidate.damage.length > 0);
  assert.equal(breakCandidate.rescue.length, 0);
  assert.deepEqual(breakCandidate.formation.matched_routes.map((item) => item.id), ["F-OFFICER-WEALTH"]);
  assert.ok(breakCandidate.route_adjudication.active_damage_routes.every((item) => item.closure !== "effect_closed"));
  assert.match(breakCandidate.route_adjudication.coverage, /制化效力|不得升级/u);
});

test("climate and passage are recomputed from replay facts and ignore caller claims", () => {
  const calculation = bazi();
  const baseline = adjudicateBazi(calculation);
  assert.deepEqual(
    baseline.lenses.useful_god_views.map((view) => view.lens),
    ["格局取用", "扶抑", "调候", "通关", "病药"],
  );
  const baselineClimate = baseline.lenses.useful_god_views.find((view) => view.lens === "调候");
  const baselinePassage = baseline.lenses.useful_god_views.find((view) => view.lens === "通关");
  assert.equal(baselineClimate.source.rule_id, "QT-丙-申");
  assert.equal(baselineClimate.route_status, "conditional_roles_unresolved");
  assert.equal(baselineClimate.state, BAZI_ADJUDICATION_STATES.unresolved);
  assert.deepEqual(baselineClimate.proposed_directions, []);
  assert.equal(baselinePassage.state, BAZI_ADJUDICATION_STATES.established);
  assert.ok(baselinePassage.routes.every((route) => route.fact_ids.length >= 3));

  const forged = adjudicateBazi(calculation, { rule_inputs: {
    climate: {
      source_status: "edition_entry_verified",
      day_stem: calculation.facts.pillars[2].heavenly_stem,
      month_branch: calculation.facts.pillars[1].earthly_branch,
      primary_direction: "壬水",
    },
    passage: {
      source_status: "rule_entry_verified",
      opposed_forces: ["火", "金"],
      mediator: "土",
      basis_fact_ids: ["F-BZ-001", "F-BZ-003"],
    },
  } });
  assert.deepEqual(
    forged.lenses.useful_god_views.find((view) => view.lens === "调候"),
    baselineClimate,
  );
  assert.deepEqual(
    forged.lenses.useful_god_views.find((view) => view.lens === "通关"),
    baselinePassage,
  );
  assert.equal(forged.safeguards.external_rule_inputs_accepted, false);
  assert.deepEqual(forged.audit.ignored_untrusted_option_keys, ["rule_inputs"]);
});

test("external period fallback is closed and cannot rewrite the natal baseline", () => {
  const result = adjudicateBazi(bazi(), { periods: {
    decadal: {
      source_status: "verified_calculation_fact",
      fact_id: "F-BZ-D01",
      heavenly_stem: "甲",
      earthly_branch: "寅",
      ten_god_stem: "偏印",
    },
    yearly: {
      source_status: "verified_calculation_fact",
      fact_id: "F-BZ-Y01",
      heavenly_stem: "庚",
      earthly_branch: "申",
      ten_god_stem: "偏财",
    },
  } });
  assert.equal(result.phase.natal.role, "baseline");
  assert.equal(result.phase.decadal.status, "unavailable");
  assert.equal(result.phase.yearly.status, "unavailable");
  assert.equal(result.phase.source, "calculation.facts.luck_cycles_unavailable");
  assert.match(result.phase.hierarchy, /后层不得反写前层/u);
  assert.equal(result.safeguards.natal_rewritten_by_period, false);
  assert.equal(result.safeguards.external_period_inputs_accepted, false);
  assert.deepEqual(result.audit.ignored_untrusted_option_keys, ["periods"]);
  assert.equal(result.phase.natal.conclusion, adjudicateBazi(bazi()).phase.natal.conclusion);
});

test("verified luck-cycle facts take priority over optional period input", () => {
  const calculation = bazi({
    ...BASE_INPUT,
    chart_sex: "female",
    target_date: "2026-08-24",
  });
  const result = adjudicateBazi(calculation, { periods: {
    decadal: {
      source_status: "verified_calculation_fact",
      fact_id: "F-EXTERNAL-D",
      heavenly_stem: "甲",
      earthly_branch: "寅",
      ten_god_stem: "偏印",
    },
    yearly: {
      source_status: "verified_calculation_fact",
      fact_id: "F-EXTERNAL-Y",
      heavenly_stem: "庚",
      earthly_branch: "申",
      ten_god_stem: "偏财",
    },
  } });
  assert.equal(result.phase.source, "calculation.facts.luck_cycles");
  assert.equal(result.phase.decadal.fact_id, calculation.facts.luck_cycles.target.active_decadal_fact_id);
  assert.equal(result.phase.yearly.fact_id, calculation.facts.luck_cycles.target.yearly.fact_id);
  assert.notEqual(result.phase.decadal.fact_id, "F-EXTERNAL-D");
  assert.notEqual(result.phase.yearly.fact_id, "F-EXTERNAL-Y");
});

test("luck and year rerun every registered route without naming events", () => {
  const result = adjudicateBazi(bazi({
    ...BASE_INPUT,
    chart_sex: "male",
    target_date: "2026-08-24",
  }));
  assert.equal(result.phase.joint_activation.status, "structurally_linked");
  assert.equal(result.phase.joint_activation.adjudication_level, "registered_route_re_adjudication");
  assert.ok(result.phase.joint_activation.relation_labels.includes("天克地冲"));
  assert.ok(result.phase.joint_activation.relation_labels.includes("运年与原局伏吟"));
  assert.ok(result.phase.joint_activation.relation_labels.includes("岁运补成三合"));
  assert.equal(result.phase.re_adjudication.decadal.status, "re_adjudicated");
  assert.equal(result.phase.re_adjudication.yearly.status, "re_adjudicated");
  assert.ok(Array.isArray(result.phase.re_adjudication.decadal.transition.opened_damage_routes));
  assert.match(result.phase.joint_activation.conclusion, /流年没有被单独拿来命名事件|结构迁移/u);
  for (const stage of [result.phase.decadal, result.phase.yearly]) {
    assert.equal(Object.hasOwn(stage.pattern_effect.visible, "effect"), false);
    assert.match(stage.pattern_effect.adjudication, /候选条件|单一运年十神不能直接称为成格、破格或救应/u);
    for (const hidden of stage.pattern_effect.hidden) assert.equal(Object.hasOwn(hidden, "effect"), false);
  }
});

test("generic stem repetition or control alone does not manufacture a complete three-layer activation", () => {
  const result = adjudicateBazi(bazi({
    ...BASE_INPUT,
    chart_sex: "male",
    target_date: "2036-08-24",
  }));
  assert.equal(result.phase.joint_activation.status, "partly_linked");
  assert.ok(result.phase.joint_activation.excluded_generic_relation_fact_ids.length > 0);
  assert.match(result.phase.joint_activation.conclusion, /仍为未决|流年没有被单独拿来命名事件/u);
});

test("a luck-cycle boundary remains unavailable instead of choosing one side", () => {
  const calculation = bazi({
    date: "2000-01-15",
    time: "08:37",
    timezone: "Asia/Shanghai",
    chart_sex: "female",
    target_date: "2006-11-15",
  });
  const result = adjudicateBazi(calculation);
  assert.equal(result.phase.source, "calculation.facts.luck_cycles");
  assert.equal(result.phase.decadal.status, "unavailable");
  assert.equal(result.phase.joint_activation.status, "unavailable");
  assert.match(result.phase.decadal.conclusion, /起运边界|没有唯一当前大运/u);
});

test("ordinary-language result includes evidence, change conditions, and prospective reality checks without named events", () => {
  const result = adjudicateBazi(bazi());
  assert.ok(result.conclusion.length > 0);
  assert.ok(result.plain_language.length > 0);
  assert.ok(result.basis.length > 0);
  assert.ok(result.change_conditions.length >= 3);
  assert.ok(result.reality_checks.length >= 3);
  const userText = [
    result.conclusion,
    result.plain_language,
    ...result.change_conditions,
    ...result.reality_checks,
    result.phase.natal.conclusion,
    result.phase.decadal.conclusion,
    result.phase.yearly.conclusion,
  ].join("\n");
  assert.doesNotMatch(userText, /结婚|离婚|发财|破财|升职|失业|疾病|住院|官司|死亡|事故/u);
  assert.match(userText, /不强行|不能|核对/u);
});

test("overview leads with a readable overall judgment and moves traditional labels behind the result", () => {
  const result = adjudicateBazi(bazi({
    date: "2001-01-15",
    time: "13:35",
    timezone: "Asia/Shanghai",
    chart_sex: "male",
    target_date: "2026-08-24",
  }));
  assert.match(result.conclusion, /^整体上，你不是一眼能归成“强”或“弱”的类型/u);
  assert.match(result.conclusion, /没有一条固定结构足以概括整个人生/u);
  assert.doesNotMatch(result.conclusion, /月劫|候选|未决|日主|格局/u);
  assert.match(result.plain_language, /^为什么这样看：出生时的季节条件偏向提供支持/u);
  assert.doesNotMatch(result.plain_language, /月劫|候选|未决|日主|格局/u);
  assert.equal(result.lenses.pattern.hypothesis.label, "月劫候选");
  assert.equal(result.lenses.pattern.hypothesis.state, "未决");
});

test("ordinary synthesis preserves damaged state instead of calling it a mere candidate", () => {
  const result = adjudicateBazi(bazi({
    date: "1980-02-09", time: "12:00", timezone: "Asia/Shanghai",
  }));
  assert.equal(result.lenses.pattern.hypothesis.state, BAZI_ADJUDICATION_STATES.damaged);
  assert.match(result.plain_language, /发挥会受影响，不能直接推结果/u);
  assert.doesNotMatch(result.plain_language, /只能作为候选/u);
});

test("direction ontology expands groups and different suggestions are not conflicts without explicit exclusion", () => {
  const result = adjudicateBazi(bazi({
    date: "1983-11-19", time: "12:00", timezone: "Asia/Shanghai",
  }));
  const patternView = result.lenses.useful_god_views.find((view) => view.lens === "格局取用");
  const supportView = result.lenses.useful_god_views.find((view) => view.lens === "扶抑");
  assert.deepEqual(patternView.expanded_directions, ["正财", "偏财", "正印", "偏印"]);
  assert.deepEqual(supportView.expanded_directions, ["正印", "偏印", "比肩", "劫财"]);
  assert.deepEqual(result.lenses.conflicts, []);
});

test("unknown birth time stays unavailable and does not invent professional hypotheses", () => {
  const result = adjudicateBazi(calculate("bazi", {
    date: "2000-08-16", timezone: "Asia/Shanghai",
  }));
  assert.equal(result.status, "unavailable");
  assert.match(result.plain_language, /出生时辰未知/u);
  assert.equal(Object.hasOwn(result, "competing_hypotheses"), false);
});

test("adjudication rejects a rehashed-looking but non-replayable natal mutation", () => {
  const calculation = structuredClone(bazi());
  calculation.facts.pillars[0].ten_god_stem = "正官";
  assert.throws(
    () => adjudicateBazi(calculation),
    (error) => error.code === "BAZI_ADJUDICATION_FACTS_UNVERIFIED" && /do not replay/u.test(error.message),
  );
});

test("adjudication output and rule pack are immutable", () => {
  const result = adjudicateBazi(bazi());
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.lenses.strength.hypotheses), true);
  assert.equal(Object.isFrozen(BAZI_ADJUDICATION_RULEPACK_META), true);
  assert.equal(Object.isFrozen(BAZI_ADJUDICATION_RULES), true);
  assert.throws(() => { result.phase.natal.role = "trigger"; }, TypeError);
});
