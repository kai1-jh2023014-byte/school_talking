import { NextResponse } from "next/server";
import { isUser, jsonError, requireUser } from "@/lib/auth";
import { isAudienceMember, promptsOf, responsesOf } from "@/lib/prompts";
import { updateStore } from "@/lib/store";
import { randomUUID } from "crypto";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await requireUser(["student"]);
  if (!isUser(user)) return user;

  let body: { optionId?: string; freeText?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("入力内容を確認してください");
  }

  const result = await updateStore((store) => {
    const prompt = promptsOf(store).find((item) => item.id === params.id);
    if (!prompt || prompt.status !== "open") return { error: "この問いは受け取れません", status: 404 as const };
    if (!isAudienceMember(user, prompt)) return { error: "この問いの対象ではありません", status: 403 as const };
    if (responsesOf(store).some((item) => item.promptId === prompt.id && item.studentId === user.id)) {
      return { error: "すでに回答しています", status: 409 as const };
    }
    if (!body.optionId && !body.freeText?.trim()) return { error: "選択肢か自由記述が必要です", status: 400 as const };
    if (body.optionId && !prompt.options.some((option) => option.id === body.optionId)) {
      return { error: "選択肢が正しくありません", status: 400 as const };
    }
    const response = {
      id: randomUUID(),
      promptId: prompt.id,
      studentId: user.id,
      optionId: body.optionId,
      freeText: body.freeText?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    store.promptResponses = [...responsesOf(store), response];
    return { response };
  });

  if ("error" in result && result.error) {
    return jsonError(result.error, result.status);
  }
  return NextResponse.json(result);
}
