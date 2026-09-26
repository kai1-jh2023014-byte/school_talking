import { describe, expect, it } from "vitest";
import { buildSchoolSnapshot } from "../insights";
import type { JevClient, JevResult, SystemOneResult } from "./client";
import { analyzeSchoolSnapshot, readSchoolAnalysis } from "./insights";
import { resetResolvedModel as resetClassifyModel } from "./classifier";

function choice(name: string, confidence = 0.8) {
  return {
    type: "choice" as const,
    choice: name,
    confidence,
    probabilities: { [name]: 0.8 },
  };
}

function answers(overrides: Partial<SystemOneResult["answers"]> = {}): SystemOneResult {
  return {
    model: "test-model",
    answers: {
      enough_data: { type: "noul", noul: 0.9 },
      focus_topic: choice("数学/二次関数"),
      second_topic: choice("none"),
      pattern: choice("increase"),
      action: choice("queue"),
      ...overrides,
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

const now = new Date("2026-09-24T05:00:00.000Z");

function snapshotWithMath() {
  return buildSchoolSnapshot(
    {
      users: [],
      questions: Array.from({ length: 6 }, (_, index) => ({
        id: `q-${index}`,
        studentId: "s",
        body: "最大値がわかりません",
        createdAt: "2026-09-10T08:00:00.000Z",
        subject: "数学",
        topic: "二次関数",
        summary: "最大値",
        urgency: "normal" as const,
        recommendedDept: "数学科",
        questionType: "解法" as const,
        classifyReasons: [],
        suggestedTeacherIds: [],
        transferHistory: [],
        events: [],
        status: "answered" as const,
      })),
    },
    now,
  );
}

describe("readSchoolAnalysis", () => {
  it("builds attention areas from a valid System One result", () => {
    const analysis = readSchoolAnalysis(answers(), snapshotWithMath());
    expect(analysis?.attentionAreas[0]?.topic).toBe("二次関数");
    expect(analysis?.summary).not.toMatch(/授業が悪い|理解していない/);
    expect(analysis?.suggestedActions[0]?.kind).toBe("queue");
  });

  it("rejects a missing answer payload", () => {
    expect(readSchoolAnalysis({ model: "x", answers: {} }, snapshotWithMath())).toBeNull();
  });
});

describe("analyzeSchoolSnapshot", () => {
  it("does not call Jev when data is sparse", async () => {
    let called = 0;
    const snapshot = buildSchoolSnapshot({ users: [], questions: [] }, now);
    const insight = await analyzeSchoolSnapshot({
      snapshot,
      env: { TYPESAFE_API_KEY: "k", TYPESAFE_DEFAULT_MODEL: "jev-latest" },
      client: {
        async listModels() {
          called += 1;
          return { ok: true, value: [{ name: "jev-latest" }] };
        },
        async systemOne() {
          called += 1;
          return { ok: true, value: answers() };
        },
      },
    });
    expect(called).toBe(0);
    expect(insight.status).toBe("sparse");
  });

  it("returns unavailable when the API key is missing", async () => {
    const insight = await analyzeSchoolSnapshot({
      snapshot: snapshotWithMath(),
      env: {},
      client: clientOf({ ok: true, value: answers() }),
    });
    expect(insight.status).toBe("unavailable");
    expect(insight.analysis).toBeNull();
  });

  it("survives API errors", async () => {
    resetClassifyModel();
    const insight = await analyzeSchoolSnapshot({
      snapshot: snapshotWithMath(),
      env: { TYPESAFE_API_KEY: "k", TYPESAFE_DEFAULT_MODEL: "jev-latest" },
      client: clientOf({ ok: false, error: "timeout" }),
    });
    expect(insight.status).toBe("error");
    expect(insight.errorCode).toBe("timeout");
  });

  it("survives invalid JSON-shaped answers", async () => {
    resetClassifyModel();
    const insight = await analyzeSchoolSnapshot({
      snapshot: snapshotWithMath(),
      env: { TYPESAFE_API_KEY: "k", TYPESAFE_DEFAULT_MODEL: "jev-latest" },
      client: clientOf({ ok: true, value: { model: "t", answers: { enough_data: { type: "choice", choice: "x", confidence: 1, probabilities: {} } } } }),
    });
    expect(insight.status).toBe("error");
    expect(insight.errorCode).toBe("invalid_response");
  });
});
