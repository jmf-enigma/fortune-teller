/**
 * Bounded I Ching structural interpretation policy.
 *
 * This project does not package the received judgment text or the 384 line
 * texts.  The records below therefore govern selection and reflective framing
 * only; they are not substitutes for, translations of, or quotations from the
 * classic.
 */

export const ICHING_INTERPRETATION_META = Object.freeze({
  rulepack_id: "iching-structural-adjudication-v0.5",
  schema: "fortune-teller/iching-interpretation/v1",
  origin: "project_authored_structural_policy",
  rule_ids: Object.freeze(["R-YJ-001", "R-YJ-002", "R-YJ-003", "R-YJ-004", "R-YJ-005"]),
  line_order: "bottom_up",
  text_inventory: Object.freeze({
    judgment_texts_packaged: false,
    line_texts_packaged: false,
    use_nine_text_packaged: false,
    use_six_text_packaged: false,
  }),
  prohibitions: Object.freeze([
    "do not invent, paraphrase as quotation, or attribute an unbundled judgment or line text",
    "do not convert a structural casting into a certain event, date, probability, or command",
    "do not rank multiple changing lines unless a separately named profile supplies that rule",
  ]),
});

export const ICHING_LINE_STAGES = Object.freeze({
  1: Object.freeze({ label: "起点", plain_zh: "事情刚开始成形，先看动机、入口和第一步是否站得住。" }),
  2: Object.freeze({ label: "内在成形", plain_zh: "事情进入内部配合阶段，先看资源、基本功和日常执行。" }),
  3: Object.freeze({ label: "内外关口", plain_zh: "事情来到由内向外的门槛，最需要处理冒进、卡点和转换成本。" }),
  4: Object.freeze({ label: "进入外部", plain_zh: "事情已经接触外部环境，先看关系、规则和反馈能否接住。" }),
  5: Object.freeze({ label: "中枢协调", plain_zh: "事情来到统筹位置，先看责任、取舍和不同力量怎样协调。" }),
  6: Object.freeze({ label: "阶段收束", plain_zh: "事情走到一轮发展的上限，先看如何收尾、转向或避免过度。" }),
});

export const ICHING_TRIGRAM_FRAMES = Object.freeze({
  "乾": Object.freeze({ image: "天", process_zh: "主动、建立原则并持续推进" }),
  "兑": Object.freeze({ image: "泽", process_zh: "交流、交换并检验彼此是否真正同意" }),
  "离": Object.freeze({ image: "火", process_zh: "辨明、呈现并依托清楚的条件" }),
  "震": Object.freeze({ image: "雷", process_zh: "启动、受惊而动并把反应转成行动" }),
  "巽": Object.freeze({ image: "风", process_zh: "逐步进入、反复沟通并积累影响" }),
  "坎": Object.freeze({ image: "水", process_zh: "面对风险、保持流动并寻找可通过的路径" }),
  "艮": Object.freeze({ image: "山", process_zh: "设边界、暂停并判断何处应当止步" }),
  "坤": Object.freeze({ image: "地", process_zh: "承接、配合并为事情提供可持续的基础" }),
});

function yinYang(value) {
  return value === 7 || value === 9 ? "yang" : "yin";
}

function changing(value) {
  return value === 6 || value === 9;
}

function readingSelector(lines) {
  const changingLines = lines.flatMap((value, index) => (changing(value) ? [index + 1] : []));
  if (changingLines.length === 0) {
    return {
      mode: "primary_whole_only",
      selected_line_positions: [],
      primary_role: "current_structure",
      transformed_role: "same_structure_not_a_separate_change_claim",
      protocol_zh: "无动爻：只把本卦整体结构作为本轮反思框架，不虚构一条主爻。",
    };
  }
  if (changingLines.length === 1) {
    return {
      mode: "single_changing_line",
      selected_line_positions: changingLines,
      primary_role: "current_structure",
      transformed_role: "direction_after_the_single_change",
      protocol_zh: `一爻动：以自下而上第${changingLines[0]}爻的阶段为变化焦点，同时保留本卦和变卦的整体背景。`,
    };
  }
  if (changingLines.length < 6) {
    return {
      mode: "multiple_changing_lines_parallel_unranked",
      selected_line_positions: changingLines,
      primary_role: "current_structure",
      transformed_role: "combined_direction_after_all_recorded_changes",
      protocol_zh: `多爻动：按自下而上顺序并列核对第${changingLines.join("、")}爻，不在没有登记规则时擅自挑一条当主爻。`,
    };
  }
  const allNine = lines.every((value) => value === 9);
  const allSix = lines.every((value) => value === 6);
  if (allNine || allSix) {
    return {
      mode: allNine ? "all_nine_use_nine_marker" : "all_six_use_six_marker",
      selected_line_positions: changingLines,
      primary_role: "current_structure_at_full_transition",
      transformed_role: "opposite_structure_after_full_transition",
      special_marker: allNine ? "use_nine" : "use_six",
      special_text_status: "not_packaged_do_not_invent",
      protocol_zh: allNine
        ? "六爻皆九：记录“用九”取用标记，但本项目未打包用九原文，不能补写或伪引。"
        : "六爻皆六：记录“用六”取用标记，但本项目未打包用六原文，不能补写或伪引。",
    };
  }
  return {
    mode: "all_six_changing_parallel_unranked",
    selected_line_positions: changingLines,
    primary_role: "current_structure_at_full_transition",
    transformed_role: "combined_direction_after_all_six_changes",
    protocol_zh: "六爻皆动但并非纯九或纯六：六个阶段并列核对，不借用“用九”或“用六”，也不擅自排序。",
  };
}

function lineFeatures(lines) {
  return lines.map((value, index) => {
    const position = index + 1;
    const pairPosition = position <= 3 ? position + 3 : position - 3;
    const polarity = yinYang(value);
    const counterpartPolarity = yinYang(lines[pairPosition - 1]);
    return {
      line_fact_id: `F-YJ-L${position}`,
      position_from_bottom: position,
      value,
      polarity,
      changing: changing(value),
      central: position === 2 || position === 5,
      correct_position: (position % 2 === 1 && polarity === "yang") || (position % 2 === 0 && polarity === "yin"),
      correspondence_position: pairPosition,
      correspondence_line_fact_id: `F-YJ-L${pairPosition}`,
      correspondence: polarity !== counterpartPolarity,
    };
  });
}

export function buildIChingStructure(lines, primary, transformed) {
  if (!Array.isArray(lines) || lines.length !== 6 || lines.some((value) => ![6, 7, 8, 9].includes(value))) {
    throw new TypeError("I Ching structure requires six canonical line values");
  }
  return {
    changing_line_count: lines.filter(changing).length,
    reading_selector: readingSelector(lines),
    line_features: lineFeatures(lines),
    classic_text_status: {
      judgment_texts: "not_packaged",
      line_texts_384: "not_packaged",
      special_use_nine_six_texts: "not_packaged",
      policy: "structure_only_do_not_invent_or_quote",
    },
    identity_check: {
      primary_number: primary.king_wen_number,
      transformed_number: transformed.king_wen_number,
    },
  };
}
