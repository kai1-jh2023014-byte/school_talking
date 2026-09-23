import { NextResponse } from "next/server";
import { isUser, requireUser } from "@/lib/auth";
import { presentQuestion } from "@/lib/present";
import { canViewQuestion } from "@/lib/questions";
import { readStore } from "@/lib/store";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const store = await readStore();
  const question = store.questions.find((item) => item.id === params.id);
  if (!question) {
    return NextResponse.json({ error: "質問が見つかりません" }, { status: 404 });
  }
  if (!canViewQuestion(user, question)) {
    return NextResponse.json({ error: "この質問を見る権限がありません" }, { status: 403 });
  }

  return NextResponse.json({ question: presentQuestion(store, question, user) });
}
