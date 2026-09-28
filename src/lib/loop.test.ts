import { describe, expect, it } from "vitest";
import { insightStale, snapshotFingerprint } from "./insights";
import {
  beforeAfterChecks,
  buildTopicChain,
  topicLoopPhase,
  visibleFollowUps,
} from "./loop";
import { canViewClass, createPrompt, pendingPromptsFor } from "./prompts";
import { layoutScene } from "./universe";
import type { FollowUpMark, Prompt, PromptResponse, Question, StoreData, User } from "./types";

const studentA: User = {
  id: "s-a",
  loginId: "2A-01",
  passwordHash: "x",
  name: "花子",
  role: "student",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  homeroom: "2年A組",
  grade: "2年",
};

const studentB: User = {
  ...studentA,
  id: "s-b",
  loginId: "2B-08",
  name: "太郎",
  homeroom: "2年B組",
};

const teacher: User = {
  id: "t-a",
  loginId: "T-1001",
  passwordHash: "x",
  name: "田中",
  role: "teacher",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  subjects: ["数学"],
  homerooms: ["2年A組"],
};

const admin: User = {
  id: "admin",
  loginId: "A-0001",
  passwordHash: "x",
  name: "管理者",
  role: "admin",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function question(): Question {
  return {
    id: "q-1",
    studentId: "s-a",
    body: "最大値が分からない",
    createdAt: "2026-09-01T00:00:00.000Z",
    subject: "数学",
    topic: "二次関数",
    summary: "最大値が分からない",
    urgency: "normal",
    recommendedDept: "数学科",
    questionType: "解法",
    classifyReasons: [],
    status: "answered",
    suggestedTeacherIds: [],
    transferHistory: [],
    events: [],
  };
}

function store(partial: Partial<StoreData> = {}): StoreData {
  const check = createPrompt({
    id: "p-check",
    teacherId: "t-a",
    kind: "understanding_check",
    subject: "数学",
    topic: "二次関数",
    body: "理解できましたか",
    audience: { type: "class", homeroom: "2年A組" },
  });
  const ask = createPrompt({
    id: "p-ask",
    teacherId: "t-a",
    kind: "teacher_question",
    subject: "数学",
    topic: "二次関数",
    body: "どこが難しい",
    audience: { type: "class", homeroom: "2年A組" },
    sourceQuestionId: "q-1",
    parentPromptId: undefined,
  });
  ask.sourceQuestionId = "q-1";
  const follow: FollowUpMark = {
    id: "fu-1",
    subject: "数学",
    topic: "二次関数",
    kind: "class_review",
    actorId: "t-a",
    createdAt: "2026-09-03T00:00:00.000Z",
    status: "planned",
    promptId: "p-check",
    homeroom: "2年A組",
  };
  const recheck = createPrompt({
    id: "p-recheck",
    teacherId: "t-a",
    kind: "understanding_check",
    subject: "数学",
    topic: "二次関数",
    body: "解けそうですか",
    audience: { type: "class", homeroom: "2年A組" },
    purpose: "recheck",
    parentPromptId: "p-check",
    followUpId: "fu-1",
  });
  follow.recheckPromptId = "p-recheck";
  const prompts: Prompt[] = [check, ask, recheck];
  const promptResponses: PromptResponse[] = [
    { id: "r1", promptId: "p-check", studentId: "s-a", optionId: "uneasy", createdAt: "2026-09-02T00:00:00.000Z" },
    { id: "r2", promptId: "p-ask", studentId: "s-a", optionId: undefined, freeText: "平方完成", createdAt: "2026-09-02T12:00:00.000Z" },
  ];
  return {
    users: [studentA, studentB, teacher, admin],
    questions: [question()],
    prompts,
    promptResponses,
    followUps: [follow],
    ...partial,
  };
}

describe("prompt to response link", () => {
  it("keeps responses on the prompt id", () => {
    const data = store();
    expect(data.promptResponses?.[0].promptId).toBe("p-check");
    expect(data.prompts?.find((item) => item.id === "p-ask")?.sourceQuestionId).toBe("q-1");
  });
});

describe("follow-up and re-check", () => {
  it("records a planned class review and a recheck prompt", () => {
    const data = store();
    expect(data.followUps?.[0].kind).toBe("class_review");
    expect(data.followUps?.[0].status).toBe("planned");
    expect(data.prompts?.find((item) => item.id === "p-recheck")?.parentPromptId).toBe("p-check");
    expect(data.prompts?.find((item) => item.id === "p-recheck")?.purpose).toBe("recheck");
  });
});

describe("before/after DATA", () => {
  it("compares option counts without inventing a score", () => {
    const withAfter = store({
      promptResponses: [
        ...(store().promptResponses ?? []),
        { id: "r3", promptId: "p-recheck", studentId: "s-a", optionId: "ok", createdAt: "2026-09-04T00:00:00.000Z" },
      ],
    });
    const { before, after } = beforeAfterChecks(withAfter, "数学", "二次関数", "2年A組");
    expect(before?.find((row) => row.id === "uneasy")?.count).toBe(1);
    expect(after?.find((row) => row.id === "ok")?.count).toBe(1);
    expect(JSON.stringify({ before, after })).not.toMatch(/改善した|%/);
  });
});

describe("loop phase and universe", () => {
  it("marks unanswered recheck as waiting", () => {
    expect(topicLoopPhase(store(), "数学", "二次関数", { homeroom: "2年A組", questionCount: 1 })).toBe("recheck_waiting");
  });

  it("marks rechecked after the class has answered", () => {
    const done = store({
      promptResponses: [
        ...(store().promptResponses ?? []),
        { id: "r3", promptId: "p-recheck", studentId: "s-a", optionId: "ok", createdAt: "2026-09-04T00:00:00.000Z" },
      ],
    });
    expect(topicLoopPhase(done, "数学", "二次関数", { homeroom: "2年A組", questionCount: 1 })).toBe("rechecked");
  });

  it("puts 再確認 on the topic graph", () => {
    const scene = layoutScene(
      {
        planets: [
          {
            subject: "数学",
            count: 1,
            radius: 20,
            satellites: [
              {
                topic: "二次関数",
                count: 1,
                radius: 10,
                clusters: [],
                checkAnswers: 1,
                promptCount: 1,
                recheckCount: 1,
                followUpCount: 1,
              },
            ],
          },
        ],
      },
      { level: 3, subject: "数学", topic: "二次関数" },
      [],
    );
    expect(scene.nodes.some((node) => node.label === "再確認")).toBe(true);
    expect(scene.nodes.some((node) => node.label === "対応")).toBe(true);
  });
});

describe("permissions", () => {
  it("keeps pending prompts inside the audience class", () => {
    const data = store();
    expect(pendingPromptsFor(data, studentA).some((item) => item.id === "p-recheck")).toBe(true);
    expect(pendingPromptsFor(data, studentB)).toHaveLength(0);
    expect(canViewClass(teacher, "2年A組", data)).toBe(true);
    expect(canViewClass(teacher, "2年B組", data)).toBe(false);
    expect(canViewClass(studentA, "2年A組", data)).toBe(false);
    expect(visibleFollowUps(data, teacher).length).toBeGreaterThan(0);
    expect(visibleFollowUps(data, studentA)).toHaveLength(0);
    expect(visibleFollowUps(data, admin).length).toBe(visibleFollowUps(data, teacher).length);
  });
});

describe("chain and cache", () => {
  it("orders question → prompt → response → follow-up → recheck", () => {
    const chain = buildTopicChain(store(), "数学", "二次関数", studentA);
    const kinds = chain.map((item) => item.kind);
    expect(kinds[0]).toBe("question");
    expect(kinds).toContain("prompt");
    expect(kinds).toContain("response");
    expect(kinds).toContain("followup");
    expect(kinds).toContain("recheck");
    expect(JSON.stringify(chain)).not.toMatch(/苦手/);
  });

  it("keeps the insight fingerprint stable until follow-ups change", () => {
    const data = store();
    const first = snapshotFingerprint(data);
    expect(insightStale({ fingerprint: first, analyzedAt: "x", status: "ok", analysis: null }, first)).toBe(false);
    const moved = store({
      followUps: [{ ...(data.followUps?.[0] as FollowUpMark), status: "completed" }],
    });
    expect(snapshotFingerprint(moved)).not.toBe(first);
  });
});
