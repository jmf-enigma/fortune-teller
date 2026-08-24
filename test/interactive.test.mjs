import test from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import {
  bindReadingToCalculations,
  calculate,
  INTERPRETATION_PROFILES,
  validateReading,
} from "../src/index.mjs";

const projectRoot = new URL("..", import.meta.url);
const KILL = Symbol("kill");

function runInteractive(steps, { timeoutMs = 10_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/fortune-teller.mjs", "interactive"], {
      cwd: projectRoot,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let transcript = "";
    let stderr = "";
    let stepIndex = 0;
    let searchFrom = 0;
    let settled = false;

    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`interactive test timed out at step ${stepIndex}: ${steps[stepIndex]?.prompt}\n${transcript}\n${stderr}`));
    }, timeoutMs);

    function advance() {
      while (stepIndex < steps.length) {
        const step = steps[stepIndex];
        const found = transcript.indexOf(step.prompt, searchFrom);
        if (found === -1) return;
        searchFrom = found + step.prompt.length;
        stepIndex += 1;
        if (step.response === KILL) {
          child.kill();
          return;
        }
        child.stdin.write(step.response);
      }
    }

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      transcript += chunk;
      advance();
    });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    child.once("close", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({ code, signal, transcript, stderr, completedSteps: stepIndex });
    });
  });
}

function renderReading(payload) {
  return spawnSync(process.execPath, ["scripts/fortune-teller.mjs", "render-reading", "--input", "-"], {
    cwd: projectRoot,
    input: JSON.stringify(payload),
    encoding: "utf8",
  });
}

function makeBoundIChingReading() {
  const calculation = calculate("iching", { question: "fixture", lines: [7, 7, 7, 7, 7, 7] });
  const interpretationProfile = INTERPRETATION_PROFILES.find(
    (profile) => profile.id === "iching-structural-reflective-v1",
  );
  assert.ok(interpretationProfile);
  return bindReadingToCalculations({
    calculation,
    reading: {
      system: "iching",
      level: "standard",
      title: "普通解读",
      user_focus: "核对当前局面的可观察条件",
      disclaimer: "传统反思，不是经过验证的预测。",
      summary: "先核对现实条件是否清楚，再决定是否继续推进。",
      claims: [{
        claim_id: "C-01",
        topic: "current_situation",
        statement: "先核对现实条件是否清楚，再决定是否继续推进。",
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
        interpretation_profile_id: interpretationProfile.id,
        rule_pack_hash: interpretationProfile.rule_pack_hash,
        assessment: {
          mode: "current_reflection",
          domain: "current_situation",
          window: { kind: "current" },
          criteria: [
            {
              criterion_id: "K-fixture-support",
              polarity: "supports",
              observable: "待核对的职责、期限和退出条件均形成明确书面记录",
              evidence_source: "contemporaneous_record",
            },
            {
              criterion_id: "K-fixture-contradict",
              polarity: "contradicts",
              observable: "连续两次具体询问后核心职责和期限仍无法得到确认",
              evidence_source: "contemporaneous_record",
            },
          ],
        },
        practical_reflection: "把职责、期限和退出条件逐项写下并核对。",
      }],
      uncertainty_summary: "这份解读不能替代对现实条件的核实，也不保证后续结果。",
      next_steps: [],
    },
  });
}

