import Link from "next/link";
import { api } from "@/lib/client";
import type { QuestionLoop } from "@/lib/loop-graph";
import type { LoopNodeKind } from "@/lib/loop-graph";

const KIND_TITLE: Record<LoopNodeKind, string> = {
  question: "質問",
  teacher: "先生",
  prompt: "確認",
  response: "回答",
  followup: "再確認",
  related: "関連",
  action: "対応",
};

export function QuestionLoopPanel({
  loop,
  onOpenRelated,
  showActions,
}: {
  loop: QuestionLoop;
  onOpenRelated: (questionId: string) => void;
  showActions: boolean;
}) {
  return (
    <div className="space-y-5">
      <section>
        <p className="text-xs tracking-[0.2em] text-terracotta">QUESTION LOOP</p>
        <h2 className="mt-1 font-serif text-2xl">
          {loop.subject} / {loop.topic}
        </h2>
        <p className="mt-2 text-sm">{loop.body}</p>
        <p className="mt-2 text-xs text-terracotta">{loop.phaseLabel}</p>
      </section>

      <section>
        <p className="text-xs tracking-[0.2em] text-terracotta">DATA</p>
        <ol className="mt-3 space-y-3">
          {loop.steps.map((step, index) => (
            <li key={`${step.n}-${step.title}`} className="text-sm">
              <p className="font-medium">
                {step.n}. {step.title}
                <span className="ml-2 text-xs font-normal text-muted">{KIND_TITLE[step.kind]}</span>
              </p>
              <p className="mt-0.5 text-muted">{step.body}</p>
              {step.data ? <p className="text-xs">{step.data}</p> : null}
              {index < loop.steps.length - 1 ? <p className="mt-2 text-center text-muted">↓</p> : null}
            </li>
          ))}
        </ol>
      </section>

      {loop.relatedCount > 0 ? (
        <section>
          <p className="text-xs tracking-[0.2em] text-terracotta">AI INSIGHT</p>
          <p className="mt-2 text-sm">この問いにつながる質問が{loop.relatedCount}件あります。</p>
          {loop.cluster ? <p className="text-xs text-muted">{loop.cluster}</p> : null}
          <ul className="mt-2 space-y-1 text-sm">
            {loop.nodes
              .filter((node) => node.kind === "related")
              .map((node) => (
                <li key={node.id}>
                  <button type="button" className="text-left hover:text-terracotta" onClick={() => node.refId && onOpenRelated(node.refId)}>
                    {node.label}
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      {showActions ? (
        <section>
          <p className="text-xs tracking-[0.2em] text-terracotta">HUMAN ACTION</p>
          <p className="mt-2 text-sm">次にできること</p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href={`/teacher/prompts/new?subject=${encodeURIComponent(loop.subject)}&topic=${encodeURIComponent(loop.topic)}&kind=understanding_check&purpose=recheck`}
              className="btn-navy text-sm"
            >
              再確認する
            </Link>
            <Link
              href={`/teacher/prompts/new?subject=${encodeURIComponent(loop.subject)}&topic=${encodeURIComponent(loop.topic)}`}
              className="btn-ghost text-sm"
            >
              追加の質問を送る
            </Link>
            <button
              type="button"
              className="btn-ghost text-sm"
              onClick={() =>
                void api("/api/follow-ups", {
                  method: "POST",
                  body: JSON.stringify({ subject: loop.subject, topic: loop.topic, kind: "class_review" }),
                })
              }
            >
              授業で確認する
            </button>
            <Link
              href={`/admin/questions/${loop.questionId}`}
              className="btn-ghost text-sm"
            >
              対応完了にする
            </Link>
          </div>
        </section>
      ) : (
        <Link href="/student/ask" className="btn-ghost inline-flex text-sm">
          つながる問いを書く
        </Link>
      )}
    </div>
  );
}
