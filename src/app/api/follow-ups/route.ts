import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { isUser, jsonError, requireUser } from "@/lib/auth";
import { followUpsOf } from "@/lib/prompts";
import { readStore, updateStore } from "@/lib/store";
import type { FollowUpMark } from "@/lib/types";

export async function GET() {
  const user = await requireUser(["teacher", "admin"]);
  if (!isUser(user)) return user;
  const store = await readStore();
  return NextResponse.json({ followUps: followUpsOf(store) });
}

export async function POST(request: Request) {
  const user = await requireUser(["teacher", "admin"]);
  if (!isUser(user)) return user;
  let body: { subject?: string; topic?: string; kind?: FollowUpMark["kind"] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("入力内容を確認してください");
  }
  if (!body.subject || !body.topic || !body.kind) return jsonError("教科・分野・種類が必要です");
  const mark = await updateStore((store) => {
    const created: FollowUpMark = {
      id: randomUUID(),
      subject: body.subject!,
      topic: body.topic!,
      kind: body.kind!,
      actorId: user.id,
      createdAt: new Date().toISOString(),
    };
    store.followUps = [...followUpsOf(store), created];
    return created;
  });
  return NextResponse.json({ followUp: mark });
}
