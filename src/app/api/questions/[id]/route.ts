import { NextResponse } from "next/server";
import { isUser, requireUser } from "@/lib/auth";
import { readStore } from "@/lib/store";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const user = await requireUser();
  if (!isUser(user)) return user;
  const store = await readStore();
  const question = store.questions.find((item) => item.id === params.id);
  if (!question) {
    return NextResponse.json({ error: "質問が見つかりません" }, { status: 404 });
  }
  if (user.role === "student" && question.studentId !== user.id) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const student = store.users.find((u) => u.id === question.studentId);
  const teacher = question.assignedTeacherId
    ? store.users.find((u) => u.id === question.assignedTeacherId)
    : undefined;
  const suggested = store.users.filter((u) => question.suggestedTeacherIds.includes(u.id));

  return NextResponse.json({
    question: {
      ...question,
      studentName: student?.name ?? "不明",
      studentHomeroom: student?.homeroom,
      assignedTeacherName: teacher?.name,
      suggestedTeachers: suggested.map((item) => ({
        id: item.id,
        name: item.name,
        availability: item.availability,
        subjects: item.subjects,
      })),
    },
  });
}
