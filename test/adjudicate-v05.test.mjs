import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { adjudicate, calculate } from "../src/index.mjs";

const CASES = [
  ["bazi", { date: "2000-08-16", time: "04:00", timezone: "Asia/Shanghai" }],
  ["ziwei", { date: "2000-08-16", time: "04:00", timezone: "Asia/Shanghai", chart_sex: "male" }],
  ["western", { date: "2000-01-01", time: "12:00", timezone: "UTC" }],
  ["tarot", { question: "下一步先核对什么？", spread: "one", cards: ["The Fool"] }],
  ["iching", { question: "下一步先核对什么？", lines: [7, 7, 7, 7, 7, 7] }],
  ["meihua", { question: "下一步先核对什么？", first_number: 3, second_number: 8 }],
];

test("one public adjudicate entry returns readable bounded results for all six systems", () => {
  for (const [system, input] of CASES) {
    const result = adjudicate(calculate(system, input), { topic: "overview" });
    assert.equal(result.system || system, system);
    assert.ok(["completed", "qualified", "unavailable"].includes(result.status));
    assert.equal(typeof result.conclusion, "string");
    assert.ok(result.conclusion.length > 10);
    assert.equal(typeof result.plain_language, "string");
    assert.ok(result.plain_language.length > 10);
    assert.ok(Array.isArray(result.basis));
  }
});

test("public adjudicate entry refuses non-calculation objects", () => {
  assert.throws(
    () => adjudicate({ system: "liuyao" }),
    (error) => error.code === "ADJUDICATION_SYSTEM_UNSUPPORTED",
  );
});

test("generic CLI adjudicate accepts a calculation or a calculation/options wrapper", () => {
  const calculation = calculate("tarot", {
    question: "下一步先核对什么？", spread: "one", cards: ["The Fool"],
  });
  for (const payload of [calculation, { calculation, options: {} }]) {
    const child = spawnSync(process.execPath, [
      "scripts/fortune-teller.mjs", "adjudicate", "--json", JSON.stringify(payload), "--compact",
    ], { cwd: new URL("..", import.meta.url), encoding: "utf8" });
    assert.equal(child.status, 0, child.stderr);
    const output = JSON.parse(child.stdout);
    assert.equal(output.system, "tarot");
    assert.match(output.conclusion, /核心结论/u);
  }
});
