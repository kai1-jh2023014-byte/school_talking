import { NextResponse } from "next/server";
import { isUser, requireUser } from "@/lib/auth";
import { buildSchoolSnapshot, insightStale } from "@/lib/insights";
import { analyzeSchoolSnapshot } from "@/lib/jev/insights";
import { readStore, updateStore } from "@/lib/store";

export async function POST(request: Request) {
  const user = await requireUser(["admin"]);
  if (!isUser(user)) return user;

  let force = false;
  try {
    const body = (await request.json()) as { force?: boolean };
    force = Boolean(body.force);
  } catch {
    force = false;
  }

  const store = await readStore();
  const snapshot = buildSchoolSnapshot(store);
  const cached = store.schoolInsight;
  if (!force && cached && !insightStale(cached, snapshot.fingerprint)) {
    return NextResponse.json({ insight: cached, snapshot, reused: true });
  }

  const insight = await analyzeSchoolSnapshot({ snapshot });
  await updateStore((next) => {
    next.schoolInsight = insight;
  });
  return NextResponse.json({ insight, snapshot, reused: false });
}
