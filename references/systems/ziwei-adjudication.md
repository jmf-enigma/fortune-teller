# 紫微专业裁决层 v0.4

这份说明对应 `src/core/ziwei-adjudicator.mjs` 与 `src/data/ziwei-adjudication-rulepack.mjs`。它位于排盘事实和最终文字之间：排盘负责回答“星、宫、四化和时期事实是什么”，裁决层只回答“某一套已登记规则的条件是否齐全、受损、破格或得救”。它不证明传统术数有经验预测效度，也不允许把格局名称改写成必然事件。

## 1. 为什么需要裁决层

只列星曜会漏掉命理师真正需要做的四件事：

1. 先把格局当作候选，而不是见到两颗星就宣布成立；
2. 把成立、受损、破格和解救条件逐项列明；
3. 说明什么新资料会导致改判；
4. 把术语依据翻成普通人能核对的现实问题。

因此 v0.4 不增加吉凶分数。它增加的是可复核的条件裁决。

## 2. 六种状态

| 状态 | 何时使用 | 对普通人的说法 |
|---|---|---|
| `candidate` | 已登记格局存在，但成立条件未齐 | 只看见部分轮廓，不能当成已经成立 |
| `established` | 全部成立条件已由事实支持 | 本流派所列核心条件齐全 |
| `damaged` | 成立后出现至少一项已登记受损条件 | 结构仍在，但表现更费力或不稳定 |
| `broken` | 成立后出现已登记破格条件 | 不能继续按完整格局解读 |
| `rescued` | 破格已经发生，同时完整解救链成立 | 风险仍在，但存在规则明定的转圜 |
| `unresolved` | 任何关键条件不确定，或同一条件出现冲突状态 | 不做假精确，先保留未决 |

判定顺序固定为：

`candidate → established → damaged → broken → rescued`

`unresolved` 是关闭路线的状态：任何阶段遇到关键不确定或冲突都可转入。破格条件比一般受损条件更强，所以破格一旦出现，技术路径会经过 `damaged` 再进入 `broken`。解救只有在破格之后才生效；单独见到“解救星”不能把普通格局抬成更高等级。

六种状态是裁决器的完整词汇，不表示当前版本已经安装完整格局语料。当前不可变候选表只安装可由引擎事实直接重放的结构底座，没有登记受损、破格或救应路线；因此调用方不能自行填入这些条件来走完整状态链。

## 3. 候选格局记录

调用方不能传入 candidate 对象、格局名称或自定义 predicate。只能用 `candidate_id` 选择代码内深度冻结的候选，并另选闭合 topic：

```js
{
  profile_id: "sanhe",
  candidate_id: "ZW-ADJ-SANHE-TOPIC-STRUCTURE",
  topic: "career_study",
  calculation
}
```

当前只登记三条安全结构候选：

- `ZW-ADJ-SANHE-TOPIC-STRUCTURE`：核对同一主题的完整三方四正结构；
- `ZW-ADJ-FLYING-SIHUA-TOPIC-PROCESS`：核对主题四宫内全部本命四化位置；
- `ZW-ADJ-ZHONGZHOU-TOPIC-BASELINE`：只建立中州进一步裁决前的主题结构底座。

三条候选的 ceiling 都明确排除“完整命名格局识别”。它们不能被改名，也没有登记受损、破格、救应条件。未来增加传统命名格局时，必须把来源、profile、predicate resolver 与正反例一起加入不可变注册表，不能由调用方临时拼装。

`calculation` 必须通过 envelope hash 校验和当前引擎重放。predicate 的状态、evidence kind 与 fact ID 集合均由裁决器从该 calculation 派生；调用方可不传 evidence。若为了审计而传 evidence，它只能逐项复述派生结果：

```js
{
  key: "complete_topic_structure",
  status: "present",
  evidence_kind: "palace_relation",
  fact_ids: ["F-ZW-U01", "F-ZW-R01", "F-ZW-P01", "F-ZW-P05", "F-ZW-P09", "F-ZW-P07"]
}
```

kind、status、路径或完整 fact 集合任一不符都会拒绝。一个真实但属于别的宫、别的 topic 或别的 evidence kind 的 fact ID 同样无效；“fact ID 存在”不等于“它能证明这个 predicate”。

## 4. 三套流派必须分轨

### 三合结构 `sanhe`

当前候选只验证完整主宫、两组三方与对宫这一结构底座。主星组合、亮度、辅曜、压力、成败与救应尚未登记，不能借“结构条件齐全”宣称具体三合格局成立。四宫是一个不可拆的证据组，不以“出现几个吉项”投票。

### 飞星／四化路径 `flying_sihua`

