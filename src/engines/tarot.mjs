import { makeEnvelope } from "../core/result.mjs";
import { FortuneTellerError } from "../core/errors.mjs";
import { resolveProfile } from "../core/profiles.mjs";
import { createRandomSource, randomInt, shuffle } from "../core/random.mjs";
import { findTarotCard, TAROT_DECK } from "../data/tarot.mjs";

const SPREADS = {
  one: ["focus"],
  three: ["past", "present", "future"],
  "situation-action-outcome": ["situation", "action", "outcome"],
  decision: ["option-a", "option-b", "decision-lens"],
  "celtic-cross": [
    "present", "challenge", "foundation", "recent-past", "possibility",
    "near-future", "self", "environment", "hopes-and-fears", "outcome",
  ],
};

function questionText(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new FortuneTellerError("MISSING_QUESTION", "tarot requires a focused question or reflection prompt");
  }
  if ([...value.trim()].length > 1000) throw new FortuneTellerError("QUESTION_TOO_LONG", "question must be at most 1000 characters");
  return value.trim();
}

function resolveProvidedCards(values, positions, profile) {
  if (!Array.isArray(values) || values.length !== positions.length) {
    throw new FortuneTellerError("INVALID_CARDS", `cards must contain exactly ${positions.length} entries for this spread`);
  }
  const seen = new Set();
  return values.map((entry, index) => {
    const object = typeof entry === "string" ? { card: entry, orientation: "upright" } : entry;
    const card = findTarotCard(object?.card ?? object?.id ?? object?.title);
    if (!card) throw new FortuneTellerError("UNKNOWN_CARD", `unknown tarot card at position ${index + 1}`);
    if (seen.has(card.id)) throw new FortuneTellerError("DUPLICATE_CARD", `${card.title} appears more than once`);
    seen.add(card.id);
    const orientation = object.orientation || "upright";
    if (!new Set(["upright", "reversed"]).has(orientation)) {
      throw new FortuneTellerError("INVALID_ORIENTATION", "orientation must be upright or reversed");
    }
    if (!profile.reversals && orientation === "reversed") {
      throw new FortuneTellerError("PROFILE_CARD_CONFLICT", "the upright-only profile cannot accept a reversed manual card");
    }
    return { card, orientation };
  });
}

export function calculateTarot(rawInput, profileOverride = {}) {
  const profile = resolveProfile("tarot", profileOverride);
  const question = questionText(rawInput?.question);
  if (rawInput.cards != null && rawInput.seed != null) {
    throw new FortuneTellerError("CONFLICTING_RANDOMNESS_INPUT", "use manual cards or a replay seed, not both");
  }
  if (rawInput.reveal_seed === true && (rawInput.cards != null || rawInput.seed != null)) {
    throw new FortuneTellerError("INVALID_REVEAL_SEED", "reveal_seed is only for a fresh local draw without manual cards or a supplied seed");
  }
  const spread = rawInput?.spread || "three";
  const positions = Object.hasOwn(SPREADS, spread) ? SPREADS[spread] : null;
  if (!positions) throw new FortuneTellerError("INVALID_SPREAD", `spread must be one of: ${Object.keys(SPREADS).join(", ")}`);

  let selected;
  let rngMeta;
  if (rawInput.cards != null) {
    selected = resolveProvidedCards(rawInput.cards, positions, profile);
    rngMeta = { mode: "user-supplied-physical-or-manual-cards", replay_seed: null, seed_commitment: null };
  } else {
    const source = createRandomSource(rawInput.seed, { domain: "tarot", profile: profile.id });
    selected = shuffle(source, TAROT_DECK).slice(0, positions.length).map((card) => ({
      card,
      orientation: profile.reversals && randomInt(source, 2) === 1 ? "reversed" : "upright",
    }));
    rngMeta = {
      mode: source.mode,
      replay_seed: source.seedWasGenerated && rawInput.reveal_seed === true ? source.replaySeed : null,
      seed_commitment: source.seedCommitment,
      algorithm: "SHA-256 counter stream with rejection sampling and Fisher-Yates shuffle",
      domain: source.domain,
      profile: source.profile,
      blocks_used: source.blocksUsed,
    };
  }

  const cards = selected.map(({ card, orientation }, index) => ({
    fact_id: `F-TR-${String(index + 1).padStart(3, "0")}`,
    kind: rawInput.cards != null ? "user_supplied_fact" : "randomized_fact",
    position: positions[index],
    card_id: card.id,
    title: card.title,
    title_zh: card.title_zh,
    orientation,
  }));
  const keywordReferences = selected.map(({ card, orientation }) => ({
    card_id: card.id,
    orientation,
    prompt: orientation === "upright" ? card.upright : card.reversed,
    source_status: "project_authored_reflective_prompt",
  }));

  return makeEnvelope({
    system: "tarot",
    profile,
    input: { question, spread, cards_supplied: rawInput.cards != null, replay_seed_revealed: rngMeta.replay_seed !== null },
    facts: { mode: rawInput.cards != null ? "user-supplied" : "local-draw", cards },
    warnings: ["Card keywords are traditional interpretive prompts, not validated predictions."],
    meta: {
      rng: rngMeta,
      deck_size: TAROT_DECK.length,
      card_keyword_references: keywordReferences,
      interpretive_prompts_included: true,
      interpretation_included: false,
    },
  });
}
