# Fortune Teller

[![CI](https://github.com/jmf-enigma/fortune-teller/actions/workflows/ci.yml/badge.svg)](https://github.com/jmf-enigma/fortune-teller/actions/workflows/ci.yml)

[English](README.en.md) · [方法范围](docs/SCOPE.md) · [专业解读协议](references/professional-reading.md) · [可核验基准](BENCHMARK.md) · [发布审计](docs/RELEASE_AUDIT.md)

一个结果优先、本地计算的中西术数 Agent Skill。它不追求堆最多的方法，而是优先做好四件事：**先回答用户真正想看的事、排盘不乱猜、解读有依据、操作顺手**。

固定版本的本地程序负责排盘、起卦和随机抽取；对话模型只负责收集资料、解释、比较和审计。项目不宣称命理、占星或占卜具有经科学验证的预测能力。

> 当前版本：`0.2.0`。公开仓库：[jmf-enigma/fortune-teller](https://github.com/jmf-enigma/fortune-teller)。

## 先看结果，不先看术语

普通用户不需要先懂术数术语、排盘口径或内部核验记录。Skill 会先问：

1. 想看人生整体与各方面；
2. 只看事业、财富、感情、家庭或身心节奏中的一个主题；
3. 想问当前正在发生的一件事；
4. 已经选好了具体方法。

出生盘解读先给“人生主轴、主要优势、主要制约和最关心的领域”；当前问事先给“直接答案、当前局面、真正阻力、有利条件、风险和一个现实下一步”。盘面、牌面、来源和技术核对放在后面的“为什么这样看”里。

排盘口径、资料影响记录、两套核对码、程序版本和完整技术记录都继续存在，因为它们能防止排错盘、偷换口径和在时辰不明时硬断；但默认不会抢占结果首页。只有它们确实改变结论时，用户才会看到一句自然说明，例如“出生时间未知，所以这部分暂时不能判断”。

可以直接这样说：

```text
用 $fortune-teller 看我的人生整体，先说事业、财富和长期关系。
用 $fortune-teller 看我今年处于什么阶段，哪些方面最值得留意。
用 $fortune-teller 抽一次塔罗：我该先接受这个机会，还是继续谈条件？
```

## “准不准”怎么回答

- **排盘或抽取有没有按声明的规则算对**：由固定版本本地程序、边界检查和测试负责；
- **这句传统解读有没有依据**：必须能回到本次盘面/牌面事实和登记规则；
- **现实里是否一定会发生**：本项目不作这种保证，也没有建立科学意义上的预测准确率。

后台会分别记录计算状态、资料变化是否影响结果、传统来源覆盖和外部复核状态；普通解读只翻译它们造成的实际影响，不把内部枚举扔给用户。

如果用户想拿过去经历检验，Skill 会先冻结几条具体判断，再收集一个明确时间段的反馈，并把“吻合、不吻合、说不清”全部保留。它不会在听完经历后改时辰、换规则、重抽牌或把原话改宽来追求“说中”。这比迎合式校准更诚实，但仍不能据此宣称已经得到科学准确率。

## 当前支持

| 方法 | 状态 | 已实现边界与专业深度 |
|---|---|---|
| 四柱八字 | stable，受历法参考限制 | 公历输入、IANA 时区、午夜/子初日界、未知时辰真实民用日扫描；输出日主、月令、显干/地支/藏干分项计数、十神出现与明示合冲关系。**只有每个实际出生瞬间的 UTC 偏移为 `+08:00` 才放行**；其他偏移失败关闭，不手工换算。当前不输出旺衰、格局、用神或大运应期 |
| 紫微斗数 | qualified | `iztro` 默认与中州 profile、十二宫、三方四正结构索引和四化落点；出生时刻明确时，可按用户显式指定的日期返回本命—大限—流年三层结构。未知时辰扫描真实存在的当地时间，不合成单盘，也不做目标日期阶段判断。海外统一声明为 `birthplace-civil` calendar-day profile；在 UTC+08:00 以外显示流派口径提醒。太阳时 override 当前失败关闭 |
| 西洋本命盘 | stable-whole-sign | 热带黄道、十大天体、上升/中天、whole-sign 宫位、五类相位、非加权元素/模式计数和紧密相位；运动方向用前后 `6/12/24` 小时多窗口一致性判断，不一致时标为不确定；未知时刻省略角点与宫位 |
| 塔罗 | stable | 78 张本地牌名与原创短关键词、5 种牌阵、安全随机、seed 回放、实体/手工牌面 |
| 周易三钱 | stable | 逐枚硬币 transcript、六爻自下而上、64 卦 King Wen 映射、动爻变卦、seed 回放 |
| 梅花两数 | preview | 固定两数起卦与显式动爻；尚无体用、五行生克和应期引擎 |
| 六爻、奇门、吠陀占星 | planned | 已登记但没有引擎；调用会明确失败，不会让模型临时手排 |

“stable”只表示指定工程范围通过发布门槛；“qualified”表示存在必须向用户展示的口径条件。两者都不表示预测有效。完整缺口见 [docs/SCOPE.md](docs/SCOPE.md)。

## 为什么它能做得更深入

`0.2.0` 增加了一层窄而可审计的专业知识合同：

- [10 个来源记录](src/data/source-registry.mjs)覆盖固定计算实现、有限历史术语与紫微阶段解读顺序；
- [26 条机器可读规则](src/data/rule-registry.mjs)声明适用体系、claim scope、最低事实引用、来源束和允许的认识状态；
- `validate-reading` 不只检查 ID 是否存在，还检查规则是否适用于被引用的事实和 claim scope，并验证登记来源；
- 所有解释性 claim 都必须引用至少一条适用规则；没有规则覆盖时只能保留计算事实或标为未解决，不能把模型联想当成专业解读；
- `standard`、`deep` 与 `audit` 的后续选择都必须使用结构化动作，程序会区分沿用原盘与开始新一轮，并拒绝把后台字段塞进普通结果；
- `deep` 与 `audit` 要求不确定性摘要、推理摘要、替代解释和结构化下一步；
- `deep`/`audit` 的传统或解释性 claim 必须引用至少两个不同且实质相关的盘面事实根；同一事实对象的多个叶字段只算一个事实根，只有一个事实根时只能降到 `standard` 的 preliminary 观察，不能冒充深度综合；
- 实际建议必须小、可观察、可逆，而且即使传统前提不成立也仍然合理。

四个内部解读层级分别是：

- `quick`：直接答案、少量依据和一个实际限制；
- `standard`：单体系、单主题，三到五条结果优先的主要结论；
- `deep`：重建内部结构，展示支持因素、制约因素、反向读法和资料影响，但仍先呈现综合结果；
- `audit`：完整 fact/rule/source 映射、候选覆盖、冲突矩阵和机器可读附录。

来源状态 `verified` 只表示项目核对过该版本或文本记录及其声明范围，**不证明占卜预测有效，也不授权超出来源范围的断语**。验证器能拦截结构错误和一部分明显危险措辞，但它不是语义证明器或领域专家认证；`deep`/`audit` 通过后仍要做人工式叙事复核。完整要求见 [references/professional-reading.md](references/professional-reading.md) 和 [references/evidence-contract.md](references/evidence-contract.md)。

## 快速开始

要求 Node.js 20 或更新版本。三个出生盘引擎当前只对 `1900-01-01` 至 `2100-12-31` 标记为发布测试范围，超出会明确拒绝。

```bash
npm ci --ignore-scripts
npm run check
npm start
```

`npm start` 会打开中文交互向导，不需要先理解 JSON 或 profile ID。它会：

1. 先问想看人生整体、一个领域、当前问题，还是指定方法，再推荐合适入口；
2. 用中文收集当前方法真正需要的资料，并在格式错误时就地重试；
3. 先显示确认页，再让你开始、修改、取消或打开高级口径；
4. 未知时辰需要扫描时先显示进度提示；
5. 先给简洁结果起点，把资料影响和技术记录收进“为什么这样看”；
6. 同一问题沿用冻结结果；换成新的塔罗/易卦问题时明确提醒重新抽取，不会偷偷重抽；
7. 支持修改资料并重算、新建一轮、退出，任何输入处都可用 `q` 结束；
8. 在显示可能含原始生辰或私人问题的完整技术 JSON 前再次提醒隐私。

西占会在已知出生时间时直接询问可选经纬度；夏令时回拨的重复时刻会列出较早/较晚两个真实 UTC 瞬间供选择，跳时中不存在的钟表时间只允许修改。海外紫微会在确认计算前显示 `birthplace-civil` 日历日口径及其流派限定。

向导负责固定、可核对的排盘或抽取，不会在终端里凭空补写命运结论。在 Agent 中使用 `$fortune-teller` 时，会在同一冻结结果上先给综合答案，再继续追问；除非你主动改了关键资料或明确开始新问题，否则不会重排或重抽。

## 结构化计算

先查看实时能力，不要从 README 猜参数：

```bash
node scripts/fortune-teller.mjs methods --json
```

需要核对某个体系实际登记了哪些来源和规则时：

```bash
node scripts/fortune-teller.mjs sources --system bazi --pretty
```

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

输出不会覆盖已有文件；使用 `--output` 时目标文件必须尚不存在。八字输入必须保留出生地原始民用时间，不要为了满足 `+08:00` 限制自行换算。

Agent 生成结构化解读后，先校验再渲染普通用户结果：

```bash
node scripts/fortune-teller.mjs validate-reading --input reading.local.json --pretty
node scripts/fortune-teller.mjs render-reading --input reading.local.json
```

第二条命令只展示结论、分主题重点、现实小步骤、必要限制和后续选择，不显示 profile ID、warning code、事实 ID 或哈希。

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

压缩包不内置 `node_modules`；首次使用必须在解压目录完成固定依赖安装。不要让 Agent 在未获得许可时自行联网安装。

重启或刷新宿主后，可直接说：

```text
用 $fortune-teller 看我的人生整体，先讲事业、财富和长期关系。
用 $fortune-teller 看 2026 年处于什么阶段；先说结论，再讲为什么。
用 $fortune-teller 抽塔罗看我该怎样比较两个工作机会。
```

核心计算不依赖特定厂商的远程工具。`agents/openai.yaml` 只是 Codex 界面元数据；其他兼容 Agent Skills 的宿主仍可读取相同的 `SKILL.md` 和 JSON contract。

## 普通模型还是 Pro？

一般模型足以完成排盘、单体系标准解读、一个紫微目标日期的阶段主题、塔罗当前问题，以及引擎已聚合的时辰影响说明。只要主题聚焦、相互作用不多、规则和来源确实覆盖，一般模型也能完成一轮合格的 `deep` 解读；标准模式不是故意留一半内容逼升级。

Pro 或更大推理预算更适合长篇多因素综合、多体系/多 profile 冲突审计、逐条来源覆盖报告和第二遍对抗性复核。两档调用的是同一套本地事实：Pro 不会改变盘面，不会让传统预测变得更有效，**也不能补上缺失的规则、来源或专门计算模块**。详见 [references/model-tiers.md](references/model-tiers.md)。

## 输出与证据合同

每次计算返回：

- `facts_hash`：承诺 engine version、system、profile 与计算/抽取事实；
- `reproducibility_hash`：承诺除生成时间外的完整审计 envelope，包括规范化输入、warnings、sensitivity、引擎元数据与 Node/ICU/tzdb 运行时；
- `meta.time_runtime`：记录影响历史时区换算的运行环境；
- `profile`：明确日界、时间基础、宫制、逆位规则等口径；
- `sensitivity`：明确输入不足时哪些稳定、哪些变化、哪些不可用。

解释层使用 `calculation_fact`、`traditional_rule`、`interpretation`、`unresolved` 四层合同。`validate-reading` 会重算 envelope 哈希，检查系统/profile 绑定、fact ID、规则的路径与必要取值、登记来源、材料性 warning 承接、候选分母和禁止的概率/投票字段。它也对明确的宿命断言、孤注一掷财务建议、停止治疗等危险措辞设有保守底线，但不能理解自由文本的全部含义。

## 隐私与安全

- `src/` 不包含网络请求；安装依赖本身需要访问 npm registry。
- 工具默认不保存输入。不要把真实生辰、精确位置、问题或 replay seed 放入源码、fixture、issue 或截图。
- 不用本项目诊断疾病、判断怀孕、预测死亡、认定犯罪、裁决关系忠诚、指导投资/法律行动或验证被害妄想。
- seed 是回放凭据，不是密码学秘密，也不是“灵验度”指标。
- 第三方资料只使用许可证允许的本地依赖；来源注册表保存窄范围元数据与链接，不复制历史文本或竞品知识库。

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

本项目不以方法数量取胜。它可以有证据地争取在较小支持范围内做好：失败关闭的时间/历法边界、未知时辰处理、随机回放、统一 envelope、规则适用性验证、窄来源追踪、专业深读合同和连续中文交互。

它仍明显不如头部项目的地方包括方法数量、完整古籍知识库、图盘、MCP/HTTP API、外部用户规模和独立领域专家复核；八字旺衰/用神/大运、西占更多宫制与推运仍未实现，紫微目前也只到本命—大限—流年的结构性阶段主题，不含流月/日/时、应期或必然事件。因此这里不作“整体最好”或“更准”的宣传。逐项资料和许可边界见 [docs/COMPETITOR_AUDIT.md](docs/COMPETITOR_AUDIT.md)，可复核的比较规则见 [BENCHMARK.md](BENCHMARK.md)。

## 许可证

项目自有代码采用 [MIT License](LICENSE)。依赖分别使用 MIT、ISC 和 Apache-2.0，完整归属见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
