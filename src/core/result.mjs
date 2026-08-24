import { contentHash } from "./hash.mjs";

export const ENGINE_VERSION = "0.6.0";
export const CALCULATION_SYSTEMS = Object.freeze(["bazi", "ziwei", "western", "tarot", "iching", "meihua"]);
const CALCULATION_SYSTEM_SET = new Set(CALCULATION_SYSTEMS);
const RESULT_KEYS = new Set([
  "schema_version", "engine_version", "generated_at", "system", "profile", "input", "facts", "warnings",
  "sensitivity", "meta", "facts_hash", "reproducibility_hash",
]);

export function isPlainJsonValue(value, ancestors = new WeakSet()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object" || ancestors.has(value)) return false;
  ancestors.add(value);
  let valid = true;
  try {
    if (Array.isArray(value)) {
      const keys = Reflect.ownKeys(value).filter((key) => key !== "length");
      valid = keys.length === value.length;
      for (let index = 0; valid && index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        valid = Boolean(descriptor?.enumerable && Object.hasOwn(descriptor, "value"))
          && isPlainJsonValue(descriptor.value, ancestors);
      }
    } else {
      const prototype = Object.getPrototypeOf(value);
      valid = prototype === Object.prototype || prototype === null;
      for (const key of valid ? Reflect.ownKeys(value) : []) {
        if (typeof key !== "string") { valid = false; break; }
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor?.enumerable || !Object.hasOwn(descriptor, "value") || !isPlainJsonValue(descriptor.value, ancestors)) {
          valid = false;
          break;
        }
      }
    }
  } catch {
    valid = false;
  }
  ancestors.delete(value);
  return valid;
}

function isCanonicalGeneratedAt(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value;
}

function runtimeProvenance() {
  return {
    temporal_polyfill: "@js-temporal/polyfill@0.5.1",
    node: process.versions.node,
    icu: process.versions.icu ?? null,
    tzdb: process.versions.tz ?? null,
  };
}

function duplicateFactIds(value, counts = new Map()) {
  if (Array.isArray(value)) {
    for (const item of value) duplicateFactIds(item, counts);
  } else if (value && typeof value === "object") {
    if (typeof value.fact_id === "string") {
      counts.set(value.fact_id, (counts.get(value.fact_id) || 0) + 1);
    }
    for (const child of Object.values(value)) duplicateFactIds(child, counts);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id);
}

export function calculateFactsHash(payload) {
  return contentHash({
    engine_version: payload.engine_version,
    system: payload.system,
    profile: payload.profile,
    facts: payload.facts,
  });
}

export function calculateReproducibilityHash(payload) {
  return contentHash({
    schema_version: payload.schema_version,
    engine_version: payload.engine_version,
    system: payload.system,
    profile: payload.profile,
    input: payload.input,
    facts: payload.facts,
    warnings: payload.warnings,
    sensitivity: payload.sensitivity,
    meta: payload.meta,
  });
}

export function verifyCalculationEnvelope(payload) {
  const errors = [];
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return ["must be an object"];
  if (!isPlainJsonValue(payload)) return ["must contain only finite, acyclic plain JSON values"];
  for (const key of RESULT_KEYS) {
    if (!Object.hasOwn(payload, key)) errors.push(`missing ${key}`);
  }
  const unknownKeys = Object.keys(payload).filter((key) => !RESULT_KEYS.has(key));
  if (unknownKeys.length) errors.push(`contains ${unknownKeys.length} unknown field(s)`);
  if (payload.schema_version !== "1.0.0") errors.push("schema_version must be 1.0.0");
  if (payload.engine_version !== ENGINE_VERSION) errors.push(`engine_version must be ${ENGINE_VERSION}`);
  if (!isCanonicalGeneratedAt(payload.generated_at)) errors.push("generated_at must be the canonical UTC ISO date-time emitted by this engine");
  if (!CALCULATION_SYSTEM_SET.has(payload.system)) errors.push(`system must be one of: ${CALCULATION_SYSTEMS.join(", ")}`);
  for (const field of ["profile", "input", "facts", "meta"]) {
    if (!payload[field] || typeof payload[field] !== "object" || Array.isArray(payload[field])) errors.push(`${field} must be an object`);
  }
  if (payload.facts && typeof payload.facts === "object" && !Array.isArray(payload.facts)) {
    const duplicates = duplicateFactIds(payload.facts);
    if (duplicates.length) errors.push(`facts contain ${duplicates.length} duplicate fact_id value(s)`);
  }
  if (!Array.isArray(payload.warnings) || payload.warnings.some((item) => typeof item !== "string")) errors.push("warnings must be an array of strings");
  if (payload.sensitivity !== null && (typeof payload.sensitivity !== "object" || Array.isArray(payload.sensitivity))) {
    errors.push("sensitivity must be an object or null");
  }
  if (typeof payload.facts_hash !== "string" || payload.facts_hash !== calculateFactsHash(payload)) errors.push("facts_hash does not match the envelope");
  if (
    typeof payload.reproducibility_hash !== "string"
    || payload.reproducibility_hash !== calculateReproducibilityHash(payload)
  ) errors.push("reproducibility_hash does not match the envelope");
  return errors;
}

export function makeEnvelope({ system, profile, input, facts, warnings = [], sensitivity = null, meta = {} }) {
  const payload = {
    schema_version: "1.0.0",
    engine_version: ENGINE_VERSION,
    generated_at: new Date().toISOString(),
    system,
    profile,
    input,
    facts,
    warnings,
    sensitivity,
    meta: { ...meta, time_runtime: runtimeProvenance() },
  };
  return {
    ...payload,
    facts_hash: calculateFactsHash(payload),
    reproducibility_hash: calculateReproducibilityHash(payload),
  };
}
