import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { isUser, jsonError, requireUser } from "@/lib/auth";
import {
  audienceStudents,
  canAuthorPrompts,
  createPrompt,
  isAudienceMember,
  pendingPromptsFor,
  promptsOf,
  responsesOf,
  teacherHomerooms,
} from "@/lib/prompts";
import { readStore, updateStore } from "@/lib/store";
import type { PromptAudience, PromptKind } from "@/lib/types";

export async function GET() {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const store = await readStore();
  if (user.role === "student") {
    const pending = pendingPromptsFor(store, user);
    const answeredIds = new Set(
      responsesOf(store).filter((item) => item.studentId === user.id).map((item) => item.promptId),
    );
    return NextResponse.json({
      pending,
      answered: promptsOf(store).filter((prompt) => answeredIds.has(prompt.id) && isAudienceMember(user, prompt)),
    });
  }
  const list =
    user.role === "admin"
      ? promptsOf(store)
      : promptsOf(store).filter(
          (prompt) =>
            prompt.teacherId === user.id ||
            (prompt.audience.type === "class" && teacherHomerooms(user, store).includes(prompt.audience.homeroom)),
        );
  return NextResponse.json({
    prompts: list.map((prompt) => ({
      ...prompt,
      audienceCount: audienceStudents(store, prompt.audience).length,
      responseCount: responsesOf(store).filter((item) => item.promptId === prompt.id).length,
    })),
  });
}

export async function POST(request: Request) {
  const user = await requireUser(["teacher", "admin"]);
  if (!isUser(user)) return user;
  if (!canAuthorPrompts(user)) return jsonError("この操作はできません", 403);

  let body: {
    kind?: PromptKind;
    subject?: string;
    topic?: string;
    body?: string;
    allowFreeText?: boolean;
    options?: { id: string; label: string; anxious?: boolean }[];
    audience?: PromptAudience;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("入力内容を確認してください");
  }
  if (!body.kind || !body.subject || !body.topic || !body.body?.trim() || !body.audience) {
    return jsonError("種類・教科・分野・本文・宛先が必要です");
  }
  if (user.role === "teacher" && body.audience.type === "class") {
    const rooms = teacherHomerooms(user, await readStore());
    if (!rooms.includes(body.audience.homeroom)) return jsonError("このクラスへは送れません", 403);
  }

  const prompt = await updateStore((store) => {
    const created = createPrompt({
      id: randomUUID(),
      teacherId: user.id,
      kind: body.kind!,
      subject: body.subject!,
      topic: body.topic!,
      body: body.body!,
      options: body.options,
      allowFreeText: body.allowFreeText,
      audience: body.audience!,
    });
    store.prompts = [...promptsOf(store), created];
    return created;
  });
  return NextResponse.json({ prompt });
}