当前候选只验证所选主题四宫内全部本命四化位置，尚不裁决宫干飞化、自化、来因、往返或成败路线。四化必须绑定星、宫和作用层；`禄、权、科、忌` 不相加，也不借对宫主星来补成飞化路线。

### 中州结构 `zhongzhou`

当前候选只建立后续中州判断所需的主题宫位结构底座；星系、亮度、辅煞、四化、成败和解救均未安装。格局名不能替代条件表。

`adjudicateZiweiProfiles()` 只返回三个独立 profile 对象，顶层固定 `aggregation: "none"`。没有综合状态、平均分、胜出票或伪概率。不同流派结论不同时，应并列说明分歧来自哪里。

## 5. 空宫借星：显式、有限、可撤销

规则 `ZW-ADJ-EMPTY-01` 只有在以下条件同时满足时才应用：

1. 调用方显式传入 `request: { explicit: true, fields: ["major_stars"] }`；
2. 目标宫的 `major_stars` 确实为空；
3. relation 的 `focus_palace_id` 精确指向目标宫；
4. relation 的 `opposite_palace_id` 精确指向来源宫；
5. 来源对宫有主星；
6. 当前流派允许把对宫主星作为辅助语境。

只借主星名称，而且结果始终保留 `source_palace_id` 和 `borrowed_for: "context_only"`。不搬移亮度、四化、辅星、煞星、宫干或其他属性，不改变目标宫或来源宫的原始事实，也不允许“对宫仍为空便再向别宫借”。

以下任何变化都会撤销借星：目标宫不再为空、对宫关系改变、来源主星改变，或切换到不采用借星的飞星／四化 profile。撤销是重新运行同一个纯函数的结果，不需要修补历史对象。

## 6. 本命、大限、流年的联合主题

`adjudicateZiweiPhase()` 只接受五个宽主题：人生整体取向、事业与学习、财富与资源、长期关系、身心节律。三层都必须：

- 指向同一个 topic；
- calculation 的 envelope hash 正确，并能由当前引擎完整重放；
- `calculation_ref` 逐层等于该 envelope 的真实 `reproducibility_hash`，而非三层彼此相等即可；
- 本命层精确等于该 topic unit、其关系事实和四个本命宫位；
- 大限与流年层分别精确等于该 phase topic unit 登记的 period fact 与四个同层动态宫位；
- 三层 fact ID 互不复用，也不混入另一 topic 或另一时期的事实；
- 标为 `present`；
- 对飞星／四化 profile，还必须在本命、大限和流年三层各有非空、同主题且层级正确的四化集合。

三层顺序固定为：

1. 本命是长期基线；
2. 大限是阶段环境；
3. 流年只是当年触发。

正常排盘缺目标日期或缺任一层时返回 `insufficient`；假 hash、错路径、同一事实跨层复用、缺四宫、混合主题或错时期事实返回 `unresolved`。只有三层精确通过才生成 `phase_theme_zh`。输出文字来自闭合主题表，不复述调用者猜测的事件，而且 `specific_event` 固定为 `null`。

允许说“事业与学习在当前阶段反复变得显眼”，不允许据此命名升职、录取、辞职；允许说“长期关系议题需要更直接协商”，不允许据此命名结婚或分手。健康主题只讨论负荷和恢复，不作诊断或预后。

## 7. 结果呈现顺序

一个普通用户首先看到：

1. `conclusion_zh`：成立、受损、破格、解救或未决；
2. `plain_language_zh`：不依赖术语也能读懂的解释；
3. `technical_basis`：流派、命理条件和精确 `fact_id`；
4. `change_conditions_zh`：什么资料会导致改判；
5. `reality_checks_zh`：用户可用连续现实记录核对的问题；
6. `boundary_zh`：不命名或保证具体事件。

哈希、底层校验细节和开发诊断不应盖过结果；但技术依据仍保留在结构化字段中，供复核或申诉时展开。

## 8. 当前专业边界

- 该层保留通用状态词汇，但公开入口只接受三条不可变、可重放的结构候选；它不是传统命名格局全集。
- “准确”在这里首先指排盘事实绑定正确、规则条件不漏、反例能推翻结论、改判路径透明；它不等于已证明现实预测准确。
- 自动测试覆盖任意候选、错 evidence kind/path、假 ref/hash、同一 fact 跨层复用、缺结构、跨主题、流派隔离和空宫借星撤销等正反例。
- 在声称某个命名格局已获支持前，还需要把该流派的原始或授权资料转成不可变 candidate 规则，安装精确 predicate resolver，并由熟悉该流派的人复核条件表；调用方对象不能替代这一步。
