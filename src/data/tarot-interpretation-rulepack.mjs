/**
 * Bounded, project-authored Tarot adjudication axes.
 *
 * The pack turns replayable RWS card/spread facts into reflective questions. It
 * deliberately contains no fortune score, yes/no oracle, option winner, event
 * probability, or timing rule.
 */

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

export const TAROT_INTERPRETATION_META = deepFreeze({
  rulepack_id: "tarot-rws-reflective-adjudication-v0.5",
  schema: "fortune-teller/tarot-adjudication/v1",
  origin: "project_authored_compositional_axes",
  calculation_profile: "rider-waite-smith-names",
  rule_ids: ["R-TR-001", "R-TR-002", "R-TR-003", "R-TR-004"],
  interpretation_boundary: [
    "card meaning is composed from the declared position, card identity, orientation, arcana, suit, and rank",
    "a reversed card is not automatically negative; it may be blocked, internalized, delayed, or excessive",
    "future and outcome positions describe a conditional trajectory, not a fixed event",
    "decision spreads compare demands and blind spots; they do not elect a winner",
    "repeated cards or suits are structural emphasis, never votes or probabilities",
  ],
  predictive_validity: "not_established",
});

export const TAROT_MAJOR_AXES = deepFreeze({
  "major-00": { upright: "带着开放性开始，并先用小步试探未知", reversed: "起步冲动或迟疑；先补足最低限度的准备" },
  "major-01": { upright: "把已有工具集中到一个可执行动作上", reversed: "能力分散、工具闲置，或行动方式带有操控性" },
  "major-02": { upright: "暂缓外放，给直觉、隐情与未说出口的信息留位置", reversed: "信息被噪声或过度保密遮住，需要分清直觉和猜测" },
  "major-03": { upright: "让关系、创意或资源获得滋养和生长空间", reversed: "过度照料、依赖或创造力阻滞，需要恢复边界" },
  "major-04": { upright: "用规则、责任和边界建立可持续结构", reversed: "结构可能僵化、控制过强，或基础本身不稳" },
  "major-05": { upright: "核对传统、共同价值与可信指导能提供什么", reversed: "旧规范不再合身，但反叛本身也不是答案" },
  "major-06": { upright: "围绕价值一致性作出关系或方向选择", reversed: "价值冲突或回避选择，需要先说清不可妥协项" },
  "major-07": { upright: "集中方向，以纪律把力量推向同一目标", reversed: "控制感下降或用力过猛，需要重新校准方向" },
  "major-08": { upright: "以耐心、勇气和柔性的影响力处理压力", reversed: "自我怀疑、消耗或强行压制正在削弱可用力量" },
  "major-09": { upright: "退一步独立思考，再决定哪些意见值得采纳", reversed: "独处可能变成隔绝或逃避，需要恢复有效连接" },
  "major-10": { upright: "承认周期正在转向，并为变化保留机动空间", reversed: "旧循环反复出现；先找出自己仍在重复的环节" },
  "major-11": { upright: "回到事实、责任与对等后果上作判断", reversed: "偏见、逃避责任或流程不公需要被明确指出" },
  "major-12": { upright: "暂停惯性，从另一角度重估代价与意义", reversed: "等待可能已变成拖延或无效牺牲，需要设退出条件" },
  "major-13": { upright: "结束已经走完的阶段，为转变腾出空间", reversed: "对结束的抗拒正在延长消耗，需要识别真正舍不得的部分" },
  "major-14": { upright: "把不同需求调和到可持续节奏中", reversed: "节奏失衡或要素不匹配，应先减少过量的一端" },
  "major-15": { upright: "看清依附、诱惑或受限选择如何绑住行动", reversed: "束缚已能被识别，下一步是用具体边界收回主动权" },
  "major-16": { upright: "不稳定结构正在暴露；优先处理最不能继续假装的事实", reversed: "震荡被延后但未消失，需要主动检修薄弱处" },
  "major-17": { upright: "在受挫后恢复方向感，用可持续的小信号重建希望", reversed: "愿景与现实脱节或信心不足，需要可验证的近程目标" },
  "major-18": { upright: "承认信息模糊与情绪投射，暂不把想象当事实", reversed: "迷雾开始松动；继续核对恐惧与事实各占多少" },
  "major-19": { upright: "让信息、成果和真实意愿更公开清楚", reversed: "清晰度暂时受阻，或乐观过头掩盖了细节" },
  "major-20": { upright: "复盘过去并回应一个不能再回避的选择", reversed: "自责或忽视召唤妨碍判断，需要把评判改成证据" },
  "major-21": { upright: "完成整合、确认收尾，并看见更大的下一阶段", reversed: "尚有关键闭环未完成，不宜只凭形式宣布结束" },
});

