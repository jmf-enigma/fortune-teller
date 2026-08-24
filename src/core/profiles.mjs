import { FortuneTellerError } from "./errors.mjs";
import { contentHash, stableJson } from "./hash.mjs";
import { isPlainJsonValue } from "./result.mjs";

const PRESETS = {
  bazi: [
    { status: "stable", profile: { id: "bazi-civil-midnight-consistent-v1", time_basis: "civil", day_boundary: "midnight" } },
    { status: "stable", profile: { id: "bazi-civil-zi-start-consistent-v1", time_basis: "civil", day_boundary: "zi-start" } },
  ],
  ziwei: [
    {
      status: "stable",
      profile: {
        id: "ziwei-default-v1", time_basis: "civil", fix_leap_month: true,
        calendar_day_basis: "birthplace-civil",
        year_divide: "normal", horoscope_divide: "normal", age_divide: "normal",
        day_divide: "forward", algorithm: "default",
      },
    },
    {
      status: "qualified",
      profile: {
        id: "ziwei-zhongzhou-v1", time_basis: "civil", fix_leap_month: true,
        calendar_day_basis: "birthplace-civil",
        year_divide: "exact", horoscope_divide: "exact", age_divide: "normal",
        day_divide: "current", algorithm: "zhongzhou",
      },
    },
  ],
  western: [
    {
      status: "stable",
      profile: {
        id: "western-tropical-whole-sign-v1", zodiac: "tropical", houses: "whole-sign",
        aspect_orbs_degrees: { conjunction: 8, opposition: 8, trine: 7, square: 7, sextile: 5 },
      },
    },
  ],
  tarot: [
    { status: "stable", profile: { id: "tarot-rws-local-v1", deck: "rider-waite-smith-names", reversals: true } },
    { status: "stable", profile: { id: "tarot-rws-upright-only-v1", deck: "rider-waite-smith-names", reversals: false } },
  ],
  iching: [
    { status: "stable", profile: { id: "iching-three-coin-v1", coin_values: { tails: 2, heads: 3 }, line_order: "bottom-up" } },
  ],
  meihua: [
    {
      status: "preview",
      profile: {
        id: "meihua-two-number-v1", trigram_order: "qian-dui-li-zhen-xun-kan-gen-kun",
        modulo_zero_maps_to_last: true,
      },
    },
  ],
};

export const DEFAULT_PROFILES = Object.fromEntries(
  Object.entries(PRESETS).map(([system, presets]) => [system, structuredClone(presets[0].profile)]),
);

const OVERRIDABLE = {
  bazi: new Set(["day_boundary"]),
  ziwei: new Set(["fix_leap_month", "year_divide", "horoscope_divide", "age_divide", "day_divide", "algorithm"]),
  western: new Set(["aspect_orbs_degrees"]),
  tarot: new Set(["reversals"]),
  iching: new Set(),
  meihua: new Set(),
};

const ALLOWED = {
  bazi: {
    day_boundary: new Set(["midnight", "zi-start"]),
  },
  ziwei: {
    year_divide: new Set(["normal", "exact"]),
    horoscope_divide: new Set(["normal", "exact"]),
    age_divide: new Set(["normal", "birthday"]),
    day_divide: new Set(["current", "forward"]),
    algorithm: new Set(["default", "zhongzhou"]),
  },
};

function clone(value) {
  return structuredClone(value);
}

function same(left, right) {
  return stableJson(left) === stableJson(right);
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

export function listProfiles(system) {
  return (PRESETS[system] || []).map((preset) => ({
    id: preset.profile.id,
    status: preset.status,
    config: Object.fromEntries(Object.entries(clone(preset.profile)).filter(([key]) => key !== "id")),
    ...(preset.requires ? { requires: [...preset.requires] } : {}),
  }));
}

export function getRegisteredProfile(system, id) {
  const match = (PRESETS[system] || []).find((preset) => preset.profile.id === id);
  return match ? clone(match.profile) : null;
}

export function isCanonicalRegisteredProfile(system, profile) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) return false;
  const registered = getRegisteredProfile(system, profile.id);
  return registered !== null && same(profile, registered);
}

