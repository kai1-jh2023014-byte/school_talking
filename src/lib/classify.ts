import type { Classification, Urgency } from "./types";

type TopicRule = {
  name: string;
  keys: string[];
};

type SubjectRule = {
  name: string;
  dept: string;
  keywords: string[];
  topics: TopicRule[];
};

export const SUBJECT_RULES: SubjectRule[] = [
  {
    name: "数学",
    dept: "数学科",
    keywords: [
      "数学",
      "数i",
      "数ａ",
      "数a",
      "数ii",
      "数b",
      "数iii",
      "計算",
      "方程式",
      "関数",
      "微分",
      "積分",
      "ベクトル",
      "証明",
      "不等式",
      "因数分解",
    ],
    topics: [
      {
        name: "二次関数",
        keys: ["二次関数", "2次関数", "最大値", "最小値", "頂点", "放物線", "平方完成"],
      },
      {
        name: "確率",
        keys: ["確率", "場合の数", "順列", "組合せ", "組み合わせ", "独立", "条件付き"],
      },
      {
        name: "図形",
        keys: ["図形", "三角", "円", "相似", "合同", "面積", "体積", "幾何"],
      },
      {
        name: "微分・積分",
        keys: ["微分", "積分", "導関数", "極限", "接線"],
      },
      {
        name: "三角関数",
        keys: ["三角比", "三角関数", "sin", "cos", "tan", "正弦", "余弦"],
      },
      {
        name: "数列",
        keys: ["数列", "漸化式", "等差", "等比", "シグマ"],
      },
      {
        name: "ベクトル",
        keys: ["ベクトル", "内積", "位置ベクトル"],
      },
      {
        name: "指数・対数",
        keys: ["指数", "対数", "log"],
      },
    ],
  },
  {
    name: "英語",
    dept: "英語科",
    keywords: [
      "英語",
      "英文",
      "grammar",
      "和訳",
      "英訳",
      "単語",
      "構文",
      "リスニング",
    ],
    topics: [
      {
        name: "関係詞",
        keys: ["関係詞", "関係代名詞", "関係副詞", "which", "who", "that節"],
      },
      {
        name: "仮定法",
        keys: ["仮定法", "if節", "were", "wish", "as if"],
      },
      {
        name: "長文読解",
        keys: ["長文", "読解", "内容一致", "パラグラフ", "要旨"],
      },
      {
        name: "不定詞・動名詞",
        keys: ["不定詞", "動名詞", "to不定詞", "ing"],
      },
      {
        name: "分詞",
        keys: ["分詞", "分詞構文", "過去分詞", "現在分詞"],
      },
      {
        name: "英作文",
        keys: ["英作文", "英作", "自由英作", "和文英訳"],
      },
    ],
  },
  {
    name: "国語",
    dept: "国語科",
    keywords: ["国語", "現代文", "古文", "漢文", "評論文", "小説", "漢字", "文法"],
    topics: [
      { name: "現代文", keys: ["現代文", "評論文", "小説", "要約", "傍線部"] },
      { name: "古文", keys: ["古文", "助動詞", "和歌", "古典"] },
      { name: "漢文", keys: ["漢文", "返り点", "書き下し", "句法"] },
    ],
  },
  {
    name: "理科",
    dept: "理科",
    keywords: [
      "理科",
      "物理",
      "化学",
      "生物",
      "地学",
      "実験",
      "反応",
      "力学",
      "電流",
    ],
    topics: [
      { name: "化学", keys: ["化学", "モル", "イオン", "酸化", "還元", "有機", "周期"] },
      { name: "物理", keys: ["物理", "力学", "運動", "エネルギー", "電気", "波"] },
      { name: "生物", keys: ["生物", "細胞", "遺伝子", "dna", "光合成", "進化"] },
      { name: "地学", keys: ["地学", "地層", "地震", "天気", "宇宙"] },
    ],
  },
  {
    name: "社会",
    dept: "社会科",
    keywords: [
      "社会",
      "歴史",
      "地理",
      "公民",
      "政治",
      "経済",
      "倫理",
      "日本史",
      "世界史",
    ],
    topics: [
      { name: "日本史", keys: ["日本史", "幕府", "戦国", "明治", "平安", "鎌倉"] },
      { name: "世界史", keys: ["世界史", "革命", "戦争", "帝国", "冷戦"] },
      { name: "地理", keys: ["地理", "気候", "地形", "産業", "地図"] },
      { name: "政治・経済", keys: ["政治", "経済", "憲法", "選挙", "gdp"] },
    ],
  },
  {
    name: "情報",
    dept: "情報科",
    keywords: ["情報", "プログラミング", "python", "ネットワーク", "表計算"],
    topics: [
      { name: "プログラミング", keys: ["プログラム", "python", "変数", "ループ"] },
      { name: "ネットワーク", keys: ["ネットワーク", "インターネット", "ip"] },
    ],
  },
];

