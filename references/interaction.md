# Interaction and Routing Protocol

Read this reference for intake, method selection, compatibility, uncertain times, or interactive continuation. The goal is to reach the smallest honest reading with the least sensitive data.

## 1. Conversation states

Maintain the following state internally. Do not expose state names unless useful for debugging.

| State | Required outcome | Exit condition |
|---|---|---|
| `DETECT` | Identify the result the user wants: life overview, one life domain, a target-date phase, a current question, an explicit method, comparison, audit, or academic discussion | One intent is primary |
| `ROUTE` | Select one supported method or present a short neutral choice | User has chosen or accepted a route |
| `DISCLOSE` | Explain local use and minimum-data policy before sensitive collection | User understands what is needed |
| `COLLECT` | Gather only material fields | Minimum viable input is present, or reduced mode is selected |
| `CONFIRM` | Show normalized input and material conventions | User confirms, corrects, or accepts explicit uncertainty |
| `COMPUTE` | Produce a structured local result envelope | Engine succeeds or a failure branch is taken |
| `ANSWER` | Give the direct answer and useful themes before any audit or chart dump | User receives a usable first answer |
| `DEEPEN` | Expand one selected topic | Topic is answered with evidence cards |
| `COMPARE` | Place independently validated systems side by side without voting or machine-classifying their relationship | Each original claim and scope remains visible; machine metadata stays `not_compared` |
| `AUDIT` | Expose reproducibility and source trace | Audit package is complete |
| `CLOSE` | Summarize scope and unresolved items | No open request remains |

### Failure states

| Condition | Response |
|---|---|
| Missing but optional field | Use reduced mode and list what was omitted |
| Missing material field | Ask once, or offer a sensitivity path |
| Ambiguous date/time | Show the alternatives that would change the result; do not guess |
| Unsupported method | State its registry status and offer supported methods |
| Engine exception | Preserve error code privately, explain corrective next step, do not improvise facts |
| Source unavailable | Keep the calculated fact; omit or mark the unsupported interpretation |
| Safety boundary | Switch to the safe-response protocol in `safety.md` |

## 2. Neutral routing

If the user names a supported method, use it. Otherwise ask what they want to know before asking them to choose a tradition. Method names are the second screen, not the first.

| Request shape | Suitable route | Interaction |
|---|---|---|
| Life overview or one life domain | BaZi, Zi Wei, or Western natal chart | Explain that these are natal themes, not a year-by-year forecast |
| Life stages or a named target date | Zi Wei only when exact birth time and live `target_date` support are present | Ask for the exact target date; combine emitted natal, decadal, and yearly facts without promising an event |
| One concrete situation | Tarot by default; I Ching within its sourced structural scope; preview Meihua only after disclosure | Ask for one focused question and the actual options/constraints that matter |
| Compatibility | No dedicated compatibility engine | Say it is unavailable; two separate natal readings are not a compatibility calculation |
| Candidate dates | No electional workflow | Explain that date selection is unavailable; do not repurpose a natal, target-date phase, or casting engine as an electional calculator |
| “Use everything” | One system first, comparison second | Explain that systems use different constructs; obtain explicit opt-in |
| Pure history or doctrine | Do not run a reading | Answer academically and distinguish schools and evidence |

Example result-first choice:

> 这次你主要想看：①人生整体与各方面，②事业/财富/感情等一个主题，③当前正在发生的一件事，还是④你已经选好具体方法？

Do not characterize a method as “most accurate,” “scientific,” or “best for predicting.”

## 3. Capability gate

Consult the live registry before promising a result.

- `stable`: normal route.
- `stable-*`: normal route inside the named profile; disclose the scope in confirmation and result.
- `qualified-*`: available only with the named convention and warning carried through the result; never shorten it to an unqualified `stable` claim.
- `preview`: opt-in only. State what is incomplete before collecting data.
- `planned` or `engine: null`: unavailable. Never generate a chart from prose knowledge.

If a requested method is unavailable, say exactly that the local engine is not implemented. Offer a supported method only if it still matches the user's question.

