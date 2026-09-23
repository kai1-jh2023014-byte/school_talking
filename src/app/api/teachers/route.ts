import { NextResponse } from "next/server";
import { isUser, requireUser, toSafeTeacher } from "@/lib/auth";
import { teacherLoad } from "@/lib/questions";
import { readStore } from "@/lib/store";

export async function GET() {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const store = await readStore();
  const teachers = store.users
    .filter((item) => item.role === "teacher" && item.status === "active")
    .map((item) => ({
      ...toSafeTeacher(item),
      activeCount: teacherLoad(item.id, store.questions),
    }));
  return NextResponse.json({ teachers });
}
