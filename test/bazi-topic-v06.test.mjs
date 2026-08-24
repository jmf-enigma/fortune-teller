import test from "node:test";
import assert from "node:assert/strict";
import { calculate } from "../src/index.mjs";
import { adjudicate } from "../src/core/adjudicate.mjs";
import { adjudicateBazi } from "../src/core/bazi-adjudicator.mjs";
import { adjudicateBaziTopic } from "../src/core/bazi-topic-adjudicator.mjs";

const BASE = {
  date: "2000-08-16",
  time: "04:00",
  timezone: "Asia/Shanghai",
};

test("BaZi career topic keeps located foreground and background facts separate", () => {
  const result = adjudicateBaziTopic(calculate("bazi", BASE), "career_study");
  assert.equal(result.status, "completed_with_boundaries");
  assert.equal(result.axes.find((axis) => axis.axis_id === "career_learning_support").status, "foreground");
  assert.equal(result.axes.find((axis) => axis.axis_id === "career_responsibility").status, "background_candidate");
  assert.equal(result.routes.find((route) => route.route_id === "career_responsibility_with_support").status, "background_co_presence_candidate");
  assert.match(result.plain_language, /只是两轴同见/u);
  assert.match(result.plain_language, /前台证据|背景层/u);
  assert.equal(result.safeguards.score_used, false);
});

test("BaZi wealth topic reports co-presence without turning it into a causal chain or money", () => {
  const result = adjudicateBaziTopic(calculate("bazi", BASE), "wealth_resources");
  assert.equal(result.routes.find((route) => route.route_id === "wealth_output_to_resource").status, "background_co_presence_candidate");
  assert.equal(result.axes.find((axis) => axis.axis_id === "wealth_resource").status, "foreground");
  assert.match(result.boundary, /不据此预测收入金额/u);
  assert.doesNotMatch(result.conclusion, /大富|贫穷|发财|破财/u);
});

test("BaZi relationship topic anchors the day branch and never guesses spouse context", () => {
  const withoutParameter = adjudicateBaziTopic(calculate("bazi", BASE), "relationships");
  assert.equal(withoutParameter.day_branch.earthly_branch, "午");
  assert.equal(withoutParameter.spouse_star_context.status, "disabled_without_explicit_parameter");
  assert.deepEqual(withoutParameter.spouse_star_context.evidence, []);
  assert.match(withoutParameter.plain_language, /不启用配偶星分支/u);

  const withParameter = adjudicateBaziTopic(calculate("bazi", { ...BASE, chart_sex: "male" }), "relationships");
  assert.equal(withParameter.spouse_star_context.status, "enabled_from_explicit_parameter");
  assert.ok(withParameter.spouse_star_context.evidence.every((item) => ["正财", "偏财"].includes(item.ten_god)));
  assert.match(withParameter.boundary, /不据此判断忠诚/u);
});

test("BaZi topic phase can emphasize an axis already present in the natal chart but cannot name an event", () => {
  const calculation = calculate("bazi", {
    ...BASE,
    chart_sex: "male",
    target_date: "2026-08-24",
  });
  const result = adjudicateBaziTopic(calculation, "wealth_resources");
  assert.equal(result.phase_activation.status, "natal_topic_axis_emphasized");
  assert.match(result.phase_activation.plain_zh, /不据此命名事件/u);
  assert.equal(result.safeguards.phase_created_event, false);
});

test("a phase-only Ten God cannot activate a natal topic axis that is absent", () => {
  const calculation = calculate("bazi", {
    date: "1993-06-08",
    time: "12:00",
    timezone: "Asia/Shanghai",
    chart_sex: "male",
    target_date: "2026-08-24",
  });
  const result = adjudicateBaziTopic(calculation, "wealth_resources");
  assert.equal(result.axes.find((axis) => axis.axis_id === "wealth_resource").status, "not_observed");
  assert.equal(result.phase_activation.status, "phase_topic_present_but_natal_axis_absent");
  assert.match(result.phase_activation.plain_zh, /不称原局主题被激活/u);
});

test("a mixed phase separates natal-axis emphasis from phase-only Ten Gods", () => {
  const result = adjudicateBaziTopic(calculate("bazi", {
    date: "1992-04-15",
    time: "00:00",
    timezone: "Asia/Shanghai",
    chart_sex: "male",
    target_date: "2026-08-24",
  }), "career_study");
  const mixed = result.phase_activation.layers.find((item) => item.status === "mixed_natal_emphasis_and_phase_only");
  assert.ok(mixed);
  assert.ok(mixed.emphasized_gods.includes("偏印"));
  assert.ok(mixed.phase_only_gods.includes("七杀"));
  assert.match(result.phase_activation.plain_zh, /原局已有的偏印/u);
  assert.match(result.phase_activation.plain_zh, /另见七杀，但原局未见对应轴/u);
  assert.doesNotMatch(result.phase_activation.plain_zh, /原局已有的[^。；]*七杀/u);
});

