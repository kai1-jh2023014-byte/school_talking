import { NextResponse } from "next/server";
import { isUser, requireUser } from "@/lib/auth";
import { resetStore } from "@/lib/store";

export async function POST() {
  const user = await requireUser(["admin"]);
  if (!isUser(user)) return user;
  const store = await resetStore();
  return NextResponse.json({
    ok: true,
    users: store.users.length,
    questions: store.questions.length,
  });
}
