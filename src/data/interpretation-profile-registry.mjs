import { contentHash } from "../core/hash.mjs";
import { ENGINE_VERSION } from "../core/result.mjs";
import { getRegisteredProfile } from "../core/profiles.mjs";
import { getRuleById } from "./rule-registry.mjs";
import { getSourceById } from "./source-registry.mjs";
import {
  ZIWEI_MAJOR_STAR_MEANINGS,
  ZIWEI_MEANING_REGISTRY_META,
  ZIWEI_TOPIC_MARKERS,
  ZIWEI_TRANSFORMATION_LENSES,
} from "./meaning-registry.mjs";
import {
  ZIWEI_CONTEXT_STAR_MODIFIERS,
  ZIWEI_MAJOR_STAR_COMBINATIONS,
  ZIWEI_PERIOD_STAR_MODIFIERS,
  ZIWEI_SANHE_RULEPACK_META,
} from "./ziwei-sanhe-rulepack.mjs";

const MEANING_PACKS = new Map([
  [ZIWEI_MEANING_REGISTRY_META.registry_id, {
    meta: ZIWEI_MEANING_REGISTRY_META,
    topics: ZIWEI_TOPIC_MARKERS,
    major_star_axes: ZIWEI_MAJOR_STAR_MEANINGS,
    transformation_lenses: ZIWEI_TRANSFORMATION_LENSES,
    synthesis_rulepack: {
      meta: ZIWEI_SANHE_RULEPACK_META,
      major_star_combinations: ZIWEI_MAJOR_STAR_COMBINATIONS,
      natal_context_modifiers: ZIWEI_CONTEXT_STAR_MODIFIERS,
      period_star_modifiers: ZIWEI_PERIOD_STAR_MODIFIERS,
    },
  }],
]);

const definitions = [
  {
    id: "bazi-structure-bounded-v1",
    system: "bazi",
    school_id: "four-pillars-structure-only",
    allowed_calculation_profile_ids: [
      "bazi-civil-midnight-consistent-v1",
      "bazi-civil-zi-start-consistent-v1",
    ],
    rule_ids: ["R-BZ-001", "R-BZ-002", "R-BZ-003", "R-BZ-004"],
    interpretation_ceiling: "traditional_structure",
    review_status: "automated_fixture_reviewed",
    predictive_validity: "not_established",
    professional_label_allowed: false,
  },
  {
    id: "ziwei-sanhe-bounded-v1",
    system: "ziwei",
    school_id: "iztro-documented-sanhe-bounded",
    allowed_calculation_profile_ids: ["ziwei-default-v1", "ziwei-zhongzhou-v1"],
    rule_ids: [
      "R-ZW-001", "R-ZW-002", "R-ZW-003", "R-ZW-004", "R-ZW-005", "R-ZW-006",
      "R-ZW-007", "R-ZW-008", "R-ZW-009",
    ],
    interpretation_ceiling: "bounded_topic_reflection",
    meaning_pack_id: "ziwei-bounded-meanings-v1",
    professional_depth_status: "bounded_meaning_layer",
    review_status: "automated_fixture_reviewed",
    predictive_validity: "not_established",
    professional_label_allowed: false,
  },
  {
    id: "western-traditional-bounded-v1",
    system: "western",
    school_id: "tropical-whole-sign-bounded",
    allowed_calculation_profile_ids: ["western-tropical-whole-sign-v1"],
    rule_ids: ["R-WA-001", "R-WA-002", "R-WA-003", "R-WA-004", "R-WA-005"],
    interpretation_ceiling: "bounded_reflection",
    review_status: "automated_fixture_reviewed",
    predictive_validity: "not_established",
    professional_label_allowed: false,
  },
  {
    id: "tarot-rws-reflective-v1",
    system: "tarot",
    school_id: "rws-reflective",
    allowed_calculation_profile_ids: ["tarot-rws-local-v1", "tarot-rws-upright-only-v1"],
    rule_ids: ["R-TR-001", "R-TR-002", "R-TR-003", "R-TR-004"],
    interpretation_ceiling: "bounded_reflection",
    review_status: "automated_fixture_reviewed",
    predictive_validity: "not_established",
    professional_label_allowed: false,
  },
  {
    id: "iching-structural-reflective-v1",
    system: "iching",
    school_id: "three-coin-structural",
    allowed_calculation_profile_ids: ["iching-three-coin-v1"],
    rule_ids: ["R-YJ-001", "R-YJ-002", "R-YJ-003", "R-YJ-004", "R-YJ-005"],
    interpretation_ceiling: "bounded_reflection",
    review_status: "automated_fixture_reviewed",
    predictive_validity: "not_established",
    professional_label_allowed: false,
  },
  {
    id: "meihua-two-number-structure-v1",
    system: "meihua",
    school_id: "two-number-bounded",
    allowed_calculation_profile_ids: ["meihua-two-number-v1"],
    rule_ids: ["R-MH-001", "R-MH-002", "R-MH-003", "R-MH-004", "R-MH-005"],
    interpretation_ceiling: "bounded_reflection",
    review_status: "automated_fixture_reviewed",
    predictive_validity: "not_established",
    professional_label_allowed: false,
  },
];

const profiles = definitions.map((definition) => {
  const rules = definition.rule_ids.map((ruleId) => getRuleById(ruleId));
  const sourceIds = [...new Set(rules.flatMap((rule) => rule?.source_ids || []))].sort();
  const calculationProfiles = definition.allowed_calculation_profile_ids.map((profileId) => {
    const profile = getRegisteredProfile(definition.system, profileId);
    if (!profile) throw new Error(`interpretation profile ${definition.id} cites unknown calculation profile ${profileId}`);
    return profile;
  });
  const sources = sourceIds.map((sourceId) => {
    const source = getSourceById(sourceId);
    if (!source) throw new Error(`interpretation profile ${definition.id} cites unknown source ${sourceId}`);
    return source;
  });
  const meaningPack = definition.meaning_pack_id == null
    ? null
    : MEANING_PACKS.get(definition.meaning_pack_id);
  if (definition.meaning_pack_id != null && !meaningPack) {
    throw new Error(`interpretation profile ${definition.id} cites unknown meaning pack ${definition.meaning_pack_id}`);
  }
  return {
    ...definition,
    rule_pack_hash: contentHash({
      v: 3,
      engine_version: ENGINE_VERSION,
      definition,
      calculation_profiles: calculationProfiles,
      rules,
      sources,
      meaning_pack: meaningPack,
    }),
  };
});

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

export const INTERPRETATION_PROFILES = deepFreeze(profiles);
const BY_ID = new Map(INTERPRETATION_PROFILES.map((profile) => [profile.id, profile]));

export function getInterpretationProfileById(id) {
  return BY_ID.get(id);
}

if (BY_ID.size !== INTERPRETATION_PROFILES.length) {
  throw new Error("interpretation profile registry contains duplicate IDs");
}
for (const profile of INTERPRETATION_PROFILES) {
  for (const ruleId of profile.rule_ids) {
    const rule = getRuleById(ruleId);
    if (!rule) throw new Error(`interpretation profile ${profile.id} cites unknown rule ${ruleId}`);
    if (rule.system !== profile.system) {
      throw new Error(`interpretation profile ${profile.id} mixes a rule from another system`);
    }
  }
}
