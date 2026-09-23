"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Guard } from "@/components/Guard";
import { QuestionStatusChip, UrgencyChip } from "@/components/QuestionChips";
import { api } from "@/lib/client";
import { formatDateTime } from "@/lib/format";
import type { SafeTeacher, Question } from "@/lib/types";

type Detail = Question & {
  studentName: string;
  studentHomeroom?: string;
  assignedTeacherName?: string;
  answeredByName?: string;
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
  const [teachers, setTeachers] = useState<SafeTeacher[]>([]);
  const [answer, setAnswer] = useState("");
  const [toTeacherId, setToTeacherId] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState("");

  const load = useCallback(async () => {
    const [q, t] = await Promise.all([
      api<{ question: Detail }>(`/api/questions/${id}`),
      api<{ teachers: SafeTeacher[] }>("/api/teachers"),
    ]);
    setQuestion(q.question);
    const others = t.teachers.filter((item) => item.id !== q.question.assignedTeacherId);
    setTeachers(others);
    setToTeacherId(others[0]?.id ?? "");
  }, [id]);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "読み込めませんでした"));
  }, [load]);

  async function run(label: string, path: string, body: unknown) {
    if (pending) return;
    setPending(label);
    setError("");
    try {
      await api(path, { method: "POST", body: JSON.stringify(body) });
      await load();
      if (label === "answer") setAnswer("");
      if (label === "transfer") setTransferNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作に失敗しました。もう一度お試しください。");
    } finally {
      setPending("");
    }
  }

  if (!question) return <p className="text-muted">{error || "読み込み中…"}</p>;
  const alreadyAnswered = Boolean(question.answer);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/teacher" className="text-sm text-muted hover:text-ink">
        ← 受付一覧へ
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

      <section className="grid gap-3 sm:grid-cols-3">
        <button
          className="btn-navy"
          disabled={!!pending || alreadyAnswered}
          onClick={() => void run("accept", `/api/questions/${id}/claim`, { action: "accept" })}
        >
          引き受ける
        </button>
        <button
          className="btn-ghost"
          disabled={!!pending || alreadyAnswered}
          onClick={() => void run("defer", `/api/questions/${id}/claim`, { action: "defer" })}
        >
          保留する
        </button>
        <button
          className="btn-ghost"
          disabled={!!pending}
          onClick={() => void run("close", `/api/questions/${id}/close`, {})}
        >
          終了する
        </button>
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-xl">他の先生へ回す</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <select
            className="rounded-2xl border border-line bg-paper px-4 py-3 text-sm"
            value={toTeacherId}
            onChange={(e) => setToTeacherId(e.target.value)}
          >
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}（{teacher.subjects?.join("・")}）
              </option>
            ))}
          </select>
          <input
            className="rounded-2xl border border-line bg-paper px-4 py-3 text-sm"
            value={transferNote}
            onChange={(e) => setTransferNote(e.target.value)}
            placeholder="回す理由（必須）"
          />
        </div>
        <button
          className="btn-ghost mt-3 text-sm"
          disabled={!!pending || !toTeacherId || alreadyAnswered}
          onClick={() =>
            void run("transfer", `/api/questions/${id}/transfer`, { toTeacherId, note: transferNote })
          }
        >
          転送する
        </button>
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-xl">回答する</h2>
        {alreadyAnswered ? (
          <p className="mt-3 whitespace-pre-wrap leading-relaxed">
            {question.answeredByName ? `${question.answeredByName}先生の回答：` : "回答："}
            {question.answer}
          </p>
        ) : (
          <>
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
          </>
        )}
      </section>

      {question.transferHistory.length > 0 ? (
        <section className="card p-6">
          <h2 className="font-serif text-xl">転送の記録</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {question.transferHistory.map((item) => (
              <li key={item.at}>
                {formatDateTime(item.at)}　{item.note}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {error ? <p className="text-rose">{error}</p> : null}
    </div>
  );
}
