import { describe, expect, it } from "vitest";
import { classifyQuestion, classifyQuestionSafe } from "../classify";
import { matchTeachers } from "../match";
import type { SafeTeacher } from "../types";
import type { JevClient, JevResult, SystemOneResult } from "./client";
import {
  classifyWithJev,
  confidenceBand,
  mergeJudgement,
  readJudgement,
  resetResolvedModel,
  type JevJudgement,
} from "./classifier";

function choice(name: string, confidence: number, probability = 0.88) {
  return {
    type: "choice" as const,
    choice: name,
    confidence,
    probabilities: { [name]: probability, その他: 1 - probability },
  };
}

function highAnswers(): SystemOneResult {
  return {
    model: "test-model",
    answers: {
      subject: choice("数学", 0.91, 0.9),
      topic: choice("二次関数", 0.88, 0.86),
      urgency: choice("high", 0.8, 0.8),
      questionType: choice("解法", 0.7, 0.7),
      in_catalog: { type: "noul", noul: 0.93 },
    },
  };
}

function clientOf(result: JevResult<SystemOneResult>): JevClient {
  return {
    async listModels() {
      return { ok: true, value: [{ name: "jev-latest" }] };
    },
    async systemOne() {
      return result;
    },
  };
}

const teachers: SafeTeacher[] = [
  {
    id: "u-math-a",
    name: "田中 美咲",
    role: "teacher",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    subjects: ["数学"],
    specialties: ["二次関数"],
    availability: "available",
  },
  {
    id: "u-english",
    name: "高橋 恵",
    role: "teacher",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    subjects: ["英語"],
    specialties: ["関係詞"],
    availability: "available",
  },
];

describe("readJudgement / confidenceBand", () => {
  it("accepts a valid System One payload", () => {
    const judgement = readJudgement(highAnswers());
    expect(judgement?.subject).toBe("数学");
    expect(judgement?.topic).toBe("二次関数");
    expect(judgement?.urgency).toBe("high");
    expect(confidenceBand(judgement!)).toBe("high");
  });

  it("rejects an unknown subject instead of trusting it", () => {
    const bad = highAnswers();
    bad.answers.subject = choice("音楽", 0.99, 0.99);
    expect(readJudgement(bad)).toBeNull();
  });

  it("uses probability and catalog noul, not only a 0.5 cutoff", () => {
    const mid: JevJudgement = {
      subject: "数学",
      subjectConfidence: 0.58,
      subjectProbability: 0.4,
      topic: "二次関数",
      topicConfidence: 0.55,
      urgency: "normal",
      urgencyConfidence: 0.7,
      questionType: "解法",
      questionTypeConfidence: 0.7,
      inCatalog: 0.6,
      model: "test-model",
    };
    expect(confidenceBand(mid)).toBe("mid");

    const low = { ...mid, subjectConfidence: 0.4, subjectProbability: 0.3, inCatalog: 0.2 };
    expect(confidenceBand(low)).toBe("low");
  });
});

