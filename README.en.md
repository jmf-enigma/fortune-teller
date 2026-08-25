# Fortune Teller

## Complex charts, explained like a real conversation

[![CI](https://github.com/jmf-enigma/fortune-teller/actions/workflows/ci.yml/badge.svg)](https://github.com/jmf-enigma/fortune-teller/actions/workflows/ci.yml)

[中文](README.md) · [Full capabilities](docs/SCOPE.md) · [Accuracy boundaries](references/accuracy-evaluation.md)

Fortune Teller is a local divination Skill for Codex and other Agents.

You do not need to understand Ten Gods, palaces, stars, aspects, or hexagram theory. Tell it what you want to understand, answer a few guided questions, and get a plain-language reading first: your main life themes, where to focus in career and money, what the current phase emphasizes, or what opportunities and risks surround a decision.

> **You bring the question. Fortune Teller handles the chart, checks, and translation.**

~~~text
Use $fortune-teller for a BaZi life overview. Focus on career and money.
~~~

Current version: `0.6.0` · [GitHub repository](https://github.com/jmf-enigma/fortune-teller)

## What can it help with?

| Life overview | One area in depth | A current question |
|---|---|---|
| Explore major life themes, career, money, relationships, and important phases | Focus only on career, finances, relationships, or wellbeing rhythm | Think through a choice, opportunity, relationship development, or immediate concern |
| Best suited to BaZi, Zi Wei, and Western natal astrology | Keeps the reading centered on what matters to you | Best suited to Tarot, I Ching three-coin, or Meihua two-number |

Try asking:

~~~text
Give me a life overview, with extra attention to career and money.
Should I change jobs now? Help me clarify the question first.
What is the main career focus of the coming year? Please lead with plain language.
What should I pay attention to in this long-term relationship?
~~~

## A simple guided experience

### 1. Start with what matters

You do not need to select a school or complete a wall of settings. Begin with a life overview, one life area, or a current situation.

### 2. Answer only the necessary questions

Birth-chart readings usually need a birth date, time, and place. A phase reading also asks for the date you want to examine. If the birth time is unknown, say so: Fortune Teller narrows the reading instead of guessing.

### 3. Confirm before calculation

You see the information and reading scope before anything is calculated. Edit a mistake, cancel, or continue.

### 4. Read the answer on the first screen

Results are organized around your concerns. Technical terminology stays behind the optional “Professional basis” view.

~~~text
Career
Your clearest career theme is turning ideas into work, solutions, or deliverables
that other people can actually evaluate.

Money
The financial focus is converting results into practical return while making
ownership, allocation, and responsibility explicit in collaborations.

Current phase
The present emphasis is on finishing work, taking responsibility, and building
stronger methods. This is a phase focus, not a guaranteed promotion or pay rise.
~~~

This is an example of the presentation style, not a fixed reading for everyone.

## More than generic generated advice

- **Calculation before interpretation.** Pinned local engines calculate BaZi, Zi Wei, and Western natal charts. Tarot and I Ching preserve the actual draw or cast. The language model does not improvise a chart.
- **Answers before jargon.** Ordinary readings lead with career, money, relationships, and the current phase. Ten Gods, stars, palaces, aspects, and source rules are available only when requested.
- **Less data means fewer claims.** Unknown birth time, missing coordinates, school disagreement, or incomplete rules narrow the answer instead of producing fake certainty.
- **One question keeps one result.** Follow-ups reuse the same chart, draw, or cast. A changed question or key input starts an explicit new round.
- **The reasoning can be inspected.** The professional view shows supporting chart facts, counter-evidence, revision conditions, and real-world checks.

## Supported methods

| Method | Best suited to |
|---|---|
| **BaZi** | Life overview, career and study, money and resources, long-term relationships, and natal–decadal–yearly phase changes |
| **Zi Wei Dou Shu** | Life themes, career, money, relationships, wellbeing rhythm, and natal–decadal–yearly changes |
| **Western natal astrology** | Identity and life themes, career, relationships, resources, and other natal topics |
| **Tarot** | Current questions, choices, support, risks, and practical next steps |
| **I Ching three-coin** | A current situation, its change process, and action reflection |
| **Meihua two-number** | Body/use, mutual hexagram, and change under one fixed two-number method |

The current BaZi release accepts birth instants whose actual UTC offset is +08:00. Western astrology currently covers natal charts, not transits. Meihua two-number remains a preview. Liu Yao, Qi Men, and Vedic astrology are not yet available. See [Full capabilities](docs/SCOPE.md) for the complete boundaries.

## Accuracy: what it works hard to improve

Fortune Teller is designed to reduce real, correctable errors: calculating the wrong chart, mixing time conventions, guessing when data is missing, cherry-picking evidence, or turning a traditional label into a promised event.

It does not establish scientifically validated predictive accuracy, and it does not promise a promotion, profit, marriage, breakup, or any other specific outcome. Here, “more accurate” first means:

- the chart or cast follows its declared rules;
- the reading traces back to this chart, draw, or cast;
- disagreement and uncertainty remain visible;
- the answer is concrete without presenting tradition as inevitable fact.

For a serious test, record the claim, time window, and supporting and contradicting criteria before observing the outcome. See [Accuracy evaluation](references/accuracy-evaluation.md).

## Privacy first

- Charts, casts, and draws run locally; project source code does not initiate network requests.
- Inputs are not written to files by default.
- Installing dependencies contacts npm, and the terminal or host may retain screen history.
- Never commit real birth data, precise locations, private questions, or replay credentials to source, issues, or public screenshots.

## Get started

### Already installed as an Agent Skill

Type:

~~~text
$fortune-teller Give me a BaZi life overview. Ask for the details step by step and focus on career and money.
~~~

### Run locally

Requires Node.js 20 or newer. From the project folder:

~~~bash
npm ci --ignore-scripts
npm start
~~~

npm start opens the Chinese guided interface.

### Install as a Codex Skill

~~~bash
cd /absolute/path/to/fortune-teller
npm ci --ignore-scripts
ln -s /absolute/path/to/fortune-teller ~/.codex/skills/fortune-teller
~~~

Refresh the host and invoke $fortune-teller. The archive does not include node_modules, so locked dependencies must be installed in the extracted directory before first use. An Agent should not perform that networked installation without permission.

## Is a standard model enough?

Yes. A standard model can collect the information, run the local calculation, produce a grounded one-system reading, and focus on career, money, relationships, or a current question.

Pro is more useful for long multi-factor synthesis, cross-system comparison, school-disagreement audits, and line-by-line source review. Both use the same local chart. Pro cannot change the calculation or make an unvalidated traditional prediction inherently more accurate. See [Model tiers](references/model-tiers.md).

<details>
<summary><strong>For practitioners and developers</strong></summary>

### Professional coverage

- BaZi evaluates season, roots, visible stems, pattern success or failure, matching rescue, and phase activation separately instead of voting by element count.
- Zi Wei preserves focus palaces, trines, opposites, and pattern boundaries instead of voting by star count.
- Every system can retain supporting evidence, counter-evidence, revision conditions, and real-world checks.

Continue with [Professional coverage](docs/PROFESSIONAL_COVERAGE.md), [Deep-reading protocol](references/professional-reading.md), [Evidence contract](references/evidence-contract.md), [Architecture](docs/ARCHITECTURE.md), or the [Competitor audit](docs/COMPETITOR_AUDIT.md).

### Common commands

~~~bash
npm run methods
npm run doctor
npm run check
npm run package:skill
~~~

See [Interaction](references/interaction.md) and [Architecture](docs/ARCHITECTURE.md) for structured calculation, adjudication, and rendering. Release evidence is in [RELEASE_AUDIT.md](docs/RELEASE_AUDIT.md).

</details>

## Safety boundaries

Use Fortune Teller as a traditional reflection tool, not to diagnose illness, determine pregnancy, predict death, establish guilt, judge fidelity, direct investment or legal action, or validate paranoia. Important decisions should still rely on real evidence and appropriate professional advice.

See [SECURITY.md](SECURITY.md) and [Safety boundaries](references/safety.md).

## License

Project-authored code is available under the [MIT License](LICENSE). Dependency and source attribution is in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