test("Chinese BaZi guide validates fields, edits one field, and hides audit details", async () => {
  const result = await runInteractive([
    { prompt: "请选择想看的内容：", response: "4\n" },
    { prompt: "请选择具体方法：", response: "1\n" },
    { prompt: "出生日期（公历 YYYY-MM-DD", response: "2000-02-31\n" },
    { prompt: "出生日期（公历 YYYY-MM-DD", response: "2000-08-16\n" },
    { prompt: "出生时间（24 小时制", response: "04:00\n" },
    { prompt: "出生地时区", response: "Mars/Olympus\n" },
    { prompt: "出生地时区", response: "Asia/Shanghai\n" },
    { prompt: "按以上信息在本地计算？", response: "2\n" },
    { prompt: "要修改哪一项？\n  1. 出生日期\n  2. 出生时间\n  3. 出生地时区\n请选择：", response: "2\n" },
    { prompt: "出生时间（24 小时制", response: "05:00\n" },
    { prompt: "按以上信息在本地计算？", response: "1\n" },
    { prompt: "接下来：1 看盘面 / 牌面重点", response: "2\n" },
    { prompt: "为什么这样算：", response: "2\n" },
    { prompt: "技术记录会显示排盘口径", response: "1\n" },
    { prompt: "1 查看完整 JSON", response: "2\n" },
    { prompt: "为什么这样算：", response: "3\n" },
    { prompt: "接下来：1 看盘面 / 牌面重点", response: "1\n" },
    { prompt: "接下来：1 看盘面 / 牌面重点", response: "5\n" },
  ]);

  assert.equal(result.completedSteps, 18);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.match(result.transcript, /这个公历日期不存在/);
  assert.match(result.transcript, /时区名称无法识别/);
  assert.match(result.transcript, /时间：05:00/);
  assert.match(result.transcript, /四柱：年柱 \S+ ｜ 月柱 \S+ ｜ 日柱 \S+ ｜ 时柱 \S+/);
  assert.match(result.transcript, /—— 盘面 \/ 牌面重点 ——/);
  assert.doesNotMatch(result.transcript, /请输入纬度,经度/);
  assert.doesNotMatch(result.transcript, /可用 profile/);
  const technicalStart = result.transcript.indexOf("—— 技术记录 ——");
  assert.ok(technicalStart > 0);
  assert.doesNotMatch(result.transcript.slice(0, technicalStart), /计算口径 ID|事实核对码|完整记录核对码/);
  assert.match(result.transcript.slice(technicalStart), /事实核对码：/);
});

test("BaZi life-overview path collects luck inputs and presents adjudication before technical facts", async () => {
  const result = await runInteractive([
    { prompt: "请选择想看的内容：", response: "1\n" },
    { prompt: "请选择出生盘方式", response: "2\n" },
    { prompt: "出生日期（公历 YYYY-MM-DD", response: "2000-08-16\n" },
    { prompt: "出生时间（24 小时制", response: "04:00\n" },
    { prompt: "出生地时区", response: "Asia/Shanghai\n" },
    { prompt: "请选择排盘参数", response: "1\n" },
    { prompt: "想看哪个日期所处的阶段？", response: "2026-08-24\n" },
    { prompt: "按以上信息在本地计算？", response: "1\n" },
    { prompt: "接下来：1 看盘面 / 牌面重点", response: "5\n" },
  ]);

  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.match(result.transcript, /大运顺逆参数：男/u);
  assert.match(result.transcript, /先说结论：/u);
  assert.match(result.transcript, /当前阶段：/u);
  assert.match(result.transcript, /当前大运：丙戌/u);
  assert.match(result.transcript, /流年：丙午/u);
  assert.match(result.transcript, /原局、大运、流年三层出现具名的同链结构联系/u);
  assert.ok(result.transcript.indexOf("先说结论：") < result.transcript.indexOf("四柱："));
  assert.doesNotMatch(result.transcript, /事实核对码|完整记录核对码|reproducibility_hash/u);
});

test("Tarot default path uses Chinese spread, position, and orientation labels", async () => {
  const result = await runInteractive([
    { prompt: "请选择想看的内容：", response: "3\n" },
    { prompt: "请选择问事方式", response: "1\n" },
    { prompt: "请用一句话写下这次想反思的聚焦问题：", response: "\n" },
    { prompt: "请用一句话写下这次想反思的聚焦问题：", response: "我该怎样比较两个工作机会？\n" },
    { prompt: "请选择牌阵", response: "3\n" },
    { prompt: "抽牌方式：", response: "1\n" },
    { prompt: "按以上信息在本地计算？", response: "1\n" },
    { prompt: "接下来：1 看盘面 / 牌面重点", response: "1\n" },
    { prompt: "接下来：1 看盘面 / 牌面重点", response: "5\n" },
  ]);

  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.match(result.transcript, /这里需要填写内容/);
  assert.match(result.transcript, /决策：方案 A、方案 B、决策视角/);
  assert.match(result.transcript, /方案 A：.+（(?:正位|逆位)）/);
  assert.match(result.transcript, /决策视角：.+（(?:正位|逆位)）/);
  assert.match(result.transcript, /可参考的反思线索/);
  assert.match(result.transcript, /可参考的反思线索：以“.+”的(?:正位|逆位)传统主题为提问线索/);
  assert.doesNotMatch(result.transcript, /可参考的反思线索：[A-Za-z]/);
  assert.doesNotMatch(result.transcript, /option-a:|\(upright\)|\(reversed\)/);
  assert.doesNotMatch(result.transcript, /可用 profile/);
});

