import test from "node:test";
import assert from "node:assert/strict";
import { calculate } from "../src/index.mjs";
import { adjudicateBazi } from "../src/core/bazi-adjudicator.mjs";
import {
  BAZI_CLIMATE_RULEPACK_META,
  BAZI_CLIMATE_RULES,
  getBaziClimateRule,
} from "../src/data/bazi-climate-rulepack.mjs";

const BASE = {
  date: "2000-08-16",
  time: "04:00",
  timezone: "Asia/Shanghai",
};

test("BaZi climate index contains one bounded entry for all 120 stem-month pairs", () => {
  assert.equal(BAZI_CLIMATE_RULEPACK_META.entry_count, 120);
  assert.equal(BAZI_CLIMATE_RULES.length, 120);
  assert.equal(new Set(BAZI_CLIMATE_RULES.map((rule) => rule.id)).size, 120);
  for (const rule of BAZI_CLIMATE_RULES) {
    assert.ok(rule.mentioned_stems.length >= 1);
    assert.equal(new Set(rule.mentioned_stems).size, rule.mentioned_stems.length);
    assert.equal(rule.coverage, "source_mentioned_stems_screening_index");
    assert.match(rule.interpretation_limit, /not priority|not generally adjudicated/u);
    assert.ok(rule.stem_roles.every((item) => rule.mentioned_stems.includes(item.stem)));
  }
  assert.deepEqual(getBaziClimateRule("甲", "寅").mentioned_stems, ["丙", "癸"]);
  assert.deepEqual(getBaziClimateRule("丙", "申").mentioned_stems, ["壬", "戊"]);
  assert.deepEqual(getBaziClimateRule("癸", "丑").mentioned_stems, ["丙", "壬", "丁"]);
});

test("climate index preserves verified conditional roles and refuses missing solar-term segments", () => {
  const split = getBaziClimateRule("乙", "酉");
  assert.equal(split.applicability.status, "requires_solar_term_segment");
  assert.deepEqual(split.applicability.missing_facts, ["solar_term_segment"]);
  assert.deepEqual(split.stem_roles, [
    { stem: "癸", roles: ["primary_before_秋分", "secondary_after_秋分"] },
    { stem: "丙", roles: ["primary_after_秋分"] },
  ]);
  const conditional = getBaziClimateRule("辛", "子");
  assert.equal(conditional.applicability.status, "conditional_roles_not_adjudicated");
  assert.deepEqual(conditional.stem_roles.find((item) => item.stem === "戊").roles, [
    "conditional_rescue", "contraindicated_in_base_route",
  ]);
  assert.match(getBaziClimateRule("甲", "午").source_locator, /五六月甲木/u);
  assert.match(getBaziClimateRule("丁", "未").source_locator, /六月之丁/u);
});

test("BaZi emits month-command candidates, seasonal context, located roots, and visible forces without weights", () => {
  const calculation = calculate("bazi", BASE);
  const structure = calculation.facts.structure;
  assert.equal(structure.month_command.earthly_branch, "申");
  assert.equal(structure.month_command.candidates_in_library_order[0].hidden_position, "main");
  assert.equal(structure.month_command.exact_commander_status, "unresolved_without_solar_term_segment_rule");
  assert.deepEqual(
    [structure.seasonal_context.season, structure.seasonal_context.season_stage],
    ["autumn", "early"],
  );
  assert.ok(structure.root_evidence.some((root) => root.relation === "same_stem_root"));
  assert.ok(structure.root_evidence.some((root) => root.hidden_position === "main"));
  assert.equal(structure.visible_force_evidence.length, 3);
  assert.match(JSON.stringify(structure), /not a strength|without a numerical weight|not one point/u);
});

test("three-punishment pair components carry a school-variance boundary", () => {
  const calculation = calculate("bazi", BASE);
  const pair = calculation.facts.structure.relationships.find((item) => (
    item.relationship === "branch_punishment"
  ));
  assert.ok(pair);
  assert.equal(pair.configuration_status, "pair_component_of_three_branch_punishment");
  assert.match(pair.school_variance, /stricter schools require/u);
});

test("a sole residual root under registered clash or punishment cannot establish strength", () => {
  const result = adjudicateBazi(calculate("bazi", {
    date: "1992-01-15",
    time: "04:00",
    timezone: "Asia/Shanghai",
  }));
  const strength = result.lenses.strength;
  assert.equal(strength.selected_hypothesis_id, null);
  assert.equal(strength.hypotheses.find((item) => item.hypothesis_id === "H-BZ-STRENGTH-STRONG").state, "未决");
  assert.deepEqual(strength.evidence_dimensions.root_usability_cautions[0], {
    root_fact_id: "F-BZ-RT01",
    root_position: "residual",
    interaction_fact_ids: ["F-BZ-R01", "F-BZ-R02"],
    status: "unresolved_under_registered_branch_interaction",
  });
  assert.match(strength.hypotheses[0].contrary_evidence.map((item) => item.statement).join("\n"), /不能仅凭此根/u);
});

test("climate route screens source mentions and locations but never invents priority or efficacy", () => {
  const result = adjudicateBazi(calculate("bazi", BASE));
  const climate = result.lenses.useful_god_views.find((view) => view.lens === "调候");
  assert.equal(climate.source.rule_id, "QT-丙-申");
  assert.deepEqual(climate.candidates.map((item) => item.stem), ["壬", "戊"]);
  assert.equal(climate.candidates[0].availability, "hidden_only");
  assert.equal(climate.state, "未决");
  assert.equal(climate.route_status, "conditional_roles_unresolved");
  assert.deepEqual(climate.proposed_directions, []);
  assert.deepEqual(climate.candidate_directions, ["壬", "戊"]);
  assert.ok(climate.candidates.every((item) => !("order" in item)));
  assert.match(climate.conclusion, /不能排成固定先后|不把“出现”写成用神有效/u);
});

test("decadal and yearly layers re-adjudicate registered routes while freezing natal state", () => {
  const calculation = calculate("bazi", {
    ...BASE,
    chart_sex: "male",
    target_date: "2026-08-24",
  });
  const result = adjudicateBazi(calculation);
  const rerun = result.phase.re_adjudication;
  assert.equal(rerun.natal.pattern_state, result.lenses.pattern.hypothesis.state);
  assert.equal(rerun.decadal.status, "re_adjudicated");
  assert.equal(rerun.yearly.status, "re_adjudicated");
  assert.deepEqual(rerun.decadal.transition.opened_damage_routes, ["D-WEALTH-ROBBERY"]);
  assert.equal(result.safeguards.natal_rewritten_by_period, false);
  assert.equal(result.safeguards.named_event_prediction_used, false);
});

test("decadal environment is invariant to yearly interactions and uses layer-specific labels", () => {
  const readings = ["2025-08-24", "2026-08-24", "2027-08-24"].map((target_date) => (
    adjudicateBazi(calculate("bazi", { ...BASE, chart_sex: "male", target_date }))
  ));
  const signatures = readings.map((reading) => reading.phase.decadal.interactions.map((item) => ({
    relationship: item.relationship,
    layer_fact_ids: item.layer_fact_ids,
    label: item.label,
  })));
  assert.deepEqual(signatures[1], signatures[0]);
  assert.deepEqual(signatures[2], signatures[0]);
  for (const interaction of readings.flatMap((reading) => reading.phase.decadal.interactions)) {
    assert.ok(interaction.layer_fact_ids.every((factId) => factId !== "F-BZ-Y01"));
    assert.doesNotMatch(interaction.label, /运年|流年/u);
  }
});
