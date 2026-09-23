import { describe, expect, it } from "vitest";
import { availabilityLabel, matchTeachers } from "./match";
import type { Classification, Question, SafeTeacher } from "./types";

const teachers: SafeTeacher[] = [
  {
    id: "a",
    name: "田中",
    role: "teacher",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    subjects: ["数学"],
    specialties: ["二次関数"],
    availability: "soon",
    availableInMinutes: 10,
  },
  {
    id: "b",
    name: "鈴木",
    role: "teacher",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    subjects: ["数学"],
    specialties: ["確率"],
    availability: "available",
  },
  {
    id: "c",
    name: "高橋",
    role: "teacher",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    subjects: ["英語"],
    specialties: ["関係詞"],
    availability: "available",
  },
  {
    id: "d",
    name: "無効",
    role: "teacher",
    status: "disabled",
    createdAt: "2026-01-01T00:00:00.000Z",
    subjects: ["数学"],
    specialties: ["二次関数"],
    availability: "available",
  },
];

const classification: Classification = {
  subject: "数学",
  topic: "二次関数",
  summary: "二次関数の最大値",
  urgency: "normal",
  recommendedDept: "数学科",
  questionType: "解法",
  reasons: [],
  source: "rules",
};

describe("matchTeachers", () => {
  it("shows currently available teachers first, then specialty fit", () => {
    const matches = matchTeachers(teachers, classification);
    expect(matches.map((m) => m.teacher.id)).toEqual(["b", "a"]);
    expect(matches[1].reasons.some((r) => r.includes("二次関数"))).toBe(true);
    expect(matches.every((m) => !("loginId" in m.teacher) || m.teacher.loginId === undefined)).toBe(true);
  });

  it("prefers the teacher with fewer unfinished questions", () => {
    const questions: Question[] = [
      {
        id: "q1",
        studentId: "s",
        body: "a",
        createdAt: "2026-09-23T00:00:00.000Z",
        subject: "数学",
        topic: "二次関数",
        summary: "a",
        urgency: "normal",
        recommendedDept: "数学科",
        questionType: "解法",
        classifyReasons: [],
        status: "accepted",
        assignedTeacherId: "b",
        suggestedTeacherIds: [],
        transferHistory: [],
        events: [],
      },
      {
        id: "q2",
        studentId: "s",
        body: "b",
        createdAt: "2026-09-23T00:00:00.000Z",
        subject: "数学",
        topic: "二次関数",
        summary: "b",
        urgency: "normal",
        recommendedDept: "数学科",
        questionType: "解法",
        classifyReasons: [],
        status: "accepted",
        assignedTeacherId: "b",
        suggestedTeacherIds: [],
        transferHistory: [],
        events: [],
      },
    ];
    const availablePair: SafeTeacher[] = [
      { ...teachers[0], availability: "available" },
      teachers[1],
    ];
    const matches = matchTeachers(availablePair, classification, questions);
    expect(matches[0].teacher.id).toBe("a");
    expect(matches[0].activeCount).toBe(0);
    expect(matches[1].teacher.id).toBe("b");
    expect(matches[1].activeCount).toBe(2);
  });

  it("labels availability the way the proposal describes", () => {
    expect(availabilityLabel("available")).toBe("今質問OK");
    expect(availabilityLabel("soon", 10)).toBe("10分後なら対応可能");
    expect(availabilityLabel("busy")).toBe("現在対応不可");
    expect(availabilityLabel("off")).toBe("本日は対応終了");
  });
});
