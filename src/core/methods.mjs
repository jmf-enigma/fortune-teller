import { listProfiles } from "./profiles.mjs";

const date = { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", examples: ["2000-08-16"] };
const targetDate = {
  type: "string",
  pattern: "^\\d{4}-\\d{2}-\\d{2}$",
  examples: ["2026-08-23"],
  description: "optional Gregorian date for calculation-only decadal and yearly facts; requires a known birth time and the traditional chart-sex parameter",
};
const time = { type: "string", pattern: "^\\d{2}:\\d{2}(?::\\d{2})?$", examples: ["04:00"] };
const timezone = { type: "string", description: "IANA timezone", examples: ["Asia/Shanghai"] };
const latitude = { type: "number", minimum: -90, maximum: 90 };
const longitude = { type: "number", minimum: -180, maximum: 180 };
const disambiguation = { enum: ["reject", "earlier", "later"], default: "reject" };

function birthProperties(extra = {}) {
  return {
    date,
    time,
    time_precision: {
      enum: ["minute", "second", "unknown"],
      description: "optional normalized-input provenance; when supplied it must match time and is always recalculated",
    },
    timezone,
    latitude,
    longitude,
    disambiguation,
    utc_offset: { type: "string", pattern: "^[+-](?:0\\d|1\\d|2[0-3]):[0-5]\\d$" },
    place: { type: "string" },
    ...extra,
  };
}

function calculatorUsage(system) {
  return `node scripts/fortune-teller.mjs calculate --system ${system} --input /absolute/path/to/input.json --pretty`;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function quality(
  calculationStatus,
  interpretationStatus,
  calculationNote,
  sourceCoverage = "partial",
  externalReview = "automated_fixture_reviewed",
) {
  return {
    calculation_status: calculationStatus,
    interpretation_status: interpretationStatus,
    source_coverage: sourceCoverage,
    external_review: externalReview,
    calculation_note: calculationNote,
    predictive_validity: "not_established",
  };
}

export const METHODS = deepFreeze([
  {
    id: "bazi",
    label_zh: "四柱八字",
    label_en: "BaZi / Four Pillars",
    status: "stable-utc+08-civil-calendar-reference",
    quality: quality(
      "profile_specific",
      "sourced_traditional_rule",
      "release-tested pinned wrapper with UTC+08:00 offset fail-closed",
    ),
    engine: "lunar-typescript@1.8.6 + late-Zi consistency wrapper",
    usage: calculatorUsage("bazi"),
    required_fields: ["date", "timezone"],
    validated_date_range: { min: "1900-01-01", max: "2100-12-31" },
    time_behavior: "time optional; unknown time scans every real minute of the civil day, groups consecutive pillar regimes, and omits a single inferred hour pillar",
    limitations: [
      "calendar-boundary calculations currently require every admitted civil instant to use UTC+08:00; other offsets fail closed rather than mixing local wall time with the dependency's calendar reference",
      "mean-solar and apparent-solar BaZi profiles are disabled until year/month solar-term boundaries can be separated from local day/hour calculation",
      "luck-cycle direction uses the explicitly supplied male/female parameter required by the traditional algorithm; it is never inferred from identity",
      "the exact luck-cycle onset uses the pinned minute conversion convention; other schools can use a different onset convention and must be compared separately",
    ],
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["date", "timezone"],
      dependentRequired: {
        chart_sex: ["time"],
        target_date: ["time", "chart_sex"],
      },
      properties: birthProperties({
        chart_sex: { enum: ["male", "female"], description: "optional binary parameter used only for the traditional luck-cycle direction; not an inferred identity" },
        target_date: targetDate,
      }),
    },
    profiles: listProfiles("bazi"),
  },
  {
    id: "ziwei",
    label_zh: "紫微斗数",
    label_en: "Zi Wei Dou Shu",
    status: "qualified-birthplace-civil-calendar-day",
    quality: quality(
      "profile_specific",
      "sourced_traditional_rule",
      "release-tested pinned wrapper with qualified birthplace-civil overseas calendar-day convention",
    ),
    engine: "iztro@2.6.0",
    usage: calculatorUsage("ziwei"),
    required_fields: ["date", "timezone", "chart_sex"],
    validated_date_range: { min: "1900-01-01", max: "2100-12-31" },
    time_behavior: "time optional; unknown time scans every real minute of the civil day, groups consecutive calculation regimes, and never returns one inferred chart; optional target_date period facts require a known birth time",
    limitations: [
      "the declared calendar_day_basis is birthplace-civil; outside UTC+08:00 this is a profile-specific overseas convention rather than a universal Zi Wei rule",
      "mean-solar and apparent-solar Zi Wei overrides are disabled until calendar-day selection and local time-index calculation can be represented as separate clocks",
      "target_date returns the decadal/yearly structure resolved for the explicitly requested date as calculation facts only; it does not infer auspiciousness or events",
    ],
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["date", "timezone", "chart_sex"],
      properties: birthProperties({
        chart_sex: { enum: ["male", "female"], description: "binary parameter required by the traditional chart algorithm; not an inferred identity" },
        target_date: targetDate,
      }),
    },
    profiles: listProfiles("ziwei"),
  },
  {
    id: "western",
    label_zh: "西洋占星本命盘",
    label_en: "Western natal astrology",
    status: "stable-whole-sign",
    quality: quality(
      "profile_specific",
      "sourced_traditional_rule",
      "release-tested pinned astronomy wrapper with whole-sign profile and multi-window motion audit",
    ),
    engine: "astronomy-engine@2.1.19",
    usage: calculatorUsage("western"),
    required_fields: ["date", "timezone"],
    validated_date_range: { min: "1900-01-01", max: "2100-12-31" },
    time_behavior: "unknown time scans every real minute of the local civil day for planetary ranges and omits Ascendant, Midheaven, and houses",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["date", "timezone"],
      dependentRequired: { latitude: ["longitude"], longitude: ["latitude"] },
      properties: birthProperties(),
    },
    profiles: listProfiles("western"),
    limitations: ["no Placidus", "no lunar nodes", "no Chiron or asteroids", "angles require exact time and coordinates"],
  },
  {
    id: "tarot",
    label_zh: "塔罗",
    label_en: "Tarot",
    status: "stable",
    quality: quality(
      "wrapper_conformant",
      "sourced_traditional_rule",
      "release-tested local draw with replayable or user-supplied provenance",
    ),
    engine: "local SHA-256 replayable random stream",
    usage: calculatorUsage("tarot"),
    required_fields: ["question"],
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["question"],
      properties: {
        question: { type: "string", minLength: 1, maxLength: 1000 },
        spread: { enum: ["one", "three", "situation-action-outcome", "decision", "celtic-cross"], default: "three" },
        seed: { type: "string", minLength: 1, maxLength: 1024, description: "optional non-secret replay seed" },
        cards: {
          type: "array",
          description: "optional user-supplied physical/manual cards",
          items: {
            oneOf: [
              { type: "string", minLength: 1 },
              {
                type: "object", additionalProperties: false, required: ["card"],
                properties: { card: { type: "string", minLength: 1 }, orientation: { enum: ["upright", "reversed"] } },
              },
              {
                type: "object", additionalProperties: false, required: ["id"],
                properties: { id: { type: "string", minLength: 1 }, orientation: { enum: ["upright", "reversed"] } },
              },
              {
                type: "object", additionalProperties: false, required: ["title"],
                properties: { title: { type: "string", minLength: 1 }, orientation: { enum: ["upright", "reversed"] } },
              },
            ],
          },
        },
        reveal_seed: { type: "boolean", default: false, description: "return a generated replay seed; off by default" },
      },
    },
    profiles: listProfiles("tarot"),
  },
  {
    id: "iching",
    label_zh: "周易三钱起卦",
    label_en: "I Ching three-coin casting",
    status: "stable",
    quality: quality(
      "wrapper_conformant",
      "sourced_traditional_rule",
      "release-tested local cast with replayable or user-supplied provenance",
    ),
    engine: "local SHA-256 replayable three-coin casting",
    usage: calculatorUsage("iching"),
    required_fields: ["question"],
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["question"],
      properties: {
        question: { type: "string", minLength: 1, maxLength: 1000 },
        seed: { type: "string", minLength: 1, maxLength: 1024, description: "optional non-secret replay seed" },
        lines: { type: "array", minItems: 6, maxItems: 6, items: { enum: [6, 7, 8, 9] }, description: "optional physical/manual lines in bottom-up order" },
        reveal_seed: { type: "boolean", default: false, description: "return a generated replay seed; off by default" },
      },
    },
    profiles: listProfiles("iching"),
  },
  {
    id: "meihua",
    label_zh: "梅花易数",
    label_en: "Meihua Yishu",
    status: "preview",
    quality: quality(
      "profile_specific",
      "fact_only",
      "preview-only deterministic two-number profile",
    ),
    engine: "local deterministic two-number casting",
    usage: calculatorUsage("meihua"),
    required_fields: ["first_number", "second_number"],
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["first_number", "second_number"],
      properties: {
        question: { type: "string" },
        first_number: { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
        second_number: { type: "integer", minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
        moving_line: { type: "integer", minimum: 1, maximum: 6 },
      },
    },
    profiles: listProfiles("meihua"),
    limitations: ["no time casting", "no body/use analysis", "no timing claims"],
  },
  {
    id: "liuyao",
    label_zh: "六爻纳甲",
    label_en: "Liu Yao Najia",
    status: "planned",
    quality: quality("unavailable", "unresolved", "not implemented", "none", "not_reviewed"),
    engine: null,
    usage: null,
    required_fields: [],
    inputSchema: null,
    profiles: [],
  },
  {
    id: "qimen",
    label_zh: "奇门遁甲",
    label_en: "Qi Men Dun Jia",
    status: "planned",
    quality: quality("unavailable", "unresolved", "not implemented", "none", "not_reviewed"),
    engine: null,
    usage: null,
    required_fields: [],
    inputSchema: null,
    profiles: [],
  },
  {
    id: "vedic",
    label_zh: "吠陀占星",
    label_en: "Vedic / Jyotish",
    status: "planned",
    quality: quality("unavailable", "unresolved", "not implemented", "none", "not_reviewed"),
    engine: null,
    usage: null,
    required_fields: [],
    inputSchema: null,
    profiles: [],
  },
]);

export function getMethod(id) {
  return METHODS.find((method) => method.id === id) || null;
}
