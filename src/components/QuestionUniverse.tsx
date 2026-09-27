"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/client";
import { formatDateTime } from "@/lib/format";
import { matchTeachers } from "@/lib/match";
import type { CachedSchoolInsight, SafeTeacher, SchoolAnalysis, SuggestedAction } from "@/lib/types";
import type { SchoolSnapshot, TopicSnapshot } from "@/lib/insights";
import {
  layoutScene,
  type Focus,
  type GraphNode,
  type UniverseViewPlanet,
} from "@/lib/universe";

const WIDTH = 920;
const HEIGHT = 560;

export type UniverseScreenData = {
  total: number;
  recentTotal: number;
  previousTotal: number;
  generatedAt: string;
  windowDays: number;
  planets: UniverseViewPlanet[];
  snapshot: SchoolSnapshot;
  insight: CachedSchoolInsight | null;
  insightStale: boolean;
  teachers: SafeTeacher[];
};

const FILL: Record<string, string> = {
  数学: "#e3b14a",
  英語: "#6fa8c8",
  国語: "#d4785a",
  理科: "#5aab7a",
  社会: "#c4924a",
  情報: "#8b7cc9",
};

function colorFor(node: GraphNode): string {
  if (node.kind === "subject") return FILL[node.label] ?? "#9aa3b5";
  if (node.kind === "school") return "#1c2740";
  if (node.kind === "question") return "#fff6d2";
  if (node.kind === "relation") return "#f3c19a";
  return "#d7deea";
}

