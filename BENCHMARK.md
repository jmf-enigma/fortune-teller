# Fortune Teller 可核验基准

更新日期：2026-08-23

## 1. 基准目的

本基准只衡量软件与 Agent Skill 的工程属性：排盘是否可复现、输入口径是否明确、输出是否可追溯、随机过程是否可回放、错误是否显式、隐私与许可证是否清楚。它不衡量、也不声称任何术数对现实事件具有预测效度。

竞品仓库中的测试数量、方法数量、准确率或 benchmark 分数，如果没有在本仓库的隔离环境中复现，一律标记为 **self-reported（项目自报）**，不得作为已验证结论引用。

## 2. 当前基线说明

`src/core/methods.mjs` 中的 `stable`、`preview`、`planned` 是产品范围标签，不自动等于“已经通过发布验证”。某个方法只有同时满足以下条件，才能在发布说明中称为可用：

1. 有可执行入口，而不只是方法注册项或提示词；
2. 有固定版本的计算依赖或本地实现；
3. 有输入 schema、输出 schema 和错误 schema；
4. 通过本文件相应的确定性、边界、隐私和打包测试；
5. 输出能区分计算事实、传统解释和现实建议；
6. 第三方依赖与数据的许可证已记录。

当前 `0.1.0` 本地发布候选已经完成实测，而不是从注册表状态反推：源码与最终干净解压目录均运行完整检查；73 项自动测试全部通过；doctor、release check、官方 Skill validator、生产依赖 audit 和 npm 包预演通过。另有独立的晚子时穷举审计、零上下文 Skill 前向测试和畸形 JSON/CLI fuzz。可复核命令、环境和限制见 [docs/RELEASE_AUDIT.md](docs/RELEASE_AUDIT.md)。

在声明范围内，八字、紫微、西占 whole-sign、塔罗和周易三钱达到本文件的本地 releasable 门槛；梅花因功能深度不足继续标为 preview，六爻、奇门和吠陀占星继续标为 planned。这里的 releasable 仍只评价工程属性，不评价预测效度。Node 20/22/24 的 GitHub Actions 已配置但尚未在远端执行，因此不得把“工作流存在”写成“托管 CI 已通过”。

## 3. 比较维度

| 维度 | 要回答的问题 | 证据形式 |
|---|---|---|
| Skill 真实性 | 是否存在有效 `SKILL.md`，引用路径是否真实，是否能被标准 Agent Skills 宿主发现？ | frontmatter 校验、干净目录安装、触发 smoke test |
| 计算确定性 | 盘面事实来自固定代码还是模型即兴推算？ | 可执行命令、固定 fixture、重复运行 diff |
| 输入口径 | 公历/农历、时区、夏令时、真太阳时、子时换日、流派如何声明？ | schema、profile、边界 fixture |
| 可复现性 | 相同规范化输入和 profile 是否得到相同 facts 与哈希？ | 重跑测试、跨进程测试、固定依赖版本 |
| 随机可审计性 | 默认随机是否安全；用户要求复盘时是否能用种子重放；是否避免泄露明文种子？ | RNG 单测、seed commitment、分布 sanity check |
| 不确定性 | 出生时辰缺失、地点不精确或流派冲突时，系统会不会静默猜值？ | 缺字段测试、候选时辰比较、`sensitivity` 输出 |
| 事实—解释分离 | 星曜、宫位、干支、卦爻等计算事实是否和叙述解释分栏？ | schema 检查、叙述忠实度测试 |
| 来源与版本 | 每项关键事实能否追到 engine、profile、版本和计算时间？ | metadata、版本锁、第三方通知 |
| 错误诚实性 | 引擎缺失、超出日期范围或输入矛盾时是否失败，而不是补造结果？ | negative fixtures、错误码断言 |
| 隐私 | 生辰、地点、问题文本是否默认留在本地；联网是否显式？ | 网络阻断测试、日志检查、数据保留说明 |
| 可移植性 | Codex、Claude Code 及其他兼容 Agent Skills 的宿主能否按同一资源路由工作？ | 两种宿主 smoke test、相对路径检查 |
| 许可证 | 仓库、依赖、知识数据和字体是否允许分发？ | `LICENSE`、`THIRD_PARTY_NOTICES.md`、依赖清单 |
| 覆盖范围 | 方法、流派、报告和界面覆盖到哪里；哪些仍为空白？ | `methods` 输出、范围矩阵、实际命令 |

