import { NextResponse } from "next/server";
import { isUser, requireUser } from "@/lib/auth";
import { buildQuestionLoop } from "@/lib/loop-graph";
import { buildTopicChain } from "@/lib/loop";
import { buildMyUniverse } from "@/lib/prompts";
import { readStore } from "@/lib/store";

export async function GET() {
  const user = await requireUser(["student"]);
  if (!isUser(user)) return user;
  const store = await readStore();
  const view = buildMyUniverse(store, user);
  const mine = store.questions.filter((item) => item.studentId === user.id);
  return NextResponse.json({
    ...view,
    topics: view.topics.map((topic) => ({
      ...topic,
      chain: buildTopicChain(store, topic.subject, topic.topic, user),
      loops: mine
        .filter((item) => item.subject === topic.subject && item.topic === topic.topic)
        .map((item) => buildQuestionLoop(store, item.id))
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    })),
  });
}
