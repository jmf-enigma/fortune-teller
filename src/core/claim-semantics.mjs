import { FortuneTellerError } from "./errors.mjs";
import { ZIWEI_MEANING_BINDING_SCHEMA } from "./meaning-layer.mjs";

/**
 * Typed calculation-assertion DSL
 * =================================
 *
 * A narrative claim must not be trusted merely because it cites a fact that
 * exists.  `semantic_bindings` says exactly which relation is asserted, this
 * module checks every duplicated field against the resolved calculation fact,
 * and `canonicalTechnicalSummary` renders the verified relation from the
 * calculation (never from untrusted prose).
 *
 * Supported binding shapes (all fields shown are required; no extras):
 *
 * - hexagram_identity
 *   { kind, fact_id, role: "primary"|"transformed", king_wen_number, name }
 * - iching_line
 *   { kind, fact_id, position_from_bottom, line_value, line_type }
 * - meihua_trigram
 *   { kind, fact_id, role: "upper"|"lower", number, name, symbol }
 * - meihua_moving_line
 *   { kind, fact_id, position_from_bottom }
 * - tarot_card
 *   { kind, fact_id, position, card_id, title, title_zh, orientation }
 * - bazi_pillar
 *   { kind, fact_id, pillar, stem_branch, heavenly_stem, earthly_branch }
 * - bazi_relationship
 *   { kind, fact_id, relationship, values, pillar_ids, pillars }
 * - western_planet
 *   { kind, fact_id, body, sign, sign_zh, motion_state, retrograde }
 * - western_aspect
 *   { kind, fact_id, body_1, body_2, aspect, separation_degrees, orb_degrees }
 * - star_in_palace
 *   { kind, fact_id, star, palace, star_group: "major"|"minor"|"adjective",
 *     brightness? }
 * - opposite_major_star_context
 *   { kind, fact_id, star, target_palace, source_palace_fact_id,
 *     source_palace, borrowed_for: "context_only" }
 * - mutagen_in_palace
 *   { kind, fact_id, star, transformation, palace }
 * - period_transformation
 *   { kind, fact_id, scope: "decadal"|"yearly", star, transformation,
 *     natal_palace }
 * - period_star_in_slot
 *   { kind, fact_id, topic_unit_id, scope: "decadal"|"yearly",
 *     relation_role, star, period_palace, natal_palace }
 *
 * Integration contract:
 *
 * 1. A calculation_fact claim's `statement` must exactly equal
 *    `canonicalCalculationFactStatement(calculation, fact_ids)`.
 * 2. Each technical relation explicitly asserted by any other epistemic
 *    status must have a verified semantic binding. Context-only cited facts do
 *    not themselves create a technical assertion.
 * 3. `claim.technical_summary` must exactly equal the mechanical rendering of
 *    all bindings, in their array order.
 * 4. Free narrative fields may interpret or suggest reality checks, but may
 *    not carry protected chart/cast assertions.  Technical assertions belong
 *    only in `technical_summary`.
 *
 * This architecture makes the typed assertion the authority.  The lexical
 * free-text guard is only a containment boundary, not the semantic verifier.
 */

const POSITION_LABELS = new Map([
  ["focus", "焦点位"],
  ["past", "过去位"],
  ["present", "现状位"],
  ["future", "未来位"],
  ["situation", "情境位"],
  ["action", "行动位"],
  ["outcome", "结果位"],
  ["option-a", "选项 A 位"],
  ["option-b", "选项 B 位"],
  ["decision-lens", "决策观察位"],
  ["challenge", "挑战位"],
  ["foundation", "基础位"],
  ["recent-past", "近期过去位"],
  ["possibility", "可能性位"],
  ["near-future", "近期未来位"],
  ["self", "自我位"],
  ["environment", "环境位"],
  ["hopes-and-fears", "希望与担忧位"],
]);

const PILLAR_LABELS = new Map([
  ["year", "年柱"],
  ["month", "月柱"],
  ["day", "日柱"],
  ["time", "时柱"],
]);

const LINE_LABELS = new Map([
  ["old-yin-changing", "老阴，动爻"],
  ["young-yang", "少阳，静爻"],
  ["young-yin", "少阴，静爻"],
  ["old-yang-changing", "老阳，动爻"],
]);

const BAZI_RELATIONSHIP_LABELS = new Map([
  ["stem_five_combination", "天干五合"],
  ["branch_six_harmony", "地支六合"],
  ["branch_clash", "地支相冲"],
  ["branch_full_three_harmony", "地支三合局"],
]);

