import test from "node:test";
import assert from "node:assert/strict";
import { calculateIChing } from "../src/engines/iching.mjs";
import { calculateMeihua } from "../src/engines/meihua.mjs";
import { adjudicateIChing } from "../src/core/iching-adjudicator.mjs";
import { adjudicateMeihua } from "../src/core/meihua-adjudicator.mjs";
import { calculateFactsHash, calculateReproducibilityHash } from "../src/core/result.mjs";
import { buildIChingStructure } from "../src/data/iching-interpretation-rulepack.mjs";
import { hexagramFromLines } from "../src/data/iching.mjs";

function rehash(calculation) {
  calculation.facts_hash = calculateFactsHash(calculation);
  calculation.reproducibility_hash = calculateReproducibilityHash(calculation);
  return calculation;
}

test("I Ching zero-changing-line protocol keeps only the primary whole", () => {
  const calculation = calculateIChing({ question: "当前安排是否需要调整？", lines: [7, 8, 7, 8, 7, 8] });
  const structure = calculation.facts.structure;
  assert.equal(structure.changing_line_count, 0);
  assert.equal(structure.reading_selector.mode, "primary_whole_only");
  assert.deepEqual(structure.reading_selector.selected_line_positions, []);
  assert.equal(structure.classic_text_status.line_texts_384, "not_packaged");

  const result = adjudicateIChing(calculation);
  assert.match(result.conclusion, /无动爻/u);
  assert.equal(result.status, "qualified");
  assert.deepEqual(result.basis, ["F-YJ-H01"]);
  assert.equal(result.lenses.transformed_structure.status, "same_as_primary_no_separate_change_claim");
  assert.match(result.unresolved.join("\n"), /384爻辞未打包/u);
  assert.equal(result.safeguards.classic_text_invented, false);
});

test("I Ching one-changing-line protocol selects exactly that bottom-up stage", () => {
  const calculation = calculateIChing({ question: "下一步先处理什么？", lines: [7, 8, 9, 8, 7, 8] });
  const selector = calculation.facts.structure.reading_selector;
  assert.equal(selector.mode, "single_changing_line");
  assert.deepEqual(selector.selected_line_positions, [3]);

  const result = adjudicateIChing(calculation);
  assert.match(result.conclusion, /第3爻.*内外关口/u);
  assert.equal(result.lenses.selected_change_stages.length, 1);
  assert.equal(result.lenses.selected_change_stages[0].line_fact_id, "F-YJ-L3");
  assert.ok(result.basis.includes("F-YJ-H02"));
});

test("I Ching two-to-five changing lines stay parallel and unranked", () => {
  const two = calculateIChing({ question: "两个变化怎样一起看？", lines: [9, 7, 8, 8, 7, 6] });
  assert.equal(two.facts.structure.reading_selector.mode, "multiple_changing_lines_parallel_unranked");
  assert.deepEqual(two.facts.structure.reading_selector.selected_line_positions, [1, 6]);
  assert.match(adjudicateIChing(two).conclusion, /并列处理/u);

  const five = calculateIChing({ question: "多个变化怎样一起看？", lines: [9, 6, 9, 6, 9, 8] });
  assert.equal(five.facts.structure.changing_line_count, 5);
  assert.equal(five.facts.structure.reading_selector.mode, "multiple_changing_lines_parallel_unranked");
  assert.deepEqual(five.facts.structure.reading_selector.selected_line_positions, [1, 2, 3, 4, 5]);
  assert.equal(adjudicateIChing(five).lenses.selected_change_stages.length, 5);
});

test("I Ching all-changing protocol distinguishes use-nine, use-six, and mixed six-line change", () => {
  const allNine = calculateIChing({ question: "全阳皆变怎样取用？", lines: [9, 9, 9, 9, 9, 9] });
  assert.equal(allNine.facts.structure.reading_selector.mode, "all_nine_use_nine_marker");
  assert.equal(allNine.facts.structure.reading_selector.special_marker, "use_nine");
  assert.equal(allNine.facts.structure.reading_selector.special_text_status, "not_packaged_do_not_invent");
  assert.match(adjudicateIChing(allNine).conclusion, /不补写、不伪引/u);

  const allSix = calculateIChing({ question: "全阴皆变怎样取用？", lines: [6, 6, 6, 6, 6, 6] });
  assert.equal(allSix.facts.structure.reading_selector.mode, "all_six_use_six_marker");
  assert.equal(allSix.facts.structure.reading_selector.special_marker, "use_six");
  assert.match(adjudicateIChing(allSix).conclusion, /用六.*不补写、不伪引/u);

  const mixed = calculateIChing({ question: "六爻混合皆变怎样取用？", lines: [9, 6, 9, 6, 9, 6] });
  assert.equal(mixed.facts.structure.reading_selector.mode, "all_six_changing_parallel_unranked");
  assert.equal(Object.hasOwn(mixed.facts.structure.reading_selector, "special_marker"), false);
  assert.match(adjudicateIChing(mixed).conclusion, /不借用不适用的“用九\/用六”/u);
});

