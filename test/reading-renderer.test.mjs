import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  bindReadingToCalculations,
  calculate,
  INTERPRETATION_PROFILES,
  validateReading,
} from "../src/index.mjs";
import { canonicalTechnicalSummary } from "../src/core/claim-semantics.mjs";

const projectRoot = new URL("..", import.meta.url);

function makePayload() {
  const calculation = calculate("iching", {
    question: "我是否应该接受新的工作机会？",
    lines: [7, 7, 7, 7, 7, 7],
  });
  const interpretationProfile = INTERPRETATION_PROFILES.find(
    (profile) => profile.id === "iching-structural-reflective-v1",
  );
  assert.ok(interpretationProfile);
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
    interpretation_profile_id: interpretationProfile.id,
    rule_pack_hash: interpretationProfile.rule_pack_hash,
  };
  return bindReadingToCalculations({
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
          assessment: {
            mode: "current_reflection",
            domain: "current_situation",
            window: { kind: "current" },
            criteria: [
              {
                criterion_id: "K-current-support",
                polarity: "supports",
                observable: "合同、职责与试用安排中至少三项能够得到书面确认",
                evidence_source: "contemporaneous_record",
              },
              {
                criterion_id: "K-current-contradict",
                polarity: "contradicts",
                observable: "关键条件持续含糊且两次具体沟通后仍没有书面说明",
                evidence_source: "contemporaneous_record",
              },
            ],
          },
          practical_reflection: "列出必须确认的三项工作条件，并向对方逐项核实。",
        },
        {
          ...commonClaim,
          claim_id: "C-decision",
          topic: "decision",
          statement: "把可逆的小步骤放在正式承诺之前，会更容易看清取舍。",
          fact_ids: ["F-YJ-H01", "F-YJ-H02"],
          assessment: {
            mode: "current_reflection",
            domain: "decision",
            window: { kind: "current" },
            criteria: [
              {
                criterion_id: "K-decision-support",
                polarity: "supports",
                observable: "在正式承诺前能够完成一次可退出的小范围沟通或体验",
                evidence_source: "self_report",
              },
              {
                criterion_id: "K-decision-contradict",
                polarity: "contradicts",
                observable: "对方只接受立即承诺并且不给核实条件或退出的安排",
                evidence_source: "self_report",
              },
            ],
          },
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
  });
}