test("Western guide offers coordinates up front and exposes audited motion state", async () => {
  const result = await runInteractive([
    { prompt: "请选择想看的内容：", response: "4\n" },
    { prompt: "请选择具体方法：", response: "3\n" },
    { prompt: "出生日期（公历 YYYY-MM-DD", response: "2000-08-16\n" },
    { prompt: "出生时间（24 小时制", response: "04:00\n" },
    { prompt: "出生地时区", response: "Asia/Shanghai\n" },
    { prompt: "经纬度（用于上升点、中天和宫位", response: "31.23\n" },
    { prompt: "经纬度（用于上升点、中天和宫位", response: "31.23,121.47\n" },
    { prompt: "按以上信息在本地计算？", response: "1\n" },
    { prompt: "接下来：1 看盘面 / 牌面重点", response: "1\n" },
    { prompt: "接下来：1 看盘面 / 牌面重点", response: "5\n" },
  ]);

  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.match(result.transcript, /经纬度应成对填写/);
  assert.match(result.transcript, /坐标：31\.23, 121\.47/);
  assert.match(result.transcript, /上升：/);
  assert.match(result.transcript, /视运动 (?:顺行|逆行|停滞或方向不确定)/);
  assert.match(result.transcript, /±6\/12\/24 小时窗口/);
});

test("overseas Zi Wei civil-day convention is disclosed before confirmation", async () => {
  const result = await runInteractive([
    { prompt: "请选择想看的内容：", response: "1\n" },
    { prompt: "请选择出生盘方式", response: "1\n" },
    { prompt: "出生日期（公历 YYYY-MM-DD", response: "2000-08-16\n" },
    { prompt: "出生时间（24 小时制", response: "04:00\n" },
    { prompt: "出生地时区", response: "America/New_York\n" },
    { prompt: "请选择排盘参数", response: "1\n" },
    { prompt: "想看哪个日期所处的阶段？", response: "\n" },
    { prompt: "按以上信息在本地计算？", response: "3\n" },
  ]);

  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.match(result.transcript, /海外日期提醒：这张盘按出生地当天处理/);
  assert.doesNotMatch(result.transcript, /birthplace-civil/);
  assert.ok(result.transcript.indexOf("海外日期提醒：") < result.transcript.indexOf("按以上信息在本地计算？"));
});

test("DST overlap guide supports both earlier and later instants", async () => {
  for (const choice of [
    { menu: "1\n", label: "较早", disambiguation: "earlier", utc: "2024-11-03T05:30:00Z" },
    { menu: "2\n", label: "较晚", disambiguation: "later", utc: "2024-11-03T06:30:00Z" },
  ]) {
    const result = await runInteractive([
      { prompt: "请选择想看的内容：", response: "4\n" },
      { prompt: "请选择具体方法：", response: "3\n" },
      { prompt: "出生日期（公历 YYYY-MM-DD", response: "2024-11-03\n" },
      { prompt: "出生时间（24 小时制", response: "01:30\n" },
      { prompt: "出生地时区", response: "America/New_York\n" },
      { prompt: "经纬度（用于上升点、中天和宫位", response: "\n" },
      { prompt: "按以上信息在本地计算？", response: "1\n" },
      { prompt: "1 较早一次  2 较晚一次", response: choice.menu },
      { prompt: "按以上信息在本地计算？", response: "1\n" },
      { prompt: "接下来：1 看盘面 / 牌面重点", response: "2\n" },
      { prompt: "为什么这样算：", response: "2\n" },
      { prompt: "技术记录会显示排盘口径", response: "1\n" },
      { prompt: "1 查看完整 JSON", response: "1\n" },
      { prompt: "为什么这样算：", response: "3\n" },
      { prompt: "接下来：1 看盘面 / 牌面重点", response: "5\n" },
    ]);

    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.match(result.transcript, new RegExp(`重复时刻：采用夏令时回拨中${choice.label}出现的一次`));
    assert.match(result.transcript, new RegExp(`"disambiguation": "${choice.disambiguation}"`));
    assert.match(result.transcript, new RegExp(`"utc_instant": "${choice.utc.replaceAll(".", "\\.")}"`));
  }
});