const WESTERN_BODY_LABELS = new Map([
  ["sun", "太阳"], ["moon", "月亮"], ["mercury", "水星"], ["venus", "金星"],
  ["mars", "火星"], ["jupiter", "木星"], ["saturn", "土星"], ["uranus", "天王星"],
  ["neptune", "海王星"], ["pluto", "冥王星"],
]);

const ASPECT_LABELS = new Map([
  ["conjunction", "合相"],
  ["sextile", "六分相"],
  ["square", "四分相"],
  ["trine", "三分相"],
  ["opposition", "对冲相"],
]);

const MOTION_LABELS = new Map([
  ["direct", "顺行"],
  ["retrograde", "逆行"],
  ["stationary-or-uncertain", "停滞或方向未定"],
]);

const STAR_GROUP_LABELS = new Map([
  ["major", "主星"],
  ["minor", "辅星"],
  ["adjective", "杂曜"],
]);

const PERIOD_RELATION_ROLES = ["focus", "trine_plus_4", "trine_plus_8", "opposite_plus_6"];
const PERIOD_RELATION_LABELS = new Map([
  ["focus", "主题宫"],
  ["trine_plus_4", "三合背景一"],
  ["trine_plus_8", "三合背景二"],
  ["opposite_plus_6", "对向背景"],
]);

const FREE_TEXT_FIELDS = ["statement", "reasoning_summary", "alternative_readings", "practical_reflection"];

// These patterns define the vocabulary that may occur only in a mechanically
// rendered technical_summary for a non-calculation claim.  They are purposely
// broad: a false fact omitted from semantic_bindings must not be able to hide in
// polished prose simply because its wrong value is absent from the calculation.
const PROTECTED_NARRATIVE_PATTERNS = {
  iching: [
    /[卦爻]/u,
    /(?:本卦|变卦|之卦|动爻|静爻|六爻|阴爻|阳爻|老阴|少阴|老阳|少阳|上卦|下卦|卦名|卦序|爻序|由下至上|自下而上|由上至下|自上而下|第[一二三四五六1-6]爻)/u,
    /(?:乾|坤|屯|蒙|需|讼|师|比|小畜|履|泰|否|同人|大有|谦|豫|随|蛊|临|观|噬嗑|贲|剥|复|无妄|大畜|颐|大过|坎|离|咸|恒|遁|大壮|晋|明夷|家人|睽|蹇|解|损|益|夬|姤|萃|升|困|井|革|鼎|震|艮|渐|归妹|丰|旅|巽|兑|涣|节|中孚|小过|既济|未济)(?:卦|之|变)(?:乾|坤|屯|蒙|需|讼|师|比|小畜|履|泰|否|同人|大有|谦|豫|随|蛊|临|观|噬嗑|贲|剥|复|无妄|大畜|颐|大过|坎|离|咸|恒|遁|大壮|晋|明夷|家人|睽|蹇|解|损|益|夬|姤|萃|升|困|井|革|鼎|震|艮|渐|归妹|丰|旅|巽|兑|涣|节|中孚|小过|既济|未济)?/u,
  ],
  meihua: [
    /[卦爻]/u,
    /(?:本卦|变卦|之卦|动爻|静爻|六爻|阴爻|阳爻|上卦|下卦|体卦|用卦|卦名|卦序|爻序|取余|余数|由下至上|自下而上|由上至下|自上而下|第[一二三四五六1-6]爻)/u,
    /(?:乾|坤|屯|蒙|需|讼|师|比|小畜|履|泰|否|同人|大有|谦|豫|随|蛊|临|观|噬嗑|贲|剥|复|无妄|大畜|颐|大过|坎|离|咸|恒|遁|大壮|晋|明夷|家人|睽|蹇|解|损|益|夬|姤|萃|升|困|井|革|鼎|震|艮|渐|归妹|丰|旅|巽|兑|涣|节|中孚|小过|既济|未济)(?:卦|之|变)(?:乾|坤|屯|蒙|需|讼|师|比|小畜|履|泰|否|同人|大有|谦|豫|随|蛊|临|观|噬嗑|贲|剥|复|无妄|大畜|颐|大过|坎|离|咸|恒|遁|大壮|晋|明夷|家人|睽|蹇|解|损|益|夬|姤|萃|升|困|井|革|鼎|震|艮|渐|归妹|丰|旅|巽|兑|涣|节|中孚|小过|既济|未济)?/u,
  ],
  tarot: [
    /(?:正位|逆位|牌位|牌面|抽到|抽得|出现.{0,8}(?:牌|卡)|(?:牌|卡).{0,8}(?:位于|落在|处于))/u,
    /(?:(?:愚人|魔术师|女祭司|皇后|皇帝|教皇|恋人|战车|力量|隐士|命运之轮|正义|倒吊人|死神|节制|恶魔|高塔|星星|月亮|太阳|审判|世界|(?:权杖|圣杯|宝剑|星币)(?:王牌|二|三|四|五|六|七|八|九|十|侍从|骑士|王后|国王))(?:牌)?).{0,8}(?:提示|表示|象征|说明|意味着|带来|指出)/u,
    /\b(?:upright|reversed|card position|drawn card)\b/iu,
  ],
  bazi: [
    /(?:年柱|月柱|日柱|时柱|四柱|天干|地支|干支|日主|相冲|六合|三合|五合|刑|害|破)/u,
    /[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥].{0,6}(?:为|是|位于|落在|作为|对应)/u,
  ],
  western: [
    /(?:(?:太阳|月亮|水星|金星|火星|木星|土星|天王星|海王星|冥王星|行星|上升点|天顶).{0,16}(?:白羊座|金牛座|双子座|巨蟹座|狮子座|处女座|天秤座|天蝎座|射手座|摩羯座|水瓶座|双鱼座|顺行|逆行|合相|六分相|四分相|三分相|对冲相|相位|宫))/u,
    /\b(?:sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto).{0,30}(?:aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces|direct|retrograde|conjunction|sextile|square|trine|opposition|house)\b/iu,
  ],
  ziwei: [
    /(?:化[禄权科忌]|四化|三方四正|本命|大限|流年)/u,
    /(?:(?:位于|落入|落在|坐守|坐于|坐|居|守在|入|见).{0,12}宫|宫.{0,12}(?:有|见|坐守|坐|居|落|入))/u,
    /(?:命|兄弟|夫妻|子女|财帛|疾厄|迁移|仆役|官禄|田宅|福德|父母)宫?(?:内|中|里)?的[\p{Script=Han}]{1,8}/u,
  ],
};

