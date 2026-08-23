# Fortune Teller

[![CI](https://github.com/jmf-enigma/fortune-teller/actions/workflows/ci.yml/badge.svg)](https://github.com/jmf-enigma/fortune-teller/actions/workflows/ci.yml)

[English](README.en.md) · [方法范围](docs/SCOPE.md) · [竞品审计](docs/COMPETITOR_AUDIT.md) · [可核验基准](BENCHMARK.md) · [发布审计](docs/RELEASE_AUDIT.md)

一个本地优先、可复现、可审计的中西术数 Agent Skill。它把排盘、起卦和随机抽取交给固定版本的本地程序，把对话模型限定在信息收集、解释、比较和审计层。

这不是“让模型凭记忆算命”的提示词合集，也不宣称命理、占星或占卜具有经科学验证的预测能力。

> 当前版本：`0.1.0`。公开仓库：[jmf-enigma/fortune-teller](https://github.com/jmf-enigma/fortune-teller)。

## 为什么做这个

GitHub 上已有覆盖更广的项目，有的自报几十种方法、数百到上千项测试。本项目不靠扩大方法清单取胜，而是先把少数真实支持的方法做得更可核验：

- 默认离线计算，不把出生资料和私人问题发送给公共 API；
- 统一输出 `facts`、profile、warnings、sensitivity 与双哈希；
- 不知道出生时辰时不补中午或子时，而是扫描真实民用日并保留变化；
- 夏令时跳时、重复时段、整天被时区跳过等边界失败关闭；
- 塔罗和三钱起卦使用本地安全随机，支持显式 seed 回放和实体结果输入；
- 计算事实、传统规则、解释和未解决项分层；
- 多体系一致不被包装成“科学验证”，冲突不会通过投票消失；
- 普通模型即可完成核心工作，Pro 只用于更长的综合与复核。

## 当前支持

| 方法 | 状态 | 已实现边界 |
|---|---|---|
| 四柱八字 | stable | 公历输入、IANA 时区、午夜/子初日界、民用/平太阳/近似视太阳时；未知时辰全天逐分钟扫描 |
| 紫微斗数 | stable | `iztro` 默认与中州 profile、十二宫结构；未知时辰按当天真实存在的时间扫描，不合成单盘 |
| 西洋本命盘 | stable-whole-sign | 热带黄道、十大天体、上升/中天、whole-sign 宫位、五类相位；未知时刻省略角点与宫位 |
| 塔罗 | stable | 78 张本地牌名与原创短关键词、5 种牌阵、安全随机、seed 回放、实体/手工牌面 |
| 周易三钱 | stable | 逐枚硬币 transcript、六爻自下而上、64 卦 King Wen 映射、动爻变卦、seed 回放 |
| 梅花两数 | preview | 固定两数起卦与显式动爻；尚无体用、五行生克和应期引擎 |
| 六爻、奇门、吠陀占星 | planned | 注册但没有引擎；调用会明确失败，不会由模型临时手排 |

“stable”只表示指定工程范围通过发布门槛，不表示预测有效。完整缺口见 [docs/SCOPE.md](docs/SCOPE.md)。

## 快速开始

要求 Node.js 20 或更新版本。

三个出生盘引擎当前只对 `1900-01-01` 至 `2100-12-31` 标记为发布测试范围，超出时会明确拒绝。

```bash
npm ci --ignore-scripts
npm run check
npm start
```

`npm start` 启动中文交互向导。Agent 使用时则由 [SKILL.md](SKILL.md) 负责逐步收集、确认、计算、预览和深挖。

先查看实时能力，不要从 README 猜参数：

```bash
node scripts/fortune-teller.mjs methods --json
```

### 结构化计算示例

创建一个已被 `.gitignore` 排除、不要提交到 Git 的临时 `request.local.json`：

```json
{
  "system": "bazi",
  "input": {
    "date": "2000-08-16",
    "time": "04:00",
    "timezone": "Asia/Shanghai"
  },
  "profile": "bazi-civil-midnight-consistent-v1"
}
```

运行：

```bash
node scripts/fortune-teller.mjs calculate --input request.local.json --pretty
```

输出不会覆盖已有文件；使用 `--output` 时目标文件必须尚不存在。

### 随机回放

默认 fresh 抽取只返回 seed commitment。只有用户明确需要回放时，才对 fresh 抽取设置 `reveal_seed:true`：

```json
{
  "system": "tarot",
  "input": {
    "question": "我该怎样更清楚地比较两个方案？",
    "spread": "decision",
    "reveal_seed": true
  }
}
```

请自行保管返回的 seed；工具不会持久化它。之后把 seed 显式传回即可重放。比较 replay 时看 `facts_hash`：fresh 与 replay 的随机来源元数据不同，所以完整 `reproducibility_hash` 可以不同。

## 作为 Agent Skill 使用

把整个目录复制或链接到宿主的 skills 目录，确保 `SKILL.md`、`references/`、`src/`、`scripts/` 和依赖文件保持在一起。以 Codex 的常见本地目录为例：

```bash
cd /absolute/path/to/fortune-teller
npm ci --ignore-scripts
ln -s /absolute/path/to/fortune-teller ~/.codex/skills/fortune-teller
```

压缩包不内置 `node_modules`；首次使用必须在解压目录完成上面的固定依赖安装。不要让 Agent 在未获得许可时自行联网安装。

重启或刷新宿主后，可直接说：

```text
用 $fortune-teller 帮我做一个未知出生时辰的八字敏感性分析。
```

核心计算不依赖特定厂商的远程工具。`agents/openai.yaml` 只是 Codex 界面元数据；其他兼容 Agent Skills 的宿主仍可读取相同的 `SKILL.md` 和 JSON contract。

## 普通模型还是 Pro？

普通模型已经足够完成：

- 选择一个方法并收集输入；
- 调用本地引擎；
- 做单体系、单主题解读；
- 展示引擎已经聚合好的时辰敏感性；
- 生成少量可追踪证据卡。

Pro 或更大推理预算更适合：

- 三个以上体系或多个流派 profile 的比较；
- 大量候选盘的逐项冲突审计；
- 每条结论都要 fact/rule/source 映射的正式报告；
- 第二遍对抗性一致性复核。

两档调用的是同一套本地事实。Pro 不会改变盘面，也不代表“算得更准”。详见 [references/model-tiers.md](references/model-tiers.md)。

## 输出与证据合同

每次计算返回：

- `facts_hash`：承诺 engine version、system、profile 与计算/抽取事实；
- `reproducibility_hash`：承诺除生成时间外的完整审计 envelope，包括规范化输入、warnings、sensitivity、来源与 Node/ICU/tzdb 运行时；
- `meta.time_runtime`：记录影响历史时区换算的运行环境；
- `profile`：明确日界、时间基础、宫制、逆位规则等口径；
- `sensitivity`：明确输入不足时哪些稳定、哪些变化、哪些不可用。

解释层必须通过 [references/evidence-contract.md](references/evidence-contract.md) 的四层合同：`calculation_fact`、`traditional_rule`、`interpretation`、`unresolved`。`validate-reading` 会重算 envelope 哈希，并检查系统/profile 绑定、fact ID、已登记 rule ID、候选分母和禁止的概率字段。同一 system/profile 的两个人目前须分别验证，再单独做关系综合。

## 隐私与安全

- `src/` 不包含网络请求；安装依赖本身需要访问 npm registry。
- 工具默认不保存输入。不要把真实生辰、精确位置、问题或 replay seed 放入源码、fixture、issue 或截图。
- 不用本项目诊断疾病、判断怀孕、预测死亡、认定犯罪、裁决关系忠诚、指导投资/法律行动或验证被害妄想。
- seed 是回放凭据，不是密码学秘密，也不是“灵验度”指标。
- 第三方资料只使用许可证允许的本地依赖；未复制无许可证、AGPL 或非商业竞品的代码与知识库。

安全政策见 [SECURITY.md](SECURITY.md)，第三方通知见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 开发与发布检查

```bash
npm test
npm run doctor
npm run verify
npm run check
npm run package:skill
```

GitHub Actions 会在 Node 20、22 和 24 上运行相同检查，并检查 npm 包与 Skill archive。发布前还应在干净临时目录解压 archive，重新 `npm ci --ignore-scripts` 和 `npm run check`。

本地发布候选的逐项结果与已知限制见 [docs/RELEASE_AUDIT.md](docs/RELEASE_AUDIT.md)，架构见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)，贡献规则见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 和现有项目相比

本项目可以有证据地争取在以下工程维度更好：本地隐私、输入失败诚实性、未知时辰处理、随机回放、统一 envelope、事实与解释分层、普通模型可用性。它目前明显不如头部项目的地方是方法数量、古籍来源库、图盘、MCP/API、外部用户和累计测试规模。

因此这里不作“整体最好”或“更准”的宣传。逐项资料和许可边界见 [docs/COMPETITOR_AUDIT.md](docs/COMPETITOR_AUDIT.md)，可复核的比较规则见 [BENCHMARK.md](BENCHMARK.md)。

## 许可证

项目自有代码采用 [MIT License](LICENSE)。依赖分别使用 MIT、ISC 和 Apache-2.0，完整归属见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
