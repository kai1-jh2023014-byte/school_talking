"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Guard } from "@/components/Guard";
import { QuestionStatusChip, UrgencyChip } from "@/components/QuestionChips";
import { api } from "@/lib/client";
import { SUBJECTS } from "@/lib/constants";
import { formatDateTime, statusLabel } from "@/lib/format";
import { normalizeStatus } from "@/lib/questions";
import type { Question, QuestionStatus } from "@/lib/types";

type Row = Question & {
  studentName: string;
  studentHomeroom?: string;
  assignedTeacherName?: string;
};

const STATUS_FILTERS: { id: "all" | QuestionStatus; label: string }[] = [
  { id: "all", label: "すべて" },
  { id: "matched", label: "受付待ち" },
  { id: "accepted", label: "対応中" },
  { id: "deferred", label: "保留" },
  { id: "transferred", label: "転送" },
  { id: "answered", label: "回答あり" },
  { id: "closed", label: "終了" },
];

export default function AdminQuestionsPage() {
  return (
    <Guard role="admin">
      <Suspense fallback={<p className="text-muted">読み込み中…</p>}>
        <History />
      </Suspense>
    </Guard>
  );
}

function History() {
  const params = useSearchParams();
  const [questions, setQuestions] = useState<Row[]>([]);
  const [subject, setSubject] = useState(params.get("subject") || "all");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]["id"]>("all");
  const [query, setQuery] = useState(params.get("topic") || "");
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ questions: Row[] }>("/api/questions")
      .then((data) => setQuestions(data.questions))
      .catch((err) => setError(err instanceof Error ? err.message : "読み込めませんでした"));
  }, []);

  const visible = useMemo(() => {
    return questions.filter((question) => {
      if (subject !== "all" && question.subject !== subject) return false;
      if (status !== "all" && normalizeStatus(question.status) !== status) return false;
      if (query.trim()) {
        const hay = `${question.summary} ${question.body} ${question.topic} ${question.studentName}`.toLowerCase();
        if (!hay.includes(query.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [questions, subject, status, query]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.2em] text-terracotta">QUESTION LOG</p>
        <h1 className="mt-1 font-serif text-3xl">学校全体の質問履歴</h1>
        <p className="mt-2 text-sm text-muted">誰が、どの分野で、どこまで進んだかを一覧できます。</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className="rounded-full border border-line bg-cream px-3 py-1.5 text-sm"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        >
          <option value="all">科目：すべて</option>
          {SUBJECTS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        {STATUS_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`rounded-full px-3 py-1.5 text-sm ${status === item.id ? "bg-navy text-cream" : "bg-line/60"}`}
            onClick={() => setStatus(item.id)}
          >
            {item.label}
          </button>
        ))}
        <input
          className="min-w-48 flex-1 rounded-full border border-line bg-cream px-4 py-1.5 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="生徒名・分野で探す"
        />
      </div>

      {error ? <p className="text-rose">{error}</p> : null}

      <section className="space-y-3">
        {visible.map((question) => (
          <Link key={question.id} href={`/admin/questions/${question.id}`} className="card block p-5">
            <div className="flex flex-wrap items-center gap-2">
              <QuestionStatusChip status={question.status} />
              <UrgencyChip urgency={question.urgency} />
              <span className="text-xs text-muted">
                {question.subject} / {question.topic}
              </span>
              <span className="ml-auto text-xs text-muted">{formatDateTime(question.createdAt)}</span>
            </div>
            <p className="mt-3 font-medium">{question.summary}</p>
            <p className="mt-1 text-sm text-muted">
              {question.studentName}
              {question.studentHomeroom ? ` · ${question.studentHomeroom}` : ""}
              {question.assignedTeacherName ? ` · ${question.assignedTeacherName}先生` : ""}
              {` · ${statusLabel(question.status)}`}
            </p>
          </Link>
        ))}
        {visible.length === 0 ? <p className="text-muted">該当する質問はありません。</p> : null}
      </section>
    </div>
  );
}