function pointerToken(value) {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function decodedPointerTokens(pointer) {
  return pointer.split("/").slice(1).map((token) => token.replaceAll("~1", "/").replaceAll("~0", "~"));
}

function resolvePointer(root, pointer) {
  let value = root;
  for (const token of decodedPointerTokens(pointer)) {
    if (value == null || typeof value !== "object" || !Object.hasOwn(value, token)) return null;
    value = value[token];
  }
  return value;
}

function collectFactReferences(value, path = "/facts", target = new Map()) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectFactReferences(item, `${path}/${index}`, target));
    return target;
  }
  if (!value || typeof value !== "object") return target;
  if (typeof value.fact_id === "string") target.set(value.fact_id, { path, value });
  for (const [key, child] of Object.entries(value)) {
    collectFactReferences(child, `${path}/${pointerToken(key)}`, target);
  }
  return target;
}

function resolveFact(calculation, factId) {
  if (typeof factId !== "string" || !factId) return null;
  if (factId.startsWith("jsonptr:/facts/")) {
    const path = factId.slice("jsonptr:".length);
    const value = resolvePointer(calculation, path);
    return value === null ? null : { path, value };
  }
  return collectFactReferences(calculation?.facts).get(factId) || null;
}

function validateFactIds(calculation, factIds) {
  if (!calculation || typeof calculation !== "object" || Array.isArray(calculation)) {
    throw new FortuneTellerError("INVALID_SEMANTIC_CALCULATION", "calculation must be an object");
  }
  if (!Array.isArray(factIds) || factIds.length === 0) {
    throw new FortuneTellerError("INVALID_SEMANTIC_FACT_IDS", "factIds must be a non-empty array");
  }
  if (factIds.some((factId) => typeof factId !== "string" || !factId)) {
    throw new FortuneTellerError("INVALID_SEMANTIC_FACT_IDS", "factIds entries must be non-empty strings");
  }
  if (new Set(factIds).size !== factIds.length) {
    throw new FortuneTellerError("INVALID_SEMANTIC_FACT_IDS", "factIds must not contain duplicates");
  }
  return factIds.map((factId) => {
    const resolved = resolveFact(calculation, factId);
    if (!resolved) {
      throw new FortuneTellerError("UNKNOWN_SEMANTIC_FACT", "a semantic fact reference is unknown", { fact_id: factId });
    }
    return { factId, ...resolved };
  });
}

function numberText(value) {
  return Number.isFinite(value) ? String(value) : "数值未提供";
}

function palaceLabel(name) {
  return typeof name === "string" && name.endsWith("宫") ? name : `${name}宫`;
}

