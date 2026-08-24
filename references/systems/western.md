# Western Natal Astrology (`western`)

Use this reference only after the live method registry confirms that `western` is available. The current engine calculates a limited geocentric tropical natal chart with whole-sign houses; it does not validate astrological personality or event prediction.

## Actual support

The engine currently supports:

- release-tested Gregorian dates from 1900-01-01 through 2100-12-31; dates outside this range fail closed even if the upstream astronomy library accepts them;
- Gregorian date, exact local time or unknown time, an IANA timezone, and explicit daylight-saving disambiguation;
- normalized `input.time_precision` provenance (`minute`, `second`, or `unknown`), checked against the supplied clock syntax;
- optional latitude/longitude pair for Ascendant, Midheaven, and houses; supplying only one coordinate is rejected;
- geocentric tropical ecliptic-of-date positions for Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, and Pluto;
- longitude, sign, degree in sign, ecliptic latitude, distance, a centered finite-difference motion audit, and direct/retrograde/stationary-or-uncertain status;
- Ascendant and Midheaven from Astronomy Engine rotations when time and usable coordinates are present;
- whole-sign house assignment only;
- conjunction, sextile, square, trine, and opposition aspects under the explicit profile orbs;
- transparent known-time structure facts: unweighted element/modality counts, reference luminary/angle IDs, tight aspects selected at orb ≤2° for presentation priority, and whole-sign house occupancy counts when houses exist;
- unknown-time scanning over the local civil day for planetary longitude/sign ranges;
- explicit omission of angles and houses when time or coordinates are unavailable;
- omission of unstable angles near the geographic poles.

The default profile is:

```text
zodiac: tropical
houses: whole-sign
orbs: conjunction 8°, opposition 8°, trine 7°, square 7°, sextile 5°
```

The profile values are project conventions, not a claim of universal agreement among astrologers.

`time_precision` records whether the input clock was supplied to the minute or second; it is not a measured birth-time error bar and does not certify the source record. If a clock is present without seconds, the normalized calculation uses `:00` seconds and retains `time_precision: minute` so later narration cannot pretend second-level provenance.

## Not currently supported

Do not imply support for:

- sidereal zodiac, ayanamsa, Vedic astrology, heliocentric charts, or alternative coordinate frames;
- Placidus, Equal, Koch, Campanus, Porphyry, or another house system;
- lunar nodes, Chiron, asteroids, lots, fixed stars, hypothetical points, dignities, rulership scoring, or essential/accidental strength;
- transits, progressions, solar returns, synastry, composite charts, electional charts, or rectification;
- applying/separating aspect state, aspect patterns, declination aspects, or source-specific orb schemes;
- atmospheric-refraction corrections for the calculated angles;
- an interpretive corpus or modern copyrighted delineation text;
- empirical personality, compatibility, health, or future-event prediction.

## Reading the result envelope

### Known-time mode

Read:

- `facts.mode`: `known-time`;
- `facts.utc_instant`;
- `facts.planets[]`: `fact_id`, body, longitude, sign/index, degree in sign, ecliptic latitude, distance, motion, and retrograde state;
- `facts.angles`: Ascendant, Midheaven, and calculation audit, or `null` when unavailable;
- `facts.houses`: whole-sign first-house sign and planetary placements, or `null`;
- `facts.aspects[]`: two bodies, aspect name, exact angle, actual separation, and orb;
- `facts.structure.sign_distribution`: separate unweighted element and modality counts across Sun through Pluto;
- `facts.structure.reference_points`: emitted luminary IDs and, when available, angle IDs;
- `facts.structure.tight_aspects[]`: existing aspect facts with orb ≤2°, retained only as a presentation-priority subset;
- `facts.structure.house_occupancy`: unweighted whole-sign placement counts, or `null` when houses are unavailable;
- `profile.aspect_orbs_degrees` and all warnings;
- `meta.coordinate_frame`: the declared astronomical frame.

For each body, `motion_method` reports centered ecliptic-longitude finite differences at ±6, ±12, and ±24 hours. `motion_degrees_per_day` is the ±12-hour rate, while `motion_audit.window_rates_degrees_per_day` preserves all three checks. A direction is returned only when every numerically resolved window has the same sign. If signs disagree or no window clears the numerical epsilon, `motion_state=stationary-or-uncertain` and `retrograde=null`; do not force a direction.

`facts.structure.basis` and each `interpretation_limit` are binding caveats. Counts are descriptive, not dominance, dignity, personality, or predictive scores. A “tight” aspect is not more empirically valid; it is only selected by the fixed `orb_degrees <= 2` presentation rule.

### Unknown-time mode

Read:

- `facts.mode`: `unknown-time-day-scan`;
- `facts.planet_ranges[]`: start/end and unwrapped minimum/maximum longitude, sign status, and candidate signs;
- `facts.angles.status` and `facts.houses.status`: must remain unavailable;
- `sensitivity.local_day_start_utc`, `local_day_end_utc`, `sample_count`, and `sample_interval`.

The scan samples every 60 seconds plus the exact day end over the actual instant span of the civil date. It bounds the implemented sample track; it is not an exact continuous-extrema proof or probability interval and must not produce aspects, houses, Ascendant, or Midheaven.

