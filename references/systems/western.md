# Western Natal Astrology (`western`) — 0.5.0

This is a geocentric tropical natal-chart route with whole-sign houses. The result-first adjudicator uses a bounded classical structure; it does not establish personality or event prediction.

## Actual support

- Gregorian dates from 1900-01-01 through 2100-12-31;
- exact or unknown local time, IANA timezone and explicit DST disambiguation;
- optional latitude/longitude pair for Ascendant, Midheaven and houses;
- Sun through Pluto geocentric tropical positions and audited apparent motion;
- whole-sign houses only;
- conjunction, sextile, square, trine and opposition under declared fixed orbs;
- applying, separating, exact or uncertain aspect phase from a fixed ±60-minute comparison;
- domicile/detriment and exaltation/fall for the classical seven planets only, with outer planets explicitly not applicable;
- angular, succedent or cadent placement when houses exist;
- chart ruler from Ascendant sign under the traditional seven-planet ruler table;
- topic-first adjudication through primary house, traditional ruler as primary plus every occupant as a co-significator, chart ruler, luminaries and up to three closest relevant aspects;
- unknown-time day scanning that reports stable or boundary-sensitive planet signs and omits every angle/house-dependent conclusion.

The default profile remains tropical zodiac, whole-sign houses, and the declared five-aspect orb table. None is claimed as universal across astrology schools.

## Result-first adjudication

```js
import { calculate, adjudicateWestern, adjudicate } from "../../src/index.mjs";

const calculation = calculate("western", {
  date: "2000-08-16",
  time: "04:00",
  timezone: "Asia/Shanghai",
  latitude: 31.23,
  longitude: 121.47,
});

const result = adjudicateWestern(calculation, { topic: "career_study" });
// or adjudicate(calculation, { topic: "career_study" })
```

The ordinary result gives:

1. one topic axis in plain language;
2. its constructive expression and overextension risk;
3. one relevant aspect process when present;
4. explicit change conditions and reality checks;
5. technical house/ruler/luminary/condition evidence only on demand.

## Topic route (`R-WA-005`)

For a known-time chart:

1. select the registered primary whole-sign house for the topic;
2. if that house contains planets, choose by the fixed personal-planet priority list;
3. otherwise choose the traditional seven-planet ruler of the house sign;
4. add the chart ruler, Sun and Moon without duplicating a body;
5. add up to three closest aspects that touch one of those anchors;
6. display the registered planet function, sign expression, house topic and unscored traditional condition.

This is a transparent selection rule, not “the strongest planet” and not a score. A condition such as domicile, detriment, exaltation or fall describes ease or friction inside the declared classical vocabulary; it does not imply virtue, talent, success or fate.

If time is known but coordinates are absent, planet positions and aspects remain available, while Ascendant, houses and chart ruler are unavailable. The adjudicator uses a bounded Sun–Moon fallback and says exactly what was omitted. It never guesses coordinates from a city name or timezone.

## Aspect phase

Each aspect fact includes type, actual separation, orb and `phase`:

- `applying`: the orb is decreasing over the fixed audit interval;
- `separating`: the orb is increasing;
- `exact`: effectively at the aspect angle under the registered numerical tolerance;
- `uncertain`: the comparison does not safely determine direction.

Phase does not produce event timing. “Applying” means the calculated geometry is tightening around the birth instant, not that an event is about to happen.

## Traditional condition and angularity

`facts.structure.traditional_conditions` contains:

- one essential-condition record for each classical planet;
- categorical angularity for house placements;
- chart-ruler identity and its Ascendant fact when available.

There are no weights, points, almuten, sect, triplicity, term, face, reception or final dignity score. Outer planets retain position/aspect facts but do not receive invented classical domicile status.

## Unknown-time refusal

Unknown-time mode may report which planet signs remain stable across the sampled civil day and which cross a sign boundary. It may not output:

- Ascendant or Midheaven;
- houses or chart ruler;
- an exact Moon/angle-dependent topic route;
- rectification based on personality feedback.

The 60-second scan bounds the implemented sample track; it is not a probability distribution or exact continuous-extrema proof.

## Numbered rules

### R-WA-001 — calculated tropical placement

Use the exact longitude/sign fact under the declared tropical profile. A sign is a bounded traditional lens, not a fixed personality or event claim.

### R-WA-002 — whole-sign houses require their premises

House 1 begins at the resolved Ascendant sign. No time or no coordinates means no house claim.

### R-WA-003 — aspects require geometry and orb

Cite the exact aspect fact, orb and phase. Never convert a square or opposition into proof of conflict, trauma or failure.

### R-WA-004 — motion is a calculation label

Preserve `stationary-or-uncertain` and `retrograde: null` when audit windows disagree. Retrograde does not authorize an event interpretation.

### R-WA-005 — bounded topic synthesis

Use only the registered topic house/luminary fallback, occupant or ruler, chart ruler, luminaries, closest relevant aspects and unscored seven-planet conditions. Do not replace this chain with element counts or an invented dominant-planet score.

## Sources and school boundary

- `SRC-WA-ASTRONOMY-2.1.19` supports the pinned numerical implementation provenance. Astronomy does not validate astrological meaning.
- `SRC-WA-TETRABIBLOS-PG70850` supplies historical provenance for limited zodiacal and aspect vocabulary used by the bounded route. It does not select this project's whole-sign profile, orb policy or exact condition table, and it is not evidence of predictive accuracy.
- Topic maps and short interpretation axes are original bounded project paraphrases, not quotations or a complete classical/modern delineation corpus.

## Not supported

- sidereal/Vedic zodiac or alternative ayanamsa;
- Placidus, Equal, Koch, Campanus or other houses;
- nodes, Chiron, asteroids, lots, fixed stars, hypothetical points;
- full dignity scoring, sect, reception or aspect-pattern algorithms;
- transits, progressions, returns, synastry, composites, electional work or rectification;
- health, pregnancy, death, investment, legal, relationship or career-event forecasts.

Agreement with another divination system remains a separate reflection, not scientific corroboration.
