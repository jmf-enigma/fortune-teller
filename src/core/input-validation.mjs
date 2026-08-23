import { FortuneTellerError } from "./errors.mjs";
import { isPlainJsonValue } from "./result.mjs";

function matchesType(value, type) {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  return typeof value === type;
}

function isPlainRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function inspect(value, schema, path, errors) {
  if (!schema) return;
  if (Array.isArray(schema.oneOf)) {
    const matches = schema.oneOf.filter((branch) => {
      const branchErrors = [];
      inspect(value, branch, path, branchErrors);
      return branchErrors.length === 0;
    });
    if (matches.length !== 1) {
      errors.push(`${path} must match exactly one allowed shape`);
    }
    return;
  }
  const types = schema.type == null ? [] : Array.isArray(schema.type) ? schema.type : [schema.type];
  if (types.length && !types.some((type) => matchesType(value, type))) {
    errors.push(`${path} must have type ${types.join(" or ")}`);
    return;
  }
  if (schema.enum && !schema.enum.some((allowed) => Object.is(allowed, value))) {
    errors.push(`${path} must be one of: ${schema.enum.join(", ")}`);
  }
  if (typeof value === "string") {
    const codePointLength = [...value].length;
    if (schema.minLength != null && codePointLength < schema.minLength) errors.push(`${path} is too short`);
    if (schema.maxLength != null && codePointLength > schema.maxLength) errors.push(`${path} is too long`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${path} has an invalid format`);
  }
  if (typeof value === "number") {
    if (schema.minimum != null && value < schema.minimum) errors.push(`${path} must be at least ${schema.minimum}`);
    if (schema.maximum != null && value > schema.maximum) errors.push(`${path} must be at most ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems != null && value.length < schema.minItems) errors.push(`${path} has too few items`);
    if (schema.maxItems != null && value.length > schema.maxItems) errors.push(`${path} has too many items`);
    if (schema.items) value.forEach((item, index) => inspect(item, schema.items, `${path}[${index}]`, errors));
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if (!isPlainRecord(value)) {
      errors.push(`${path} must be a plain JSON object`);
      return;
    }
    for (const key of schema.required || []) {
      if (!Object.hasOwn(value, key)) errors.push(`${path}.${key} is required`);
    }
    for (const [key, dependencies] of Object.entries(schema.dependentRequired || {})) {
      if (!Object.hasOwn(value, key)) continue;
      for (const dependency of dependencies) {
        if (!Object.hasOwn(value, dependency)) {
          errors.push(`${path}.${dependency} is required when ${path}.${key} is supplied`);
        }
      }
    }
    if (schema.additionalProperties === false) {
      const unknownKeys = Object.keys(value).filter((key) => !Object.hasOwn(schema.properties || {}, key));
      if (unknownKeys.length) errors.push(`${path} contains ${unknownKeys.length} unknown field(s)`);
    }
    for (const [key, child] of Object.entries(schema.properties || {})) {
      if (Object.hasOwn(value, key)) inspect(value[key], child, `${path}.${key}`, errors);
    }
  }
}

export function validateMethodInput(input, schema) {
  if (!isPlainJsonValue(input)) {
    throw new FortuneTellerError(
      "INPUT_SCHEMA_VIOLATION",
      "input must contain only finite, acyclic plain JSON values",
      { errors: ["input must contain only finite, acyclic plain JSON values"] },
    );
  }
  const errors = [];
  inspect(input, schema, "input", errors);
  if (errors.length) {
    throw new FortuneTellerError("INPUT_SCHEMA_VIOLATION", errors[0], { errors });
  }
  return input;
}
