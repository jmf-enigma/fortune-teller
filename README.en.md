# Fortune Teller

[![CI](https://github.com/jmf-enigma/fortune-teller/actions/workflows/ci.yml/badge.svg)](https://github.com/jmf-enigma/fortune-teller/actions/workflows/ci.yml)

[中文](README.md) · [Full scope](docs/SCOPE.md) · [Accuracy evaluation](references/accuracy-evaluation.md) · [Benchmark](BENCHMARK.md) · [Release audit](docs/RELEASE_AUDIT.md)

**A local divination Agent Skill that asks for the right information step by step, then leads with plain answers about career, money, relationships, or a current question.**

Users do not need to understand BaZi Ten Gods, Zi Wei palaces, astrological aspects, or internal settings. Fortune Teller asks only for information needed by the chosen method, puts the readable conclusion on the first screen, and leaves terminology, chart evidence, and verification records for later expansion.

Pinned local programs calculate charts, casts, and draws; the conversational model handles intake, explanation, and organization. “Accuracy-first” means reducing correctable errors such as a wrong chart, wrong rule, cherry-picked evidence, or an unresolved question presented as settled. **It does not mean that divination has scientifically validated predictive accuracy.**

Current release: `0.6.0` · Public repository: [jmf-enigma/fortune-teller](https://github.com/jmf-enigma/fortune-teller)

## What using it feels like

### 1. Say what you want to understand

For example:

```text
Use $fortune-teller for a life overview, starting with career, money, and long-term relationships.
Use $fortune-teller to explain my current career and money phase.
Use $fortune-teller to draw Tarot: should I accept this offer now or keep negotiating?
```

### 2. It asks for information one step at a time

- For a birth chart, it asks for date, time, timezone, and only the other details the selected method actually needs.
- In the Chinese guide, Beijing, Shanghai, mainland China, and Hong Kong can be entered directly; other places can use a standard timezone name.
- If the birth time is unknown, say so; the tool explains what remains available and what must stop.
- For a current question, it helps narrow the question without silently replacing it.
- Before calculation, a confirmation screen lets the user edit, cancel, or continue.

The ordinary flow never begins with a wall of parameters or asks the user to choose an internal rule pack.

### 3. The first screen gives the useful answer

In life-overview mode, a birth reading starts with:

1. the main life pattern worth noticing;
2. career and study;
3. money and resources;
4. long-term relationships or wellbeing rhythm;
5. what the current phase emphasizes, when an exact target date was calculated.

Each topic starts with one conclusion and a plain-language explanation, followed by something observable in real life. Stars, palaces, Ten Gods, aspects, source rules, and the full technical record come later. The user sees a short note about missing data only when it materially changes the answer.

## The same result: old-style output vs now

This is a shortened BaZi presentation example, not a fixed judgment for every user.

Old-style output often stops at jargon:

> Wu-Earth day in a Chou month; Eating God visible, Wealth hidden, Rob Wealth visible twice; Month Rob pattern candidate.

Fortune Teller now translates the same evidence into the user's actual concerns first:

> **Career:** The main line is proving value through work people can actually see: finished pieces, solutions, and deliverables. Responsibility and learning support are present, but the output line is clearer.
>
> **Money:** The main line is turning work into income while making ownership, allocation, and responsibility explicit in collaborations. The chart gives weaker support for stable incoming resources, so it does not claim guaranteed earnings.
>
> **Current phase:** The present emphasis is on finishing work while handling responsibility and rules; the target year leans more toward learning, training, and method-building. That describes the focus of the phase, not a guaranteed promotion or income increase.

Users can then expand “why this follows” to see the Ten Gods, locations, phase evidence, and counter-evidence. Ordinary output does not lead with internal states, codes, or validation fields.

## What it currently supports

| System | Good for | Important boundary |
|---|---|---|
| BaZi | Life overview, career/study, money/resources, long-term relationships, and natal–decadal–yearly phase changes for a target date | Strength, pattern, and useful-direction questions remain unresolved when their evidence conflicts. Birth instants currently proceed only when their actual UTC offset is `+08:00` |
| Zi Wei Dou Shu | Overview, career/study, money/resources, long-term relationships, wellbeing rhythm, and natal–decadal–yearly themes | Unknown time never selects a candidate chart. Named patterns remain supplemental evidence, never a vote, score, or event prediction |
| Western natal astrology | Natal themes such as identity, career, relationships, and resources | Missing reliable time or coordinates closes the Ascendant, houses, chart ruler, and house topics. Transits and progressions are not yet included |
| Tarot | Current questions, choices, support, tension, and trade-offs | It does not count “good cards” to choose a winner or promise an outcome. A changed question starts an explicit new draw |
| I Ching three-coin | Current situations, change processes, and action reflection | It does not invent unregistered classical line text or turn a cast into a guaranteed event |
| Meihua two-number | Body/use, mutual hexagram, and before/after change under one fixed two-number method | Preview only; no omen casting, time casting, seasonal strength, or timing claims |
| Liu Yao, Qi Men, Vedic astrology | Not yet available | Registered as planned and fails clearly instead of asking the model to calculate them by hand |

See [docs/SCOPE.md](docs/SCOPE.md) for the complete engineering boundary. “Stable” and “qualified” describe checked software scope, not predictive validity.

## What “accurate” means here

- **Was the chart or cast calculated under the declared rules?** Pinned local engines, explicit time/calendar boundaries, and regression tests handle this layer.
- **Does the interpretation have actual support?** A conclusion must trace back to this chart, draw, or cast and to a limited registered rule.
- **Does the tool guess when information is missing?** Unknown time, missing coordinates, unclosed rules, and school disagreements narrow the answer or leave it unresolved.
- **Will the predicted outcome definitely happen?** Fortune Teller makes no such guarantee and has not established scientific predictive accuracy.

Past events can be discussed as fit or mismatch, but they cannot become a blind test after the fact. A serious evaluation should freeze the claim, observation window, and supporting/contradicting criteria before collecting future records; see [Accuracy evaluation](references/accuracy-evaluation.md).

## Quick start

Requires Node.js 20 or newer. The three birth-chart engines currently mark only `1900-01-01` through `2100-12-31` as release-tested; dates outside that range fail clearly.

```bash
npm ci --ignore-scripts
npm run check
npm start
```

`npm start` opens the Chinese guided interface. It gathers information step by step, shows a confirmation screen, calculates locally, and gives the conclusion first. Follow-ups reuse the same result; only a changed key input or an explicit new question triggers recalculation, a new draw, or a new cast.

## Install as an Agent Skill

Copy or link the complete folder into the host's skills directory. For a common Codex setup:

```bash
cd /absolute/path/to/fortune-teller
npm ci --ignore-scripts
ln -s /absolute/path/to/fortune-teller ~/.codex/skills/fortune-teller
```

The archive does not include `node_modules`; install the locked dependencies in the extracted directory before first use. An Agent should not perform that networked installation without permission. Refresh the host, then invoke `$fortune-teller`.

## Standard model or Pro?

A standard model is enough for local calculation, the guided interface, a one-system standard reading, one phase topic, or a current Tarot/I Ching question. It can also produce a grounded deep reading when the topic is focused and interactions are limited.

Pro or a larger reasoning budget is more useful for long multi-factor synthesis, multi-system disagreement audits, line-by-line source coverage, and an adversarial second pass. Both use the same local chart facts. Pro cannot change a chart or make an unvalidated traditional prediction more accurate. See [Model tiers](references/model-tiers.md).

## Expand the professional basis only when needed

The project does not ask a language model to calculate birth charts by hand or promote one traditional label directly into a life outcome:

- six implemented systems use fixed local calculation or draw/cast paths;
- BaZi keeps season, roots, visible stems, pattern success/failure, and matching rescue separate instead of voting by element count;
- Zi Wei preserves the complete focus/trines/opposite topic structure, while 55 replayable pattern conditions and 32 refusal boundaries remain supplemental evidence only;
- readings preserve supporting factors, counter-evidence, revision conditions, and real-world checks;
- [16 source records](src/data/source-registry.mjs) and [38 machine-readable rules](src/data/rule-registry.mjs) define the currently covered scope.

See [Professional coverage](docs/PROFESSIONAL_COVERAGE.md), the [evidence-bound deep-reading protocol](references/professional-reading.md), [architecture](docs/ARCHITECTURE.md), and [competitor audit](docs/COMPETITOR_AUDIT.md).

<details>
<summary><strong>Developer: structured commands and backstage verification</strong></summary>

Discover the live capabilities first:

```bash
node scripts/fortune-teller.mjs methods --json
```

If no method has been selected, route by question and available data. The order describes fit, not which tradition is more accurate:

```bash
node scripts/fortune-teller.mjs route --json '{"goal":"current_question","question_kind":"decision_action","available_data":{"focused_question":true}}' --pretty
```

Save a request as the git-ignored `request.local.json`:

```json
{
  "system": "bazi",
  "input": {
    "date": "2000-08-16",
    "time": "04:00",
    "timezone": "Asia/Shanghai",
    "chart_sex": "male",
    "target_date": "2026-08-24"
  }
}
```

Calculate and run the system's bounded result layer:

```bash
node scripts/fortune-teller.mjs calculate --input request.local.json --output calculation.local.json --pretty
node scripts/fortune-teller.mjs adjudicate --input calculation.local.json --pretty
```

After an Agent creates a structured reading, bind, validate, and render the ordinary result:

```bash
node scripts/fortune-teller.mjs bind-reading --input reading-draft.local.json --output reading-bound.local.json --pretty
node scripts/fortune-teller.mjs validate-reading --input reading-bound.local.json --pretty
node scripts/fortune-teller.mjs render-reading --input reading-bound.local.json
```

Inspect the registered source scope for one system:

```bash
node scripts/fortune-teller.mjs sources --system bazi --pretty
```

Output files are create-only and never overwrite an existing file. See the [evidence contract](references/evidence-contract.md) and [interaction flow](references/interaction.md) for the full data contract. Backstage verification supports replay, input-convention checks, and rejection of unsupported interpretation; it is not evidence that divination predicts reality.

</details>

<details>
<summary><strong>Developer: tests and release</strong></summary>

```bash
npm test
npm run doctor
npm run verify
npm run check
npm run package:skill
```

GitHub Actions runs checks on Node 20, 22, and 24 and inspects both the npm package and Skill archive. Before release, extract into a clean temporary directory, reinstall locked dependencies, and rerun the complete checks. See the [release audit](docs/RELEASE_AUDIT.md) and [contributing guide](CONTRIBUTING.md).

</details>

## Safety and privacy

- Local source code does not send network requests; dependency installation still contacts the npm registry.
- The tool does not persist inputs by default. Do not commit real birth records, precise locations, private questions, or replay credentials to source, issues, or screenshots.
- Do not use it to diagnose illness, determine pregnancy, predict death, establish guilt, judge fidelity, direct investment or legal action, or validate paranoia.
- Important decisions should continue to rely on real evidence and appropriate professional advice, not one traditional reading.

See [SECURITY.md](SECURITY.md), [Safety boundaries](references/safety.md), and [Third-party notices](THIRD_PARTY_NOTICES.md).

## Comparison boundary

Fortune Teller does not compete on method count. It focuses on making a smaller scope of local calculation, missing-data handling, rule support, plain-language results, and reviewable boundaries work well.

It still lacks the complete historical corpora, chart graphics, broader schools and methods, monthly/daily/hourly timing, external user base, and independent practitioner review of larger projects. Predictive validity has not been established, so the project does not advertise itself as universally “best” or “more accurate than others.” See the [competitor audit](docs/COMPETITOR_AUDIT.md).

## License

Project-authored code is [MIT licensed](LICENSE). Complete attribution for dependencies and fixed-source adaptations is in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
