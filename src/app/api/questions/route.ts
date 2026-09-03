import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { isUser, requireUser, toPublicUser } from "@/lib/auth";
import { classifyQuestion } from "@/lib/classify";
import { matchTeachers } from "@/lib/match";
import { readStore, updateStore } from "@/lib/store";
import type { Question, QuestionStatus } from "@/lib/types";

function withNames(store: Awaited<ReturnType<typeof readStore>>, question: Question) {
  const student = store.users.find((u) => u.id === question.studentId);
  const teacher = question.assignedTeacherId
    ? store.users.find((u) => u.id === question.assignedTeacherId)
    : undefined;
  const answerer = question.answeredBy
    ? store.users.find((u) => u.id === question.answeredBy)
    : undefined;
  return {
    ...question,
    studentName: student?.name ?? "不明",
    studentHomeroom: student?.homeroom,
    assignedTeacherName: teacher?.name,
    answeredByName: answerer?.name,
  };
}

export async function GET(request: Request) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const store = await readStore();
  const { searchParams } = new URL(request.url);
  const mine = searchParams.get("mine") === "1";
  const inbox = searchParams.get("inbox") === "1";

  let questions = store.questions;
  if (user.role === "student" || mine) {
    questions = questions.filter((q) => q.studentId === user.id);
  } else if (user.role === "teacher" && inbox) {
    questions = questions.filter((q) => {
      if (q.assignedTeacherId === user.id) return true;
      if (!q.assignedTeacherId && user.subjects?.includes(q.subject) && q.status === "open") {
        return true;
      }
      return false;
    });
  }

  questions = [...questions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return NextResponse.json({ questions: questions.map((q) => withNames(store, q)) });
}

export async function POST(request: Request) {
  const user = await requireUser(["student"]);
  if (!isUser(user)) return user;

  const body = (await request.json()) as {
    body?: string;
    imagePath?: string;
    teacherId?: string | null;
  };
  const text = body.body?.trim() ?? "";
  if (!text) {
    return NextResponse.json({ error: "質問を入力してください" }, { status: 400 });
  }

  const classification = classifyQuestion(text);

  const created = await updateStore((store) => {
    const teachers = store.users.filter((item) => item.role === "teacher").map(toPublicUser);
    const matches = matchTeachers(teachers, classification);
    const suggestedTeacherIds = matches.slice(0, 3).map((m) => m.teacher.id);

    const assignedTeacherId = body.teacherId || suggestedTeacherIds[0] || null;
    const assigned = assignedTeacherId
      ? store.users.find((item) => item.id === assignedTeacherId)
      : undefined;

    let status: QuestionStatus = "open";
    if (assigned?.availability === "available") status = "assigned";
    else if (assigned) status = "queued";

    const question: Question = {
      id: randomUUID(),
      studentId: user.id,
      body: text,
      imagePath: body.imagePath,
      createdAt: new Date().toISOString(),
      subject: classification.subject,
      topic: classification.topic,
      summary: classification.summary,
      urgency: classification.urgency,
      recommendedDept: classification.recommendedDept,
      classifyReasons: classification.reasons,
      status,
      assignedTeacherId,
      suggestedTeacherIds,
      transferHistory: [],
    };
    store.questions.unshift(question);
    return withNames(store, question);
  });

  return NextResponse.json({ question: created, classification });
}
