import { NextResponse } from "next/server";
import { isUser, requireUser } from "@/lib/auth";
import { buildMyUniverse } from "@/lib/prompts";
import { buildTopicChain } from "@/lib/loop";
import { readStore } from "@/lib/store";

export async function GET() {
  const user = await requireUser(["student"]);
  if (!isUser(user)) return user;
  const store = await readStore();
  const view = buildMyUniverse(store, user);
  return NextResponse.json({
    ...view,
    topics: view.topics.map((topic) => ({
      ...topic,
      chain: buildTopicChain(store, topic.subject, topic.topic, user),
    })),
  });
}
