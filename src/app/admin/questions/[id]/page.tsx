"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Guard } from "@/components/Guard";
import { QuestionStatusChip, UrgencyChip } from "@/components/QuestionChips";
import { api } from "@/lib/client";
import { formatDateTime } from "@/lib/format";
import type { Question } from "@/lib/types";

type Detail = Question & {
  studentName: string;
  studentHomeroom?: string;
  assignedTeacherName?: string;
  answeredByName?: string;
};

export default function AdminQuestionPage({ params }: { params: { id: string } }) {
  return (
    <Guard role="admin">
      <DetailView id={params.id} />
    </Guard>
  );
}

function DetailView({ id }: { id: string }) {
  const [question, setQuestion] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const load = useCallback(() => {
    return api<{ question: Detail }>(`/api/questions/${id}`).then((data) => setQuestion(data.question));
  }, [id]);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "読み込めませんでした"));
  }, [load]);

  async function close() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await api(`/api/questions/${id}/close`, { method: "POST", body: JSON.stringify({}) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "終了できませんでした");
    } finally {
      setPending(false);
    }
  }

  if (!question) return <p className="text-muted">{error || "読み込み中…"}</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/admin/questions" className="text-sm text-muted hover:text-ink">
        ← 質問履歴へ
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <QuestionStatusChip status={question.status} />
        <UrgencyChip urgency={question.urgency} />
        <span className="text-sm text-muted">
          {question.subject} / {question.topic} / {question.questionType}
        </span>
      </div>
      <h1 className="font-serif text-3xl">{question.summary}</h1>
      <p className="text-sm text-muted">
        {question.studentName}
        {question.studentHomeroom ? ` · ${question.studentHomeroom}` : ""} ·{" "}
        {formatDateTime(question.createdAt)}
      </p>

      <section className="card p-6">
        <p className="whitespace-pre-wrap leading-relaxed">{question.body}</p>
        {question.note ? <p className="mt-3 text-sm text-muted">補足：{question.note}</p> : null}
        {question.imagePath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={question.imagePath} alt="添付画像" className="mt-4 max-h-80 rounded-2xl border border-line" />
        ) : null}
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-xl">担当</h2>
        <p className="mt-2">{question.assignedTeacherName ?? "未割り当て"}</p>
        {question.answer ? (
          <p className="mt-4 whitespace-pre-wrap leading-relaxed">
            {question.answeredByName ? `${question.answeredByName}先生の回答：` : "回答："}
            {question.answer}
          </p>
        ) : (
          <p className="mt-3 text-muted">まだ回答はありません。</p>
        )}
      </section>

      {question.events?.length ? (
        <section className="card p-6">
          <h2 className="font-serif text-xl">これまでの流れ</h2>
          <ol className="mt-4 space-y-2 text-sm text-muted">
            {question.events.map((event, index) => (
              <li key={`${event.at}-${index}`}>
                {formatDateTime(event.at)}　{event.message}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {error ? <p className="text-rose">{error}</p> : null}
      <button className="btn-ghost" disabled={pending} onClick={() => void close()}>
        {pending ? "処理中…" : "この質問を終了する"}
      </button>
    </div>
  );
}
