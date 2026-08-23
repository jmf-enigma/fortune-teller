# 竞品与开源生态审计

审计日期：2026-08-23

## 1. 审计口径

本审计把项目分为三类：

1. **真 Agent Skill**：仓库中存在可定位的 `SKILL.md`，并有明确资源或工具路由；
2. **Skill + engine**：除 `SKILL.md` 外，还有确定性脚本、CLI、MCP、API 或库负责机械排盘；
3. **可包装引擎**：没有 `SKILL.md`，但有稳定计算 API，适合由本项目封装。

仅有提示词或角色设定、让模型手工排盘的项目，不能和确定性 engine 等量齐观。GitHub star、commit 数和自报测试数只用于判断生态成熟度，不能证明术数预测有效。

许可证判断以仓库当前可见的 `LICENSE` 或项目明确许可说明为准。**没有许可证不等于公共领域**；这类项目可以研究接口与功能，但不能复制代码、提示词、资料或数据表。

## 2. 第一梯队：值得持续比较

### 2.1 ShousenZHANG/chinese-fortune

- 仓库：[ShousenZHANG/chinese-fortune](https://github.com/ShousenZHANG/chinese-fortune)
- Skill：[根目录 `SKILL.md`](https://github.com/ShousenZHANG/chinese-fortune/blob/main/SKILL.md)
- 语言与许可：Python；MIT。
- 调研快照：约 4 stars、2 forks；最后 push 2026-07-17。
- 覆盖：八字、紫微斗数、周易、六爻、梅花、奇门、大六壬、小六壬、风水、黄历、姓名、塔罗等 20+ 方法。
- 工程证据：README 列出 15 个 Python 脚本、23 份 references、Claude/OpenAI Agent 安装入口，并自报 1013 tests（self-reported，未由本项目复现）。

强项：

- 单个 Skill 的路由覆盖非常完整；
- 多个机械计算交给脚本，而非让模型心算；
- 有测试、发布校验和高风险主题边界的设计意识；
- 对 Codex/Claude 类宿主的安装路径明确。

限制：

- 风水、面相、手相等部分主要是文档解读，不是同等成熟的确定性引擎；
- 单一 Skill 触发词非常宽，可能过度触发；
- 低 star 不等于质量低，但外部使用反馈仍有限。

对本项目的含义：它是“轻量一体化 Skill”最直接的功能竞品。本项目不应先追方法数量，而应先让每个 `stable` 方法通过独立发布门槛。

### 2.2 dhicoc/chinese-traditional-wisdom-skill

- 仓库：[dhicoc/chinese-traditional-wisdom-skill](https://github.com/dhicoc/chinese-traditional-wisdom-skill)
- Skill：[根目录 `SKILL.md`](https://github.com/dhicoc/chinese-traditional-wisdom-skill/blob/main/SKILL.md)，另有 `RULES.md`。
- 语言与许可：TypeScript 主引擎，含 Python 交叉验证依赖；MIT。
- 调研快照：约 11 stars、4 forks、505 commits；仓库声明 stable v1.0.0。
- 覆盖：八字、紫微、六爻、梅花、奇门、大六壬、太乙、皇极经世、黄历、姓名、玄空、八宅等。
- 工程证据：自报 32 个本地 CLI、19 项 Skill 行为契约（self-reported），并提供本地 Dashboard、fixtures、claims 校验和第三方通知。

强项：

- 明确区分“本地计算事实、传统解释、现实建议”；
- 对真太阳时证据、显式民用时间选择和未知输入的处理较审慎；资料不足会失败关闭而非静默降级；
- 本地优先、工具 schema、标准 fixture、版本和数据来源治理较完整；
- 明确声称支持 Claude Code、Codex CLI、Cursor、Cline、OpenClaw。

限制：

- 安装栈较重，要求 Node 24、pnpm 和可选 Python 依赖；
- 方法广度大，需要逐项审计 `local-exact`、`local-approx`、演示和民俗体验的边界；
- 项目仍较新，外部采用量有限。

对本项目的含义：这是“可审计、本地、统一工具 envelope”方向最强的直接参照。本项目应在更轻的 Node 20 基础上保持同样清楚的事实—解释边界。

### 2.3 Horace-Maxwell/horosa-skill

- 仓库：[Horace-Maxwell/horosa-skill](https://github.com/Horace-Maxwell/horosa-skill)
- Skill：[`skills/horosa-agent/SKILL.md`](https://github.com/Horace-Maxwell/horosa-skill/blob/main/skills/horosa-agent/SKILL.md)
- 语言与许可：Python 为主，含 JavaScript runtime；AGPL-3.0-only。
- 调研快照：约 306 stars、57 forks；最后 push 2026-08-17。
- 覆盖：自报 92 个中西术数/占星技法（self-reported），含八字、紫微、奇门、大六壬、太乙、六爻、河洛、神数、老黄历、通书择日、西占与多种推运。
- 工程证据：离线 MCP + CLI、doctor、输入/输出 contract、artifact audit；README 自报 435 tests passed（self-reported，未由本项目复现）。

强项：

- 覆盖远超本项目；
- 离线优先，适合保护出生资料；
- MCP、CLI、导出审计和大型方法目录形成完整产品套件；
- 使用若干独立 MIT 引擎，并列出许可来源。

限制：

- 体量与依赖复杂度高；
- AGPL 对网络服务和再分发有强 copyleft 要求；
- “92 个技法”是覆盖声明，不表示每项有相同深度，也不表示预测准确。

对本项目的含义：覆盖面短期无法追平。本项目应以更小的可信核心、统一结果 schema、种子回放和明确敏感性分析形成差异，而不是模仿其目录规模。

### 2.4 Brhiza/mingyu

- 仓库：[Brhiza/mingyu](https://github.com/Brhiza/mingyu)
- Skill：[`public/skills/aov-mingyu-api/SKILL.md`](https://github.com/Brhiza/mingyu/blob/main/public/skills/aov-mingyu-api/SKILL.md)
- 语言与许可：TypeScript/Vue/Node；截至审计未在根目录看到明确 `LICENSE`，因此不得假定可复制。
- 调研快照：约 348 stars、93 forks、598 commits；2026-08-22 仍有提交。
- 覆盖：八字、紫微、六爻、梅花、奇门、大六壬、小六壬、黄历、八宅、玄空、太乙、皇极经世、七政四余、西占、塔罗等。
- 工程证据：公开 API、MCP Server、`mingyu-core` npm 包、Agent Skill；Skill 中有详细 endpoint、参数和输出模式路由。

强项：

- API、MCP、npm core、网页和 Skill 的入口完整；
- 活跃维护，接口文档细；
- 排盘和提示词生成可分开调用；
- 对时辰未知、真太阳时、流派参数和分页有显式契约。

限制：

- 当前许可证不明确，是采用代码或内容的硬阻碍；
- 默认 Skill 依赖 `aov.cc` 远程 API，完整生辰和地点可能离开本机；
- 远程可用性、服务端版本漂移和隐私需要独立审计。

对本项目的含义：它是“在线服务集成”最强的参照。本项目的目标应是默认离线和版本可锁；未来即使加 API/MCP，也不能让远程接口成为唯一计算路径。

### 2.5 ml8s/liki

- 仓库：[ml8s/liki](https://github.com/ml8s/liki)
- Skills：[`skills/`](https://github.com/ml8s/liki/tree/main/skills) 下的 `liki-bazi`、`liki-divination`、`liki-fengshui`、`liki-naming`。
- 语言与许可：Python 工具与 JSON-RPC engine；MIT。
- 调研快照：约 39 stars、3 forks；当前 README 标示 v2.4.0。
- 覆盖：八字+紫微、六爻/奇门/黄历、玄空/八宅、姓名学。
- 工程证据：可用 `npx skills add` 分包安装；自报 46 张规则表、590 条断语和 MingLi-Bench 回归流程（均 self-reported）。

强项：

- 按任务拆成四个 Skill，触发边界优于一个超宽路由器；
- 规则、流程、工具分层较清楚；
- 承认其 benchmark 仍有限，没有宣称 100% 准确。

限制：

- 计算依赖外部 `liki-engine` JSON-RPC，需继续核验本地部署和网络行为；
- 规则表的来源、不同流派的裁决与 benchmark 题目代表性仍需专项审计；
- 自报 benchmark 衡量的是题库表现，不是现实预测效度。

对本项目的含义：分域 Skill 和工具契约值得比较；本项目不复制其规则表或提示词，只比较结构与可复现流程。

## 3. 专项 Skill

### 3.1 梅花易数：muyen/meihua-yishu

- 仓库：[muyen/meihua-yishu](https://github.com/muyen/meihua-yishu)
- Skill：[根目录 `SKILL.md`](https://github.com/muyen/meihua-yishu/blob/main/SKILL.md)
- 语言与许可：Python；CC BY-NC-SA 4.0。
- 调研快照：约 195 stars、65 forks；最后 push 2026-08-09。
- 组成：确定性 `meihua_calc.py`，以及 64 卦、384 爻、体用、互变错综、应期和案例 references。

判断：这是 `meihua` preview 的直接专项参照。其许可禁止商业使用；本项目只能做 clean-room 行为比较，不能复制其 references、案例或提示词。

### 3.2 六爻：Johnson-Jia/liuyao-divination

- 仓库：[Johnson-Jia/liuyao-divination](https://github.com/Johnson-Jia/liuyao-divination)
- Skill：[`skill/liuyao-divination/SKILL.md`](https://github.com/Johnson-Jia/liuyao-divination/blob/main/skill/liuyao-divination/SKILL.md)
- 语言与许可：Python；MIT。
- 调研快照：约 1 star；最后 push 2026-07-17。
- 组成：Python 排盘引擎处理纳甲、六亲、六神、世应、空亡、暗动、化进退、三合墓库，Skill 负责取用神与解读流程。

判断：架构方向正确，适合作为 `liuyao` planned 的行为参照；但项目新、社会验证少，采用前必须运行自己的 golden fixtures 和边界测试。

## 4. 可包装的成熟计算引擎

### 4.1 SylarLong/iztro

- 仓库：[SylarLong/iztro](https://github.com/SylarLong/iztro)
- 类型：无标准 `SKILL.md` 的 TypeScript 紫微排盘引擎。
- 许可：MIT。
- 调研快照：约 4.1k stars、662 forks；v2.6.0 于 2026-08-14 发布，2026-08-19 仍有提交。

它是本项目当前 `ziwei` engine 的上游依赖。成熟度来自计算库生态，不自动成为本项目自己的验证证据。本项目必须固定版本、保留 profile，并对封装结果运行 parity fixtures。

### 4.2 6tail/lunar-python

- 仓库：[6tail/lunar-python](https://github.com/6tail/lunar-python)
- 类型：无标准 `SKILL.md` 的 Python 历法/八字/黄历库。
- 许可：MIT。
- 调研快照：约 651 stars；最近提交 2025-10-15。
- 能力：农历、节气、八字、五行、十神、宜忌、吉神凶煞、建除十二神等。

它适合用于独立差分或 Python 生态包装，但本项目当前依赖的是 `lunar-typescript@1.8.6`。两个库的差异只能在相同 profile 下比较，不能把不同口径简单判为一方错误。

### 4.3 kentang2017/kinqimen

- 仓库：[kentang2017/kinqimen](https://github.com/kentang2017/kinqimen)
- 类型：Python 奇门遁甲引擎，无标准 Agent Skill。
- 许可：MIT。
- 调研快照：约 138 stars、56 forks。
- 能力：金函玉镜日家奇门、拆补/置闰时家奇门、刻家奇门。

它可作为未来 `qimen` engine 候选之一，但必须先固定支持的排盘口径、输入范围和结构化输出；不能直接把库中所有流派合并为一个不带 profile 的“奇门结果”。

## 5. 高关注但暂不作为采用基线

### FANzR-arch/Numerologist_skills

- 仓库：[FANzR-arch/Numerologist_skills](https://github.com/FANzR-arch/Numerologist_skills)
- 真 Skill 路径：[`bazi/SKILL.md`](https://github.com/FANzR-arch/Numerologist_skills/blob/main/bazi/SKILL.md)、[`ziwei-doushu/SKILL.md`](https://github.com/FANzR-arch/Numerologist_skills/blob/main/ziwei-doushu/SKILL.md)、[`qimen-dunjia/SKILL.md`](https://github.com/FANzR-arch/Numerologist_skills/blob/main/qimen-dunjia/SKILL.md)。
- 调研快照：约 955 stars、165 forks；最后 push 2026-08-03。
- 许可：截至审计未见明确许可证。

奇门模块有确定性 Python CLI；八字和紫微主要依赖 references 与模型逐步推算。它适合研究提问顺序和失败边界，不适合当作可靠八字/紫微计算引擎，也不能因 star 多而忽略许可证。

### voidforall/fengshui.skill

- 仓库：[voidforall/fengshui.skill](https://github.com/voidforall/fengshui.skill)
- Skill：根目录 `SKILL.md`。
- 调研快照：约 104 stars、20 forks，但只有一次提交。
- 许可：截至审计未见明确许可证。

它覆盖玄空、八宅与择日，但主要是 persona、references 和示例，没有同等程度的确定性风水引擎。适合作为范围清单，不适合作为代码或知识资产来源。

### amliuyong/skills-baby-name

- 仓库：[amliuyong/skills-baby-name](https://github.com/amliuyong/skills-baby-name)
- Skill：根目录 `SKILL.md`。
- 许可：截至审计未见明确许可证。

它把八字、五格三才和命名评分组合成报告，但项目很新、采用量很低。姓名学若进入本项目，应重新定义透明评分和文化参考边界，不复制其权重、字库或报告模板。

## 6. 本项目当前可辩护的差异化

以下八项已经在当前 `0.1.0` 本地候选的源码和干净 archive 中按 [BENCHMARK.md](../BENCHMARK.md) 与 [RELEASE_AUDIT.md](RELEASE_AUDIT.md) 验证。它们只支持具体工程维度的比较，不支持“整体最好”或“更准”的结论：

1. **统一 envelope**：中式、西式和随机占卜使用同一结果骨架、版本字段和错误语义；
2. **可复现哈希**：计算事实可复核，生成时间不污染事实哈希；
3. **安全随机与 replay**：默认安全随机并只返回 seed commitment；用户显式选择时可回显并自行保管 replay seed；
4. **不确定性优先**：未知时辰、地点和 profile 不静默填值，输出结构化 sensitivity；
5. **默认本地**：出生资料不需要发送给第三方 API；
6. **事实—解释—建议分层**：不允许叙述层补造盘面事实；
7. **小而可信**：每个标为 `stable` 的方法必须单独达到发布级门槛，不用一个巨大方法清单掩盖空实现；
8. **中西一致的工程纪律**：同一审计规则适用于八字、紫微、西占、塔罗和易卦，而不是为某体系降低证据标准。

## 7. 明确落后或尚未覆盖的部分

与上述竞品相比，本项目目前仍明显缺少：

- 可发布的六爻纳甲和奇门遁甲引擎；
- 大六壬、太乙、金口诀、小六壬、黄历择日、风水、姓名学；
- 吠陀占星、更多西占宫制、推运、合盘与择时；
- MCP、HTTP API、Dashboard、图盘、HTML/PDF 报告；
- 大规模知识库、古籍出处索引和分流派解释资料；
- 与第一梯队相当的累计测试数量、维护历史和外部使用反馈。

这些差距应公开记录。短期目标不是宣称“全能”或“更准”，而是让已支持的少数方法在可复现、隐私、失败诚实性和跨方法 schema 上更容易审计。

## 8. Clean-room 规则

- 不复制无许可证仓库的代码、prompt、references、数据表或报告模板；
- 不复制 CC BY-NC-SA 项目的材料到 MIT 发行包；
- AGPL 项目只做功能与接口研究，除非项目整体愿意遵守相应义务；
- MIT 依赖也必须保留版权与许可通知；
- 可比较公开行为、输入输出 contract 和文档化方法，但本项目独立实现测试、schema 与叙述规则。
