import { verifyCalculationFacts } from "./calculation-verifier.mjs";
import { FortuneTellerError } from "./errors.mjs";
import {
  WESTERN_ASPECT_AXES,
  WESTERN_HOUSE_AXES,
  WESTERN_INTERPRETATION_META,
  WESTERN_PLANET_AXES,
  WESTERN_SIGN_AXES,
  WESTERN_TOPIC_HOUSES,
} from "../data/western-interpretation-rulepack.mjs";

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];
const RULERS = [
  "mars", "venus", "mercury", "moon", "sun", "mercury",
  "venus", "mars", "jupiter", "saturn", "saturn", "jupiter",
];

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function ensureCalculation(calculation) {
  if (!calculation || calculation.system !== "western") {
    throw new FortuneTellerError("WESTERN_ADJUDICATION_INPUT_INVALID", "Western adjudication requires one Western calculation envelope");
  }
  const replay = verifyCalculationFacts(calculation);
  if (replay.errors.length) {
    throw new FortuneTellerError("WESTERN_ADJUDICATION_FACTS_UNVERIFIED", "Western adjudication refuses facts that do not replay", { errors: replay.errors });
  }
  return replay.status;
}

function unknownTimeResult(calculation, replayStatus, topic) {
  const ranges = calculation.facts?.planet_ranges || [];
  const stable = ranges.filter((range) => range.sign_status === "stable");
  const changing = ranges.filter((range) => range.sign_status !== "stable");
  return deepFreeze({
    schema_version: "western-adjudication-v0.5",
    system: "western",
    status: "qualified",
    topic,
    conclusion: `出生时刻未知，本轮只能确认${stable.length}颗星体的全天稳定星座范围；${topic === "overview" ? "上升、宫位和依赖它们的主题主轴" : "所选领域依赖的主题宫与宫主星"}不作判断。`,
    plain_language: changing.length
      ? `${changing.map((range) => range.label_zh).join("、")}在出生当天跨越星座边界，连星座表达方式也需保留候选。`
      : "星体星座在当天稳定，但这仍不能补出上升点、宫位或整宫主题。",
    lenses: {
      stable_planet_signs: stable.map((range) => ({ fact_id: range.fact_id, body: range.body, candidates: range.sign_candidates })),
      boundary_sensitive_planets: changing.map((range) => ({ fact_id: range.fact_id, body: range.body, candidates: range.sign_candidates })),
      houses: { status: "unavailable", reason: "birth time missing" },
    },
    basis: ranges.map((range) => range.fact_id),
    change_conditions: ["补充有来源的出生时刻后，必须重新计算上升、宫位、相位精确度与主题主轴。"],
    reality_checks: ["先核对出生证、医院记录或家人同期记录；不要用性格描述倒推出生时刻。"],
    rulepack: WESTERN_INTERPRETATION_META,
    safeguards: { score_used: false, event_prediction_used: false, unknown_time_houses_used: false },
    audit: { calculation_replay_status: replayStatus },
  });
}

function conditionText(condition) {
  if (!condition || condition.domicile_axis === "not_applicable_outer_planet") return "不套用古典七星尊贵状态";
  const labels = [];
  if (condition.domicile_axis === "domicile") labels.push("入庙：表达较顺手");
  if (condition.domicile_axis === "detriment") labels.push("失势：较需要外部结构协助");
  if (condition.exaltation_axis === "exaltation") labels.push("擢升：功能容易被集中使用");
  if (condition.exaltation_axis === "fall") labels.push("落陷：容易走到不熟悉或过度补偿的一端");
  return labels.join("；") || "古典本质状态中性";
}

function houseSign(firstHouseSign, house) {
  const first = SIGNS.indexOf(firstHouseSign);
  return SIGNS[(first + house - 1) % 12];
}

function planetUnit(planet, placement, condition) {
  const role = WESTERN_PLANET_AXES[planet.body];
  const sign = WESTERN_SIGN_AXES[planet.sign];
  return {
    body: planet.body,
    label: role.label,
    planet_fact_id: planet.fact_id,
    placement_fact_id: placement?.fact_id || null,
    condition_fact_id: condition?.fact_id || null,
    sign: planet.sign,
    sign_label: sign.label,
    house: placement?.house || null,
    function: role.function,
    expression: sign.style,
    constructive: role.constructive,
    excess: `${role.excess}；${sign.excess}`,
    traditional_condition: conditionText(condition),
  };
}

