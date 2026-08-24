import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {
  bindReadingToCalculations,
  calculate,
  INTERPRETATION_PROFILES,
  validateReading,
} from "../src/index.mjs";

const SCHEMA_DIRECTORY = new URL("../schemas/", import.meta.url);
const BIRTH = {
  date: "2000-08-16",
  time: "04:00",
  timezone: "Asia/Shanghai",
  chart_sex: "female",
};

function loadSchemas() {
  return readdirSync(SCHEMA_DIRECTORY)
    .filter((name) => name.endsWith(".schema.json"))
    .sort()
    .map((name) => JSON.parse(readFileSync(join(SCHEMA_DIRECTORY.pathname, name), "utf8")));
}

function interpretationProfile() {
  const profile = INTERPRETATION_PROFILES.find((item) => item.id === "ziwei-sanhe-bounded-v1");
  assert.ok(profile);
  return profile;
}

function schemaValidator(schemas) {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    strictRequired: false,
    allowUnionTypes: true,
  });
  addFormats(ajv);
  schemas.forEach((schema) => ajv.addSchema(schema));
  return ajv;
}

function placeholderAssessment(topic, mode = "current_reflection") {
  return {
    mode,
    domain: topic,
    window: mode === "current_reflection"
      ? { kind: "current" }
      : { kind: "bounded", start: "2026-01-01", end: "2026-12-31" },
    criteria: [
      {
        criterion_id: "K-placeholder-support",
        polarity: "supports",
        observable: "两份带日期记录显示同一项冻结内容反复出现并可逐项核对",
        evidence_source: "contemporaneous_record",
      },
      {
        criterion_id: "K-placeholder-contradict",
        polarity: "contradicts",
        observable: "两份带日期记录显示冻结内容没有出现并记录了不同现实机制",
        evidence_source: "contemporaneous_record",
      },
    ],
  };
}

function bindClosedZiwei(scope) {
  const phase = scope === "phase_topic_synthesis";
  const calculation = calculate("ziwei", {
    ...BIRTH,
    ...(phase ? { target_date: "2026-08-23" } : {}),
  });
  const profile = interpretationProfile();
  const topic = "career_study";
  let unit;
  let factIds;
  let ruleId;
  if (scope === "topic_synthesis") {
    unit = calculation.facts.topic_units.find((item) => item.topic === topic);
    factIds = [unit.fact_id, unit.relation_fact_id, ...unit.component_palace_ids];
    ruleId = "R-ZW-007";
  } else if (scope === "topic_transformation") {
    unit = calculation.facts.topic_units.find((item) => item.topic === topic);
    const transformations = unit.natal_mutagen_fact_ids.map((factId) =>
      calculation.facts.structure.mutagen_locations.find((item) => item.fact_id === factId));
    assert.ok(transformations.length > 0 && transformations.every(Boolean));
    factIds = [...new Set([
      unit.fact_id,
      unit.primary_palace_id,
      ...transformations.flatMap((item) => [item.palace_id, item.fact_id]),
    ])];
    ruleId = "R-ZW-008";
  } else {
    unit = calculation.facts.phase_topic_units.find((item) => item.topic === topic);
    const natalUnit = calculation.facts.topic_units.find(
      (item) => item.fact_id === unit.natal_topic_unit_id,
    );
    factIds = [...new Set([
      unit.fact_id,
      unit.natal_topic_unit_id,
      unit.natal_palace_id,
      natalUnit.relation_fact_id,
      ...natalUnit.component_palace_ids,
      unit.target_fact_id,
      unit.phase_validity_fact_id,
      unit.decadal_star_palace_id,
      unit.yearly_star_palace_id,
      ...unit.decadal_component_star_palace_ids,
      ...unit.yearly_component_star_palace_ids,
      ...unit.decadal_transformation_fact_ids,
      ...unit.yearly_transformation_fact_ids,
    ])];
    ruleId = "R-ZW-009";
  }
  const statement = `准备生成 ${ruleId} 的机器绑定结果。`;
  return bindReadingToCalculations({
    calculation,
    reading: {
      system: "ziwei",
      level: "standard",
      title: "紫微主题核对",
      user_focus: "事业与学习",
      disclaimer: "紫微斗数属于传统解释体系，不是经过验证的事件预测。",
      summary: statement,
      uncertainty_summary: "只核对固定主题，不生成具体事件。",
      claims: [{
        claim_id: `C-schema-${ruleId.toLowerCase()}`,
        statement,
        topic,
        epistemic_status: "interpretation",
        system: "ziwei",
        profile: calculation.profile.id,
        scope,
        fact_ids: factIds,
        rule_ids: [ruleId],
        topic_unit_id: unit.fact_id,
        calculation_certainty: "high",
        input_sensitivity: { label: "stable", coverage: null },
        school_stability: "profile_specific",
        source_status: "verified",
        source_ids: ruleId === "R-ZW-008"
          ? ["SRC-ZW-IZTRO-2.6.0", "SRC-ZW-IZTRO-MUTAGEN-GUIDE"]
          : ruleId === "R-ZW-009"
            ? ["SRC-ZW-IZTRO-2.6.0", "SRC-ZW-IZTRO-PALACE-GUIDE", "SRC-ZW-IZTRO-HOROSCOPE-GUIDE"]
            : ["SRC-ZW-IZTRO-2.6.0", "SRC-ZW-IZTRO-PALACE-GUIDE"],
        interpretation_profile_id: profile.id,
        rule_pack_hash: profile.rule_pack_hash,
        assessment: placeholderAssessment(topic, phase ? "bounded_phase" : "current_reflection"),
      }],
      next_steps: [],
    },
  });
}

test("every published JSON Schema compiles under draft 2020-12", () => {
  const schemas = loadSchemas();
  const ajv = schemaValidator(schemas);
  schemas.forEach((schema) => {
    assert.equal(typeof ajv.getSchema(schema.$id), "function", `schema did not compile: ${schema.$id}`);
  });
});

test("bound R-ZW-007, R-ZW-008, and R-ZW-009 results satisfy the published schemas", () => {
  const schemas = loadSchemas();
  const ajv = schemaValidator(schemas);
  const validateReadingSchema = ajv.getSchema("urn:fortune-teller:schema:reading:3");
  const validateEvidenceCard = ajv.getSchema("urn:fortune-teller:schema:evidence-card:3");
  assert.equal(typeof validateReadingSchema, "function");
  assert.equal(typeof validateEvidenceCard, "function");

  for (const scope of ["topic_synthesis", "topic_transformation", "phase_topic_synthesis"]) {
    const payload = bindClosedZiwei(scope);
    const runtime = validateReading(payload);
    assert.equal(runtime.valid, true, runtime.errors.join("\n"));
    assert.equal(
      validateReadingSchema(payload.reading),
      true,
      ajv.errorsText(validateReadingSchema.errors, { separator: "\n" }),
    );
    for (const claim of payload.reading.claims) {
      assert.equal(
        validateEvidenceCard(claim),
        true,
        ajv.errorsText(validateEvidenceCard.errors, { separator: "\n" }),
      );
    }
  }
});

test("the published schema rejects an incomplete phase meaning binding", () => {
  const schemas = loadSchemas();
  const ajv = schemaValidator(schemas);
  const validateReadingSchema = ajv.getSchema("urn:fortune-teller:schema:reading:3");
  const payload = bindClosedZiwei("phase_topic_synthesis");
  delete payload.reading.claims[0].meaning_binding.phase.boundary_conventions;
  payload.reading.claims[0].meaning_binding.transformation_lenses = [];
  assert.equal(validateReadingSchema(payload.reading), false);
});
