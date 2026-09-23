import { describe, expect, it } from "vitest";
import {
  acceptQuestion,
  answerQuestion,
  canViewQuestion,
  closeQuestion,
  deferQuestion,
  listVisibleQuestions,
  transferQuestion,
} from "./questions";
import type { Question, User } from "./types";

function user(partial: Partial<User> & Pick<User, "id" | "role">): User {
  return {
    loginId: partial.loginId ?? partial.id,
    passwordHash: "x",
    name: partial.name ?? partial.id,
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

function question(partial: Partial<Question> = {}): Question {
  return {
    id: "q-1",
    studentId: "s1",
    body: "二次関数の最大値",
    createdAt: "2026-09-23T01:00:00.000Z",
    subject: "数学",
    topic: "二次関数",
    summary: "二次関数の最大値",
    urgency: "normal",
    recommendedDept: "数学科",
    questionType: "解法",
    classifyReasons: [],
    status: "matched",
    assignedTeacherId: "t1",
    suggestedTeacherIds: ["t1"],
    transferHistory: [],
    events: [],
    ...partial,
  };
}

const student = user({ id: "s1", role: "student", name: "花子" });
const otherStudent = user({ id: "s2", role: "student", name: "太郎" });
const teacher = user({ id: "t1", role: "teacher", name: "田中", subjects: ["数学"] });
const otherTeacher = user({ id: "t2", role: "teacher", name: "鈴木", subjects: ["数学"] });
const admin = user({ id: "a1", role: "admin", name: "管理" });

describe("canViewQuestion", () => {
  it("keeps a student from seeing another student's question", () => {
    expect(canViewQuestion(student, question())).toBe(true);
    expect(canViewQuestion(otherStudent, question())).toBe(false);
  });

  it("keeps an unrelated teacher from opening a claimed question", () => {
    expect(canViewQuestion(teacher, question())).toBe(true);
    expect(canViewQuestion(otherTeacher, question())).toBe(false);
    expect(canViewQuestion(admin, question())).toBe(true);
  });

  it("lets a teacher see an unmatched question in their subject", () => {
    const open = question({ assignedTeacherId: null, status: "matched" });
    expect(canViewQuestion(teacher, open)).toBe(true);
    expect(canViewQuestion(user({ id: "t3", role: "teacher", subjects: ["英語"] }), open)).toBe(false);
  });
});

describe("listVisibleQuestions", () => {
  it("does not give teachers the whole school inbox", () => {
    const questions = [
      question({ id: "mine", assignedTeacherId: "t1" }),
      question({ id: "other", assignedTeacherId: "t2", studentId: "s2" }),
    ];
    const visible = listVisibleQuestions(teacher, questions, "inbox");
    expect(visible.map((item) => item.id)).toEqual(["mine"]);
  });
});

describe("question lifecycle", () => {
  it("accepts, defers, answers, and rejects a second answer", () => {
    const target = question();
    expect(acceptQuestion(target, teacher)).toEqual({ ok: true });
    expect(target.status).toBe("accepted");
    expect(deferQuestion(target, teacher)).toEqual({ ok: true });
    expect(target.status).toBe("deferred");
    expect(answerQuestion(target, teacher, "平方完成します")).toEqual({ ok: true });
    expect(target.status).toBe("answered");
    expect(answerQuestion(target, teacher, "もう一度")).toMatchObject({
      ok: false,
      error: "この質問にはすでに回答があります",
    });
  });

  it("requires a transfer reason and records it", () => {
    const target = question();
    expect(transferQuestion(target, teacher, otherTeacher, "")).toMatchObject({
      ok: false,
      error: "転送する理由を書いてください",
    });
    expect(transferQuestion(target, teacher, otherTeacher, "確率の方が近い")).toEqual({ ok: true });
    expect(target.assignedTeacherId).toBe("t2");
    expect(target.transferHistory[0].note).toBe("確率の方が近い");
  });

  it("closes a question", () => {
    const target = question();
    expect(closeQuestion(target, teacher)).toEqual({ ok: true });
    expect(target.status).toBe("closed");
  });
});
