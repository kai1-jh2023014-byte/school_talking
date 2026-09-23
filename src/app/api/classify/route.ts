import { NextResponse } from "next/server";
import { isUser, requireUser, toSafeTeacher } from "@/lib/auth";
import { classifyQuestionSafe } from "@/lib/classify";
import { matchTeachers } from "@/lib/match";
import { readStore } from "@/lib/store";

export async function POST(request: Request) {
  const user = await requireUser(["student"]);
  if (!isUser(user)) return user;

  const body = (await request.json().catch(() => ({}))) as { body?: string; subjectHint?: string };
  const text = body.body?.trim() ?? "";
  if (!text) {
    return NextResponse.json({ error: "質問を入力してください" }, { status: 400 });
  }

  const classification = await classifyQuestionSafe(text, body.subjectHint);
  const store = await readStore();
  const teachers = store.users.filter((item) => item.role === "teacher").map(toSafeTeacher);
  const matches = matchTeachers(teachers, classification, store.questions);

  return NextResponse.json({ classification, matches });
}