function makeCanonicalZiweiPhasePayload() {
  const calculation = calculate("ziwei", {
    date: "2000-08-16",
    time: "04:00",
    timezone: "Asia/Shanghai",
    chart_sex: "female",
    target_date: "2026-08-23",
  });
  const interpretationProfile = INTERPRETATION_PROFILES.find(
    (profile) => profile.id === "ziwei-sanhe-bounded-v1",
  );
  assert.ok(interpretationProfile);
  const unit = calculation.facts.phase_topic_units.find(
    (item) => item.topic === "career_study",
  );
  assert.ok(unit);
  const natalUnit = calculation.facts.topic_units.find(
    (item) => item.fact_id === unit.natal_topic_unit_id,
  );
  assert.ok(natalUnit);
  const factIds = [...new Set([
    unit.fact_id,
    unit.natal_topic_unit_id,
    unit.natal_palace_id,
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
  ])];
  const validity = calculation.facts.periods.phase_validity;
  const draft = "准备生成机器绑定的紫微阶段结果。";
  return bindReadingToCalculations({
    calculation,
    reading: {
      system: "ziwei",
      level: "deep",
      title: "紫微阶段解读",
      user_focus: "事业与学习",
      disclaimer: "传统文化反思，不是现实预测。",
      summary: draft,
      uncertainty_summary: "排盘与传统解释需分开看。",
      claims: [{
        claim_id: "C-render-ziwei-phase",
        topic: "career_study",
        statement: draft,
        epistemic_status: "interpretation",
        system: "ziwei",
        profile: calculation.profile.id,
        scope: "phase_topic_synthesis",
        fact_ids: factIds,
        rule_ids: ["R-ZW-009"],
        topic_unit_id: unit.fact_id,
        evidence_bindings: factIds.map((ref, index) => ({
          ref,
          role: index === 1 ? "constraint" : "support",
        })),
        calculation_certainty: "high",
        input_sensitivity: { label: "stable", coverage: null },
        school_stability: "profile_specific",
        source_status: "verified",
        source_ids: [
          "SRC-ZW-IZTRO-2.6.0",
          "SRC-ZW-IZTRO-PALACE-GUIDE",
          "SRC-ZW-IZTRO-HOROSCOPE-GUIDE",
        ],
        interpretation_profile_id: interpretationProfile.id,
        rule_pack_hash: interpretationProfile.rule_pack_hash,
        assessment: {
          mode: "bounded_phase",
          domain: "career_study",
          window: { kind: "bounded", start: validity.valid_from, end: validity.valid_to },
          criteria: [
            {
              criterion_id: "K-render-support",
              polarity: "supports",
              observable: "两份同期记录显示相同主题反复出现。",
              evidence_source: "contemporaneous_record",
            },
            {
              criterion_id: "K-render-contradict",
              polarity: "contradicts",
              observable: "两份同期记录显示另一个现实机制更明确。",
              evidence_source: "contemporaneous_record",
            },
          ],
        },
      }],
      next_steps: [{
        id: "close-rendered-phase",
        label: "结束本次解读",
        action: "close",
        available: true,
        requires_input: [],
        reuses_frozen_calculation: true,
      }],
    },
  });
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
  assert.match(result.stdout, /^易经｜解读结果/m);
  assert.match(result.stdout, /这次重点看：当前情况、当前选择/);
  assert.match(result.stdout, /先说结论\n眼前的关键不是机会有没有/);
  assert.equal((result.stdout.match(/眼前的关键不是机会有没有/g) || []).length, 1);
  assert.match(result.stdout, /当前局面\n现实提醒：列出必须确认的三项工作条件/);
  assert.match(result.stdout, /决策重点\n结论：把可逆的小步骤放在正式承诺之前/);
  assert.match(result.stdout, /现实提醒：先争取一次具体沟通或短期体验/);
  assert.doesNotMatch(result.stdout, /怎么判断这条解读是否贴合/);
  assert.doesNotMatch(result.stdout, /合同、职责与试用安排中至少三项能够得到书面确认/);
  assert.match(result.stdout, /需要留意\n排盘可以复算，传统含义仍不能确认具体事件或保证现实结果/);
  assert.match(result.stdout, /接下来可以看\n1\. 继续深入当前主题/);
  assert.doesNotMatch(result.stdout, /查看高级审计/);

  const orderedSections = [
    "易经｜解读结果",
    "这次重点看：当前情况、当前选择",
    "先说结论",
    "当前局面",
    "决策重点",
    "需要留意",
    "接下来可以看",
    "以下内容属于传统文化反思",
  ];
  let previousIndex = -1;
  for (const section of orderedSections) {
    const index = result.stdout.indexOf(section);
    assert.ok(index > previousIndex, `${section} must appear in the canonical result-first order`);
    previousIndex = index;
  }

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

test("audit rendering retains the full frozen assessment criteria", () => {
  const payload = makePayload();
  payload.reading.level = "audit";
  payload.reading.title = "易经｜核对报告";
  for (const claim of payload.reading.claims) {
    claim.reasoning_summary = "这份核对报告保留冻结的支持与反对标准。";
    claim.alternative_readings = ["若反对标准成立，当前解释必须改判。"];
    claim.evidence_bindings[1].role = "constraint";
  }
  const validation = validateReading(payload);
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  const result = render(payload);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /怎么判断这条解读是否贴合/);
  assert.match(result.stdout, /当前局面｜比较贴合时：合同、职责与试用安排中至少三项能够得到书面确认/);
  assert.match(result.stdout, /决策重点｜需要改判时：对方只接受立即承诺并且不给核实条件或退出的安排/);
});

test("renderer turns dense result prose, technical clauses, and alternatives into ordered bullets", () => {
  const initial = makePayload();
  const { calculation } = initial;
  const claim = initial.reading.claims[0];
  const lineFacts = calculation.facts.lines.slice(0, 3);
  claim.epistemic_status = "traditional_rule";
  claim.scope = "line_order";
  claim.fact_ids = lineFacts.map((line) => line.fact_id);
  claim.rule_ids = ["R-YJ-001"];
  claim.semantic_bindings = lineFacts.map((line) => ({
    kind: "iching_line",
    fact_id: line.fact_id,
    position_from_bottom: line.position_from_bottom,
    line_value: line.value,
    line_type: line.type,
  }));
  claim.technical_summary = canonicalTechnicalSummary(
    calculation,
    claim.semantic_bindings,
    claim.fact_ids,
  );
  claim.statement = "先确认现实条件。再比较可逆步骤。最后才决定是否承诺。";
  claim.reasoning_summary = "第一层核对条件。第二层核对行动。第三层保留改判空间。";
  claim.alternative_readings = ["若条件没有书面确认，应降低判断。", "若出现更明确机制，应改用现实机制解释。"];
  initial.reading.claims = [claim];
  initial.reading.summary = claim.statement;
  const payload = bindReadingToCalculations(initial);
  const validation = validateReading(payload);
  assert.equal(validation.valid, true, validation.errors.join("\n"));

  const result = render(payload);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /先说结论\n- 先确认现实条件。\n- 再比较可逆步骤。\n- 最后才决定是否承诺。/u);
  assert.match(result.stdout, /白话解读：\n- 第一层核对条件。\n- 第二层核对行动。\n- 第三层保留改判空间。/u);
  assert.match(result.stdout, /盘面依据（术语）：\n- 自下而上第1爻/u);
  assert.match(result.stdout, /\n- 自下而上第2爻/u);
  assert.match(result.stdout, /\n- 自下而上第3爻/u);
  assert.match(result.stdout, /什么情况要改判：\n- 若条件没有书面确认，应降低判断。\n- 若出现更明确机制，应改用现实机制解释。/u);
});

