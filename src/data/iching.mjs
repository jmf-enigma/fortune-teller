export const TRIGRAMS = {
  "111": { number: 1, name: "乾", symbol: "☰", image: "天", element: "金" },
  "110": { number: 2, name: "兑", symbol: "☱", image: "泽", element: "金" },
  "101": { number: 3, name: "离", symbol: "☲", image: "火", element: "火" },
  "100": { number: 4, name: "震", symbol: "☳", image: "雷", element: "木" },
  "011": { number: 5, name: "巽", symbol: "☴", image: "风", element: "木" },
  "010": { number: 6, name: "坎", symbol: "☵", image: "水", element: "水" },
  "001": { number: 7, name: "艮", symbol: "☶", image: "山", element: "土" },
  "000": { number: 8, name: "坤", symbol: "☷", image: "地", element: "土" },
};

const HEXAGRAM_NAMES = [
  null,
  "乾", "坤", "屯", "蒙", "需", "讼", "师", "比", "小畜", "履", "泰", "否", "同人", "大有", "谦", "豫",
  "随", "蛊", "临", "观", "噬嗑", "贲", "剥", "复", "无妄", "大畜", "颐", "大过", "坎", "离", "咸", "恒",
  "遁", "大壮", "晋", "明夷", "家人", "睽", "蹇", "解", "损", "益", "夬", "姤", "萃", "升", "困", "井",
  "革", "鼎", "震", "艮", "渐", "归妹", "丰", "旅", "巽", "兑", "涣", "节", "中孚", "小过", "既济", "未济",
];

const KING_WEN = {
  "111": { "111": 1, "110": 10, "101": 13, "100": 25, "011": 44, "010": 6, "001": 33, "000": 12 },
  "110": { "111": 43, "110": 58, "101": 49, "100": 17, "011": 28, "010": 47, "001": 31, "000": 45 },
  "101": { "111": 14, "110": 38, "101": 30, "100": 21, "011": 50, "010": 64, "001": 56, "000": 35 },
  "100": { "111": 34, "110": 54, "101": 55, "100": 51, "011": 32, "010": 40, "001": 62, "000": 16 },
  "011": { "111": 9, "110": 61, "101": 37, "100": 42, "011": 57, "010": 59, "001": 53, "000": 20 },
  "010": { "111": 5, "110": 60, "101": 63, "100": 3, "011": 48, "010": 29, "001": 39, "000": 8 },
  "001": { "111": 26, "110": 41, "101": 22, "100": 27, "011": 18, "010": 4, "001": 52, "000": 23 },
  "000": { "111": 11, "110": 19, "101": 36, "100": 24, "011": 46, "010": 7, "001": 15, "000": 2 },
};

export function trigramFromLines(linesBottomUp) {
  const key = linesBottomUp.map((value) => (value ? "1" : "0")).join("");
  const trigram = TRIGRAMS[key];
  if (!trigram) throw new Error(`invalid trigram lines: ${key}`);
  return { key, ...trigram };
}

export function hexagramFromLines(linesBottomUp) {
  if (!Array.isArray(linesBottomUp) || linesBottomUp.length !== 6) {
    throw new Error("a hexagram requires six bottom-up lines");
  }
  const lower = trigramFromLines(linesBottomUp.slice(0, 3));
  const upper = trigramFromLines(linesBottomUp.slice(3, 6));
  const number = KING_WEN[upper.key][lower.key];
  return {
    king_wen_number: number,
    name: HEXAGRAM_NAMES[number],
    upper_trigram: upper,
    lower_trigram: lower,
    lines_bottom_up: linesBottomUp.map(Boolean),
  };
}

export function trigramByNumber(number) {
  const match = Object.values(TRIGRAMS).find((item) => item.number === number);
  if (!match) throw new Error(`invalid trigram number: ${number}`);
  const key = Object.entries(TRIGRAMS).find(([, item]) => item.number === number)[0];
  return { key, ...match };
}
