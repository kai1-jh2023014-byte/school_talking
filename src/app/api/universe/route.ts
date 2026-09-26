import { NextResponse } from "next/server";
import { isUser, requireUser, toSafeTeacher } from "@/lib/auth";
import { buildSchoolSnapshot, insightStale } from "@/lib/insights";
import { readStore } from "@/lib/store";
import { buildUniverse, toUniverseView } from "@/lib/universe";

export async function GET() {
  const user = await requireUser(["admin"]);
  if (!isUser(user)) return user;
  const store = await readStore();
  const universe = toUniverseView(buildUniverse(store));
  const snapshot = buildSchoolSnapshot(store);
  const cached = store.schoolInsight;
  const stale = insightStale(cached, snapshot.fingerprint);
  const teachers = store.users.filter((item) => item.role === "teacher" && item.status !== "disabled").map(toSafeTeacher);

  return NextResponse.json({
    ...universe,
    snapshot,
    insight: cached ?? null,
    insightStale: stale,
    teachers,
  });
}
