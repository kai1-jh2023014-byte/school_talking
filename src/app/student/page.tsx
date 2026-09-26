"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Guard } from "@/components/Guard";
import { QuestionStatusChip, UrgencyChip } from "@/components/QuestionChips";
import { StatusBadge } from "@/components/StatusBadge";
import { usePoll } from "@/hooks/usePoll";
import { api } from "@/lib/client";
import { formatDateTime } from "@/lib/format";
import type { Prompt, Question, SafeTeacher } from "@/lib/types";

type TeacherRow = SafeTeacher & { activeCount?: number };
type QuestionRow = Question & {
  assignedTeacherName?: string;
  headline?: string;
};

export default function StudentHomePage() {
  return (
    <Guard role="student">
      <StudentHome />
    </Guard>
  );
}

function StudentHome() {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [pending, setPending] = useState<Prompt[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    Promise.all([
      api<{ teachers: TeacherRow[] }>("/api/teachers"),
      api<{ questions: QuestionRow[] }>("/api/questions?mine=1"),
      api<{ pending: Prompt[] }>("/api/prompts"),
    ])
      .then(([t, q, p]) => {
        setTeachers(t.teachers);
        setQuestions(q.questions);
        setPending(p.pending);
        setError("");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "読み込みに失敗しました"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  usePoll(load);

  const latestUpdate = questions.find((question) => question.headline && question.headline !== "質問を投稿しました");

  return (
    <div className="space-y-8">
      <section className="card flex flex-col items-start justify-between gap-4 bg-navy p-8 text-cream md:flex-row md:items-center">
        <div>
          <p className="text-xs tracking-[0.25em] text-[#f3c19a]">いま聞きたいを、逃さない</p>
          <h1 className="mt-2 font-serif text-3xl">質問する</h1>
          <p className="mt-2 max-w-xl text-sm text-cream/75">
            文章でも、問題の写真でも大丈夫。誰に聞けばよいか分からなくても、対応できる先生を見つけます。
          </p>
        </div>
        <Link href="/student/ask" className="btn-primary">
          質問する
        </Link>
      </section>

      {latestUpdate ? (
        <Link href={`/student/questions/${latestUpdate.id}`} className="card block border-terracotta/40 p-5">
          <p className="text-xs tracking-[0.2em] text-terracotta">お知らせ</p>
          <p className="mt-2 font-medium">{latestUpdate.headline}</p>
          <p className="mt-1 text-sm text-muted">{latestUpdate.summary}</p>
        </Link>
      ) : null}

      {error ? <p className="text-rose">{error}</p> : null}

      {pending.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-serif text-2xl">先生からの問い</h2>
          {pending.map((prompt) => (
            <PromptCard key={prompt.id} prompt={prompt} onDone={load} />
          ))}
        </section>
      ) : null}

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
              <p className="mt-3 text-xs text-muted">現在対応中 {teacher.activeCount ?? 0}件</p>
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
                <p className="mt-1 text-sm text-muted">{question.headline}</p>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function PromptCard({ prompt, onDone }: { prompt: Prompt; onDone: () => void }) {
  const [optionId, setOptionId] = useState("");
  const [freeText, setFreeText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await api(`/api/prompts/${prompt.id}/respond`, {
        method: "POST",
        body: JSON.stringify({ optionId: optionId || undefined, freeText: freeText || undefined }),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "送れませんでした");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card p-5">
      <p className="text-xs text-terracotta">
        {prompt.kind === "understanding_check" ? "理解チェック" : "先生からの問い"} · {prompt.subject} / {prompt.topic}
      </p>
      <p className="mt-2 font-medium">{prompt.body}</p>
      {prompt.options.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {prompt.options.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`rounded-full px-3 py-1.5 text-sm ${optionId === option.id ? "bg-navy text-cream" : "bg-line/60"}`}
              onClick={() => setOptionId(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
      {prompt.allowFreeText ? (
        <textarea
          className="mt-3 w-full rounded-2xl border border-line bg-cream px-3 py-2 text-sm"
          placeholder="自由回答"
          value={freeText}
          onChange={(event) => setFreeText(event.target.value)}
        />
      ) : null}
      {error ? <p className="mt-2 text-sm text-rose">{error}</p> : null}
      <button type="button" className="btn-primary mt-3 text-sm" disabled={busy} onClick={() => void submit()}>
        {busy ? "送信中…" : "回答する"}
      </button>
    </article>
  );
}