export function QuestionUniverse({
  data,
  onRefreshAnalysis,
}: {
  data: UniverseScreenData;
  onRefreshAnalysis: () => Promise<void>;
}) {
  const [focus, setFocus] = useState<Focus>({ level: 1 });
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [camera, setCamera] = useState({ x: 0, y: 0, w: WIDTH, h: HEIGHT });
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);

  const attentionKeys = (data.insight?.analysis?.attentionAreas ?? [])
    .filter((area) => !dismissed.includes(`${area.subject}/${area.topic}`))
    .flatMap((area) => [area.subject, area.topic, `${area.subject}/${area.topic}`]);

  const scene = useMemo(
    () => layoutScene(data, focus, attentionKeys),
    [data, focus, attentionKeys],
  );

  useEffect(() => {
    const target = scene.camera;
    let frame = 0;
    const from = { ...camera };
    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / 320);
      const ease = 1 - (1 - t) * (1 - t);
      setCamera({
        x: from.x + (target.x - from.x) * ease,
        y: from.y + (target.y - from.y) * ease,
        w: from.w + (target.w - from.w) * ease,
        h: from.h + (target.h - from.h) * ease,
      });
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  const topicFocus: TopicSnapshot | undefined =
    "topic" in focus ? data.snapshot.topics.find((item) => item.subject === focus.subject && item.topic === focus.topic) : undefined;

  function onNode(node: GraphNode) {
    if (node.kind === "school") setFocus({ level: 1 });
    if (node.kind === "subject") setFocus({ level: 2, subject: node.label });
    if (node.kind === "topic" && "subject" in focus) setFocus({ level: 3, subject: focus.subject, topic: node.label });
    if (node.kind === "cluster" && "topic" in focus) {
      setFocus({ level: 4, subject: focus.subject, topic: focus.topic, cluster: node.label });
    }
  }

  function back() {
    if (focus.level === 4 && "topic" in focus) setFocus({ level: 3, subject: focus.subject, topic: focus.topic });
    else if (focus.level === 3 && "subject" in focus) setFocus({ level: 2, subject: focus.subject });
    else setFocus({ level: 1 });
    setShareOpen(false);
  }

  async function refresh() {
    setAnalyzing(true);
    try {
      await onRefreshAnalysis();
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <div>
        <div className="mb-3 flex flex-wrap gap-2">
          <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setFocus({ level: 1 })}>
            学校全体
          </button>
          {focus.level > 1 ? (
            <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={back}>
              ひとつ戻る
            </button>
          ) : null}
          <span className="self-center text-xs text-muted">
            {focus.level === 1 ? "教科" : focus.level === 2 ? "分野" : focus.level === 3 ? "質問の集まり" : "個別の質問"}
          </span>
        </div>
        <div className="overflow-hidden rounded-3xl border border-[#1b2744] bg-[#0b1224] shadow-slip">
          <svg
            viewBox={`${camera.x} ${camera.y} ${camera.w} ${camera.h}`}
            className="h-auto w-full cursor-grab active:cursor-grabbing"
            role="img"
            aria-label="学校の質問の関係図。クリックで詳しくなります"
            onPointerDown={(event) => {
              drag.current = { x: event.clientX, y: event.clientY, cx: camera.x, cy: camera.y };
            }}
            onPointerMove={(event) => {
              if (!drag.current) return;
              const dx = ((event.clientX - drag.current.x) / event.currentTarget.clientWidth) * camera.w;
              const dy = ((event.clientY - drag.current.y) / event.currentTarget.clientHeight) * camera.h;
              setCamera((prev) => ({ ...prev, x: drag.current!.cx - dx, y: drag.current!.cy - dy }));
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerLeave={() => {
              drag.current = null;
            }}
            onWheel={(event) => {
              event.preventDefault();
              const factor = event.deltaY > 0 ? 1.08 : 0.92;
              setCamera((prev) => ({
                ...prev,
                w: Math.min(1400, Math.max(280, prev.w * factor)),
                h: Math.min(900, Math.max(200, prev.h * factor)),
              }));
            }}
          >
            <rect x={camera.x} y={camera.y} width={camera.w} height={camera.h} fill="#0b1224" />
            {scene.edges.map((edge) => {
              const from = scene.nodes.find((node) => node.id === edge.from);
              const to = scene.nodes.find((node) => node.id === edge.to);
              if (!from || !to) return null;
              return (
                <line
                  key={`${edge.from}-${edge.to}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="#e6dcc8"
                  strokeOpacity="0.28"
                  strokeWidth="1.4"
                />
              );
            })}
            {scene.nodes.map((node) => (
              <g
                key={node.id}
                className="cursor-pointer"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onNode(node);
                }}
              >
                {node.attention ? (
                  <circle cx={node.x} cy={node.y} r={node.r + 8} fill={colorFor(node)} opacity="0.2" />
                ) : null}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.r}
                  fill={colorFor(node)}
                  stroke="#fffaf1"
                  strokeWidth={node.attention ? 2.2 : 1}
                />
                <text
                  x={node.x}
                  y={node.y + node.r + 14}
                  textAnchor="middle"
                  fill="#fffaf1"
                  fontSize={node.kind === "question" ? 9 : 12}
                  style={{ pointerEvents: "none" }}
                >
                  {node.kind === "question" ? node.label.slice(0, 16) : node.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
        <p className="mt-3 text-xs text-muted">ドラッグで移動、ホイールで拡大。最初は教科だけを出しています。</p>
      </div>
      <aside className="card max-h-[42rem] space-y-5 overflow-auto p-5">
        <DetailPanel
          data={data}
          focus={focus}
          topic={topicFocus}
          analyzing={analyzing}
          shareOpen={shareOpen}
          onRefresh={() => void refresh()}
          onShare={() => setShareOpen(true)}
          onDismiss={(key) => setDismissed((prev) => [...prev, key])}
        />
      </aside>
    </div>
  );
}

function DetailPanel({
  data,
  focus,
  topic,
  analyzing,
  shareOpen,
  onRefresh,
  onShare,
  onDismiss,
}: {
  data: UniverseScreenData;
  focus: Focus;
  topic?: TopicSnapshot;
  analyzing: boolean;
  shareOpen: boolean;
  onRefresh: () => void;
  onShare: () => void;
  onDismiss: (key: string) => void;
}) {
  const insight = data.insight;
  const analysis = insight?.analysis;
  const subject = "subject" in focus ? data.snapshot.subjects.find((item) => item.subject === focus.subject) : undefined;

  if (focus.level === 1) {
    return (
      <div className="space-y-5">
        <section>
          <p className="text-xs tracking-[0.2em] text-terracotta">DATA</p>
          <h2 className="mt-1 font-serif text-2xl">学校全体</h2>
          <p className="mt-3 text-sm">質問数：{data.snapshot.total}件</p>
          <p className="text-sm text-muted">
            直近{data.snapshot.windowDays}日：{data.snapshot.recentTotal}件 ／ その前：{data.snapshot.previousTotal}件
          </p>
        </section>
        <AnalysisBlock insight={insight} stale={data.insightStale} analyzing={analyzing} onRefresh={onRefresh} />
        {analysis?.attentionAreas.length ? (
          <section>
            <h3 className="text-sm font-semibold">注目候補</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {analysis.attentionAreas.map((area) => (
                <li key={`${area.subject}/${area.topic}`}>
                  {area.subject} / {area.topic}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section>
        <p className="text-xs tracking-[0.2em] text-terracotta">DATA</p>
        <h2 className="mt-1 font-serif text-2xl">{topic?.topic ?? subject?.subject}</h2>
            {topic ? (
          <>
            <p className="mt-3 text-sm">質問：{topic.count}件</p>
            <p className="text-sm">理解チェック：{topic.checkAnswers}件（不安 {topic.checkAnxious}）</p>
            <p className="text-sm">
              先生からの問い：{topic.promptCount}件 / 回答 {topic.promptAnswers}件
            </p>
            <p className="mt-2 text-sm text-muted">
              直近30日：{topic.recentCount}件 ／ その前：{topic.previousCount}件
            </p>
            {topic.growth.label ? <p className="mt-1 text-sm">{topic.growth.label}</p> : null}
            <ul className="mt-3 space-y-1 text-sm">
              {topic.clusters.map((cluster) => (
                <li key={cluster.name}>
                  {cluster.name}：{cluster.count}件
                </li>
              ))}
            </ul>
          </>
        ) : subject ? (
          <>
            <p className="mt-3 text-sm">質問数：{subject.count}件</p>
            <p className="text-sm text-muted">
              直近30日：{subject.recentCount}件 ／ その前：{subject.previousCount}件
            </p>
            {subject.growth.label ? <p className="mt-1 text-sm">{subject.growth.label}</p> : null}
          </>
        ) : null}
      </section>
      <AnalysisBlock insight={insight} stale={data.insightStale} analyzing={analyzing} onRefresh={onRefresh} filter={topic?.key} />
      {topic ? (
        <Actions
          topic={topic}
          actions={analysis?.suggestedActions ?? []}
          teachers={data.teachers}
          shareOpen={shareOpen}
          onShare={onShare}
          onDismiss={() => onDismiss(`${topic.subject}/${topic.topic}`)}
        />
      ) : null}
      {focus.level === 4 && "cluster" in focus && topic ? (
        <ul className="space-y-2 text-sm">
          {topic.clusters
            .find((item) => item.name === focus.cluster)
            ?.samples.map((sample) => (
              <li key={sample.id}>
                <Link href={`/admin/questions/${sample.id}`} className="hover:text-terracotta">
                  {sample.summary}
                </Link>
                <span className="ml-2 text-xs text-muted">{formatDateTime(sample.createdAt)}</span>
              </li>
            ))}
        </ul>
      ) : null}
    </div>
  );
}

function AnalysisBlock({
  insight,
  stale,
  analyzing,
  onRefresh,
  filter,
}: {
  insight: CachedSchoolInsight | null;
  stale: boolean;
  analyzing: boolean;
  onRefresh: () => void;
  filter?: string;
}) {
  const analysis: SchoolAnalysis | null = insight?.analysis ?? null;
  const areas = filter
    ? analysis?.attentionAreas.filter((area) => `${area.subject}/${area.topic}` === filter)
    : analysis?.attentionAreas;

  return (
    <section>
      <p className="text-xs tracking-[0.2em] text-terracotta">AI分析</p>
      <h3 className="mt-1 font-serif text-xl">データから見られる傾向</h3>
      {!insight ? (
        <p className="mt-2 text-sm text-muted">まだ分析していません。集計は上に出ています。</p>
      ) : insight.status === "sparse" ? (
        <p className="mt-2 text-sm">{insight.message}</p>
      ) : insight.status !== "ok" ? (
        <p className="mt-2 text-sm">{insight.message ?? "現在AI分析を取得できません。集計データのみ表示しています。"}</p>
      ) : (
        <>
          <p className="mt-2 text-sm">{analysis?.summary}</p>
          {areas?.map((area) => (
            <div key={`${area.subject}/${area.topic}`} className="mt-2 text-sm">
              <p className="font-medium">
                {area.subject} / {area.topic}
              </p>
              <ul className="mt-1 text-muted">
                {area.reasons.map((reason) => (
                  <li key={reason}>・{reason}</li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
      <button type="button" className="btn-ghost mt-3 px-3 py-1.5 text-xs" disabled={analyzing} onClick={onRefresh}>
        {analyzing ? "分析中…" : stale ? "分析を更新" : "もう一度分析する"}
      </button>
    </section>
  );
}

function Actions({
  topic,
  actions,
  teachers,
  shareOpen,
  onShare,
  onDismiss,
}: {
  topic: TopicSnapshot;
  actions: SuggestedAction[];
  teachers: SafeTeacher[];
  shareOpen: boolean;
  onShare: () => void;
  onDismiss: () => void;
}) {
  const matches = matchTeachers(
    teachers,
    {
      subject: topic.subject,
      topic: topic.topic,
      summary: topic.topic,
      urgency: "normal",
      recommendedDept: "",
      questionType: "その他",
      reasons: [],
      source: "rules",
    },
    [],
  ).slice(0, 4);

  return (
    <section>
      <p className="text-xs tracking-[0.2em] text-terracotta">ACTIONS</p>
      <h3 className="mt-1 font-serif text-xl">対応を検討できる項目</h3>
      <ul className="mt-2 space-y-2 text-sm">
        {actions.map((item) => (
          <li key={`${item.kind}-${item.action}`}>
            {item.action}
            <span className="block text-xs text-muted">{item.reason}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-col gap-2">
        <Link
          href={`/teacher/prompts/new?subject=${encodeURIComponent(topic.subject)}&topic=${encodeURIComponent(topic.topic)}`}
          className="btn-navy text-sm"
        >
          生徒に問いを送る
        </Link>
        <Link
          href={`/admin/questions?subject=${encodeURIComponent(topic.subject)}&topic=${encodeURIComponent(topic.topic)}`}
          className="btn-ghost text-sm"
        >
          質問履歴を見る
        </Link>
        <button
          type="button"
          className="btn-ghost text-sm"
          onClick={() =>
            void api("/api/follow-ups", {
              method: "POST",
              body: JSON.stringify({ subject: topic.subject, topic: topic.topic, kind: "class_review" }),
            })
          }
        >
          授業で確認する
        </button>
        <button
          type="button"
          className="btn-ghost text-sm"
          onClick={() =>
            void api("/api/follow-ups", {
              method: "POST",
              body: JSON.stringify({ subject: topic.subject, topic: topic.topic, kind: "test_candidate" }),
            })
          }
        >
          出題検討候補にする
        </button>
        <button type="button" className="btn-ghost text-sm" onClick={onShare}>
          先生へ共有
        </button>
        <button type="button" className="btn-ghost text-sm" onClick={onDismiss}>
          今回は対応しない
        </button>
      </div>
      {shareOpen ? (
        <ul className="mt-3 space-y-2 text-sm">
          {matches.length === 0 ? <li className="text-muted">いま共有できる先生が見つかりません。</li> : null}
          {matches.map((item) => (
            <li key={item.teacher.id} className="rounded-2xl border border-line p-3">
              {item.teacher.name}（{item.teacher.subjects?.join("・")}）
              <p className="text-xs text-muted">{item.reasons[0]}</p>
            </li>
          ))}
          <li>
            <Link href="/admin/users" className="text-xs text-terracotta">
              名簿で先生を確認する
            </Link>
          </li>
        </ul>
      ) : null}
    </section>
  );
}
