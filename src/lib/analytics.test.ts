import { describe, expect, it } from "vitest";
import { buildAnalytics, timeSlot } from "./analytics";
import type { Question, StoreData } from "./types";

function q(partial: Partial<Question> & Pick<Question, "id" | "createdAt" | "subject" | "topic" | "status">): Question {
  return {
    studentId: "s",
    body: "body",
    summary: "summary",
    urgency: "normal",
    recommendedDept: "数学科",
    questionType: "解法",
    classifyReasons: [],
    suggestedTeacherIds: [],
    transferHistory: [],
    events: [],
    ...partial,
  };
}

describe("timeSlot", () => {
  it("groups school hours into named slots", () => {
    const at = (hour: number) => {
      const date = new Date();
      date.setHours(hour, 0, 0, 0);
      return date.toISOString();
    };
    expect(timeSlot(at(7))).toBe("朝（登校前）");
    expect(timeSlot(at(10))).toBe("午前の授業");
    expect(timeSlot(at(12))).toBe("昼休み");
    expect(timeSlot(at(17))).toBe("放課後");
    expect(timeSlot(at(21))).toBe("夜");
  });
});

describe("buildAnalytics", () => {
  const now = new Date("2026-09-23T12:00:00.000Z");

  it("counts subjects, statuses, slots, and unanswered questions", () => {
    const store: StoreData = {
      users: [],
      questions: [
        q({
          id: "1",
          createdAt: "2026-09-10T08:00:00.000Z",
          subject: "数学",
          topic: "二次関数",
          status: "answered",
        }),
        q({
          id: "2",
          createdAt: "2026-09-12T08:30:00.000Z",
          subject: "数学",
          topic: "確率",
          status: "matched",
        }),
        q({
          id: "3",
          createdAt: "2026-09-15T15:00:00.000Z",
          subject: "英語",
          topic: "関係詞",
          status: "deferred",
        }),
      ],
    };

    const analytics = buildAnalytics(store, now);
    expect(analytics.total).toBe(3);
    expect(analytics.answered).toBe(1);
    expect(analytics.unanswered).toBe(2);
    expect(analytics.inProgress).toBe(1);
    expect(analytics.bySubject[0]).toEqual({ subject: "数学", count: 2 });
    expect(analytics.byStatus.some((item) => item.status === "未対応")).toBe(true);
    expect(analytics.bySlot.length).toBeGreaterThan(0);
    expect(analytics.insights.length).toBeGreaterThan(0);
  });

  it("compares recent struggles with the previous 30 days", () => {
    const store: StoreData = {
      users: [],
      questions: [
        q({
          id: "old-1",
          createdAt: "2026-07-30T08:00:00.000Z",
          subject: "数学",
          topic: "二次関数",
          status: "answered",
        }),
        q({
          id: "new-1",
          createdAt: "2026-09-10T08:00:00.000Z",
          subject: "数学",
          topic: "二次関数",
          status: "answered",
        }),
        q({
          id: "new-2",
          createdAt: "2026-09-12T08:00:00.000Z",
          subject: "数学",
          topic: "二次関数",
          status: "answered",
        }),
        q({
          id: "new-3",
          createdAt: "2026-09-14T08:00:00.000Z",
          subject: "数学",
          topic: "二次関数",
          status: "answered",
        }),
      ],
    };

    const analytics = buildAnalytics(store, now);
    expect(analytics.struggles[0]).toMatchObject({
      subject: "数学",
      topic: "二次関数",
      count: 3,
      previousCount: 1,
    });
    expect(analytics.struggles[0].deltaLabel).toMatch(/直近30日/);
  });
});
