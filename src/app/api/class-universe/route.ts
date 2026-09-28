import { NextResponse } from "next/server";
import { isUser, jsonError, requireUser } from "@/lib/auth";
import { buildClassUniverse, canViewClass, teacherHomerooms } from "@/lib/prompts";
import { enrichClassTopic } from "@/lib/loop";
import { readStore } from "@/lib/store";

export async function GET(request: Request) {
  const user = await requireUser(["teacher", "admin"]);
  if (!isUser(user)) return user;
  const store = await readStore();
  const { searchParams } = new URL(request.url);
  const rooms = teacherHomerooms(user, store);
  const homeroom = searchParams.get("homeroom") || rooms[0];
  if (!homeroom) return jsonError("表示できるクラスがありません", 404);
  if (!canViewClass(user, homeroom, store)) return jsonError("このクラスは見られません", 403);
  const view = buildClassUniverse(store, homeroom);
  return NextResponse.json({
    homerooms: rooms,
    ...view,
    topics: view.topics.map((topic) => ({
      ...topic,
      ...enrichClassTopic(store, homeroom, topic),
    })),
    confirmCandidates: view.confirmCandidates.map((topic) => ({
      ...topic,
      ...enrichClassTopic(store, homeroom, topic),
    })),
  });
}