test("DST gap guide requires a corrected clock time", async () => {
  const result = await runInteractive([
    { prompt: "请选择想看的内容：", response: "4\n" },
    { prompt: "请选择具体方法：", response: "3\n" },
    { prompt: "出生日期（公历 YYYY-MM-DD", response: "2024-03-10\n" },
    { prompt: "出生时间（24 小时制", response: "02:30\n" },
    { prompt: "出生地时区", response: "America/New_York\n" },
    { prompt: "经纬度（用于上升点、中天和宫位", response: "\n" },
    { prompt: "按以上信息在本地计算？", response: "1\n" },
    { prompt: "1 修改出生时间  2 修改其他资料  3 取消", response: "1\n" },
    { prompt: "出生时间（24 小时制", response: "03:30\n" },
    { prompt: "按以上信息在本地计算？", response: "1\n" },
    { prompt: "接下来：1 看盘面 / 牌面重点", response: "5\n" },
  ]);

  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.match(result.transcript, /这个当地时间处于夏令时跳时区间/);
  assert.match(result.transcript, /时间：03:30/);
  assert.doesNotMatch(result.transcript, /1 较早一次  2 较晚一次/);
});

test("Meihua preview discloses its limits before number entry and skips a one-profile question", async () => {
  const result = await runInteractive([
    { prompt: "请选择想看的内容：", response: "4\n" },
    { prompt: "请选择具体方法：", response: "6\n" },
    { prompt: "问题（可留空）：", response: "\n" },
    { prompt: "预览功能说明：", response: "8\n" },
    { prompt: "第二个正整数：", response: "13\n" },
    { prompt: "动爻 1–6", response: "\n" },
    { prompt: "按以上信息在本地计算？", response: "1\n" },
    { prompt: "接下来：1 看盘面 / 牌面重点", response: "5\n" },
  ]);

  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.match(result.transcript, /只实现固定的两数起卦/);
  assert.match(result.transcript, /当前不含时间起卦、体用分析或预测应期/);
  assert.match(result.transcript, /动爻：第 \d 爻/);
  assert.doesNotMatch(result.transcript, /选择口径（默认 1）/);
});

test("prototype-like input is rejected and q exits cleanly without a JSON error", async () => {
  const result = await runInteractive([
    { prompt: "请选择想看的内容：", response: "__proto__\n" },
    { prompt: "没有识别这个选项", response: "q\n" },
  ]);
  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.match(result.transcript, /没有识别这个选项/);
  assert.match(result.transcript, /已退出，没有写入文件/);
  assert.doesNotMatch(result.transcript, /"error"/);
});

test("unknown birth time announces the full-day scan before blocking calculation", async () => {
  const result = await runInteractive([
    { prompt: "请选择想看的内容：", response: "4\n" },
    { prompt: "请选择具体方法：", response: "1\n" },
    { prompt: "出生日期（公历 YYYY-MM-DD", response: "2000-08-16\n" },
    { prompt: "出生时间（24 小时制", response: "\n" },
    { prompt: "出生地时区", response: "Asia/Shanghai\n" },
    { prompt: "按以上信息在本地计算？", response: "1\n" },
    { prompt: "正在扫描出生当天所有真实存在的民用时刻", response: KILL },
  ]);

  assert.equal(result.completedSteps, 7);
  assert.equal(result.stderr, "");
  assert.equal(result.signal, "SIGTERM");
  assert.match(result.transcript, /这可能需要几十秒/);
});

