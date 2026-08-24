/**
 * Project-authored, bounded Zi Wei meaning registry.
 *
 * This is deliberately a small closed vocabulary. It records reflective
 * meaning axes used by the machine-bound Zi Wei reading path; it is not a
 * quotation, a complete lineage manual, practitioner certification, or
 * evidence that the meanings predict real-world events.
 */

export const ZIWEI_MEANING_REGISTRY_META = Object.freeze({
  registry_id: "ziwei-bounded-meanings-v1",
  system: "ziwei",
  origin: "project_authored_bounded_paraphrase",
  review_status: "automated_fixture_reviewed",
  predictive_validity: "not_established",
  professional_label_allowed: false,
  interpretation_ceiling: "bounded_topic_reflection",
  event_generation: "disallowed",
});

export const ZIWEI_TOPIC_MARKERS = [
  {
    meaning_id: "ZW-TOPIC-OVERVIEW",
    topic: "overview",
    label_zh: "人生整体取向",
    primary_palace: "命宫",
    markers: ["self-directed style", "priorities", "recurring approach"],
    markers_zh: ["自主行动方式", "优先事项", "反复出现的应对路径"],
    boundary: "broad life orientation, not a fixed personality diagnosis",
    boundary_zh: "用于讨论较宽的人生取向，不形成固定人格诊断",
  },
  {
    meaning_id: "ZW-TOPIC-CAREER-STUDY",
    topic: "career_study",
    label_zh: "事业与学习",
    primary_palace: "官禄",
    markers: ["work or study responsibility", "craft", "role arrangement", "public contribution"],
    markers_zh: ["职责承担", "技能打磨", "角色安排", "公共贡献"],
    boundary: "work or study responsibility and craft, not a promotion, admission, or exam prediction",
    boundary_zh: "用于讨论工作或学习中的责任与专业积累，不预测升职、录取或考试结果",
  },
  {
    meaning_id: "ZW-TOPIC-WEALTH-RESOURCES",
    topic: "wealth_resources",
    label_zh: "财富与资源",
    primary_palace: "财帛",
    markers: ["resource acquisition", "resource allocation", "resource management"],
    markers_zh: ["资源取得", "资源配置", "资源管理"],
    boundary: "resource acquisition and allocation, not an amount or investment return",
    boundary_zh: "用于讨论资源的取得与配置方式，不预测金额、收益或投资回报",
  },
  {
    meaning_id: "ZW-TOPIC-RELATIONSHIPS",
    topic: "relationships",
    label_zh: "长期关系",
    primary_palace: "夫妻",
    markers: ["long-term reciprocity", "negotiation", "boundary arrangement"],
    markers_zh: ["长期互惠", "协商方式", "边界安排"],
    boundary: "long-term reciprocity and negotiation, not fidelity or a marriage date",
    boundary_zh: "用于讨论长期关系中的互惠与协商，不判断忠诚，也不预测结婚日期",
  },
  {
    meaning_id: "ZW-TOPIC-WELLBEING-RHYTHM",
    topic: "wellbeing_rhythm",
    label_zh: "身心节律",
    primary_palace: "福德",
    markers: ["restoration", "attention", "load management"],
    markers_zh: ["恢复节奏", "注意力分配", "负荷管理"],
    boundary: "restoration, attention and load, not diagnosis or prognosis",
    boundary_zh: "用于讨论可持续的恢复、注意力与负荷，不构成诊断或预后判断",
  },
];

