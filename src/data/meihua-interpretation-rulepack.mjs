/** Bounded interpretive axes for the explicit two-number Meihua profile. */

export const MEIHUA_INTERPRETATION_META = Object.freeze({
  rulepack_id: "meihua-two-number-adjudication-v0.5",
  schema: "fortune-teller/meihua-interpretation/v1",
  origin: "project_authored_bounded_policy",
  supported_profile: "meihua-two-number-v1",
  rule_ids: Object.freeze(["R-MH-001", "R-MH-002", "R-MH-003", "R-MH-004", "R-MH-005"]),
  boundaries: Object.freeze([
    "body/use is assigned only from the emitted moving-line half",
    "mutual hexagram uses lines 2-4 below and lines 3-5 above",
    "five-element direction is emitted without seasonal strength or numeric scoring",
    "precise timing is unavailable because this profile records no occurrence time",
  ]),
});

export const MEIHUA_LINE_STAGES = Object.freeze({
  1: Object.freeze({ label: "起步", plain_zh: "先处理入口、动机和第一步。" }),
  2: Object.freeze({ label: "内稳", plain_zh: "先把内部条件和日常执行理顺。" }),
  3: Object.freeze({ label: "关口", plain_zh: "先处理由内向外的卡点和转换成本。" }),
  4: Object.freeze({ label: "外接", plain_zh: "先核对外部关系、规则与反馈。" }),
  5: Object.freeze({ label: "协调", plain_zh: "先明确责任、取舍和统筹方式。" }),
  6: Object.freeze({ label: "收束", plain_zh: "先考虑收尾、转向和避免过度。" }),
});

export const MEIHUA_TRIGRAM_FRAMES = Object.freeze({
  "乾": Object.freeze({ process_zh: "主动建立原则并持续推进" }),
  "兑": Object.freeze({ process_zh: "通过交流、交换和明确同意来推进" }),
  "离": Object.freeze({ process_zh: "把条件辨明、呈现并保持清楚依托" }),
  "震": Object.freeze({ process_zh: "启动并把突发反应转成行动" }),
  "巽": Object.freeze({ process_zh: "逐步进入、反复沟通并积累影响" }),
  "坎": Object.freeze({ process_zh: "识别风险并寻找可通过的路径" }),
  "艮": Object.freeze({ process_zh: "设定边界、暂停并判断何处该止" }),
  "坤": Object.freeze({ process_zh: "承接、配合并提供稳定基础" }),
});

export const MEIHUA_RELATION_AXES = Object.freeze({
  use_generates_body: Object.freeze({
    label: "用生体",
    plain_zh: "外部事情对自身形成支持；能否落地仍要看现实资源是否真的到位。",
    action_zh: "先确认支持来自谁、何时可用、有没有附带条件。",
  }),
  body_generates_use: Object.freeze({
    label: "体生用",
    plain_zh: "自身需要持续向事情投入；重点不是吉凶，而是投入能否承受。",
    action_zh: "先列出时间、金钱和注意力成本，设一个停止继续投入的界线。",
  }),
  use_controls_body: Object.freeze({
    label: "用克体",
    plain_zh: "外部条件对自身形成约束或压力；这不等于必然失败。",
    action_zh: "先找出最硬的外部限制，再准备缓冲、替代方案或退出条件。",
  }),
  body_controls_use: Object.freeze({
    label: "体克用",
    plain_zh: "自身有介入和塑造事情的方向，但效果仍取决于能力、代价和对方反馈。",
    action_zh: "先做一个可逆的小动作，用真实反馈检验自己到底能控制多少。",
  }),
  same_element: Object.freeze({
    label: "体用比和",
    plain_zh: "自身与事情使用相近的节奏；相合不等于自动成功，也可能一起停滞。",
    action_zh: "先确认双方目标是否真的一致，再用一个具体里程碑检验协同。",
  }),
});