test("I Ching structural features preserve centrality, correctness, and correspondence without scoring", () => {
  const calculation = calculateIChing({ question: "结构核对", lines: [7, 8, 7, 8, 7, 8] });
  const features = calculation.facts.structure.line_features;
  assert.deepEqual(features.filter((line) => line.central).map((line) => line.position_from_bottom), [2, 5]);
  assert.ok(features.every((line) => line.correct_position));
  assert.ok(features.every((line) => line.correspondence));
  const result = adjudicateIChing(calculation);
  assert.equal(result.safeguards.score_used, false);
  assert.equal(result.safeguards.event_prediction_used, false);
});

test("I Ching adjudicator independently rejects a rehashed forged selection protocol", () => {
  const calculation = calculateIChing({ question: "防篡改", lines: [9, 7, 8, 8, 7, 6] });
  const forged = structuredClone(calculation);
  forged.facts.structure.reading_selector.mode = "single_changing_line";
  forged.facts.structure.reading_selector.selected_line_positions = [1];
  rehash(forged);
  assert.throws(
    () => adjudicateIChing(forged),
    (error) => error.code === "ICHING_ADJUDICATION_FACTS_UNVERIFIED"
      && /do not replay/u.test(error.message)
      && /structural selection facts/u.test(error.details.errors.join("\n")),
  );
});

test("a hidden-seed I Ching cast is readable but its origin is honestly unverified", () => {
  const calculation = calculateIChing({ question: "新起一卦" });
  const result = adjudicateIChing(calculation);
  assert.equal(result.audit.calculation_replay_status, "structural_only_origin_unverified");
  assert.equal(result.audit.random_origin_verified, false);
  assert.match(result.plain_language, /眼下先/u);
});

test("I Ching selection protocol is total over all 4^6 canonical line records", () => {
  const values = [6, 7, 8, 9];
  const modes = new Set();
  for (let code = 0; code < 4 ** 6; code += 1) {
    let cursor = code;
    const lines = Array.from({ length: 6 }, () => {
      const value = values[cursor % 4];
      cursor = Math.floor(cursor / 4);
      return value;
    });
    const primaryBits = lines.map((line) => line === 7 || line === 9);
    const transformedBits = lines.map((line, index) => ([6, 9].includes(line) ? !primaryBits[index] : primaryBits[index]));
    const structure = buildIChingStructure(
      lines,
      hexagramFromLines(primaryBits),
      hexagramFromLines(transformedBits),
    );
    modes.add(structure.reading_selector.mode);
    assert.equal(structure.reading_selector.selected_line_positions.length, structure.changing_line_count);
    assert.equal(structure.line_features.length, 6);
  }
  assert.deepEqual([...modes].sort(), [
    "all_nine_use_nine_marker",
    "all_six_changing_parallel_unranked",
    "all_six_use_six_marker",
    "multiple_changing_lines_parallel_unranked",
    "primary_whole_only",
    "single_changing_line",
  ]);
});

