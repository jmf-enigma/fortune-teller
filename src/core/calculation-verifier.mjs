import { stableJson } from "./hash.mjs";
import { calculateBazi } from "../engines/bazi.mjs";
import { calculateZiwei } from "../engines/ziwei.mjs";
import { calculateWestern } from "../engines/western.mjs";
import { calculateTarot } from "../engines/tarot.mjs";
import { calculateIChing } from "../engines/iching.mjs";
import { calculateMeihua } from "../engines/meihua.mjs";

const CALCULATORS = Object.freeze({
  bazi: calculateBazi,
  ziwei: calculateZiwei,
  western: calculateWestern,
  tarot: calculateTarot,
  iching: calculateIChing,
  meihua: calculateMeihua,
});

function replayProfile(calculation) {
  const profile = calculation?.profile;
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) return profile;
  if (typeof profile.id === "string" && profile.id.startsWith(`${calculation.system}-custom-`)) {
    return Object.fromEntries(Object.entries(profile).filter(([key]) => key !== "id"));
  }
  return profile;
}

function birthInput(calculation) {
  const source = calculation.input || {};
  const input = { date: source.date, timezone: source.timezone };
  for (const key of [
    "time", "disambiguation", "utc_offset", "latitude", "longitude", "chart_sex", "target_date",
  ]) {
    if (source[key] != null) input[key] = source[key];
  }
  return input;
}

function tarotInput(calculation) {
  const source = calculation.input || {};
  const input = { question: source.question, spread: source.spread };
  if (calculation.facts?.mode === "user-supplied") {
    input.cards = calculation.facts.cards.map((card) => ({ card: card.card_id, orientation: card.orientation }));
    return { input, status: "user_supplied_recomputed" };
  }
  const replaySeed = calculation.meta?.rng?.replay_seed;
  if (typeof replaySeed === "string" && replaySeed.length > 0) {
    input.seed = replaySeed;
    return { input, status: "replayed_facts" };
  }
  return { input, status: "structural_only_origin_unverified" };
}

function ichingInput(calculation) {
  const source = calculation.input || {};
  const input = { question: source.question };
  if (calculation.facts?.mode === "user-supplied") {
    input.lines = calculation.facts.lines.map((line) => line.value);
    return { input, status: "user_supplied_recomputed" };
  }
  const replaySeed = calculation.meta?.rng?.replay_seed;
  if (typeof replaySeed === "string" && replaySeed.length > 0) {
    input.seed = replaySeed;
    return { input, status: "replayed_facts" };
  }
  return { input, status: "structural_only_origin_unverified" };
}

function meihuaInput(calculation) {
  const source = calculation.input || {};
  return {
    first_number: source.first_number,
    second_number: source.second_number,
    ...(source.moving_line_supplied === true
      ? { moving_line: calculation.facts?.moving_line?.position_from_bottom }
      : {}),
    ...(typeof source.question === "string" ? { question: source.question } : {}),
  };
}

function projectTarotCards(cards) {
  return cards?.map(({ fact_id, position, card_id, title, title_zh, orientation }) => ({
    fact_id, position, card_id, title, title_zh, orientation,
  }));
}

function projectIChingFacts(facts) {
  return {
    lines: facts?.lines?.map(({ fact_id, position_from_bottom, value, type }) => ({
      fact_id, position_from_bottom, value, type,
    })),
    changing_lines: facts?.changing_lines,
    primary: facts?.primary,
    transformed: facts?.transformed,
  };
}

function coinTranscriptErrors(calculation) {
  const errors = [];
  if (calculation.system !== "iching" || calculation.facts?.mode !== "local-three-coin-cast") return errors;
  calculation.facts?.lines?.forEach((line, lineIndex) => {
    if (!Array.isArray(line.coins) || line.coins.length !== 3) {
      errors.push(`facts.lines[${lineIndex}].coins must contain three recorded coins`);
      return;
    }
    let sum = 0;
    line.coins.forEach((coin, coinIndex) => {
      const expectedValue = coin?.face === "heads" ? 3 : coin?.face === "tails" ? 2 : null;
      if (expectedValue == null || coin.value !== expectedValue) {
        errors.push(`facts.lines[${lineIndex}].coins[${coinIndex}] has an inconsistent face/value pair`);
      } else sum += coin.value;
    });
    if (sum !== line.value) errors.push(`facts.lines[${lineIndex}] does not equal its three-coin transcript`);
  });
  return errors;
}

/**
 * Recalculate facts when the exported envelope retains enough material. For a
 * fresh random draw/cast with no revealed replay seed, verify only internal
 * structure; no open-source content hash can prove when or where it originated.
 */
export function verifyCalculationFacts(calculation) {
  const errors = [];
  const system = calculation?.system;
  if (typeof system !== "string" || !Object.hasOwn(CALCULATORS, system)) {
    return { status: "unavailable", errors: ["no calculator is registered for this system"] };
  }
  const calculator = CALCULATORS[system];
  if (!calculator) return { status: "unavailable", errors: ["no calculator is registered for this system"] };
  try {
    if (["bazi", "ziwei", "western"].includes(system)) {
      const replay = calculator(birthInput(calculation), replayProfile(calculation));
      if (stableJson(replay.facts) !== stableJson(calculation.facts)) errors.push("facts do not match a current-engine replay");
      if (stableJson(replay.sensitivity) !== stableJson(calculation.sensitivity)) errors.push("sensitivity does not match a current-engine replay");
      return { status: "replayed_facts", errors };
    }
    if (system === "meihua") {
      const replay = calculator(meihuaInput(calculation), replayProfile(calculation));
      if (stableJson(replay.facts) !== stableJson(calculation.facts)) errors.push("facts do not match a current-engine replay");
      return { status: "replayed_facts", errors };
    }
    if (system === "tarot") {
      const prepared = tarotInput(calculation);
      const replayInput = prepared.status === "structural_only_origin_unverified"
        ? {
            question: calculation.input?.question,
            spread: calculation.input?.spread,
            cards: calculation.facts?.cards?.map((card) => ({ card: card.card_id, orientation: card.orientation })),
          }
        : prepared.input;
      const replay = calculator(replayInput, replayProfile(calculation));
      if (stableJson(projectTarotCards(replay.facts.cards)) !== stableJson(projectTarotCards(calculation.facts?.cards))) {
        errors.push("Tarot cards, positions, titles, or orientations are not self-consistent");
      }
      return { status: prepared.status, errors };
    }
    if (system === "iching") {
      const prepared = ichingInput(calculation);
      const replayInput = prepared.status === "structural_only_origin_unverified"
        ? { question: calculation.input?.question, lines: calculation.facts?.lines?.map((line) => line.value) }
        : prepared.input;
      const replay = calculator(replayInput, replayProfile(calculation));
      if (stableJson(projectIChingFacts(replay.facts)) !== stableJson(projectIChingFacts(calculation.facts))) {
        errors.push("I Ching line values, types, changing lines, or hexagrams are not self-consistent");
      }
      errors.push(...coinTranscriptErrors(calculation));
      return { status: prepared.status, errors };
    }
  } catch (error) {
    errors.push(`facts could not be replayed: ${error?.code || error?.name || "unknown error"}`);
  }
  return { status: "unavailable", errors };
}
