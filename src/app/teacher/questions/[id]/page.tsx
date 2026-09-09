"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Guard } from "@/components/Guard";
import { QuestionStatusChip, UrgencyChip } from "@/components/QuestionChips";
import { api } from "@/lib/client";
import { formatDateTime } from "@/lib/format";
import type { PublicUser, Question } from "@/lib/types";

type Detail = Question & {
  studentName: string;
  studentHomeroom?: string;
  assignedTeacherName?: string;
};

export default function TeacherQuestionPage({ params }: { params: { id: string } }) {
  return (
    <Guard role="teacher">
      <TeacherQuestion id={params.id} />
    </Guard>
  );
}

function TeacherQuestion({ id }: { id: string }) {
  const [question, setQuestion] = useState<Detail | null>(null);
  const [teachers, setTeachers] = useState<PublicUser[]>([]);
  const [answer, setAnswer] = useState("");
  const [toTeacherId, setToTeacherId] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState("");

  const load = useCallback(async () => {
    const [q, t] = await Promise.all([
      api<{ question: Detail }>(`/api/questions/${id}`),
      api<{ teachers: PublicUser[] }>("/api/teachers"),
    ]);
    setQuestion(q.question);
    setTeachers(t.teachers.filter((item) => item.id !== q.question.assignedTeacherId));
    setToTeacherId(
      t.teachers.find((item) => item.id !== q.question.assignedTeacherId)?.id ?? "",
    );
  }, [id]);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "読み込めませんでした"));
  }, [load]);

  async function run(label: string, path: string, body: unknown) {
    setPending(label);
    setError("");
    try {
      await api(path, { method: "POST", body: JSON.stringify(body) });
      await load();
      if (label === "answer") setAnswer("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作に失敗しました");
    } finally {
      setPending("");
    }
  }

  if (!question) return <p className="text-muted">読み込み中…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/teacher" className="text-sm text-muted hover:text-ink">
        ← 受付一覧へ
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <QuestionStatusChip status={question.status} />
        <UrgencyChip urgency={question.urgency} />
        <span className="text-sm text-muted">
          {question.subject} / {question.topic}
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
        {question.imagePath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={question.imagePath} alt="添付画像" className="mt-4 max-h-80 rounded-2xl border border-line" />
        ) : null}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <button
          className="btn-navy"
          disabled={!!pending}
          onClick={() => void run("accept", `/api/questions/${id}/claim`, { action: "accept" })}
        >
          対応する
        </button>
        <button
          className="btn-ghost"
          disabled={!!pending}
          onClick={() => void run("defer", `/api/questions/${id}/claim`, { action: "defer" })}
        >
          後で対応する
        </button>
        <div className="card flex items-center gap-2 p-2">
          <select
            className="flex-1 rounded-xl bg-transparent px-2 py-1 text-sm outline-none"
            value={toTeacherId}
            onChange={(e) => setToTeacherId(e.target.value)}
          >
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </select>
          <button
            className="btn-ghost px-3 py-1 text-xs"
            disabled={!!pending || !toTeacherId}
            onClick={() =>
              void run("transfer", `/api/questions/${id}/transfer`, { toTeacherId })
            }
          >
            回す
          </button>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-xl">回答する</h2>
        <textarea
          className="mt-3 min-h-32 w-full rounded-2xl border border-line bg-paper px-4 py-3 outline-none focus:border-terracotta"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="空いた時間に、ここに回答を書けます。"
        />
        <button
          className="btn-primary mt-4"
          disabled={!!pending}
          onClick={() => void run("answer", `/api/questions/${id}/answer`, { answer })}
        >
          {pending === "answer" ? "送信中…" : "回答を送る"}
        </button>
        {question.answer ? (
          <p className="mt-4 rounded-2xl bg-paper p-4 text-sm">前回の回答：{question.answer}</p>
        ) : null}
      </section>

      {error ? <p className="text-rose">{error}</p> : null}
    </div>
  );
}
