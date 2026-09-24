import { NextResponse } from "next/server";
import { isUser, requireUser } from "@/lib/auth";
import { readStore } from "@/lib/store";
import { buildUniverse } from "@/lib/universe";

export async function GET() {
  const user = await requireUser(["admin"]);
  if (!isUser(user)) return user;
  const store = await readStore();
  return NextResponse.json(buildUniverse(store));
}