export const TAROT_SUIT_AXES = deepFreeze({
  wands: { label: "权杖", domain: "行动、创造与意志", verb: "推动", excess: "过热、争强或行动分散" },
  cups: { label: "圣杯", domain: "情感、关系与接纳", verb: "连接", excess: "理想化、情绪淹没或边界松动" },
  swords: { label: "宝剑", domain: "判断、沟通与冲突", verb: "辨明", excess: "过度分析、语言伤害或对立升级" },
  pentacles: { label: "星币", domain: "资源、工作与长期落实", verb: "落地", excess: "只看物质、固守或忽略变化" },
});

export const TAROT_RANK_AXES = deepFreeze({
  ace: { label: "王牌", upright: "一个入口或种子正待被承接", reversed: "入口受阻、起步延迟，或基础尚未准备好" },
  two: { label: "二", upright: "两端需要配对、权衡或作出初步选择", reversed: "两端失衡，或因回避而迟迟不能决定" },
  three: { label: "三", upright: "已有要素开始协作、扩展或被看见", reversed: "协作松散、扩展受阻，或第三个因素造成摩擦" },
  four: { label: "四", upright: "局面需要稳定、边界或短暂停顿", reversed: "稳定变成僵滞，或休整不足以恢复秩序" },
  five: { label: "五", upright: "差距、冲突或损失要求现实应对", reversed: "冲突被压住、修复刚开始，或余波尚未处理" },
  six: { label: "六", upright: "交换、调整或阶段性移动正在发生", reversed: "调整不均、旧负担未清，或移动受到牵制" },
  seven: { label: "七", upright: "需要评估、守位，并检验策略是否站得住", reversed: "策略失真、耐心耗尽，或防守变成内耗" },
  eight: { label: "八", upright: "力量进入密集执行、训练或加速阶段", reversed: "执行受困、节奏散乱，或熟练变成机械重复" },
  nine: { label: "九", upright: "成果接近成熟，同时要守住个人边界", reversed: "接近完成却过度消耗，或满足感与现实脱节" },
  ten: { label: "十", upright: "一个周期来到结果、责任或承载上限", reversed: "收尾不彻底、负担分配失衡，或旧周期迟迟不放手" },
  page: { label: "侍从", upright: "以学习者姿态接收信息并尝试", reversed: "消息失真、准备不足，或好奇没有落实" },
  knight: { label: "骑士", upright: "某种动力正主动追逐目标", reversed: "动力过急、忽冷忽热，或方向未经核对" },
  queen: { label: "王后", upright: "先在内部形成成熟的承载与调节", reversed: "照料失衡、边界模糊，或能力向内消耗" },
  king: { label: "国王", upright: "以责任和稳定方式对外组织这一领域", reversed: "权威使用失当、控制过度，或无法承担后果" },
});

