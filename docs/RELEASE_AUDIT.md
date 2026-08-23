# Release Audit — 0.1.0

Audit date: 2026-08-23

## Outcome

This release passes the project's local engineering release gates for its declared scope. The result supports claims about reproducibility, input handling, local execution, packaging, and evidence traceability. It does not establish that any divination tradition predicts real-world outcomes.

The final local verification environment was macOS with Node.js 24.9.0. GitHub Actions repeats the release gates on Node.js 20, 22, and 24; the repository's Actions page is the authoritative source for current hosted-run status.

## Reproducible checks

| Gate | Result |
|---|---|
| `npm test` | 73 tests passed, 0 failed |
| `npm run doctor` | Runtime, dependency loading, deterministic fixture, and calendar engine passed |
| `npm run verify` | Required files, links, schemas, pinned dependencies, notices, executable bits, and network-capable source scan passed |
| JavaScript syntax scan | Every `.mjs` file under `src/`, `scripts/`, and `test/` passed `node --check` |
| Official Skill validator | Source directory and clean extracted archive both reported `Skill is valid!` |
| Production dependency audit | `npm audit --omit=dev` reported 0 vulnerabilities for the locked dependency graph |
| Clean archive install | A newly extracted archive completed `npm ci --ignore-scripts` and the full check suite |
| npm package preview | `npm pack --dry-run --json` completed and inventoried the publishable files |

The release archive does not bundle `node_modules`. Installing dependencies contacts the npm registry; local calculations after installation do not require a remote calculation service.

## Independent development audits

These checks were performed separately from the 73-test automated suite and used synthetic fixtures only:

- A 60-day exhaustive late-Zi consistency audit evaluated 7,320 generated charts and 512,400 assertions with no mismatch after the consistency wrapper was finalized.
- A zero-context Skill forward test confirmed that an Agent could discover the live registry, preserve an unknown birth time, avoid cross-system voting, and choose a standard model for the normal path without being given implementation context.
- Adversarial CLI and JSON fuzzing found and drove fixes for repeated flags, prototype-like keys, malformed field types, coordinate half-pairs, fixed-offset timezones, DST privacy leaks, and sensitivity coverage bypasses. Two final coercion campaigns covered 574 shallow reading mutations plus 1,040 reading and 378 calculation/profile/input mutations, with no uncaught exception or malformed validator return. No known release-candidate blocker remained at sign-off.

Independent development audits are supporting engineering evidence, not a substitute for the shipped automated suite or external user testing.

## What is defensibly stronger

Against the repositories in [COMPETITOR_AUDIT.md](COMPETITOR_AUDIT.md), this release has directly verified advantages in a bounded set of engineering dimensions:

- private local calculation rather than a required public birth-data API;
- strict unknown-key, profile, timezone, coordinate, and conflict handling;
- full-real-day unknown-time sensitivity rather than a guessed default hour;
- replayable, domain-separated local randomness with recorded casts;
- one result envelope and evidence contract across supported Chinese and Western methods;
- structural validation that binds claims to calculation facts, profiles, and real candidate denominators;
- a complete one-system workflow that does not require a Pro model.

This is not an overall superiority claim. Larger projects still lead in method count, historical source libraries, charts, MCP/API surfaces, accumulated tests, users, and maintenance history. No comparative predictive-accuracy claim is made or supported.

## Known release limits

- Native birth-time input is exact time or unknown/full-day sensitivity; bounded ranges such as “06:00–10:00” are not a v0.1 engine input.
- Direct lunar-date input is not implemented.
- Meihua remains a two-number preview; Liu Yao, Qi Men, and Vedic astrology are planned and fail closed.
- Western support is tropical whole-sign natal only; no sidereal chart, additional house systems, nodes, Chiron, transits, synastry, or electional workflow.
- There is no verified classical-source registry. Machine validation covers structure and linkage, not the truth or safety of arbitrary free-form prose.
- Two people using the same system/profile must have their person-specific claims validated separately before a clearly separated relational synthesis.
- There is no MCP, HTTP API, chart graphic, or external-user validation yet.
- Native JSON parsing follows JavaScript's last-member behavior when a hand-written object repeats the same key; request producers should emit unique keys with a serializer such as `JSON.stringify`.
- Pathological values nested thousands of levels deep can reach the JavaScript recursion limit. They are outside every public request schema; the CLI sanitizes unexpected internal errors rather than printing a stack or payload.

## Sign-off rule

Any edit to code, lockfiles, schemas, Skill routing, safety rules, or packaged resources after this audit invalidates the clean-archive result. Re-run the source checks, rebuild the archive, install it in a new empty directory, and repeat the archive checks before release.
