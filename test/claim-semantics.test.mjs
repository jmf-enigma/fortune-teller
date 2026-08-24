import test from "node:test";
import assert from "node:assert/strict";
import { calculate } from "../src/index.mjs";
import { TAROT_DECK } from "../src/data/tarot.mjs";
import {
  canonicalCalculationFactStatement,
  canonicalTechnicalSummary,
  validateClaimSemantics,
} from "../src/core/claim-semantics.mjs";

function interpretationClaim(calculation, factIds, semanticBindings) {
  const claim = {
    system: calculation.system,
    epistemic_status: "interpretation",
    statement: "把这项传统结构当作提问线索，并以现实记录核对。",
    reasoning_summary: "解释只限定核对范围，不把传统结构当作现实结论。",
    fact_ids: factIds,
    semantic_bindings: semanticBindings,
  };
  claim.technical_summary = canonicalTechnicalSummary(calculation, semanticBindings, factIds);
  return claim;
}

function hexagramBinding(calculation, factId, role) {
  const value = role === "primary" ? calculation.facts.primary : calculation.facts.transformed;
  return {
    kind: "hexagram_identity",
    fact_id: factId,
    role,
    king_wen_number: value.king_wen_number,
    name: value.name,
  };
}

test("calculation_fact statement is wholly determined by the cited I Ching facts", () => {
  const calculation = calculate("iching", {
    question: "是否继续推进？",
    lines: [6, 7, 8, 9, 7, 8],
  });
  const factIds = ["F-YJ-H01", "F-YJ-H02", "F-YJ-L1", "F-YJ-L4"];
  const canonical = canonicalCalculationFactStatement(calculation, factIds);
  assert.equal(
    canonical,
    "本卦为第47卦“困”；变卦为第60卦“节”；自下而上第1爻为6（老阴，动爻）；自下而上第4爻为9（老阳，动爻）。",
  );
  const valid = validateClaimSemantics({
    system: "iching",
    epistemic_status: "calculation_fact",
    fact_ids: factIds,
    statement: canonical,
  }, calculation, factIds);
  assert.equal(valid.valid, true, valid.errors.join("\n"));

  const reversed = validateClaimSemantics({
    system: "iching",
    epistemic_status: "calculation_fact",
    fact_ids: factIds,
    statement: canonical.replace("本卦为第47卦“困”", "本卦为第60卦“节”"),
  }, calculation, factIds);
  assert.equal(reversed.valid, false);
  assert.match(reversed.errors.join("\n"), /must exactly equal/u);
});

test("I Ching binding verifies identity fields and keeps technical prose out of interpretation", () => {
  const calculation = calculate("iching", {
    question: "是否继续推进？",
    lines: [6, 7, 8, 9, 7, 8],
  });
  const factIds = ["F-YJ-H01", "F-YJ-H02"];
  const bindings = [
    hexagramBinding(calculation, "F-YJ-H01", "primary"),
    hexagramBinding(calculation, "F-YJ-H02", "transformed"),
  ];
  const claim = interpretationClaim(calculation, factIds, bindings);
  assert.equal(validateClaimSemantics(claim, calculation, factIds).valid, true);

  const wrongBinding = structuredClone(claim);
  wrongBinding.semantic_bindings[0].name = calculation.facts.transformed.name;
  const wrong = validateClaimSemantics(wrongBinding, calculation, factIds);
  assert.equal(wrong.valid, false);
  assert.match(wrong.errors.join("\n"), /do not exactly match/u);

  const proseSmuggling = structuredClone(claim);
  proseSmuggling.statement = "本卦为节，所以先观察现实条件。";
  const smuggled = validateClaimSemantics(proseSmuggling, calculation, factIds);
  assert.equal(smuggled.valid, false);
  assert.match(smuggled.errors.join("\n"), /protected iching technical assertion/u);

  const wrongLineProse = structuredClone(claim);
  wrongLineProse.statement = "初爻取值为六，这一结构意味着先核对选项再决定。";
  const wrongLine = validateClaimSemantics(wrongLineProse, calculation, factIds);
  assert.equal(wrongLine.valid, false);
  assert.match(wrongLine.errors.join("\n"), /protected iching technical assertion/u);
});

