import { FortuneTellerError } from "./errors.mjs";
import { adjudicateBazi } from "./bazi-adjudicator.mjs";
import { adjudicateZiweiReading } from "./ziwei-reading-adjudicator.mjs";
import { adjudicateWestern } from "./western-adjudicator.mjs";
import { adjudicateTarot } from "./tarot-adjudicator.mjs";
import { adjudicateIChing } from "./iching-adjudicator.mjs";
import { adjudicateMeihua } from "./meihua-adjudicator.mjs";

const ADJUDICATORS = Object.freeze({
  bazi: adjudicateBazi,
  ziwei: adjudicateZiweiReading,
  western: adjudicateWestern,
  tarot: adjudicateTarot,
  iching: adjudicateIChing,
  meihua: adjudicateMeihua,
});

/** Dispatch one frozen calculation to its system-specific result-first layer. */
export function adjudicate(calculation, options = {}) {
  const system = calculation?.system;
  const handler = typeof system === "string" ? ADJUDICATORS[system] : null;
  if (!handler) {
    throw new FortuneTellerError(
      "ADJUDICATION_SYSTEM_UNSUPPORTED",
      "no result-first adjudicator is registered for this calculation system",
    );
  }
  return handler(calculation, options);
}

