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
        <h1 className="mt-1 font-serif text-3xl">一つの質問が、次の問いへつながっていく</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          星は質問です。線は、先生・確認・回答・関連する問いへのつながりです。クリックすると、その質問の循環が開きます。
        </p>
      </div>
      {error ? <p className="text-rose">{error}</p> : null}
      <QuestionUniverse data={data} onRefreshAnalysis={refreshAnalysis} />
    </div>
  );
}
