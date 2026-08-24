import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { recommendMethods } from "../src/core/method-router.mjs";

function bySystem(route, system) {
  const option = route.options.find((item) => item.system === system);
  assert.ok(option, `missing route option for ${system}`);
  return option;
}

function missingField(option, field) {
  return option.missing_data.find((item) => item.field === field);
}

test("birth overview presents three parallel lenses without an accuracy winner", () => {
  const route = recommendMethods({
    goal: "birth_overview",
    available_data: {
      birth_date: true,
      birth_time: true,
      timezone: true,
      chart_sex: true,
      coordinates: true,
    },
  });

  assert.equal(route.goal, "life_overview");
  assert.equal(route.presentation, "parallel_options");
  assert.deepEqual(route.options.map((item) => item.system), ["bazi", "ziwei", "western"]);
  assert.ok(route.options.every((item) => item.fit === "parallel"));
  assert.ok(route.options.every((item) => item.readiness === "ready"));
  assert.match(route.comparison_boundary, /问题类型|资料/u);
  assert.doesNotMatch(route.options.map((item) => item.reason).join("\n"), /最准|更准|准确率|胜出|winner/iu);
});

test("unknown birth time keeps all birth methods usable but narrows their scope", () => {
  const route = recommendMethods({
    goal: "life_overview",
    available_data: {
      birth_date: true,
      birth_time: false,
      timezone: true,
      chart_sex: true,
      coordinates: false,
    },
  });

  for (const system of ["bazi", "ziwei", "western"]) {
    const option = bySystem(route, system);
    assert.equal(option.readiness, "ready_with_limits");
    assert.equal(missingField(option, "birth_time")?.impact, "limits_scope");
    assert.ok(!option.missing_data.some((item) => item.field === "birth_time" && item.impact === "blocks_method"));
  }
  assert.equal(missingField(bySystem(route, "western"), "coordinates")?.impact, "limits_scope");
  assert.equal(missingField(bySystem(route, "bazi"), "coordinates"), undefined);
  assert.equal(missingField(bySystem(route, "ziwei"), "coordinates"), undefined);
});

test("missing coordinates block a requested Western house domain but not the general natal subset", () => {
  const route = recommendMethods({
    goal: "life_domain",
    domain: "career_study",
    available_data: {
      birth_date: true,
      birth_time: true,
      timezone: true,
      chart_sex: true,
      coordinates: false,
    },
    preferences: { wants_western_houses: true },
  });
  const western = bySystem(route, "western");

  assert.equal(western.readiness, "needs_data");
  assert.equal(missingField(western, "coordinates")?.impact, "blocks_requested_scope");
  assert.match(missingField(western, "coordinates").why, /主题宫/u);
  assert.match(western.limits.join("\n"), /上升点、中天和宫位/u);
});

test("life-domain routing requires an exact domain and exposes unsupported method scopes", () => {
  assert.throws(
    () => recommendMethods({ goal: "life_domain", available_data: {} }),
    /domain is required/u,
  );
  const route = recommendMethods({
    goal: "life_domain",
    domain: "family_social",
    available_data: {
      birth_date: true,
      birth_time: true,
      timezone: true,
      chart_sex: true,
      coordinates: true,
    },
  });
  assert.equal(route.domain, "family_social");
  assert.equal(bySystem(route, "western").readiness, "ready");
  assert.equal(bySystem(route, "ziwei").readiness, "unavailable");
  assert.equal(bySystem(route, "bazi").readiness, "unavailable");
  assert.match(bySystem(route, "ziwei").reason, /多宫|田宅/u);
  assert.match(bySystem(route, "bazi").reason, /不把十神直接泛化/u);
});

test("birth calculations report blocking data separately from optional depth data", () => {
  const route = recommendMethods({
    goal: "life_overview",
    available_data: {},
    preferences: { wants_period_timing: true },
  });
  const bazi = bySystem(route, "bazi");
  const ziwei = bySystem(route, "ziwei");

  assert.equal(missingField(bazi, "birth_date")?.impact, "blocks_method");
  assert.equal(missingField(bazi, "timezone")?.impact, "blocks_method");
  assert.equal(missingField(bazi, "birth_time")?.impact, "limits_scope");
  assert.equal(missingField(bazi, "chart_sex")?.impact, "limits_scope");
  assert.equal(missingField(ziwei, "chart_sex")?.impact, "blocks_method");
  assert.equal(bazi.readiness, "needs_data");
  assert.equal(ziwei.readiness, "needs_data");
});