export const ZIWEI_MAJOR_STAR_MEANINGS = [
  {
    meaning_id: "ZW-STAR-ZIWEI",
    star: "紫微",
    constructive: "coordination, long-range framing, holding a center",
    constructive_zh: "统筹协调、建立长程框架、稳住中心",
    overextension: "status pressure, over-control, expectations outrunning support",
    overextension_zh: "地位压力、过度控制、期待超过现实支持",
    plain_strength_zh: "能统筹全局并稳住方向",
    plain_risk_zh: "容易控制过多，或把责任和期待抬得太高",
  },
  {
    meaning_id: "ZW-STAR-TIANJI",
    star: "天机",
    constructive: "analysis, planning, adaptation, finding alternatives",
    constructive_zh: "分析规划、适应调整、寻找替代方案",
    overextension: "overthinking, frequent switching, plans not reaching execution",
    overextension_zh: "过度思虑、频繁改换、计划迟迟未进入执行",
    plain_strength_zh: "善于分析变化并准备备选方案",
    plain_risk_zh: "容易想得过多、频繁改计划，最后难以落地",
  },
  {
    meaning_id: "ZW-STAR-TAIYANG",
    star: "太阳",
    constructive: "visibility, contribution, advocacy, mobilizing others",
    constructive_zh: "提高可见度、作出贡献、主动倡议、带动他人",
    overextension: "overextension, needing recognition, helping without enough boundaries",
    overextension_zh: "投入过度、依赖认可、帮助他人却缺少边界",
    plain_strength_zh: "愿意公开承担，并能带动身边的人",
    plain_risk_zh: "容易过度付出，或把外界认可看得太重",
  },
  {
    meaning_id: "ZW-STAR-WUQU",
    star: "武曲",
    constructive: "execution, resource discipline, direct decisions",
    constructive_zh: "推动执行、维持资源纪律、直接作出决定",
    overextension: "rigidity, under-communicating, acting before enough consultation",
    overextension_zh: "做法僵化、沟通不足、协商尚未充分便先行动",
    plain_strength_zh: "能把资源、规则和行动直接接起来",
    plain_risk_zh: "容易做得过硬过快，沟通和协商跟不上",
  },
  {
    meaning_id: "ZW-STAR-TIANTONG",
    star: "天同",
    constructive: "ease, affiliation, restoration, finding workable comfort",
    constructive_zh: "营造松弛与亲和、恢复精力、找到可行的舒适安排",
    overextension: "avoidance, delayed confrontation, staying comfortable too long",
    overextension_zh: "回避问题、推迟必要冲突、停留在舒适安排中过久",
    plain_strength_zh: "能缓和气氛，并找到较可持续的节奏",
    plain_risk_zh: "容易回避难题，或在舒适区停留太久",
  },
  {
    meaning_id: "ZW-STAR-LIANZHEN",
    star: "廉贞",
    constructive: "boundaries, negotiation, complexity, testing limits",
    constructive_zh: "建立边界、进行协商、处理复杂性、试探限制",
    overextension: "entanglement, image pressure, escalating a contest unnecessarily",
    overextension_zh: "陷入纠缠、承受形象压力、无谓升级竞争或对抗",
    plain_strength_zh: "能在复杂局面里划清边界、推进协商",
    plain_risk_zh: "容易陷入纠缠，或把竞争升级成无谓对抗",
  },
  {
    meaning_id: "ZW-STAR-TIANFU",
    star: "天府",
    constructive: "stewardship, storage, continuity, building a stable base",
    constructive_zh: "稳健管理、积累储备、保持连续性、建立稳定基础",
    overextension: "inertia, possessiveness, protecting the existing arrangement too long",
    overextension_zh: "形成惰性或占有倾向、过久保护现有安排",
    plain_strength_zh: "擅长守住资源、建立稳定的长期安排",
    plain_risk_zh: "容易过度守成，对已经不合适的安排也不愿放手",
  },
  {
    meaning_id: "ZW-STAR-TAIYIN",
    star: "太阴",
    constructive: "inward processing, accumulation, care, quiet preparation",
    constructive_zh: "向内梳理、逐步积累、细致照料、安静准备",
    overextension: "withdrawal, hesitation, carrying unspoken concerns alone",
    overextension_zh: "退缩犹豫、独自承担没有说出的顾虑",
    plain_strength_zh: "擅长安静准备、细致积累和照顾细节",
    plain_risk_zh: "容易犹豫内耗，把顾虑长期压在心里",
  },
  {
    meaning_id: "ZW-STAR-TANLANG",
    star: "贪狼",
    constructive: "curiosity, social range, appetite, experimentation",
    constructive_zh: "保持好奇、拓展社交范围、保有动力、开展试验",
    overextension: "dispersion, excess, novelty displacing sustained commitment",
    overextension_zh: "精力分散或投入过量、新奇感挤掉持续承诺",
    plain_strength_zh: "能开拓人脉、保持动力并大胆尝试",
    plain_risk_zh: "容易精力分散，或为了新鲜感投入过量",
  },
  {
    meaning_id: "ZW-STAR-JUMEN",
    star: "巨门",
    constructive: "questioning, articulation, investigation, naming ambiguity",
    constructive_zh: "提出问题、清楚表达、深入调查、说清含混之处",
    overextension: "rumination, argument loops, mistrust amplified by incomplete information",
    overextension_zh: "反复思虑、陷入争论循环、不完整信息放大猜疑",
    plain_strength_zh: "善于追问、调查，并把含糊之处说清楚",
    plain_risk_zh: "容易陷入争论和反复猜疑，被不完整信息拖住",
  },
  {
    meaning_id: "ZW-STAR-TIANXIANG",
    star: "天相",
    constructive: "mediation, standards, role balance, institutional fit",
    constructive_zh: "居中调解、守住标准、平衡角色、寻找制度适配",
    overextension: "indecision, over-accommodation, relying too much on external approval",
    overextension_zh: "难以决断、过度迁就、过分依赖外界认可",
    plain_strength_zh: "能平衡角色、守住标准并协调各方",
    plain_risk_zh: "容易过度迁就，或因顾虑各方而迟迟不决",
  },
  {
    meaning_id: "ZW-STAR-TIANLIANG",
    star: "天梁",
    constructive: "protection, principle, mentoring, taking the long view",
    constructive_zh: "提供保护、坚持原则、给予指导、采取长远视角",
    overextension: "moral burden, rescuing, becoming inflexible in the name of principle",
    overextension_zh: "背负道德压力、过度拯救、以原则之名变得僵化",
    plain_strength_zh: "能坚持原则、保护他人并提供长远判断",
    plain_risk_zh: "容易背负过多责任，或因原则而变得僵硬",
  },
  {
    meaning_id: "ZW-STAR-QISHA",
    star: "七杀",
    constructive: "decisive action, autonomy, pressure tolerance, cutting through",
    constructive_zh: "果断行动、保持自主、承受压力、突破阻滞",
    overextension: "abruptness, isolation, treating every problem as a test of force",
    overextension_zh: "行事突兀、陷入孤立、把每个问题都当作力量考验",
    plain_strength_zh: "能在压力下迅速决断并突破阻滞",
    plain_risk_zh: "容易行动过急、独自硬扛，把问题都变成硬碰硬",
  },
  {
    meaning_id: "ZW-STAR-POJUN",
    star: "破军",
    constructive: "dismantling, renewal, experimentation after disruption",
    constructive_zh: "拆解旧安排、推动更新、在扰动后开展试验",
    overextension: "burning bridges, change for its own sake, underestimating transition cost",
    overextension_zh: "切断退路、为了变化而变化、低估转换成本",
    plain_strength_zh: "敢于拆掉旧安排，在变化后重新建立秩序",
    plain_risk_zh: "容易为了变化而变化，低估过渡成本和退路",
  },
];

