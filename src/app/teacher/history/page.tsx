"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Guard } from "@/components/Guard";
import { QuestionStatusChip } from "@/components/QuestionChips";
import { api } from "@/lib/client";
import { formatDateTime } from "@/lib/format";
import type { Question } from "@/lib/types";

type Row = Question & { studentName: string; studentHomeroom?: string };

export default function TeacherHistoryPage() {
  return (
    <Guard role="teacher">
      <History />
    </Guard>
  );
}

function History() {
  const [questions, setQuestions] = useState<Row[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ questions: Row[] }>("/api/questions?history=1")
      .then((data) => setQuestions(data.questions))
      .catch((err) => setError(err instanceof Error ? err.message : "読み込めませんでした"));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl">対応した質問</h1>
      {error ? <p className="text-rose">{error}</p> : null}
      <div className="space-y-3">
        {questions.map((question) => (
          <Link key={question.id} href={`/teacher/questions/${question.id}`} className="card block p-5">
            <div className="flex flex-wrap items-center gap-2">
              <QuestionStatusChip status={question.status} />
              <span className="text-xs text-muted">
                {question.subject} / {question.topic}
              </span>
              <span className="ml-auto text-xs text-muted">{formatDateTime(question.createdAt)}</span>
            </div>
            <p className="mt-3 font-medium">{question.summary}</p>
            <p className="mt-1 text-sm text-muted">{question.studentName}</p>
          </Link>
        ))}
        {questions.length === 0 ? <p className="text-muted">まだ対応した質問はありません。</p> : null}
      </div>
    </div>
  );
}
