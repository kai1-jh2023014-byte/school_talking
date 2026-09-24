import { describe, expect, it } from "vitest";
import { classifyQuestion, classifyQuestionSafe } from "./classify";

describe("classifyQuestion", () => {
  it("classifies a quadratic function question", () => {
    const result = classifyQuestion("数学のこの問題がわかりません。二次関数の最大値の求め方を教えてください。");
    expect(result.subject).toBe("数学");
    expect(result.topic).toBe("二次関数");
    expect(result.recommendedDept).toBe("数学科");
    expect(result.questionType).toBe("解法");
    expect(result.urgency).toBe("normal");
    expect(result.source).toBe("rules");
    expect(result.reasons.some((r) => r.includes("つなぐ"))).toBe(true);
  });

  it("raises urgency for a test tomorrow", () => {
    const result = classifyQuestion("仮定法過去の were がわかりません。明日テストです。");
    expect(result.subject).toBe("英語");
    expect(result.topic).toBe("仮定法");
    expect(result.urgency).toBe("high");
  });

  it("detects relative pronouns and a concept question", () => {
    const result = classifyQuestion("関係代名詞 which と that の違いを教えてください。");
    expect(result.subject).toBe("英語");
    expect(result.topic).toBe("関係詞");
    expect(result.questionType).toBe("概念");
  });

  it("uses a student subject hint when provided", () => {
    const result = classifyQuestion("この問題の意味がわかりません。", "国語");
    expect(result.subject).toBe("国語");
    expect(result.reasons.some((r) => r.includes("科目を国語"))).toBe(true);
  });

  it("falls back when the subject is unknown", () => {
    const result = classifyQuestion("体育館の時計が止まっています。");
    expect(result.subject).toBe("その他");
    expect(result.recommendedDept).toBe("担任・学年");
  });
});

describe("classifyQuestionSafe", () => {
  it("returns the rule classifier when no API key is set", async () => {
    const previousOpen = process.env.OPENAI_API_KEY;
    const previousJev = process.env.TYPESAFE_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.TYPESAFE_API_KEY;
    const result = await classifyQuestionSafe("二次関数の最大値の求め方がわかりません");
    expect(result.subject).toBe("数学");
    expect(result.topic).toBe("二次関数");
    expect(result.source).toBe("rules");
    if (previousOpen) process.env.OPENAI_API_KEY = previousOpen;
    if (previousJev) process.env.TYPESAFE_API_KEY = previousJev;
  });
});