function hexagramFragment(role, value) {
  const label = role === "primary" ? "本卦" : "变卦";
  return `${label}为第${value.king_wen_number}卦“${value.name}”`;
}

function ichingLineFragment(value) {
  const label = LINE_LABELS.get(value.type) || "爻态未分类";
  return `自下而上第${value.position_from_bottom}爻为${value.value}（${label}）`;
}

function tarotFragment(value) {
  const position = POSITION_LABELS.get(value.position) || `${value.position}位`;
  const orientation = value.orientation === "upright" ? "正位" : value.orientation === "reversed" ? "逆位" : "方向未定";
  return `${position}为${value.title_zh}（${value.title}）${orientation}`;
}

function baziPillarFragment(value) {
  const pillar = PILLAR_LABELS.get(value.pillar) || `${value.pillar}柱`;
  return `${pillar}为${value.stem_branch}（天干${value.heavenly_stem}、地支${value.earthly_branch}）`;
}

function baziRelationshipFragment(value) {
  const label = BAZI_RELATIONSHIP_LABELS.get(value.relationship) || "已计算的干支关系";
  if (value.relationship === "branch_full_three_harmony") {
    const element = value.traditional_element_label ? `（${value.traditional_element_label}局）` : "";
    return `地支${value.values.join("、")}构成${label}${element}`;
  }
  const participants = value.pillars.map((pillar, index) =>
    `${PILLAR_LABELS.get(pillar) || `${pillar}柱`}${value.values[index] || ""}`);
  return `${participants.join("与")}构成${label}`;
}

function westernPlanetFragment(value) {
  const body = value.label_zh || WESTERN_BODY_LABELS.get(value.body) || value.body;
  const motion = MOTION_LABELS.get(value.motion_state) || value.motion_state;
  return `${body}位于${value.sign_zh || value.sign}${numberText(value.degree_in_sign)}°，运行状态为${motion}`;
}

function westernAspectFragment(value) {
  const left = WESTERN_BODY_LABELS.get(value.body_1) || value.body_1;
  const right = WESTERN_BODY_LABELS.get(value.body_2) || value.body_2;
  const aspect = ASPECT_LABELS.get(value.aspect) || value.aspect;
  return `${left}与${right}呈${aspect}，分离角${numberText(value.separation_degrees)}°，容许度${numberText(value.orb_degrees)}°`;
}

function autoFactFragment(calculation, resolved, ordinal) {
  const { path, value } = resolved;
  if (calculation.system === "iching") {
    if (path === "/facts/primary") return hexagramFragment("primary", value);
    if (path === "/facts/transformed") return hexagramFragment("transformed", value);
    if (/^\/facts\/lines\/\d+$/u.test(path)) return ichingLineFragment(value);
  }
  if (calculation.system === "meihua") {
    if (path === "/facts/primary") return hexagramFragment("primary", value);
    if (path === "/facts/transformed") return hexagramFragment("transformed", value);
    if (path === "/facts/upper_trigram") return `上卦为${value.name}（${value.symbol}）`;
    if (path === "/facts/lower_trigram") return `下卦为${value.name}（${value.symbol}）`;
    if (path === "/facts/moving_line") return `动爻为自下而上第${value.position_from_bottom}爻`;
  }
  if (calculation.system === "tarot" && /^\/facts\/cards\/\d+$/u.test(path)) return tarotFragment(value);
  if (calculation.system === "bazi") {
    if (/^\/facts\/pillars\/\d+$/u.test(path)) return baziPillarFragment(value);
    if (/^\/facts\/structure\/relationships\/\d+$/u.test(path)) return baziRelationshipFragment(value);
    if (/^\/facts\/stable_pillars\/\d+$/u.test(path)) {
      const pillar = PILLAR_LABELS.get(value.pillar) || `${value.pillar}柱`;
      const alternatives = (value.alternatives || []).map((item) => item.value).join("、") || "无可用候选";
      return `${pillar}全日扫描状态为${value.status}，候选为${alternatives}`;
    }
  }
  if (calculation.system === "western") {
    if (/^\/facts\/planets\/\d+$/u.test(path)) return westernPlanetFragment(value);
    if (/^\/facts\/aspects\/\d+$/u.test(path)) return westernAspectFragment(value);
    if (/^\/facts\/planet_ranges\/\d+$/u.test(path)) {
      const body = value.label_zh || WESTERN_BODY_LABELS.get(value.body) || value.body;
      return `${body}星座状态为${value.sign_status}，候选星座为${(value.sign_candidates || []).join("、") || "无"}`;
    }
  }
  if (calculation.system === "ziwei") {
    if (/^\/facts\/palaces\/\d+$/u.test(path)) {
      const stars = (value.major_stars || []).map((star) => star.name).join("、") || "无主星";
      return `${palaceLabel(value.name)}主星为${stars}`;
    }
    if (/^\/facts\/structure\/mutagen_locations\/\d+$/u.test(path)) {
      return `${value.star}化${value.mutagen}位于${palaceLabel(value.palace)}`;
    }
    if (/^\/facts\/periods\/(?:decadal|yearly)\/mutagens\/\d+$/u.test(path)) {
      const scope = path.includes("/decadal/") ? "大限" : "流年";
      const palaces = (value.natal_locations || []).map((location) => palaceLabel(location.natal_palace_name)).join("、") || "无本命落点";
      return `${scope}${value.star}化${value.transformation}，本命落点为${palaces}`;
    }
  }
  return `第${ordinal}项所引结构化计算事实已按原值核对；该对象暂无受支持的自然语言技术表述`;
}

