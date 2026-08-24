import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { calculate, validateReading } from "../src/index.mjs";

const projectRoot = new URL("..", import.meta.url);

function makePayload() {
  const calculation = calculate("iching", {
    question: "我是否应该接受新的工作机会？",
    lines: [7, 7, 7, 7, 7, 7],
  });
  const commonClaim = {
    epistemic_status: "interpretation",
    system: "iching",
    profile: calculation.profile.id,
    scope: "structural_comparison",
    rule_ids: ["R-YJ-003"],
    calculation_certainty: "high",
    input_sensitivity: { label: "stable", coverage: null },
    school_stability: "not_assessed",
    source_status: "verified",
    source_ids: ["SRC-YJ-ZHOUYI-WIKISOURCE"],
  };
  return {
    calculation,
    reading: {
      system: "iching",
      level: "standard",
      title: "关于新工作机会的解读",
      user_focus: "是否接受新的工作机会",
      disclaimer: "传统术数只作反思参考，不替代现实调查与个人判断。",
      summary: "眼前的关键不是机会有没有，而是条件是否足够清楚。",
      claims: [
        {
          ...commonClaim,
          claim_id: "C-current",
          topic: "current_situation",
          statement: "眼前的关键不是机会有没有，而是条件是否足够清楚。",
          fact_ids: ["F-YJ-H01", "F-YJ-H02"],
          practical_reflection: "列出必须确认的三项工作条件，并向对方逐项核实。",
        },
        {
          ...commonClaim,
          claim_id: "C-decision",
          topic: "decision",
          statement: "把可逆的小步骤放在正式承诺之前，会更容易看清取舍。",
          fact_ids: ["F-YJ-H01", "F-YJ-H02"],
          practical_reflection: "先争取一次具体沟通或短期体验，再作最终选择。",
        },
      ],
      uncertainty_summary: "这次解读只能帮助整理当前矛盾，不能替你确认合同细节或保证结果。",
      next_steps: [
        {
          id: "deepen-current",
          label: "继续看当前局面的阻力",
          action: "deepen",
          available: true,
          requires_input: [],
          reuses_frozen_calculation: true,
        },
        {
          id: "technical-audit",
          label: "查看高级审计",
          action: "audit",
          available: false,
          requires_input: [],
          reuses_frozen_calculation: true,
          reason: "普通结果页不展示技术记录",
        },
      ],
    },
  };
}

function render(payload, extraArgs = []) {
  return spawnSync(process.execPath, [
    "scripts/fortune-teller.mjs", "render-reading", "--input", "-", ...extraArgs,
  ], {
    cwd: projectRoot,
    input: JSON.stringify(payload),
    encoding: "utf8",
  });
}

test("result-first renderer groups conclusions by topic and hides audit internals", () => {
  const payload = makePayload();
  assert.equal(validateReading(payload).valid, true);

  const result = render(payload);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /^关于新工作机会的解读/m);
  assert.match(result.stdout, /你关心的是：是否接受新的工作机会/);
  assert.match(result.stdout, /先说结论\n眼前的关键不是机会有没有/);
  assert.equal((result.stdout.match(/眼前的关键不是机会有没有/g) || []).length, 1);
  assert.match(result.stdout, /当前局面\n- 可尝试：列出必须确认的三项工作条件/);
  assert.match(result.stdout, /决策重点\n- 把可逆的小步骤放在正式承诺之前/);
  assert.match(result.stdout, /可尝试：列出必须确认的三项工作条件/);
  assert.match(result.stdout, /需要留意\n这次解读只能帮助整理当前矛盾/);
  assert.match(result.stdout, /接下来可以看\n1\. 继续看当前局面的阻力/);
  assert.doesNotMatch(result.stdout, /查看高级审计/);

  const hiddenValues = [
    payload.calculation.profile.id,
    payload.calculation.engine_version,
    payload.calculation.schema_version,
    payload.calculation.facts_hash,
    payload.calculation.reproducibility_hash,
    payload.calculation.warnings[0],
    "F-YJ-H01",
    "C-current",
  ];
  for (const value of hiddenValues) assert.ok(!result.stdout.includes(value), `leaked internal value: ${value}`);
  assert.doesNotMatch(result.stdout, /\b(?:profile|warning|sensitivity|facts?_hash|reproducibility_hash|engine_version|schema_version)\b/iu);
});

