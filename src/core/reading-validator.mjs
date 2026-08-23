import { stableJson } from "./hash.mjs";
import { CALCULATION_SYSTEMS, isPlainJsonValue, verifyCalculationEnvelope } from "./result.mjs";

const SUPPORTED_SYSTEMS = new Set(CALCULATION_SYSTEMS);
const CLAIM_STATUSES = new Set(["calculation_fact", "traditional_rule", "interpretation", "unresolved"]);
const CALCULATION_CERTAINTY = new Set(["high", "qualified", "unavailable"]);
const SENSITIVITY_LABELS = new Set(["stable", "partly_stable", "boundary_sensitive", "unavailable"]);
const SCHOOL_STABILITY = new Set(["stable", "profile_specific", "disputed", "not_assessed"]);
const SOURCE_STATUS = new Set(["verified", "engine_documented", "unavailable", "disputed"]);
const RULE_IDS = new Map([
  ["bazi", new Set(["R-BZ-001", "R-BZ-002", "R-BZ-003", "R-BZ-004"])],
  ["ziwei", new Set(["R-ZW-001", "R-ZW-002", "R-ZW-003", "R-ZW-004"])],
  ["western", new Set(["R-WA-001", "R-WA-002", "R-WA-003", "R-WA-004"])],
  ["tarot", new Set(["R-TR-001", "R-TR-002", "R-TR-003", "R-TR-004"])],
  ["iching", new Set(["R-YJ-001", "R-YJ-002", "R-YJ-003", "R-YJ-004"])],
  ["meihua", new Set(["R-MH-001", "R-MH-002", "R-MH-003", "R-MH-004"])],
]);

function collectFactIds(value, target = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) collectFactIds(item, target);
  } else if (value && typeof value === "object") {
    if (typeof value.fact_id === "string") target.add(value.fact_id);
    for (const child of Object.values(value)) collectFactIds(child, target);
  }
  return target;
}

function hasJsonPointer(root, id) {
  if (!id.startsWith("jsonptr:/facts/")) return false;
  const tokens = id.slice("jsonptr:/".length).split("/").map((token) => token.replaceAll("~1", "/").replaceAll("~0", "~"));
  let cursor = root;
  for (const token of tokens) {
    if (cursor == null || (typeof cursor !== "object") || !Object.hasOwn(cursor, token)) return false;
    cursor = cursor[token];
  }
  return true;
}

function includesForbiddenProbability(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(includesForbiddenProbability);
  return Object.entries(value).some(([key, child]) =>
    ["prediction_probability", "accuracy_probability", "confidence_percentage"].includes(key)
      || includesForbiddenProbability(child));
}

function containsForbiddenVoteKey(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsForbiddenVoteKey);
  return Object.entries(value).some(([key, child]) =>
    ["winner", "vote"].includes(key) || containsForbiddenVoteKey(child));
}

function profileMatches(claimProfile, calculationProfile) {
  if (typeof claimProfile === "string") return claimProfile === calculationProfile?.id;
  return claimProfile && calculationProfile && stableJson(claimProfile) === stableJson(calculationProfile);
}

function sensitivityTotal(calculation) {
  const sensitivity = calculation?.sensitivity;
  if (!sensitivity || typeof sensitivity !== "object") return null;
  for (const value of [
    sensitivity.candidate_count,
    sensitivity.sample_count,
    sensitivity.candidates?.length,
    sensitivity.variants?.length,
  ]) {
    if (Number.isInteger(value) && value > 0) return value;
  }
  return null;
}