function finishFragments(fragments) {
  return `${fragments.join("；")}。`;
}

/**
 * Render a calculation_fact claim from resolved facts only.  Unsupported fact
 * shapes receive a fixed neutral sentence; arbitrary narrative is never used.
 */
export function canonicalCalculationFactStatement(calculation, factIds) {
  const resolvedFacts = validateFactIds(calculation, factIds);
  return finishFragments(resolvedFacts.map((resolved, index) => autoFactFragment(calculation, resolved, index + 1)));
}

function bindingExpected(calculation, binding, resolved) {
  const { path, value } = resolved;
  switch (binding.kind) {
    case "hexagram_identity": {
      const role = path === "/facts/primary" ? "primary" : path === "/facts/transformed" ? "transformed" : null;
      if (!role || !["iching", "meihua"].includes(calculation.system)) return null;
      return {
        expected: {
          kind: "hexagram_identity", fact_id: binding.fact_id, role,
          king_wen_number: value.king_wen_number, name: value.name,
        },
        fragment: hexagramFragment(role, value),
      };
    }
    case "iching_line": {
      if (calculation.system !== "iching" || !/^\/facts\/lines\/\d+$/u.test(path)) return null;
      return {
        expected: {
          kind: "iching_line", fact_id: binding.fact_id,
          position_from_bottom: value.position_from_bottom, line_value: value.value, line_type: value.type,
        },
        fragment: ichingLineFragment(value),
      };
    }
    case "meihua_trigram": {
      const role = path === "/facts/upper_trigram" ? "upper" : path === "/facts/lower_trigram" ? "lower" : null;
      if (calculation.system !== "meihua" || !role) return null;
      return {
        expected: {
          kind: "meihua_trigram", fact_id: binding.fact_id, role,
          number: value.number, name: value.name, symbol: value.symbol,
        },
        fragment: `${role === "upper" ? "上卦" : "下卦"}为${value.name}（${value.symbol}）`,
      };
    }
    case "meihua_moving_line": {
      if (calculation.system !== "meihua" || path !== "/facts/moving_line") return null;
      return {
        expected: {
          kind: "meihua_moving_line", fact_id: binding.fact_id,
          position_from_bottom: value.position_from_bottom,
        },
        fragment: `动爻为自下而上第${value.position_from_bottom}爻`,
      };
    }
    case "tarot_card": {
      if (calculation.system !== "tarot" || !/^\/facts\/cards\/\d+$/u.test(path)) return null;
      return {
        expected: {
          kind: "tarot_card", fact_id: binding.fact_id, position: value.position,
          card_id: value.card_id, title: value.title, title_zh: value.title_zh,
          orientation: value.orientation,
        },
        fragment: tarotFragment(value),
      };
    }
    case "bazi_pillar": {
      if (calculation.system !== "bazi" || !/^\/facts\/pillars\/\d+$/u.test(path)) return null;
      return {
        expected: {
          kind: "bazi_pillar", fact_id: binding.fact_id, pillar: value.pillar,
          stem_branch: value.stem_branch, heavenly_stem: value.heavenly_stem,
          earthly_branch: value.earthly_branch,
        },
        fragment: baziPillarFragment(value),
      };
    }
    case "bazi_relationship": {
      if (calculation.system !== "bazi" || !/^\/facts\/structure\/relationships\/\d+$/u.test(path)) return null;
      return {
        expected: {
          kind: "bazi_relationship", fact_id: binding.fact_id, relationship: value.relationship,
          values: value.values, pillar_ids: value.pillar_ids, pillars: value.pillars,
        },
        fragment: baziRelationshipFragment(value),
      };
    }
    case "western_planet": {
      if (calculation.system !== "western" || !/^\/facts\/planets\/\d+$/u.test(path)) return null;
      return {
        expected: {
          kind: "western_planet", fact_id: binding.fact_id, body: value.body,
          sign: value.sign, sign_zh: value.sign_zh, motion_state: value.motion_state,
          retrograde: value.retrograde,
        },
        fragment: westernPlanetFragment(value),
      };
    }
    case "western_aspect": {
      if (calculation.system !== "western" || !/^\/facts\/aspects\/\d+$/u.test(path)) return null;
      return {
        expected: {
          kind: "western_aspect", fact_id: binding.fact_id, body_1: value.body_1,
          body_2: value.body_2, aspect: value.aspect,
          separation_degrees: value.separation_degrees, orb_degrees: value.orb_degrees,
        },
        fragment: westernAspectFragment(value),
      };
    }
    case "star_in_palace": {
      if (calculation.system !== "ziwei" || !/^\/facts\/palaces\/\d+$/u.test(path)) return null;
      const groupKey = { major: "major_stars", minor: "minor_stars", adjective: "adjective_stars" }[binding.star_group];
      const matchedStar = groupKey && Array.isArray(value[groupKey])
        ? value[groupKey].find((star) => star.name === binding.star) : null;
      if (!matchedStar || (Object.hasOwn(binding, "brightness") && typeof matchedStar.brightness !== "string")) return null;
      const brightness = Object.hasOwn(binding, "brightness")
        ? { brightness: matchedStar.brightness } : {};
      return {
        expected: {
          kind: "star_in_palace", fact_id: binding.fact_id, star: binding.star,
          palace: value.name, star_group: binding.star_group, ...brightness,
        },
        fragment: `${binding.star}位于${palaceLabel(value.name)}（${STAR_GROUP_LABELS.get(binding.star_group)}${Object.hasOwn(binding, "brightness") ? `，亮度${matchedStar.brightness}` : ""}）`,
      };
    }
    case "opposite_major_star_context": {
      if (
        calculation.system !== "ziwei"
        || !/^\/facts\/structure\/empty_palace_contexts\/\d+$/u.test(path)
        || value.status !== "context_available"
        || value.borrowed_attributes?.length !== 1
        || value.borrowed_attributes[0] !== "name"
        || !Array.isArray(value.forbidden_transfer)
        || !value.forbidden_transfer.includes("brightness")
        || !value.forbidden_transfer.includes("mutagen")
        || !Array.isArray(value.major_stars)
        || !value.major_stars.some((star) => (
          star?.name === binding.star
          && star.source_palace_id === value.source_palace_id
          && star.source_palace === value.source_palace
          && star.borrowed_for === "context_only"
          && !Object.hasOwn(star, "brightness")
          && !Object.hasOwn(star, "mutagen")
        ))
      ) return null;
      return {
        expected: {
          kind: "opposite_major_star_context",
          fact_id: binding.fact_id,
          star: binding.star,
          target_palace: value.target_palace,
          source_palace_fact_id: value.source_palace_id,
          source_palace: value.source_palace,
          borrowed_for: "context_only",
        },
        fragment: `${palaceLabel(value.target_palace)}本身无主星；只将${palaceLabel(value.source_palace)}的${binding.star}作为辅助语境，不视为${palaceLabel(value.target_palace)}坐守，也不带亮度或四化`,
      };
    }
    case "mutagen_in_palace": {
      if (calculation.system !== "ziwei" || !/^\/facts\/structure\/mutagen_locations\/\d+$/u.test(path)) return null;
      return {
        expected: {
          kind: "mutagen_in_palace", fact_id: binding.fact_id, star: value.star,
          transformation: value.mutagen, palace: value.palace,
        },
        fragment: `${value.star}化${value.mutagen}位于${palaceLabel(value.palace)}`,
      };
    }
    case "period_transformation": {
      const scope = path.startsWith("/facts/periods/decadal/mutagens/") ? "decadal"
        : path.startsWith("/facts/periods/yearly/mutagens/") ? "yearly" : null;
      if (calculation.system !== "ziwei" || !scope) return null;
      const location = Array.isArray(value.natal_locations)
        ? value.natal_locations.find((item) => item?.natal_palace_name === binding.natal_palace)
        : null;
      if (!location) return null;
      return {
        expected: {
          kind: "period_transformation", fact_id: binding.fact_id, scope,
          star: value.star, transformation: value.transformation,
          natal_palace: location.natal_palace_name,
        },
        fragment: `${scope === "decadal" ? "大限" : "流年"}${value.star}化${value.transformation}，本命落于${palaceLabel(location.natal_palace_name)}`,
      };
    }
    case "period_star_in_slot": {
      const scope = path.startsWith("/facts/periods/decadal/star_palaces/") ? "decadal"
        : path.startsWith("/facts/periods/yearly/star_palaces/") ? "yearly" : null;
      if (calculation.system !== "ziwei" || !scope) return null;
      const topicUnit = Array.isArray(calculation.facts?.phase_topic_units)
        ? calculation.facts.phase_topic_units.find((unit) => unit?.fact_id === binding.topic_unit_id)
        : null;
      const componentIds = Array.isArray(topicUnit?.[`${scope}_component_star_palace_ids`])
        ? topicUnit[`${scope}_component_star_palace_ids`] : [];
      if (
        componentIds.length !== 4
        || new Set(componentIds).size !== 4
        || JSON.stringify(topicUnit?.component_relation_offsets) !== "[0,4,8,6]"
      ) return null;
      const componentIndex = componentIds.indexOf(binding.fact_id);
      const relationRole = PERIOD_RELATION_ROLES[componentIndex];
      if (
        componentIndex < 0
        || !relationRole
        || !Array.isArray(value.stars)
        || !value.stars.some((star) => star?.name === binding.star)
      ) return null;
      const scopeLabel = scope === "decadal" ? "大限" : "流年";
      return {
        expected: {
          kind: "period_star_in_slot",
          fact_id: binding.fact_id,
          topic_unit_id: topicUnit.fact_id,
          scope,
          relation_role: relationRole,
          star: binding.star,
          period_palace: value.period_palace_name,
          natal_palace: value.natal_palace_name,
        },
        fragment: `${scopeLabel}${PERIOD_RELATION_LABELS.get(relationRole)}见${binding.star}，${scopeLabel}盘${palaceLabel(value.period_palace_name)}对应本命${palaceLabel(value.natal_palace_name)}`,
      };
    }
    default:
      return undefined;
  }
}

function equalJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function canonicalObject(value) {
  if (Array.isArray(value)) return value.map(canonicalObject);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalObject(value[key])]));
}

function bindingSignature(binding) {
  return JSON.stringify(canonicalObject(binding));
}

function narrativeStrings(claim) {
  const entries = [];
  for (const field of FREE_TEXT_FIELDS) {
    const value = claim?.[field];
    if (typeof value === "string") entries.push({ field, text: value });
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === "string") entries.push({ field: `${field}[${index}]`, text: item });
      });
    }
  }
  return entries;
}

function validateFreeNarrative(claim, calculation, errors) {
  const closedZiweiNarrative = calculation.system === "ziwei"
    && claim?.epistemic_status === "interpretation"
    && ["topic_synthesis", "topic_transformation", "phase_topic_synthesis"].includes(claim?.scope)
    && claim?.meaning_binding?.schema === ZIWEI_MEANING_BINDING_SCHEMA;
  // These five fields are independently regenerated and required to match the
  // closed meaning layer exactly. That stronger equality check safely permits
  // the exact star, palace, and transformation names needed for specificity.
  if (closedZiweiNarrative) return;
  const patterns = PROTECTED_NARRATIVE_PATTERNS[calculation.system] || [];
  for (const { field, text } of narrativeStrings(claim)) {
    if (claim?.epistemic_status === "calculation_fact" && field === "statement") continue;
    if (patterns.some((pattern) => pattern.test(text.normalize("NFKC")))) {
      errors.push(`${field} contains a protected ${calculation.system} technical assertion; move it to semantic_bindings and technical_summary`);
    }
  }
}

