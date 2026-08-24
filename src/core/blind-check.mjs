import { FortuneTellerError } from "./errors.mjs";
import { contentHash, stableJson } from "./hash.mjs";
import { ENGINE_VERSION, isPlainJsonValue } from "./result.mjs";
import { validateReading } from "./reading-validator.mjs";

const RECORD_KEYS = new Set([
  "schema_version", "record_type", "frozen_at", "reading_binding", "validation_receipt", "hypotheses", "commitment",
]);
const READING_BINDING_KEYS = new Set([
  "scope", "reading_payload_hash", "reading_hash", "systems", "level", "calculation_bindings", "claim_bindings",
]);
const CLAIM_BINDING_KEYS = new Set([
  "hypothesis_id", "claim_id", "calculation_facts_hash", "interpretation_profile_id", "rule_pack_hash",
]);
const CALCULATION_BINDING_KEYS = new Set([
  "system", "profile", "facts_hash", "reproducibility_hash",
]);
const HYPOTHESIS_KEYS = new Set([
  "hypothesis_id", "statement", "domain", "window", "criteria",
]);
const WINDOW_KEYS = new Set(["start", "end"]);
const CRITERION_KEYS = new Set(["criterion_id", "polarity", "observable", "evidence_source"]);
const COMMITMENT_KEYS = new Set(["algorithm", "scope", "hash"]);
const VALIDATION_RECEIPT_KEYS = new Set([
  "scope", "validator_contract", "status", "validated_at", "release_version", "engine_versions",
  "reading_payload_hash", "receipt_hash",
]);
const ADJUDICATION_KEYS = new Set(["hypothesis_id", "criteria"]);
const CRITERION_ADJUDICATION_KEYS = new Set([
  "criterion_id", "result", "observed_on", "source_type", "observation",
]);

const RECORD_TYPE = "blind_check_commitment";
const SCORE_TYPE = "blind_check_score";
const SCHEMA_VERSION = "3.0.0";
const COMMITMENT_SCOPE = "fortune-teller/blind-check/v3";
const READING_SCOPE = "fortune-teller/validated-reading/v1";
const READING_PAYLOAD_SCOPE = "fortune-teller/complete-reading-payload/v1";
const VALIDATION_RECEIPT_SCOPE = "fortune-teller/blind-check-validation-receipt/v1";
const VALIDATOR_CONTRACT = "fortune-teller/reading-validator/v3";
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const VALIDATOR_CONTRACT_PATTERN = /^fortune-teller\/reading-validator\/v\d+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const HYPOTHESIS_ID_PATTERN = /^H-(0[1-5])$/;
const CLAIM_ID_PATTERN = /^C-[A-Za-z0-9_-]+$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;
const BARNUM_PATTERN = /(?:既.{0,20}也|有时.{0,20}有时|可能.{0,20}(?:也可能|又可能)|视情况|因人而异|都说不准)|\b(?:sometimes.{0,30}sometimes|it depends|could be either|may or may not|everyone is different)\b/iu;
const SYSTEMS = new Set(["bazi", "ziwei", "western", "tarot", "iching", "meihua"]);
const LEVELS = new Set(["quick", "standard", "deep", "audit"]);
const EVIDENCE_SOURCES = new Set([
  "self_report", "contemporaneous_record", "administrative_record", "third_party_record",
]);
const CRITERION_POLARITIES = new Set(["supports", "contradicts", "unclear"]);
const CRITERION_RESULTS = new Set(["met", "not_met", "unclear"]);

export const BLIND_CHECK_OUTCOMES = Object.freeze(["supported", "contradicted", "unclear"]);

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function exactKeys(value, expected) {
  const keys = Object.keys(value);
  return keys.length === expected.size && keys.every((key) => expected.has(key));
}

function isBoundedText(value, maximum, minimum = 1) {
  return typeof value === "string"
    && [...value].length >= minimum
    && [...value].length <= maximum
    && value === value.trim()
    && !CONTROL_CHARACTER_PATTERN.test(value);
}

