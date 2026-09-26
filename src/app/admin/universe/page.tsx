"use client";

import { useEffect, useState } from "react";
import { Guard } from "@/components/Guard";
import { QuestionUniverse, type UniverseScreenData } from "@/components/QuestionUniverse";
import { api } from "@/lib/client";

export default function AdminUniversePage() {
  return (
    <Guard role="admin">
      <UniverseView />
    </Guard>
  );
}

function UniverseView() {
  const [data, setData] = useState<UniverseScreenData | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const payload = await api<UniverseScreenData>("/api/universe");
    setData(payload);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "読み込めませんでした"));
  }, []);

  async function refreshAnalysis() {
    setError("");
    const result = await api<{ insight: UniverseScreenData["insight"] }>("/api/universe/analyze", {
      method: "POST",
      body: JSON.stringify({ force: true }),
    });
    setData((prev) => (prev ? { ...prev, insight: result.insight, insightStale: false } : prev));
    await load();
  }

  if (!data) {
    return <p className="text-muted">{error || "読み込み中…"}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.2em] text-terracotta">QUESTION UNIVERSE</p>
        <h1 className="mt-1 font-serif text-3xl">学校の「分からない」から、次の手を見つける</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          教科から分野、質問の集まりへと段階的に開きます。数字は集計、文章はAI分析です。最終判断は人のものです。
        </p>
      </div>
      {error ? <p className="text-rose">{error}</p> : null}
      <QuestionUniverse data={data} onRefreshAnalysis={refreshAnalysis} />
    </div>
  );
}
