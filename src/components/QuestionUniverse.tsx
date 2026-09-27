"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { formatDateTime } from "@/lib/format";
import { LOOP_LABEL } from "@/lib/loop";
import { matchTeachers } from "@/lib/match";
import type { CachedSchoolInsight, SafeTeacher, SchoolAnalysis, SuggestedAction } from "@/lib/types";
import type { SchoolSnapshot, TopicSnapshot } from "@/lib/insights";
import {
  planetPosition,
  satelliteOrbit,
  satellitePosition,
  starPosition,
  type Focus,
  type UniverseStar,
  type UniverseViewPlanet,
  type UniverseViewSatellite,
} from "@/lib/universe";

const WIDTH = 920;
const HEIGHT = 560;
const CX = 460;
const CY = 278;
const RING_X = 268;
const RING_Y = 196;

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

function dustField() {
  const out: { x: number; y: number; r: number; o: number }[] = [];
  let seed = 20260924;
  for (let i = 0; i < 90; i += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    out.push({
      x: seed % WIDTH,
      y: (seed >>> 8) % HEIGHT,
      r: 0.45 + (seed % 10) / 14,
      o: 0.22 + (seed % 7) / 18,
    });
  }
  return out;
}

const DUST = dustField();

function planetColor(subject: string): string {
  return FILL[subject] ?? "#9aa3b5";
}

type Selection =
  | { kind: "school" }
  | { kind: "planet"; subject: string }
  | { kind: "satellite"; subject: string; topic: string }
  | { kind: "star"; subject: string; topic: string; id: string };

function selectionToFocus(selection: Selection): Focus {
  if (selection.kind === "school") return { level: 1 };
  if (selection.kind === "planet") return { level: 2, subject: selection.subject };
  return { level: 3, subject: selection.subject, topic: selection.topic };
}

