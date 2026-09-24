"use client";

import { useEffect, useState } from "react";
import { Guard } from "@/components/Guard";
import { QuestionUniverse } from "@/components/QuestionUniverse";
import { api } from "@/lib/client";
import type { UniversePayload } from "@/lib/universe";

export default function AdminUniversePage() {
  return (
    <Guard role="admin">
      <UniverseView />
    </Guard>
  );
}

function UniverseView() {
  const [data, setData] = useState<UniversePayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<UniversePayload>("/api/universe")
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "読み込めませんでした"));
  }, []);

  if (!data) {
    return <p className="text-muted">{error || "読み込み中…"}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.2em] text-terracotta">QUESTION UNIVERSE</p>
        <h1 className="mt-1 font-serif text-3xl">学校の「分からない」を宇宙として見る</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          教科は惑星、分野はそのまわりの衛星、質問は小さな星です。大きいほど質問が多く、光っている天体は直近30日の質問数がその前の30日より増えています。原因までは断定しません。
        </p>
      </div>
      {error ? <p className="text-rose">{error}</p> : null}
      <QuestionUniverse data={data} />
      <ul className="flex flex-wrap gap-4 text-xs text-muted">
        <li>惑星＝教科</li>
        <li>衛星＝分野</li>
        <li>星＝個別の質問</li>
        <li>大きさ＝質問数</li>
        <li>光＝直近30日の増加</li>
      </ul>
    </div>
  );
}
