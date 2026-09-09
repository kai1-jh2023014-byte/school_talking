"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Guard } from "@/components/Guard";
import { TeacherPlate } from "@/components/TeacherPlate";
import { UrgencyChip } from "@/components/QuestionChips";
import { api } from "@/lib/client";
import type { Classification, Question, TeacherMatch } from "@/lib/types";

export default function AskPage() {
  return (
    <Guard role="student">
      <AskForm />
    </Guard>
  );
}

function AskForm() {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [imagePath, setImagePath] = useState<string>();
  const [preview, setPreview] = useState<string>();
  const [step, setStep] = useState<"edit" | "classifying" | "review">("edit");
  const [classification, setClassification] = useState<Classification | null>(null);
  const [matches, setMatches] = useState<TeacherMatch[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onFile(file: File | null) {
    if (!file) return;
    const form = new FormData();
    form.set("file", file);
    try {
      const data = await api<{ imagePath: string }>("/api/upload", { method: "POST", body: form });
      setImagePath(data.imagePath);
      setPreview(URL.createObjectURL(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "画像を送れませんでした");
    }
  }

  async function classify() {
    if (!body.trim()) {
      setError("質問を書いてください");
      return;
    }
    setError("");
    setStep("classifying");
    try {
      const data = await api<{ classification: Classification; matches: TeacherMatch[] }>(
        "/api/classify",
        { method: "POST", body: JSON.stringify({ body }) },
      );
      setClassification(data.classification);
      setMatches(data.matches);
      setSelectedTeacherId(data.matches[0]?.teacher.id ?? null);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "整理に失敗しました");
      setStep("edit");
    }
  }

  async function submit() {
    setPending(true);
    setError("");
    try {
      const data = await api<{ question: Question }>("/api/questions", {
        method: "POST",
        body: JSON.stringify({ body, imagePath, teacherId: selectedTeacherId }),
      });
      router.push(`/student/questions/${data.question.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "投稿に失敗しました");
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs tracking-[0.2em] text-terracotta">NEW QUESTION</p>
        <h1 className="mt-1 font-serif text-3xl">質問する</h1>
        <p className="mt-2 text-sm text-muted">
          わからないことを、いまの言葉のままで書いてください。誰に聞くかは、あとから一緒に決めます。
        </p>
      </div>

      {step === "classifying" ? (
        <div className="card p-10 text-center">
          <p className="font-serif text-2xl">質問を整理しています</p>
          <p className="mt-3 text-sm text-muted">科目・分野・緊急度を確認し、対応できる先生を探しています。</p>
        </div>
      ) : null}

      {step === "edit" ? (
        <div className="card p-6">
          <textarea
            className="notebook-rule min-h-48 w-full resize-y rounded-2xl border border-line bg-cream px-4 py-3 outline-none focus:border-terracotta"
            placeholder="例）数学のこの問題がわかりません。二次関数の最大値の求め方を教えてほしいです。"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="btn-ghost cursor-pointer">
              問題を撮影する
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="添付した問題" className="h-16 rounded-xl border border-line object-cover" />
            ) : null}
          </div>
          {error ? <p className="mt-3 text-sm text-rose">{error}</p> : null}
          <button className="btn-primary mt-6" type="button" onClick={() => void classify()}>
            AIに内容を整理してもらう
          </button>
        </div>
      ) : null}

      {step === "review" && classification ? (
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="font-serif text-2xl">AIの整理結果</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="chip bg-navy/10 text-navy">科目 {classification.subject}</span>
              <span className="chip bg-navy/10 text-navy">分野 {classification.topic}</span>
              <span className="chip bg-navy/10 text-navy">担当 {classification.recommendedDept}</span>
              <UrgencyChip urgency={classification.urgency} />
            </div>
            <p className="mt-4 text-sm">{classification.summary}</p>
            <ul className="mt-4 space-y-1 text-sm text-muted">
              {classification.reasons.map((reason) => (
                <li key={reason}>・{reason}</li>
              ))}
            </ul>
            <button className="btn-ghost mt-4 text-xs" type="button" onClick={() => setStep("edit")}>
              質問文を直す
            </button>
          </section>

          <section>
            <h2 className="font-serif text-2xl">この質問なら、この先生</h2>
            <p className="mt-1 text-sm text-muted">対応状況も見ながら、届け先を選べます。</p>
            <div className="mt-4 grid gap-3">
              {matches.map((match) => (
                <TeacherPlate
                  key={match.teacher.id}
                  teacher={match.teacher}
                  selected={selectedTeacherId === match.teacher.id}
                  onSelect={() => setSelectedTeacherId(match.teacher.id)}
                  reasons={match.reasons}
                />
              ))}
            </div>
          </section>

          {error ? <p className="text-sm text-rose">{error}</p> : null}
          <button className="btn-primary" disabled={pending} type="button" onClick={() => void submit()}>
            {pending ? "送信中…" : "この先生へ質問を届ける"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
