import { NextResponse } from "next/server";
import { isUser, requireUser, toSafeTeacher } from "@/lib/auth";
import { buildSchoolSnapshot, insightStale } from "@/lib/insights";
import { readStore } from "@/lib/store";
import { buildUniverse, scopeStoreForUniverse, toUniverseView } from "@/lib/universe";

export async function GET() {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const store = await readStore();
  const scoped = scopeStoreForUniverse(store, user);
  const universe = toUniverseView(buildUniverse(scoped));
  const snapshot = buildSchoolSnapshot(scoped);
  const cached = user.role === "admin" ? store.schoolInsight : null;
  const stale = user.role === "admin" ? insightStale(cached ?? undefined, snapshot.fingerprint) : false;
  const teachers =
    user.role === "admin"
      ? store.users.filter((item) => item.role === "teacher" && item.status !== "disabled").map(toSafeTeacher)
      : [];

  return NextResponse.json({
    ...universe,
    snapshot,
    insight: cached ?? null,
    insightStale: stale,
    teachers,
    view: user.role === "admin" ? "school" : user.role === "teacher" ? "class" : "mine",
  });
}
