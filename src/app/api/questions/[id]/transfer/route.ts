import { NextResponse } from "next/server";
import { isUser, requireUser } from "@/lib/auth";
import { presentQuestion } from "@/lib/present";
import { canViewQuestion, transferQuestion } from "@/lib/questions";
import { updateStore } from "@/lib/store";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await requireUser(["teacher"]);
  if (!isUser(user)) return user;
  const body = (await request.json().catch(() => ({}))) as { toTeacherId?: string; note?: string };

  const result = await updateStore((store) => {
    const target = store.questions.find((item) => item.id === params.id);
    const dest = store.users.find((item) => item.id === body.toTeacherId && item.role === "teacher");
    if (!target) return { error: "質問が見つかりません", status: 404 as const };
    if (!dest) return { error: "転送先の先生が見つかりません", status: 404 as const };
    if (!canViewQuestion(user, target) && target.assignedTeacherId !== user.id) {
      return { error: "この質問を転送する権限がありません", status: 403 as const };
    }
    const outcome = transferQuestion(target, user, dest, body.note ?? "");
    if (!outcome.ok) return { error: outcome.error, status: 400 as const };
    return { question: presentQuestion(store, target, user) };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