const HIGH_URGENCY =
  /明日|今日|テスト|試験|提出|締切|締め切り|急いで|今すぐ|授業中|期末|中間/;
const LOW_URGENCY = /予習|興味|余裕|いつか|気が向いた/;

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "");
}

function countHits(haystack: string, keys: string[]): { hits: number; matched: string[] } {
  const matched: string[] = [];
  for (const key of keys) {
    if (haystack.includes(key.toLowerCase())) matched.push(key);
  }
  return { hits: matched.length, matched };
}

function detectUrgency(text: string): Urgency {
  if (HIGH_URGENCY.test(text)) return "high";
  if (LOW_URGENCY.test(text)) return "low";
  return "normal";
}

function makeSummary(body: string, subject: string, topic: string): string {
  const compact = body.replace(/\s+/g, " ").trim();
  if (compact.length <= 42) return compact;
  return `${subject}の${topic}についての質問`;
}

export function classifyQuestion(body: string): Classification {
  const text = body.trim();
  const haystack = normalize(text);
  const reasons: string[] = [];

  let bestSubject = SUBJECT_RULES[0];
  let bestSubjectHits = 0;
  let subjectMatched: string[] = [];

  for (const rule of SUBJECT_RULES) {
    const { hits, matched } = countHits(haystack, rule.keywords);
    let topicBonus = 0;
    for (const topic of rule.topics) {
      topicBonus += countHits(haystack, topic.keys).hits;
    }
    const score = hits * 2 + topicBonus * 3;
    if (score > bestSubjectHits) {
      bestSubjectHits = score;
      bestSubject = rule;
      subjectMatched = matched;
    }
  }

  if (bestSubjectHits === 0) {
    return {
      subject: "その他",
      topic: "一般",
      summary: makeSummary(text, "学校生活", "相談"),
      urgency: detectUrgency(text),
      recommendedDept: "担任・学年",
      reasons: ["科目を特定できる語が見つからなかったため、一般の相談として整理しました。"],
    };
  }

  if (subjectMatched.length) {
    reasons.push(`「${subjectMatched.slice(0, 3).join("・")}」から科目を${bestSubject.name}と判断しました。`);
  } else {
    reasons.push(`分野の語から科目を${bestSubject.name}と判断しました。`);
  }

  let topicName = "一般";
  let topicHits = 0;
  let topicMatched: string[] = [];
  for (const topic of bestSubject.topics) {
    const { hits, matched } = countHits(haystack, topic.keys);
    if (hits > topicHits) {
      topicHits = hits;
      topicName = topic.name;
      topicMatched = matched;
    }
  }

  if (topicHits > 0) {
    reasons.push(`「${topicMatched.slice(0, 3).join("・")}」から分野を${topicName}と整理しました。`);
  } else {
    topicName = `${bestSubject.name}（分野未特定）`;
    reasons.push("分野は特定できなかったため、科目担当への接続を優先します。");
  }

  const urgency = detectUrgency(text);
  if (urgency === "high") {
    reasons.push("テスト・提出・期限などの語があるため、緊急度を高めにしました。");
  } else if (urgency === "low") {
    reasons.push("予習や余裕がある内容と判断し、緊急度は低めです。");
  } else {
    reasons.push("期限の指定がないため、緊急度は通常です。");
  }

  reasons.push("AIは答えを出しません。対応できる先生へつなぐために使っています。");

  return {
    subject: bestSubject.name,
    topic: topicName,
    summary: makeSummary(text, bestSubject.name, topicName),
    urgency,
    recommendedDept: bestSubject.dept,
    reasons,
  };
}
