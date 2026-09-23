import type { Question, QuestionEvent, QuestionStatus, User } from "./types";

export const ACTIVE_LOAD_STATUSES: QuestionStatus[] = [
  "matched",
  "accepted",
  "deferred",
  "transferred",
  "open",
  "queued",
  "assigned",
];

const STATUS_ALIAS: Record<string, QuestionStatus> = {
  open: "matched",
  queued: "deferred",
  assigned: "accepted",
};

export function normalizeStatus(status: QuestionStatus): QuestionStatus {
  return STATUS_ALIAS[status] ?? status;
}

export function addEvent(
  question: Question,
  event: Omit<QuestionEvent, "at"> & { at?: string },
): void {
  question.events = question.events ?? [];
  question.events.push({
    ...event,
    at: event.at ?? new Date().toISOString(),
  });
}

export function teacherLoad(teacherId: string, questions: Question[]): number {
  return questions.filter(
    (question) =>
      question.assignedTeacherId === teacherId &&
      ACTIVE_LOAD_STATUSES.includes(normalizeStatus(question.status)),
  ).length;
}

export function canViewQuestion(user: User, question: Question): boolean {
  if (user.status === "disabled") return false;
  if (user.role === "admin") return true;
  if (user.role === "student") return question.studentId === user.id;
  if (user.role === "teacher") {
    if (question.assignedTeacherId === user.id) return true;
    if (question.answeredBy === user.id) return true;
    if (
      question.transferHistory.some(
        (item) => item.fromTeacherId === user.id || item.toTeacherId === user.id,
      )
    ) {
      return true;
    }
    const status = normalizeStatus(question.status);
    if (
      !question.assignedTeacherId &&
      user.subjects?.includes(question.subject) &&
      ["matched", "classified", "submitted"].includes(status)
    ) {
      return true;
    }
    return false;
  }
  return false;
}

