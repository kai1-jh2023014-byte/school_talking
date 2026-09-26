import { NextResponse } from "next/server";
import { isUser, requireUser } from "@/lib/auth";
import { buildMyUniverse } from "@/lib/prompts";
import { readStore } from "@/lib/store";

export async function GET() {
  const user = await requireUser(["student"]);
  if (!isUser(user)) return user;
  const store = await readStore();
  return NextResponse.json(buildMyUniverse(store, user));
}
