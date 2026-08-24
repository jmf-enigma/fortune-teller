# 竞品与开源生态审计

审计日期：2026-08-24

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

对本项目的含义：这是“可审计、本地、统一工具 envelope”方向的主要直接参照之一。本项目应在更轻的 Node 20 基础上保持同样清楚的事实—解释边界。

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
- 语言与许可：TypeScript/Vue/Node；整仓各包许可必须逐包判断。固定 commit `bd6963b9b562cbef77c50227b625c0d3e7b36021` 的 `packages/core` 明确为 MIT，紫微 pattern detector 可在保留许可和归属后适配；这不等于整仓所有内容都可复制。
- 调研快照：约 348 stars、93 forks、598 commits；2026-08-22 仍有提交。
- 覆盖：八字、紫微、六爻、梅花、奇门、大六壬、小六壬、黄历、八宅、玄空、太乙、皇极经世、七政四余、西占、塔罗等。
- 工程证据：公开 API、MCP Server、`mingyu-core` npm 包、Agent Skill；Skill 中有详细 endpoint、参数和输出模式路由。

强项：

- API、MCP、npm core、网页和 Skill 的入口完整；
- 活跃维护，接口文档细；
- 排盘和提示词生成可分开调用；
- 对时辰未知、真太阳时、流派参数和分页有显式契约。

限制：

- 只有逐包明确许可的固定文件可采用；网页、提示词、其他包和知识内容不能由 `packages/core` 的 MIT 自动外推；
- 默认 Skill 依赖 `aov.cc` 远程 API，完整生辰和地点可能离开本机；
- 远程可用性、服务端版本漂移和隐私需要独立审计。

对本项目的含义：它是“在线服务集成”方向的主要参照之一。本项目的目标应是默认离线和版本可锁；未来即使加 API/MCP，也不能让远程接口成为唯一计算路径。

### 2.5 ml8s/liki