test("result menu can edit one field, recalculate, and start a clean new session", async () => {
  const result = await runInteractive([
    { prompt: "请选择想看的内容：", response: "4\n" },
    { prompt: "请选择具体方法：", response: "6\n" },
    { prompt: "问题（可留空）：", response: "\n" },
    { prompt: "预览功能说明：", response: "8\n" },
    { prompt: "第二个正整数：", response: "13\n" },
    { prompt: "动爻 1–6", response: "\n" },
    { prompt: "按以上信息在本地计算？", response: "1\n" },
    { prompt: "接下来：1 看盘面 / 牌面重点", response: "3\n" },
    { prompt: "要修改哪一项？", response: "2\n" },
    { prompt: "新的第一个正整数：", response: "9\n" },
    { prompt: "按以上信息在本地计算？", response: "1\n" },
    { prompt: "接下来：1 看盘面 / 牌面重点", response: "4\n" },
    { prompt: "已清空本次内存状态", response: "q\n" },
  ]);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.equal((result.transcript.match(/＝＝＝＝ 排盘 \/ 抽取完成 ＝＝＝＝/g) || []).length, 2);
  assert.match(result.transcript, /第一个数：9/);
  assert.match(result.transcript, /已清空本次内存状态/);
});

test("life-overview route can add an explicit Zi Wei target date and show its stage", async () => {
  const result = await runInteractive([
    { prompt: "请选择想看的内容：", response: "1\n" },
    { prompt: "请选择出生盘方式", response: "\n" },
    { prompt: "出生日期（公历 YYYY-MM-DD", response: "2000-08-16\n" },
    { prompt: "出生时间（24 小时制", response: "04:00\n" },
    { prompt: "出生地时区", response: "Asia/Shanghai\n" },
    { prompt: "请选择排盘参数", response: "1\n" },
    { prompt: "想看哪个日期所处的阶段？", response: "2026-08-23\n" },
    { prompt: "按以上信息在本地计算？", response: "1\n" },
    { prompt: "接下来：1 看盘面 / 牌面重点", response: "5\n" },
  ]);

  assert.equal(result.code, 0, result.stderr);
  assert.match(result.transcript, /你想看：人生整体与重要阶段/);
  assert.match(result.transcript, /指定日期：2026-08-23/);
  assert.match(result.transcript, /大限：23–32 岁（2022–2031）/);
  assert.match(result.transcript, /流年：2026 年/);
  assert.doesNotMatch(result.transcript, /宫宫/);
  assert.doesNotMatch(result.transcript, /target_time_index|facts_hash|计算口径 ID/);
});

test("single-domain Zi Wei can add the stage date during the initial guided intake", async () => {
  const result = await runInteractive([
    { prompt: "请选择想看的内容：", response: "2\n" },
    { prompt: "请选择重点领域：", response: "1\n" },
    { prompt: "请选择出生盘方式", response: "1\n" },
    { prompt: "出生日期（公历 YYYY-MM-DD", response: "2000-08-16\n" },
    { prompt: "出生时间（24 小时制", response: "04:00\n" },
    { prompt: "出生地时区", response: "Asia/Shanghai\n" },
    { prompt: "请选择排盘参数", response: "1\n" },
    { prompt: "想看哪个日期所处的阶段？", response: "2026-08-23\n" },
    { prompt: "按以上信息在本地计算？", response: "1\n" },
    { prompt: "接下来：1 看盘面 / 牌面重点", response: "5\n" },
  ]);

  assert.equal(result.code, 0, result.stderr);
  const targetPrompt = result.transcript.indexOf("想看哪个日期所处的阶段？");
  const firstConfirmation = result.transcript.indexOf("按以上信息在本地计算？");
  assert.ok(targetPrompt > 0 && targetPrompt < firstConfirmation);
  assert.equal((result.transcript.match(/想看哪个日期所处的阶段？/g) || []).length, 1);
  assert.match(result.transcript, /指定日期：2026-08-23/);
  assert.doesNotMatch(result.transcript, /宫宫/);
});