export function adjudicateWestern(calculation, options = {}) {
  const replayStatus = ensureCalculation(calculation);
  const topic = options.topic || "overview";
  if (!Object.hasOwn(WESTERN_TOPIC_HOUSES, topic)) {
    throw new FortuneTellerError("WESTERN_ADJUDICATION_TOPIC_INVALID", `unsupported Western topic: ${String(topic)}`);
  }
  if (calculation.facts?.mode !== "known-time") return unknownTimeResult(calculation, replayStatus, topic);
  const planets = calculation.facts.planets || [];
  const aspects = calculation.facts.aspects || [];
  const houses = calculation.facts.houses;
  const conditions = calculation.facts.structure?.traditional_conditions?.essential_conditions || [];
  const chartRuler = calculation.facts.structure?.traditional_conditions?.chart_ruler;
  const placements = houses?.placements || [];
  const planetByBody = new Map(planets.map((planet) => [planet.body, planet]));
  const placementByBody = new Map(placements.map((placement) => [placement.body, placement]));
  const conditionByBody = new Map(conditions.map((condition) => [condition.body, condition]));

  const primaryHouse = WESTERN_TOPIC_HOUSES[topic][0];
  let topicBody = null;
  let topicSelection = "luminary_axis_without_houses";
  let topicHouseSign = null;
  let topicOccupants = [];
  if (houses) {
    topicOccupants = placements.filter((placement) => placement.house === primaryHouse).map((placement) => placement.body);
    topicHouseSign = houseSign(houses.first_house_sign, primaryHouse);
    topicBody = RULERS[SIGNS.indexOf(topicHouseSign)];
    topicSelection = "traditional_primary_house_ruler_with_all_occupants_as_co_significators";
  }
  if (!topicBody) topicBody = "sun";
  const anchorBodies = unique([topicBody, ...topicOccupants, chartRuler?.body, "sun", "moon"]);
  const units = anchorBodies.map((body) => planetUnit(
    planetByBody.get(body),
    placementByBody.get(body),
    conditionByBody.get(body),
  ));
  const relevantAspects = aspects
    .filter((aspect) => anchorBodies.includes(aspect.body_1) || anchorBodies.includes(aspect.body_2))
    .toSorted((left, right) => left.orb_degrees - right.orb_degrees || left.fact_id.localeCompare(right.fact_id))
    .slice(0, 3)
    .map((aspect) => ({
      fact_id: aspect.fact_id,
      bodies: [aspect.body_1, aspect.body_2],
      aspect: aspect.aspect,
      label: WESTERN_ASPECT_AXES[aspect.aspect].label,
      phase: aspect.phase,
      orb_degrees: aspect.orb_degrees,
      process: WESTERN_ASPECT_AXES[aspect.aspect].process,
      tension: WESTERN_ASPECT_AXES[aspect.aspect].tension,
    }));
  const topicUnit = units.find((unit) => unit.body === topicBody);
  const occupantUnits = topicOccupants.map((body) => units.find((unit) => unit.body === body)).filter(Boolean);
  const friction = relevantAspects.find((aspect) => ["square", "opposition"].includes(aspect.aspect)) || relevantAspects[0];
  const housePhrase = houses
    ? `${WESTERN_HOUSE_AXES[primaryHouse]}（第${primaryHouse}宫，${WESTERN_SIGN_AXES[topicHouseSign].label}）`
    : "不依赖宫位的太阳—月亮本命轴";
  const phaseText = friction
    ? `${friction.label}${friction.phase === "applying" ? "正在入相" : friction.phase === "separating" ? "正在出相" : friction.phase === "exact" ? "接近精确" : "相位方向未定"}`
    : "未见已登记主要相位";
  const basis = unique([
    ...units.flatMap((unit) => [unit.planet_fact_id, unit.placement_fact_id, unit.condition_fact_id]),
    chartRuler?.ascendant_fact_id,
    ...relevantAspects.map((aspect) => aspect.fact_id),
  ]);
  return deepFreeze({
    schema_version: "western-adjudication-v0.5",
    system: "western",
    status: houses ? "completed" : "qualified",
    topic,
    conclusion: `这张盘在${housePhrase}上的主轴，先看传统宫主${topicUnit.label}：让“${topicUnit.function}”以${topicUnit.sign_label}式的“${topicUnit.expression}”运作${occupantUnits.length ? `；同宫的${occupantUnits.map((unit) => unit.label).join("、")}作为共同表征，不能被删成单一行星` : ""}。`,
    plain_language: `宫主最可用的一面是${topicUnit.constructive}；容易走过头的是${topicUnit.excess}。${occupantUnits.length ? `同宫星还分别带入${occupantUnits.map((unit) => `${unit.label}的“${unit.function}”`).join("、")}。` : ""}${friction ? `${phaseText}提示还要处理“${friction.process}”，并留意${friction.tension}。` : "当前没有用元素数量替代具体结构。"}`,
    lenses: {
      topic_axis: {
        primary_house: houses ? primaryHouse : null,
        house_topic: houses ? WESTERN_HOUSE_AXES[primaryHouse] : null,
        house_sign: topicHouseSign,
        selected_body: topicBody,
        selection_rule: topicSelection,
        unit: topicUnit,
        traditional_ruler: topicUnit,
        occupants: occupantUnits,
      },
      chart_ruler: chartRuler ? units.find((unit) => unit.body === chartRuler.body) : { status: "unavailable_without_coordinates" },
      luminaries: units.filter((unit) => ["sun", "moon"].includes(unit.body)),
      aspect_processes: relevantAspects,
      traditional_conditions: units.map((unit) => ({ body: unit.body, condition: unit.traditional_condition, fact_id: unit.condition_fact_id })),
    },
    basis,
    change_conditions: [
      houses
        ? "出生时刻或坐标一旦更正，上升、整宫位置、主题宫主与宫位主轴都必须重算。"
        : "补充可靠坐标后，才能加入上升、整宫与主题宫主；本轮不从时区或地名猜坐标。",
      "若相位容许度口径改变，只重选相位层；不得反写天文位置。",
      "若现实记录长期主要由其他具体机制解释，应把这条传统主轴降级，而不是追加更多星体来补成命中。",
    ],
    reality_checks: [
      `未来一个月记录两次${WESTERN_HOUSE_AXES[primaryHouse]}的具体情境：当时怎样行动、哪里顺、哪里卡。`,
      `同时记录一个与“${topicUnit.constructive}”相反的实例，检查这条主轴是否只是宽泛描述。`,
    ],
    unresolved: houses ? [] : ["上升点", "宫位", "主题宫主"],
    rulepack: WESTERN_INTERPRETATION_META,
    safeguards: { score_used: false, dominant_planet_used: false, event_prediction_used: false },
    audit: { calculation_replay_status: replayStatus },
  });
}
