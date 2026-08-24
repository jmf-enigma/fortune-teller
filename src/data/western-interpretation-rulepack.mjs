function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

export const WESTERN_PLANET_AXES = deepFreeze({
  sun: { label: "太阳", function: "自主方向、目标感与持续投入", constructive: "把意愿集中到清楚目标", excess: "把自我价值过度绑在表现上" },
  moon: { label: "月亮", function: "安全感、习惯反应与恢复方式", constructive: "及时识别真实需要并恢复", excess: "只按熟悉反应走，忽略新事实" },
  mercury: { label: "水星", function: "理解、表达与信息处理", constructive: "把问题说清并拆成可检验步骤", excess: "在分析、争辩或信息噪声里打转" },
  venus: { label: "金星", function: "价值判断、关系协调与取舍", constructive: "建立互惠、审美与可持续交换", excess: "为了和谐回避必要边界" },
  mars: { label: "火星", function: "行动、争取与冲突处理", constructive: "把能量用在明确行动和边界上", excess: "急于推进，先行动后核对" },
  jupiter: { label: "木星", function: "扩展、信念与机会判断", constructive: "扩大视野并建立可行空间", excess: "高估资源、时间或确定性" },
  saturn: { label: "土星", function: "限制、责任与长期结构", constructive: "用边界和耐心形成可靠能力", excess: "把谨慎变成僵硬或自我否定" },
  uranus: { label: "天王星", function: "更新、独立与非连续变化", constructive: "为旧结构找到新做法", excess: "只为摆脱限制而改变" },
  neptune: { label: "海王星", function: "想象、共情与边界溶解", constructive: "把想象变成有边界的理解", excess: "理想化、含混或逃避核对" },
  pluto: { label: "冥王星", function: "深层压力、控制与重组", constructive: "承认代价后做彻底调整", excess: "把压力变成控制或全有全无" },
});

export const WESTERN_SIGN_AXES = deepFreeze({
  Aries: { label: "白羊座", style: "直接启动、边做边确认", excess: "抢先行动而少看反馈" },
  Taurus: { label: "金牛座", style: "稳步积累、重视可持续性", excess: "因熟悉和安全而难以调整" },
  Gemini: { label: "双子座", style: "比较信息、快速转换视角", excess: "分散或停留在表面选择" },
  Cancer: { label: "巨蟹座", style: "从安全感与照顾关系出发", excess: "过度防御或把照顾变成包办" },
  Leo: { label: "狮子座", style: "主动表达、创造并承担可见角色", excess: "需要持续认可才维持投入" },
  Virgo: { label: "处女座", style: "拆解、修正并改善细节", excess: "把改进变成苛求或迟迟不交付" },
  Libra: { label: "天秤座", style: "比较双方、寻找公平协调", excess: "为维持平衡而拖延立场" },
  Scorpio: { label: "天蝎座", style: "深入核心、重视信任与控制边界", excess: "因防备而把问题推向极端" },
  Sagittarius: { label: "射手座", style: "从原则、远景与探索出发", excess: "跳过现实细节或过早概括" },
  Capricorn: { label: "摩羯座", style: "按责任、次序和长期结果推进", excess: "让义务压过弹性与恢复" },
  Aquarius: { label: "水瓶座", style: "从系统、群体与独立观点出发", excess: "只讲原则，忽略具体感受" },
  Pisces: { label: "双鱼座", style: "凭整体感受、想象与共情连接", excess: "界线含混或难以落实" },
});

export const WESTERN_HOUSE_AXES = deepFreeze({
  1: "自我呈现、行动起点与身体节奏", 2: "个人资源、价值与可支配能力",
  3: "学习输入、沟通与近距离环境", 4: "家庭根基、私人空间与安全底座",
  5: "创造、表达、兴趣与主动投入", 6: "日常工作、技能、责任与维护节奏",
  7: "一对一关系、协商与承诺", 8: "共同资源、深度依赖与风险分担",
  9: "高阶学习、信念、远行与视野", 10: "公共角色、方向、责任与长期成就",
  11: "群体、朋友、协作网络与未来计划", 12: "退场、休整、隐性消耗与独处空间",
});

export const WESTERN_ASPECT_AXES = deepFreeze({
  conjunction: { label: "合相", process: "两种功能被迫在同一处一起运作", tension: "不易分开，容易互相放大" },
  sextile: { label: "六合", process: "两种功能之间存在可主动使用的配合接口", tension: "机会需要实际行动才会发挥" },
  square: { label: "刑相", process: "两种功能以摩擦推动调整和行动", tension: "若只压住一边，冲突会反复出现" },
  trine: { label: "拱相", process: "两种功能较容易自然衔接", tension: "过于顺手时可能缺少主动检验" },
  opposition: { label: "冲相", process: "两种功能需要在两个极端之间协商", tension: "容易把其中一端投射给他人或环境" },
});

export const WESTERN_TOPIC_HOUSES = deepFreeze({
  overview: [1, 10],
  career_study: [10, 6, 9, 3],
  wealth_resources: [2, 8],
  relationships: [7, 11],
  family_social: [4, 11, 3],
  wellbeing_rhythm: [6, 1, 12],
});

export const WESTERN_INTERPRETATION_META = deepFreeze({
  rulepack_id: "western-natal-axes-v1",
  version: "0.5.0",
  profile_scope: "tropical_whole_sign",
  source_ids: ["SRC-WA-TETRABIBLOS-PG70850"],
  rule_ids: ["R-WA-001", "R-WA-002", "R-WA-003", "R-WA-004", "R-WA-005"],
  order: ["topic_house", "traditional_house_ruler", "all_house_occupants", "chart_ruler", "sun_moon", "tight_aspect", "essential_condition"],
  prohibitions: ["dignity score", "dominant planet score", "diagnosis", "event prediction", "unknown-time house inference"],
});