## 4. 必跑测试套件

### B01 — Skill 结构与资源路由

- 校验 `SKILL.md` frontmatter 至少包含合法的 `name` 和可触发的 `description`。
- 扫描 `SKILL.md` 中所有相对路径，任何缺失资源均失败。
- 在空的临时 skills 目录安装打包产物，确认宿主能发现技能。
- 不允许依赖开发仓库之外、未随包分发的隐式文件。

通过标准：源码目录和打包后的干净解压目录均通过。

### B02 — 相同输入可复现

对每个计算型方法准备至少三个 fixture：常规输入、边界输入、缺失/冲突输入。对常规输入执行两次独立进程计算：

- `facts` 必须逐字节一致；
- `facts_hash` 与 `reproducibility_hash` 必须一致；
- `generated_at` 可以不同，但不得进入事实哈希；
- engine、profile 或 schema 版本变化必须导致可解释的版本差异。

### B03 — 时间与历法边界

至少覆盖：

- 必须使用命名 IANA 时区；可选 `utc_offset` 只作为准确时刻的核对信息，必须与该时区在该瞬间的偏移一致，不能替代时区；
- 夏令时跳时和重复时段；
- 公历/农历与闰月显式区分；
- 立春、节气换月、午夜与子时边界；
- 真太阳时仅在经度、时区和规则 profile 充足时启用；
- 太阳时资料不足时明确报错，或由用户明确选择民用时间 profile；不得静默降级后冒充太阳时结果。

这里验证的是程序是否忠实执行已声明 profile，不裁定哪一命理流派“更正确”。

### B04 — 未知时辰与敏感性

- 不得把未知时间默认补为中午、子时或当前时间。
- 支持的方法应枚举有限候选时辰，输出稳定事实、变化事实和不可判定项。
- 紫微、西占等对时刻高度敏感的方法，在时辰未知时必须降级或阻止强结论。
- `sensitivity` 必须是结构化字段，不能只藏在叙述尾注。
- 只要引擎给出候选数或采样数，`stable`、`partly_stable`、`boundary_sensitive` 结论都必须用 `n/N` 绑定真实分母；`stable` 还必须为 `N/N`。

### B05 — 随机与回放

用于塔罗、三钱起卦等随机方法：

- 无种子时使用操作系统安全随机源；
- 同一 replay seed 产生相同抽取序列；
- 输出默认只保存种子 commitment；fresh 抽取仅在显式 `reveal_seed:true` 时回显 seed，之后的 seeded replay 应与原抽取有相同 `facts_hash`；
- `randomInt` 使用拒绝采样，避免取模偏差；
- 大样本频数测试只用于发现实现偏差，不解释为占卜有效性证据。

### B06 — 上游引擎固定值与差分

- 八字 fixture 与固定版本 `lunar-typescript@1.8.6` 的原始输出比对；
- 紫微 fixture 与固定版本 `iztro` 的原始输出比对；
- 西占 fixture 与固定版本 `astronomy-engine` 的天体位置比对；
- 差分测试必须记录 profile 和可接受误差，不把两个不同流派/宫制的差异误判为 bug；
- 上游升级先生成审计 diff，再决定是否更新 golden files。

通过只表示封装没有篡改所选引擎结果，不表示该传统体系具有现实预测效度。

### B07 — 叙述忠实度

给 Agent 一份固定 facts envelope，检查成文结果：

- 不新增 envelope 中不存在的星曜、宫位、干支、动爻或牌；
- 每个具体盘面断言能映射到 facts 路径；
- “传统解释”“现实建议”“限制”有清楚标签；
- 不把多体系一致描述为独立科学验证；
- 不提供死亡日期、诊断、法律裁决或投资保证。

### B08 — 故障与降级

至少测试：依赖缺失、日期越界、无效时区、地点无法解析、输入自相矛盾、未知 profile、随机源异常、文件不可写。系统应返回稳定错误码，不输出半张盘或模型补全的盘面。

