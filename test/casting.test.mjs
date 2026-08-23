import test from "node:test";
import assert from "node:assert/strict";
import { calculate } from "../src/index.mjs";
import { hexagramFromLines } from "../src/data/iching.mjs";
import { TAROT_DECK } from "../src/data/tarot.mjs";
import { createRandomSource, randomInt } from "../src/core/random.mjs";

test("Tarot deck contains 78 unique stable card IDs", () => {
  assert.equal(TAROT_DECK.length, 78);
  assert.equal(new Set(TAROT_DECK.map((card) => card.id)).size, 78);
});

test("question length follows JSON Schema Unicode code points", () => {
  const accepted = "😀".repeat(501);
  assert.equal(calculate("tarot", { question: accepted, spread: "one", cards: ["The Fool"] }).input.question, accepted);
  assert.equal(calculate("iching", { question: accepted, lines: [7, 7, 7, 7, 7, 7] }).input.question, accepted);
  for (const system of ["tarot", "iching"]) {
    const input = system === "tarot"
      ? { question: "😀".repeat(1001), spread: "one", cards: ["The Fool"] }
      : { question: "😀".repeat(1001), lines: [7, 7, 7, 7, 7, 7] };
    assert.throws(() => calculate(system, input), (error) => error.code === "INPUT_SCHEMA_VIOLATION");
  }
});

test("seeded Tarot is reproducible, unique, and domain-separated", () => {
  const input = { question: "reflection", spread: "celtic-cross", seed: "fixture" };
  const first = calculate("tarot", input);
  const second = calculate("tarot", input);
  assert.deepEqual(first.facts.cards, second.facts.cards);
  assert.equal(first.reproducibility_hash, second.reproducibility_hash);
  assert.equal(new Set(first.facts.cards.map((card) => card.card_id)).size, 10);
  assert.equal(first.meta.rng.domain, "tarot");
  assert.ok(first.facts.cards.every((card) => !Object.hasOwn(card, "keyword_reference")));
  assert.equal(first.meta.card_keyword_references.length, 10);
  assert.ok(first.meta.card_keyword_references.every((item) => item.source_status === "project_authored_reflective_prompt"));
});

test("secure Tarot reveals a replay seed only by opt-in and reproduces the facts", () => {
  const hidden = calculate("tarot", { question: "reflection", spread: "three" });
  assert.equal(hidden.meta.rng.replay_seed, null);
  const first = calculate("tarot", { question: "reflection", spread: "three", reveal_seed: true });
  const replay = calculate("tarot", { question: "reflection", spread: "three", seed: first.meta.rng.replay_seed });
  assert.deepEqual(first.facts.cards, replay.facts.cards);
  assert.equal(first.facts_hash, replay.facts_hash);
  assert.notEqual(first.reproducibility_hash, replay.reproducibility_hash);
});

test("King Wen lookup is a bijection over all 64 line patterns", () => {
  const numbers = [];
  for (let mask = 0; mask < 64; mask += 1) {
    numbers.push(hexagramFromLines(Array.from({ length: 6 }, (_, bit) => Boolean(mask & (1 << bit)))).king_wen_number);
  }
  assert.deepEqual([...new Set(numbers)].sort((a, b) => a - b), Array.from({ length: 64 }, (_, index) => index + 1));
  assert.equal(hexagramFromLines([true, true, true, true, true, true]).name, "乾");
  assert.equal(hexagramFromLines([false, false, false, false, false, false]).name, "坤");
  assert.equal(hexagramFromLines([false, true, false, true, false, true]).name, "未济");
  assert.equal(hexagramFromLines([true, false, true, false, true, false]).name, "既济");
});

test("King Wen lookup matches the complete upper-by-lower golden matrix", () => {
  const trigramKeys = ["111", "110", "101", "100", "011", "010", "001", "000"];
  const expected = [
    [1, 10, 13, 25, 44, 6, 33, 12],
    [43, 58, 49, 17, 28, 47, 31, 45],
    [14, 38, 30, 21, 50, 64, 56, 35],
    [34, 54, 55, 51, 32, 40, 62, 16],
    [9, 61, 37, 42, 57, 59, 53, 20],
    [5, 60, 63, 3, 48, 29, 39, 8],
    [26, 41, 22, 27, 18, 4, 52, 23],
    [11, 19, 36, 24, 46, 7, 15, 2],
  ];
  const actual = trigramKeys.map((upper) => trigramKeys.map((lower) =>
    hexagramFromLines(`${lower}${upper}`.split("").map((bit) => bit === "1")).king_wen_number));
  assert.deepEqual(actual, expected);
});

test("three-coin replay records 6×3 coins and flips only changing lines", () => {
  const cast = calculate("iching", { question: "reflection", seed: "fixture" });
  assert.equal(cast.facts.lines.length, 6);
  assert.ok(cast.facts.lines.every((line) => line.coins.length === 3));
  const manual = calculate("iching", { question: "reflection", lines: [9, 7, 8, 8, 7, 6] });
  assert.deepEqual(manual.facts.changing_lines, [1, 6]);
  manual.facts.primary.lines_bottom_up.forEach((line, index) => {
    const expected = [0, 5].includes(index) ? !line : line;
    assert.equal(manual.facts.transformed.lines_bottom_up[index], expected);
  });
});

test("Meihua two-number convention is explicit and deterministic", () => {
  const result = calculate("meihua", { first_number: 1, second_number: 1, moving_line: 1 });
  assert.equal(result.facts.primary.king_wen_number, 1);
  assert.equal(result.facts.transformed.king_wen_number, 44);
  assert.match(result.warnings.join("\n"), /preview/i);
});

test("Meihua default moving-line fixtures preserve modulo conventions", () => {
  const one = calculate("meihua", { first_number: 1, second_number: 1 });
  assert.equal(one.facts.moving_line.position_from_bottom, 2);
  assert.equal(one.facts.transformed.king_wen_number, 13);
  const eight = calculate("meihua", { first_number: 8, second_number: 8 });
  assert.equal(eight.facts.moving_line.position_from_bottom, 4);
  assert.equal(eight.facts.transformed.king_wen_number, 16);
});

test("Meihua moving-line arithmetic stays exact at MAX_SAFE_INTEGER", () => {
  const maximum = Number.MAX_SAFE_INTEGER;
  const result = calculate("meihua", { first_number: maximum, second_number: maximum });
  assert.equal(result.facts.moving_line.position_from_bottom, 2);
  assert.throws(
    () => calculate("meihua", { first_number: maximum + 1, second_number: 1 }),
    (error) => error.code === "INPUT_SCHEMA_VIOLATION" && /at most/.test(error.message),
  );
});

test("randomInt rejects unsupported bounds instead of looping", () => {
  const source = createRandomSource("fixture");
  assert.throws(() => randomInt(source, 0x1_0000_0001), /no greater than 2\^32/);
  assert.ok(randomInt(source, 0x1_0000_0000) <= 0xffff_ffff);
});
