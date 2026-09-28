"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { QuestionUniverse, type UniverseScreenData } from "@/components/QuestionUniverse";
import { api } from "@/lib/client";

export function UniversePreview({
  title,
  caption,
  href,
}: {
  title: string;
  caption: string;
  href: string;
}) {
  const [data, setData] = useState<UniverseScreenData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<UniverseScreenData>("/api/universe")
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "読み込めませんでした"));
  }, []);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-terracotta">QUESTION UNIVERSE</p>
          <h2 className="mt-1 font-serif text-2xl">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">{caption}</p>
        </div>
        <Link href={href} className="btn-ghost text-xs">
          詳しく見る
        </Link>
      </div>
      {error ? <p className="text-rose">{error}</p> : null}
      {data ? (
        <QuestionUniverse data={data} compact />
      ) : (
        <div className="grid min-h-64 place-items-center rounded-3xl border border-[#1b2744] bg-[#0b1224] text-sm text-cream/70">
          宇宙を開いています…
        </div>
      )}
    </section>
  );
}
