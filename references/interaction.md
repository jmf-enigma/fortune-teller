# Interaction and Routing Protocol

Read this reference for intake, method selection, compatibility, uncertain times, or interactive continuation. The goal is to reach the smallest honest reading with the least sensitive data.

## 1. Conversation states

Maintain the following state internally. Do not expose state names unless useful for debugging.

| State | Required outcome | Exit condition |
|---|---|---|
| `DETECT` | Identify overview, focused question, compatibility, timing, comparison, audit, or academic discussion | One intent is primary |
| `ROUTE` | Select one supported method or present a short neutral choice | User has chosen or accepted a route |
| `DISCLOSE` | Explain local use and minimum-data policy before sensitive collection | User understands what is needed |
| `COLLECT` | Gather only material fields | Minimum viable input is present, or reduced mode is selected |
| `CONFIRM` | Show normalized input and material conventions | User confirms, corrects, or accepts explicit uncertainty |
| `COMPUTE` | Produce a structured local result envelope | Engine succeeds or a failure branch is taken |
| `PREVIEW` | Give a short result plus uncertainty and continuation choices | User receives a usable first answer |
| `DEEPEN` | Expand one selected topic | Topic is answered with evidence cards |
| `COMPARE` | Compare already calculated systems without voting | Conflict matrix is delivered |
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

If the user names a supported method, use it. Otherwise route by the shape of the request rather than implying one tradition is more accurate.

| Request shape | Suitable route | Interaction |
|---|---|---|
| Broad self-reflection from birth data | BaZi, Zi Wei, or Western natal chart | Offer at most three supported choices with their input needs |
| One concrete situation | Tarot or I Ching; preview Meihua only after disclosure | Ask for one focused question |
| Compatibility | Same birth-chart method for both people first | Ask whether both data sets may be shared; names are unnecessary |
| Candidate dates | No native timing workflow in v0.1.0 | Explain that date selection is unavailable; do not repurpose a natal or casting engine as an electional calculator |
| “Use everything” | One system first, comparison second | Explain that systems use different constructs; obtain explicit opt-in |
| Pure history or doctrine | Do not run a reading | Answer academically and distinguish schools and evidence |

Example neutral choice:

> 你想看“出生盘式的整体倾向”，还是针对一件具体事情做一次起卦/抽牌？前者需要出生日期、准确时间（不知道可明确留空）和 IANA 时区；后者只需要一个清楚的问题。

Do not characterize a method as “most accurate,” “scientific,” or “best for predicting.”

## 3. Capability gate

Consult the live registry before promising a result.

- `stable`: normal route.
- `stable-*`: normal route inside the named profile; disclose the scope in confirmation and result.
- `preview`: opt-in only. State what is incomplete before collecting data.
- `planned` or `engine: null`: unavailable. Never generate a chart from prose knowledge.

If a requested method is unavailable, say exactly that the local engine is not implemented. Offer a supported method only if it still matches the user's question.

## 4. Minimum viable inputs

### BaZi

Collect:

- Gregorian civil birth date; if the user has only a lunar date, request a separately verified Gregorian conversion because direct lunar input is not implemented;
- exact local birth time or explicit “unknown”; bounded ranges are not a native v0.1 input;
- birthplace city or IANA timezone; longitude only to the precision required by the selected time profile;
- the chosen day-boundary and civil-time/solar-time profile when they materially change the chart.

Do not require a legal name. If a later luck-cycle rule requires a traditional gender/direction parameter, explain the algorithmic purpose and allow the user to select the profile directly rather than inferring it.

### Zi Wei Dou Shu

Collect:

- Gregorian civil date; if the user has only a lunar date, request a separately verified Gregorian conversion because direct lunar input is not implemented;
- exact hour or explicit unknown status;
- timezone/place needed for correct calendar conversion;
- the categorical value and calendar/school profile required by the installed engine.

Explain that unknown hour usually changes the chart structure. Do not create a single chart when multiple candidates remain.

### Western natal astrology

Collect:

- civil date;
- exact local time or explicit “unknown”;
- IANA timezone and city/coordinates;
- the fixed tropical, whole-sign profile disclosure; sidereal and other house systems are not supported.

The current qualified profile must be disclosed. Without a reliable time, omit Ascendant, Midheaven, houses, and aspects. If a moving body changes sign within the full civil-day scan, report the sampled range rather than choosing one sign.

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