test("canonical R-ZW-009 rendering keeps technical names out of plain explanation without losing the three-layer logic", () => {
  const payload = makeCanonicalZiweiPhasePayload();
  const validation = validateReading(payload);
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  const claim = payload.reading.claims[0];
  const result = render(payload);
  assert.equal(result.status, 0, result.stderr);

  const plainHeading = "白话解读：\n";
  const technicalHeading = "盘面依据（术语）：\n";
  const plainStart = result.stdout.indexOf(plainHeading);
  const technicalStart = result.stdout.indexOf(technicalHeading);
  const alternativeStart = result.stdout.indexOf("什么情况要改判：\n", technicalStart);
  assert.ok(plainStart >= 0 && technicalStart > plainStart && alternativeStart > technicalStart);
  const plain = result.stdout.slice(plainStart + plainHeading.length, technicalStart);
  const technical = result.stdout.slice(technicalStart + technicalHeading.length, alternativeStart);

  const majorBindings = claim.semantic_bindings.filter(
    (binding) => binding.kind === "star_in_palace" && binding.star_group === "major",
  );
  const namedBindings = claim.semantic_bindings.filter(
    (binding) => ["star_in_palace", "period_star_in_slot"].includes(binding.kind),
  );
  const transformationBindings = claim.semantic_bindings.filter(
    (binding) => binding.kind === "period_transformation",
  );
  assert.ok(majorBindings.length > 0 && transformationBindings.length > 0);

  for (const binding of namedBindings) {
    assert.doesNotMatch(plain, new RegExp(binding.star, "u"));
    const palace = binding.palace || binding.period_palace || binding.natal_palace;
    if (palace) assert.doesNotMatch(plain, new RegExp(palace, "u"));
    assert.match(technical, new RegExp(binding.star, "u"));
    if (palace) assert.match(technical, new RegExp(palace, "u"));
  }
  assert.doesNotMatch(plain, /化[禄权科忌]/u);
  for (const binding of transformationBindings) {
    assert.match(technical, new RegExp(`${binding.star}化${binding.transformation}`, "u"));
    assert.match(technical, new RegExp(binding.natal_palace, "u"));
  }
  for (const binding of majorBindings) {
    assert.equal(typeof binding.brightness, "string");
    assert.match(technical, new RegExp(`亮度${binding.brightness}`, "u"));
  }

  const natalIndex = plain.indexOf("长期形成的做事底色");
  const longTermIndex = plain.indexOf("当前一段较长时期的环境");
  const targetYearIndex = plain.indexOf("目标年份带来的触发");
  assert.ok(
    natalIndex >= 0 && natalIndex < longTermIndex && longTermIndex < targetYearIndex,
    "plain explanation must preserve natal baseline → long-term environment → target-year trigger order",
  );
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

  const rebound = bindReadingToCalculations(payload);
  const validation = validateReading(rebound);
  assert.equal(validation.valid, true, validation.errors.join("\n"));

  const result = render(rebound);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /1\. 查看同一排盘的另一个主题/);
  assert.match(result.stdout, /2\. 开始一次新解读/);
});

test("result renderer preserves ordinary profile and version language inside a bound conclusion", () => {
  const payload = makePayload();
  payload.reading.user_focus = "This arbitrary draft focus must be canonicalized.";
  payload.reading.summary = "A profile comparison can inform a versioned library review of price sensitivity for several candidates.";
  payload.reading.claims[0].statement = payload.reading.summary;
  const rebound = bindReadingToCalculations(payload);
  assert.equal(rebound.reading.user_focus, "当前情况、当前选择");

  const validation = validateReading(rebound);
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  const result = render(rebound);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /profile comparison can inform a versioned library review of price sensitivity for several candidates/u);
  assert.doesNotMatch(result.stdout, /arbitrary draft focus/u);
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
