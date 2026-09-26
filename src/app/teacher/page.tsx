"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Guard } from "@/components/Guard";
import { QuestionStatusChip, UrgencyChip } from "@/components/QuestionChips";
import { usePoll } from "@/hooks/usePoll";
import { api } from "@/lib/client";
import { formatDateTime } from "@/lib/format";
import { queueBucket } from "@/lib/questions";
import type { Availability, PublicUser, Question } from "@/lib/types";

type Row = Question & {
  studentName: string;
  studentHomeroom?: string;
};

const STATUSES: { value: Availability; title: string; help: string }[] = [
  { value: "available", title: "今質問OK", help: "いま対応できます" },
  { value: "soon", title: "少し待てば対応可能", help: "授業のあとなど" },
  { value: "busy", title: "現在対応不可", help: "会議・授業中" },
  { value: "off", title: "本日は対応終了", help: "今日はここまで" },
];

const TABS = [
  { id: "new", label: "新しい質問" },
  { id: "active", label: "対応中" },
  { id: "deferred", label: "保留" },
  { id: "transferred", label: "転送" },
] as const;

export default function TeacherHomePage() {
  return (
    <Guard role="teacher">
      <TeacherHome />
    </Guard>
  );
}

function TeacherHome() {
  const [me, setMe] = useState<PublicUser | null>(null);
  const [questions, setQuestions] = useState<Row[]>([]);
  const [minutes, setMinutes] = useState(10);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("new");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    Promise.all([
      api<{ user: PublicUser }>("/api/auth"),
      api<{ questions: Row[] }>("/api/questions?inbox=1"),
    ])
      .then(([auth, inbox]) => {
        setMe(auth.user);
        setQuestions(inbox.questions);
        if (auth.user.availableInMinutes) setMinutes(auth.user.availableInMinutes);
        setError("");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "読み込みに失敗しました"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  usePoll(load);

  async function setStatus(availability: Availability) {
    setError("");
    try {
      const data = await api<{ teacher: PublicUser }>("/api/teachers/status", {
        method: "PATCH",
        body: JSON.stringify({
          availability,
          availableInMinutes: availability === "soon" ? minutes : undefined,
        }),
      });
      setMe(data.teacher);
    } catch (err) {
      setError(err instanceof Error ? err.message : "受付状況を更新できませんでした");
    }
  }

  const visible = questions.filter((question) => queueBucket(question) === tab);

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs tracking-[0.2em] text-terracotta">AVAILABILITY</p>
        <h1 className="mt-1 font-serif text-3xl">質問の受付状況</h1>
        <p className="mt-2 text-sm text-muted">
          在席ではなく、「今この質問に乗れるか」を生徒に見せます。未処理は{" "}
          {questions.filter((q) => queueBucket(q) !== "answered").length} 件です。
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STATUSES.map((item) => {
            const active = me?.availability === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => void setStatus(item.value)}
                className={`card p-4 text-left ${active ? "ring-2 ring-terracotta" : ""}`}
              >
                <h2 className="font-serif text-lg">{item.title}</h2>
                <p className="mt-1 text-xs text-muted">{item.help}</p>
              </button>
            );
          })}
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          「少し待てば」の目安
          <input
            type="number"
            min={5}
            max={60}
            className="w-20 rounded-xl border border-line bg-cream px-2 py-1"
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
          />
          分
        </label>
      </section>

      {error ? <p className="text-rose">{error}</p> : null}

      <section className="grid gap-3 sm:grid-cols-2">
        <Link href="/teacher/universe" className="card block p-5 hover:-translate-y-0.5">
          <p className="text-xs tracking-[0.2em] text-terracotta">CLASS UNIVERSE</p>
          <h2 className="mt-2 font-serif text-xl">クラスの問いを見る</h2>
          <p className="mt-2 text-sm text-muted">質問・理解チェック・先生からの問いを、確認候補として並べます。</p>
        </Link>
        <Link href="/teacher/prompts/new" className="card block p-5 hover:-translate-y-0.5">
          <p className="text-xs tracking-[0.2em] text-terracotta">問いを送る</p>
          <h2 className="mt-2 font-serif text-xl">生徒へ問い・理解チェック</h2>
          <p className="mt-2 text-sm text-muted">質問しない生徒の状態も、観測できるデータとして集めます。</p>
        </Link>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap gap-2">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`rounded-full px-3 py-1.5 text-sm ${tab === item.id ? "bg-navy text-cream" : "bg-line/60"}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {visible.map((question) => (
            <Link
              key={question.id}
              href={`/teacher/questions/${question.id}`}
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
              <p className="mt-1 text-sm text-muted">
                {question.studentName}
                {question.studentHomeroom ? ` · ${question.studentHomeroom}` : ""}
              </p>
            </Link>
          ))}
          {visible.length === 0 ? <p className="text-muted">この一覧には質問がありません。</p> : null}
        </div>
      </section>
    </div>
  );
}