test("relationship phase prioritizes replayed decadal/yearly relations to the day branch", () => {
  const calculation = calculate("bazi", {
    date: "1980-05-15",
    time: "12:00",
    timezone: "Asia/Shanghai",
    chart_sex: "female",
    target_date: "2026-08-24",
  });
  const result = adjudicateBaziTopic(calculation, "relationships");
  assert.equal(result.phase_activation.status, "relationship_branch_context_emphasized");
  assert.deepEqual(
    result.phase_activation.branch_context.map((item) => [item.layer, item.relationship]),
    [["decadal", "branch_repetition"], ["yearly", "branch_clash"]],
  );
  assert.match(result.phase_activation.plain_zh, /大运环境.*(?:重复|同支).*流年触发.*相冲/u);
});

test("relationship natal relations are grouped and incomplete punishment stays a component candidate", () => {
  const result = adjudicateBaziTopic(calculate("bazi", {
    date: "2003-07-15",
    time: "00:00",
    timezone: "Asia/Shanghai",
  }), "relationships");
  const clashes = result.branch_interactions.filter((item) => item.relationship === "branch_clash");
  const punishments = result.branch_interactions.filter((item) => item.relationship === "branch_punishment");
  assert.equal(clashes.length, 1);
  assert.equal(clashes[0].fact_ids.length, 2);
  assert.equal(punishments.length, 1);
  assert.equal(punishments[0].label_zh, "三刑组成支候选");
  assert.equal(punishments[0].fact_ids.length, 2);
  assert.doesNotMatch(result.conclusion, /相刑/u);
  assert.match(result.plain_language, /年支、月支/u);
});

test("topic helper rejects mutated facts and fails closed for unknown time", () => {
  const calculation = calculate("bazi", BASE);
  const mutated = structuredClone(calculation);
  mutated.facts.pillars[0].ten_god_stem = "七杀";
  assert.throws(
    () => adjudicateBaziTopic(mutated, "career_study"),
    (error) => error.code === "BAZI_TOPIC_FACTS_UNVERIFIED",
  );

  const unknown = adjudicateBaziTopic(calculate("bazi", {
    date: BASE.date,
    timezone: BASE.timezone,
  }), "relationships");
  assert.equal(unknown.status, "unavailable");
  assert.match(unknown.plain_language, /不会从候选时柱中挑一张/u);
});

test("negative topic observations bind every inspected pillar and phase fact", () => {
  const calculation = calculate("bazi", {
    date: "1993-06-08",
    time: "12:00",
    timezone: "Asia/Shanghai",
    chart_sex: "male",
    target_date: "2026-08-24",
  });
  const result = adjudicate(calculation, { topic: "wealth_resources" });
  for (const pillar of calculation.facts.pillars) assert.ok(result.basis.includes(pillar.fact_id));
  for (const factId of result.lenses.topic.phase_activation.inspected_fact_ids) assert.ok(result.basis.includes(factId));
});

test("unsupported BaZi topic has no invented fallback", () => {
  assert.equal(adjudicateBaziTopic(calculate("bazi", BASE), "wellbeing_rhythm"), null);
  assert.equal(adjudicateBaziTopic(calculate("bazi", BASE), "__proto__"), null);
  assert.equal(adjudicateBaziTopic(calculate("bazi", BASE), "constructor"), null);
  const result = adjudicateBazi(calculate("bazi", BASE), { topic: "wellbeing_rhythm" });
  assert.equal(result.status, "unavailable");
  assert.match(result.plain_language, /不借相邻十神拼答案/u);
  assert.equal(adjudicateBazi(calculate("bazi", BASE), { topic: "" }).status, "unavailable");
  assert.equal(adjudicateBazi(calculate("bazi", BASE), { topic: false }).status, "unavailable");
});

test("public BaZi adjudicator leads with the selected topic and keeps overview backstage", () => {
  const calculation = calculate("bazi", {
    ...BASE,
    chart_sex: "male",
    target_date: "2026-08-24",
  });
  const result = adjudicate(calculation, { topic: "relationships" });
  assert.equal(result.status, "completed");
  assert.equal(result.topic, "relationships");
  assert.match(result.conclusion, /长期关系先看日支/u);
  assert.equal(result.lenses.topic.topic, "relationships");
  assert.ok(result.natal_overview.conclusion);
  assert.equal(result.phase.topic_activation, result.lenses.topic.phase_activation);
  assert.ok(result.basis.every((item) => /^F-BZ-/u.test(item)));
  assert.equal(result.safeguards.named_event_prediction_used, false);
  assert.deepEqual(result, adjudicateBazi(calculation, { topic: "relationships" }));
});
