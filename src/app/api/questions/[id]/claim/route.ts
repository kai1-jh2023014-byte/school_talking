import { NextResponse } from "next/server";
import { isUser, requireUser } from "@/lib/auth";
import { updateStore } from "@/lib/store";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await requireUser(["teacher"]);
  if (!isUser(user)) return user;
  const body = (await request.json()) as { action?: "accept" | "defer" };
  const action = body.action ?? "accept";

  const question = await updateStore((store) => {
    const target = store.questions.find((item) => item.id === params.id);
    if (!target) return null;
    target.assignedTeacherId = user.id;
    target.status = action === "defer" ? "queued" : "assigned";
    return target;
  });

  if (!question) {
    return NextResponse.json({ error: "質問が見つかりません" }, { status: 404 });
  }
  return NextResponse.json({ question });
}
