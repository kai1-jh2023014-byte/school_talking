import { NextResponse } from "next/server";
import { isUser, requireUser, toPublicUser } from "@/lib/auth";
import { classifyQuestion } from "@/lib/classify";
import { matchTeachers } from "@/lib/match";
import { readStore } from "@/lib/store";

export async function POST(request: Request) {
  const user = await requireUser(["student"]);
  if (!isUser(user)) return user;

  const body = (await request.json()) as { body?: string };
  const text = body.body?.trim() ?? "";
  if (!text) {
    return NextResponse.json({ error: "質問を入力してください" }, { status: 400 });
  }

  const classification = classifyQuestion(text);
  const store = await readStore();
  const teachers = store.users.filter((item) => item.role === "teacher").map(toPublicUser);
  const matches = matchTeachers(teachers, classification);

  return NextResponse.json({ classification, matches });
}
