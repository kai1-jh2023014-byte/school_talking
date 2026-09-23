import { NextResponse } from "next/server";
import { isUser, requireUser } from "@/lib/auth";
import { presentQuestion } from "@/lib/present";
import { canViewQuestion, closeQuestion } from "@/lib/questions";
import { updateStore } from "@/lib/store";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const user = await requireUser(["teacher", "admin"]);
  if (!isUser(user)) return user;

  const result = await updateStore((store) => {
    const target = store.questions.find((item) => item.id === params.id);
    if (!target) return { error: "質問が見つかりません", status: 404 as const };
    if (user.role === "teacher" && !canViewQuestion(user, target)) {
      return { error: "この質問を終了する権限がありません", status: 403 as const };
    }
    const outcome = closeQuestion(target, user);
    if (!outcome.ok) return { error: outcome.error, status: 400 as const };
    return { question: presentQuestion(store, target, user) };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