export const ZIWEI_TRANSFORMATION_LENSES = [
  {
    meaning_id: "ZW-TRANSFORMATION-LU",
    transformation: "禄",
    process_lens: "attraction, access, resources or ease of flow",
    process_lens_zh: "吸引力、进入机会、资源取得或流动较顺",
    unsafe_shortcut: "guaranteed money or good luck",
    unsafe_shortcut_zh: "保证获得金钱或好运",
  },
  {
    meaning_id: "ZW-TRANSFORMATION-QUAN",
    transformation: "权",
    process_lens: "agency, responsibility, leverage or pressure to act",
    process_lens_zh: "能动性、责任、可运用的杠杆或推动行动的压力",
    unsafe_shortcut: "guaranteed power or promotion",
    unsafe_shortcut_zh: "保证获得权力或晋升",
  },
  {
    meaning_id: "ZW-TRANSFORMATION-KE",
    transformation: "科",
    process_lens: "visibility, ordering, explanation or recognized competence",
    process_lens_zh: "可见度、秩序化、说明能力或可被识别的胜任表现",
    unsafe_shortcut: "guaranteed fame, exam or credential outcome",
    unsafe_shortcut_zh: "保证名声、考试或资质结果",
  },
  {
    meaning_id: "ZW-TRANSFORMATION-JI",
    transformation: "忌",
    process_lens: "friction, obligation, repetition, blind spot or higher cost",
    process_lens_zh: "摩擦、义务、反复、盲点或更高成本",
    unsafe_shortcut: "disaster, punishment or inevitable loss",
    unsafe_shortcut_zh: "灾难、惩罚或不可避免的损失",
  },
];

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function requireUnique(records, field, label) {
  const values = records.map((record) => record[field]);
  if (values.some((value) => typeof value !== "string" || !value)) {
    throw new Error(`${label} contains an empty ${field}`);
  }
  if (new Set(values).size !== values.length) {
    throw new Error(`${label} contains duplicate ${field} values`);
  }
}