export function resolveProfile(system, rawOverride = {}) {
  const presets = PRESETS[system];
  if (!presets) throw new FortuneTellerError("UNSUPPORTED_SYSTEM", `no profile is defined for ${system}`);
  let override = rawOverride;
  if (typeof override === "string") {
    if (!override) throw new FortuneTellerError("INVALID_PROFILE", "profile ID must not be empty");
    override = { id: override };
  }
  if (!isPlainRecord(override)) {
    throw new FortuneTellerError("INVALID_PROFILE", "profile must be a profile ID or plain JSON object");
  }
  if (!isPlainJsonValue(override)) {
    throw new FortuneTellerError("INVALID_PROFILE", "profile must contain only finite, acyclic JSON values");
  }
  if (Object.hasOwn(override, "id") && (typeof override.id !== "string" || !override.id)) {
    throw new FortuneTellerError("INVALID_PROFILE", "profile.id must be a non-empty profile ID");
  }
  if (Object.hasOwn(override, "config")) {
    if (!isPlainRecord(override.config)) throw new FortuneTellerError("INVALID_PROFILE", "profile.config must be a plain JSON object");
    const extra = Object.keys(override).filter((key) => !["id", "status", "requires", "config"].includes(key));
    if (extra.length) throw new FortuneTellerError("INVALID_PROFILE", `registry profile contains ${extra.length} unexpected field(s)`);
    if (typeof override.id !== "string" || !override.id) {
      throw new FortuneTellerError("INVALID_PROFILE", "a registry profile object with config requires a non-empty outer id");
    }
    const reserved = Object.keys(override.config).filter((key) => ["id", "status", "requires", "config"].includes(key));
    if (reserved.length) {
      throw new FortuneTellerError("INVALID_PROFILE", `profile.config contains reserved fields: ${reserved.join(", ")}`);
    }
    const registryPreset = presets.find((preset) => preset.profile.id === override.id);
    if (registryPreset && Object.hasOwn(override, "status") && override.status !== registryPreset.status) {
      throw new FortuneTellerError("PROFILE_REGISTRY_METADATA_MISMATCH", `profile status does not match ${override.id}`);
    }
    if (
      registryPreset
      && Object.hasOwn(override, "requires")
      && !same(override.requires, registryPreset.requires || [])
    ) {
      throw new FortuneTellerError("PROFILE_REGISTRY_METADATA_MISMATCH", `profile requirements do not match ${override.id}`);
    }
    override = { id: override.id, ...override.config };
  }
  const requestedId = override.id;
  const selected = requestedId
    ? presets.find((preset) => preset.profile.id === requestedId)
    : presets[0];
  if (!selected) throw new FortuneTellerError("UNKNOWN_PROFILE_ID", "unknown profile ID for the selected system");
  const base = clone(selected.profile);
  const fields = Object.fromEntries(Object.entries(override).filter(([key]) => key !== "id"));
  const unknownKeys = Object.keys(fields).filter((key) => !Object.hasOwn(base, key));
  if (unknownKeys.length) throw new FortuneTellerError("INVALID_PROFILE", `profile contains ${unknownKeys.length} unknown field(s)`);

  if (requestedId) {
    const mismatches = Object.entries(fields).filter(([key, value]) => !same(value, base[key]));
    if (mismatches.length) {
      throw new FortuneTellerError(
        "PROFILE_ID_CONFIG_MISMATCH",
        `profile ID conflicts with ${mismatches.length} supplied field(s)`,
      );
    }
    return validateProfile(system, base);
  }

  for (const [key, value] of Object.entries(fields)) {
    if (!same(value, base[key]) && !OVERRIDABLE[system].has(key)) {
      throw new FortuneTellerError("IMMUTABLE_PROFILE_FIELD", `${key} is fixed by ${base.id}`);
    }
  }
  if (Object.hasOwn(fields, "aspect_orbs_degrees")) {
    const orbs = fields.aspect_orbs_degrees;
    if (!isPlainRecord(orbs)) {
      throw new FortuneTellerError("INVALID_PROFILE", "aspect_orbs_degrees must be a JSON object");
    }
  }
  const profile = {
    ...base,
    ...fields,
    ...(base.aspect_orbs_degrees
      ? { aspect_orbs_degrees: { ...base.aspect_orbs_degrees, ...(fields.aspect_orbs_degrees ?? {}) } }
      : {}),
  };
  const changed = Object.entries(fields).some(([key, value]) => !same(value, base[key]));
  if (changed) {
    const config = Object.fromEntries(Object.entries(profile).filter(([key]) => key !== "id"));
    profile.id = `${system}-custom-${contentHash(config).slice(0, 10)}`;
  }
  return validateProfile(system, profile);
}

function validateProfile(system, profile) {
  for (const [field, choices] of Object.entries(ALLOWED[system] || {})) {
    if (!choices.has(profile[field])) {
      throw new FortuneTellerError("INVALID_PROFILE", `${field} must be one of: ${[...choices].join(", ")}`);
    }
  }
  if (system === "ziwei" && typeof profile.fix_leap_month !== "boolean") {
    throw new FortuneTellerError("INVALID_PROFILE", "fix_leap_month must be true or false");
  }
  if (system === "tarot" && typeof profile.reversals !== "boolean") {
    throw new FortuneTellerError("INVALID_PROFILE", "reversals must be true or false");
  }
  if (system === "western") {
    const expected = ["conjunction", "opposition", "trine", "square", "sextile"];
    if (
      !isPlainRecord(profile.aspect_orbs_degrees)
    ) {
      throw new FortuneTellerError("INVALID_PROFILE", "aspect_orbs_degrees must be a JSON object");
    }
    if (Object.keys(profile.aspect_orbs_degrees).some((key) => !expected.includes(key))) {
      throw new FortuneTellerError("INVALID_PROFILE", "aspect_orbs_degrees contains an unknown aspect");
    }
    for (const [aspect, orb] of Object.entries(profile.aspect_orbs_degrees)) {
      if (!Number.isFinite(orb) || orb < 0 || orb > 15) {
        throw new FortuneTellerError("INVALID_PROFILE", `${aspect} orb must be between 0 and 15 degrees`);
      }
    }
  }
  return profile;
}