test("render-reading validates first and emits no partial reading on failure", () => {
  const payload = makePayload();
  payload.reading.claims[0].topic = "technical_audit";

  const result = render(payload);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  const error = JSON.parse(result.stderr).error;
  assert.equal(error.code, "READING_VALIDATION_FAILED");
  assert.ok(error.details.error_count >= 1);
  assert.ok(!result.stderr.includes(payload.reading.summary));
});

test("render-reading rejects an unbound headline conclusion and emits none of it", () => {
  const payload = makePayload();
  payload.reading.summary = "这句结论没有绑定到第一条已验证主张。";

  const validation = validateReading(payload);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /summary must equal the first claim statement/);

  const result = render(payload);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.ok(!result.stderr.includes(payload.reading.summary));
});

test("render-reading rejects exact warning details before emitting any ordinary result", () => {
  const payload = makePayload();
  const warning = payload.calculation.warnings[0];
  assert.equal(typeof warning, "string");
  payload.reading.summary = warning;
  payload.reading.claims[0].statement = warning;

  const validation = validateReading(payload);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /calculation warning detail/);

  const result = render(payload);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.ok(!result.stderr.includes(warning));
});

test("focus changes reuse the frozen calculation while new readings start clean, and both render as choices", () => {
  const payload = makePayload();
  payload.reading.next_steps = [
    {
      id: "change-focus",
      label: "沿用这份计算，换一个关注重点",
      action: "change_focus",
      available: true,
      requires_input: ["user_focus"],
      reuses_frozen_calculation: true,
    },
    {
      id: "new-reading",
      label: "重新开始一份独立解读",
      action: "new_reading",
      available: true,
      requires_input: ["system", "question"],
      reuses_frozen_calculation: false,
    },
  ];

  const validation = validateReading(payload);
  assert.equal(validation.valid, true, validation.errors.join("\n"));

  const result = render(payload);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /1\. 沿用这份计算，换一个关注重点/);
  assert.match(result.stdout, /2\. 重新开始一份独立解读/);
});

test("result renderer preserves ordinary profile, sensitivity, review, candidate, and version language", () => {
  const payload = makePayload();
  payload.reading.user_focus = `I am comparing 3 candidates and package ${payload.calculation.engine_version}.`;
  payload.reading.summary = "A meta-analysis can inform a library-based review of price sensitivity.";
  payload.reading.claims[0].statement = payload.reading.summary;

  const validation = validateReading(payload);
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  const result = render(payload);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes(`3 candidates and package ${payload.calculation.engine_version}`));
  assert.match(result.stdout, /meta-analysis can inform a library-based review of price sensitivity/);
});

test("render-reading fails closed when next-step reuse semantics contradict the action", () => {
  const cases = [
    {
      action: "change_focus",
      reuses_frozen_calculation: false,
      expected: /action=change_focus must reuse the frozen calculation/,
    },
    {
      action: "new_reading",
      reuses_frozen_calculation: true,
      expected: /action=new_reading must not reuse the frozen calculation/,
    },
  ];

  for (const scenario of cases) {
    const payload = makePayload();
    payload.reading.next_steps = [{
      id: "contradictory-action",
      label: "不应显示的矛盾操作",
      action: scenario.action,
      available: true,
      requires_input: [],
      reuses_frozen_calculation: scenario.reuses_frozen_calculation,
    }];

    const validation = validateReading(payload);
    assert.equal(validation.valid, false);
    assert.match(validation.errors.join("\n"), scenario.expected);

    const result = render(payload);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(JSON.parse(result.stderr).error.code, "READING_VALIDATION_FAILED");
  }
});

test("render-reading creates a new text file and refuses to overwrite it", () => {
  const directory = mkdtempSync(join(tmpdir(), "fortune-teller-render-"));
  const output = join(directory, "reading.txt");
  try {
    const first = render(makePayload(), ["--output", output]);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(first.stdout, "");
    const original = readFileSync(output, "utf8");
    assert.match(original, /先说结论/);

    const second = render(makePayload(), ["--output", output]);
    assert.equal(second.status, 1);
    assert.equal(JSON.parse(second.stderr).error.code, "OUTPUT_EXISTS");
    assert.equal(readFileSync(output, "utf8"), original);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