test("current decision routes action decomposition before change-structure support", () => {
  const route = recommendMethods({
    goal: "current_decision",
    available_data: { focused_question: true },
  });
  const tarot = bySystem(route, "tarot");
  const iching = bySystem(route, "iching");

  assert.equal(route.question_kind, "decision_action");
  assert.equal(route.presentation, "focused_option");
  assert.equal(tarot.fit, "direct");
  assert.equal(tarot.readiness, "ready");
  assert.equal(iching.fit, "supporting");
  assert.equal(iching.readiness, "ready");
  assert.match(tarot.reason, /局面、行动/u);
  assert.match(iching.reason, /变化条件/u);
});

test("question-based routes identify a missing focused question without inventing one", () => {
  const route = recommendMethods({ goal: "current_question", question_kind: "decision_action" });

  for (const system of ["tarot", "iching"]) {
    const option = bySystem(route, system);
    assert.equal(option.readiness, "needs_data");
    assert.equal(missingField(option, "focused_question")?.impact, "blocks_method");
  }
});

test("declining local generation requires manual cards or lines", () => {
  const route = recommendMethods({
    goal: "current_question",
    question_kind: "open",
    available_data: { focused_question: true },
    preferences: { allow_local_generation: false },
  });

  assert.equal(missingField(bySystem(route, "tarot"), "tarot_cards")?.impact, "blocks_method");
  assert.equal(missingField(bySystem(route, "iching"), "iching_lines")?.impact, "blocks_method");
  assert.equal(bySystem(route, "tarot").readiness, "needs_data");
  assert.equal(bySystem(route, "iching").readiness, "needs_data");
});

test("change-structure route distinguishes I Ching, Meihua, and Tarot roles", () => {
  const route = recommendMethods({
    goal: "change_structure",
    available_data: { focused_question: true },
  });

  assert.deepEqual(route.options.map((item) => item.system), ["iching", "meihua", "tarot"]);
  assert.equal(bySystem(route, "iching").fit, "direct");
  assert.equal(bySystem(route, "iching").readiness, "ready");
  assert.equal(bySystem(route, "meihua").fit, "supporting");
  assert.equal(bySystem(route, "meihua").readiness, "needs_data");
  assert.equal(bySystem(route, "tarot").fit, "supporting");
});

test("two-number Meihua route asks only for the missing number", () => {
  const partial = recommendMethods({
    goal: "two_number_meihua",
    available_data: { first_number: true, second_number: false },
  });
  assert.deepEqual(partial.options.map((item) => item.system), ["meihua"]);
  assert.equal(missingField(partial.options[0], "first_number"), undefined);
  assert.equal(missingField(partial.options[0], "second_number")?.impact, "blocks_method");
  assert.equal(partial.options[0].readiness, "needs_data");

  const complete = recommendMethods({
    goal: "two_number_meihua",
    available_data: { first_number: true, second_number: true },
  });
  assert.equal(complete.options[0].readiness, "ready_with_limits");
  assert.match(complete.options[0].limits.join("\n"), /固定两数|不作应期保证/u);
});

test("router rejects ambiguous or non-boolean input instead of guessing", () => {
  assert.throws(
    () => recommendMethods({ goal: "current_decision", question_kind: "change_structure" }),
    (error) => error.code === "METHOD_ROUTER_INPUT_INVALID" && /different/u.test(error.message),
  );
  assert.throws(
    () => recommendMethods({ goal: "life_overview", available_data: { birth_time: "unknown" } }),
    (error) => error.code === "METHOD_ROUTER_INPUT_INVALID" && /boolean/u.test(error.message),
  );
  assert.throws(
    () => recommendMethods({ goal: "life_overview", preferred_winner: "bazi" }),
    (error) => error.code === "METHOD_ROUTER_INPUT_INVALID" && /unsupported/u.test(error.message),
  );
});

test("routing output is deterministic and immutable", () => {
  const request = {
    goal: "current_question",
    question_kind: "open",
    available_data: { focused_question: true },
  };
  const first = recommendMethods(request);
  const second = recommendMethods(structuredClone(request));
  assert.deepEqual(first, second);
  assert.throws(() => { first.options[0].reason = "changed"; }, TypeError);
  assert.throws(() => { first.options.push({ system: "qimen" }); }, TypeError);
});

test("CLI exposes the same question-and-data router without an accuracy winner", () => {
  const child = spawnSync(process.execPath, [
    "scripts/fortune-teller.mjs",
    "route",
    "--json",
    JSON.stringify({
      goal: "current_question",
      question_kind: "decision_action",
      available_data: { focused_question: true },
    }),
    "--compact",
  ], { cwd: new URL("..", import.meta.url), encoding: "utf8" });
  assert.equal(child.status, 0, child.stderr);
  const result = JSON.parse(child.stdout);
  assert.equal(result.options[0].system, "tarot");
  assert.match(result.comparison_boundary, /不把排序解释成任何方法天生更可靠/u);
  assert.equal(JSON.stringify(result).includes("accuracy_winner"), false);
});
