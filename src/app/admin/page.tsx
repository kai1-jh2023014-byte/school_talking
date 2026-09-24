"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Guard } from "@/components/Guard";
import { BarList, HourBars } from "@/components/Charts";
import { api } from "@/lib/client";
import type { AnalyticsPayload } from "@/lib/analytics";

export default function AdminPage() {
  return (
    <Guard role="admin">
      <AdminDashboard />
    </Guard>
  );
}

function AdminDashboard() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [error, setError] = useState("");
  const [resetting, setResetting] = useState(false);

  async function load() {
    const payload = await api<AnalyticsPayload>("/api/analytics");
    setData(payload);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "読み込めませんでした"));
  }, []);

  async function reset() {
    setResetting(true);
    setError("");
    try {
      await api("/api/admin/reset", { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "初期化に失敗しました");
    } finally {
      setResetting(false);
    }
  }

  if (!data) {
    return <p className="text-muted">{error || "読み込み中…"}</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.2em] text-terracotta">SCHOOL INSIGHTS</p>
          <h1 className="mt-1 font-serif text-3xl">生徒がどこで困っているか</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            個人のやりとりは、授業と学校を見直す材料になります。増減は「直近30日」と「その前の30日」の比較です。原因までは断定しません。
          </p>
        </div>
        <button className="btn-ghost text-xs" disabled={resetting} onClick={() => void reset()}>
          {resetting ? "初期化中…" : "デモデータをリセット"}
        </button>
      </div>

      {error ? <p className="text-rose">{error}</p> : null}

      <Link href="/admin/universe" className="card block bg-navy p-6 text-cream transition hover:bg-ink">
        <p className="text-xs tracking-[0.2em] text-gold">QUESTION UNIVERSE</p>
        <h2 className="mt-1 font-serif text-2xl">質問宇宙を開く</h2>
        <p className="mt-2 text-sm text-cream/80">
          学校全体の「分からない」を、教科の惑星と分野の衛星、質問の星として見られます。分析の数字はそのまま、こちらは空間での見方です。
        </p>
      </Link>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "質問の総数", value: data.total },
          { label: "回答済み", value: data.answered },
          { label: "未対応", value: data.unanswered },
          { label: "対応中", value: data.inProgress },
          { label: "転送したことあり", value: data.transferred },
        ].map((item) => (
          <article key={item.label} className="card p-5">
            <p className="text-xs text-muted">{item.label}</p>
            <p className="font-serif text-4xl">{item.value}</p>
          </article>
        ))}
      </section>

      <article className="card p-6">
        <h2 className="font-serif text-2xl">つまずきが集まっている分野</h2>
        <p className="mt-1 text-sm text-muted">直近30日で質問が多い分野です。授業の見直し候補として見てください。</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {data.struggles.length === 0 ? (
            <p className="text-sm text-muted">直近30日の質問はまだ少ないです。</p>
          ) : (
            data.struggles.map((item) => (
              <div key={`${item.subject}-${item.topic}`} className="rounded-2xl border border-line bg-paper p-4">
                <p className="text-xs text-muted">{item.subject}</p>
                <p className="font-serif text-xl">{item.topic}</p>
                <p className="mt-2 text-sm">直近30日 {item.count}件</p>
                {item.deltaLabel ? <p className="mt-1 text-xs text-terracotta">{item.deltaLabel}</p> : null}
              </div>
            ))
          )}
        </div>
      </article>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="card p-6">
          <h2 className="font-serif text-2xl">科目別</h2>
          <div className="mt-5">
            <BarList items={data.bySubject.map((item) => ({ label: item.subject, count: item.count }))} />
          </div>
        </article>
        <article className="card p-6">
          <h2 className="font-serif text-2xl">分野別</h2>
          <div className="mt-5">
            <BarList
              items={data.byTopic.map((item) => ({
                label: `${item.subject} / ${item.topic}`,
                count: item.count,
              }))}
            />
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="card p-6">
          <h2 className="font-serif text-2xl">時間帯</h2>
          <p className="mt-1 text-sm text-muted">朝・昼休み・放課後・夜など、学校のリズムで見ます。</p>
          <div className="mt-5">
            <BarList items={data.bySlot.map((item) => ({ label: item.slot, count: item.count }))} />
          </div>
        </article>
        <article className="card p-6">
          <h2 className="font-serif text-2xl">いまの状態</h2>
          <div className="mt-5">
            <BarList items={data.byStatus.map((item) => ({ label: item.status, count: item.count }))} />
          </div>
        </article>
      </section>

      <article className="card p-6">
        <h2 className="font-serif text-2xl">時刻ごとの質問</h2>
        <p className="mt-1 text-sm text-muted">放課後に集中していないか、学校全体で見られます。</p>
        <div className="mt-6">
          <HourBars items={data.byHour} />
        </div>
      </article>

      <article className="card bg-navy p-6 text-cream">
        <h2 className="font-serif text-2xl">学校改善へのヒント</h2>
        <ul className="mt-4 space-y-2 text-sm text-cream/85">
          {data.insights.map((insight) => (
            <li key={insight}>・{insight}</li>
          ))}
        </ul>
      </article>
    </div>
  );
}
