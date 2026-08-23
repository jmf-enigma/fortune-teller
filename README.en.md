# Fortune Teller

[![CI](https://github.com/jmf-enigma/fortune-teller/actions/workflows/ci.yml/badge.svg)](https://github.com/jmf-enigma/fortune-teller/actions/workflows/ci.yml)

[中文](README.md) · [Scope](docs/SCOPE.md) · [Competitor audit](docs/COMPETITOR_AUDIT.md) · [Benchmark](BENCHMARK.md)

Fortune Teller is a local-first, reproducible, and auditable Agent Skill for a deliberately limited set of Chinese and Western divination systems. Deterministic programs calculate charts and casts; the conversational model handles intake, explanation, comparison, and audit.

It is not a prompt-only “fortune teller,” and it makes no claim that divination has scientifically validated predictive power.

Current release: `0.1.0`. Public repository: [jmf-enigma/fortune-teller](https://github.com/jmf-enigma/fortune-teller).

## Supported scope

| System | Status | Implemented scope |
|---|---|---|
| BaZi | stable | Gregorian input, IANA zones, midnight/Zi-start day boundaries, civil/mean/apparent-solar time; full real-day unknown-time scan |
| Zi Wei Dou Shu | stable | pinned `iztro` profiles and compact 12-palace output; real-instant unknown-time scan with DST handling |
| Western natal astrology | stable-whole-sign | tropical planets, Ascendant/MC, whole-sign houses, five aspects; no angles or houses without time |
| Tarot | stable | local 78-card deck, five spreads, secure random, replay seed, manual cards |
| I Ching | stable | six three-coin transcripts, King Wen mapping, changing lines, replay seed, manual lines |
| Meihua two-number | preview | deterministic two-number cast only; no body/use, five-element, or timing engine |
| Liu Yao, Qi Men, Vedic | planned | registered but intentionally fail closed because no engine is shipped |

“Stable” is an engineering status inside the stated scope, not a statement of predictive validity.

## Quick start

Requires Node.js 20 or newer.

All three birth-chart engines currently fail closed outside their release-tested range of `1900-01-01` through `2100-12-31`.

```bash
npm ci --ignore-scripts
npm run check
npm start
```

Discover the live contract before constructing requests:

```bash
node scripts/fortune-teller.mjs methods --json
```

Example request (save it as the git-ignored `request.local.json`):

```json
{
  "system": "iching",
  "input": {
    "question": "What should I examine before choosing?",
    "seed": "non-secret-demo-seed"
  }
}
```

```bash
node scripts/fortune-teller.mjs calculate --input request.local.json --pretty
```

Do not commit real birth records, precise locations, private questions, or replay seeds.

## Why this design is different

- Local calculation by default; no public chart API.
- One structured envelope across Chinese, Western, and casting methods.
- Explicit profiles for material conventions.
- Unknown birth time is never replaced by noon or another guessed value.
- DST gaps, overlaps, and skipped civil dates fail closed or are scanned as real instants.
- Secure local random draws, opt-in replay seed disclosure, and user-supplied physical results.
- Separate calculation facts, traditional rules, interpretations, and unresolved gaps.
- Cross-system agreement is not treated as independent evidence or a confidence vote.

The project deliberately has less method coverage than the largest existing repositories. Its defensible advantage is auditability within a smaller supported core, not superior predictive accuracy. See [docs/COMPETITOR_AUDIT.md](docs/COMPETITOR_AUDIT.md) and the measured [release audit](docs/RELEASE_AUDIT.md).

## Standard model vs Pro

A standard/general model is sufficient for one-system routing, local calculation, a focused reading, engine-aggregated time sensitivity, and a few evidence cards. A stronger Pro/audit model is recommended for many systems or profiles, complete conflict matrices, source coverage, and an adversarial second pass.

Both tiers use identical engine facts. Pro does not make a traditional prediction more valid. See [references/model-tiers.md](references/model-tiers.md).

## Reproducibility

- `facts_hash` commits to engine version, system, profile, and calculated or recorded facts.
- `reproducibility_hash` commits to the wider envelope except its generation timestamp.
- `meta.time_runtime` records Node, ICU, tzdb, and Temporal-polyfill versions.
- A fresh random draw and a seeded replay may share `facts_hash` while having different full-envelope hashes because their provenance differs.

`validate-reading` recomputes both hashes and binds claims to one supplied system/profile envelope. Two people with the same system and profile must currently be validated separately before a clearly labeled relational synthesis; scoped cross-envelope fact references are a documented future improvement.

## Agent Skill installation

Copy or symlink the complete folder into the host's skills directory. For a common Codex setup:

```bash
cd /absolute/path/to/fortune-teller
npm ci --ignore-scripts
ln -s /absolute/path/to/fortune-teller ~/.codex/skills/fortune-teller
```

The archive does not bundle `node_modules`; install the locked dependencies in the extracted directory before first use. An agent must not perform that networked installation without permission.

Then invoke `$fortune-teller`. The core contract is the portable `SKILL.md`, relative references, local CLI, and JSON schemas; `agents/openai.yaml` is optional UI metadata.

## Safety and privacy

The source engines contain no network calls. Dependency installation still accesses the npm registry. The tool does not persist user input by default.

Do not use it to diagnose health conditions, determine pregnancy, predict death, establish guilt, direct legal or financial action, determine another person's fidelity, or validate paranoia. See [SECURITY.md](SECURITY.md) and [references/safety.md](references/safety.md).

## Development

```bash
npm test
npm run doctor
npm run verify
npm run check
npm run package:skill
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [CONTRIBUTING.md](CONTRIBUTING.md), and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## License

Project-authored code is [MIT licensed](LICENSE). Production dependencies use MIT, ISC, and Apache-2.0 licenses; attribution is in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
