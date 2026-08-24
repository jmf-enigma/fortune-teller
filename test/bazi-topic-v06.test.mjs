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
  assert.match(result.conclusion, /通过学习、训练和方法积累能力/u);
  assert.match(result.plain_language, /虽然同时出现.*现实中能不能互相带动/u);
  assert.doesNotMatch(result.plain_language, /前台|背景层|先看|待核对线索/u);
  assert.equal(result.safeguards.score_used, false);
});

test("BaZi wealth topic reports co-presence without turning it into a causal chain or money", () => {
  const result = adjudicateBaziTopic(calculate("bazi", BASE), "wealth_resources");
  assert.equal(result.routes.find((route) => route.route_id === "wealth_output_to_resource").status, "background_co_presence_candidate");
  assert.equal(result.axes.find((axis) => axis.axis_id === "wealth_resource").status, "foreground");
  assert.match(result.conclusion, /取得和管理稳定资源/u);
  assert.match(result.plain_language, /虽然同时出现.*现实中能不能互相带动/u);
  assert.match(result.boundary, /不据此预测收入金额/u);
  assert.doesNotMatch(result.conclusion, /大富|贫穷|发财|破财/u);
});

test("BaZi relationship topic anchors the day branch and never guesses spouse context", () => {
  const withoutParameter = adjudicateBaziTopic(calculate("bazi", BASE), "relationships");
  assert.equal(withoutParameter.day_branch.earthly_branch, "午");
  assert.equal(withoutParameter.spouse_star_context.status, "disabled_without_explicit_parameter");
  assert.deepEqual(withoutParameter.spouse_star_context.evidence, []);
  assert.match(withoutParameter.plain_language, /没有启用按男命或女命区分的传统补充规则/u);

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
  assert.match(result.phase_activation.plain_zh, /不等于收入一定增加、投资一定获利或一定破财/u);
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
  assert.match(result.phase_activation.plain_zh, /出生盘里的同类线索不够，暂不把它算作稳定主线/u);
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
  assert.match(result.phase_activation.plain_zh, /通过学习、训练和方法积累能力/u);
  assert.match(result.phase_activation.plain_zh, /承担职责、适应规则和处理压力任务/u);
  assert.match(result.phase_activation.plain_zh, /出生盘里的同类线索不够，暂不把它算作稳定主线/u);
  assert.doesNotMatch(result.phase_activation.plain_zh, /偏印|七杀/u);
});

test("career and wealth put readable results first and keep prompts inside reality checks", () => {
  const calculation = calculate("bazi", {
    date: "2001-01-15",
    time: "13:35",
    timezone: "Asia/Shanghai",
    chart_sex: "male",
    target_date: "2026-08-24",
  });
  const career = adjudicateBaziTopic(calculation, "career_study");
  const wealth = adjudicateBaziTopic(calculation, "wealth_resources");

  assert.match(career.conclusion, /最明确的主线是：把想法做成作品、方案或可交付成果/u);
  assert.match(wealth.conclusion, /最明确的主线是：把成果变成收入来源或其他实际回报，同时把合作中的归属、分成和责任说清楚/u);
  assert.match(career.phase_activation.plain_zh, /当前较长阶段的重点是把想法做成作品、方案或可交付成果/u);
  assert.match(career.phase_activation.plain_zh, /2026年的重点是通过学习、训练和方法积累能力/u);
  assert.match(wealth.phase_activation.plain_zh, /当前较长阶段的重点是把成果变成收入来源或其他实际回报/u);
  assert.match(wealth.phase_activation.plain_zh, /2026年的重点是把合作中的归属、分成和责任说清楚/u);

  for (const result of [career, wealth]) {
    for (const text of [result.conclusion, result.plain_language, result.phase_activation.plain_zh]) {
      assert.doesNotMatch(text, /前台|背景层|先看|待核对线索/u);
      assert.doesNotMatch(text, /[？?]/u);
    }
    assert.ok(result.reality_checks.length > 0);
  }
  assert.doesNotMatch(career.phase_activation.plain_zh, /伤官|正官|偏印|正印/u);
  assert.doesNotMatch(wealth.phase_activation.plain_zh, /伤官|劫财|正财|偏财/u);
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
  assert.match(result.phase_activation.plain_zh, /当前较长阶段要留意的是同一种相处模式.*2026年要留意的是节奏、位置或安排上的直接拉扯/u);
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
  assert.match(result.conclusion, /连接、协商和靠近/u);
  assert.deepEqual(clashes[0].other_pillars, ["year", "month"]);
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
  assert.match(result.conclusion, /长期关系这部分，盘里没有强到足以判断明显顺利或明显困难的信号/u);
  assert.equal(result.lenses.topic.topic, "relationships");
  assert.ok(result.natal_overview.conclusion);
  assert.equal(result.phase.topic_activation, result.lenses.topic.phase_activation);
  assert.ok(result.basis.every((item) => /^F-BZ-/u.test(item)));
  assert.equal(result.safeguards.named_event_prediction_used, false);
  assert.deepEqual(result, adjudicateBazi(calculation, { topic: "relationships" }));
});
