import { NextResponse } from "next/server";
import { buildAnalytics } from "@/lib/analytics";
import { isUser, requireUser } from "@/lib/auth";
import { readStore } from "@/lib/store";

export async function GET() {
  const user = await requireUser(["admin"]);
  if (!isUser(user)) return user;
  const store = await readStore();
  return NextResponse.json(buildAnalytics(store));
}