function inspectBindings(calculation, bindings, factIds, errors) {
  const fragments = [];
  const verified = [];
  const seen = new Set();
  if (!Array.isArray(bindings)) return { fragments, verified };
  bindings.forEach((binding, index) => {
    const at = `semantic_bindings[${index}]`;
    if (!binding || typeof binding !== "object" || Array.isArray(binding)) {
      errors.push(`${at} must be an object`);
      return;
    }
    if (typeof binding.kind !== "string" || typeof binding.fact_id !== "string") {
      errors.push(`${at} requires string kind and fact_id`);
      return;
    }
    if (!factIds.includes(binding.fact_id)) errors.push(`${at}.fact_id must also appear in fact_ids`);
    if (
      binding.kind === "period_star_in_slot"
      && (typeof binding.topic_unit_id !== "string" || !factIds.includes(binding.topic_unit_id))
    ) {
      errors.push(`${at}.topic_unit_id must also appear in fact_ids`);
    }
    const signature = bindingSignature(binding);
    if (seen.has(signature)) errors.push(`${at} duplicates another semantic binding`);
    seen.add(signature);
    const resolved = resolveFact(calculation, binding.fact_id);
    if (!resolved) {
      errors.push(`${at}.fact_id is unknown`);
      return;
    }
    const specification = bindingExpected(calculation, binding, resolved);
    if (specification === undefined) {
      errors.push(`${at}.kind is unsupported`);
      return;
    }
    if (specification === null) {
      errors.push(`${at} kind does not match the cited calculation fact`);
      return;
    }
    if (!equalJson(canonicalObject(binding), canonicalObject(specification.expected))) {
      errors.push(`${at} fields do not exactly match the cited calculation fact`);
      return;
    }
    verified.push(binding);
    fragments.push(specification.fragment);
  });
  return { fragments, verified };
}