export function QuestionUniverse({
  data,
  onRefreshAnalysis,
  compact = false,
}: {
  data: UniverseScreenData;
  onRefreshAnalysis?: () => Promise<void>;
  compact?: boolean;
}) {
  const svgId = useId().replace(/:/g, "");
  const [selection, setSelection] = useState<Selection>({ kind: "school" });
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const focus = selectionToFocus(selection);
  const topicFocus: TopicSnapshot | undefined =
    "topic" in focus ? data.snapshot.topics.find((item) => item.subject === focus.subject && item.topic === focus.topic) : undefined;

  const laidOut = useMemo(() => {
    return data.planets.map((planet, index) => {
      const origin = planetPosition(index, data.planets.length, CX, CY, RING_X, RING_Y);
      const orbit = satelliteOrbit(planet.radius, planet.satellites.length);
      const satellites = planet.satellites.map((satellite, satIndex) => {
        const seat = satellitePosition(origin, satIndex, planet.satellites.length, orbit);
        const stars = satellite.samples.map((star, starIndex) => ({
          star,
          point: starPosition(seat, starIndex, satellite.radius + 7),
        }));
        return { satellite, point: seat, stars };
      });
      return { planet, origin, orbit, satellites };
    });
  }, [data.planets]);

  async function refresh() {
    if (!onRefreshAnalysis) return;
    setAnalyzing(true);
    try {
      await onRefreshAnalysis();
    } finally {
      setAnalyzing(false);
    }
  }

  const selectedSubject = selection.kind === "school" ? undefined : selection.subject;

  return (
    <div className={compact ? "space-y-3" : "grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]"}>
      <div>
        <div className="overflow-hidden rounded-3xl border border-[#1b2744] bg-[#0b1224] shadow-slip">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="h-auto w-full"
            role="img"
            aria-label="学校の質問を、教科の惑星と分野の衛星、個別の質問の星で表した図"
            onClick={() => {
              setSelection({ kind: "school" });
              setShareOpen(false);
            }}
          >
            <defs>
              <radialGradient id={`universe-space-${svgId}`} cx="50%" cy="45%" r="70%">
                <stop offset="0%" stopColor="#152244" />
                <stop offset="70%" stopColor="#0b1224" />
                <stop offset="100%" stopColor="#070b16" />
              </radialGradient>
              <filter id={`universe-glow-${svgId}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <rect width={WIDTH} height={HEIGHT} fill={`url(#universe-space-${svgId})`} />
            {DUST.map((dot, index) => (
              <circle
                key={index}
                className="universe-twinkle"
                cx={dot.x}
                cy={dot.y}
                r={dot.r}
                fill="#f4efe4"
                opacity={dot.o}
                style={{
                  animationDuration: `${2.8 + (index % 6) * 0.55}s`,
                  animationDelay: `${(index % 17) * -0.35}s`,
                }}
              />
            ))}

            <g className="universe-breathe" style={{ transformOrigin: `${CX}px ${CY}px` }}>
              <circle cx={CX} cy={CY} r="34" fill="#1c2740" stroke="#e6dcc8" strokeOpacity="0.28" />
              <text x={CX} y={CY + 4} textAnchor="middle" fill="#fffaf1" fontSize="11" fontFamily="serif">
                学校
              </text>
            </g>

            {laidOut.map(({ planet, origin, orbit, satellites }, planetIndex) => {
              const color = planetColor(planet.subject);
              const focused = !selectedSubject || selectedSubject === planet.subject;
              const growing = planet.growth.delta > 0;
              const orbitSec = 72 + planetIndex * 14;
              return (
                <g key={planet.subject} opacity={focused ? 1 : 0.28}>
                  {planet.satellites.length > 0 ? (
                    <circle
                      className="universe-dash"
                      cx={origin.x}
                      cy={origin.y}
                      r={orbit}
                      fill="none"
                      stroke={color}
                      strokeOpacity="0.22"
                      strokeDasharray="3 7"
                      style={{ animationDuration: `${22 + planetIndex * 4}s` }}
                    />
                  ) : null}
                  <g
                    className="universe-spin"
                    style={{
                      transformOrigin: `${origin.x}px ${origin.y}px`,
                      animationDuration: `${orbitSec}s`,
                    }}
                  >
                    {satellites.map(({ satellite, point, stars }, satIndex) => (
                      <SatelliteSystem
                        key={`${planet.subject}-${satellite.topic}`}
                        planet={planet}
                        satellite={satellite}
                        point={point}
                        color={color}
                        stars={stars}
                        glowId={`universe-glow-${svgId}`}
                        selection={selection}
                        onSelect={setSelection}
                        orbitSec={orbitSec}
                        starSec={18 + satIndex * 5}
                      />
                    ))}
                  </g>
                  <g
                    role="button"
                    tabIndex={0}
                    aria-label={`${planet.subject}の惑星。質問${planet.count}件`}
                    className="cursor-pointer"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelection({ kind: "planet", subject: planet.subject });
                    }}
                  >
                    {growing ? (
                      <circle
                        className="universe-pulse"
                        cx={origin.x}
                        cy={origin.y}
                        r={planet.radius + 10}
                        fill={color}
                        opacity="0.18"
                        filter={`url(#universe-glow-${svgId})`}
                        style={{ transformOrigin: `${origin.x}px ${origin.y}px` }}
                      />
                    ) : null}
                    <circle
                      cx={origin.x}
                      cy={origin.y}
                      r={planet.radius}
                      fill={color}
                      stroke={selection.kind === "planet" && selection.subject === planet.subject ? "#fffaf1" : "#0b1224"}
                      strokeWidth={selection.kind === "planet" && selection.subject === planet.subject ? 3 : 1.5}
                    />
                    <g
                      className="universe-spin"
                      style={{
                        transformOrigin: `${origin.x}px ${origin.y}px`,
                        animationDuration: `${16 + planetIndex * 3}s`,
                      }}
                    >
                      <circle
                        cx={origin.x - planet.radius * 0.28}
                        cy={origin.y - planet.radius * 0.3}
                        r={planet.radius * 0.18}
                        fill="#fffaf1"
                        opacity="0.22"
                      />
                    </g>
                    <text
                      x={origin.x}
                      y={origin.y + planet.radius + 16}
                      textAnchor="middle"
                      fill="#fffaf1"
                      fontSize="13"
                      fontWeight="600"
                    >
                      {planet.subject}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>
        {compact ? null : (
          <ul className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
            <li>惑星＝教科</li>
            <li>衛星＝分野</li>
            <li>星＝個別の質問</li>
            <li>大きさ＝質問数</li>
            <li>光＝直近30日の増加</li>
          </ul>
        )}
      </div>
      {compact ? null : (
        <aside className="card max-h-[42rem] space-y-5 overflow-auto p-5">
          <DetailPanel
            data={data}
            focus={focus}
            topic={topicFocus}
            analyzing={analyzing}
            shareOpen={shareOpen}
            dismissed={dismissed}
            onRefresh={() => void refresh()}
            onShare={() => setShareOpen(true)}
            onDismiss={(key) => setDismissed((prev) => [...prev, key])}
            showAi={Boolean(onRefreshAnalysis)}
            onPickPlanet={(subject) => setSelection({ kind: "planet", subject })}
            onPickTopic={(subject, topic) => setSelection({ kind: "satellite", subject, topic })}
          />
        </aside>
      )}
    </div>
  );
}

function SatelliteSystem({
  planet,
  satellite,
  point,
  color,
  stars,
  glowId,
  selection,
  onSelect,
  orbitSec,
  starSec,
}: {
  planet: UniverseViewPlanet;
  satellite: UniverseViewSatellite;
  point: { x: number; y: number };
  color: string;
  stars: { star: UniverseStar; point: { x: number; y: number } }[];
  glowId: string;
  selection: Selection;
  onSelect: (selection: Selection) => void;
  orbitSec: number;
  starSec: number;
}) {
  const selected =
    (selection.kind === "satellite" || selection.kind === "star") &&
    selection.subject === planet.subject &&
    selection.topic === satellite.topic;
  const growing = satellite.growth.delta > 0;

  return (
    <g
      className="universe-spin-rev"
      style={{
        transformOrigin: `${point.x}px ${point.y}px`,
        animationDuration: `${orbitSec}s`,
      }}
    >
      <g
        className="universe-spin"
        style={{
          transformOrigin: `${point.x}px ${point.y}px`,
          animationDuration: `${starSec}s`,
        }}
      >
        {stars.map(({ star, point: starPoint }, starIndex) => {
          const active = selection.kind === "star" && selection.id === star.id;
          return (
            <circle
              key={star.id}
              className={star.recent ? "universe-twinkle cursor-pointer" : "cursor-pointer"}
              cx={starPoint.x}
              cy={starPoint.y}
              r={active ? 4.2 : star.recent ? 3.1 : 2.4}
              fill={star.recent ? "#fff6d2" : "#d7deea"}
              stroke={active ? "#fffaf1" : "none"}
              strokeWidth={active ? 1.4 : 0}
              style={
                star.recent
                  ? {
                      animationDuration: `${1.8 + (starIndex % 4) * 0.4}s`,
                      animationDelay: `${starIndex * -0.4}s`,
                    }
                  : undefined
              }
              onClick={(event) => {
                event.stopPropagation();
                onSelect({ kind: "star", subject: planet.subject, topic: satellite.topic, id: star.id });
              }}
            />
          );
        })}
      </g>
      <g
        className="cursor-pointer"
        onClick={(event) => {
          event.stopPropagation();
          onSelect({ kind: "satellite", subject: planet.subject, topic: satellite.topic });
        }}
      >
        {growing ? (
          <circle
            className="universe-pulse"
            cx={point.x}
            cy={point.y}
            r={satellite.radius + 6}
            fill={color}
            opacity="0.2"
            filter={`url(#${glowId})`}
            style={{ transformOrigin: `${point.x}px ${point.y}px` }}
          />
        ) : null}
        <circle
          cx={point.x}
          cy={point.y}
          r={satellite.radius}
          fill="#d7deea"
          stroke={selected && selection.kind === "satellite" ? "#fffaf1" : color}
          strokeWidth={selected && selection.kind === "satellite" ? 2.4 : 1.4}
        />
        <text x={point.x} y={point.y + satellite.radius + 12} textAnchor="middle" fill="#d7deea" fontSize="10">
          {satellite.topic}
        </text>
      </g>
    </g>
  );
}

function DetailPanel({
  data,
  focus,
  topic,
  analyzing,
  shareOpen,
  dismissed,
  onRefresh,
  onShare,
  onDismiss,
  showAi = true,
  onPickPlanet,
  onPickTopic,
}: {
  data: UniverseScreenData;
  focus: Focus;
  topic?: TopicSnapshot;
  analyzing: boolean;
  shareOpen: boolean;
  dismissed: string[];
  onRefresh: () => void;
  onShare: () => void;
  onDismiss: (key: string) => void;
  showAi?: boolean;
  onPickPlanet: (subject: string) => void;
  onPickTopic: (subject: string, topic: string) => void;
}) {
  const insight = data.insight;
  const analysis = insight?.analysis;
  const subject = "subject" in focus ? data.snapshot.subjects.find((item) => item.subject === focus.subject) : undefined;
  const schoolGrowth = data.recentTotal > data.previousTotal ? "質問数が増えています" : undefined;

  if (focus.level === 1) {
    return (
      <div className="space-y-5">
        <section>
          <p className="text-xs tracking-[0.2em] text-terracotta">SCHOOL</p>
          <h2 className="mt-1 font-serif text-2xl">学校全体</h2>
          <p className="mt-3 text-sm">質問数：{data.snapshot.total}件</p>
          <p className="mt-1 text-sm text-muted">
            直近{data.snapshot.windowDays}日：{data.snapshot.recentTotal}件 ／ その前：{data.snapshot.previousTotal}件
          </p>
          {schoolGrowth ? <p className="mt-2 text-sm text-terracotta">{schoolGrowth}</p> : null}
          <p className="mt-4 text-sm text-muted">
            惑星は教科、衛星は分野、小さな星はひとつひとつの質問です。クリックすると内訳が見えます。
          </p>
          <ul className="mt-4 space-y-1 text-sm">
            {data.planets.map((planet) => (
              <li key={planet.subject}>
                <button type="button" className="text-left hover:text-terracotta" onClick={() => onPickPlanet(planet.subject)}>
                  {planet.subject} {planet.count}件
                </button>
              </li>
            ))}
          </ul>
        </section>
        {showAi ? (
          <AnalysisBlock insight={insight} stale={data.insightStale} analyzing={analyzing} onRefresh={onRefresh} />
        ) : null}
        {analysis?.attentionAreas.filter((area) => !dismissed.includes(`${area.subject}/${area.topic}`)).length ? (
          <section>
            <h3 className="text-sm font-semibold">注目候補</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {analysis.attentionAreas
                .filter((area) => !dismissed.includes(`${area.subject}/${area.topic}`))
                .map((area) => (
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
            <p className="mt-1 text-xs">{LOOP_LABEL[topic.loopPhase]}</p>
            <p className="mt-3 text-sm">質問：{topic.count}件</p>
            <p className="text-sm">理解チェック：{topic.checkAnswers}件（不安 {topic.checkAnxious}）</p>
            <p className="text-sm">
              先生からの問い：{topic.promptCount}件 / 回答 {topic.promptAnswers}件
            </p>
            <p className="text-sm">再確認：{topic.recheckCount}回</p>
            {topic.reviewPlanned ? <p className="text-sm">先生の判断：授業で確認（予定）</p> : null}
            {topic.testCandidate ? <p className="text-sm">先生の判断：出題検討</p> : null}
            {topic.before ? (
              <div className="mt-3 text-sm">
                <p className="font-medium">確認前</p>
                {topic.before.map((row) => (
                  <p key={row.id} className="text-muted">
                    {row.label} {row.count}人
                  </p>
                ))}
              </div>
            ) : null}
            {topic.after ? (
              <div className="mt-3 text-sm">
                <p className="font-medium">確認後</p>
                {topic.after.map((row) => (
                  <p key={row.id} className="text-muted">
                    {row.label} {row.count}人
                  </p>
                ))}
              </div>
            ) : null}
            <p className="mt-2 text-sm text-muted">
              直近30日：{topic.recentCount}件 ／ その前：{topic.previousCount}件
            </p>
            {topic.growth.label ? <p className="mt-1 text-sm text-terracotta">{topic.growth.label}</p> : null}
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
            {subject.growth.label ? <p className="mt-1 text-sm text-terracotta">{subject.growth.label}</p> : null}
            <ul className="mt-4 space-y-1 text-sm">
              {data.planets
                .find((planet) => planet.subject === subject.subject)
                ?.satellites.slice(0, 6)
                .map((satellite) => (
                  <li key={satellite.topic}>
                    <button
                      type="button"
                      className="text-left hover:text-terracotta"
                      onClick={() => onPickTopic(subject.subject, satellite.topic)}
                    >
                      ・{satellite.topic}（{satellite.count}件）
                    </button>
                  </li>
                ))}
            </ul>
          </>
        ) : null}
      </section>
      {showAi ? (
        <AnalysisBlock insight={insight} stale={data.insightStale} analyzing={analyzing} onRefresh={onRefresh} filter={topic?.key} />
      ) : null}
      {topic ? (
        <Actions
          topic={topic}
          actions={
            dismissed.includes(`${topic.subject}/${topic.topic}`)
              ? []
              : (analysis?.suggestedActions ?? [])
          }
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
          追加で問いを送る
        </Link>
        <Link
          href={`/teacher/prompts/new?subject=${encodeURIComponent(topic.subject)}&topic=${encodeURIComponent(topic.topic)}&kind=understanding_check&purpose=recheck`}
          className="btn-ghost text-sm"
        >
          再確認を送る
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
