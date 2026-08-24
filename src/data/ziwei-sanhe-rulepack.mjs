/**
 * Bounded Zi Wei Sanhe synthesis modifiers used by the result compiler.
 *
 * These records are project-authored paraphrases. They deliberately cover a
 * small, explicit traditional chain: the 24 ordinary two-major-star groups,
 * six common supportive stars, six common pressure stars, Lu Cun and Tian Ma.
 * They do not implement palace-stem flying transformations or another school.
 */

export const ZIWEI_SANHE_RULEPACK_META = Object.freeze({
  rulepack_id: "ziwei-sanhe-result-v1",
  school_scope: "sanhe_with_natal_brightness_and_bounded_sihua",
  combination_priority: "registered_pair_over_single_star",
  modifier_policy: "support_and_pressure_are_conditions_not_scores",
});

export const ZIWEI_MAJOR_STAR_COMBINATIONS = [
  ["七杀", "廉贞", "在复杂局面中快速划界并作决定", "容易把协商推成对抗，决定过急"],
  ["七杀", "武曲", "在压力下整合资源并直接执行", "容易做得过硬、过快，忽略协商成本"],
  ["七杀", "紫微", "以全局视角统筹高压任务并果断推进", "容易权责过重、控制过多或孤军承担"],
  ["天同", "天梁", "以照顾、原则和长期节奏稳定局面", "容易回避冲突、替别人背负过多责任"],
  ["天同", "太阴", "以细致准备和柔和节奏积累成果", "容易犹豫拖延，把问题留在舒适区"],
  ["天同", "巨门", "能用沟通把不安和分歧转成可讨论的问题", "容易表面求和、内里反复，陷入争论循环"],
  ["天府", "廉贞", "在复杂关系中守住边界、资源和长期安排", "容易纠缠于控制与守成，迟迟不愿调整"],
  ["天府", "武曲", "擅长把资源纪律、执行和长期积累连起来", "容易过度保守或刚硬，只看效率忽略人情"],
  ["天府", "紫微", "擅长建立秩序、统筹资源并维持稳定中心", "容易地位压力过高、控制过多或结构僵化"],
  ["天机", "天梁", "能把分析规划与原则、经验和长远判断结合", "容易想得过多，又被责任或原则束缚行动"],
  ["天机", "太阴", "擅长安静分析、细致准备并逐步调整", "容易犹豫内耗，计划多而行动慢"],
  ["天机", "巨门", "擅长研究、追问、拆解问题并提出方案", "容易过度推演、反复争论，难以收束"],
  ["天梁", "太阳", "愿意公开承担、保护他人并坚持原则", "容易过度付出，背上不必要的道德责任"],
  ["天相", "廉贞", "能在复杂规则中协调角色、边界和标准", "容易顾虑形象与各方反应，纠缠或迟疑"],
  ["天相", "武曲", "能把执行纪律与制度标准结合", "容易变得刚硬或官僚，沟通弹性不足"],
  ["天相", "紫微", "擅长统筹角色、制度和整体秩序", "容易过度依赖认可，或因顾全全局而迟决"],
  ["太阳", "太阴", "能在公开承担与幕后准备之间取得平衡", "容易在外放与退缩间摇摆，耗费精力"],
  ["太阳", "巨门", "能公开表达、调查问题并推动讨论", "容易把分歧公开化，陷入声誉或争论压力"],
  ["廉贞", "破军", "敢于重新划界、拆旧并推动结构更新", "容易升级冲突、切断退路，低估转换成本"],
  ["廉贞", "贪狼", "能在社交、欲望和复杂关系中试探新路径", "容易关系纠缠、精力分散或投入过量"],
  ["武曲", "破军", "能把资源和执行力用于重整旧结构", "容易用力过猛，造成不必要的损耗和断裂"],
  ["武曲", "贪狼", "能把行动力、资源意识和开拓动力结合", "容易目标过多、冒进或把关系工具化"],
  ["破军", "紫微", "能从全局出发推动重整与更新", "容易一边控制、一边剧烈改变，使过渡成本上升"],
  ["紫微", "贪狼", "能统筹人脉、欲望和多元机会", "容易追求过多、在地位与新鲜感之间失去重点"],
].map(([left, right, core_zh, risk_zh]) => ({
  combination_id: `ZW-COMBO-${[left, right].sort().join("-")}`,
  stars: [left, right].sort(),
  core_zh,
  risk_zh,
}));

