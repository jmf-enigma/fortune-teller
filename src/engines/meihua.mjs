import { makeEnvelope } from "../core/result.mjs";
import { FortuneTellerError } from "../core/errors.mjs";
import { resolveProfile } from "../core/profiles.mjs";
import { hexagramFromLines, trigramByNumber } from "../data/iching.mjs";

function positiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new FortuneTellerError("INVALID_NUMBER", `${label} must be a positive safe integer`);
  }
  return number;
}

function oneBasedModulo(value, modulus) {
  return ((value - 1) % modulus) + 1;
}

function bits(key) {
  return key.split("").map((value) => value === "1");
}

export function calculateMeihua(rawInput, profileOverride = {}) {
  const profile = resolveProfile("meihua", profileOverride);
  const first = positiveInteger(rawInput?.first_number, "first_number");
  const second = positiveInteger(rawInput?.second_number, "second_number");
  const upper = trigramByNumber(oneBasedModulo(first, 8));
  const lower = trigramByNumber(oneBasedModulo(second, 8));
  const movingLine = rawInput?.moving_line == null
    ? oneBasedModulo(oneBasedModulo(first, 6) + oneBasedModulo(second, 6), 6)
    : positiveInteger(rawInput.moving_line, "moving_line");
  if (movingLine > 6) throw new FortuneTellerError("INVALID_MOVING_LINE", "moving_line must be from 1 through 6");
  const primaryBits = [...bits(lower.key), ...bits(upper.key)];
  const transformedBits = [...primaryBits];
  transformedBits[movingLine - 1] = !transformedBits[movingLine - 1];
  const primary = hexagramFromLines(primaryBits);
  const transformed = hexagramFromLines(transformedBits);
  return makeEnvelope({
    system: "meihua",
    profile,
    input: {
      first_number: first,
      second_number: second,
      moving_line_supplied: rawInput?.moving_line != null,
      ...(typeof rawInput?.question === "string" && rawInput.question.trim() ? { question: rawInput.question.trim() } : {}),
    },
    facts: {
      mode: "two-number-casting",
      upper_trigram: { fact_id: "F-MH-T01", kind: "calculation_fact", ...upper },
      lower_trigram: { fact_id: "F-MH-T02", kind: "calculation_fact", ...lower },
      moving_line: { fact_id: "F-MH-L01", kind: "calculation_fact", position_from_bottom: movingLine },
      primary: { fact_id: "F-MH-H01", kind: "calculation_fact", ...primary },
      transformed: { fact_id: "F-MH-H02", kind: "calculation_fact", ...transformed },
    },
    warnings: [
      "Meihua support is preview-only and implements one explicit two-number convention.",
      "No time-based casting, body/use analysis, or predictive timing is implemented in v0.1.0.",
    ],
    meta: { interpretation_included: false },
  });
}