### B09 — 离线与隐私

- 在阻断网络的测试环境运行全部本地方法；
- 检查 stdout、stderr、缓存和报告中没有无必要的完整生辰与精确地点；
- 任何可选远程地理编码或 API 必须 opt-in，并在调用前说明发送字段；
- 默认不持久化用户问题和出生资料。

### B10 — 打包、许可证与干净安装

- 从 release archive 解压到空目录运行 doctor、fixture 和 Skill 路由检查；
- 校验源码包与 archive 都含 `LICENSE` 和第三方通知；
- 许可证不明确的数据、提示词或字体不得复制进发行包；
- 对 AGPL、CC BY-NC-SA、无许可证竞品只做接口/功能比较，不复制实现或材料。

## 5. 竞品对照基线

以下数字来自相应项目 README 或仓库页面，均是 2026-08-23 的调研快照；测试数和能力数未在本仓库复现时均为 self-reported。

| 项目 | 可比较的强项 | 本仓库应达到的可核验门槛 |
|---|---|---|
| `ShousenZHANG/chinese-fortune` | 20+ 方法、Python 计算脚本、1013 tests（self-reported）、Skill 打包说明 | 不追求一次覆盖 20+ 方法；先确保每个已列 `stable` 方法都有真实命令、边界 fixture 和干净打包测试 |
| `dhicoc/chinese-traditional-wisdom-skill` | 32 个本地 CLI、19 项 Skill 行为契约（均 self-reported），事实/解释/建议分层 | 统一 envelope、profile、claims 忠实度与离线测试至少同样明确 |
| `Horace-Maxwell/horosa-skill` | 92 个技法、435 tests（均 self-reported）、MCP + CLI + doctor | 承认覆盖明显落后；以轻量、统一 schema、随机回放和敏感性表达形成差异 |
| `Brhiza/mingyu` | API、MCP、npm core、Agent Skill、频繁维护 | 本地路径不依赖远程 API；若未来提供 API/MCP，必须保留同一 schema 与隐私告知 |
| `ml8s/liki` | 四个分域 Skill、规则表、外部 JSON-RPC engine、评测流程（self-reported） | 每个方法有独立 profile 与工具契约；不使用不可复现的“准确率”宣传 |
| `muyen/meihua-yishu` | 梅花专项资料与确定性脚本 | `meihua` 从 preview 升级前补齐起卦 profile、golden fixtures 和传统解释边界 |
| `Johnson-Jia/liuyao-divination` | 六爻纳甲的确定性排盘与专项 references | `liuyao` 仍为 planned；实现前先固定装卦 profile、月日上下文与输出 schema |
| `SylarLong/iztro` | 成熟的紫微排盘引擎与持续维护 | 固定依赖版本并测试封装 parity；不得把上游成熟度冒充为本仓库自己的测试覆盖 |

## 6. 发布评分规则

每个方法单独评分，不允许用一个成熟方法掩盖另一个空壳方法：

- **0 — listed**：只有注册项或文档；
- **1 — executable**：有可运行引擎和 schema；
- **2 — reproducible**：通过 B02、B03/B04（适用时）、B05（随机方法适用时）；
- **3 — auditable**：再通过 B06、B07、B08、B09；
- **4 — releasable**：再通过 B01、B10，且 release archive 在干净环境验证；
- **5 — maintained**：有版本迁移策略、上游升级 diff 和公开已知限制。

只有达到 4 才能在用户文档中称为“stable”。达到 2–3 可称为“preview”。0–1 应称为“planned”或“experimental”。

## 7. 禁止性表述

无论 benchmark 结果如何，项目不得声称：

- “比竞品算得准”“预测准确率更高”；
- 多种术数结论相同就构成科学验证；
- 测试通过证明命理、占星或占卜具有因果预测能力；
- 某个分数、吉凶标签可以替代医疗、法律、财务或重大人生决策。

允许的表述应具体到工程证据，例如：“同一 profile 的固定输入可复现”“未知时辰不会静默补值”“默认本地运行”“输出包含引擎版本和可复现哈希”。