describe("classifyWithJev", () => {
  const body = "二次関数の最大値の求め方が分かりません。明日テストなので急いでいます。";

  it("classifies a high-confidence Jev result and connects it to math teachers", async () => {
    resetResolvedModel();
    const rules = classifyQuestion(body);
    const classified = await classifyWithJev({
      body,
      rules,
      client: clientOf({ ok: true, value: highAnswers() }),
      env: { TYPESAFE_API_KEY: "test", TYPESAFE_DEFAULT_MODEL: "test-model" },
    });
    expect(classified?.source).toBe("jev");
    expect(classified?.subject).toBe("数学");
    expect(classified?.topic).toBe("二次関数");
    expect(classified?.urgency).toBe("high");
    expect(classified?.confidenceBand).toBe("high");

    const matches = matchTeachers(teachers, classified!);
    expect(matches[0].teacher.id).toBe("u-math-a");
    expect(matches[0].reasons.some((reason) => reason.includes("二次関数"))).toBe(true);
  });

  it("falls back when confidence is low", async () => {
    resetResolvedModel();
    const low = highAnswers();
    low.answers.subject = choice("数学", 0.2, 0.3);
    low.answers.in_catalog = { type: "noul", noul: 0.1 };
    const classified = await classifyWithJev({
      body: "よくわかりません",
      rules: classifyQuestion("よくわかりません"),
      client: clientOf({ ok: true, value: low }),
      env: { TYPESAFE_API_KEY: "test", TYPESAFE_DEFAULT_MODEL: "test-model" },
    });
    expect(classified).toBeNull();
  });

  it("falls back when the API fails", async () => {
    resetResolvedModel();
    const classified = await classifyWithJev({
      body,
      rules: classifyQuestion(body),
      client: clientOf({ ok: false, error: "server", status: 500 }),
      env: { TYPESAFE_API_KEY: "test", TYPESAFE_DEFAULT_MODEL: "test-model" },
    });
    expect(classified).toBeNull();
  });

  it("falls back on timeout", async () => {
    resetResolvedModel();
    const classified = await classifyWithJev({
      body,
      rules: classifyQuestion(body),
      client: clientOf({ ok: false, error: "timeout" }),
      env: { TYPESAFE_API_KEY: "test", TYPESAFE_DEFAULT_MODEL: "test-model" },
    });
    expect(classified).toBeNull();
  });

  it("falls back on an invalid payload", async () => {
    resetResolvedModel();
    const classified = await classifyWithJev({
      body,
      rules: classifyQuestion(body),
      client: clientOf({
        ok: true,
        value: { model: "test-model", answers: { subject: { type: "noul", noul: 0.9 } } },
      }),
      env: { TYPESAFE_API_KEY: "test", TYPESAFE_DEFAULT_MODEL: "test-model" },
    });
    expect(classified).toBeNull();
  });
});

describe("classifyQuestionSafe + Jev", () => {
  it("uses Jev when it succeeds, then existing matching still works", async () => {
    const previous = process.env.TYPESAFE_API_KEY;
    process.env.TYPESAFE_API_KEY = "test";
    const result = await classifyQuestionSafe(
      "二次関数の最大値の求め方が分かりません。明日テストなので急いでいます。",
      undefined,
      {
        classifyWithJev: async () =>
          mergeJudgement(
            readJudgement(highAnswers())!,
            classifyQuestion("二次関数の最大値の求め方が分かりません。"),
            undefined,
            "high",
            "二次関数の最大値の求め方が分かりません。明日テストなので急いでいます。",
          ),
      },
    );
    expect(result.source).toBe("jev");
    expect(result.subject).toBe("数学");
    expect(matchTeachers(teachers, result)[0].teacher.id).toBe("u-math-a");
    if (previous) process.env.TYPESAFE_API_KEY = previous;
    else delete process.env.TYPESAFE_API_KEY;
  });

  it("keeps the app working when Jev is missing or fails", async () => {
    const previousType = process.env.TYPESAFE_API_KEY;
    const previousOpen = process.env.OPENAI_API_KEY;
    delete process.env.TYPESAFE_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const missing = await classifyQuestionSafe("二次関数の最大値の求め方がわかりません");
    expect(missing.subject).toBe("数学");
    expect(missing.source).toBe("rules");

    process.env.TYPESAFE_API_KEY = "test";
    const failed = await classifyQuestionSafe("二次関数の最大値の求め方がわかりません", undefined, {
      classifyWithJev: async () => null,
    });
    expect(failed.subject).toBe("数学");
    expect(failed.source).toBe("fallback");

    if (previousType) process.env.TYPESAFE_API_KEY = previousType;
    else delete process.env.TYPESAFE_API_KEY;
    if (previousOpen) process.env.OPENAI_API_KEY = previousOpen;
    else delete process.env.OPENAI_API_KEY;
  });
});
