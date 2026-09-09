"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Guard } from "@/components/Guard";
import { QuestionStatusChip, UrgencyChip } from "@/components/QuestionChips";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/client";
import { formatDateTime } from "@/lib/format";
import type { PublicUser, Question } from "@/lib/types";

type QuestionRow = Question & {
  assignedTeacherName?: string;
};

export default function StudentHomePage() {
  return (
    <Guard role="student">
      <StudentHome />
    </Guard>
  );
}

function StudentHome() {
  const [teachers, setTeachers] = useState<PublicUser[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api<{ teachers: PublicUser[] }>("/api/teachers"),
      api<{ questions: QuestionRow[] }>("/api/questions?mine=1"),
    ])
      .then(([t, q]) => {
        setTeachers(t.teachers);
        setQuestions(q.questions);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "読み込みに失敗しました"));
  }, []);

  return (
    <div className="space-y-8">
      <section className="card flex flex-col items-start justify-between gap-4 bg-navy p-8 text-cream md:flex-row md:items-center">
        <div>
          <p className="text-xs tracking-[0.25em] text-[#f3c19a]">いま聞きたいを、逃さない</p>
          <h1 className="mt-2 font-serif text-3xl">質問したい瞬間に、先生へつなぐ</h1>
          <p className="mt-2 max-w-xl text-sm text-cream/75">
            文章でも、問題の写真でも大丈夫。AIが内容を整理し、今対応できる先生を見つけます。
          </p>
        </div>
        <Link href="/student/ask" className="btn-primary">
          質問する
        </Link>
      </section>

      {error ? <p className="text-rose">{error}</p> : null}

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-serif text-2xl">先生の質問受付状況</h2>
          <p className="text-xs text-muted">在席ではなく、「今聞いてよいか」が見えます</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teachers.map((teacher) => (
            <article key={teacher.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-serif text-lg">{teacher.name}</h3>
                  <p className="text-sm text-muted">{teacher.subjects?.join("・")}</p>
                </div>
                {teacher.availability ? (
                  <StatusBadge status={teacher.availability} minutes={teacher.availableInMinutes} />
                ) : null}
              </div>
              {teacher.specialties ? (
                <p className="mt-3 text-xs text-muted">専門 {teacher.specialties.join("、")}</p>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-serif text-2xl">自分の質問</h2>
        <div className="space-y-3">
          {questions.length === 0 ? (
            <p className="text-muted">まだ質問はありません。</p>
          ) : (
            questions.map((question) => (
              <Link
                key={question.id}
                href={`/student/questions/${question.id}`}
                className="card block p-5 hover:-translate-y-0.5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <QuestionStatusChip status={question.status} />
                  <UrgencyChip urgency={question.urgency} />
                  <span className="text-xs text-muted">
                    {question.subject} / {question.topic}
                  </span>
                  <span className="ml-auto text-xs text-muted">{formatDateTime(question.createdAt)}</span>
                </div>
                <p className="mt-3 font-medium">{question.summary}</p>
                {question.assignedTeacherName ? (
                  <p className="mt-1 text-sm text-muted">担当 {question.assignedTeacherName}</p>
                ) : null}
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
