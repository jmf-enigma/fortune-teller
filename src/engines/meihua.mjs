import { makeEnvelope } from "../core/result.mjs";
import { FortuneTellerError } from "../core/errors.mjs";
import { resolveProfile } from "../core/profiles.mjs";
import { hexagramFromLines, trigramByNumber, trigramFromLines } from "../data/iching.mjs";

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

const GENERATES = Object.freeze({ "木": "火", "火": "土", "土": "金", "金": "水", "水": "木" });
const CONTROLS = Object.freeze({ "木": "土", "土": "水", "水": "火", "火": "金", "金": "木" });

function elementRelation(bodyElement, useElement) {
  if (bodyElement === useElement) return "same_element";
  if (GENERATES[useElement] === bodyElement) return "use_generates_body";
  if (GENERATES[bodyElement] === useElement) return "body_generates_use";
  if (CONTROLS[useElement] === bodyElement) return "use_controls_body";
  if (CONTROLS[bodyElement] === useElement) return "body_controls_use";
  throw new Error(`unsupported five-element relation: ${bodyElement}/${useElement}`);
}

function trigramView(trigram) {
  return {
    key: trigram.key,
    number: trigram.number,
    name: trigram.name,
    symbol: trigram.symbol,
    image: trigram.image,
    element: trigram.element,
  };
}

export function calculateMeihua(rawInput, profileOverride = {}) {
  const profile = resolveProfile("meihua", profileOverride);
  if (rawInput?.moving_line != null) {
    throw new FortuneTellerError(
      "MEIHUA_MOVING_LINE_OVERRIDE_UNSUPPORTED",
      "the fixed two-number profile derives the moving line from the two numbers and does not accept an override",
    );
  }
  const first = positiveInteger(rawInput?.first_number, "first_number");
  const second = positiveInteger(rawInput?.second_number, "second_number");
  const upper = trigramByNumber(oneBasedModulo(first, 8));
  const lower = trigramByNumber(oneBasedModulo(second, 8));
  const movingLine = oneBasedModulo(oneBasedModulo(first, 6) + oneBasedModulo(second, 6), 6);
  const primaryBits = [...bits(lower.key), ...bits(upper.key)];
  const transformedBits = [...primaryBits];
  transformedBits[movingLine - 1] = !transformedBits[movingLine - 1];
  const primary = hexagramFromLines(primaryBits);
  const transformed = hexagramFromLines(transformedBits);
  const pureQianKunMutual = primary.king_wen_number === 1 || primary.king_wen_number === 2;
  const mutualSourceBits = pureQianKunMutual ? transformedBits : primaryBits;
  const mutualLower = trigramFromLines(mutualSourceBits.slice(1, 4));
  const mutualUpper = trigramFromLines(mutualSourceBits.slice(2, 5));
  const mutual = hexagramFromLines([...bits(mutualLower.key), ...bits(mutualUpper.key)]);
  const movingHalf = movingLine <= 3 ? "lower" : "upper";
  const bodyHalf = movingHalf === "lower" ? "upper" : "lower";
  const primaryBody = bodyHalf === "upper" ? upper : lower;
  const primaryUse = movingHalf === "upper" ? upper : lower;
  const transformedBody = transformed[`${bodyHalf}_trigram`];
  const transformedUse = transformed[`${movingHalf}_trigram`];
  return makeEnvelope({
    system: "meihua",
    profile,
    input: {
      first_number: first,
      second_number: second,
      moving_line_derivation: "one-based remainder of the two-number sum modulo six",
      ...(typeof rawInput?.question === "string" && rawInput.question.trim() ? { question: rawInput.question.trim() } : {}),
    },
    facts: {
      mode: "two-number-casting",
      upper_trigram: { fact_id: "F-MH-T01", kind: "calculation_fact", ...upper },
      lower_trigram: { fact_id: "F-MH-T02", kind: "calculation_fact", ...lower },
      moving_line: { fact_id: "F-MH-L01", kind: "calculation_fact", position_from_bottom: movingLine },
      primary: { fact_id: "F-MH-H01", kind: "calculation_fact", ...primary },
      transformed: { fact_id: "F-MH-H02", kind: "calculation_fact", ...transformed },
      structure: {
        body_use: {
          fact_id: "F-MH-BU01",
          kind: "calculation_fact",
          assignment_rule: "the half containing the moving line is use; the other half is body",
          moving_half: movingHalf,
          body: { half: bodyHalf, trigram: trigramView(primaryBody) },
          use: { half: movingHalf, trigram: trigramView(primaryUse) },
          primary_relation: {
            body_element: primaryBody.element,
            use_element: primaryUse.element,
            relation: elementRelation(primaryBody.element, primaryUse.element),
            seasonal_strength_applied: false,
          },
          transformed: {
            body: { half: bodyHalf, trigram: trigramView(transformedBody) },
            use: { half: movingHalf, trigram: trigramView(transformedUse) },
            relation: {
              body_element: transformedBody.element,
              use_element: transformedUse.element,
              relation: elementRelation(transformedBody.element, transformedUse.element),
              seasonal_strength_applied: false,
            },
          },
        },
        mutual: {
          fact_id: "F-MH-H03",
          kind: "calculation_fact",
          status: pureQianKunMutual ? "derived_from_transformed_for_pure_qian_kun" : "derived_from_primary",
          source_hexagram: pureQianKunMutual ? "transformed" : "primary",
          extraction_rule: pureQianKunMutual
            ? "pure Qian/Kun use the transformed hexagram; lower takes transformed lines 2-4 and upper takes lines 3-5"
            : "lower uses primary lines 2-4; upper uses primary lines 3-5",
          school_variance: pureQianKunMutual
            ? "this profile follows the registered source rule that pure Qian/Kun take the mutual structure from the transformed hexagram"
            : "this is the declared nuclear-hexagram convention for this bounded profile",
          ...mutual,
        },
        seasonal_strength: {
          status: "unavailable",
          reason: "the two-number profile records no occurrence time, so seasonal flourishing/decline is not adjudicated",
        },
        timing: {
          status: "unavailable",
          reason: "no occurrence-time fact or registered timing rule exists in this profile",
          precise_date_claim_allowed: false,
        },
      },
    },
    warnings: [
      "Meihua support is bounded to one explicit two-number convention with mechanical body/use and mutual-hexagram derivation.",
      "This profile records no occurrence time, so seasonal strength and precise predictive timing are unavailable.",
    ],
    meta: { interpretation_included: false },
  });
}