test("explicit Zi Wei natal route does not ask for a target date up front", async () => {
  const result = await runInteractive([
    { prompt: "请选择想看的内容：", response: "4\n" },
    { prompt: "请选择具体方法：", response: "2\n" },
    { prompt: "出生日期（公历 YYYY-MM-DD", response: "2000-08-16\n" },
    { prompt: "出生时间（24 小时制", response: "04:00\n" },
    { prompt: "出生地时区", response: "Asia/Shanghai\n" },
    { prompt: "请选择排盘参数", response: "1\n" },
    { prompt: "按以上信息在本地计算？", response: "3\n" },
  ]);

  assert.equal(result.code, 0, result.stderr);
  assert.doesNotMatch(result.transcript, /想看哪个日期所处的阶段？/);
});

test("unknown Zi Wei birth time removes target-date timing instead of guessing", async () => {
  const result = await runInteractive([
    { prompt: "请选择想看的内容：", response: "1\n" },
    { prompt: "请选择出生盘方式", response: "1\n" },
    { prompt: "出生日期（公历 YYYY-MM-DD", response: "2000-08-16\n" },
    { prompt: "出生时间（24 小时制", response: "\n" },
    { prompt: "出生地时区", response: "Asia/Shanghai\n" },
    { prompt: "请选择排盘参数", response: "1\n" },
    { prompt: "按以上信息在本地计算？", response: "1\n" },
    { prompt: "接下来：1 看盘面 / 牌面重点", response: "5\n" },
  ]);

  assert.equal(result.code, 0, result.stderr);
  assert.match(result.transcript, /不能可靠定位指定日期的大限与流年/);
  assert.match(result.transcript, /不会硬选其中一张/);
  assert.doesNotMatch(result.transcript, /想看哪个日期所处的阶段？/);
});

test("changing a frozen Tarot question requires an explicit new draw", async () => {
  const result = await runInteractive([
    { prompt: "请选择想看的内容：", response: "3\n" },
    { prompt: "请选择问事方式", response: "1\n" },
    { prompt: "请用一句话写下这次想反思的聚焦问题：", response: "我要不要接受这个机会？\n" },
    { prompt: "请选择牌阵", response: "1\n" },
    { prompt: "抽牌方式：", response: "3\n" },
    { prompt: "核心提示：请输入牌名或牌 ID：", response: "The Fool\n" },
    { prompt: "核心提示：1 正位", response: "1\n" },
    { prompt: "按以上信息在本地计算？", response: "1\n" },
    { prompt: "接下来：1 看盘面 / 牌面重点", response: "3\n" },
    { prompt: "要修改哪一项？", response: "1\n" },
    { prompt: "牌面与原问题已经冻结", response: "1\n" },
    { prompt: "新的聚焦问题：", response: "我要怎样谈这个机会的条件？\n" },
    { prompt: "抽牌方式：", response: "3\n" },
    { prompt: "核心提示：请输入牌名或牌 ID：", response: "The Magician\n" },
    { prompt: "核心提示：1 正位", response: "1\n" },
    { prompt: "按以上信息在本地计算？", response: "1\n" },
    { prompt: "接下来：1 看盘面 / 牌面重点", response: "5\n" },
  ]);

  assert.equal(result.code, 0, result.stderr);
  assert.equal((result.transcript.match(/＝＝＝＝ 排盘 \/ 抽取完成 ＝＝＝＝/g) || []).length, 2);
  assert.match(result.transcript, /旧牌面不会混入/);
  assert.match(result.transcript, /旧解读作废/);
  assert.match(result.transcript, /核心提示：愚人（正位）/);
  assert.match(result.transcript, /核心提示：魔术师（正位）/);
});