- 仓库：[ml8s/liki](https://github.com/ml8s/liki)
- Skills：[`skills/`](https://github.com/ml8s/liki/tree/main/skills) 下的 `liki-bazi`、`liki-divination`、`liki-fengshui`、`liki-naming`。
- 语言与许可：Python 工具与 JSON-RPC engine；MIT。
- 调研快照：约 39 stars、3 forks；当前 README 标示 v2.4.0。
- 覆盖：八字+紫微、六爻/奇门/黄历、玄空/八宅、姓名学。
- 工程证据：可用 `npx skills add` 分包安装；自报 46 张规则表、590 条断语和 MingLi-Bench 回归流程（均 self-reported）。

强项：

- 按任务拆成四个 Skill，触发边界更窄，也更容易分别审计；
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

## 6. 结果体验专项复审

用户并不把 `profile`、warning、候选扫描或哈希当作“结果”。因此本轮又实际打开代表性 Skill 的主说明和输出流程，专门比较它们怎样把计算变成用户能用的答案。这里借鉴的是公开的交互模式与产品结构；不复制无许可或不兼容许可项目的提示词、规则表、数据或报告文本。

### 可独立吸收的设计

- [chinese-fortune](https://github.com/ShousenZHANG/chinese-fortune/blob/main/SKILL.md) 会先收集用户关心的事业、感情、财富等议题，并要求把强结论、阶段和盘面依据放进结果。可取之处是“先明确议题、弱结论降级、术语和现代解释分开”。其按既往事件命中反馈再调整用神/格局的闭环容易产生后见偏差和选择性验证，本项目不采用这种自适应校准；既往事件只作非正式反馈，正式核验只接受在观察窗口开启前冻结的前向假设。
- [chinese-traditional-wisdom-skill](https://github.com/dhicoc/chinese-traditional-wisdom-skill/blob/main/SKILL.md) 明确禁止向用户原样回显完整 envelope，并要求影响结果的当前日期或年份由 UI 显式传入，不由 CLI 隐式读取。本项目据此复核了自己的方向：审计字段保留在后台；目标日期必须进入冻结输入。
- [horosa-skill](https://github.com/Horace-Maxwell/horosa-skill/blob/main/skills/horosa-agent/SKILL.md) 的报告接口把内容拆成 `executive_summary`、`answer_text`、分析段、建议和限制。可取之处是先给 executive answer，再把技术卡放在尾注；本项目独立实现自己的 result-first renderer，不复制其 AGPL 代码或报告模板。
- [Numerologist_skills 的紫微 Skill](https://github.com/FANzR-arch/Numerologist_skills/blob/main/ziwei-doushu/SKILL.md) 先问“整体、事业、感情、财运还是流年”，再问命盘与出生资料，并把本命底色→当前大限→流年触发作为输出顺序。这种目标优先和动态层次值得采用；但该仓库许可不明确，且八字/紫微部分主要依靠模型按 reference 推算，本项目不能复制材料，也不把模型手排当确定性事实。
- [majiayu000 registry 的 Tarot Skill](https://github.com/majiayu000/claude-skill-registry/blob/main/skills/testing/tarot/SKILL.md) 把“问题类型、牌阵、实体/数字抽牌”做成短向导，并允许围绕具体问题生成上下文牌位。可取之处是先确定真实问题、让牌位服务问题、结果位置使用“现状/行动/按当前路径的结果”；本项目仍坚持牌由本地安全随机或用户实体牌决定，模型不能选牌。
- [daman-ovo-0404/tarot-skill](https://github.com/daman-ovo-0404/tarot-skill) 强调反巴纳姆、牌间关系和本周可执行行动。可取之处是多牌必须形成支持/张力/递进/转折，建议要具体；本项目不采用其固定比例阈值、`time_factor` 或把 seed 放在普通结果首页的做法。
- [muyen/meihua-yishu](https://github.com/muyen/meihua-yishu/blob/main/SKILL.md) 强调每次结果给出可行动的下一步，并把“理、象、数”分层。可取之处是建议必须能在现实中独立成立；但其 CC BY-NC-SA 许可与本项目 MIT 发行目标不兼容，且取象、外应照片和应期等能力不能靠模型临时补进本项目。
- [Johnson-Jia/liuyao-divination](https://github.com/Johnson-Jia/liuyao-divination/blob/main/skill/liuyao-divination/SKILL.md) 把机械纳甲和取用神/解释分开。这个分层仍是未来六爻模块的正确工程方向；当前没有通过本项目 fixture 和来源门槛，继续保持 planned。

### 本轮形成的产品决定

1. 普通入口先问“想看什么”，不先问“选哪个术数”。
2. 六个已发布体系都必须有自己的封闭计算→裁决→白话结果链；紫微和八字保留更深的命盘/阶段结构，西占、塔罗、周易和梅花也不能只返回符号清单。
3. 用户结果固定为：先说结论→阶段时间轴（有则显示）→分主题卡片（结论/白话/依据/改判/提醒）→现实核对→不确定性→下一步；术语后置且正文拆成可扫读要点。
4. `profile`、warning code、候选/扫描数、内部完整性字段、版本、fact/rule/source ID 和 JSON 全部退到“依据与核对（高级）”或技术记录；哈希不作为准确性或引擎来源卖点。
5. 所有目标日期显式输入；正式核验只接受窗口开始前冻结的前向结论，既往事件只作非正式反馈，不按用户反馈改盘或只统计命中。
6. 多牌必须有关系综合且决策牌阵不替用户宣布赢家；周易固定多动爻选择协议但不伪造卦爻辞；梅花只在有固定输入时做体用、互卦和前后生克，不补时间和应期；紫微目标日期按本命底色→大限四动态宫环境→流年四动态宫触发展开，阶段四化仍只取主题槽。
7. 阅读先绑定到精确计算，每条 claim 再绑定到精确事实路径和值；引用一条无关的真事实不能替假星宫关系背书。
8. 解读档案和规则包登记固定；自定义混合口径不自动继承“已复核”状态。

本轮还把“多体系综合”单独列为反例：六个体系各自回答、各自展示依据和边界，不把重复主题当作投票，不计算一致度，不宣布哪一门赢。当前问题类方法必须绑定同一个规范化问题；不同问题的牌或卦不能拼成一个综合结论。

### 专业性与“准确”机制复审

本轮没有按断法数量给竞品排名，而是专门追踪哪些机制能减少三类错误：算错、说错本门规则、以及听完用户经历再改口。结论如下：

- `chinese-traditional-wisdom-skill` 的复核与运行时口径硬门值得吸收：声明的 convention 必须真的约束运行，不能只写在 README。本项目进一步要求固定引擎重算或结构复核，并把每条阅读绑定到精确 calculation 和事实值。
- `liuyao-engine` 和 `liuyao-divination` 的“机械排盘与取用/解释分层”方向正确。未来六爻仍应先把装卦、纳甲、六亲、世应等做成可独立核对的事实层，再谈断语；当前不靠模型补齐。
- `horosa-skill` 的 executive answer 与技术附录分层有利于使用，但报告完整不等于规则正确。本项目保留结果优先，同时给普通用户看具体正反核对条件。
- `chinese-fortune` 的既往事件校准能增强“像本人”的体验，却可能产生后见偏差。本项目明确不按反馈调整时辰、用神、格局、规则或原句；正式检验只接受事先冻结的前向项目。
- `meihua-yishu` 的理—象—数层次和行动建议有可取之处，但外应照片、模型取象与应期若没有固定输入和裁决规则，会给事后解释留下过大自由度；本项目不采用这种开放式验证。

### 八字与紫微专项深度复审

在综合型项目之外，本轮又逐页检查了四个更接近“专业命理师工作流”的专项项目。吸收的是可独立验证的结构，不复制其代码、断语库或报告文字：

- [NickY4ng/bazi-skill](https://github.com/NickY4ng/bazi-skill/blob/main/SKILL.md) 的优点是从输入到身强、用神、格局、大运流年和人生领域一次走完，普通用户容易得到完整报告；问题是“月令透出→本气→扶抑→调候→病药→通关”的单一路线会把不同取用视角压成一个答案，很多判断仍由长提示词完成。这里吸收完整问答顺序和结果覆盖，不吸收单一优先级替代复合成败条件的做法。
- [Minervaowl7/bazi-pro](https://github.com/Minervaowl7/bazi-pro/blob/main/SKILL.md) 的确定性排盘层、确定性规则层、模型解释层三分法，以及古籍检索、候选返回和边界回归很值得借鉴；但其本气/中气/余气、月令等采用项目选定的数值权重，历史事件闭环也可能把后见信息带回原判断。本项目吸收算析分离、候选与反例，暂不采用未独立验证的固定权重，也不按用户过往经历回调格局或喜忌。
- [qianye-wuyu/yueyuan-bazi](https://github.com/qianye-wuyu/yueyuan-bazi/blob/main/SKILL.md) 在本轮八字专项中提供了最清楚的方法论骨架：旺衰用条件变量而非伪百分比，规则标为核心/流派/启发式，本命、大运、流年分层，并要求假设、证据、反证和降级。这里直接促成了本项目的强弱竞争假设、复合成格路线、`screening_only` 和五类取用分轨；没有闭合轻重、位置、制化的条目仍不自动升级成败救应，启发式事件对应也不进入当前结果。
- [Linden-TR/ziwei-doushu-skill](https://github.com/Linden-TR/ziwei-doushu-skill) 把中州作为主线并分列三合、飞星、钦天四化、河洛，公开 45 个格局及成败救应框架，体现了“先全局、再星宫四化、再运限、最后格局”的专业顺序。本项目吸收的是流派分开、完整三方四正与本命→大限→流年分层；没有吸收一份未经逐条复算的 45 格局文本。通用紫微候选状态机也不得接受调用方随意命名的格局或重复一条事实冒充三层证据；在固定候选、精确 predicate 与真实层级绑定完成前，它只能是实验接口，公开用户结果仍只走 `R-ZW-007/008/009` 三条封闭路径。
- [Brhiza/mingyu 固定 core commit](https://github.com/Brhiza/mingyu/tree/bd6963b9b562cbef77c50227b625c0d3e7b36021/packages/core) 提供了本轮最有价值的可执行紫微增量：55 条可复放格局条件和 32 条明确拒绝边界。其 MIT 许可允许在保留归属后适配。本项目保留条件机械结构与固定出处 locator，删除传统结果断语和来源引文；普通结果改用中性标签，传统名后置，且整个格局账本不投票、不评分、不覆盖五主题主结论。

这次专项复审改变了一个关键目标：专业度不再等同于“报告更长”或“术语更多”，而是同一命盘在固定流派下，候选为什么成立、哪里受损、救应是否对应同一个病、岁运怎样触发原局条件，都必须能被计算重新推出；推不出的地方必须停在候选或未决。

0.6.0 对这条目标的具体落实是：八字保留全部月令候选和季节/根气/透干三轴，增加三个结果优先专题，但把“十神同见”降格为线索，岁运不能凭空生成原局主题；紫微在五主题和完整三方四正之外，适配 Mingyu 固定 MIT core 的 55 条机械条件与 32 条拒绝边界，并把它们限制为补充证据。由此可以说本项目在**当前已安装路线的闭合度、拒绝边界和普通人可读性**上更强；仍不能说八字知识总量、术数广度或现实预测效度总体超过 Mingyu。

截至这次审计，没有发现被检查仓库公开了足以证明现实预测效度的预注册、盲法、样本外或独立复现实验。因此，“更专业”在本项目中只能先指更少的计算/绑定/叙述漏洞、更明确的门派边界和可复核反例，不能写成“已经证明更准”。本项目的正式核验也只接受前向冻结；已知事件回顾不进入正式评分。

### 从其他高质量 Agent Skills 吸收的交互纪律

本轮也复审了本地的 puzzle closed-loop、研究选题和论文评审类 Skills。它们与术数无关，但有三类成熟做法可直接迁移：

- **冻结状态再继续**：像实体拼图助手保存当前板面一样，本项目冻结一次排盘、牌面和用户问题；后续展开只读这一状态。只有明确修正输入或开始新问题才重算。
- **前向核验而不是追着反馈改口**：像研究流程先写判断和淘汰标准一样，正式项目必须在观察窗口开启前冻结，再同时登记支持、反驳和说不清；已知事件只作非正式反馈，不利用反馈挑时辰或改规则。
- **后台严格、前台简洁**：像专业评审 Skill 把内部 ledger 与交付意见分开一样，本项目保留规则、来源、warning、候选账本和次要完整性字段，但普通用户先看到综合答案和现实下一步。内部哈希不代表准确，也不能认证引擎来源。

这些模式已经转化为交互回归测试：目标优先路由、紫微目标日期的有/无时辰分支、技术字段渐进披露、塔罗换问题前明确重抽，以及关键资料变化后旧解读失效。

## 7. 本项目当前可辩护的差异化

以下各项是 `0.6.0` 需要按 [BENCHMARK.md](../BENCHMARK.md) 与 [RELEASE_AUDIT.md](RELEASE_AUDIT.md) 逐项复核的工程差异。它们只支持具体维度的比较，不支持“整体最好”或“更准”的结论：

1. **统一 envelope**：中式、西式和随机占卜使用同一结果骨架、版本字段和错误语义；
2. **引擎重算与结构复核**：同一固定输入优先由固定版本引擎重算，用户给定牌卦至少做结构复核；内部哈希只辅助发现记录变化；
3. **安全随机与 replay**：默认安全随机并只返回 seed commitment；用户显式选择时可回显并自行保管 replay seed；
4. **时间边界失败关闭**：八字只在实际偏移为 `+08:00` 的受测历法参考范围放行，不通过手工换算伪装海外支持；
5. **不确定性优先**：未知时辰、地点和 profile 不静默填值，输出结构化 sensitivity；
6. **来源—规则—事实适用性**：窄来源与规则公开登记，validator 检查 scope、事实路径、认识状态与来源束；
7. **深读不是关键词堆叠**：`deep`/`audit` 强制推理摘要、替代解释、不确定性与结构化后续操作；
8. **结果优先与冻结会话**：先问用户目标，普通路径隐藏 profile ID；同一问题复用原盘/原牌，换问题明确重抽，修改关键资料后旧解读作废；
9. **默认本地**：出生资料不需要发送给第三方 API；
10. **小而可信**：每个标为可用的方法必须单独达到发布级门槛，不用一个巨大方法清单掩盖空实现；
11. **六体系类型化技术事实**：八字、紫微、西占、塔罗、周易和梅花的具体技术断言使用匹配的类型化绑定，而不是只靠自由文本；
12. **中西一致的工程纪律**：同一审计规则适用于全部已发布/预览体系，而不是为某体系降低证据标准；
13. **紫微主题语义门**：五个主题使用完整三方四正和同主题阶段单元，明确写出的星—宫与四化关系必须和盘面相符；
14. **可反驳而非只求像**：解释同时给支持条件和反例，正式前向核对保留支持、反驳与不清楚，不删除不利结果；自由叙事仍为 `not_machine_verified`。
15. **六体系结果层**：统一 `adjudicate` 把固定计算送到各自裁决器；八字重跑原局—大运—流年登记路线，西占读主题宫/宫主/古典状态，塔罗读牌位与组合，周易执行冻结动爻协议，梅花读体用/互卦/前后关系，紫微使用既有封闭主题层。
16. **多体系不投票**：相同问题可并列显示多门结果，但不把“都提到变化”变成独立验证、准确率或赢家。

## 8. 明确落后或尚未覆盖的部分

与上述竞品相比，本项目目前仍明显缺少：

- 可发布的六爻纳甲和奇门遁甲引擎；
- 大六壬、太乙、金口诀、小六壬、黄历择日、风水、姓名学；
- 吠陀占星、更多西占宫制、推运、合盘与择时；
- MCP、HTTP API、Dashboard、图盘、HTML/PDF 报告；
- 大规模知识库、完整古籍出处索引和分流派解释资料；当前只有 16 个窄来源记录、38 条适用性规则，以及刻意收窄的六体系裁决包；
- 与第一梯队相当的累计测试数量、维护历史和外部使用反馈。
- 独立命理专家对固定 commit/rule-pack 的盲审，以及预注册的现实预测效度研究。

这些差距应公开记录。对 Mingyu 的结论尤其要具体：本项目已直接吸收其许可允许、可重放的紫微条件模块，并在普通人可读结果、空宫语义、未知资料失败关闭、格局不投票和默认本地隐私上加了更严格边界；Mingyu 在八字知识总量、术数广度、产品入口和长期维护体量上仍更强。没有依据把局部工程优势写成“总体超过 Mingyu”或“预测更准”。

## 9. Clean-room 规则

- 不复制无许可证仓库的代码、prompt、references、数据表或报告模板；
- 不复制 CC BY-NC-SA 项目的材料到 MIT 发行包；
- AGPL 项目只做功能与接口研究，除非项目整体愿意遵守相应义务；
- MIT 依赖也必须保留版权与许可通知；
- 可比较公开行为、输入输出 contract 和文档化方法，但本项目独立实现测试、schema 与叙述规则。