/**
 * Verify and render a semantic_bindings array. Invalid bindings throw; this is
 * useful to generators that need the one canonical technical_summary string.
 */
export function canonicalTechnicalSummary(calculation, semanticBindings, factIds) {
  const resolvedFacts = validateFactIds(calculation, factIds);
  void resolvedFacts;
  const errors = [];
  const inspected = inspectBindings(calculation, semanticBindings, factIds, errors);
  if (!Array.isArray(semanticBindings) || semanticBindings.length === 0) {
    errors.push("semantic_bindings must be a non-empty array");
  }
  if (errors.length) {
    throw new FortuneTellerError("INVALID_SEMANTIC_BINDING", errors[0], { errors });
  }
  return finishFragments(inspected.fragments);
}

/**
 * Validate a claim's semantic relationship to one calculation.
 *
 * Returns { valid, errors, canonical_statement, expected_technical_summary }.
 * It never treats a cited fact's mere existence as evidence that prose says the
 * same thing: supported relationships must match the typed DSL and its exact
 * mechanical rendering.
 */
export function validateClaimSemantics(claim, calculation, factIds = claim?.fact_ids) {
  const errors = [];
  let resolvedFacts = [];
  let canonicalStatement = null;
  let expectedTechnicalSummary = null;
  try {
    resolvedFacts = validateFactIds(calculation, factIds);
  } catch (error) {
    errors.push(error instanceof FortuneTellerError ? error.message : "semantic fact resolution failed");
  }
  if (!claim || typeof claim !== "object" || Array.isArray(claim)) {
    errors.push("claim must be an object");
    return { valid: false, errors, canonical_statement: null, expected_technical_summary: null };
  }
  if (typeof claim.system === "string" && claim.system !== calculation?.system) {
    errors.push("claim.system does not match calculation.system");
  }
  if (claim.epistemic_status === "calculation_fact" && resolvedFacts.length === factIds?.length) {
    canonicalStatement = finishFragments(resolvedFacts.map((resolved, index) => autoFactFragment(calculation, resolved, index + 1)));
    if (claim.statement !== canonicalStatement) {
      errors.push("calculation_fact statement must exactly equal the canonical fact rendering");
    }
  }

  const bindings = claim.semantic_bindings;
  if (Object.hasOwn(claim, "semantic_bindings") && (!Array.isArray(bindings) || bindings.length === 0)) {
    errors.push("semantic_bindings must be a non-empty array when present");
  }
  const inspected = inspectBindings(calculation, bindings, Array.isArray(factIds) ? factIds : [], errors);
  if (Array.isArray(bindings) && bindings.length > 0 && inspected.fragments.length === bindings.length) {
    expectedTechnicalSummary = finishFragments(inspected.fragments);
    if (claim.technical_summary !== expectedTechnicalSummary) {
      errors.push("technical_summary must exactly equal the mechanical semantic binding rendering");
    }
  } else if (Object.hasOwn(claim, "technical_summary")) {
    errors.push("technical_summary requires at least one fully verified semantic binding");
  }

  // Cited facts may be contextual evidence without making a technical
  // assertion. Only relations explicitly declared in semantic_bindings are
  // mechanically rendered. The protected free-text boundary below prevents
  // technical chart/cast claims from being smuggled into narrative prose.
  validateFreeNarrative(claim, calculation, errors);

  return {
    valid: errors.length === 0,
    errors,
    canonical_statement: canonicalStatement,
    expected_technical_summary: expectedTechnicalSummary,
  };
}
