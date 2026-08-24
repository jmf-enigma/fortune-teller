import test from "node:test";
import assert from "node:assert/strict";
import { adjudicateTarot } from "../src/core/tarot-adjudicator.mjs";
import { calculateTarot } from "../src/engines/tarot.mjs";
import {
  calculateFactsHash,
  calculateReproducibilityHash,
  verifyCalculationEnvelope,
} from "../src/core/result.mjs";

function decisionCalculation() {
  return calculateTarot({
    question: "接下来应该选择 A 还是 B？",
    spread: "decision",
    cards: [
      "The Lovers",
      "Two of Swords",
      { card: "Queen of Cups", orientation: "reversed" },
    ],
  });
}

test("Tarot calculation preserves arcana, suit, rank, spread positions, and structural facts", () => {
  const calculation = decisionCalculation();
  assert.deepEqual(verifyCalculationEnvelope(calculation), []);

  assert.deepEqual(
    (({ arcana, number, suit, rank, rank_order: rankOrder, court }) => ({ arcana, number, suit, rank, rankOrder, court }))(
      calculation.facts.cards[0],
    ),
    { arcana: "major", number: 6, suit: null, rank: null, rankOrder: null, court: false },
  );
  assert.deepEqual(
    (({ arcana, number, suit, suit_zh: suitZh, rank, rank_order: rankOrder, court }) => (
      { arcana, number, suit, suitZh, rank, rankOrder, court }
    ))(calculation.facts.cards[1]),
    { arcana: "minor", number: null, suit: "swords", suitZh: "宝剑", rank: "two", rankOrder: 2, court: false },
  );
  assert.equal(calculation.facts.cards[2].court, true);
  assert.deepEqual(
    calculation.facts.spread.positions.map(({ order, position, card_fact_ref: cardFactRef }) => ({ order, position, cardFactRef })),
    [
      { order: 1, position: "option-a", cardFactRef: "F-TR-001" },
      { order: 2, position: "option-b", cardFactRef: "F-TR-002" },
      { order: 3, position: "decision-lens", cardFactRef: "F-TR-003" },
    ],
  );
  assert.deepEqual(
    (({
      card_count: cardCount,
      major_arcana_count: majorCount,
      minor_arcana_count: minorCount,
      court_card_count: courtCount,
      reversed_count: reversedCount,
    }) => ({ cardCount, majorCount, minorCount, courtCount, reversedCount }))(calculation.facts.structure.composition),
    { cardCount: 3, majorCount: 1, minorCount: 2, courtCount: 1, reversedCount: 1 },
  );
  assert.equal(calculation.facts.structure.suit_distribution.counts.cups, 1);
  assert.equal(calculation.facts.structure.suit_distribution.counts.swords, 1);
  assert.equal(calculation.facts.structure.rank_distribution.counts.queen, 1);
  assert.equal(calculation.facts.structure.adjacent_links.length, 2);
});

test("decision adjudication compares requirements and declares no card winner", () => {
  const calculation = decisionCalculation();
  const result = adjudicateTarot(calculation);
  assert.equal(result.status, "completed");
  assert.match(result.conclusion, /^这组牌不替你选 A 或 B/u);
  assert.match(result.conclusion, /A 要求处理/u);
  assert.match(result.conclusion, /B 要求处理/u);
  assert.match(result.conclusion, /比较尺度/u);
  assert.equal(result.action_anchor.position, "decision-lens");
  assert.equal(result.safeguards.card_voting_used, false);
  assert.equal(result.safeguards.decision_winner_declared, false);
  assert.equal(result.safeguards.score_used, false);
  assert.equal(result.lenses.card_roles[2].orientation_boundary.includes("not automatically unfavourable"), true);
  assert.equal(result.lenses.card_roles[2].source_keyword_status, "project_authored_registered_card_axis");
  assert.ok(Object.isFrozen(result));
  assert.equal(Object.isFrozen(calculation.facts.structure.composition), false, "adjudication must not freeze the input calculation");
});

