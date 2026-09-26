"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Guard } from "@/components/Guard";
import { api } from "@/lib/client";
import type { FollowUpMark } from "@/lib/types";
import type { UniverseScreenData } from "@/components/QuestionUniverse";

export default function StaffRoomPage() {
  return (
    <Guard role="admin">
      <StaffRoom />
    </Guard>
  );
}

function StaffRoom() {
  const [data, setData] = useState<UniverseScreenData | null>(null);
  const [marks, setMarks] = useState<FollowUpMark[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const [universe, follow] = await Promise.all([
      api<UniverseScreenData>("/api/universe"),
      api<{ followUps: FollowUpMark[] }>("/api/follow-ups"),
    ]);
    setData(universe);
    setMarks(follow.followUps);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "読み込めませんでした"));
  }, []);

  async function mark(subject: string, topic: string, kind: FollowUpMark["kind"]) {
    setMessage("");
    await api("/api/follow-ups", {
      method: "POST",
      body: JSON.stringify({ subject, topic, kind }),
    });
    await load();
    setMessage(
      kind === "test_candidate"
        ? `${subject} / ${topic} を出題検討候補に残しました`
        : kind === "class_review"
          ? `${subject} / ${topic} を授業での確認候補に残しました`
          : "記録しました",
    );
  }

  if (!data) return <p className="text-muted">{error || "読み込み中…"}</p>;

  const topics = data.snapshot.topics;
  const candidates = topics.filter((item) => item.count >= 2 || item.checkAnxious >= 2);
  const tests = marks.filter((item) => item.kind === "test_candidate");

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs tracking-[0.2em] text-terracotta">職員室</p>
        <h1 className="mt-1 font-serif text-3xl">今日の Question Universe</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          学校全体の問い・理解チェック・先生からの問いを集計しています。AIが授業を決めるのではなく、確認候補を人が判断します。
        </p>
      </div>
      {error ? <p className="text-rose">{error}</p> : null}
      {message ? <p className="text-sm">{message}</p> : null}

      <section className="grid gap-3 md:grid-cols-2">
        {topics.slice(0, 8).map((item) => {
          const label =
            item.checkAnxious >= 2 || item.count >= 3 ? "確認候補" : item.growth.delta > 0 ? "質問増加" : "安定";
          return (
            <article key={item.key} className="card p-5">
              <p className="text-xs text-muted">{item.subject}</p>
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-serif text-2xl">{item.topic}</h2>
                <span className="text-xs">{label}</span>
              </div>
              <p className="mt-3 text-sm">質問 {item.count}件</p>
              <p className="text-sm">理解チェック {item.checkAnswers}件（不安 {item.checkAnxious}）</p>
              <p className="text-sm">先生からの問い {item.promptCount}件 / 回答 {item.promptAnswers}</p>
            </article>
          );
        })}
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-2xl">確認候補</h2>
        <p className="mt-2 text-sm text-muted">質問が多いことは、全員が苦手だという意味ではありません。</p>
        {candidates.length === 0 ? (
          <p className="mt-3 text-sm text-muted">いま急いで追加確認する材料は少ないです。</p>
        ) : (
          <ul className="mt-4 space-y-6">
            {candidates.map((item) => (
              <li key={item.key} className="border-t border-line pt-4 first:border-0 first:pt-0">
                <h3 className="font-serif text-xl">
                  {item.subject}・{item.topic}
                </h3>
                <p className="mt-2 text-sm">質問：{item.count}件</p>
                <p className="text-sm">理解チェックの不安回答：{item.checkAnxious}人</p>
                <p className="text-sm">
                  先生からの問い：{item.promptCount}件（回答 {item.promptAnswers}）
                </p>
                <p className="mt-2 text-sm text-muted">→ 授業内での追加確認を検討できます</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/teacher/prompts/new?subject=${encodeURIComponent(item.subject)}&topic=${encodeURIComponent(item.topic)}`}
                    className="btn-navy text-xs"
                  >
                    生徒に問いを送る
                  </Link>
                  <button type="button" className="btn-ghost text-xs" onClick={() => void mark(item.subject, item.topic, "class_review")}>
                    授業で確認する
                  </button>
                  <button type="button" className="btn-ghost text-xs" onClick={() => void mark(item.subject, item.topic, "test_candidate")}>
                    確認問題を作る / 出題検討
                  </button>
                  <Link
                    href={`/admin/questions?subject=${encodeURIComponent(item.subject)}&topic=${encodeURIComponent(item.topic)}`}
                    className="btn-ghost text-xs"
                  >
                    質問履歴を見る
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-2xl">次回テスト 出題検討候補</h2>
        <p className="mt-2 text-sm text-muted">入れるかどうかは先生が決めます。AIは出題を決定しません。</p>
        {tests.length === 0 ? (
          <p className="mt-3 text-sm text-muted">まだ出題検討として残した分野はありません。</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {tests.map((item) => {
              const topic = topics.find((row) => row.subject === item.subject && row.topic === item.topic);
              return (
                <li key={item.id}>
                  <p className="font-medium">
                    {item.subject}・{item.topic}
                  </p>
                  {topic ? (
                    <p className="text-sm text-muted">
                      生徒質問 {topic.count}件 ・ 理解チェックで不安 {topic.checkAnxious} ・ 先生からの問い回答 {topic.promptAnswers}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-sm">
        <Link href="/admin/universe" className="text-terracotta">
          Question Universe で関係図を見る
        </Link>
      </p>
    </div>
  );
}
