# Fortune Teller

[![CI](https://github.com/jmf-enigma/fortune-teller/actions/workflows/ci.yml/badge.svg)](https://github.com/jmf-enigma/fortune-teller/actions/workflows/ci.yml)

[English](README.en.md) · [完整方法范围](docs/SCOPE.md) · [准确性评估](references/accuracy-evaluation.md) · [可核验基准](BENCHMARK.md) · [发布审计](docs/RELEASE_AUDIT.md)

**一个会先问清资料、再直接说事业、财富、关系或当前问题结论的本地算命 Agent Skill。**

你不需要先懂八字十神、紫微宫位、占星相位或内部参数。它会一步步问本次真正需要的资料，先在第一屏给出普通人能读懂的结论，再把术语、盘面依据和核验记录放到后面供你展开。

固定版本的本地程序负责排盘、起卦和抽牌；对话模型负责提问、解释和整理。这里的“准确性优先”是尽量避免排错盘、用错规则、挑证据和把未决问题硬说成定论，**不表示命理或占卜已经具有科学验证的预测准确率**。

当前版本：`0.6.0` · 公开仓库：[jmf-enigma/fortune-teller](https://github.com/jmf-enigma/fortune-teller)

## 实际用起来是什么样

### 1. 先说你想看什么

可以直接说：

```text
用 $fortune-teller 看我的人生整体，先讲事业、财富和长期关系。
用 $fortune-teller 看我现在的事业和财富处在什么阶段。
用 $fortune-teller 抽一次塔罗：我该先接受这个机会，还是继续谈条件？
```

### 2. 它会一步步问资料

- 看出生盘时，按顺序询问出生日期、时间、时区，以及当前方法确实需要的其他资料；
- 中国大陆可直接填写北京、上海或中国大陆，香港可直接填写香港；其他地区再填写标准时区名称；
- 不知道出生时间可以直接说不知道，工具会说明哪些还能看、哪些必须停下；
- 问当前事情时，先帮你把问题收窄，不会偷偷替换成另一个问题；
- 正式计算前给出确认页，可以修改、取消或继续。

不会一上来要求你填写一整张参数表，也不会要求普通用户选择内部规则包。

### 3. 第一屏先给结果

在人生整体模式下，出生盘会优先展示：

1. 人生整体最值得留意的主线；
2. 事业与学习；
3. 财富与资源；
4. 长期关系或身心节奏；
5. 有目标日期时，再说明当前阶段强调了什么。

每个主题先给一句结论和白话解释，再给现实中可以核对的表现。星曜、宫位、十神、相位、规则来源和完整技术记录统一后置；只有某项资料确实会改变结果时，才用一句自然语言提醒。

## 同一份结果，旧式输出与现在输出

下面是八字结果的简化展示示例，不是对所有人的固定判断。

旧式输出常停在术语：

> 戊日丑月，食神透、财星藏、劫财两透，月劫候选。

现在先翻译成用户真正关心的内容：

> **事业：** 事业主线是靠能拿出来的作品、方案和交付证明价值。职责压力和学习支持也在，但没有成果输出这条线那么直接。
>
> **财富：** 财富主线是把成果变成收入，同时把合作中的归属、分成和责任说清楚。资源机会本身的线索较弱，不能直接断成稳定进财。
>
> **当前阶段：** 眼下更需要把想法做成成果，同时处理好职责和规则；目标年份更偏向学习、训练和方法升级。这是阶段重心，不等于一定升职或收入一定增加。

需要时再展开“为什么这样看”，查看对应十神、位置、阶段和反例。普通结果不会先堆内部状态、代码或校验字段。

## 目前能看什么

| 方法 | 适合看什么 | 重要边界 |
|---|---|---|
| 四柱八字 | 人生整体、事业学习、财富资源、长期关系；有目标日期时看原局—大运—流年的阶段变化 | 旺衰、格局与取用证据不一致时保留未决；当前只放行出生瞬间实际 UTC 偏移为 `+08:00` 的资料 |
| 紫微斗数 | 整体、事业学习、财富资源、长期关系、身心节奏；可看本命—大限—流年 | 未知时辰不替你挑一张候选盘；格局只作补充证据，不按数量投票，也不生成具体事件 |
| 西洋本命盘 | 性格与人生主题、事业、关系、资源等本命主题 | 时间或坐标不足时不补上升、宫位和命主星；当前不含行运与推运 |
| 塔罗 | 当前问题、选择、支持因素、风险与取舍 | 不数“好牌”替选项投票，不承诺结果；换问题会明确开始新抽牌 |
| 周易三钱 | 当前处境、变化过程、行动反思 | 不编造未登记的卦爻辞，不把卦象写成必然事件 |
| 梅花两数 | 固定两数起卦下的体用、互卦与变化关系 | 目前是 preview；不支持外应、时间起卦、季节旺衰或应期 |
| 六爻、奇门、吠陀占星 | 暂未开放 | 已登记为 planned，调用会明确停止，不让模型临时手排 |

完整工程范围见 [docs/SCOPE.md](docs/SCOPE.md)。“stable”或“qualified”只表示相应工程范围通过或带条件通过检查，不表示预测有效。

## “准不准”在这里具体指什么

- **盘有没有按声明的规则算对：** 使用固定版本本地引擎、明确时间与历法边界，并用回归测试复核。
- **解读有没有依据：** 结论必须能回到本次盘面、牌面或卦面事实，以及已经登记的有限规则。
- **资料不足时会不会硬猜：** 未知时辰、缺少坐标、规则未闭合或流派分歧会直接缩小结论或保留未决。
- **现实结果会不会一定发生：** 不作保证，也没有建立科学意义上的预测准确率。

过去经历可以用来讨论哪里符合、哪里不符合，但不能事后包装成盲测。若要认真评估，请预先冻结判断、观察窗口和正反标准，再用未来记录核对；方法见 [准确性评估](references/accuracy-evaluation.md)。

## 快速开始

要求 Node.js 20 或更新版本。三个出生盘引擎当前只把 `1900-01-01` 至 `2100-12-31` 标记为发布测试范围，超出会明确拒绝。

```bash
npm ci --ignore-scripts
npm run check
npm start
```

`npm start` 打开中文交互向导。它会逐步收集资料、显示确认页、计算并先给结论；同一个问题的后续追问沿用同一结果，只有修改关键资料或明确换问题时才重算、重抽或重新起卦。

## 作为 Agent Skill 安装

把完整目录复制或链接到宿主的 skills 目录。以 Codex 的常见本地目录为例：

```bash
cd /absolute/path/to/fortune-teller
npm ci --ignore-scripts
ln -s /absolute/path/to/fortune-teller ~/.codex/skills/fortune-teller
```

压缩包不内置 `node_modules`；首次使用需要在解压目录安装锁定依赖。Agent 不应在没有许可时自行联网安装。刷新宿主后即可调用 `$fortune-teller`。

## 普通模型还是 Pro？

一般模型足以完成本地计算、中文向导、单体系标准解读、一个阶段主题，以及塔罗或周易的当前问题。主题聚焦、相互作用不多时，也可以完成有依据的深读。

Pro 或更大推理预算更适合长篇多因素综合、多体系分歧审计、逐条来源检查和第二遍对抗性复核。两者使用完全相同的本地盘面；Pro 不会改变排盘，也不能让未验证的传统预测变得更准确。详见 [模型层级](references/model-tiers.md)。

## 想看专业依据时再展开

项目不靠模型手算出生盘，也不把一句传统术语直接升级成人生结论：

- 六个已实现体系分别使用固定本地计算或抽取流程；
- 八字把季节、根气、透干、格局成败与救应分开核对，不用元素数量投票；
- 紫微保留完整主题宫、三合与对宫结构，55 条可复算格局和 32 条拒绝边界只进入补充证据；
- 解读会同时保留支持因素、反例、改判条件和现实核对问题；
- [16 个来源记录](src/data/source-registry.mjs)与 [38 条机器可读规则](src/data/rule-registry.mjs)限定目前真正覆盖的范围。

更多说明见 [专业覆盖](docs/PROFESSIONAL_COVERAGE.md)、[证据约束深读协议](references/professional-reading.md)、[架构](docs/ARCHITECTURE.md) 和 [竞品审计](docs/COMPETITOR_AUDIT.md)。

<details>
<summary><strong>开发者：结构化命令与后台核验</strong></summary>

先查看当前真实能力：

```bash
node scripts/fortune-teller.mjs methods --json
```

还没选方法时，按问题和现有资料路由；排序代表适配度，不代表谁更准：

```bash
node scripts/fortune-teller.mjs route --json '{"goal":"current_question","question_kind":"decision_action","available_data":{"focused_question":true}}' --pretty
```

把请求保存为不会提交到 Git 的 `request.local.json`：

```json
{
  "system": "bazi",
  "input": {
    "date": "2000-08-16",
    "time": "04:00",
    "timezone": "Asia/Shanghai",
    "chart_sex": "male",
    "target_date": "2026-08-24"
  }
}
```

计算并生成该体系的有界结果：

```bash
node scripts/fortune-teller.mjs calculate --input request.local.json --output calculation.local.json --pretty
node scripts/fortune-teller.mjs adjudicate --input calculation.local.json --pretty
```

Agent 生成结构化 reading 后，可依次绑定、校验和渲染普通结果：

```bash
node scripts/fortune-teller.mjs bind-reading --input reading-draft.local.json --output reading-bound.local.json --pretty
node scripts/fortune-teller.mjs validate-reading --input reading-bound.local.json --pretty
node scripts/fortune-teller.mjs render-reading --input reading-bound.local.json
```

核对某个体系登记的来源：

```bash
node scripts/fortune-teller.mjs sources --system bazi --pretty
```

输出文件采用只新建、不覆盖策略。完整数据合同见 [证据合同](references/evidence-contract.md)，交互流程见 [references/interaction.md](references/interaction.md)。后台核验记录用于重算、检查资料口径与拦截不受支持的解释，不代表预测有效。

</details>

<details>
<summary><strong>开发者：测试与发布</strong></summary>

```bash
npm test
npm run doctor
npm run verify
npm run check
npm run package:skill
```

GitHub Actions 在 Node 20、22 和 24 上运行检查，并核对 npm 包与 Skill archive。发布前还应在干净临时目录解压、重新安装锁定依赖并运行完整检查。详见 [发布审计](docs/RELEASE_AUDIT.md) 和 [贡献指南](CONTRIBUTING.md)。

</details>

## 隐私与安全

- 本地源代码不发送网络请求；安装依赖本身仍需访问 npm registry。
- 工具默认不保存输入。不要把真实生辰、精确位置、私人问题或回放凭据提交到源码、issue 或截图。
- 不用它诊断疾病、判断怀孕、预测死亡、认定犯罪、裁决关系忠诚、指导投资或法律行动，或验证被害妄想。
- 重要决定应继续依据现实资料和专业意见，而不是只依据一次传统解读。

详见 [SECURITY.md](SECURITY.md)、[安全边界](references/safety.md) 和 [第三方通知](THIRD_PARTY_NOTICES.md)。

## 和其他项目相比

Fortune Teller 不以方法数量取胜，而是把较小范围内的本地计算、资料不足处理、规则依据、普通中文结果和可复核边界做扎实。

它仍缺少头部项目的完整古籍知识库、图盘、更多流派与方法、流月/流日/流时、外部用户规模和独立命理师/占星师/占卜师评审。当前没有建立现实预测效度，因此不宣传“整体最好”或“比别人更准”。详细比较见 [竞品审计](docs/COMPETITOR_AUDIT.md)。

## 许可证

项目自有代码采用 [MIT License](LICENSE)。第三方依赖与固定来源适配的完整归属见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