test("Meihua primary, transformed, trigram, and moving-line assertions are typed", () => {
  const calculation = calculate("meihua", {
    first_number: 1,
    second_number: 2,
  });
  const factIds = ["F-MH-H01", "F-MH-H02", "F-MH-T01", "F-MH-L01"];
  const bindings = [
    hexagramBinding(calculation, "F-MH-H01", "primary"),
    hexagramBinding(calculation, "F-MH-H02", "transformed"),
    {
      kind: "meihua_trigram",
      fact_id: "F-MH-T01",
      role: "upper",
      number: calculation.facts.upper_trigram.number,
      name: calculation.facts.upper_trigram.name,
      symbol: calculation.facts.upper_trigram.symbol,
    },
    { kind: "meihua_moving_line", fact_id: "F-MH-L01", position_from_bottom: 3 },
  ];
  const claim = interpretationClaim(calculation, factIds, bindings);
  assert.equal(validateClaimSemantics(claim, calculation, factIds).valid, true);

  const wrong = structuredClone(claim);
  wrong.semantic_bindings[1].role = "primary";
  wrong.semantic_bindings[3].position_from_bottom = 5;
  const result = validateClaimSemantics(wrong, calculation, factIds);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /do not exactly match/u);
});

test("Tarot card, spread position, and orientation must all match one fact", () => {
  const calculation = calculate("tarot", {
    question: "如何看待当前选择？",
    spread: "three",
    cards: [
      { card: TAROT_DECK[0].id, orientation: "reversed" },
      { card: TAROT_DECK[1].id, orientation: "upright" },
      { card: TAROT_DECK[2].id, orientation: "upright" },
    ],
  });
  const card = calculation.facts.cards[0];
  const factIds = [card.fact_id];
  const binding = {
    kind: "tarot_card",
    fact_id: card.fact_id,
    position: card.position,
    card_id: card.card_id,
    title: card.title,
    title_zh: card.title_zh,
    orientation: card.orientation,
  };
  const claim = interpretationClaim(calculation, factIds, [binding]);
  assert.equal(validateClaimSemantics(claim, calculation, factIds).valid, true);
  assert.equal(claim.technical_summary, "过去位为愚人（The Fool）逆位。" );

  for (const mutate of [
    (item) => { item.position = "present"; },
    (item) => { item.orientation = "upright"; },
    (item) => { item.title_zh = "魔术师"; },
  ]) {
    const wrong = structuredClone(claim);
    mutate(wrong.semantic_bindings[0]);
    assert.equal(validateClaimSemantics(wrong, calculation, factIds).valid, false);
  }
});

test("BaZi pillar stem-branch assertion cannot swap a stem or branch", () => {
  const calculation = calculate("bazi", {
    date: "2000-08-16",
    time: "04:00",
    timezone: "Asia/Shanghai",
  });
  const pillar = calculation.facts.pillars[2];
  const factIds = [pillar.fact_id];
  const binding = {
    kind: "bazi_pillar",
    fact_id: pillar.fact_id,
    pillar: pillar.pillar,
    stem_branch: pillar.stem_branch,
    heavenly_stem: pillar.heavenly_stem,
    earthly_branch: pillar.earthly_branch,
  };
  const claim = interpretationClaim(calculation, factIds, [binding]);
  assert.equal(validateClaimSemantics(claim, calculation, factIds).valid, true);

  const wrong = structuredClone(claim);
  wrong.semantic_bindings[0].stem_branch = "丙子";
  wrong.semantic_bindings[0].earthly_branch = "子";
  const result = validateClaimSemantics(wrong, calculation, factIds);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /do not exactly match/u);
});

test("BaZi relationship type and participating pillars are inseparable", () => {
  const calculation = calculate("bazi", {
    date: "2000-08-16",
    time: "04:00",
    timezone: "Asia/Shanghai",
  });
  const relation = calculation.facts.structure.relationships[0];
  assert.ok(relation);
  const factIds = [relation.fact_id];
  const binding = {
    kind: "bazi_relationship",
    fact_id: relation.fact_id,
    relationship: relation.relationship,
    values: relation.values,
    pillar_ids: relation.pillar_ids,
    pillars: relation.pillars,
  };
  const claim = interpretationClaim(calculation, factIds, [binding]);
  assert.equal(validateClaimSemantics(claim, calculation, factIds).valid, true);

  const wrong = structuredClone(claim);
  wrong.semantic_bindings[0].relationship = "branch_six_harmony";
  const result = validateClaimSemantics(wrong, calculation, factIds);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /do not exactly match/u);
});

