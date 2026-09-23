import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { isUser, requireUser, toSafeTeacher } from "@/lib/auth";
import { classifyQuestionSafe } from "@/lib/classify";
import { matchTeachers } from "@/lib/match";
import { presentQuestion } from "@/lib/present";
import { addEvent, listVisibleQuestions } from "@/lib/questions";
import { readStore, updateStore } from "@/lib/store";
import type { Question } from "@/lib/types";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const store = await readStore();
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("history") === "1"
    ? "history"
    : searchParams.get("mine") === "1"
      ? "mine"
      : searchParams.get("inbox") === "1"
        ? "inbox"
        : user.role === "admin"
          ? "all"
          : user.role === "teacher"
            ? "inbox"
            : "mine";

  if (user.role === "teacher" && searchParams.get("all") === "1") {
    return NextResponse.json({ error: "この画面を使う権限がありません" }, { status: 403 });
  }

  const questions = listVisibleQuestions(user, store.questions, scope).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return NextResponse.json({
    questions: questions.map((question) => presentQuestion(store, question, user)),
  });
}

export async function POST(request: Request) {
  const user = await requireUser(["student"]);
  if (!isUser(user)) return user;

  let body: { body?: string; note?: string; imagePath?: string; teacherId?: string | null; subjectHint?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "質問の送信に失敗しました。もう一度お試しください。" }, { status: 400 });
  }

  const text = body.body?.trim() ?? "";
  if (!text) {
    return NextResponse.json({ error: "質問を入力してください" }, { status: 400 });
  }

  const classification = await classifyQuestionSafe(text, body.subjectHint);

  try {
    const created = await updateStore((store) => {
      const teachers = store.users.filter((item) => item.role === "teacher").map(toSafeTeacher);
      const matches = matchTeachers(teachers, classification, store.questions);
      const suggestedTeacherIds = matches.slice(0, 3).map((item) => item.teacher.id);
      const assignedTeacherId = body.teacherId || suggestedTeacherIds[0] || null;
      const assigned = assignedTeacherId
        ? store.users.find((item) => item.id === assignedTeacherId && item.role === "teacher" && item.status === "active")
        : undefined;

      const question: Question = {
        id: randomUUID(),
        studentId: user.id,
        body: text,
        note: body.note?.trim() || undefined,
        imagePath: body.imagePath,
        createdAt: new Date().toISOString(),
        subject: classification.subject,
        topic: classification.topic,
        summary: classification.summary,
        urgency: classification.urgency,
        recommendedDept: classification.recommendedDept,
        questionType: classification.questionType,
        classifyReasons: classification.reasons,
        classifySource: classification.source,
        status: assigned?.availability === "available" ? "accepted" : "matched",
        assignedTeacherId: assigned?.id ?? null,
        suggestedTeacherIds,
        transferHistory: [],
        events: [],
      };
      addEvent(question, { type: "submitted", actorId: user.id, message: "質問を投稿しました" });
      addEvent(question, {
        type: "classified",
        message: `${classification.subject} / ${classification.topic} として整理しました`,
      });
      if (assigned) {
        addEvent(question, {
          type: question.status === "accepted" ? "accepted" : "matched",
          message:
            question.status === "accepted"
              ? `${assigned.name}先生がいま対応できるので届けました`
              : `${assigned.name}先生の待ち行列に入れました`,
        });
      }
      store.questions.unshift(question);
      return presentQuestion(store, question, user);
    });

    return NextResponse.json({ question: created, classification });
  } catch {
    return NextResponse.json(
      { error: "質問の送信に失敗しました。もう一度お試しください。" },
      { status: 500 },
    );
  }
}