test("all 56 Minor Arcana keep the exact card-orientation axis ahead of suit/rank helpers", () => {
  const suits = ["Wands", "Cups", "Swords", "Pentacles"];
  const ranks = ["Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Page", "Knight", "Queen", "King"];
  for (const suit of suits) {
    for (const rank of ranks) {
      for (const orientation of ["upright", "reversed"]) {
        const calculation = calculateTarot({
          question: "核对具体牌义",
          spread: "one",
          cards: [{ card: `${rank} of ${suit}`, orientation }],
        });
        const result = adjudicateTarot(calculation);
        const unit = result.lenses.card_roles[0];
        assert.match(unit.theme, new RegExp(unit.source_keyword.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
        assert.equal(unit.semantic_priority, "exact_card_axis_before_suit_and_rank_helpers");
        assert.match(result.conclusion, new RegExp(unit.source_keyword.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
      }
    }
  }
  const cupsSeven = adjudicateTarot(calculateTarot({
    question: "选项太多怎么办？",
    spread: "one",
    cards: [{ card: "Seven of Cups", orientation: "reversed" }],
  }));
  assert.match(cupsSeven.conclusion, /clarity, narrowed options/u);
});

test("situation-action-outcome keeps the outcome conditional and provides a reality check", () => {
  const calculation = calculateTarot({
    question: "这个合作现在该怎么推进？",
    spread: "situation-action-outcome",
    cards: ["Five of Wands", "Temperance", "Three of Pentacles"],
  });
  const result = adjudicateTarot(calculation);
  assert.match(result.conclusion, /只有行动与现实条件相配合/u);
  assert.match(result.conclusion, /后续方向/u);
  assert.equal(result.action_anchor.position, "action");
  assert.equal(result.safeguards.fixed_event_prediction_used, false);
  assert.match(result.reality_checks.join("\n"), /反驳|相反/u);
});

test("seed-revealed draws replay completely while hidden-origin draws stay qualified", () => {
  const revealed = calculateTarot({ question: "本周怎样安排重点？", spread: "three", reveal_seed: true });
  const revealedResult = adjudicateTarot(revealed);
  assert.equal(revealedResult.status, "completed");
  assert.equal(revealedResult.audit.calculation_replay_status, "replayed_facts");
  assert.equal(revealedResult.unresolved.length, 0);

  const hidden = calculateTarot({ question: "本周怎样安排重点？", spread: "three" });
  const hiddenResult = adjudicateTarot(hidden);
  assert.equal(hiddenResult.status, "qualified");
  assert.equal(hiddenResult.audit.calculation_replay_status, "structural_only_origin_unverified");
  assert.match(hiddenResult.unresolved.join("\n"), /不能核验.*随机抽牌的起源顺序/u);
});

test("adjudication rejects forged derived structure even when envelope hashes are recomputed", () => {
  const forged = structuredClone(decisionCalculation());
  forged.facts.structure.composition.major_arcana_count = 3;
  forged.facts_hash = calculateFactsHash(forged);
  forged.reproducibility_hash = calculateReproducibilityHash(forged);
  assert.deepEqual(verifyCalculationEnvelope(forged), []);
  assert.throws(
    () => adjudicateTarot(forged),
    (error) => error.code === "TAROT_ADJUDICATION_FACTS_UNVERIFIED"
      && /structural facts do not match/u.test(error.details.errors.join("\n")),
  );
});

test("repeated suits are reported as emphasis, never converted into votes", () => {
  const calculation = calculateTarot({
    question: "这个项目的执行卡在哪里？",
    spread: "three",
    cards: ["Ace of Pentacles", "Eight of Pentacles", "Ten of Pentacles"],
  });
  const result = adjudicateTarot(calculation);
  assert.deepEqual(result.lenses.structural_patterns.repeated_suits.map(({ suit, count }) => ({ suit, count })), [
    { suit: "pentacles", count: 3 },
  ]);
  assert.match(result.lenses.structural_patterns.repeated_suits[0].interpretation, /不是赞成票/u);
  assert.equal(result.safeguards.card_voting_used, false);
});

test("every released spread has a closed position route and an action anchor", () => {
  const fixtures = [
    ["one", ["The Fool"]],
    ["three", ["The Fool", "The Magician", "The High Priestess"]],
    ["situation-action-outcome", ["The Empress", "The Emperor", "The Hierophant"]],
    ["decision", ["The Lovers", "The Chariot", "Strength"]],
    ["celtic-cross", [
      "The Fool", "The Magician", "The High Priestess", "The Empress", "The Emperor",
      "The Hierophant", "The Lovers", "The Chariot", "Strength", "The Hermit",
    ]],
  ];
  for (const [spread, cards] of fixtures) {
    const calculation = calculateTarot({ question: `检查 ${spread} 牌阵`, spread, cards });
    const result = adjudicateTarot(calculation);
    assert.equal(result.lenses.card_roles.length, cards.length, spread);
    assert.ok(result.lenses.card_roles.every((unit) => unit.position_fact_id && unit.role_question && unit.theme), spread);
    assert.ok(result.action_anchor.card_fact_id, spread);
    assert.equal(result.lenses.spread.groups.flatMap((group) => group.card_fact_ids).length, cards.length, spread);
  }
});