export function listVisibleQuestions(
  user: User,
  questions: Question[],
  scope: "inbox" | "history" | "mine" | "all",
): Question[] {
  if (user.role === "student" || scope === "mine") {
    return questions.filter((question) => question.studentId === user.id);
  }
  if (user.role === "admin" && scope === "all") {
    return questions;
  }
  if (user.role !== "teacher") {
    return questions.filter((question) => canViewQuestion(user, question));
  }

  if (scope === "history") {
    return questions.filter(
      (question) =>
        question.answeredBy === user.id ||
        question.transferHistory.some((item) => item.fromTeacherId === user.id) ||
        (question.assignedTeacherId === user.id &&
          ["answered", "closed"].includes(normalizeStatus(question.status))),
    );
  }

  return questions.filter((question) => {
    const status = normalizeStatus(question.status);
    if (["answered", "closed", "cancelled"].includes(status)) return false;
    if (question.assignedTeacherId === user.id) return true;
    if (
      !question.assignedTeacherId &&
      user.subjects?.includes(question.subject) &&
      ["matched", "classified", "submitted"].includes(status)
    ) {
      return true;
    }
    return false;
  });
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export function acceptQuestion(question: Question, teacher: User): ActionResult {
  if (teacher.role !== "teacher" || teacher.status !== "active") {
    return { ok: false, error: "この操作は先生のみできます" };
  }
  const status = normalizeStatus(question.status);
  if (["answered", "closed", "cancelled"].includes(status)) {
    return { ok: false, error: "この質問はすでに終了しています" };
  }
  question.assignedTeacherId = teacher.id;
  question.status = "accepted";
  addEvent(question, {
    type: "accepted",
    actorId: teacher.id,
    message: `${teacher.name}先生が質問を受け付けました`,
  });
  return { ok: true };
}

export function deferQuestion(question: Question, teacher: User): ActionResult {
  if (teacher.role !== "teacher" || teacher.status !== "active") {
    return { ok: false, error: "この操作は先生のみできます" };
  }
  const status = normalizeStatus(question.status);
  if (["answered", "closed", "cancelled"].includes(status)) {
    return { ok: false, error: "この質問はすでに終了しています" };
  }
  question.assignedTeacherId = teacher.id;
  question.status = "deferred";
  addEvent(question, {
    type: "deferred",
    actorId: teacher.id,
    message: `${teacher.name}先生が、あとで対応するとしました`,
  });
  return { ok: true };
}

export function answerQuestion(question: Question, teacher: User, answer: string): ActionResult {
  if (teacher.role !== "teacher" || teacher.status !== "active") {
    return { ok: false, error: "この操作は先生のみできます" };
  }
  const text = answer.trim();
  if (!text) return { ok: false, error: "回答を入力してください" };
  const status = normalizeStatus(question.status);
  if (status === "answered") {
    return { ok: false, error: "この質問にはすでに回答があります" };
  }
  if (["closed", "cancelled"].includes(status)) {
    return { ok: false, error: "終了した質問には回答できません" };
  }
  question.answer = text;
  question.answeredAt = new Date().toISOString();
  question.answeredBy = teacher.id;
  question.assignedTeacherId = teacher.id;
  question.status = "answered";
  addEvent(question, {
    type: "answered",
    actorId: teacher.id,
    message: `${teacher.name}先生から回答が届きました`,
  });
  return { ok: true };
}

export function transferQuestion(
  question: Question,
  from: User,
  to: User,
  note: string,
): ActionResult {
  if (from.role !== "teacher" || from.status !== "active") {
    return { ok: false, error: "この操作は先生のみできます" };
  }
  if (to.role !== "teacher" || to.status !== "active") {
    return { ok: false, error: "転送先の先生が見つかりません" };
  }
  if (from.id === to.id) {
    return { ok: false, error: "自分自身には転送できません" };
  }
  const reason = note.trim();
  if (!reason) {
    return { ok: false, error: "転送する理由を書いてください" };
  }
  const status = normalizeStatus(question.status);
  if (["answered", "closed", "cancelled"].includes(status)) {
    return { ok: false, error: "終了した質問は転送できません" };
  }
  question.transferHistory.push({
    fromTeacherId: from.id,
    toTeacherId: to.id,
    at: new Date().toISOString(),
    note: reason,
  });
  question.assignedTeacherId = to.id;
  question.status = to.availability === "available" ? "accepted" : "transferred";
  addEvent(question, {
    type: "transferred",
    actorId: from.id,
    message: `${from.name}先生から${to.name}先生へ回りました（${reason}）`,
  });
  return { ok: true };
}

export function closeQuestion(question: Question, actor: User): ActionResult {
  if (actor.role !== "teacher" && actor.role !== "admin") {
    return { ok: false, error: "この操作はできません" };
  }
  if (normalizeStatus(question.status) === "closed") {
    return { ok: false, error: "すでに終了しています" };
  }
  question.status = "closed";
  addEvent(question, {
    type: "closed",
    actorId: actor.id,
    message: "この質問は終了しました",
  });
  return { ok: true };
}

export function studentHeadline(question: Question): string {
  const latest = [...(question.events ?? [])].reverse()[0];
  if (latest?.message) return latest.message;
  const status = normalizeStatus(question.status);
  if (status === "answered") return "先生から回答が届きました";
  if (status === "accepted") return "先生が質問を受け付けました";
  if (status === "transferred") return "別の先生へ回りました";
  if (status === "deferred") return "先生が、あとで対応する予定です";
  if (status === "closed") return "この質問は終了しました";
  return "先生につながるのを待っています";
}

export function queueBucket(question: Question): "new" | "active" | "deferred" | "answered" | "transferred" {
  const status = normalizeStatus(question.status);
  if (status === "answered" || status === "closed") return "answered";
  if (question.transferHistory.length > 0 && status === "transferred") return "transferred";
  if (status === "deferred") return "deferred";
  if (status === "accepted") return "active";
  return "new";
}
