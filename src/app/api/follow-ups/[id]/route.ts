import { NextResponse } from "next/server";
import { isUser, jsonError, requireUser } from "@/lib/auth";
import { followUpsOf } from "@/lib/prompts";
import { updateStore } from "@/lib/store";
import type { FollowUpStatus } from "@/lib/types";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await requireUser(["teacher", "admin"]);
  if (!isUser(user)) return user;
  let body: { status?: FollowUpStatus };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("入力内容を確認してください");
  }
  if (!body.status || !["planned", "completed", "cancelled"].includes(body.status)) {
    return jsonError("状態が正しくありません");
  }
  const result = await updateStore((store) => {
    const mark = followUpsOf(store).find((item) => item.id === params.id);
    if (!mark) return { error: "見つかりません", status: 404 as const };
    if (user.role === "teacher" && mark.actorId !== user.id) {
      return { error: "この記録は更新できません", status: 403 as const };
    }
    mark.status = body.status;
    mark.completedAt = body.status === "completed" ? new Date().toISOString() : mark.completedAt;
    return { followUp: mark };
  });
  if ("error" in result && result.error) return jsonError(result.error, result.status);
  return NextResponse.json(result);
}