test("Western planet sign and motion direction are verified together", () => {
  const calculation = calculate("western", {
    date: "2000-08-16",
    time: "04:00",
    timezone: "Asia/Shanghai",
    latitude: 31.23,
    longitude: 121.47,
  });
  const planet = calculation.facts.planets.find((item) => item.body === "uranus");
  assert.equal(planet.motion_state, "retrograde");
  const factIds = [planet.fact_id];
  const binding = {
    kind: "western_planet",
    fact_id: planet.fact_id,
    body: planet.body,
    sign: planet.sign,
    sign_zh: planet.sign_zh,
    motion_state: planet.motion_state,
    retrograde: planet.retrograde,
  };
  const claim = interpretationClaim(calculation, factIds, [binding]);
  assert.equal(validateClaimSemantics(claim, calculation, factIds).valid, true);

  const wrong = structuredClone(claim);
  wrong.semantic_bindings[0].sign = "Pisces";
  wrong.semantic_bindings[0].sign_zh = "双鱼座";
  wrong.semantic_bindings[0].motion_state = "direct";
  wrong.semantic_bindings[0].retrograde = false;
  const result = validateClaimSemantics(wrong, calculation, factIds);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /do not exactly match/u);
});

test("Western aspect participants and aspect type cannot be relabeled", () => {
  const calculation = calculate("western", {
    date: "2000-08-16",
    time: "04:00",
    timezone: "Asia/Shanghai",
    latitude: 31.23,
    longitude: 121.47,
  });
  const aspect = calculation.facts.aspects[0];
  const factIds = [aspect.fact_id];
  const binding = {
    kind: "western_aspect",
    fact_id: aspect.fact_id,
    body_1: aspect.body_1,
    body_2: aspect.body_2,
    aspect: aspect.aspect,
    separation_degrees: aspect.separation_degrees,
    orb_degrees: aspect.orb_degrees,
  };
  const claim = interpretationClaim(calculation, factIds, [binding]);
  assert.equal(validateClaimSemantics(claim, calculation, factIds).valid, true);

  const wrong = structuredClone(claim);
  wrong.semantic_bindings[0].aspect = "trine";
  const result = validateClaimSemantics(wrong, calculation, factIds);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /do not exactly match/u);
});

test("Zi Wei star binding is mechanical and 坐...宫 prose bypass is rejected", () => {
  const calculation = calculate("ziwei", {
    date: "2000-08-16",
    time: "04:00",
    timezone: "Asia/Shanghai",
    chart_sex: "female",
  });
  const palace = calculation.facts.palaces.find((item) =>
    item.major_stars.some((star) => star.name === "紫微"));
  assert.ok(palace);
  const factIds = [palace.fact_id];
  const binding = {
    kind: "star_in_palace",
    fact_id: palace.fact_id,
    star: "紫微",
    palace: palace.name,
    star_group: "major",
  };
  const claim = interpretationClaim(calculation, factIds, [binding]);
  assert.equal(validateClaimSemantics(claim, calculation, factIds).valid, true);

  const bypass = structuredClone(claim);
  bypass.statement = "紫微坐财帛宫，因此先核对现实资源。";
  const result = validateClaimSemantics(bypass, calculation, factIds);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /protected ziwei technical assertion/u);
});

test("unsupported fact paths render a fixed neutral sentence, never arbitrary prose", () => {
  const calculation = calculate("iching", {
    question: "是否继续推进？",
    lines: [7, 7, 7, 7, 7, 7],
  });
  const factIds = ["jsonptr:/facts/mode"];
  const canonical = canonicalCalculationFactStatement(calculation, factIds);
  assert.equal(
    canonical,
    "第1项所引结构化计算事实已按原值核对；该对象暂无受支持的自然语言技术表述。",
  );
  const claim = {
    system: "iching",
    epistemic_status: "calculation_fact",
    fact_ids: factIds,
    statement: "本卦必然意味着成功。",
  };
  const result = validateClaimSemantics(claim, calculation, factIds);
  assert.equal(result.valid, false);
  assert.equal(result.canonical_statement, canonical);
});

test("technical_summary is exact and reasoning cannot carry a contrary technical assertion", () => {
  const calculation = calculate("tarot", {
    question: "如何看待当前选择？",
    spread: "one",
    cards: [{ card: TAROT_DECK[0].id, orientation: "upright" }],
  });
  const card = calculation.facts.cards[0];
  const factIds = [card.fact_id];
  const binding = {
    kind: "tarot_card",
    fact_id: card.fact_id,
    position: card.position,
    card_id: card.card_id,
    title: card.title,
    title_zh: card.title_zh,
    orientation: card.orientation,
  };
  const claim = interpretationClaim(calculation, factIds, [binding]);
  claim.technical_summary = `${claim.technical_summary} 这张牌其实是逆位。`;
  claim.reasoning_summary = "牌面是逆位，所以要暂停。";
  const result = validateClaimSemantics(claim, calculation, factIds);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /technical_summary must exactly equal/u);
  assert.match(result.errors.join("\n"), /protected tarot technical assertion/u);
});
