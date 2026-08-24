import {
  getZiweiAdjudicationCandidate,
  getZiweiAdjudicationProfile,
  getZiweiPhaseTopic,
  ZIWEI_ADJUDICATION_RULEPACK_META,
  ZIWEI_ADJUDICATION_STATES,
  ZIWEI_EMPTY_PALACE_RULE,
  ZIWEI_EVIDENCE_STATUSES,
  ZIWEI_STATE_LANGUAGE,
} from "../data/ziwei-adjudication-rulepack.mjs";
import { verifyCalculationFacts } from "./calculation-verifier.mjs";
import { verifyCalculationEnvelope } from "./result.mjs";

const CONDITION_NAMES = Object.freeze(["establish", "damage", "break", "rescue"]);
const LAYER_NAMES = Object.freeze(["natal", "decadal", "yearly"]);

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function fail(message) {
  throw new TypeError(`Zi Wei adjudication: ${message}`);
}

function strings(value, label, { allowEmpty = true } = {}) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item)) {
    fail(`${label} must be an array of non-empty strings`);
  }
  if (!allowEmpty && value.length === 0) fail(`${label} must not be empty`);
  if (new Set(value).size !== value.length) fail(`${label} must not contain duplicates`);
  return [...value];
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function sameStrings(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameStringSet(left, right) {
  return left.length === right.length && left.every((value) => right.includes(value));
}

function ziweiCalculationErrors(calculation) {
  if (!isRecord(calculation)) return ["calculation is required"];
  if (calculation.system !== "ziwei") return ["calculation must be a Zi Wei envelope"];
  const envelopeErrors = verifyCalculationEnvelope(calculation);
  const replay = verifyCalculationFacts(calculation);
  return [...envelopeErrors, ...replay.errors];
}

function ensureReplayVerifiedZiwei(calculation) {
  const errors = ziweiCalculationErrors(calculation);
  if (errors.length > 0) fail(`calculation is not replay-verifiable: ${errors.join("; ")}`);
  return calculation.reproducibility_hash;
}

function exactlyOne(values, predicate) {
  if (!Array.isArray(values)) return null;
  const matches = values.filter(predicate);
  return matches.length === 1 ? matches[0] : null;
}

function topicStructure(calculation, topic) {
  const unit = exactlyOne(calculation.facts?.topic_units, (item) => item?.topic === topic);
  if (!unit) return { ok: false, reason: "the selected topic does not resolve to exactly one topic unit" };
  const relation = exactlyOne(
    calculation.facts?.structure?.palace_relations,
    (item) => item?.fact_id === unit.relation_fact_id,
  );
  const componentIds = Array.isArray(unit.component_palace_ids) ? unit.component_palace_ids : [];
  const relationIds = Array.isArray(relation?.four_directions_palace_ids)
    ? relation.four_directions_palace_ids : [];
  const palaceIds = new Set((calculation.facts?.palaces || []).map((palace) => palace?.fact_id));
  const structurallyExact = relation
    && componentIds.length === 4
    && new Set(componentIds).size === 4
    && componentIds[0] === unit.primary_palace_id
    && relation.focus_palace_id === unit.primary_palace_id
    && sameStrings(componentIds, relationIds)
    && componentIds.every((factId) => palaceIds.has(factId));
  if (!structurallyExact) {
    return { ok: false, reason: "the selected topic does not contain one exact replayed four-palace structure" };
  }
  return {
    ok: true,
    unit,
    relation,
    component_ids: componentIds,
    fact_ids: [unit.fact_id, relation.fact_id, ...componentIds],
  };
}

function conditionKeys(candidate, conditionName) {
  const spec = candidate.conditions[conditionName];
  const operator = conditionName === "establish" || conditionName === "rescue" ? "all_of" : "any_of";
  return spec?.[operator] || [];
}

function registeredCandidate(candidateId, topic, expectedProfileId) {
  if (typeof candidateId !== "string" || !candidateId) {
    fail("candidate_id is required; caller-supplied candidate objects are not accepted");
  }
  const candidate = getZiweiAdjudicationCandidate(candidateId);
  if (!candidate) fail(`candidate_id ${candidateId} is not in the immutable registry`);
  if (candidate.profile_id !== expectedProfileId) {
    fail(`candidate ${candidateId} belongs to profile ${candidate.profile_id}, not ${expectedProfileId}`);
  }
  if (!getZiweiPhaseTopic(topic) || !candidate.topics.includes(topic)) {
    fail(`topic ${String(topic)} is not registered for candidate ${candidateId}`);
  }
  return candidate;
}

function derivePredicate(candidate, key, calculation, topic) {
  const predicate = candidate.predicates[key];
  if (!predicate) fail(`candidate ${candidate.pattern_id} has no registered predicate ${key}`);
  const structure = topicStructure(calculation, topic);
  if (!structure.ok) {
    return {
      key,
      status: "uncertain",
      evidence_kind: predicate.evidence_kind,
      fact_ids: [],
      technical_zh: structure.reason,
    };
  }
  if (predicate.resolver === "complete_topic_structure") {
    return {
      key,
      status: "present",
      evidence_kind: predicate.evidence_kind,
      fact_ids: [...structure.fact_ids],
      technical_zh: "主题单元、主宫、两组三方、对宫及四宫关系由同一可重放排盘精确对应。",
    };
  }
  if (predicate.resolver === "complete_topic_transformations") {
    const listedIds = Array.isArray(structure.unit.natal_mutagen_fact_ids)
      ? structure.unit.natal_mutagen_fact_ids : [];
    const componentIds = new Set(structure.component_ids);
    const expectedIds = (calculation.facts?.structure?.mutagen_locations || [])
      .filter((item) => componentIds.has(item?.palace_id))
      .map((item) => item.fact_id);
    if (!sameStrings(listedIds, expectedIds)) {
      return {
        key,
        status: "uncertain",
        evidence_kind: predicate.evidence_kind,
        fact_ids: [],
        technical_zh: "主题单元所列本命四化与同一四宫结构中的重放事实不一致。",
      };
    }
    return {
      key,
      status: listedIds.length > 0 ? "present" : "absent",
      evidence_kind: predicate.evidence_kind,
      fact_ids: listedIds.length > 0 ? [...structure.fact_ids, ...listedIds] : [],
      technical_zh: listedIds.length > 0
        ? "主题四宫内每一条本命四化位置均由同一可重放排盘完整列出。"
        : "该主题四宫没有本命四化位置事实，不能建立四化过程结构。",
    };
  }
  fail(`candidate predicate ${key} uses an unsupported resolver`);
}

function deriveEvidence(candidate, calculation, topic) {
  const referenced = CONDITION_NAMES.flatMap((name) => conditionKeys(candidate, name));
  const records = referenced.map((key) => derivePredicate(candidate, key, calculation, topic));
  return new Map(records.map((record) => [record.key, {
    records: [record],
    statuses: new Set([record.status]),
  }]));
}

function verifyEvidenceAssertions(records, candidate, derived) {
  if (records == null) return;
  if (!Array.isArray(records)) fail("evidence must be an array when supplied");
  const referenced = CONDITION_NAMES.flatMap((name) => conditionKeys(candidate, name));
  if (records.length !== referenced.length) {
    fail("evidence assertions must cover every registered predicate exactly once");
  }
  const seen = new Set();
  for (const record of records) {
    if (!isRecord(record) || typeof record.key !== "string" || !record.key) {
      fail("each evidence assertion must name one registered predicate key");
    }
    if (seen.has(record.key)) fail(`evidence predicate ${record.key} must not be repeated`);
    seen.add(record.key);
    const expected = derived.get(record.key)?.records?.[0];
    if (!expected) fail(`evidence key ${record.key} is not registered by candidate ${candidate.pattern_id}`);
    if (!ZIWEI_EVIDENCE_STATUSES.includes(record.status)) {
      fail(`evidence ${record.key} has unsupported status ${String(record.status)}`);
    }
    const factIds = strings(record.fact_ids ?? [], `evidence ${record.key}.fact_ids`, {
      allowEmpty: record.status !== "present",
    });
    if (
      record.evidence_kind !== expected.evidence_kind
      || record.status !== expected.status
      || !sameStringSet(factIds, expected.fact_ids)
    ) {
      fail(`evidence ${record.key} does not exactly match its replay-derived kind, status, and fact paths`);
    }
  }
}

function statusFor(byKey, key) {
  const group = byKey.get(key);
  if (!group) return "missing";
  if (group.statuses.size > 1) return "conflict";
  return [...group.statuses][0];
}

function presentKeys(keys, byKey) {
  return keys.filter((key) => statusFor(byKey, key) === "present");
}

function stateRevisionConditions(state, missingEstablish, activeDamage, activeBreak, missingRescue) {
  if (state === "candidate") {
    return [`补齐并核验成立条件：${missingEstablish.join("、") || "无"}`];
  }
  if (state === "established") {
    return ["若出现已登记的受损或破格条件，结论必须下调。"];
  }
  if (state === "damaged") {
    return [
      `若受损条件被校正或不再成立，可回到成立：${activeDamage.join("、")}`,
      "若出现已登记的破格条件，必须改判为破格。",
    ];
  }
  if (state === "broken") {
    return [`只有完整出现解救链才可改判：${missingRescue.join("、") || "该规则未登记解救条件"}`];
  }
  if (state === "rescued") {
    return ["若任一解救条件撤销，结论立即回到破格；解救不抹去原破格条件。"];
  }
  return ["先校正不确定或互相冲突的证据，再从候选状态重新裁决。"];
}

function technicalEvidence(keys, byKey) {
  return keys.flatMap((key) => (byKey.get(key)?.records || []).map((record) => ({
    predicate: key,
    status: record.status,
    evidence_kind: record.evidence_kind,
    fact_ids: [...record.fact_ids],
    ...(record.technical_zh ? { basis_zh: record.technical_zh } : {}),
  })));
}

/**
 * Adjudicate one immutable, profile-specific registry candidate. Predicate
 * statuses and fact paths are derived from a replay-verified calculation;
 * optional evidence is only an exact assertion against that derivation.
 */
export function adjudicateZiweiPattern(request) {
  if (!isRecord(request)) fail("pattern request must be an object");
  if (Object.hasOwn(request, "candidate")) {
    fail("caller-supplied candidate objects are not accepted; use one immutable candidate_id");
  }
  const {
    profile_id: profileId,
    candidate_id: candidateId,
    topic,
    evidence = null,
    calculation = null,
  } = request;
  const profile = getZiweiAdjudicationProfile(profileId);
  if (!profile) fail(`unknown profile ${String(profileId)}`);
  const normalizedCandidate = registeredCandidate(candidateId, topic, profileId);
  const calculationRef = ensureReplayVerifiedZiwei(calculation);
  const byKey = deriveEvidence(normalizedCandidate, calculation, topic);
  verifyEvidenceAssertions(evidence, normalizedCandidate, byKey);
  const referenced = CONDITION_NAMES.flatMap((name) => conditionKeys(normalizedCandidate, name));

  const establishKeys = conditionKeys(normalizedCandidate, "establish");
  const damageKeys = conditionKeys(normalizedCandidate, "damage");
  const breakKeys = conditionKeys(normalizedCandidate, "break");
  const rescueKeys = conditionKeys(normalizedCandidate, "rescue");
  const missingEstablish = establishKeys.filter((key) => statusFor(byKey, key) !== "present");
  const activeDamage = presentKeys(damageKeys, byKey);
  const activeBreak = presentKeys(breakKeys, byKey);
  const activeRescue = presentKeys(rescueKeys, byKey);
  const missingRescue = rescueKeys.filter((key) => statusFor(byKey, key) !== "present");
  const materialAmbiguity = referenced.filter((key) => ["uncertain", "conflict"].includes(statusFor(byKey, key)));

  const statePath = ["candidate"];
  let state = "candidate";
  if (missingEstablish.length === 0) {
    state = "established";
    statePath.push(state);
    if (activeDamage.length > 0 || activeBreak.length > 0) {
      state = "damaged";
      statePath.push(state);
    }
    if (activeBreak.length > 0) {
      state = "broken";
      statePath.push(state);
      if (rescueKeys.length > 0 && activeRescue.length === rescueKeys.length) {
        state = "rescued";
        statePath.push(state);
      }
    }
  }
  if (materialAmbiguity.length > 0) {
    state = "unresolved";
    statePath.push(state);
  }
  if (!ZIWEI_ADJUDICATION_STATES.includes(state)) fail("internal state is invalid");

  const language = ZIWEI_STATE_LANGUAGE[state];
  const checks = normalizedCandidate.reality_checks_zh.length > 0
    ? normalizedCandidate.reality_checks_zh
    : [
      "现实中是否持续出现这套结构描述的应对方式，而不是只出现一次巧合？",
      "有没有同样具体、但与本结论相反的记录？",
    ];
  return deepFreeze({
    schema: ZIWEI_ADJUDICATION_RULEPACK_META.schema,
    rulepack_id: ZIWEI_ADJUDICATION_RULEPACK_META.rulepack_id,
    profile: {
      profile_id: profile.profile_id,
      label_zh: profile.label_zh,
      independent: true,
      aggregation: "none",
    },
    pattern: {
      pattern_id: normalizedCandidate.pattern_id,
      label_zh: normalizedCandidate.label_zh,
      topic,
      claim_ceiling: normalizedCandidate.claim_ceiling,
    },
    state,
    state_path: statePath,
    conclusion_zh: `${normalizedCandidate.label_zh}：${language.conclusion_zh}`,
    plain_language_zh: language.plain_zh,
    technical_basis: {
      school_boundary_zh: profile.formation_boundary_zh,
      matched_establishment: presentKeys(establishKeys, byKey),
      missing_establishment: missingEstablish,
      active_damage: activeDamage,
      active_break: activeBreak,
      active_rescue: activeRescue,
      material_ambiguity: materialAmbiguity,
      evidence: technicalEvidence(referenced, byKey),
      calculation_ref: calculationRef,
      candidate_registry_locked: true,
    },
    change_conditions_zh: stateRevisionConditions(
      state,
      missingEstablish,
      activeDamage,
      activeBreak,
      missingRescue,
    ),
    reality_checks_zh: checks,
    boundary_zh: "这只裁决不可变注册表中的有限结构，不是完整命名格局语料库、统计概率或具体事件判断。",
  });
}

/**
 * Apply the sole bounded empty-palace borrowing rule without mutating either
 * palace fact. Re-running after a chart correction automatically revokes it.
 */
export function adjudicateZiweiEmptyPalace({
  profile_id: profileId,
  target_palace: targetPalace,
  relation,
  opposite_palace: oppositePalace,
  request = null,
}) {
  const profile = getZiweiAdjudicationProfile(profileId);
  if (!profile) fail(`unknown profile ${String(profileId)}`);
  for (const [label, value] of [["target_palace", targetPalace], ["relation", relation], ["opposite_palace", oppositePalace]]) {
    if (!isRecord(value) || typeof value.fact_id !== "string") fail(`${label} must be a calculation fact`);
  }
  const resultBase = {
    rule_id: ZIWEI_EMPTY_PALACE_RULE.rule_id,
    profile_id: profileId,
    target_palace: { fact_id: targetPalace.fact_id, name: targetPalace.name },
    source_palace: { fact_id: oppositePalace.fact_id, name: oppositePalace.name },
    use: ZIWEI_EMPTY_PALACE_RULE.use,
    borrowed_major_stars: [],
    change_conditions_zh: [
      "目标宫不再为空宫时立即撤销。",
      "对宫关系、来源宫或来源主星改变时立即重算。",
      "切换到不采用借星的流派时立即撤销。",
    ],
  };
  if (profile.empty_palace_policy === "not_used_for_transformation_routes") {
    return deepFreeze({ ...resultBase, status: "not_applicable", reason_zh: "飞星／四化路径直接看飞化路线，不借对宫主星补成星曜事实。" });
  }
  if (request?.explicit !== true) {
    return deepFreeze({ ...resultBase, status: "not_requested", reason_zh: "借星必须被明确请求，不能在后台静默补入。" });
  }
  const fields = strings(request.fields ?? [], "empty-palace request.fields", { allowEmpty: false });
  if (fields.length !== 1 || fields[0] !== "major_stars") {
    return deepFreeze({ ...resultBase, status: "rejected", reason_zh: "只允许有限借用对宫主星名称；亮度、四化、辅煞与宫干均不得搬移。" });
  }
  if (!Array.isArray(targetPalace.major_stars) || !Array.isArray(oppositePalace.major_stars)) {
    fail("both palace facts must contain major_stars arrays");
  }
  if (targetPalace.major_stars.length > 0) {
    return deepFreeze({ ...resultBase, status: "revoked", reason_zh: "目标宫已有本宫主星，不再满足空宫借星条件。" });
  }
  if (relation.focus_palace_id !== targetPalace.fact_id || relation.opposite_palace_id !== oppositePalace.fact_id) {
    return deepFreeze({ ...resultBase, status: "revoked", reason_zh: "所给宫位不再构成该目标宫的精确对宫关系。" });
  }
  if (oppositePalace.major_stars.length === 0) {
    return deepFreeze({ ...resultBase, status: "unavailable", reason_zh: "精确对宫也没有主星，不能继续转借或跨宫寻找。" });
  }
  const borrowed = oppositePalace.major_stars.map((star) => ({
    name: star.name,
    source_palace_id: oppositePalace.fact_id,
    source_palace: oppositePalace.name,
    borrowed_for: "context_only",
  }));
  return deepFreeze({
    ...resultBase,
    status: "applied",
    reason_zh: "目标宫为空，并已核对唯一对宫；只把对宫主星名称作为辅助语境，不改写本宫事实。",
    borrowed_major_stars: borrowed,
    forbidden_transfer: [...ZIWEI_EMPTY_PALACE_RULE.forbidden_fields],
  });
}

function phaseComponentIdsAreExact(period, ids, focusId) {
  const available = new Set((period?.star_palaces || []).map((slot) => slot?.fact_id));
  return Array.isArray(ids)
    && ids.length === 4
    && new Set(ids).size === 4
    && ids[0] === focusId
    && ids.every((factId) => available.has(factId));
}

function phaseExpectation(calculation, profile, topic) {
  const structure = topicStructure(calculation, topic);
  if (!structure.ok) return { ok: false, status: "unresolved", reason: structure.reason };
  const phaseUnit = exactlyOne(calculation.facts?.phase_topic_units, (item) => item?.topic === topic);
  const periods = calculation.facts?.periods;
  if (!phaseUnit || !isRecord(periods?.decadal) || !isRecord(periods?.yearly)) {
    return {
      ok: false,
      status: "insufficient",
      reason: "the replayed calculation has no complete target-date phase topic unit",
    };
  }
  const structurallyExact = phaseUnit.natal_topic_unit_id === structure.unit.fact_id
    && phaseUnit.natal_palace_id === structure.unit.primary_palace_id
    && phaseUnit.target_fact_id === periods.target?.fact_id
    && phaseUnit.phase_validity_fact_id === periods.phase_validity?.fact_id
    && phaseUnit.decadal_period_id === periods.decadal.fact_id
    && phaseUnit.yearly_period_id === periods.yearly.fact_id
    && sameStrings(phaseUnit.component_relation_offsets || [], [0, 4, 8, 6])
    && phaseComponentIdsAreExact(
      periods.decadal,
      phaseUnit.decadal_component_star_palace_ids,
      phaseUnit.decadal_star_palace_id,
    )
    && phaseComponentIdsAreExact(
      periods.yearly,
      phaseUnit.yearly_component_star_palace_ids,
      phaseUnit.yearly_star_palace_id,
    );
  if (!structurallyExact) {
    return {
      ok: false,
      status: "unresolved",
      reason: "the target-date topic unit does not replay as one exact natal-decadal-yearly structure",
    };
  }

  if (profile.phase_policy === "same_topic_transformations_in_all_three_layers") {
    const natalIds = Array.isArray(structure.unit.natal_mutagen_fact_ids)
      ? structure.unit.natal_mutagen_fact_ids : [];
    const decadalIds = Array.isArray(phaseUnit.decadal_transformation_fact_ids)
      ? phaseUnit.decadal_transformation_fact_ids : [];
    const yearlyIds = Array.isArray(phaseUnit.yearly_transformation_fact_ids)
      ? phaseUnit.yearly_transformation_fact_ids : [];
    const natalAvailable = new Set((calculation.facts?.structure?.mutagen_locations || []).map((item) => item?.fact_id));
    const decadalAvailable = new Set((periods.decadal.mutagens || []).map((item) => item?.fact_id));
    const yearlyAvailable = new Set((periods.yearly.mutagens || []).map((item) => item?.fact_id));
    const transformationsExact = natalIds.every((factId) => natalAvailable.has(factId))
      && decadalIds.every((factId) => decadalAvailable.has(factId))
      && yearlyIds.every((factId) => yearlyAvailable.has(factId));
    if (!transformationsExact) {
      return { ok: false, status: "unresolved", reason: "one phase transformation set contains a wrong-layer fact" };
    }
    if (natalIds.length === 0 || decadalIds.length === 0 || yearlyIds.length === 0) {
      return {
        ok: false,
        status: "insufficient",
        reason: "the flying-Sihua profile requires non-empty same-topic transformations in all three layers",
      };
    }
    return {
      ok: true,
      phase_unit_id: phaseUnit.fact_id,
      fact_ids_by_layer: {
        natal: [structure.unit.fact_id, ...natalIds],
        decadal: [periods.decadal.fact_id, phaseUnit.decadal_star_palace_id, ...decadalIds],
        yearly: [periods.yearly.fact_id, phaseUnit.yearly_star_palace_id, ...yearlyIds],
      },
    };
  }

  return {
    ok: true,
    phase_unit_id: phaseUnit.fact_id,
    fact_ids_by_layer: {
      natal: [...structure.fact_ids],
      decadal: [periods.decadal.fact_id, ...phaseUnit.decadal_component_star_palace_ids],
      yearly: [periods.yearly.fact_id, ...phaseUnit.yearly_component_star_palace_ids],
    },
  };
}

function normalizePhaseLayer(layer, name, topic, calculationRef, expectedFactIds) {
  if (!isRecord(layer)) {
    return { name, status: "absent", fact_ids: [], calculation_ref: null, validation_issues: ["layer is missing"] };
  }
  const suppliedStatus = layer.status ?? "present";
  if (!ZIWEI_EVIDENCE_STATUSES.includes(suppliedStatus)) fail(`phase ${name}.status is invalid`);
  const factIds = strings(layer.fact_ids ?? [], `phase ${name}.fact_ids`, {
    allowEmpty: suppliedStatus !== "present",
  });
  const issues = [];
  if (layer.topic !== topic) issues.push("topic does not match the selected registered topic");
  if (layer.calculation_ref !== calculationRef) issues.push("calculation_ref does not equal the verified envelope hash");
  if (suppliedStatus === "present" && !sameStringSet(factIds, expectedFactIds)) {
    issues.push("fact_ids do not equal the exact replay-derived facts for this layer");
  }
  return {
    name,
    status: issues.length > 0 ? "conflict" : suppliedStatus,
    fact_ids: factIds,
    calculation_ref: typeof layer.calculation_ref === "string" ? layer.calculation_ref : null,
    validation_issues: issues,
  };
}

function closedPhaseFailure(profileId, profile, topic, topicRecord, status, reason) {
  return deepFreeze({
    profile_id: profileId,
    profile_label_zh: profile.label_zh,
    topic,
    topic_label_zh: topicRecord.label_zh,
    status,
    independent: true,
    layers: LAYER_NAMES.map((name) => ({
      name,
      status: status === "insufficient" ? "absent" : "conflict",
      fact_ids: [],
      calculation_ref: null,
      validation_issues: [reason],
    })),
    specific_event: null,
    phase_theme_zh: null,
    conclusion_zh: status === "insufficient"
      ? "当前可重放排盘没有完整三层结构，暂不生成阶段主题。"
      : "三层证据无法与同一可重放排盘精确对应，阶段主题暂不裁决。",
    change_conditions_zh: ["重新提供带真实 envelope hash、完整主题结构和精确分层事实的 Ziwei 排盘。"],
    boundary_zh: "阶段主题必须由同一可重放排盘逐层证明；调用方标签、重复事实或自报 hash 不构成证据。",
  });
}

/**
 * Build a broad phase theme only when natal, decadal and yearly evidence are
 * all present, same-topic and from one frozen calculation. The wording comes
 * from the closed topic registry and therefore cannot echo a requested event.
 */
export function adjudicateZiweiPhase({ profile_id: profileId, topic, layers, calculation = null }) {
  const profile = getZiweiAdjudicationProfile(profileId);
  const topicRecord = getZiweiPhaseTopic(topic);
  if (!profile) fail(`unknown profile ${String(profileId)}`);
  if (!topicRecord) fail(`unknown phase topic ${String(topic)}`);
  if (!isRecord(layers)) fail("phase layers must be an object");
  const calculationErrors = ziweiCalculationErrors(calculation);
  if (calculationErrors.length > 0) {
    return closedPhaseFailure(
      profileId,
      profile,
      topic,
      topicRecord,
      calculation == null ? "insufficient" : "unresolved",
      calculationErrors.join("; "),
    );
  }
  const expectation = phaseExpectation(calculation, profile, topic);
  if (!expectation.ok) {
    return closedPhaseFailure(profileId, profile, topic, topicRecord, expectation.status, expectation.reason);
  }
  const calculationRef = calculation.reproducibility_hash;
  const normalized = LAYER_NAMES.map((name) => normalizePhaseLayer(
    layers[name],
    name,
    topic,
    calculationRef,
    expectation.fact_ids_by_layer[name],
  ));
  const seenAcrossLayers = new Map();
  for (const layer of normalized) {
    for (const factId of layer.fact_ids) {
      const previous = seenAcrossLayers.get(factId);
      if (previous && previous !== layer.name) {
        layer.status = "conflict";
        layer.validation_issues.push(`fact_id ${factId} is reused from ${previous}`);
        const previousLayer = normalized.find((item) => item.name === previous);
        previousLayer.status = "conflict";
        previousLayer.validation_issues.push(`fact_id ${factId} is reused by ${layer.name}`);
      } else seenAcrossLayers.set(factId, layer.name);
    }
  }
  const uncertain = normalized.some((layer) => ["uncertain", "conflict"].includes(layer.status));
  const complete = normalized.every((layer) => layer.status === "present" && layer.validation_issues.length === 0);
  const supported = complete && !uncertain;
  const status = uncertain ? "unresolved" : supported ? "supported" : "insufficient";
  const missing = normalized.filter((layer) => layer.status !== "present" || layer.fact_ids.length === 0).map((layer) => layer.name);
  const base = {
    profile_id: profileId,
    profile_label_zh: profile.label_zh,
    topic,
    topic_label_zh: topicRecord.label_zh,
    status,
    independent: true,
    layers: normalized,
    specific_event: null,
    boundary_zh: "阶段主题只表示同一主题在三层证据中同时显眼，不等于某件事必然发生。",
  };
  if (!supported) {
    return deepFreeze({
      ...base,
      phase_theme_zh: null,
      conclusion_zh: status === "unresolved" ? "三层证据互相冲突，阶段主题暂不裁决。" : "三层联合证据不完整，暂不生成阶段主题。",
      change_conditions_zh: status === "unresolved"
        ? ["核对真实 envelope hash、主题、分层事实路径及跨层重复后，从同一排盘重新裁决。"]
        : [`补齐同一主题的证据层：${missing.join("、")}`],
    });
  }
  return deepFreeze({
    ...base,
    phase_theme_zh: `${topicRecord.label_zh}在当前阶段反复变得显眼`,
    conclusion_zh: `本命看${topicRecord.natal_zh}；大限看${topicRecord.decadal_zh}；流年只作触发，表示${topicRecord.yearly_zh}。`,
    plain_language_zh: "这是“长期底色—阶段环境—当年触发”的联合主题，不是单凭流年猜一件具体大事。",
    technical_basis: {
      order: [...LAYER_NAMES],
      calculation_ref: calculationRef,
      calculation_replay_status: "replayed_facts",
      phase_unit_id: expectation.phase_unit_id,
      phase_policy: profile.phase_policy,
      fact_ids_by_layer: Object.fromEntries(normalized.map((layer) => [layer.name, layer.fact_ids])),
    },
    change_conditions_zh: ["任一层证据撤销、换题或换排盘时，阶段主题立即失效并重新裁决。"],
    reality_checks_zh: [
      "在这段时间内，是否有连续记录显示该主题确实比其他主题更占用注意力？",
      "是否存在同样具体的记录，显示阶段重点其实落在另一个主题？",
    ],
  });
}

/** Keep every school on its own rail; deliberately no combined verdict. */
export function adjudicateZiweiProfiles({ requests }) {
  if (!Array.isArray(requests) || requests.length === 0) fail("requests must be a non-empty array");
  const profiles = {};
  for (const request of requests) {
    if (!isRecord(request)) fail("each profile request must be an object");
    if (profiles[request.profile_id]) fail(`duplicate profile request ${request.profile_id}`);
    const formation = adjudicateZiweiPattern({
      profile_id: request.profile_id,
      candidate_id: request.candidate_id,
      topic: request.topic,
      evidence: request.evidence ?? null,
      calculation: request.calculation ?? null,
    });
    profiles[request.profile_id] = {
      profile: formation.profile,
      formation,
      ...(request.empty_palace ? { empty_palace: adjudicateZiweiEmptyPalace({ profile_id: request.profile_id, ...request.empty_palace }) } : {}),
      ...(request.phase ? { phase: adjudicateZiweiPhase({ profile_id: request.profile_id, ...request.phase, calculation: request.calculation ?? null }) } : {}),
    };
  }
  return deepFreeze({
    schema: ZIWEI_ADJUDICATION_RULEPACK_META.schema,
    rulepack_id: ZIWEI_ADJUDICATION_RULEPACK_META.rulepack_id,
    aggregation: "none",
    profiles,
    boundary_zh: "各流派分别作答；不投票、不平均，也不把多个传统判断伪装成概率。",
  });
}