## Numbered rule templates

### R-WA-001 — Tropical sign placement is a declared convention

- `type`: traditional
- `source_status`: verified
- `source_ids`: `SRC-WA-ASTRONOMY-2.1.19`, `SRC-WA-TETRABIBLOS-PG70850`
- `requires`: a resolved fact under `facts.planets`, `facts.planet_ranges`, `facts.structure.sign_distribution`, or `facts.structure.reference_points`, plus `profile.zodiac=tropical` and `meta.coordinate_frame`
- `rule`: A sign label may be used only as a symbolic tropical-astrology theme tied to the calculated longitude.
- `allowed`: “太阳位于热带黄道 X 座；若按西占传统，可把它作为一个反思主题。”
- `forbidden`: infer a fixed personality, diagnosis, intelligence, morality, or future event from the sign.

### R-WA-002 — Whole-sign houses require a resolved Ascendant

- `type`: traditional, profile-specific
- `source_status`: engine_documented
- `requires`: a resolved fact under `facts.angles`, `facts.houses`, or `facts.structure.house_occupancy`; a house interpretation also requires a non-null Ascendant, exact birth time, and usable coordinates
- `rule`: The Ascendant's sign is house 1 and subsequent signs map sequentially to houses under this profile.
- `allowed`: cite the Ascendant fact and the generated house placement together.
- `forbidden`: create houses when time/coordinates are missing or present whole-sign placement as another house system.

### R-WA-003 — Aspect labels come from geometry plus configured orb

- `type`: traditional, profile-specific
- `source_status`: verified
- `source_ids`: `SRC-WA-TETRABIBLOS-PG70850`
- `requires`: a resolved fact under `facts.aspects` or `facts.structure.tight_aspects` and the matching `profile.aspect_orbs_degrees` value
- `rule`: State both aspect type and orb. Treat an interpretation as a traditional symbolic reading, not a measured causal effect.
- `allowed`: “两点距离满足本 profile 的 square 阈值，orb 为 X°。”
- `forbidden`: describe the aspect as proof of conflict, talent, trauma, or compatibility.

### R-WA-004 — Motion state is a calculation label, not a life verdict

- `type`: calculation guard
- `source_status`: verified
- `source_ids`: `SRC-WA-ASTRONOMY-2.1.19`
- `requires`: the planet's `motion_degrees_per_day`, `motion_state`, `retrograde`, `motion_method`, and `motion_audit`
- `rule`: Preserve `stationary-or-uncertain` and `retrograde: null` exactly. This registered rule permits calculation facts and unresolved statements only; it does not authorize retrograde symbolism.
- `allowed`: report the computed direction and the three-window consistency audit.
- `forbidden`: equate retrograde with failure, illness, punishment, or inevitable delay.

## Source status and tradition differences

- `SRC-WA-ASTRONOMY-2.1.19` verifies the pinned numerical implementation provenance for positions and motion geometry. It does not support astrological meaning.
- `SRC-WA-TETRABIBLOS-PG70850` provides historical provenance for bounded zodiacal and aspect terminology under R-WA-001 and R-WA-003. It does not choose this project's house system or orb policy and is not evidence of predictive accuracy.
- Coordinate frame, aspect set, orb values, tropical zodiac, whole-sign mapping, structural count policy, and the 2° tight-aspect presentation threshold are project profiles or derived calculation policies. Do not attribute them to the historical source unless its registered scope says so.
- Astrological interpretation is not generated by the engine. A verified source ID supports only the registered rule and scope, not a general personality or event reading.
- Astrologers differ on zodiac, houses, points, orbs, rulership, aspect meaning, and rectification. Only the profile fields actually supported by the registry may be compared.
- Do not quote or closely reproduce modern copyrighted books, websites, or proprietary delineation reports. A short project-authored paraphrase must not be attributed as a quotation.

## Evidence/audit example — not the ordinary answer

> **计算事实**：`F-WA-P01` 给出太阳在热带黄道中的经度与星座；`F-WA-X001` 若存在，则记录两颗星体的角距和本 profile 下的相位分类。
>
> **传统解释**：这些标签可以用来提出“我如何理解自我表达或张力”的反思问题，但不能证明人格或未来事件。
>
> **口径限制**：本盘只支持 whole-sign houses；若 `facts.angles` 为 `null`，我不会输出上升点或宫位。

## Prohibited overreach

Never:

- infer Ascendant, Midheaven, houses, or angle aspects without reliable time and coordinates;
- present `time_precision` as proof that the recorded birth time is accurate;
- call a 60-second unknown-time scan an exact continuous proof or probability distribution;
- convert the three-window motion audit into a confidence percentage or force a direction when its signs disagree;
- turn unweighted sign or house counts into dominance, strength, dignity, personality, or prediction scores;
- silently switch zodiac, house system, or orb scheme;
- claim that one placement diagnoses health, trauma, neurotype, sexuality, criminality, or moral character;
- make deterministic relationship, pregnancy, death, investment, legal, accident, or career predictions;
- quote a modern astrologer or copyrighted interpretation that has not been supplied and authorized;
- describe agreement with another divination system as scientific corroboration.
