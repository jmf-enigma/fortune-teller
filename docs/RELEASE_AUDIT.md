# Release Audit — 0.2.0

Audit date: 2026-08-23

## Outcome

The current source tree and a cleanly rebuilt archive pass the local engineering gates for the declared `0.2.0` scope. Final local engineering sign-off is complete for this candidate, subject to the no-edit rule below and the hosted GitHub Actions result for the released commit.

These checks support reproducible calculation, explicit input/profile handling, local execution, package integrity, rule/fact traceability, and the bundled interaction workflow. They do not establish that any divination tradition predicts real-world outcomes.

The local verification environment is macOS with Node.js 24.9.0. GitHub Actions reruns `npm run check` on Node.js 20, 22, and 24 and builds the Skill archive on Node.js 20. The Actions page for the released commit is authoritative for hosted status.

## Reproducible gates

| Gate | Result |
|---|---|
| `npm test` | Passed: 131 tests, 0 failed |
| `npm run doctor` | Passed: runtime, dependency loading, deterministic fixture, and calendar engine |
| `npm run verify` | Passed after the current audit version was recorded |
| Offline smoke | Passed: every shipped engine completed while standard Node network APIs were trapped in-process; this is not an OS network namespace |
| JavaScript syntax scan | Passed for every `.mjs` file under `src/`, `scripts/`, and `test/` |
| Official Skill validator, source tree | Passed: `Skill is valid!` |
| Production dependency audit | Passed: `npm audit --omit=dev` found 0 vulnerabilities in the locked production graph |
| npm package preview | Passed: `npm pack --dry-run --json` inventoried the publishable files |
| Source/rule registry | Passed: 10 unique narrow source records and 26 unique rules; Zi Wei has six rules and each other shipped system has four |
| Clean archive install | Passed: the exact 72-member archive matched `release-files.json`, and its lockfile installed 9 packages in a fresh empty directory |
| Full check from clean extracted archive | Passed: 131 tests, doctor, and release verification completed from the clean extracted archive |
| Official Skill validator, clean extracted archive | Passed: `Skill is valid!` from the clean extracted archive |

The archive does not bundle `node_modules`. Installing locked dependencies contacts the npm registry. Calculations after installation do not require a remote calculation service. The automated offline gate combines a source scan with in-process network-API traps and does not claim an operating-system-level network block.

## Independent cold-review findings resolved

Separate read-only reviews of the release candidate found issues that were fixed and converted into regression tests:

- BaZi and Zi Wei mean/apparent-solar overrides now fail closed until calendar-day and local-time clocks can be represented safely; BaZi also requires every admitted actual instant to have UTC offset `+08:00`.
- Deep/audit interpretations need at least two distinct material fact roots. Leaf aliases, parent containers, relation-only substitutions, unrelated paths, and explanatory metadata cannot pad the count.
- Unknown-time rules check the actual `facts.mode` value, not only the existence of its path.
- `CALENDAR_DAY_PROFILE_QUALIFIED` must survive into the reading acknowledgement and forces qualified, profile-specific Zi Wei claims.
- The terminal wizard asks for optional Western coordinates, exposes audited motion state, discloses overseas Zi Wei's civil-day convention before confirmation, resolves both sides of a DST overlap explicitly, and requires correction of nonexistent DST-gap times.
- The ordinary flow starts from the user's goal, keeps profile IDs, warning codes, candidate counts, hashes, and raw JSON behind an explicit technical-record action, and validates result-first reading payloads before rendering any partial answer.
- Exact-time Zi Wei charts can resolve an explicit target date to calculation-only natal, decadal, and yearly facts. The phase-reading rule requires material facts from all three layers; unknown-time, pre-birth, uncovered, and out-of-range requests fail closed.
- Tarot and I Ching three-coin questions remain bound to one frozen outcome. Same-question follow-ups reuse it; a materially new question requires an explicit new draw or cast, and a changed calculation invalidates the old reading.
- Standard, deep, and audit readings require structured follow-up actions from a controlled input vocabulary. Multi-system actions name `target_system`; a fresh Tarot or I Ching label must agree with a Tarot/I Ching target, a real fresh input, `new_reading`, and no frozen-calculation reuse.
- Every interpretation must cite at least one rule that is actually applicable to its system, scope, facts, required values, and sources. The summary is bound to the first claim statement; an empty or floating headline, a merely named but inapplicable rule, or a broad fact container fails validation.
- Ordinary visible fields reject internal profile IDs, raw warning details and codes, trace IDs, contextual versions, hashes, raw candidate/probe accounting, and audit-field names. Explicitly unresolved text cannot conceal an affirmative future result, and unqualified future-outcome assertions fail a conservative lexical gate. Rendering performs a second presentation check before writing any partial result.

Cold review is supporting engineering evidence, not external domain-expert certification or proof of semantic correctness.

## Bounded comparison conclusion

Within its smaller supported scope, this release has locally verified strengths in fail-closed calendar/time handling, full-day unknown-time sensitivity, deterministic local calculation, replayable randomness, one cross-system envelope, source/rule/fact applicability checks, material-warning preservation, result-first progressive disclosure, frozen question/draw state, and a continuous Chinese terminal flow.

This is not an overall-superiority or predictive-accuracy claim. Larger projects lead in method count, specialist corpora, charts, MCP/API surfaces, accumulated tests, users, and maintenance history. Competitor test counts and feature totals in the ecosystem audit remain self-reported unless reproduced here.

## Known limits

- Birth time is either exact or unknown/full-day sensitivity. Bounded ranges such as “06:00–10:00” are not native inputs, and birth-time rectification is not implemented.
- Direct lunar-date input is not implemented.
- BaZi supports civil-time profiles only and fails closed outside actual UTC+08:00. Strength, pattern, useful-god, luck-cycle, and event-timing engines are not included.
- Zi Wei fixes the calendar day to `birthplace-civil`; use outside UTC+08:00 is explicitly profile-qualified. With an exact birth time and explicit `target_date`, decadal/yearly calculation facts and a bounded natal–decadal–yearly phase-theme reading are available. Solar-time overrides, flow-month/day/hour, auspicious timing, exact event timing, and guaranteed event prediction remain unavailable.
- Western support is tropical whole-sign natal only; broader house systems, sidereal profiles, nodes, Chiron, transits, synastry, electional work, and traditional dignity scoring are not included.
- Meihua remains a two-number preview. Liu Yao, Qi Men, and Vedic astrology remain planned and fail closed.
- The registry contains 10 narrow source records and 26 rules, not a comprehensive classical corpus. Historical sources establish terminology provenance, not empirical predictive validity.
- The validator checks machine-readable structure, applicability, sources, warning acknowledgement, and a conservative lexical floor. It is not a semantic proof, quotation checker, or substitute for expert narrative review.
- No chart graphic, MCP/HTTP service, external-user study, or independent domain-expert certification is included.
- Native JSON parsing follows JavaScript's last-member behavior for repeated object keys; request producers should emit unique keys with a serializer.
- Pathological inputs nested thousands of levels deep can reach the JavaScript recursion limit and are outside every public schema.

## Sign-off rule

Any edit to code, lockfiles, schemas, Skill routing, safety/professional rules, or packaged resources after the clean-archive rows pass invalidates final sign-off. Rebuild the archive, install it in a new empty directory, run the full checks and official Skill validator there, and regenerate the checksum before release.
