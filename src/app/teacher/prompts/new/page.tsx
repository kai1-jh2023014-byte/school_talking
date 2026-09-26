"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Guard } from "@/components/Guard";
import { api } from "@/lib/client";
import { SUBJECTS } from "@/lib/constants";

export default function NewPromptPage() {
  return (
    <Guard role={["teacher", "admin"]}>
      <Suspense fallback={<p className="text-muted">読み込み中…</p>}>
        <Form />
      </Suspense>
    </Guard>
  );
}

function Form() {
  const params = useSearchParams();
  const router = useRouter();
  const [kind, setKind] = useState<"teacher_question" | "understanding_check">("teacher_question");
  const [subject, setSubject] = useState(params.get("subject") || "数学");
  const [topic, setTopic] = useState(params.get("topic") || "二次関数");
  const [homeroom, setHomeroom] = useState(params.get("homeroom") || "2年A組");
  const [body, setBody] = useState(
    kind === "understanding_check"
      ? "今日の内容をどのくらい理解できましたか？"
      : "この分野でいちばん難しいと感じるのはどこですか？",
  );
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await api("/api/prompts", {
        method: "POST",
        body: JSON.stringify({
          kind,
          subject,
          topic,
          body,
          allowFreeText: kind === "teacher_question",
          audience: { type: "class", homeroom },
        }),
      });
      router.push("/teacher/universe");
    } catch (err) {
      setError(err instanceof Error ? err.message : "送れませんでした");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mx-auto max-w-xl space-y-5" onSubmit={(event) => void submit(event)}>
      <div>
        <p className="text-xs tracking-[0.2em] text-terracotta">TEACHER QUESTION</p>
        <h1 className="mt-1 font-serif text-3xl">生徒へ問いを送る</h1>
        <p className="mt-2 text-sm text-muted">答えを書くのではなく、クラスの「分からない」を集めるための問いです。</p>
      </div>
      {error ? <p className="text-rose">{error}</p> : null}
      <label className="block text-sm">
        種類
        <select
          className="mt-1 w-full rounded-2xl border border-line bg-cream px-3 py-2"
          value={kind}
          onChange={(e) => {
            const next = e.target.value as typeof kind;
            setKind(next);
            setBody(
              next === "understanding_check"
                ? "今日の内容をどのくらい理解できましたか？"
                : "この分野でいちばん難しいと感じるのはどこですか？",
            );
          }}
        >
          <option value="teacher_question">先生からの問い</option>
          <option value="understanding_check">理解チェック</option>
        </select>
      </label>
      <label className="block text-sm">
        教科
        <select className="mt-1 w-full rounded-2xl border border-line bg-cream px-3 py-2" value={subject} onChange={(e) => setSubject(e.target.value)}>
          {SUBJECTS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        分野
        <input className="mt-1 w-full rounded-2xl border border-line bg-cream px-3 py-2" value={topic} onChange={(e) => setTopic(e.target.value)} />
      </label>
      <label className="block text-sm">
        クラス
        <input className="mt-1 w-full rounded-2xl border border-line bg-cream px-3 py-2" value={homeroom} onChange={(e) => setHomeroom(e.target.value)} />
      </label>
      <label className="block text-sm">
        本文
        <textarea className="mt-1 min-h-32 w-full rounded-2xl border border-line bg-cream px-3 py-2" value={body} onChange={(e) => setBody(e.target.value)} />
      </label>
      <button className="btn-primary" disabled={pending} type="submit">
        {pending ? "送信中…" : "送る"}
      </button>
    </form>
  );
}
