import { makeEnvelope } from "../core/result.mjs";
import { FortuneTellerError } from "../core/errors.mjs";
import { resolveProfile } from "../core/profiles.mjs";
import { createRandomSource, randomInt } from "../core/random.mjs";
import { hexagramFromLines } from "../data/iching.mjs";

function questionText(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new FortuneTellerError("MISSING_QUESTION", "I Ching casting requires a focused question or reflection prompt");
  }
  if ([...value.trim()].length > 1000) throw new FortuneTellerError("QUESTION_TOO_LONG", "question must be at most 1000 characters");
  return value.trim();
}

function validateLines(lines) {
  if (!Array.isArray(lines) || lines.length !== 6 || lines.some((line) => ![6, 7, 8, 9].includes(line))) {
    throw new FortuneTellerError("INVALID_LINES", "lines must be six values from bottom to top, each one of 6, 7, 8, or 9");
  }
  return [...lines];
}

function castLines(source) {
  return Array.from({ length: 6 }, () => {
    const coins = Array.from({ length: 3 }, () => {
      const heads = randomInt(source, 2) === 1;
      return { face: heads ? "heads" : "tails", value: heads ? 3 : 2 };
    });
    return { value: coins.reduce((sum, coin) => sum + coin.value, 0), coins };
  });
}

function lineLabel(value) {
  return ({ 6: "old-yin-changing", 7: "young-yang", 8: "young-yin", 9: "old-yang-changing" })[value];
}

export function calculateIChing(rawInput, profileOverride = {}) {
  const profile = resolveProfile("iching", profileOverride);
  const question = questionText(rawInput?.question);
  if (rawInput.lines != null && rawInput.seed != null) {
    throw new FortuneTellerError("CONFLICTING_RANDOMNESS_INPUT", "use manual lines or a replay seed, not both");
  }
  if (rawInput.reveal_seed === true && (rawInput.lines != null || rawInput.seed != null)) {
    throw new FortuneTellerError("INVALID_REVEAL_SEED", "reveal_seed is only for a fresh local cast without manual lines or a supplied seed");
  }
  let lines;
  let coinTranscript = null;
  let rngMeta;
  if (rawInput.lines != null) {
    lines = validateLines(rawInput.lines);
    rngMeta = { mode: "user-supplied-physical-or-manual-lines", replay_seed: null, seed_commitment: null };
  } else {
    const source = createRandomSource(rawInput.seed, { domain: "iching-three-coin", profile: profile.id });
    const cast = castLines(source);
    lines = cast.map((line) => line.value);
    coinTranscript = cast.map((line) => line.coins);
    rngMeta = {
      mode: source.mode,
      replay_seed: source.seedWasGenerated && rawInput.reveal_seed === true ? source.replaySeed : null,
      seed_commitment: source.seedCommitment,
      algorithm: "three independent fair binary coins per line from a SHA-256 counter stream",
      domain: source.domain,
      profile: source.profile,
      blocks_used: source.blocksUsed,
    };
  }
  const primaryBits = lines.map((line) => line === 7 || line === 9);
  const transformedBits = lines.map((line, index) => (line === 6 || line === 9 ? !primaryBits[index] : primaryBits[index]));
  const primary = hexagramFromLines(primaryBits);
  const transformed = hexagramFromLines(transformedBits);
  const changing = lines.flatMap((line, index) => (line === 6 || line === 9 ? [index + 1] : []));
  return makeEnvelope({
    system: "iching",
    profile,
    input: { question, lines_supplied: rawInput.lines != null, replay_seed_revealed: rngMeta.replay_seed !== null },
    facts: {
      mode: rawInput.lines != null ? "user-supplied" : "local-three-coin-cast",
      lines: lines.map((value, index) => ({
        fact_id: `F-YJ-L${index + 1}`,
        kind: rawInput.lines != null ? "user_supplied_fact" : "randomized_fact",
        position_from_bottom: index + 1,
        value,
        type: lineLabel(value),
        ...(coinTranscript ? { coins: coinTranscript[index] } : {}),
      })),
      changing_lines: changing,
      primary: { fact_id: "F-YJ-H01", kind: "calculation_fact", ...primary },
      transformed: { fact_id: "F-YJ-H02", kind: "calculation_fact", ...transformed },
    },
    warnings: ["Hexagram interpretation is a traditional reflective practice, not a validated forecast."],
    meta: { rng: rngMeta, interpretation_included: false },
  });
}
