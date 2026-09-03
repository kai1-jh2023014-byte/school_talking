import { NextResponse } from "next/server";
import { isUser, requireUser, toPublicUser } from "@/lib/auth";
import { readStore } from "@/lib/store";

export async function GET() {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const store = await readStore();
  const teachers = store.users.filter((item) => item.role === "teacher").map(toPublicUser);
  return NextResponse.json({ teachers });
}
