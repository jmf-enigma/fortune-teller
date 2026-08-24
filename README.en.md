# Fortune Teller

[![CI](https://github.com/jmf-enigma/fortune-teller/actions/workflows/ci.yml/badge.svg)](https://github.com/jmf-enigma/fortune-teller/actions/workflows/ci.yml)

[中文](README.md) · [Scope](docs/SCOPE.md) · [Professional reading protocol](references/professional-reading.md) · [Benchmark](BENCHMARK.md) · [Release audit](docs/RELEASE_AUDIT.md)

Fortune Teller is a result-first Agent Skill for a deliberately limited set of Chinese and Western divination systems. It does not compete by listing the most methods. It first asks whether the user wants a life overview, one life area, or help with a current question; calculations stay local, and the useful answer comes before technical machinery.

Pinned local programs calculate charts and casts; the conversational model handles intake, explanation, comparison, and audit. The project makes no claim that divination or astrology has scientifically validated predictive power.

Current release: `0.2.0`. Public repository: [jmf-enigma/fortune-teller](https://github.com/jmf-enigma/fortune-teller).

## Results before internal terminology

Ordinary users do not need to understand calculation conventions or internal audit records. A birth reading starts with the main themes, support, constraint, selected life area, and—only when explicitly calculated—a target-date phase. A current-question reading starts with a conditional answer, the present tension, support and risk, and one reversible real-world action. Plain-language reasoning remains available under “why this follows”; internal fields stay in the separately opened technical record.

## What “accurate” means here

The project does not compress unrelated questions into one “accuracy” score. A professional reading separates these axes when relevant:

- **Calculation status:** whether the declared time, calendar, and algorithm profile was calculated inside its supported boundary.
- **Input sensitivity:** what remains stable and what changes when birth time, zone, location, or school profile changes.
- **Interpretation status:** whether a statement is a calculation fact, traditional rule, bounded model interpretation, or unresolved.
- **Source coverage:** whether the exact rule has a narrow registered source and what that source actually supports.
- **External review:** whether the implementation or claim has only fixture-level engineering review or independent domain-expert review.

This makes it possible to inspect calculation consistency, fact/rule traceability, and visible uncertainty separately. It does not prove that a traditional prediction is empirically true.

When a user wants to test the reading against past events, the Skill freezes a few specific hypotheses before collecting a defined feedback window, then keeps matches, misses, and unclear cases. It does not retune birth time, switch rules, redraw, or broaden the original wording after hearing the biography. This is more honest than adaptive calibration, but it still does not establish scientific predictive accuracy.

## Supported scope

| System | Status | Implemented boundary and depth |
|---|---|---|
| BaZi | stable with calendar-reference restriction | Gregorian input, IANA zones, midnight/Zi-start day boundaries, and a real-civil-day unknown-time scan; emits day master, month context, separate visible-stem/branch/hidden-stem counts, Ten-God occurrences, and explicit combinations/clashes. It proceeds **only when every admitted birth instant has an actual UTC offset of `+08:00`**; other offsets fail closed and must not be hand-converted. Strength, pattern, useful-god, luck-cycle, and event-timing judgments are not implemented |
| Zi Wei Dou Shu | qualified | Pinned `iztro` default and Zhongzhou profiles, twelve palaces, three-directions-and-four-alignments structural indices, and mutagen locations. With an exact birth time and user-supplied `target_date`, it also returns natal–decadal–yearly phase structure. Unknown time scans real local instants, never synthesizes one chart, and disables the target-date phase view. Overseas use retains the `birthplace-civil` school limitation; solar-time overrides fail closed |
| Western natal astrology | stable-whole-sign | Tropical planets, Ascendant/MC, whole-sign houses, five aspects, unweighted element/modality counts, and tight-aspect summaries. Motion direction is accepted only when forward/backward `6/12/24`-hour windows agree; otherwise it is uncertain. Angles and houses are omitted without birth time |
| Tarot | stable | Local 78-card names and original short prompts, five spreads, secure random, replay seed, and manual cards |
| I Ching | stable | Per-coin transcript, six bottom-up lines, 64-hexagram King Wen mapping, changing hexagram, and replay seed |
| Meihua two-number | preview | Deterministic two-number cast and explicit moving line; no body/use, five-element, or timing engine |
| Liu Yao, Qi Men, Vedic | planned | Registered but intentionally fail closed because no engine is shipped |

“Stable” is an engineering status within the declared scope. “Qualified” means that a material profile condition must remain visible. Neither status asserts predictive validity. See [docs/SCOPE.md](docs/SCOPE.md) for the complete boundary.

## Professional depth

Release `0.2.0` adds a narrow, auditable knowledge contract:

- [10 source records](src/data/source-registry.mjs) cover pinned implementations, limited historical terminology, and the bounded Zi Wei phase-analysis order;
- [26 machine-readable rules](src/data/rule-registry.mjs) declare system, claim scope, minimum fact references, source bundles, and permitted epistemic states;
- `validate-reading` checks rule applicability to the cited facts and claim scope, rather than merely checking that an ID exists, and verifies registered sources;
- every interpretive claim must cite at least one applicable registered rule; without rule coverage it must remain a calculation fact or unresolved rather than becoming model-authored expertise;
- `standard`, `deep`, and `audit` use structured continuation actions so the validator can distinguish reuse from a new reading and reject backstage fields in ordinary result text;
- `deep` and `audit` require an uncertainty summary, reasoning summaries, alternative readings, and structured next steps;
- every traditional or interpretive `deep`/`audit` claim must cite at least two distinct, materially related chart-fact roots; multiple leaf fields under one fact object still count as one root, and a one-root observation belongs in `standard` as preliminary, not in a deep synthesis;
- practical reflections must be small, observable, reversible, and independently sensible if the traditional premise is wrong.

The four reading levels are:

- `quick`: a direct answer, one or two supporting themes, one material limitation, and next actions;
- `standard`: one system and one topic, with three to five result-first material claims;
- `deep`: result-first synthesis of internal structure, support and constraints, counter-readings, and sensitivity;
- `audit`: complete fact/rule/source mappings, candidate coverage, conflict matrices, and a machine-readable appendix.

A source marked `verified` means only that the project checked the edition or implementation record and its declared scope. **It does not validate divinatory predictions or authorize claims beyond that scope.** The validator catches structural errors and a conservative set of explicit unsafe phrases, but it is not a semantic theorem prover or domain-expert certification. A `deep` or `audit` pass still requires narrative review. See [references/professional-reading.md](references/professional-reading.md) and [references/evidence-contract.md](references/evidence-contract.md).

## Quick start

Requires Node.js 20 or newer. All three birth-chart engines fail closed outside their release-tested range of `1900-01-01` through `2100-12-31`.

```bash
npm ci --ignore-scripts
npm run check
npm start
```

`npm start` opens a Chinese guided interface; users do not need to know JSON or profile IDs. It:

1. asks whether the user wants a life overview, one life area, a current question, or a specific method;
2. asks only for fields needed by the routed system and validates them with in-place retry;
3. shows a confirmation screen before start, edit, cancel, or advanced-profile selection;
4. displays a progress notice before an unknown-time scan;
5. presents a concise result start and hides input impact and technical records behind “why this follows”;
6. freezes the result for follow-ups and explicitly confirms a new draw/cast when the user changes questions;
7. supports edit-and-recalculate, a new session, exit, and `q` from any input prompt;
8. gives a second privacy warning before printing full audit JSON that may contain birth data or a private question.

For Western charts with a known time, the wizard asks for optional coordinates up front. A repeated DST clock time exposes the earlier and later real UTC instants; a nonexistent gap time can only be corrected. Overseas Zi Wei input shows the `birthplace-civil` calendar-day convention and its school limitation before calculation is confirmed.

The terminal wizard fixes local calculation facts rather than improvising destiny prose. In an Agent, `$fortune-teller` turns the same frozen result into an answer-first reading. It does not recalculate or redraw for follow-ups unless the user changes a key input or explicitly starts a new question.

## Structured calculation

Discover the live contract before constructing requests:

```bash
node scripts/fortune-teller.mjs methods --json
```

Inspect the exact registered sources and rules for one system when preparing a sourced reading:

```bash
node scripts/fortune-teller.mjs sources --system bazi --pretty
```

Example request (save it as the git-ignored `request.local.json`):

```json
{
  "system": "bazi",
  "input": {
    "date": "2000-08-16",
    "time": "04:00",
    "timezone": "Asia/Shanghai"
  },
  "profile": "bazi-civil-midnight-consistent-v1"
}
```

```bash
node scripts/fortune-teller.mjs calculate --input request.local.json --pretty
```

An output path is create-only and never overwrites an existing file. BaZi requests must preserve the birthplace's original civil clock reading; do not hand-convert a birth time to satisfy the `+08:00` restriction.

After an Agent creates a structured reading, validate it before rendering the ordinary result:

```bash
node scripts/fortune-teller.mjs validate-reading --input reading.local.json --pretty
node scripts/fortune-teller.mjs render-reading --input reading.local.json
```

The second command shows only the conclusion, topic-grouped points, practical steps, material limitations, and available follow-ups. It omits profile IDs, warning codes, fact IDs, and hashes.

### Random replay

A fresh draw returns only a seed commitment by default. Set `reveal_seed:true` only when the user explicitly wants replay access:

```json
{
  "system": "tarot",
  "input": {
    "question": "How can I compare these two options more clearly?",
    "spread": "decision",
    "reveal_seed": true
  }
}
```

The tool does not persist the returned seed. Supplying it again replays the draw. Compare replays with `facts_hash`; a fresh draw and replay can have different full `reproducibility_hash` values because their random provenance differs.

## Agent Skill installation

Copy or symlink the complete folder into the host's skills directory. For a common Codex setup:

```bash
cd /absolute/path/to/fortune-teller
npm ci --ignore-scripts
ln -s /absolute/path/to/fortune-teller ~/.codex/skills/fortune-teller
```

The archive does not bundle `node_modules`; install the locked dependencies in the extracted directory before first use. An agent must not perform that networked installation without permission.

Then invoke `$fortune-teller`. The portable core is `SKILL.md`, relative references, the local CLI, and JSON schemas; `agents/openai.yaml` is optional Codex UI metadata.

## Standard model vs Pro

A standard/general model is sufficient for chart calculation, one-system standard readings, one Zi Wei target-date phase, a Tarot current-question reading, engine-aggregated time sensitivity, and a small set of traceable evidence cards. It can also complete a focused `deep` reading when the interactions are limited and the requested rules and sources are actually covered. Standard mode is complete, not an upgrade teaser.

A Pro model or larger reasoning budget is recommended for long multi-factor synthesis, multi-system or multi-profile conflict audits, exhaustive source-coverage reports, and an adversarial second pass. Both tiers use identical local facts. Pro cannot change a chart, validate a traditional prediction, **or repair a missing rule, source, or specialist calculation module**. See [references/model-tiers.md](references/model-tiers.md).

## Reproducibility and evidence

- `facts_hash` commits to engine version, system, profile, and calculated or recorded facts.
- `reproducibility_hash` commits to the wider envelope except its generation timestamp, including normalized input, warnings, sensitivity, provenance, and Node/ICU/tzdb runtime.
- `meta.time_runtime` records the environment that can affect historical timezone conversion.
- `profile` preserves material conventions such as day boundary, calendar-day basis, house system, and reversal rules.
- `sensitivity` separates stable, changing, and unavailable fields when input is incomplete.

The interpretation layer uses `calculation_fact`, `traditional_rule`, `interpretation`, and `unresolved`. `validate-reading` recomputes both hashes and checks system/profile binding, fact IDs, rule path/value applicability, registered sources, material-warning acknowledgement, candidate denominators, and prohibited probability/voting fields. It also sets a conservative lexical floor against explicit fatalism, all-in financial advice, stopping treatment, and similar unsafe language; it cannot understand every implication of free prose.

## Safety and privacy

- The source engines contain no network calls; dependency installation still accesses the npm registry.
- The tool does not persist user input by default. Do not commit real birth records, precise locations, private questions, or replay seeds.
- Do not use it to diagnose health conditions, determine pregnancy, predict death, establish guilt, direct legal or financial action, determine another person's fidelity, or validate paranoia.
- A seed is a replay credential, not a cryptographic secret or a measure of divinatory validity.
- The source registry stores narrow metadata and links; it does not copy historical texts or competitor knowledge bases.

See [SECURITY.md](SECURITY.md), [references/safety.md](references/safety.md), and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Development

```bash
npm test
npm run doctor
npm run verify
npm run check
npm run package:skill
```

GitHub Actions runs the checks on Node 20, 22, and 24 and inspects the npm package and Skill archive. A release candidate should also be extracted into a clean temporary directory, reinstall locked dependencies, and pass `npm run check` there.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/RELEASE_AUDIT.md](docs/RELEASE_AUDIT.md), [CONTRIBUTING.md](CONTRIBUTING.md), and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Comparison boundary

Fortune Teller does not compete on method count. Within its smaller supported core, it aims to make calendar/time failures explicit, preserve unknown-time sensitivity, replay random casts, standardize envelopes, validate rule applicability, trace narrow sources, require professional depth contracts, and keep the Chinese interaction continuous.

It still lacks the breadth, full historical corpora, chart graphics, MCP/HTTP APIs, external user base, and independent domain-expert review of larger projects. BaZi strength/useful-god/luck cycles and broader Western house/timing techniques remain unavailable. Zi Wei currently stops at bounded natal–decadal–yearly phase themes: it does not implement flow-month/day/hour timing or guaranteed events. The project therefore does not claim to be universally “best” or more predictively accurate. See [docs/COMPETITOR_AUDIT.md](docs/COMPETITOR_AUDIT.md) and [BENCHMARK.md](BENCHMARK.md) for the evidence boundary.

## License

Project-authored code is [MIT licensed](LICENSE). Production dependencies use MIT, ISC, and Apache-2.0 licenses; attribution is in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