## 4. Minimum viable inputs

### BaZi

Collect:

- Gregorian civil birth date; if the user has only a lunar date, request a separately verified Gregorian conversion because direct lunar input is not implemented;
- exact local birth time or explicit “unknown”; bounded ranges are not a native calculation input;
- the clock's written precision when material (`minute`, `second`, or `unknown`); do not infer second-level provenance from a minute-only record;
- IANA timezone and, for known time, any supplied UTC-offset check;
- the chosen `midnight` or `zi-start` day boundary.

BaZi is available only when every admitted civil instant actually uses UTC+08:00. Confirm the named timezone and actual offset; do not ask for longitude as a solar-time input, because mean/apparent/true-solar BaZi profiles are disabled. If the engine returns `UNSUPPORTED_BAZI_CALENDAR_OFFSET`, explain the limitation and stop rather than hand-shifting the recorded clock.

Do not require a legal name. If a later luck-cycle rule requires a traditional gender/direction parameter, explain the algorithmic purpose and allow the user to select the profile directly rather than inferring it.

### Zi Wei Dou Shu

Collect:

- Gregorian civil date; if the user has only a lunar date, request a separately verified Gregorian conversion because direct lunar input is not implemented;
- exact hour or explicit unknown status;
- clock precision (`minute`, `second`, or `unknown`) as provenance, not an accuracy score;
- timezone/place needed for correct calendar conversion;
- the categorical value and calendar/school profile required by the installed engine.
- an explicit Gregorian `target_date` only when the user requests a current or named phase. Never let a CLI or model silently read today's date into a reproducible calculation.

For an overview or one selected life domain, offer the optional `target_date` during the initial known-time intake so the user does not have to calculate and then edit merely to see the requested phase. Explain that unknown hour usually changes the chart structure. Do not create a single chart when multiple candidates remain, and do not run a target-date phase view without an exact birth time. In ordinary language, confirm that the chart uses the birth place's local calendar day; outside UTC+08:00, explain that other schools can produce a different chart. Keep the internal convention and warning code only in the audit payload. Mean/apparent-solar overrides are disabled and must fail closed rather than shifting the recorded civil clock.

### Western natal astrology

Collect:

- civil date;
- exact local time or explicit “unknown”;
- clock precision (`minute`, `second`, or `unknown`) as input provenance;
- IANA timezone and city/coordinates;
- the fixed tropical, whole-sign profile disclosure; sidereal and other house systems are not supported.

The current tropical whole-sign scope must be disclosed. Without a reliable time, omit Ascendant, Midheaven, houses, and aspects. If a moving body changes sign within the full civil-day scan, report the sampled range rather than choosing one sign.

### Tarot

Collect:

- one focused, non-high-stakes question;
- spread or desired depth;
- draw source: user-supplied physical cards, local secure random, or explicit replay seed.

Do not use birth data unless the user separately requests another method. Do not have the language model select cards and call the result random.

### I Ching three-coin casting

Collect:

- one focused question;
- user-supplied line results, local secure casting, or replay seed;
- any requested interpretive profile supported by the engine.

Record line order and moving lines. A current timestamp is metadata, not permission to silently choose a separate time-based method.

### Meihua preview

Use only after an explicit preview warning. Collect two user-provided positive integers; the fixed profile derives the moving line and rejects any override. Time-based casting is not implemented. Never invent a time rule after seeing an inconvenient result.

## 5. Privacy disclosure

Before collecting birth data, use one natural sentence, for example:

> 我只需要日期、准确时间（不知道可以留空）和 IANA 时区；程序不会主动联网或写文件，也不需要姓名或具体地址。你的终端或对话宿主仍可能保留屏幕/会话记录。

For compatibility:

> 另一方不需要姓名；请只提供你有权分享的出生资料。我不会用命盘断言对方的隐私、忠诚或真实想法。

If local timezone resolution cannot identify a city and remote lookup would help, ask permission before any network request and say what will be sent. Manual IANA timezone or approximate coordinates must remain an offline alternative.

