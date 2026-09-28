import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { isUser, jsonError, requireUser } from "@/lib/auth";
import { CHECK_OPTIONS, createPrompt, followUpsOf, promptsOf, teacherHomerooms } from "@/lib/prompts";
import { updateStore } from "@/lib/store";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await requireUser(["teacher", "admin"]);
  if (!isUser(user)) return user;
  let body: { homeroom?: string; body?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const result = await updateStore((store) => {
    const mark = followUpsOf(store).find((item) => item.id === params.id);
    if (!mark) return { error: "見つかりません", status: 404 as const };
    if (mark.kind !== "class_review") return { error: "授業確認からのみ再確認を送れます", status: 400 as const };
    const homeroom = body.homeroom || mark.homeroom;
    if (!homeroom) return { error: "クラスが必要です", status: 400 as const };
    if (user.role === "teacher" && !teacherHomerooms(user, store).includes(homeroom)) {
      return { error: "このクラスへは送れません", status: 403 as const };
    }
    const parent =
      promptsOf(store).find((item) => item.id === mark.promptId) ??
      promptsOf(store)
        .filter((item) => item.subject === mark.subject && item.topic === mark.topic && item.kind === "understanding_check")
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
    const prompt = createPrompt({
      id: randomUUID(),
      teacherId: user.id,
      kind: "understanding_check",
      subject: mark.subject,
      topic: mark.topic,
      body: body.body?.trim() || `${mark.topic}の内容を、いまどのくらい理解できていますか？`,
      options: CHECK_OPTIONS,
      audience: { type: "class", homeroom },
      purpose: "recheck",
      parentPromptId: parent?.id,
      followUpId: mark.id,
    });
    store.prompts = [...promptsOf(store), prompt];
    mark.recheckPromptId = prompt.id;
    mark.homeroom = homeroom;
    return { prompt, followUp: mark };
  });
  if ("error" in result && result.error) return jsonError(result.error, result.status);
  return NextResponse.json(result);
}
