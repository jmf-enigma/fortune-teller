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
export { validateReading } from "./core/reading-validator.mjs";

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
