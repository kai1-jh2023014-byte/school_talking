import { NextResponse } from "next/server";
import { isUser, requireUser } from "@/lib/auth";
import { updateStore } from "@/lib/store";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await requireUser(["teacher"]);
  if (!isUser(user)) return user;
  const body = (await request.json()) as { toTeacherId?: string; note?: string };
  if (!body.toTeacherId) {
    return NextResponse.json({ error: "転送先の先生を選んでください" }, { status: 400 });
  }

  const question = await updateStore((store) => {
    const target = store.questions.find((item) => item.id === params.id);
    const dest = store.users.find((item) => item.id === body.toTeacherId && item.role === "teacher");
    if (!target || !dest) return null;
    target.transferHistory.push({
      fromTeacherId: user.id,
      toTeacherId: dest.id,
      at: new Date().toISOString(),
      note: body.note,
    });
    target.assignedTeacherId = dest.id;
    target.status = dest.availability === "available" ? "assigned" : "queued";
    return target;
  });

  if (!question) {
    return NextResponse.json({ error: "転送できませんでした" }, { status: 404 });
  }
  return NextResponse.json({ question });
}
