# Changelog

All notable project changes are documented here.

## 0.1.0 - 2026-08-23

Initial local release candidate.

### Added

- Agent Skill state machine, progressive system references, evidence contract, safety contract, and standard/audit model tiers.
- Local BaZi, Zi Wei, tropical whole-sign Western natal, Tarot, I Ching, and preview Meihua engines.
- Strict input schemas, named calculation profiles, structured envelopes, fact and full-envelope hashes.
- Full civil-day unknown-time scans for BaZi and Zi Wei; 60-second planetary range scan for unknown Western birth time.
- Explicit DST gap/overlap handling and skipped-civil-date rejection.
- Secure local random draws, replay seeds, seed commitments, user-supplied card/line modes, and coin transcripts.
- Reading validator with system/profile/fact/rule binding and anti-probability/anti-voting gates.
- Fail-closed CLI and JSON hardening for repeated flags, prototype-like keys, malformed field types, coordinate half-pairs, and private error values.
- Candidate/sample coverage enforcement for every stable, partly stable, or boundary-sensitive unknown-time claim.
- Doctor, release checker, Skill archive builder, tests, bilingual README, benchmark, competitor audit, CI, security policy, and third-party notices.

### Known limitations

- Meihua is a two-number preview only.
- Liu Yao, Qi Men, and Vedic astrology are planned and fail closed.
- Western houses are whole-sign only; no nodes, Chiron, asteroids, Placidus, synastry, or transits.
- No bundled verified classical source registry; `verified` source status is rejected.
- No MCP, HTTP API, chart graphics, or external user validation yet.
