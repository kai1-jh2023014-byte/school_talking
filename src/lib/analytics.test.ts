import { describe, expect, it } from "vitest";
import { buildAnalytics } from "./analytics";
import type { StoreData } from "./types";

describe("buildAnalytics", () => {
  it("counts subjects, topics, and unanswered questions", () => {
    const store: StoreData = {
      users: [],
      questions: [
        {
          id: "1",
          studentId: "s",
          body: "a",
          createdAt: "2026-09-03T08:00:00.000Z",
          subject: "数学",
          topic: "二次関数",
          summary: "s",
          urgency: "normal",
          recommendedDept: "数学科",
          classifyReasons: [],
          status: "answered",
          suggestedTeacherIds: [],
          transferHistory: [],
        },
        {
          id: "2",
          studentId: "s",
          body: "b",
          createdAt: "2026-09-03T08:30:00.000Z",
          subject: "数学",
          topic: "確率",
          summary: "s",
          urgency: "normal",
          recommendedDept: "数学科",
          classifyReasons: [],
          status: "open",
          suggestedTeacherIds: [],
          transferHistory: [],
        },
        {
          id: "3",
          studentId: "s",
          body: "c",
          createdAt: "2026-09-03T15:00:00.000Z",
          subject: "英語",
          topic: "関係詞",
          summary: "s",
          urgency: "high",
          recommendedDept: "英語科",
          classifyReasons: [],
          status: "queued",
          suggestedTeacherIds: [],
          transferHistory: [],
        },
      ],
    };

    const analytics = buildAnalytics(store);
    expect(analytics.total).toBe(3);
    expect(analytics.answered).toBe(1);
    expect(analytics.unanswered).toBe(2);
    expect(analytics.bySubject[0]).toEqual({ subject: "数学", count: 2 });
    expect(analytics.insights.length).toBeGreaterThan(0);
  });
});