export function validateReading(payload) {
  const errors = [];
  const warnings = [];
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { valid: false, errors: ["payload must be an object"], warnings };
  }
  if (!isPlainJsonValue(payload)) {
    return { valid: false, errors: ["payload must contain only finite, acyclic plain JSON values"], warnings };
  }
  const unknownPayloadKeys = Object.keys(payload).filter((key) => !["calculation", "calculations", "reading"].includes(key));
  if (unknownPayloadKeys.length) errors.push(`payload contains ${unknownPayloadKeys.length} unknown field(s)`);
  const { calculation, calculations: rawCalculations, reading } = payload;
  const hasCalculation = Object.hasOwn(payload, "calculation");
  const hasCalculations = Object.hasOwn(payload, "calculations");
  if (hasCalculation && hasCalculations) errors.push("use calculation or calculations, not both");
  const suppliedCalculations = hasCalculations ? rawCalculations : hasCalculation ? [calculation] : [];
  const calculations = Array.isArray(suppliedCalculations) ? suppliedCalculations : [];
  if (!Array.isArray(suppliedCalculations) || calculations.length === 0) errors.push("calculation or calculations is required");
  const calculationBindings = new Set();
  calculations.forEach((item, index) => {
    for (const error of verifyCalculationEnvelope(item)) errors.push(`calculations[${index}] ${error}`);
    if (
      typeof item?.system === "string"
      && SUPPORTED_SYSTEMS.has(item.system)
      && item?.profile
      && typeof item.profile === "object"
      && !Array.isArray(item.profile)
    ) {
      const binding = `${item.system}\u0000${stableJson(item.profile)}`;
      if (calculationBindings.has(binding)) {
        errors.push(`calculations[${index}] duplicates a system/profile binding; validate same-profile people separately`);
      }
      calculationBindings.add(binding);
    }
  });
  if (!reading || typeof reading !== "object" || Array.isArray(reading)) errors.push("reading is required");
  const claims = reading?.claims;
  const readingKeys = new Set(["system", "level", "disclaimer", "summary", "claims", "uncertainty_summary", "cross_system", "next_steps"]);
  if (reading && typeof reading === "object") {
    const unknownReadingKeys = Object.keys(reading).filter((key) => !readingKeys.has(key));
    if (unknownReadingKeys.length) errors.push(`reading contains ${unknownReadingKeys.length} unknown field(s)`);
    if (typeof reading.system !== "string" && !Array.isArray(reading.system)) errors.push("reading.system is required");
    if (typeof reading.system === "string" && !SUPPORTED_SYSTEMS.has(reading.system)) {
      errors.push(`reading.system must be one of: ${CALCULATION_SYSTEMS.join(", ")}`);
    }
    if (Array.isArray(reading.system) && reading.system.some((item) => !SUPPORTED_SYSTEMS.has(item))) {
      errors.push("reading.system entries must be supported system IDs");
    }
    const declaredSystems = typeof reading.system === "string" ? [reading.system] : reading.system;
    if (Array.isArray(declaredSystems)) {
      const expected = [...new Set(calculations
        .map((item) => item?.system)
        .filter((item) => typeof item === "string" && SUPPORTED_SYSTEMS.has(item)))].sort();
      const declaredStrings = declaredSystems.filter((item) => typeof item === "string");
      const declared = [...new Set(declaredStrings)].sort();
      if (declared.length !== declaredStrings.length) errors.push("reading.system contains duplicates");
      if (stableJson(declared) !== stableJson(expected)) {
        errors.push(`reading.system must match calculation systems: ${expected.join(", ")}`);
      }
    }
    if (!new Set(["quick", "standard", "deep", "audit"]).has(reading.level)) errors.push("reading.level is invalid");
    if (typeof reading.disclaimer !== "string" || !reading.disclaimer.trim()) errors.push("reading.disclaimer is required");
    if (typeof reading.summary !== "string") errors.push("reading.summary is required");
    if (Object.hasOwn(reading, "uncertainty_summary") && typeof reading.uncertainty_summary !== "string") {
      errors.push("reading.uncertainty_summary must be a string");
    }
    if (
      Object.hasOwn(reading, "cross_system")
      && (!reading.cross_system || typeof reading.cross_system !== "object" || Array.isArray(reading.cross_system))
    ) {
      errors.push("reading.cross_system must be an object");
    }
    if (!Array.isArray(reading.next_steps)) errors.push("reading.next_steps must be an array");
    else if (reading.next_steps.some((item) => typeof item !== "string")) errors.push("reading.next_steps entries must be strings");
  }
  if (!Array.isArray(claims) || claims.length === 0) errors.push("reading.claims must be a non-empty array");
  const availableFacts = new Set();
  for (const item of calculations) collectFactIds(item?.facts, availableFacts);
  const claimIds = new Set();

  if (Array.isArray(claims)) {
    for (const [index, claim] of claims.entries()) {
      const at = `reading.claims[${index}]`;
      if (!claim || typeof claim !== "object") {
        errors.push(`${at} must be an object`);
        continue;
      }
      const claimKeys = new Set([
        "claim_id", "statement", "epistemic_status", "system", "profile", "scope", "fact_ids", "rule_ids",
        "reasoning_summary", "dependencies", "calculation_certainty", "input_sensitivity", "school_stability",
        "source_status", "source_ids", "alternative_readings", "practical_reflection",
      ]);
      const unknownClaimKeys = Object.keys(claim).filter((key) => !claimKeys.has(key));
      if (unknownClaimKeys.length) errors.push(`${at} contains ${unknownClaimKeys.length} unknown field(s)`);
      if (typeof claim.claim_id !== "string" || !claim.claim_id) errors.push(`${at}.claim_id is required`);
      else if (!/^C-[A-Za-z0-9_-]+$/.test(claim.claim_id)) errors.push(`${at}.claim_id has an invalid format`);
      else if (claimIds.has(claim.claim_id)) errors.push(`${at}.claim_id is duplicated`);
      else claimIds.add(claim.claim_id);
      if (typeof claim.statement !== "string" || !claim.statement.trim()) errors.push(`${at}.statement is required`);
      if (!CLAIM_STATUSES.has(claim.epistemic_status)) errors.push(`${at}.epistemic_status is invalid`);
      if (typeof claim.system !== "string" || !claim.system) errors.push(`${at}.system is required`);
      else if (!SUPPORTED_SYSTEMS.has(claim.system)) errors.push(`${at}.system is unsupported`);
      if (claim.profile == null || (typeof claim.profile !== "string" && (typeof claim.profile !== "object" || Array.isArray(claim.profile)))) {
        errors.push(`${at}.profile must be a string or object`);
      }
      const systemCalculations = calculations.filter((item) => item?.system === claim.system);
      if (typeof claim.system === "string" && systemCalculations.length === 0) {
        errors.push(`${at}.system does not match any supplied calculation`);
      }
      const matchingCalculation = systemCalculations.find((item) => profileMatches(claim.profile, item.profile));
      if (systemCalculations.length > 0 && claim.profile != null && !matchingCalculation) {
        errors.push(`${at}.profile does not match a supplied calculation for the declared system`);
      }
      const factIds = Array.isArray(claim.fact_ids) ? claim.fact_ids : [];
      const ruleIds = Array.isArray(claim.rule_ids) ? claim.rule_ids : [];
      const sourceIds = Array.isArray(claim.source_ids) ? claim.source_ids : [];
      if (!Array.isArray(claim.fact_ids)) errors.push(`${at}.fact_ids must be an array`);
      if (!Array.isArray(claim.rule_ids)) errors.push(`${at}.rule_ids must be an array`);
      if (!CALCULATION_CERTAINTY.has(claim.calculation_certainty)) errors.push(`${at}.calculation_certainty is invalid`);
      if (!claim.input_sensitivity || !SENSITIVITY_LABELS.has(claim.input_sensitivity.label)) {
        errors.push(`${at}.input_sensitivity.label is invalid`);
      }
      if (claim.input_sensitivity && typeof claim.input_sensitivity === "object") {
        const extraSensitivity = Object.keys(claim.input_sensitivity).filter((key) => !["label", "coverage"].includes(key));
        if (extraSensitivity.length) errors.push(`${at}.input_sensitivity contains ${extraSensitivity.length} unknown field(s)`);
      }
      if (claim.input_sensitivity && !Object.hasOwn(claim.input_sensitivity, "coverage")) {
        errors.push(`${at}.input_sensitivity.coverage is required`);
      }
      if (!SCHOOL_STABILITY.has(claim.school_stability)) errors.push(`${at}.school_stability is invalid`);
      if (!SOURCE_STATUS.has(claim.source_status)) errors.push(`${at}.source_status is invalid`);
      if (!Array.isArray(claim.source_ids)) errors.push(`${at}.source_ids must be an array`);
      for (const [field, values] of [["fact_ids", factIds], ["rule_ids", ruleIds], ["source_ids", sourceIds]]) {
        if (new Set(values).size !== values.length) errors.push(`${at}.${field} contains duplicates`);
        if (values.some((value) => typeof value !== "string")) errors.push(`${at}.${field} entries must be strings`);
      }
      for (const field of ["dependencies", "alternative_readings"]) {
        if (claim[field] != null && (!Array.isArray(claim[field]) || claim[field].some((item) => typeof item !== "string"))) {
          errors.push(`${at}.${field} must be an array of strings`);
        }
      }
      for (const field of ["scope", "reasoning_summary"]) {
        if (claim[field] != null && typeof claim[field] !== "string") errors.push(`${at}.${field} must be a string`);
      }
      if (claim.practical_reflection != null && typeof claim.practical_reflection !== "string") {
        errors.push(`${at}.practical_reflection must be a string or null`);
      }
      if (claim.epistemic_status === "calculation_fact" && factIds.length === 0) errors.push(`${at} calculation_fact requires fact_ids`);
      if (claim.epistemic_status === "interpretation" && factIds.length === 0) errors.push(`${at} interpretation requires fact_ids`);
      if (claim.epistemic_status === "interpretation" && ruleIds.length === 0 && claim.source_status !== "unavailable") {
        errors.push(`${at} interpretation without rule_ids must use source_status=unavailable`);
      }
      for (const id of factIds) {
        if (
          typeof id === "string"
          && matchingCalculation
          && !collectFactIds(matchingCalculation.facts).has(id)
          && !hasJsonPointer(matchingCalculation, id)
        ) {
          errors.push(`${at} cites an unknown fact_id`);
        }
      }
      for (const id of ruleIds) {
        if (typeof id === "string" && !RULE_IDS.get(claim.system)?.has(id)) {
          errors.push(`${at} cites an unknown rule_id`);
        }
      }
      if (claim.source_status === "verified") {
        errors.push(`${at}.source_status=verified is unavailable because this release has no verified source registry`);
      }
      if (sourceIds.length > 0) {
        errors.push(`${at}.source_ids must be empty because this release has no source registry`);
      }
      if (claim.epistemic_status === "traditional_rule" && ruleIds.length === 0) {
        errors.push(`${at} traditional_rule requires rule_ids`);
      }
      if (claim.calculation_certainty === "high" && matchingCalculation?.warnings?.length) {
        warnings.push(`${at} claims high calculation certainty although the calculation has warnings`);
      }
      const coverage = claim.input_sensitivity?.coverage;
      const sensitivityLabel = claim.input_sensitivity?.label;
      const expectedTotal = sensitivityTotal(matchingCalculation);
      if (coverage !== null && coverage !== undefined && typeof coverage !== "string") {
        errors.push(`${at}.input_sensitivity.coverage must use n/N or null`);
      } else if (typeof coverage === "string" && !/^\d+\/\d+$/.test(coverage)) {
        errors.push(`${at}.input_sensitivity.coverage must use n/N or null`);
      } else if (typeof coverage === "string") {
        const [numerator, denominator] = coverage.split("/").map(Number);
        if (denominator <= 0 || numerator < 0 || numerator > denominator) {
          errors.push(`${at}.input_sensitivity.coverage must satisfy 0 <= n <= N and N > 0`);
        }
        if (expectedTotal == null) {
          errors.push(`${at}.input_sensitivity.coverage is not allowed without a candidate or sample total`);
        } else if (denominator !== expectedTotal) {
          errors.push(`${at}.input_sensitivity.coverage denominator must equal ${expectedTotal}`);
        }
        if (sensitivityLabel === "stable" && numerator !== denominator) {
          errors.push(`${at} stable coverage must include every candidate`);
        }
      } else if (expectedTotal != null && sensitivityLabel !== "unavailable") {
        errors.push(`${at} input sensitivity requires n/N coverage for ${expectedTotal} candidates or samples`);
      } else if (sensitivityLabel === "partly_stable") {
        errors.push(`${at} partly_stable sensitivity requires n/N coverage`);
      }
    }
  }

  if (includesForbiddenProbability(reading)) errors.push("reading contains a forbidden predictive probability field");
  if (containsForbiddenVoteKey(reading?.cross_system)) {
    errors.push("cross-system voting or a declared winner is not allowed");
  }
  return { valid: errors.length === 0, errors, warnings, fact_ids_available: [...availableFacts].sort() };
}