export const ZIWEI_CONTEXT_STAR_MODIFIERS = [
  ["左辅", "support", "组织协力与可调用的支持"],
  ["右弼", "support", "协作、补位与人际支持"],
  ["文昌", "support", "学习、文书、条理与表达"],
  ["文曲", "support", "表达、理解、审美与沟通弹性"],
  ["天魁", "support", "关键门槛上的引导与资源入口"],
  ["天钺", "support", "协调、引荐与关键时点的帮助"],
  ["擎羊", "pressure", "直接摩擦、切割与硬碰硬的压力"],
  ["陀罗", "pressure", "拖延、黏滞与反复消耗"],
  ["火星", "pressure", "突发强度、急躁与快速升温"],
  ["铃星", "pressure", "内在紧绷、突变与难以忽略的催促"],
  ["地空", "pressure", "计划落空、意义感松动或资源难以着力"],
  ["地劫", "pressure", "中断、损耗与投入被重新分配"],
  ["禄存", "resource", "较稳定的资源、积累与现实承托"],
  ["天马", "movement", "移动、转换、跨界与节奏加快"],
].map(([star, modifier_class, plain_zh]) => ({ star, modifier_class, plain_zh }));

export const ZIWEI_PERIOD_STAR_MODIFIERS = [
  ["昌", "support", "学习、文书、条理与信息整理"],
  ["曲", "support", "表达、理解、沟通与内容呈现"],
  ["魁", "support", "关键门槛上的引导或资源入口"],
  ["钺", "support", "协调、引荐或关键时点的帮助"],
  ["禄", "resource", "资源、承托与取得条件"],
  ["马", "movement", "移动、转换、跨界或节奏加快"],
  ["羊", "pressure", "直接摩擦、切割与硬碰硬压力"],
  ["陀", "pressure", "拖延、黏滞与反复消耗"],
  ["鸾", "relationship", "关系连接、吸引与互动议题变得显眼"],
  ["喜", "relationship", "社交、庆祝与关系回应变得显眼"],
  ["年解", "resolution", "缓冲、拆解问题或寻找解决路径"],
].map(([key, modifier_class, plain_zh]) => ({ key, modifier_class, plain_zh }));

const combinationByKey = new Map(
  ZIWEI_MAJOR_STAR_COMBINATIONS.map((item) => [item.stars.join("+"), item]),
);
const modifierByStar = new Map(ZIWEI_CONTEXT_STAR_MODIFIERS.map((item) => [item.star, item]));
const periodModifierByKey = new Map(ZIWEI_PERIOD_STAR_MODIFIERS.map((item) => [item.key, item]));

if (combinationByKey.size !== 24) throw new Error("Zi Wei Sanhe rule pack must contain 24 unique major-star pairs");
if (modifierByStar.size !== 14) throw new Error("Zi Wei Sanhe rule pack must contain 14 unique context-star modifiers");
if (periodModifierByKey.size !== 11) throw new Error("Zi Wei Sanhe rule pack must contain 11 unique period-star modifiers");

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

deepFreeze(ZIWEI_MAJOR_STAR_COMBINATIONS);
deepFreeze(ZIWEI_CONTEXT_STAR_MODIFIERS);
deepFreeze(ZIWEI_PERIOD_STAR_MODIFIERS);

export function getZiweiMajorStarCombination(stars) {
  if (!Array.isArray(stars) || stars.length !== 2) return null;
  return combinationByKey.get([...stars].sort().join("+")) || null;
}

export function getZiweiContextStarModifier(star) {
  return modifierByStar.get(star) || null;
}

export function getZiweiPeriodStarModifier(star) {
  if (star === "年解") return periodModifierByKey.get(star);
  if (typeof star !== "string" || !/^(?:运|流).+/u.test(star)) return null;
  return periodModifierByKey.get(star.slice(1)) || null;
}
