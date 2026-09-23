import { NextResponse } from "next/server";
import { isUser, requireUser } from "@/lib/auth";
import { presentQuestion } from "@/lib/present";
import { answerQuestion, canViewQuestion } from "@/lib/questions";
import { updateStore } from "@/lib/store";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await requireUser(["teacher"]);
  if (!isUser(user)) return user;
  const body = (await request.json().catch(() => ({}))) as { answer?: string };

  const result = await updateStore((store) => {
    const target = store.questions.find((item) => item.id === params.id);
    if (!target) return { error: "質問が見つかりません", status: 404 as const };
    if (!canViewQuestion(user, target) && target.assignedTeacherId !== user.id) {
      return { error: "この質問に回答する権限がありません", status: 403 as const };
    }
    const outcome = answerQuestion(target, user, body.answer ?? "");
    if (!outcome.ok) return { error: outcome.error, status: 400 as const };
    return { question: presentQuestion(store, target, user) };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