## 6. Confirmation card

Use a compact confirmation card. Include only material fields and plain-language choices; internal IDs do not belong here.

```text
准备按以下资料计算：
- 体系：四柱八字
- 日期：1990-02-03（公历）
- 时间：未知；只会采用全天都不变的部分，不会猜一个时辰
- 地点/时区：Hong Kong / Asia/Hong_Kong
- 换日方式：午夜换日

如果这些信息正确，我就开始；任何不确定项都会保留在结果里。
```

Do not ask for confirmation again after every drill-down unless the user changes input or profile.

At confirmation, support three core actions: start, modify one field, or cancel. The bundled CLI may also expose a clearly labelled advanced-options action without making profile IDs part of the ordinary flow. A correction must preserve unrelated fields. Natural corrections such as “把时间改成 04:30”“时辰不知道”“只看事业”“换成子初换日” should update the frozen session draft rather than restart intake.

## 7. Unknown-time protocol

### Step 1: preserve what is actually known

Represent the native engine input as exact time or unknown. Preserve a user-stated bounded range or broad part of day in the conversation, but the current schema cannot pass it as a calculation field. Do not turn “morning” into a single hour. Resolve daylight-saving folds/gaps explicitly when relevant.

### Step 2: choose a degradation mode

Offer:

- **Reduced**: fastest; excludes time-dependent facts.
- **Full-day scan**: enumerates all supported candidate periods.

Reduced is a presentation route over time-independent facts, not a separate engine profile. Full-day scan is the native uncertainty calculation for the supported birth-chart methods; preserve its actual candidates, samples, and warnings internally.

If the user gives a range, say that native range calculation is not implemented. Offer an exact-time calculation if the record is reliable, full-day sensitivity, or reduced mode. Do not manually approximate a range and present it as engine coverage.

Birth-time rectification is not implemented as a calculation workflow. If the user asks about it, explain the methodological risks below; do not produce a candidate ranking from model memory or present fitted biography as engine output.

For profiles with a 23:00 day boundary, the engine may expose 13 candidates from early Zi through late Zi. Preserve the engine's candidate definitions and denominator internally instead of assuming a fixed set of 12.

### Step 3: classify each conclusion

| Label | Meaning |
|---|---|
| `stable` | Holds for every admitted candidate under the declared profile |
| `partly_stable` | Holds for an explicit subset, reported as `n/N` |
| `boundary_sensitive` | Changes at identified time/profile boundaries |
| `unavailable` | Cannot be supported from the admitted inputs |

Candidate frequency is not a probability distribution. Never write that `8/13` means “62% likely.”

### Step 4: translate effect, not diagnostics

Do not start the ordinary result with a sensitivity ledger. Translate the internal comparison into the effect the user cares about:

```text
出生时间未知，所以本次只解释全天都不变的部分。
事业主题：可看
感情中的时辰相关宫位：暂时不能判断
上升点与宫位：暂时不能判断
```

Interpret stable items first. Put candidate counts, probe counts, `n/N`, transition ranges, and candidate-specific narratives behind “出生时间会改变什么 / 依据与核对”. Do not convert coverage into a probability.

### Rectification discussion guardrails

Rectification fits candidate times to remembered events and is vulnerable to hindsight and selection. Therefore:

- do not initiate it automatically;
- keep the original candidate set visible;
- separate fitted events from any event reserved for a check;
- report ties and near-ties;
- call the result a candidate ranking, not a recovered birth time;
- do not reuse the selected candidate as independent evidence that the tradition predicted those events.

## 8. Result-first answer and continuation

The first result should normally contain:

1. the user's question or selected life domain;
2. a direct, conditional answer in plain language;
3. three to five themes or fewer, with support and constraint rather than isolated symbols;
4. one short “哪里不能硬断” paragraph only when it changes a conclusion;
5. a topic-first continuation menu.

Do not put method/profile/status, warnings, a chart table, keywords, source trace, hashes, or an evidence card before the answer. Those are available after the user asks “为什么这样看”.