function isCanonicalDate(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

function isCanonicalUtcTimestamp(value) {
  if (typeof value !== "string" || !UTC_TIMESTAMP_PATTERN.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value;
}

function utcDate(timestamp = new Date().toISOString()) {
  return timestamp.slice(0, 10);
}

function pushExactKeyError(errors, path, value, expected) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${path} must be an object`);
    return false;
  }
  if (!exactKeys(value, expected)) {
    errors.push(`${path} must contain exactly the documented fields`);
    return false;
  }
  return true;
}

function validateWindow(value, path, errors) {
  if (!pushExactKeyError(errors, path, value, WINDOW_KEYS)) return;
  if (!isCanonicalDate(value.start)) errors.push(`${path}.start must be a real YYYY-MM-DD date`);
  if (!isCanonicalDate(value.end)) errors.push(`${path}.end must be a real YYYY-MM-DD date`);
  if (isCanonicalDate(value.start) && isCanonicalDate(value.end) && value.start > value.end) {
    errors.push(`${path}.start must not be later than ${path}.end`);
  }
}

function validateCriteria(value, path, errors) {
  if (!Array.isArray(value) || value.length < 2 || value.length > 15) {
    errors.push(`${path} must contain 2 to 15 frozen criteria`);
    return;
  }
  const ids = new Set();
  const observables = new Set();
  const polarities = new Set();
  value.forEach((criterion, index) => {
    const criterionPath = `${path}[${index}]`;
    if (!pushExactKeyError(errors, criterionPath, criterion, CRITERION_KEYS)) return;
    if (typeof criterion.criterion_id !== "string" || !/^K-[A-Za-z0-9_-]+$/.test(criterion.criterion_id)) {
      errors.push(`${criterionPath}.criterion_id is invalid`);
    } else if (ids.has(criterion.criterion_id)) {
      errors.push(`${criterionPath}.criterion_id is duplicated`);
    } else ids.add(criterion.criterion_id);
    if (!CRITERION_POLARITIES.has(criterion.polarity)) {
      errors.push(`${criterionPath}.polarity is invalid`);
    } else polarities.add(criterion.polarity);
    if (!isBoundedText(criterion.observable, 300, 12)) {
      errors.push(`${criterionPath}.observable must be a concrete string of 12 to 300 characters`);
    } else if (BARNUM_PATTERN.test(criterion.observable)) {
      errors.push(`${criterionPath}.observable must not use a Barnum-style both-sides criterion`);
    } else if (observables.has(criterion.observable)) {
      errors.push(`${criterionPath}.observable is duplicated`);
    } else observables.add(criterion.observable);
    if (!EVIDENCE_SOURCES.has(criterion.evidence_source)) {
      errors.push(`${criterionPath}.evidence_source is invalid`);
    }
  });
  for (const required of CRITERION_POLARITIES) {
    if (!polarities.has(required)) errors.push(`${path} requires a ${required} criterion`);
  }
}

function validateHypothesis(value, index, errors, frozenDate = null) {
  const path = `hypotheses[${index}]`;
  if (!pushExactKeyError(errors, path, value, HYPOTHESIS_KEYS)) return;
  if (!HYPOTHESIS_ID_PATTERN.test(value.hypothesis_id) || value.hypothesis_id !== `H-0${index + 1}`) {
    errors.push(`${path}.hypothesis_id must match its frozen order`);
  }
  if (!isBoundedText(value.statement, 500, 12)) {
    errors.push(`${path}.statement must be a concrete string of 12 to 500 characters`);
  } else if (BARNUM_PATTERN.test(value.statement)) {
    errors.push(`${path}.statement must not use a Barnum-style both-sides formulation`);
  }
  if (!isBoundedText(value.domain, 64)) {
    errors.push(`${path}.domain must be a single non-blank string of at most 64 characters`);
  }
  validateWindow(value.window, `${path}.window`, errors);
  if (frozenDate && isCanonicalDate(value.window?.start) && value.window.start < frozenDate) {
    errors.push(`${path}.window.start must not predate the frozen reading commitment`);
  }
  validateCriteria(value.criteria, `${path}.criteria`, errors);
}

function validateHypotheses(value, errors, frozenDate = null) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 5) {
    errors.push("hypotheses must contain 1 to 5 pre-stated hypotheses");
    return;
  }
  value.forEach((hypothesis, index) => validateHypothesis(hypothesis, index, errors, frozenDate));
  const statements = value.map((hypothesis) => hypothesis?.statement);
  if (new Set(statements).size !== statements.length) errors.push("hypotheses must have distinct statements");
}

function normalizeSystems(system) {
  return Array.isArray(system) ? [...system] : [system];
}

function cloneCalculationBinding(binding) {
  return {
    system: binding.system,
    profile: structuredClone(binding.profile),
    facts_hash: binding.facts_hash,
    reproducibility_hash: binding.reproducibility_hash,
  };
}

function readingPayloadHash(readingPayload) {
  return contentHash({ scope: READING_PAYLOAD_SCOPE, reading_payload: readingPayload });
}

function calculationsFromPayload(readingPayload) {
  if (Array.isArray(readingPayload?.calculations)) return readingPayload.calculations;
  return readingPayload?.calculation ? [readingPayload.calculation] : [];
}

function validationReceiptPayload(receipt) {
  return {
    scope: receipt.scope,
    validator_contract: receipt.validator_contract,
    status: receipt.status,
    validated_at: receipt.validated_at,
    release_version: receipt.release_version,
    engine_versions: receipt.engine_versions,
    reading_payload_hash: receipt.reading_payload_hash,
  };
}

function createValidationReceipt(readingPayload, frozenAt, payloadHash) {
  const receipt = {
    scope: VALIDATION_RECEIPT_SCOPE,
    validator_contract: VALIDATOR_CONTRACT,
    status: "valid_at_freeze",
    validated_at: frozenAt,
    release_version: ENGINE_VERSION,
    engine_versions: [...new Set(calculationsFromPayload(readingPayload).map((item) => item.engine_version))].sort(),
    reading_payload_hash: payloadHash,
  };
  return { ...receipt, receipt_hash: contentHash(validationReceiptPayload(receipt)) };
}

function selectedReadingMaterial(readingPayload, claimIds, frozenAt, errors) {
  const validation = validateReading(readingPayload);
  if (!validation.valid) {
    errors.push(...validation.errors.map((error) => `reading_payload: ${error}`));
    return null;
  }
  if (!Array.isArray(claimIds) || claimIds.length < 1 || claimIds.length > 5) {
    errors.push("claim_ids must contain 1 to 5 interpretation claim IDs");
    return null;
  }
  if (claimIds.some((id) => typeof id !== "string" || !CLAIM_ID_PATTERN.test(id))) {
    errors.push("claim_ids entries must be valid claim IDs");
  }
  if (new Set(claimIds).size !== claimIds.length) errors.push("claim_ids must not contain duplicates");
  if (errors.length) return null;

  const claims = new Map(readingPayload.reading.claims.map((claim) => [claim.claim_id, claim]));
  const frozenDate = utcDate(frozenAt);
  const hypotheses = [];
  const claimBindings = [];
  claimIds.forEach((claimId, index) => {
    const claim = claims.get(claimId);
    const at = `claim_ids[${index}]`;
    if (!claim) {
      errors.push(`${at} does not identify a claim in the validated reading`);
      return;
    }
    if (claim.epistemic_status !== "interpretation") {
      errors.push(`${at} must identify an interpretation claim`);
      return;
    }
    if (claim.assessment?.mode !== "prospective_hypothesis" || claim.assessment?.window?.kind !== "bounded") {
      errors.push(`${at} must identify a prospective_hypothesis claim with a bounded window`);
      return;
    }
    const hypothesis = {
      hypothesis_id: `H-0${index + 1}`,
      statement: claim.statement,
      domain: claim.topic,
      window: { start: claim.assessment.window.start, end: claim.assessment.window.end },
      criteria: claim.assessment.criteria.map((criterion) => ({
        criterion_id: criterion.criterion_id,
        polarity: criterion.polarity,
        observable: criterion.observable,
        evidence_source: criterion.evidence_source,
      })),
    };
    validateHypothesis(hypothesis, index, errors, frozenDate);
    hypotheses.push(hypothesis);
    claimBindings.push({
      hypothesis_id: hypothesis.hypothesis_id,
      claim_id: claim.claim_id,
      calculation_facts_hash: claim.calculation_facts_hash,
      interpretation_profile_id: claim.interpretation_profile_id,
      rule_pack_hash: claim.rule_pack_hash,
    });
  });
  if (errors.length) return null;

  const payloadHash = readingPayloadHash(readingPayload);
  return {
    hypotheses,
    reading_binding: {
      scope: READING_SCOPE,
      reading_payload_hash: payloadHash,
      reading_hash: contentHash({ scope: READING_SCOPE, reading: readingPayload.reading }),
      systems: normalizeSystems(readingPayload.reading.system),
      level: readingPayload.reading.level,
      calculation_bindings: readingPayload.reading.calculation_bindings.map(cloneCalculationBinding),
      claim_bindings: claimBindings,
    },
    validation_receipt: createValidationReceipt(readingPayload, frozenAt, payloadHash),
  };
}

function validateCalculationBinding(binding, path, errors) {
  if (!pushExactKeyError(errors, path, binding, CALCULATION_BINDING_KEYS)) return;
  if (!SYSTEMS.has(binding.system)) errors.push(`${path}.system is invalid`);
  if (!((typeof binding.profile === "string" && binding.profile.length > 0)
    || (binding.profile && typeof binding.profile === "object" && !Array.isArray(binding.profile)))) {
    errors.push(`${path}.profile is invalid`);
  }
  for (const field of ["facts_hash", "reproducibility_hash"]) {
    if (typeof binding[field] !== "string" || !SHA256_PATTERN.test(binding[field])) {
      errors.push(`${path}.${field} must be a lowercase SHA-256 digest`);
    }
  }
}

function validateReadingBinding(binding, hypotheses, errors) {
  if (!pushExactKeyError(errors, "record.reading_binding", binding, READING_BINDING_KEYS)) return;
  if (binding.scope !== READING_SCOPE) errors.push(`record.reading_binding.scope must be ${READING_SCOPE}`);
  for (const field of ["reading_payload_hash", "reading_hash"]) {
    if (typeof binding[field] !== "string" || !SHA256_PATTERN.test(binding[field])) {
      errors.push(`record.reading_binding.${field} must be a lowercase SHA-256 digest`);
    }
  }
  if (!Array.isArray(binding.systems) || binding.systems.length < 1
    || binding.systems.some((system) => !SYSTEMS.has(system))
    || new Set(binding.systems).size !== binding.systems.length) {
    errors.push("record.reading_binding.systems must contain unique supported systems");
  }
  if (!LEVELS.has(binding.level)) errors.push("record.reading_binding.level is invalid");
  if (!Array.isArray(binding.calculation_bindings) || binding.calculation_bindings.length < 1) {
    errors.push("record.reading_binding.calculation_bindings must be non-empty");
  } else {
    binding.calculation_bindings.forEach((item, index) =>
      validateCalculationBinding(item, `record.reading_binding.calculation_bindings[${index}]`, errors));
  }
  if (!Array.isArray(binding.claim_bindings) || binding.claim_bindings.length !== hypotheses?.length) {
    errors.push("record.reading_binding.claim_bindings must match the frozen hypotheses exactly");
    return;
  }
  const claimIds = new Set();
  binding.claim_bindings.forEach((item, index) => {
    const path = `record.reading_binding.claim_bindings[${index}]`;
    if (!pushExactKeyError(errors, path, item, CLAIM_BINDING_KEYS)) return;
    if (item.hypothesis_id !== `H-0${index + 1}` || item.hypothesis_id !== hypotheses[index]?.hypothesis_id) {
      errors.push(`${path}.hypothesis_id must match the frozen hypothesis order`);
    }
    if (typeof item.claim_id !== "string" || !CLAIM_ID_PATTERN.test(item.claim_id)) {
      errors.push(`${path}.claim_id is invalid`);
    } else if (claimIds.has(item.claim_id)) {
      errors.push(`${path}.claim_id is duplicated`);
    } else claimIds.add(item.claim_id);
    for (const field of ["calculation_facts_hash", "rule_pack_hash"]) {
      if (typeof item[field] !== "string" || !SHA256_PATTERN.test(item[field])) {
        errors.push(`${path}.${field} must be a lowercase SHA-256 digest`);
      }
    }
    if (!isBoundedText(item.interpretation_profile_id, 200)) {
      errors.push(`${path}.interpretation_profile_id is invalid`);
    }
  });
}

function validateValidationReceipt(receipt, record, errors) {
  if (!pushExactKeyError(errors, "record.validation_receipt", receipt, VALIDATION_RECEIPT_KEYS)) return;
  if (receipt.scope !== VALIDATION_RECEIPT_SCOPE) {
    errors.push(`record.validation_receipt.scope must be ${VALIDATION_RECEIPT_SCOPE}`);
  }
  if (typeof receipt.validator_contract !== "string"
    || !VALIDATOR_CONTRACT_PATTERN.test(receipt.validator_contract)) {
    errors.push("record.validation_receipt.validator_contract is invalid");
  }
  if (receipt.status !== "valid_at_freeze") {
    errors.push("record.validation_receipt.status must be valid_at_freeze");
  }
  if (!isCanonicalUtcTimestamp(receipt.validated_at) || receipt.validated_at !== record.frozen_at) {
    errors.push("record.validation_receipt.validated_at must equal record.frozen_at");
  }
  if (typeof receipt.release_version !== "string" || !SEMVER_PATTERN.test(receipt.release_version)) {
    errors.push("record.validation_receipt.release_version must be a semantic version");
  }
  if (!Array.isArray(receipt.engine_versions) || receipt.engine_versions.length < 1
    || receipt.engine_versions.some((version) => typeof version !== "string" || !SEMVER_PATTERN.test(version))
    || new Set(receipt.engine_versions).size !== receipt.engine_versions.length
    || [...receipt.engine_versions].sort().some((version, index) => version !== receipt.engine_versions[index])) {
    errors.push("record.validation_receipt.engine_versions must contain sorted unique semantic versions");
  }
  if (typeof receipt.reading_payload_hash !== "string" || !SHA256_PATTERN.test(receipt.reading_payload_hash)) {
    errors.push("record.validation_receipt.reading_payload_hash must be a lowercase SHA-256 digest");
  } else if (receipt.reading_payload_hash !== record.reading_binding?.reading_payload_hash) {
    errors.push("record.validation_receipt.reading_payload_hash must match record.reading_binding.reading_payload_hash");
  }
  if (typeof receipt.receipt_hash !== "string" || !SHA256_PATTERN.test(receipt.receipt_hash)) {
    errors.push("record.validation_receipt.receipt_hash must be a lowercase SHA-256 digest");
  } else if (receipt.receipt_hash !== contentHash(validationReceiptPayload(receipt))) {
    errors.push("record.validation_receipt.receipt_hash does not match the validation receipt");
  }
}

function commitmentPayload(record) {
  return {
    scope: COMMITMENT_SCOPE,
    schema_version: record.schema_version,
    record_type: record.record_type,
    frozen_at: record.frozen_at,
    reading_binding: record.reading_binding,
    validation_receipt: record.validation_receipt,
    hypotheses: record.hypotheses,
  };
}

function calculateCommitmentHash(record) {
  return contentHash(commitmentPayload(record));
}

function fail(code, message, errors) {
  throw new FortuneTellerError(code, message, { errors });
}

function recordErrors(record) {
  const errors = [];
  if (!isPlainJsonValue(record)) return ["record must contain only finite, acyclic plain JSON values"];
  if (!pushExactKeyError(errors, "record", record, RECORD_KEYS)) return errors;
  if (record.schema_version !== SCHEMA_VERSION) errors.push(`record.schema_version must be ${SCHEMA_VERSION}`);
  if (record.record_type !== RECORD_TYPE) errors.push(`record.record_type must be ${RECORD_TYPE}`);
  if (!isCanonicalUtcTimestamp(record.frozen_at)) errors.push("record.frozen_at must be a canonical UTC timestamp");
  const frozenDate = isCanonicalUtcTimestamp(record.frozen_at) ? utcDate(record.frozen_at) : null;
  validateHypotheses(record.hypotheses, errors, frozenDate);
  validateReadingBinding(record.reading_binding, record.hypotheses, errors);
  validateValidationReceipt(record.validation_receipt, record, errors);
  if (pushExactKeyError(errors, "record.commitment", record.commitment, COMMITMENT_KEYS)) {
    if (record.commitment.algorithm !== "sha256") errors.push("record.commitment.algorithm must be sha256");
    if (record.commitment.scope !== COMMITMENT_SCOPE) errors.push(`record.commitment.scope must be ${COMMITMENT_SCOPE}`);
    if (typeof record.commitment.hash !== "string" || !SHA256_PATTERN.test(record.commitment.hash)) {
      errors.push("record.commitment.hash must be a lowercase SHA-256 digest");
    } else if (record.commitment.hash !== calculateCommitmentHash(record)) {
      errors.push("record.commitment.hash does not match the frozen record");
    }
  }
  return errors;
}

export function verifyBlindCheckRecord(record) {
  const errors = recordErrors(record);
  return deepFreeze({ valid: errors.length === 0, errors });
}

export function verifyBlindCheckReading(record, readingPayload) {
  const errors = recordErrors(record);
  if (errors.length === 0) {
    if (!isPlainJsonValue(readingPayload)) {
      errors.push("reading_payload must contain only finite, acyclic plain JSON values");
    } else {
      const payloadHash = readingPayloadHash(readingPayload);
      if (payloadHash !== record.reading_binding.reading_payload_hash) {
        errors.push("reading_payload does not match the complete payload frozen at commitment time");
      }
      const readingHash = contentHash({ scope: READING_SCOPE, reading: readingPayload?.reading });
      if (readingHash !== record.reading_binding.reading_hash) {
        errors.push("reading_payload.reading does not match the reading frozen at commitment time");
      }
      const payloadEngineVersions = [...new Set(
        calculationsFromPayload(readingPayload).map((item) => item?.engine_version),
      )].sort();
      if (stableJson(payloadEngineVersions) !== stableJson(record.validation_receipt.engine_versions)) {
        errors.push("reading_payload engine versions do not match the freeze-time validation receipt");
      }
    }
  }
  return deepFreeze({ valid: errors.length === 0, errors });
}

export function freezeBlindCheck(input) {
  const errors = [];
  if (!isPlainJsonValue(input)) {
    fail("BLIND_CHECK_INPUT_INVALID", "blind-check input must contain only finite, acyclic plain JSON values", [
      "input must contain only finite, acyclic plain JSON values",
    ]);
  }
  if (!pushExactKeyError(errors, "input", input, new Set(["reading_payload", "claim_ids"]))) {
    fail("BLIND_CHECK_INPUT_INVALID", "blind-check input is invalid", errors);
  }
  const frozenAt = new Date().toISOString();
  const material = selectedReadingMaterial(input.reading_payload, input.claim_ids, frozenAt, errors);
  if (errors.length || !material) fail("BLIND_CHECK_INPUT_INVALID", "blind-check input is invalid", errors);
  const payload = {
    schema_version: SCHEMA_VERSION,
    record_type: RECORD_TYPE,
    frozen_at: frozenAt,
    reading_binding: material.reading_binding,
    validation_receipt: material.validation_receipt,
    hypotheses: material.hypotheses,
  };
  return deepFreeze({
    ...payload,
    commitment: {
      algorithm: "sha256",
      scope: COMMITMENT_SCOPE,
      hash: calculateCommitmentHash(payload),
    },
  });
}

function validateCriterionAdjudication(item, index, criterionById, hypothesis, today, errors, path) {
  const itemPath = `${path}.criteria[${index}]`;
  if (!pushExactKeyError(errors, itemPath, item, CRITERION_ADJUDICATION_KEYS)) return null;
  const criterion = criterionById.get(item.criterion_id);
  if (!criterion) errors.push(`${itemPath}.criterion_id is not a frozen criterion for this hypothesis`);
  if (!CRITERION_RESULTS.has(item.result)) {
    errors.push(`${itemPath}.result must be one of: ${[...CRITERION_RESULTS].join(", ")}`);
  }
  if (!isCanonicalDate(item.observed_on)) {
    errors.push(`${itemPath}.observed_on must be a real YYYY-MM-DD date`);
  } else {
    if (item.observed_on < hypothesis.window.start || item.observed_on > hypothesis.window.end) {
      errors.push(`${itemPath}.observed_on must fall inside the frozen window`);
    }
    if (item.observed_on >= today) errors.push(`${itemPath}.observed_on must be earlier than the scoring date`);
  }
  if (!EVIDENCE_SOURCES.has(item.source_type)) {
    errors.push(`${itemPath}.source_type is invalid`);
  } else if (criterion && item.source_type !== criterion.evidence_source) {
    errors.push(`${itemPath}.source_type must equal the evidence_source frozen for ${item.criterion_id}`);
  }
  if (!isBoundedText(item.observation, 500, 12)) {
    errors.push(`${itemPath}.observation must be a concrete string of 12 to 500 characters`);
  } else if (BARNUM_PATTERN.test(item.observation)) {
    errors.push(`${itemPath}.observation must not use a Barnum-style both-sides formulation`);
  }
  return criterion;
}

function validateAdjudications(adjudications, frozenRecord, today) {
  const errors = [];
  if (!isPlainJsonValue(adjudications)) return ["adjudications must contain only finite, acyclic plain JSON values"];
  if (!Array.isArray(adjudications) || adjudications.length !== frozenRecord.hypotheses.length) {
    return ["adjudications must contain exactly one complete criterion assessment for every frozen hypothesis"];
  }
  const hypothesisById = new Map(frozenRecord.hypotheses.map((item) => [item.hypothesis_id, item]));
  const seen = new Set();
  adjudications.forEach((adjudication, index) => {
    const path = `adjudications[${index}]`;
    if (!pushExactKeyError(errors, path, adjudication, ADJUDICATION_KEYS)) return;
    const hypothesis = hypothesisById.get(adjudication.hypothesis_id);
    if (!hypothesis) errors.push(`${path}.hypothesis_id is not in the frozen record`);
    if (seen.has(adjudication.hypothesis_id)) errors.push(`${path}.hypothesis_id is duplicated`);
    seen.add(adjudication.hypothesis_id);
    if (hypothesis && hypothesis.window.end >= today) errors.push(`${path} cannot be scored until the frozen window has ended`);
    if (!Array.isArray(adjudication.criteria)
      || (hypothesis && adjudication.criteria.length !== hypothesis.criteria.length)) {
      errors.push(`${path}.criteria must adjudicate every frozen criterion exactly once`);
    } else if (hypothesis) {
      const criterionById = new Map(hypothesis.criteria.map((item) => [item.criterion_id, item]));
      const seenCriteria = new Set();
      adjudication.criteria.forEach((item, criterionIndex) => {
        const criterion = validateCriterionAdjudication(
          item, criterionIndex, criterionById, hypothesis, today, errors, path,
        );
        if (!criterion) return;
        if (seenCriteria.has(item.criterion_id)) {
          errors.push(`${path}.criteria duplicates ${item.criterion_id}`);
        } else seenCriteria.add(item.criterion_id);
      });
      for (const criterionId of criterionById.keys()) {
        if (!seenCriteria.has(criterionId)) errors.push(`${path}.criteria is missing ${criterionId}`);
      }
    }
  });
  for (const expectedId of hypothesisById.keys()) {
    if (!seen.has(expectedId)) errors.push(`adjudications is missing ${expectedId}`);
  }
  return errors;
}

function deriveOutcome(hypothesis, adjudication) {
  const resultById = new Map(adjudication.criteria.map((item) => [item.criterion_id, item.result]));
  const evaluated = hypothesis.criteria.map((criterion) => ({
    polarity: criterion.polarity,
    result: resultById.get(criterion.criterion_id),
  }));
  if (evaluated.some((item) => item.result === "unclear")) return "unclear";
  const met = evaluated.filter((item) => item.result === "met");
  if (met.some((item) => item.polarity === "unclear")) return "unclear";
  const supportMet = met.some((item) => item.polarity === "supports");
  const contradictionMet = met.some((item) => item.polarity === "contradicts");
  if (supportMet && contradictionMet) return "unclear";
  if (contradictionMet) return "contradicted";
  if (supportMet) return "supported";
  return "unclear";
}

export function scoreBlindCheck(frozenRecord, readingPayload, adjudications) {
  const recordVerification = verifyBlindCheckRecord(frozenRecord);
  if (!recordVerification.valid) {
    fail("BLIND_CHECK_RECORD_INVALID", "frozen blind-check record is invalid or has been altered", recordVerification.errors);
  }
  const readingVerification = verifyBlindCheckReading(frozenRecord, readingPayload);
  if (!readingVerification.valid) {
    fail("BLIND_CHECK_READING_MISMATCH", "reading payload does not match the frozen commitment", readingVerification.errors);
  }
  const today = utcDate();
  const adjudicationErrors = validateAdjudications(adjudications, frozenRecord, today);
  if (adjudicationErrors.length) {
    fail("BLIND_CHECK_ADJUDICATION_INVALID", "blind-check adjudications are invalid", adjudicationErrors);
  }
  const adjudicationById = new Map(adjudications.map((item) => [item.hypothesis_id, item]));
  const counts = { supported: 0, contradicted: 0, unclear: 0, total: frozenRecord.hypotheses.length };
  const items = frozenRecord.hypotheses.map((hypothesis) => {
    const adjudication = adjudicationById.get(hypothesis.hypothesis_id);
    const outcome = deriveOutcome(hypothesis, adjudication);
    counts[outcome] += 1;
    return {
      ...structuredClone(hypothesis),
      adjudication: outcome,
      criterion_results: structuredClone(adjudication.criteria),
    };
  });
  return deepFreeze({
    schema_version: SCHEMA_VERSION,
    record_type: SCORE_TYPE,
    scored_at: new Date().toISOString(),
    source_commitment: {
      algorithm: frozenRecord.commitment.algorithm,
      scope: frozenRecord.commitment.scope,
      hash: frozenRecord.commitment.hash,
    },
    source_reading: structuredClone(frozenRecord.reading_binding),
    counts,
    items,
    assessment: {
      predictive_validity: "not_established",
      adjudication_status: "mechanically_derived_from_complete_user_entered_criteria",
      note: "Outcomes are derived conservatively from complete criterion-level entries. The observations remain user-entered and are not independently verified; this tally is not evidence that divination predicts outcomes.",
      note_zh: "结论由完整的逐条标准记录保守推导；观察内容仍由用户填写，系统不独立核验，因此计数不能证明术数具有预测有效性，也不代表命理准确率。",
    },
  });
}
