import { FortuneTellerError } from "./core/errors.mjs";
import { getMethod, METHODS } from "./core/methods.mjs";
import { validateMethodInput } from "./core/input-validation.mjs";
import { calculateBazi } from "./engines/bazi.mjs";
import { calculateZiwei } from "./engines/ziwei.mjs";
import { calculateWestern } from "./engines/western.mjs";
import { calculateTarot } from "./engines/tarot.mjs";
import { calculateIChing } from "./engines/iching.mjs";
import { calculateMeihua } from "./engines/meihua.mjs";

const CALCULATORS = {
  bazi: calculateBazi,
  ziwei: calculateZiwei,
  western: calculateWestern,
  tarot: calculateTarot,
  iching: calculateIChing,
  meihua: calculateMeihua,
};

export { METHODS };
export { bindReadingToCalculations, validateReading } from "./core/reading-validator.mjs";
export {
  BLIND_CHECK_OUTCOMES,
  freezeBlindCheck,
  scoreBlindCheck,
  verifyBlindCheckReading,
  verifyBlindCheckRecord,
} from "./core/blind-check.mjs";
export {
  canonicalCalculationFactStatement,
  canonicalTechnicalSummary,
  validateClaimSemantics,
} from "./core/claim-semantics.mjs";
export { verifyCalculationFacts } from "./core/calculation-verifier.mjs";
export { adjudicateBazi } from "./core/bazi-adjudicator.mjs";
export {
  adjudicateZiweiEmptyPalace,
  adjudicateZiweiPattern,
  adjudicateZiweiPhase,
  adjudicateZiweiProfiles,
} from "./core/ziwei-adjudicator.mjs";
export { RULES } from "./data/rule-registry.mjs";
export { SOURCES, SOURCE_VERIFICATION_NOTE } from "./data/source-registry.mjs";
export { INTERPRETATION_PROFILES } from "./data/interpretation-profile-registry.mjs";
export {
  ZIWEI_MAJOR_STAR_MEANINGS,
  ZIWEI_MEANING_REGISTRY_META,
  ZIWEI_TOPIC_MARKERS,
  ZIWEI_TRANSFORMATION_LENSES,
} from "./data/meaning-registry.mjs";
export {
  BAZI_ADJUDICATION_RULEPACK_META,
  BAZI_ADJUDICATION_RULES,
  BAZI_ADJUDICATION_STATES,
  BAZI_MONTH_COMMAND_PATTERN_RULES,
  BAZI_VIEW_DEFINITIONS,
} from "./data/bazi-adjudication-rulepack.mjs";
export {
  ZIWEI_ADJUDICATION_PROFILES,
  ZIWEI_ADJUDICATION_STATES,
  ZIWEI_ADJUDICATION_TRANSITIONS,
} from "./data/ziwei-adjudication-rulepack.mjs";

export function calculate(system, input, profile = {}) {
  const method = getMethod(system);
  if (!method) throw new FortuneTellerError("UNKNOWN_SYSTEM", "unknown calculation system");
  const calculator = CALCULATORS[system];
  if (!calculator) {
    throw new FortuneTellerError(
      "SYSTEM_NOT_IMPLEMENTED",
      `${method.label_en} is ${method.status}; no calculation result will be improvised`,
      { method },
    );
  }
  validateMethodInput(input, method.inputSchema);
  return calculator(input, profile);
}