The first screen is an answer, not another intake interview. Its headline and every requested career or wealth card must open with a direct declarative sentence that says what the bounded result means. Follow with one sentence explaining why. Do not use a chain of questions or labels such as “先看……”, “待核对线索”, or “前台／背景层” in place of the conclusion. Conditional wording is welcome when it names the condition and the supported implication; empty phrases such as “可能有机会，仍需观察” are not an answer. Put all fit-testing questions under `现实核对` only.

Short examples:

- Good, career: “事业主线是靠学习和专业积累建立优势，暂时不能把职责扩张当作主要判断。盘里对学习支持的指向更直接，职责压力只作补充。”
- Good, wealth: “财富主线是先把资源取得和配置管好，暂时不能断收入会增减。盘里能直接看到资源议题，但还不能证明产出会稳定变成收入。”
- Bad: “事业先看学习支持，财富先看资源配置；还有哪些待核对线索？前台和背景层如何？”

Example result menu for the bundled CLI:

```text
接下来想看：
1. 深挖事业与学业
2. 深挖财富与资源
3. 深挖感情与长期关系
4. 看当前阶段或目标日期（仅在动态事实可用时）
5. 为什么这样看
6. 修改资料
7. 结束
```

Do not imply that every menu item is available. Generate it from current capabilities and results.

Represent continuation choices as structured actions in machine-readable readings when possible:

```yaml
- id: deepen-career
  action: deepen
  available: true
  requires_input: []
  reuses_frozen_calculation: true
```

Registered actions are `deepen`, `change_focus`, `inspect_evidence`, `inspect_sensitivity`, `compare_profile`, `correct_input`, `new_reading`, `audit`, `export`, `reflect`, and `close`. `change_focus` must reuse the frozen calculation; `new_reading` must not. Every draft structured action needs a stable `id`, `action`, `available`, `requires_input`, and `reuses_frozen_calculation`; add `target_system` where required. Do not author the visible `label` or an unavailable `reason`: `bind-reading` generates both canonically and removes `reason` when the action is available. In particular, `compare_profile` is shown to users as **“比较另一种传统排法”**, not “比较不同排盘口径”. Standard, deep, and audit readings require structured next steps and cannot use free-form strings here.

### Frozen session and corrections

After a successful calculation, retain one in-memory session summary: the user's goal, selected system, normalized input, profile, warnings, hashes, and available actions. Reuse the frozen envelope for topic follow-ups, details, uncertainty, evidence, and audit; never ask for birth data again merely because the user changes topic. The ordinary answer exposes the goal and result, not this internal session record.

For Tarot and I Ching, the frozen question is part of the reading context. Follow-ups about the same issue reuse the same draw/cast. If the user changes to a materially new question, explain that it starts a new draw/cast and ask for explicit confirmation before replacing the frozen result. Never redraw because the user dislikes or disputes the first reading.

If the user edits an input or profile:

1. show the changed field;
2. recalculate only the affected system;
3. invalidate interpretations bound to the old facts hash;
4. summarize which facts changed and which remained stable;
5. never carry a favorable old conclusion into the new chart silently.

Starting a new session clears the frozen in-memory result before collecting the next input. On close, say whether anything was saved. The bundled CLI does not persist a session unless the user explicitly exports JSON. Before showing or exporting full audit JSON, warn that it contains the normalized birth data or private question.

If the user says the result does not fit, do not enter an open-ended search for confirmatory biography. Identify the disputed claim, then offer input correction, an explanation of the traditional rule and its counter-reading, or stopping the reading. Known past events may be discussed only as informal fit/mismatch feedback, retaining misses and unclear cases; they cannot be converted into a blind score after the outcome was knowable.

Every interpretive result should include a compact `现实核对`: one observation that would support the conclusion and one that would count against it. These must be independently observable and must not restate the narrative in vaguer words. Hide their internal criterion IDs and evidence-source enums from ordinary output.

### Ordinary birth and phase result shape

Use one fixed, glanceable hierarchy for a natal or target-date result:

1. **先说结论** — one or two direct declarative sentences answering the user's focus; render each sentence as a bullet. Do not lead with questions, workflow labels, or evidence-status shorthand.
2. **阶段时间轴** — when available, show it immediately after the conclusion with exact interval dates. State the phase only in category-level plain language—collaboration/expression support, resource support, friction or sudden pressure, movement/change, relationship interaction, or buffering/problem-solving—and keep detailed stars in the evidence layer.
3. **分主题卡片** — requested topic first. Within every card preserve: **结论** (when not identical to the headline) → **白话解读** → **盘面依据（术语）** → **什么情况要改判** → **现实提醒**. For career and wealth, the first sentence says what the result means and the next sentence gives the bounded reason; all diagnostic questions stay in the separate reality-check section.
4. **怎么判断这条解读是否贴合** — show support, contradiction, and unclear reality checks.
5. **需要留意** — show material uncertainty in plain language.
6. **接下来可以看** — show canonical available next steps; the disclaimer follows last.

Split summary and plain-language interpretation at sentence boundaries, terminology evidence at semicolons, and revision conditions one per bullet. Put complete lists, sources, profiles, warnings, integrity fields, and raw JSON after this result layer. “为什么这样看” and “反例与另一种解释” remain directly reachable. If a field cannot be supported, omit or mark it unavailable.

### Current-question answer shape

For Tarot or another supported focused-question route, write:

1. `先说答案`;
2. `当前局面`;
3. `真正的阻力`;
4. `有利条件与需要防的部分`;
5. `如果目前条件不变` as a conditional direction, not fate;
6. one concrete, reversible action that is sensible without the divinatory premise.

Multi-card Tarot must connect at least two cards as support, tension, sequence, or turn. Never stop at one keyword per card. The follow-up menu should prioritize continuing the same question, comparing the user's real options, inspecting a blind spot, or asking why the reading follows.

### Backstage evidence and technical record

Hide these by default: profile and source IDs, warning codes, sensitivity/candidate/probe/sample counts, hashes, engine/schema/runtime versions, fact/rule/source IDs, replay commitments, and raw JSON. “为什么这样看” should first show natural-language chart/draw facts and rule/source names. “技术记录” may expose identifiers and raw JSON only after a separate privacy warning.

## 9. Multi-system workflow

Only enter `COMPARE` after each component reading has independently passed its input, calculation, and evidence gates.

1. Freeze each system's normalized input, profile, warnings, and result hash.
2. Choose user-requested topics; do not compare every field by keyword.
3. Preserve each system's original statement and evidence card.
4. Let `bind-reading` omit `cross_system` for one system and set multi-system metadata exactly to `{relationship: "not_compared"}`. Do not ask the model to classify equivalence, complementarity, or conflict.
5. In ordinary prose, place the original validated claims side by side with their own scopes and limitations. If they sound similar or different, describe only the quoted claim-level difference and state that no machine relationship was established.
6. Ask which original evidence the user wants to inspect.

Never rewrite earlier readings merely to make the final narrative harmonious.

## 10. Interaction acceptance checks

- A vague request cannot reach `COMPUTE` without a route.
- A precise birth request cannot reach `COLLECT` before a local-use disclosure.
- An unknown hour cannot enter a time-dependent single-chart path.
- A planned method cannot reach `COMPUTE`.
- A comparison cannot start before explicit opt-in and independently calculated components.
- A failed engine cannot produce chart facts from model memory.
- The initial result remains usable and compact without requiring an audit report.
- A deep/audit response exposes structured continuation actions and reuses the frozen calculation unless an input/profile correction invalidates it.
- The initial result begins with the user's answer, not a profile, warning list, sensitivity ledger, hash, chart dump, card-keyword list, or disclaimer.
- Life-stage or target-date language cannot appear without a dedicated dynamic result in the frozen envelope.
- Technical identifiers remain behind a user-invoked evidence or audit action.
- Same-question follow-ups do not recalculate or redraw; a new question requires an explicit reset.
- Negative feedback cannot silently change birth time, profile, rule, card, cast, or the original claim wording.