export const TAROT_POSITION_AXES = deepFreeze({
  focus: { label: "核心", function: "anchor", question: "眼下最值得正视的核心是什么？", agency: "mixed" },
  past: { label: "背景", function: "background", question: "什么既有模式把问题带到这里？", agency: "low" },
  present: { label: "当下", function: "current", question: "现在真正起作用的机制是什么？", agency: "mixed" },
  future: { label: "后续趋势", function: "conditional_trajectory", question: "若当前做法不变，下一阶段最可能延续什么结构？", agency: "conditional" },
  situation: { label: "处境", function: "current", question: "这件事当前的关键条件是什么？", agency: "mixed" },
  action: { label: "行动", function: "action", question: "哪一个可控动作最值得先做？", agency: "high" },
  outcome: { label: "条件性结果", function: "conditional_trajectory", question: "若当前互动方式与现实条件持续，局面会朝哪种结构发展？", agency: "conditional" },
  "option-a": { label: "选项 A", function: "comparison", question: "走 A 路线需要承担什么、又能调用什么？", agency: "mixed" },
  "option-b": { label: "选项 B", function: "comparison", question: "走 B 路线需要承担什么、又能调用什么？", agency: "mixed" },
  "decision-lens": { label: "决策尺度", function: "decision_criterion", question: "比较 A 与 B 时真正该用什么标准？", agency: "high" },
  challenge: { label: "交叉挑战", function: "constraint", question: "什么力量正在阻挡、牵制或重新定义当前问题？", agency: "mixed" },
  foundation: { label: "深层基础", function: "background", question: "这个局面建立在哪个较深的动机或条件上？", agency: "low" },
  "recent-past": { label: "近期过去", function: "background", question: "哪一个刚发生的转折仍在影响现在？", agency: "low" },
  possibility: { label: "可见可能", function: "possibility", question: "目前能被看见但尚未兑现的可能是什么？", agency: "conditional" },
  "near-future": { label: "近期走向", function: "conditional_trajectory", question: "沿用当前结构时，接下来最先显现什么？", agency: "conditional" },
  self: { label: "自身位置", function: "action", question: "你正以什么姿态参与并影响这个局面？", agency: "high" },
  environment: { label: "外部环境", function: "context", question: "他人、资源或制度正在提供什么条件？", agency: "low" },
  "hopes-and-fears": { label: "期待与担忧", function: "projection", question: "哪些期待或恐惧可能正在放大判断偏差？", agency: "mixed" },
});

export const TAROT_SPREAD_AXES = deepFreeze({
  one: {
    label: "单牌聚焦",
    groups: [{ id: "focus", label: "核心", positions: ["focus"] }],
    action_position: "focus",
    synthesis: "one_anchor",
  },
  three: {
    label: "过去—现在—后续",
    groups: [
      { id: "background", label: "背景", positions: ["past"] },
      { id: "current", label: "当下", positions: ["present"] },
      { id: "trajectory", label: "条件性走向", positions: ["future"] },
    ],
    action_position: "present",
    synthesis: "sequence_without_fate_claim",
  },
  "situation-action-outcome": {
    label: "处境—行动—条件性结果",
    groups: [
      { id: "situation", label: "处境", positions: ["situation"] },
      { id: "agency", label: "行动", positions: ["action"] },
      { id: "trajectory", label: "条件性结果", positions: ["outcome"] },
    ],
    action_position: "action",
    synthesis: "action_changes_trajectory",
  },
  decision: {
    label: "双选项决策镜",
    groups: [
      { id: "option-a", label: "A 的要求", positions: ["option-a"] },
      { id: "option-b", label: "B 的要求", positions: ["option-b"] },
      { id: "criterion", label: "比较尺度", positions: ["decision-lens"] },
    ],
    action_position: "decision-lens",
    synthesis: "compare_requirements_without_winner",
  },
  "celtic-cross": {
    label: "凯尔特十字（反思型改编）",
    groups: [
      { id: "core", label: "当前核心", positions: ["present", "challenge"] },
      { id: "roots", label: "根源与来路", positions: ["foundation", "recent-past"] },
      { id: "possibilities", label: "可能与近期走向", positions: ["possibility", "near-future"] },
      { id: "participation", label: "自身与环境", positions: ["self", "environment"] },
      { id: "projection", label: "期待、担忧与条件性收束", positions: ["hopes-and-fears", "outcome"] },
    ],
    action_position: "self",
    synthesis: "grouped_cross_reading_without_position_voting",
  },
});