if (ZIWEI_TOPIC_MARKERS.length !== 5) throw new Error("Zi Wei topic registry must contain exactly five topics");
if (ZIWEI_MAJOR_STAR_MEANINGS.length !== 14) throw new Error("Zi Wei star registry must contain exactly fourteen major stars");
if (ZIWEI_TRANSFORMATION_LENSES.length !== 4) throw new Error("Zi Wei transformation registry must contain exactly four lenses");
requireUnique(ZIWEI_TOPIC_MARKERS, "meaning_id", "Zi Wei topic registry");
requireUnique(ZIWEI_TOPIC_MARKERS, "topic", "Zi Wei topic registry");
requireUnique(ZIWEI_MAJOR_STAR_MEANINGS, "meaning_id", "Zi Wei star registry");
requireUnique(ZIWEI_MAJOR_STAR_MEANINGS, "star", "Zi Wei star registry");
requireUnique(ZIWEI_TRANSFORMATION_LENSES, "meaning_id", "Zi Wei transformation registry");
requireUnique(ZIWEI_TRANSFORMATION_LENSES, "transformation", "Zi Wei transformation registry");

deepFreeze(ZIWEI_TOPIC_MARKERS);
deepFreeze(ZIWEI_MAJOR_STAR_MEANINGS);
deepFreeze(ZIWEI_TRANSFORMATION_LENSES);

const TOPIC_BY_ID = new Map(ZIWEI_TOPIC_MARKERS.map((record) => [record.topic, record]));
const TOPIC_BY_MEANING_ID = new Map(ZIWEI_TOPIC_MARKERS.map((record) => [record.meaning_id, record]));
const STAR_BY_NAME = new Map(ZIWEI_MAJOR_STAR_MEANINGS.map((record) => [record.star, record]));
const STAR_BY_MEANING_ID = new Map(ZIWEI_MAJOR_STAR_MEANINGS.map((record) => [record.meaning_id, record]));
const TRANSFORMATION_BY_LABEL = new Map(
  ZIWEI_TRANSFORMATION_LENSES.map((record) => [record.transformation, record]),
);
const TRANSFORMATION_BY_MEANING_ID = new Map(
  ZIWEI_TRANSFORMATION_LENSES.map((record) => [record.meaning_id, record]),
);

export function getZiweiTopicMeaning(topicOrMeaningId) {
  return TOPIC_BY_ID.get(topicOrMeaningId) || TOPIC_BY_MEANING_ID.get(topicOrMeaningId);
}

export function getZiweiMajorStarMeaning(starOrMeaningId) {
  return STAR_BY_NAME.get(starOrMeaningId) || STAR_BY_MEANING_ID.get(starOrMeaningId);
}

export function getZiweiTransformationMeaning(transformationOrMeaningId) {
  return TRANSFORMATION_BY_LABEL.get(transformationOrMeaningId)
    || TRANSFORMATION_BY_MEANING_ID.get(transformationOrMeaningId);
}
