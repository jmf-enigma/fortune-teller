# Release Audit — 0.4.0

Audit date: 2026-08-24

## Outcome

Version `0.4.0` passed the source-tree and clean-extracted-archive release gates. The release adds bounded BaZi professional adjudication and exact luck-cycle structure, while hardening the experimental Zi Wei candidate evaluator so that caller-authored formations or evidence cannot masquerade as verified rules. The supported method count is unchanged.

This is a claim about calculation consistency, registered-rule fidelity, evidence binding, and result-presentation integrity within a deliberately narrow scope. It is not evidence that divination predicts real-world outcomes, a professional-practitioner certification, or permission to infer concrete events from a structural pattern. Internal hashes remain backstage change-detection fields only.

The local verification environment is macOS with Node.js 24.9.0. GitHub Actions reruns `npm run check` on Node.js 20, 22, and 24 and builds the Skill archive on Node.js 20; the hosted result for the released commit remains authoritative for CI status.

## Reproducible gates

| Gate | Result |
|---|---|
| `npm test` | Pass: 325/325 in the source tree and 325/325 in a new clean extracted archive |
| BaZi adjudication/luck fixtures | Pass: 35/35, including fabricated inputs, unreachable routes, boundary dates, and structural-linkage wording |
| Zi Wei adjudication/phase fixtures | Pass: 33/33, including arbitrary candidates, wrong paths, fake refs/hashes, cross-topic joins, and cross-layer fact reuse |
| `npm run doctor` | Pass in the source tree and clean archive on Node.js 24.9.0 |
| `npm run verify` | Pass in the source tree and clean archive |
| Offline smoke | Pass inside both complete test runs; it traps standard Node network APIs in-process and is not an OS network namespace |
| JavaScript syntax and whitespace | Pass for the new adjudicators, rule packs, public CLI/release scripts, and final source diff |
| Source/rule/profile registry | Pass: 14 source records, 31 rules, and 6 interpretation profiles; every profile keeps `professional_label_allowed: false` |
| Skill archive manifest | Pass: exactly 99 unique sorted files; controlled-tree paths equal the manifest |
| Clean archive install and full check | Pass after `npm ci --ignore-scripts`; `npm pack --dry-run --json` succeeds |
| Release archive checksum | Pass: generated after the final build and verified against `fortune-teller-skill.zip` |

The archive does not bundle `node_modules`. Installing locked dependencies contacts the npm registry. After installation, the shipped calculation code does not require a remote calculation service.

## Important findings closed in 0.4.0

### BaZi

- Known-time users can explicitly opt into the traditional direction parameter. The engine calculates an exact onset instant, 24 complete decadal intervals, a LiChun-bounded target year, and named natal/decadal/year interactions. The parameter is never inferred from identity.
- Month-command transparency no longer establishes a pattern. One complete registered compound route is required. Only a closed damage route may produce `破格`, and only its own paired closed rescue may produce `救应`; weight-, position-, control-, and transformation-dependent routes remain `screening_only`.
- Three previously unreachable formation routes now use a route-level “root plus visible support” carrying condition instead of requiring a global strength state that their own visible output predicate made impossible.
- Caller-supplied climate, passage, source-status, fact-ID, direction, or period objects cannot affect the result. Only facts replayed from the supplied calculation envelope participate. 调候 and 通关 therefore remain unresolved until fixed, replayable rule facts are installed.
- A period Ten God is only a possible input to a compound route. The current `joint_activation` compatibility field reports three-layer structural linkage only; it does not rerun formation/damage/rescue and cannot be described as a completed pattern activation or event.
- Broad directions such as 印星 are expanded before comparison. Different suggestions are not automatically a conflict; only an explicitly registered incompatible direction can create one.
- Technical and ordinary result states now agree for `受损`, and the guided interface presents the mechanical conclusion and plain explanation before pillars and audit detail.
- General-reading `R-BZ-005/006` remain protective and unresolved-only until a dedicated typed binding can independently reconstruct the mechanical adjudication.

### Zi Wei

- The public closed reading path remains exactly `R-ZW-007/008/009` for five topics. It still requires complete natal four-palace axes, complete registered transformations where applicable, and bounded natal → decadal → yearly facts; it does not name concrete events.
- The separately exported generic evaluator now accepts only three immutable structural candidate IDs. Candidate labels, predicates, evidence status, and paths cannot be authored by the caller; they are rederived from a replay-verified calculation.
- Phase evaluation binds every layer to the real calculation hash, exact same-topic structures, and distinct natal/decadal/yearly facts. Fake refs, missing four-palace structure, wrong-period facts, cross-topic joins, and reuse of one fact across layers fail closed to `unresolved` or `insufficient`.
- Those three generic candidates are structural prerequisites, not a corpus of traditional named formations. They are not wired into the ordinary result renderer and cannot be marketed as full Zi Wei pattern recognition.

### Result integrity and interaction

- `user_focus` is derived from all unique claim topics in stable claim order; `summary` remains the first validated claim headline.
- Unsupported Zi Wei topics can degrade only the affected claim to `rule_unavailable` without discarding other supported topics or pretending that birth data is missing.
- Standard and deep result rendering keeps conclusions, plain meaning, revision conditions, and reality checks visible while mechanical criteria and audit metadata remain backstage.
- The specialist audit records which structures were independently learned from focused BaZi and Zi Wei Skills and which fixed weights, retrospective calibration, unverified event maps, and unreviewed pattern corpora were rejected.

## Bounded comparison conclusion

Within its supported paths, `0.4.0` has stronger fail-closed controls than prompt-only workflows that let the model invent candidates, accept caller-declared verification status, collapse different useful-god lenses, or turn a relation graph into an event. It also has a narrower automatically closed scope than specialist projects with large classical corpora or dozens of named patterns.

No inspected project, including this one, supplied sufficient public preregistered, blinded, out-of-sample evidence to establish real-world predictive validity. The defensible claim is fewer correctable calculation, rule-selection, evidence-selection, and narrative-promotion errors—not “proved more accurate” or “best overall.”

## Known limits

- BaZi strength is a qualitative competing-hypothesis screen, not a complete human-command/day, root-distance, weight, position, control, combination/transformation, tomb-storehouse, void, special-pattern, following-pattern, or transformation-pattern state machine.
- A version-verified climate table, replayable passage rules, complete dynamic re-adjudication of compound routes, life-domain/event mapping, and a dedicated typed reading binding remain unavailable.
- Zi Wei closed meaning is limited to five topics and `R-ZW-007/008/009`. The generic evaluator has only three structural candidates and no reviewed traditional named-pattern corpus. Flow-month/day/hour, full flying-transformation routes, broader school techniques, and event timing are unavailable.
- Western support remains tropical whole-sign natal only; Meihua remains a two-number preview; Liu Yao, Qi Men, and Vedic astrology remain planned and fail closed.
- Birth-time rectification, direct lunar-date input, a chart graphic, MCP/HTTP service, independent practitioner review, external-user study, and predictive-validity evidence are not included.
- Passing the validator is not a semantic proof for unrestricted narrative. Outside typed technical bindings and the three closed Zi Wei meaning routes, prose remains `not_machine_verified` and cannot make future-event assertions.

## Sign-off rule

Any later edit to code, lockfiles, schemas, Skill routing, professional rules, release documentation, or packaged resources invalidates this sign-off. Rebuild the archive, install it into a new empty directory, rerun the full checks, and regenerate the checksum.
