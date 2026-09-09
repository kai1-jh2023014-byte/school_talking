import { describe, expect, it } from "vitest";
import { availabilityLabel, matchTeachers } from "./match";
import type { Classification, PublicUser } from "./types";

const teachers: PublicUser[] = [
  {
    id: "a",
    loginId: "tanaka",
    name: "田中",
    role: "teacher",
    subjects: ["数学"],
    specialties: ["二次関数"],
    availability: "soon",
    availableInMinutes: 10,
  },
  {
    id: "b",
    loginId: "suzuki",
    name: "鈴木",
    role: "teacher",
    subjects: ["数学"],
    specialties: ["確率"],
    availability: "available",
  },
  {
    id: "c",
    loginId: "eng",
    name: "高橋",
    role: "teacher",
    subjects: ["英語"],
    specialties: ["関係詞"],
    availability: "available",
  },
];

const classification: Classification = {
  subject: "数学",
  topic: "二次関数",
  summary: "二次関数の最大値",
  urgency: "normal",
  recommendedDept: "数学科",
  reasons: [],
};

describe("matchTeachers", () => {
  it("shows currently available teachers first, then specialty fit", () => {
    const matches = matchTeachers(teachers, classification);
    expect(matches.map((m) => m.teacher.id)).toEqual(["b", "a"]);
    expect(matches[1].reasons.some((r) => r.includes("二次関数"))).toBe(true);
  });

  it("labels availability the way the proposal describes", () => {
    expect(availabilityLabel("available")).toBe("今質問OK");
    expect(availabilityLabel("soon", 10)).toBe("10分後なら対応可能");
    expect(availabilityLabel("busy")).toBe("現在対応不可");
    expect(availabilityLabel("off")).toBe("本日は対応終了");
  });
});
