"use client";

import { useEffect, useState } from "react";
import { Guard } from "@/components/Guard";
import { api } from "@/lib/client";
import type { QuestionLoop } from "@/lib/loop-graph";
import type { ChainEvent } from "@/lib/loop";
import type { MyTopicState } from "@/lib/prompts";

export default function StudentUniversePage() {
  return (
    <Guard role="student">
      <MyUniverse />
    </Guard>
  );
}

function MyUniverse() {
  const [data, setData] = useState<{
    topics: (MyTopicState & { chain?: ChainEvent[]; loops?: QuestionLoop[] })[];
    reviewCandidates: MyTopicState[];
    disclaimer: string;
  } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<typeof data>("/api/me/universe")
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "読み込めませんでした"));
  }, []);

  if (!data) return <p className="text-muted">{error || "読み込み中…"}</p>;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-[0.2em] text-terracotta">MY UNIVERSE</p>
        <h1 className="mt-1 font-serif text-3xl">自分の質問は、いまどこまでつながっているか</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">{data.disclaimer}</p>
      </div>
      <section className="card p-6">
        <h2 className="font-serif text-2xl">この分野から続けられること</h2>
        {data.reviewCandidates.length === 0 ? (
          <p className="mt-3 text-sm text-muted">まだ復習候補はありません。質問や先生からの問いに答えると、ここに集まります。</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {data.reviewCandidates.map((item) => (
              <li key={`${item.subject}/${item.topic}`}>
                <button type="button" className="text-left" onClick={() => setOpen(`${item.subject}/${item.topic}`)}>
                  {item.subject} / {item.topic}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-3">
        {data.topics.map((item) => (
          <article key={`${item.subject}/${item.topic}`} className="card p-5">
            <p className="text-xs text-muted">{item.subject}</p>
            <h3 className="font-serif text-xl">{item.topic}</h3>
            <p className="mt-1 tracking-[0.2em] text-terracotta">
              {"●".repeat(Math.min(5, Math.max(1, item.questionCount + item.anxiousChecks)))}
            </p>
            <p className="mt-2 text-sm">
              質問 {item.questionCount} ・ 理解チェックの不安 {item.anxiousChecks} ・ 先生の問いへの回答 {item.promptAnswers}
            </p>
            {(open === `${item.subject}/${item.topic}` || item.reviewCandidate) && item.reasons.length > 0 ? (
              <div className="mt-3 text-sm">
                <p className="font-medium">この候補になった理由</p>
                <ul className="mt-1 text-muted">
                  {item.reasons.map((reason) => (
                    <li key={reason.label}>
                      ・{reason.label}（{reason.detail}）
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {item.loops?.map((loop) => (
              <ol key={loop.questionId} className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
                <li className="font-medium">{loop.body}</li>
                {loop.steps.map((step, index) => (
                  <li key={`${loop.questionId}-${step.n}`}>
                    {index > 0 ? <p className="text-center text-muted">↓</p> : null}
                    <p>
                      {step.title}
                      {step.data ? <span className="text-muted">（{step.data}）</span> : null}
                    </p>
                    <p className="text-muted">{step.body}</p>
                  </li>
                ))}
              </ol>
            ))}
            {!item.loops?.length && item.chain && item.chain.length > 0 ? (
              <ol className="mt-4 space-y-2 border-t border-line pt-3 text-sm">
                {item.chain.map((event, index) => (
                  <li key={`${event.at}-${index}`}>
                    {index > 0 ? <p className="text-center text-muted">↓</p> : null}
                    <p className="font-medium">{event.title}</p>
                    {event.detail ? <p className="text-muted">{event.detail}</p> : null}
                  </li>
                ))}
              </ol>
            ) : null}
            <a href="/student/ask" className="btn-ghost mt-3 inline-flex text-xs">
              つながる問いを書く
            </a>
          </article>
        ))}
      </section>
    </div>
  );
}
