# Architecture

## Design boundary

The package separates mechanical representation from narrative interpretation:

```text
User / Agent
  -> live method registry and input schema
  -> strict request validation
  -> profile resolution
  -> deterministic engine or recorded/manual cast
  -> hash-committed JSON result envelope
  -> evidence-bound interpretation
  -> reading validator
```

An engine failure never falls back to language-model calculation.

## Main components

| Path | Responsibility |
|---|---|
| `SKILL.md` | Agent routing, interaction state machine, privacy, evidence, and safety gates |
| `src/core/methods.mjs` | Live method registry, input schemas, statuses, and profile discovery |
| `src/core/profiles.mjs` | Named presets, immutable fields, custom-profile validation, and profile IDs |
| `src/core/time.mjs` | Calendar input, IANA zone resolution, DST disambiguation, civil-day bounds, and solar-time transforms |
| `src/core/random.mjs` | OS seed generation, commitments, SHA-256 replay stream, rejection sampling, and shuffle |
| `src/engines/` | Calculation-only wrappers; no free-form reading generation |
| `src/core/result.mjs` | Versioned envelope, runtime provenance, `facts_hash`, and `reproducibility_hash` |
| `src/core/reading-validator.mjs` | Envelope-integrity, unique system/profile multi-envelope binding, fact/rule, coverage, and safety structure checks |
| `references/` | Progressive disclosure for interaction, evidence, safety, tiers, and method-specific rules |
| `scripts/fortune-teller.mjs` | CLI and local interactive wizard |
| `scripts/doctor.mjs` | Runtime and pinned-fixture smoke tests |
| `scripts/release-check.mjs` | Static release, schema, license, path, and offline-source gates |

The Zi Wei wrapper evaluates the pinned `iztro` UMD bundle once in a private Node VM realm. This prevents another same-process consumer's `iztro` plugins, brightness/mutagen tables, scalar profile settings, or language state from changing Fortune Teller facts. Returned chart JSON is cloned into the host realm before hashing and validation.

## Time model

Recorded local times are resolved with an IANA timezone. DST gaps always reject; an overlap requires explicit `earlier` or `later` selection. An optional UTC offset is accepted only with an exact local time and must agree with the named zone. An offset and `earlier`/`later` cannot be supplied together because they are competing resolution controls. Unknown-time day scans reject instant-only offset or overlap controls.

The discoverable input schemas cover fields, types, unknown-key rejection, and selected dependencies such as Western coordinate pairing. Semantic cross-field constraints are also checked by the runtime; schema discovery is not permission to bypass those checks.

Unknown BaZi and Zi Wei times are scanned over the actual instant interval of the civil date. This matters because a local day may have 23 or 25 hours, and a historical timezone transition can skip a civil date entirely. Scans group consecutive calculation regimes; their counts are coverage diagnostics, never probabilities.

The pinned Temporal polyfill supplies Temporal arithmetic, while timezone rules come from the Node/ICU runtime. Results therefore record Node, ICU, and tzdb versions.

## Randomness model

Fresh local draws begin with an operating-system random seed. A SHA-256 counter stream is domain-separated by method and profile. Bounded integers use rejection sampling, Tarot uses Fisher-Yates, and I Ching records every coin value.

The generated seed is not returned unless the caller explicitly requests it for a fresh draw. Manual results and supplied seeds are mutually exclusive. The language model never selects the random outcome.

## Hash model

`facts_hash` commits to:

- Fortune Teller engine version;
- system;
- complete profile;
- calculated, randomized, or user-supplied facts.

`reproducibility_hash` additionally commits to normalized input, warnings, sensitivity, provenance metadata, and runtime versions. Generation time is excluded from both. Consequently a fresh draw and later seeded replay may share facts but differ in the wider audit hash.

These are content hashes, not signatures.

## Network and persistence

Production source has no network client. Calculation results are returned to stdout unless the caller requests a new output file. The CLI uses exclusive creation and refuses to overwrite an existing file. The project itself has no user database, telemetry, geocoder, or cache.

## Extension rule

A new method must add, together:

- registry entry and strict input schema;
- named profile and declared immutable fields;
- calculation engine with no prose fallback;
- normal, boundary, negative, and unknown-input fixtures;
- result facts with stable IDs where interpretation can cite them;
- method reference with numbered local rule IDs and explicit unsupported scope;
- dependency/license notice and clean-archive proof.