test("Meihua derives body/use, mutual hexagram, and both five-element relations mechanically", () => {
  const calculation = calculateMeihua({
    first_number: 3,
    second_number: 4,
    question: "怎样推进这件事？",
  });
  const structure = calculation.facts.structure;
  assert.equal(structure.body_use.body.half, "upper");
  assert.equal(structure.body_use.body.trigram.name, "离");
  assert.equal(structure.body_use.use.half, "lower");
  assert.equal(structure.body_use.use.trigram.name, "震");
  assert.equal(structure.body_use.primary_relation.relation, "use_generates_body");
  assert.equal(structure.body_use.transformed.relation.relation, "body_generates_use");
  assert.equal(structure.mutual.king_wen_number, 39);
  assert.equal(structure.mutual.name, "蹇");
  assert.equal(structure.mutual.lower_trigram.name, "艮");
  assert.equal(structure.mutual.upper_trigram.name, "坎");

  const result = adjudicateMeihua(calculation);
  assert.match(result.conclusion, /体卦为离火，用卦为震木.*用生体/u);
  assert.match(result.plain_language, /变化后体用关系转为“体生用”/u);
  assert.equal(result.lenses.mutual_process.fact_id, "F-MH-H03");
  assert.equal(result.audit.body_use_replayed, true);
  assert.equal(result.audit.mutual_hexagram_replayed, true);
});

test("Meihua assigns the upper moving half as use and keeps directional control explicit", () => {
  const calculation = calculateMeihua({ first_number: 4, second_number: 8 });
  const bodyUse = calculation.facts.structure.body_use;
  assert.equal(bodyUse.moving_half, "upper");
  assert.equal(bodyUse.body.trigram.name, "坤");
  assert.equal(bodyUse.use.trigram.name, "震");
  assert.equal(bodyUse.primary_relation.relation, "use_controls_body");
  assert.match(adjudicateMeihua(calculation).plain_language, /外部条件对自身形成约束或压力/u);
});

test("Meihua takes pure Qian/Kun mutual structure from the transformed hexagram", () => {
  const qian = calculateMeihua({ first_number: 1, second_number: 1 });
  assert.equal(qian.facts.primary.name, "乾");
  assert.equal(qian.facts.structure.mutual.name, "姤");
  assert.equal(qian.facts.structure.mutual.king_wen_number, 44);
  assert.equal(qian.facts.structure.mutual.status, "derived_from_transformed_for_pure_qian_kun");
  assert.equal(qian.facts.structure.mutual.source_hexagram, "transformed");

  const kun = calculateMeihua({ first_number: 8, second_number: 8 });
  assert.equal(kun.facts.primary.name, "坤");
  assert.equal(kun.facts.structure.mutual.name, "蹇");
  assert.equal(kun.facts.structure.mutual.king_wen_number, 39);
  assert.equal(kun.facts.structure.mutual.source_hexagram, "transformed");
});

test("Meihua body/use relation is total over a full two-number residue cycle", () => {
  const relations = new Set();
  for (let first = 1; first <= 24; first += 1) {
    for (let second = 1; second <= 24; second += 1) {
      const calculation = calculateMeihua({ first_number: first, second_number: second });
      const bodyUse = calculation.facts.structure.body_use;
      relations.add(bodyUse.primary_relation.relation);
      assert.ok(bodyUse.transformed.relation.relation);
      assert.equal(calculation.facts.structure.mutual.lines_bottom_up.length, 6);
    }
  }
  assert.deepEqual([...relations].sort(), [
    "body_controls_use",
    "body_generates_use",
    "same_element",
    "use_controls_body",
    "use_generates_body",
  ]);
});

test("Meihua without occurrence time refuses seasonal strength and precise timing", () => {
  const calculation = calculateMeihua({ first_number: 17, second_number: 29 });
  assert.equal(calculation.facts.structure.seasonal_strength.status, "unavailable");
  assert.equal(calculation.facts.structure.timing.status, "unavailable");
  assert.equal(calculation.facts.structure.timing.precise_date_claim_allowed, false);
  const result = adjudicateMeihua(calculation);
  assert.equal(result.safeguards.seasonal_strength_invented, false);
  assert.equal(result.safeguards.exact_timing_used, false);
  assert.match(result.unresolved.join("\n"), /没有发生时间.*未判体用旺衰/u);
  assert.match(result.unresolved.join("\n"), /不给精准日期/u);
});

test("Meihua adjudicator rejects rehashed body/use tampering through full replay", () => {
  const calculation = calculateMeihua({ first_number: 3, second_number: 4 });
  const forged = structuredClone(calculation);
  forged.facts.structure.body_use.primary_relation.relation = "same_element";
  rehash(forged);
  assert.throws(
    () => adjudicateMeihua(forged),
    (error) => error.code === "MEIHUA_ADJUDICATION_FACTS_UNVERIFIED"
      && /do not replay/u.test(error.message)
      && /current-engine replay/u.test(error.details.errors.join("\n")),
  );
});
