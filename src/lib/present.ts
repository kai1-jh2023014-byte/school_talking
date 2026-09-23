import { studentHeadline } from "./questions";
import type { Question, StoreData, User } from "./types";

export function presentQuestion(store: StoreData, question: Question, viewer?: User) {
  const student = store.users.find((u) => u.id === question.studentId);
  const teacher = question.assignedTeacherId
    ? store.users.find((u) => u.id === question.assignedTeacherId)
    : undefined;
  const answerer = question.answeredBy
    ? store.users.find((u) => u.id === question.answeredBy)
    : undefined;
  const showStudentName = viewer?.role !== "student" || viewer.id === question.studentId;

  return {
    ...question,
    studentName: showStudentName ? student?.name ?? "生徒" : "生徒",
    studentHomeroom: student?.homeroom,
    assignedTeacherName: teacher?.name,
    answeredByName: answerer?.name,
    headline: studentHeadline(question),
  };
}
