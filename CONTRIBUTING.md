# Contributing

Contributions are welcome when they preserve the project's small, auditable-core design.

## Development setup

```bash
npm ci --ignore-scripts
npm run check
```

Use Node.js 20 or newer. Keep runtime dependencies exactly pinned in `package.json` and update `package-lock.json` and `THIRD_PARTY_NOTICES.md` together.

## Change requirements

- Add or change calculation facts in code, never in free-form prompts.
- Make every material convention an explicit profile field.
- Fail closed on unknown keys, ambiguous inputs, unsupported methods, and out-of-range dates.
- Add a normal fixture, a boundary fixture, and a negative fixture for an engine change.
- Preserve unknown-time sensitivity instead of inserting a conventional hour.
- Keep randomized outcomes reproducible and domain-separated; never use `Math.random()`.
- Keep `calculation_fact`, `traditional_rule`, `interpretation`, and `unresolved` distinct.
- Update method reference, schemas, changelog, scope, and benchmark evidence when the public contract changes.

## Adding a method

A new method must progress through these states:

1. `planned`: scope and missing engine are explicit; calls fail closed.
2. `preview`: executable, schema-defined, reproducible, and visibly incomplete.
3. `stable`: passes the method-specific release gates in `BENCHMARK.md`, including a clean archive check and license review.

Do not register a method as stable because a language model can describe it. A deterministic engine or a clearly recorded physical/manual input path is required for calculation facts.

## Clean-room and copyright rules

- Do not copy code, prompts, data tables, cases, translations, or knowledge files from repositories without a compatible license.
- Do not import AGPL or noncommercial materials into this MIT package without an explicit project-wide licensing decision.
- Short method names and public interface behavior may be compared; implementation and prose must be independently written.
- Do not add modern copyrighted card-guide text or unverified classical quotations.

## Pull-request checklist

- `npm run check` passes.
- New behavior has tests and stable error codes.
- No real personal data appears in fixtures, logs, screenshots, or commits.
- No source file adds an undeclared network call.
- Dependencies and licenses are updated.
- The Skill still works with relative paths from a clean extracted archive.
- Claims remain engineering claims, not predictive-accuracy claims.
