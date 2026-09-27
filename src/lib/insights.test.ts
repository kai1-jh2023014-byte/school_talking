import { describe, expect, it } from "vitest";
import { buildSchoolSnapshot, snapshotFingerprint } from "./insights";
import { layoutScene } from "./universe";
import type { Question, StoreData } from "./types";

function q(partial: Partial<Question> & Pick<Question, "id" | "createdAt" | "subject" | "topic" | "status">): Question {
  return {
    studentId: "s",
    body: partial.body ?? "最大値がわかりません",
    summary: partial.summary ?? `${partial.subject}の${partial.topic}`,
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

describe("buildSchoolSnapshot", () => {
  const now = new Date("2026-09-24T05:00:00.000Z");

  it("treats an empty store as not enough data", () => {
    const snapshot = buildSchoolSnapshot({ users: [], questions: [] }, now);
    expect(snapshot.total).toBe(0);
    expect(snapshot.enoughData).toBe(false);
  });

  it("clusters quadratic questions without inventing a second store", () => {
    const store: StoreData = {
      users: [],
      questions: [
        q({
          id: "1",
          createdAt: "2026-09-10T08:00:00.000Z",
          subject: "数学",
          topic: "二次関数",
          status: "answered",
          body: "最大値の求め方",
          summary: "最大値",
        }),
        q({
          id: "2",
          createdAt: "2026-09-12T08:00:00.000Z",
          subject: "数学",
          topic: "二次関数",
          status: "answered",
          body: "平方完成がわからない",
          summary: "平方完成",
        }),
        q({
          id: "3",
          createdAt: "2026-09-14T08:00:00.000Z",
          subject: "数学",
          topic: "二次関数",
          status: "answered",
          body: "最大値と最小値",
          summary: "最大値と最小値",
        }),
      ],
    };
    const snapshot = buildSchoolSnapshot(store, now);
    expect(snapshot.enoughData).toBe(true);
    const field = snapshot.topics[0];
    expect(field.topic).toBe("二次関数");
    expect(field.clusters.some((item) => item.name === "最大値・最小値")).toBe(true);
    expect(snapshotFingerprint(store)).toBe(snapshot.fingerprint);
  });

  it("counts understanding checks without treating them as student questions", () => {
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
      ],
      prompts: [
        {
          id: "p1",
          kind: "understanding_check",
          teacherId: "t",
          subject: "数学",
          topic: "二次関数",
          body: "理解",
          options: [{ id: "uneasy", label: "少し不安", anxious: true }],
          allowFreeText: false,
          audience: { type: "class", homeroom: "2年A組" },
          createdAt: "2026-09-11T08:00:00.000Z",
          status: "open",
        },
      ],
      promptResponses: [
        { id: "r1", promptId: "p1", studentId: "s", optionId: "uneasy", createdAt: "2026-09-11T09:00:00.000Z" },
      ],
    };
    const snapshot = buildSchoolSnapshot(store, now);
    const field = snapshot.topics.find((item) => item.topic === "二次関数");
    expect(field?.count).toBe(1);
    expect(field?.checkAnswers).toBe(1);
    expect(field?.checkAnxious).toBe(1);
  });

  it("does not put one node per question at school level", () => {
    const questions = Array.from({ length: 80 }, (_, index) =>
      q({
        id: `q-${index}`,
        createdAt: "2026-09-10T08:00:00.000Z",
        subject: index % 2 === 0 ? "数学" : "英語",
        topic: index % 2 === 0 ? "二次関数" : "関係詞",
        status: "answered",
      }),
    );
    const snapshot = buildSchoolSnapshot({ users: [], questions }, now);
    const scene = layoutScene(
      {
        planets: snapshot.subjects.map((subject) => ({
          subject: subject.subject,
          count: subject.count,
          radius: 20,
          satellites: snapshot.topics
            .filter((topic) => topic.subject === subject.subject)
            .map((topic) => ({
              topic: topic.topic,
              count: topic.count,
              radius: 10,
              clusters: topic.clusters,
            })),
        })),
      },
      { level: 1 },
      ["数学"],
    );
    expect(scene.nodes.every((node) => node.kind === "school" || node.kind === "subject")).toBe(true);
    expect(scene.nodes.filter((node) => node.kind === "question")).toHaveLength(0);
  });
});