test("canceling Tarot spread or source replacement keeps the frozen result and never redraws", async () => {
  const result = await runInteractive([
    { prompt: "请选择想看的内容：", response: "3\n" },
    { prompt: "请选择问事方式", response: "1\n" },
    { prompt: "请用一句话写下这次想反思的聚焦问题：", response: "我要不要接受这个机会？\n" },
    { prompt: "请选择牌阵", response: "1\n" },
    { prompt: "抽牌方式：", response: "3\n" },
    { prompt: "核心提示：请输入牌名或牌 ID：", response: "The Fool\n" },
    { prompt: "核心提示：1 正位", response: "1\n" },
    { prompt: "按以上信息在本地计算？", response: "1\n" },
    { prompt: "接下来：1 看盘面 / 牌面重点", response: "3\n" },
    { prompt: "要修改哪一项？", response: "2\n" },
    { prompt: "牌面与原问题已经冻结。修改牌阵会开始一次新抽取", response: "2\n" },
    { prompt: "接下来：1 看盘面 / 牌面重点", response: "3\n" },
    { prompt: "要修改哪一项？", response: "3\n" },
    { prompt: "牌面与原问题已经冻结。修改抽牌方式会开始一次新抽取", response: "2\n" },
    { prompt: "接下来：1 看盘面 / 牌面重点", response: "1\n" },
    { prompt: "接下来：1 看盘面 / 牌面重点", response: "5\n" },
  ]);

  assert.equal(result.code, 0, result.stderr);
  assert.equal((result.transcript.match(/正在本地计算……/g) || []).length, 1);
  assert.equal((result.transcript.match(/没有修改资料，继续沿用当前结果。/g) || []).length, 2);
  assert.match(result.transcript, /核心提示：愚人（正位）/);
  assert.doesNotMatch(result.transcript, /已确认开始新抽取|旧解读作废/);
});

test("confirming a new I Ching casting replaces the frozen result and invalidates the old reading", async () => {
  const result = await runInteractive([
    { prompt: "请选择想看的内容：", response: "3\n" },
    { prompt: "请选择问事方式", response: "2\n" },
    { prompt: "请用一句话写下这次想反思的聚焦问题：", response: "我要不要接受这个机会？\n" },
    { prompt: "起卦方式：", response: "3\n" },
    { prompt: "请输入自下而上的 6 个爻值", response: "7,7,7,7,7,7\n" },
    { prompt: "按以上信息在本地计算？", response: "1\n" },
    { prompt: "接下来：1 看盘面 / 牌面重点", response: "3\n" },
    { prompt: "修改：1 换一个问题", response: "2\n" },
    { prompt: "卦象与原问题已经冻结。修改起卦方式会开始一次新起卦", response: "1\n" },
    { prompt: "起卦方式：", response: "3\n" },
    { prompt: "请输入自下而上的 6 个爻值", response: "8,8,8,8,8,8\n" },
    { prompt: "按以上信息在本地计算？", response: "1\n" },
    { prompt: "接下来：1 看盘面 / 牌面重点", response: "5\n" },
  ]);

  assert.equal(result.code, 0, result.stderr);
  assert.equal((result.transcript.match(/＝＝＝＝ 排盘 \/ 抽取完成 ＝＝＝＝/g) || []).length, 2);
  assert.match(result.transcript, /本卦：第 1 卦 乾/);
  assert.match(result.transcript, /本卦：第 2 卦 坤/);
  assert.match(result.transcript, /已确认开始新起卦/);
  assert.match(result.transcript, /已生成新的牌面或卦象；旧解读作废/);
});

test("ordinary renderer rejects backstage fields before emitting any partial reading", () => {
  const payload = makeBoundIChingReading();
  const valid = validateReading(payload);
  assert.equal(valid.valid, true, valid.errors.join("\n"));
  const calculation = payload.calculation;
  payload.reading.summary = "a".repeat(64);
  payload.reading.claims[0].statement = payload.reading.summary;

  const result = renderReading(payload);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  const error = JSON.parse(result.stderr).error;
  assert.equal(error.code, "READING_PRESENTATION_FAILED");
  assert.ok(error.details.issue_categories.includes("hash_like_value"));
  assert.ok(!result.stderr.includes(calculation.facts_hash));
  assert.ok(!result.stderr.includes(calculation.profile.id));
});
