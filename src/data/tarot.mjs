const MAJORS = [
  ["The Fool", "愚人", "beginning, openness, leap of faith", "recklessness, hesitation, poor preparation"],
  ["The Magician", "魔术师", "agency, skill, focused action", "manipulation, scattered ability, unused tools"],
  ["The High Priestess", "女祭司", "intuition, silence, hidden knowledge", "disconnection from intuition, secrecy, noise"],
  ["The Empress", "皇后", "nurture, creativity, abundance", "overgiving, creative block, dependence"],
  ["The Emperor", "皇帝", "structure, authority, boundaries", "rigidity, domination, weak foundations"],
  ["The Hierophant", "教皇", "tradition, teaching, shared values", "dogma, rebellion, unconventional path"],
  ["The Lovers", "恋人", "choice, alignment, relationship", "misalignment, avoidance, conflicted values"],
  ["The Chariot", "战车", "direction, resolve, disciplined movement", "loss of control, aggression, stalled effort"],
  ["Strength", "力量", "courage, patience, gentle influence", "self-doubt, force, depleted confidence"],
  ["The Hermit", "隐士", "reflection, solitude, inner guidance", "isolation, avoidance, refusal of counsel"],
  ["Wheel of Fortune", "命运之轮", "cycle, change, turning point", "resistance to change, recurring pattern, setback"],
  ["Justice", "正义", "accountability, balance, clear consequence", "bias, evasion, unfair process"],
  ["The Hanged Man", "倒吊人", "pause, new perspective, surrender", "stalling, needless sacrifice, fixed view"],
  ["Death", "死神", "ending, transition, release", "clinging, delayed ending, fear of change"],
  ["Temperance", "节制", "integration, moderation, adjustment", "excess, mismatch, poor pacing"],
  ["The Devil", "恶魔", "attachment, compulsion, constrained choice", "recognition, release, reclaiming agency"],
  ["The Tower", "高塔", "disruption, revelation, unstable structure", "avoided reckoning, lingering instability, fear"],
  ["The Star", "星星", "hope, renewal, orientation", "discouragement, disconnection, unrealistic hope"],
  ["The Moon", "月亮", "ambiguity, imagination, uncertainty", "clarification, exposed fear, confusion easing"],
  ["The Sun", "太阳", "clarity, vitality, openness", "temporary cloud, overconfidence, delayed joy"],
  ["Judgement", "审判", "review, awakening, consequential choice", "self-reproach, ignored call, poor review"],
  ["The World", "世界", "completion, integration, wider horizon", "unfinished work, delay, missing closure"],
];

const RANKS = ["Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Page", "Knight", "Queen", "King"];
const RANKS_ZH = ["王牌", "二", "三", "四", "五", "六", "七", "八", "九", "十", "侍从", "骑士", "王后", "国王"];

const SUITS = {
  Wands: {
    zh: "权杖",
    meanings: [
      ["inspiration, initiative", "delayed spark, false start"], ["planning, possibility", "fear of the unknown, poor plan"],
      ["expansion, foresight", "delay, limited horizon"], ["celebration, stable base", "instability, private conflict"],
      ["competition, friction", "conflict avoidance, unresolved tension"], ["recognition, progress", "ego, recognition delayed"],
      ["defence, conviction", "overwhelm, giving ground"], ["swift movement, message", "delay, scattered motion"],
      ["resilience, boundary", "exhaustion, defensiveness"], ["burden, responsibility", "release, delegation"],
      ["exploration, news", "scattered energy, immature plan"], ["pursuit, adventure", "haste, inconsistency"],
      ["confidence, warmth", "jealousy, brittle confidence"], ["vision, leadership", "impulsive control, arrogance"],
    ],
  },
  Cups: {
    zh: "圣杯",
    meanings: [
      ["emotional opening, connection", "blocked feeling, emotional drain"], ["partnership, reciprocity", "imbalance, disconnect"],
      ["friendship, shared joy", "overindulgence, group tension"], ["contemplation, reevaluation", "renewed interest, restlessness"],
      ["grief, disappointment", "acceptance, gradual recovery"], ["memory, generosity", "stuck in the past, idealization"],
      ["choices, imagination", "clarity, narrowed options"], ["leaving, changed priority", "avoidance, fear of departure"],
      ["satisfaction, gratitude", "dissatisfaction, overindulgence"], ["harmony, belonging", "fractured bond, unrealistic ideal"],
      ["sensitivity, invitation", "emotional immaturity, escapism"], ["romance, invitation", "unrealistic ideal, moodiness"],
      ["empathy, intuition", "poor boundaries, emotional overload"], ["emotional balance, diplomacy", "suppression, manipulation"],
    ],
  },
  Swords: {
    zh: "宝剑",
    meanings: [
      ["clarity, decisive idea", "confusion, misuse of insight"], ["stalemate, guarded choice", "information overload, decision emerging"],
      ["heartbreak, painful truth", "recovery, grief processing"], ["rest, recovery", "burnout, restless return"],
      ["hollow victory, conflict", "reconciliation, lingering resentment"], ["transition, passage", "resistance, unfinished baggage"],
      ["strategy, discretion", "exposure, self-deception"], ["restriction, constrained view", "new perspective, release"],
      ["anxiety, rumination", "worry easing, seeking support"], ["ending, limit reached", "recovery, resisting closure"],
      ["curiosity, vigilance", "gossip, unfocused thought"], ["direct action, speed", "aggression, impulsive speech"],
      ["discernment, independence", "bitterness, harsh judgement"], ["reason, ethical authority", "misused authority, cold control"],
    ],
  },
  Pentacles: {
    zh: "星币",
    meanings: [
      ["material opportunity, seed", "missed chance, weak foundation"], ["balance, adaptation", "overload, disorganization"],
      ["collaboration, craft", "poor teamwork, low standard"], ["security, conservation", "possessiveness, release"],
      ["hardship, exclusion", "recovery, help becoming visible"], ["exchange, support", "strings attached, unequal power"],
      ["patience, assessment", "poor return, impatience"], ["craft, practice", "perfectionism, repetitive work"],
      ["independence, earned comfort", "dependence, superficial display"], ["legacy, durable support", "family strain, fragile legacy"],
      ["study, practical news", "procrastination, weak follow-through"], ["reliability, routine", "stagnation, stubbornness"],
      ["practical care, resourcefulness", "self-neglect, smothering control"], ["stewardship, stability", "materialism, poor stewardship"],
    ],
  },
};

export const TAROT_DECK = [
  ...MAJORS.map(([title, titleZh, upright, reversed], index) => ({
    id: `major-${String(index).padStart(2, "0")}`,
    arcana: "major",
    number: index,
    title,
    title_zh: titleZh,
    upright,
    reversed,
  })),
  ...Object.entries(SUITS).flatMap(([suit, definition]) => RANKS.map((rank, index) => ({
    id: `${suit.toLowerCase()}-${rank.toLowerCase()}`,
    arcana: "minor",
    suit: suit.toLowerCase(),
    suit_zh: definition.zh,
    rank: rank.toLowerCase(),
    title: `${rank} of ${suit}`,
    title_zh: `${definition.zh}${RANKS_ZH[index]}`,
    upright: definition.meanings[index][0],
    reversed: definition.meanings[index][1],
  }))),
];

export function findTarotCard(value) {
  const key = String(value || "").trim().toLowerCase();
  return TAROT_DECK.find((card) => card.id === key || card.title.toLowerCase() === key || card.title_zh === String(value || "").trim()) || null;
}
