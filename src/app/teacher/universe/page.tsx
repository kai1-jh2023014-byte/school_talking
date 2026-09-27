"use client";

import { useCallback, useEffect, useState } from "react";
import { Guard } from "@/components/Guard";
import { api } from "@/lib/client";
import { SUBJECTS } from "@/lib/constants";
import type { ClassTopicState } from "@/lib/prompts";

export default function TeacherUniversePage() {
  return (
    <Guard role="teacher">
      <ClassUniverse />
    </Guard>
  );
}

function ClassUniverse() {
  const [homeroom, setHomeroom] = useState("");
  const [rooms, setRooms] = useState<string[]>([]);
  const [data, setData] = useState<{
    homeroom: string;
    studentCount: number;
    topics: ClassTopicState[];
    confirmCandidates: ClassTopicState[];
    disclaimer: string;
  } | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async (room?: string) => {
    const query = room ? `?homeroom=${encodeURIComponent(room)}` : "";
    const payload = await api<{
      homerooms: string[];
      homeroom: string;
      studentCount: number;
      topics: ClassTopicState[];
      confirmCandidates: ClassTopicState[];
      disclaimer: string;
    }>(`/api/class-universe${query}`);
    setRooms(payload.homerooms);
    setHomeroom(payload.homeroom);
    setData(payload);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "読み込めませんでした"));
  }, [load]);

  if (!data) return <p className="text-muted">{error || "読み込み中…"}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-terracotta">CLASS UNIVERSE</p>
          <h1 className="mt-1 font-serif text-3xl">{data.homeroom}の問い</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">{data.disclaimer}</p>
        </div>
        <select
          className="rounded-full border border-line bg-cream px-3 py-1.5 text-sm"
          value={homeroom}
          onChange={(event) => void load(event.target.value)}
        >
          {rooms.map((room) => (
            <option key={room} value={room}>
              {room}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="text-rose">{error}</p> : null}
      <section className="card p-6">
        <h2 className="font-serif text-2xl">確認候補</h2>
        {data.confirmCandidates.length === 0 ? (
          <p className="mt-3 text-sm text-muted">いま追加確認を急ぐ材料は少ないです。</p>
        ) : (
          <ol className="mt-4 list-decimal space-y-2 pl-5">
            {data.confirmCandidates.map((item) => (
              <li key={`${item.subject}/${item.topic}`}>
                {item.subject} / {item.topic}
                <p className="text-sm text-muted">{item.reasons.join(" / ")}</p>
              </li>
            ))}
          </ol>
        )}
        <a href={`/teacher/prompts/new?subject=${encodeURIComponent(data.confirmCandidates[0]?.subject ?? SUBJECTS[0])}&topic=${encodeURIComponent(data.confirmCandidates[0]?.topic ?? "")}&homeroom=${encodeURIComponent(data.homeroom)}`} className="btn-navy mt-4 inline-flex text-sm">
          生徒に問いを送る
        </a>
      </section>
      <section className="space-y-3">
        {data.topics.map((item) => (
          <article key={`${item.subject}/${item.topic}`} className="card p-5">
            <p className="text-xs text-muted">{item.subject}</p>
            <h3 className="font-serif text-xl">{item.topic}</h3>
            <p className="mt-2 text-sm">
              質問 {item.questionCount} ・ 理解チェック {item.checkAnswers}人（不安 {item.checkAnxious}） ・ 先生の問い {item.promptAnswers}
              {item.promptAudience ? ` / ${item.promptAudience}` : ""}
            </p>
            {item.confirmCandidate ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={`/teacher/prompts/new?subject=${encodeURIComponent(item.subject)}&topic=${encodeURIComponent(item.topic)}&homeroom=${encodeURIComponent(data.homeroom)}`}
                  className="btn-navy text-xs"
                >
                  生徒に問いを送る
                </a>
                <button
                  type="button"
                  className="btn-ghost text-xs"
                  onClick={() =>
                    void api("/api/follow-ups", {
                      method: "POST",
                      body: JSON.stringify({
                        subject: item.subject,
                        topic: item.topic,
                        kind: "class_review",
                      }),
                    })
                  }
                >
                  授業で確認する
                </button>
                <button
                  type="button"
                  className="btn-ghost text-xs"
                  onClick={() =>
                    void api("/api/follow-ups", {
                      method: "POST",
                      body: JSON.stringify({
                        subject: item.subject,
                        topic: item.topic,
                        kind: "test_candidate",
                      }),
                    })
                  }
                >
                  出題検討候補にする
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  );
}