Use only after an explicit preview warning. Collect two user-provided positive integers and, optionally, an explicit moving line. Time-based casting is not implemented. Never invent a time rule after seeing an inconvenient result.

## 5. Privacy disclosure

Before collecting birth data, use one natural sentence, for example:

> 我只需要日期、准确时间（不知道可以留空）和 IANA 时区；这些信息默认只交给本地排盘程序，不需要姓名或具体地址。

For compatibility:

> 另一方不需要姓名；请只提供你有权分享的出生资料。我不会用命盘断言对方的隐私、忠诚或真实想法。

If local timezone resolution cannot identify a city and remote lookup would help, ask permission before any network request and say what will be sent. Manual IANA timezone or approximate coordinates must remain an offline alternative.

## 6. Confirmation card

Use a compact confirmation card. Include only material fields.

```text
准备按以下口径计算：
- 体系：四柱八字
- 日期：1990-02-03（公历）
- 时间：未知；将扫描支持的候选时段
- 地点/时区：Hong Kong / Asia/Hong_Kong
- 时间口径：民用时间；未做真太阳时修正
- 日界配置：profile-id

如果这些信息正确，我就开始；任何不确定项都会保留在结果里。
```

Do not ask for confirmation again after every drill-down unless the user changes input or profile.

## 7. Unknown-time protocol

### Step 1: preserve what is actually known

Represent the native engine input as exact time or unknown. Preserve a user-stated bounded range or broad part of day in the conversation, but v0.1.0 cannot pass it as a calculation field. Do not turn “morning” into a single hour. Resolve daylight-saving folds/gaps explicitly when relevant.

### Step 2: choose a degradation mode

Offer:

- **Reduced**: fastest; excludes time-dependent facts.
- **Full-day scan**: enumerates all supported candidate periods.
- **Rectification**: separate advanced workflow, explicit request only.

If the user gives a range, say that native range calculation is not implemented in v0.1.0. Offer an exact-time calculation if the record is reliable, full-day sensitivity, or reduced mode. Do not manually approximate a range and present it as engine coverage.

For profiles with a 23:00 day boundary, the engine may expose 13 candidates from early Zi through late Zi. Preserve the engine's candidate definitions and denominator instead of assuming a fixed set of 12.

### Step 3: classify each conclusion

| Label | Meaning |
|---|---|
| `stable` | Holds for every admitted candidate under the declared profile |
| `partly_stable` | Holds for an explicit subset, reported as `n/N` |
| `boundary_sensitive` | Changes at identified time/profile boundaries |
| `unavailable` | Cannot be supported from the admitted inputs |

Candidate frequency is not a probability distribution. Never write that `8/13` means “62% likely.”

### Step 4: report before interpreting

Start with a sensitivity ledger using the engine's actual denominator or regime count:

```text
候选盘或变化区间：N
全部稳定：2 项
部分稳定：3 项（逐项列 n/N；若引擎提供）
边界敏感：4 项
无法判断：2 项
```

Interpret stable items first. Put candidate-specific narratives behind an explicit expansion choice.

### Rectification guardrails

Rectification fits candidate times to remembered events and is vulnerable to hindsight and selection. Therefore:

- do not initiate it automatically;
- keep the original candidate set visible;
- separate fitted events from any event reserved for a check;
- report ties and near-ties;
- call the result a candidate ranking, not a recovered birth time;
- do not reuse the selected candidate as independent evidence that the tradition predicted those events.

## 8. Preview and continuation

The first result should normally contain:

1. method, profile, and calculation status;
2. three to five themes or fewer;
3. a one-paragraph uncertainty/sensitivity summary;
4. one evidence example;
5. a continuation menu.

Example menu:

```text
继续看：
1. 事业或学习
2. 关系与沟通
3. 时辰敏感性
4. 查看证据卡
5. 更换流派口径
6. 完整审计
```

Do not imply that every menu item is available. Generate it from current capabilities and results.

## 9. Multi-system workflow

Only enter `COMPARE` after each component reading has independently passed its input, calculation, and evidence gates.

1. Freeze each system's normalized input, profile, warnings, and result hash.
2. Choose user-requested topics; do not compare every field by keyword.
3. Preserve each system's original statement and evidence card.
4. Classify relationships using the conflict protocol in `evidence-contract.md`.
5. Show convergence, construct differences, and direct conflicts separately.
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
