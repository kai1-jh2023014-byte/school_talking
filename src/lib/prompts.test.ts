import { describe, expect, it } from "vitest";
import {
  buildClassUniverse,
  buildMyUniverse,
  CHECK_OPTIONS,
  createPrompt,
  isAnxiousResponse,
  pendingPromptsFor,
} from "./prompts";
import type { StoreData, User } from "./types";

const student: User = {
  id: "s1",
  loginId: "2A-01",
  passwordHash: "x",
  name: "山田",
  role: "student",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  grade: "2年",
  homeroom: "2年A組",
};

function store(partial: Partial<StoreData> = {}): StoreData {
  return {
    users: [student],
    questions: [],
    prompts: [],
    promptResponses: [],
    followUps: [],
    ...partial,
  };
}

describe("createPrompt", () => {
  it("fills understanding check options when omitted", () => {
    const prompt = createPrompt({
      id: "p1",
      teacherId: "t1",
      kind: "understanding_check",
      subject: "数学",
      topic: "二次関数",
      body: "理解できましたか",
      audience: { type: "class", homeroom: "2年A組" },
    });
    expect(prompt.options.map((item) => item.id)).toEqual(CHECK_OPTIONS.map((item) => item.id));
  });
});

describe("pendingPromptsFor", () => {
  it("hides prompts the student already answered", () => {
    const prompt = createPrompt({
      id: "p1",
      teacherId: "t1",
      kind: "teacher_question",
      subject: "数学",
      topic: "二次関数",
      body: "難しいところは",
      audience: { type: "class", homeroom: "2年A組" },
    });
    const data = store({
      prompts: [prompt],
      promptResponses: [
        { id: "r1", promptId: "p1", studentId: "s1", optionId: "a", createdAt: "2026-09-01T00:00:00.000Z" },
      ],
    });
    expect(pendingPromptsFor(data, student)).toHaveLength(0);
  });
});

describe("buildMyUniverse", () => {
  it("names review candidates from questions and anxious checks, not as weaknesses", () => {
    const prompt = createPrompt({
      id: "p1",
      teacherId: "t1",
      kind: "understanding_check",
      subject: "数学",
      topic: "二次関数",
      body: "理解",
      audience: { type: "class", homeroom: "2年A組" },
    });
    const data = store({
      questions: [
        {
          id: "q1",
          studentId: "s1",
          body: "最大値",
          createdAt: "2026-09-01T00:00:00.000Z",
          subject: "数学",
          topic: "二次関数",
          summary: "最大値",
          urgency: "normal",
          recommendedDept: "数学科",
          questionType: "解法",
          classifyReasons: [],
          status: "answered",
          suggestedTeacherIds: [],
          transferHistory: [],
          events: [],
        },
      ],
      prompts: [prompt],
      promptResponses: [
        { id: "r1", promptId: "p1", studentId: "s1", optionId: "uneasy", createdAt: "2026-09-02T00:00:00.000Z" },
      ],
    });
    const mine = buildMyUniverse(data, student);
    expect(mine.reviewCandidates[0]?.topic).toBe("二次関数");
    expect(mine.disclaimer).toMatch(/AIによる診断ではなく/);
    expect(JSON.stringify(mine)).not.toMatch(/弱点/);
    expect(isAnxiousResponse(prompt, data.promptResponses![0])).toBe(true);
  });
});

describe("buildClassUniverse", () => {
  it("treats concentration as a confirmation candidate, not a class-wide weakness", () => {
    const view = buildClassUniverse(
      store({
        users: [
          student,
          { ...student, id: "s2", loginId: "2A-02", name: "次郎", homeroom: "2年A組" },
        ],
        questions: [
          {
            id: "q1",
            studentId: "s1",
            body: "a",
            createdAt: "2026-09-01T00:00:00.000Z",
            subject: "数学",
            topic: "二次関数",
            summary: "a",
            urgency: "normal",
            recommendedDept: "数学科",
            questionType: "解法",
            classifyReasons: [],
            status: "answered",
            suggestedTeacherIds: [],
            transferHistory: [],
            events: [],
          },
          {
            id: "q2",
            studentId: "s2",
            body: "b",
            createdAt: "2026-09-01T00:00:00.000Z",
            subject: "数学",
            topic: "二次関数",
            summary: "b",
            urgency: "normal",
            recommendedDept: "数学科",
            questionType: "解法",
            classifyReasons: [],
            status: "answered",
            suggestedTeacherIds: [],
            transferHistory: [],
            events: [],
          },
        ],
      }),
      "2年A組",
    );
    expect(view.confirmCandidates[0]?.topic).toBe("二次関数");
    expect(view.disclaimer).toMatch(/追加確認を検討できる領域/);
  });
});
