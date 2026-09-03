"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Guard } from "@/components/Guard";
import { QuestionStatusChip, UrgencyChip } from "@/components/QuestionChips";
import { api } from "@/lib/client";
import { formatDateTime } from "@/lib/format";
import type { Question } from "@/lib/types";

type Detail = Question & {
  studentName: string;
  assignedTeacherName?: string;
  suggestedTeachers?: { id: string; name: string }[];
};

export default function StudentQuestionPage({ params }: { params: { id: string } }) {
  return (
    <Guard role="student">
      <Detail id={params.id} />
    </Guard>
  );
}

function Detail({ id }: { id: string }) {
  const [question, setQuestion] = useState<Detail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ question: Detail }>(`/api/questions/${id}`)
      .then((data) => setQuestion(data.question))
      .catch((err) => setError(err instanceof Error ? err.message : "読み込めませんでした"));
  }, [id]);

  if (error) return <p className="text-rose">{error}</p>;
  if (!question) return <p className="text-muted">読み込み中…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/student" className="text-sm text-muted hover:text-ink">
        ← ホームへ
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <QuestionStatusChip status={question.status} />
        <UrgencyChip urgency={question.urgency} />
        <span className="text-sm text-muted">
          {question.subject} / {question.topic}
        </span>
      </div>
      <h1 className="font-serif text-3xl">{question.summary}</h1>
      <p className="text-sm text-muted">{formatDateTime(question.createdAt)}</p>

      <section className="card p-6">
        <h2 className="text-sm tracking-[0.2em] text-muted">QUESTION</h2>
        <p className="mt-3 whitespace-pre-wrap leading-relaxed">{question.body}</p>
        {question.imagePath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={question.imagePath} alt="添付画像" className="mt-4 max-h-80 rounded-2xl border border-line" />
        ) : null}
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-xl">届いている先生</h2>
        <p className="mt-2">{question.assignedTeacherName ?? "まだ割り当てられていません"}</p>
        <p className="mt-1 text-sm text-muted">推奨担当 {question.recommendedDept}</p>
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-xl">回答</h2>
        {question.answer ? (
          <>
            <p className="mt-3 whitespace-pre-wrap leading-relaxed">{question.answer}</p>
            {question.answeredAt ? (
              <p className="mt-3 text-xs text-muted">{formatDateTime(question.answeredAt)}</p>
            ) : null}
          </>
        ) : (
          <p className="mt-3 text-muted">
            先生の空いた時間に届きます。職員室に行かなくても、ここで結果を確認できます。
          </p>
        )}
      </section>
    </div>
  );
}
