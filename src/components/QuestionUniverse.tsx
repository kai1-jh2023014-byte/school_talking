"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { QuestionStatusChip } from "@/components/QuestionChips";
import { formatDateTime } from "@/lib/format";
import {
  planetPosition,
  satelliteOrbit,
  satellitePosition,
  starPosition,
  type UniversePayload,
  type UniversePlanet,
  type UniverseSatellite,
  type UniverseStar,
} from "@/lib/universe";

const WIDTH = 920;
const HEIGHT = 560;
const CX = 460;
const CY = 278;
const RING_X = 268;
const RING_Y = 196;

const PLANET_FILL: Record<string, string> = {
  数学: "#e3b14a",
  英語: "#6fa8c8",
  国語: "#d4785a",
  理科: "#5aab7a",
  社会: "#c4924a",
  情報: "#8b7cc9",
};

type Selection =
  | { kind: "school" }
  | { kind: "planet"; subject: string }
  | { kind: "satellite"; subject: string; topic: string }
  | { kind: "star"; subject: string; topic: string; id: string };

function planetColor(subject: string): string {
  return PLANET_FILL[subject] ?? "#9aa3b5";
}

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

export function QuestionUniverse({ data }: { data: UniversePayload }) {
  const [selection, setSelection] = useState<Selection>({ kind: "school" });

  const laidOut = useMemo(() => {
    return data.planets.map((planet, index) => {
      const origin = planetPosition(index, data.planets.length, CX, CY, RING_X, RING_Y);
      const orbit = satelliteOrbit(planet.radius, planet.satellites.length);
      const satellites = planet.satellites.map((satellite, satIndex) => {
        const seat = satellitePosition(origin, satIndex, planet.satellites.length, orbit);
        const stars = satellite.stars.map((star, starIndex) => ({
          star,
          point: starPosition(seat, starIndex, satellite.radius + 7),
        }));
        return { satellite, point: seat, orbit, stars };
      });
      return { planet, origin, orbit, satellites };
    });
  }, [data.planets]);

  const selectedPlanet = selection.kind === "school" ? undefined : data.planets.find((item) => item.subject === selection.subject);
  const selectedSatellite =
    selection.kind === "satellite" || selection.kind === "star"
      ? selectedPlanet?.satellites.find((item) => item.topic === selection.topic)
      : undefined;
  const selectedStar =
    selection.kind === "star" ? selectedSatellite?.stars.find((item) => item.id === selection.id) : undefined;

  const schoolGrowth = data.recentTotal > data.previousTotal ? "質問数が増えています" : undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="overflow-hidden rounded-3xl border border-[#1b2744] bg-[#0b1224] shadow-slip">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full"
          role="img"
          aria-label="学校の質問を、教科の惑星と分野の衛星、個別の質問の星で表した図"
          onClick={() => setSelection({ kind: "school" })}
        >
          <defs>
            <radialGradient id="universe-space" cx="50%" cy="45%" r="70%">
              <stop offset="0%" stopColor="#152244" />
              <stop offset="70%" stopColor="#0b1224" />
              <stop offset="100%" stopColor="#070b16" />
            </radialGradient>
            <filter id="universe-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect width={WIDTH} height={HEIGHT} fill="url(#universe-space)" />
          {DUST.map((dot, index) => (
            <circle key={index} cx={dot.x} cy={dot.y} r={dot.r} fill="#f4efe4" opacity={dot.o} />
          ))}

          <circle cx={CX} cy={CY} r="34" fill="#1c2740" stroke="#e6dcc8" strokeOpacity="0.28" />
          <text x={CX} y={CY + 4} textAnchor="middle" fill="#fffaf1" fontSize="11" fontFamily="serif">
            学校
          </text>

          {laidOut.map(({ planet, origin, orbit, satellites }) => {
            const color = planetColor(planet.subject);
            const selectedSubject = selection.kind === "school" ? undefined : selection.subject;
            const focused = !selectedSubject || selectedSubject === planet.subject;
            const growing = planet.growth.delta > 0;
            return (
              <g key={planet.subject} opacity={focused ? 1 : 0.28}>
                {planet.satellites.length > 0 ? (
                  <circle
                    cx={origin.x}
                    cy={origin.y}
                    r={orbit}
                    fill="none"
                    stroke={color}
                    strokeOpacity="0.22"
                    strokeDasharray="3 7"
                  />
                ) : null}

                {satellites.map(({ satellite, point, stars }) => (
                  <SatelliteSystem
                    key={`${planet.subject}-${satellite.topic}`}
                    planet={planet}
                    satellite={satellite}
                    point={point}
                    color={color}
                    stars={stars}
                    focused={Boolean(selectedSubject)}
                    selection={selection}
                    onSelect={setSelection}
                  />
                ))}

                <g
                  role="button"
                  tabIndex={0}
                  aria-label={`${planet.subject}の惑星。質問${planet.count}件`}
                  className="cursor-pointer"
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelection({ kind: "planet", subject: planet.subject });
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelection({ kind: "planet", subject: planet.subject });
                    }
                  }}
                >
                  {growing ? (
                    <circle
                      cx={origin.x}
                      cy={origin.y}
                      r={planet.radius + 10}
                      fill={color}
                      opacity="0.18"
                      filter="url(#universe-glow)"
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
                  <circle cx={origin.x - planet.radius * 0.28} cy={origin.y - planet.radius * 0.3} r={planet.radius * 0.18} fill="#fffaf1" opacity="0.22" />
                  <text
                    x={origin.x}
                    y={origin.y + planet.radius + 16}
                    textAnchor="middle"
                    fill="#fffaf1"
                    fontSize="13"
                    fontWeight="600"
                    style={{ pointerEvents: "none" }}
                  >
                    {planet.subject}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      <aside className="card space-y-4 p-5">
        {selection.kind === "school" ? (
          <SchoolPanel data={data} schoolGrowth={schoolGrowth} onPickPlanet={(subject) => setSelection({ kind: "planet", subject })} />
        ) : null}
        {selection.kind === "planet" && selectedPlanet ? (
          <PlanetPanel
            planet={selectedPlanet}
            onPickTopic={(topic) => setSelection({ kind: "satellite", subject: selectedPlanet.subject, topic })}
          />
        ) : null}
        {selection.kind === "satellite" && selectedPlanet && selectedSatellite ? (
          <SatellitePanel
            planet={selectedPlanet}
            satellite={selectedSatellite}
            onPickStar={(id) =>
              setSelection({ kind: "star", subject: selectedPlanet.subject, topic: selectedSatellite.topic, id })
            }
          />
        ) : null}
        {selection.kind === "star" && selectedPlanet && selectedSatellite && selectedStar ? (
          <StarPanel planet={selectedPlanet} satellite={selectedSatellite} star={selectedStar} />
        ) : null}
      </aside>
    </div>
  );
}

function SatelliteSystem({
  planet,
  satellite,
  point,
  color,
  stars,
  focused,
  selection,
  onSelect,
}: {
  planet: UniversePlanet;
  satellite: UniverseSatellite;
  point: { x: number; y: number };
  color: string;
  stars: { star: UniverseStar; point: { x: number; y: number } }[];
  focused: boolean;
  selection: Selection;
  onSelect: (selection: Selection) => void;
}) {
  const selected =
    (selection.kind === "satellite" || selection.kind === "star") &&
    selection.subject === planet.subject &&
    selection.topic === satellite.topic;
  const growing = satellite.growth.delta > 0;

  return (
    <g>
      {stars.map(({ star, point: starPoint }) => {
        const active = selection.kind === "star" && selection.id === star.id;
        return (
          <g
            key={star.id}
            className="cursor-pointer"
            role="button"
            tabIndex={0}
            aria-label={star.summary}
            onClick={(event) => {
              event.stopPropagation();
              onSelect({ kind: "star", subject: planet.subject, topic: satellite.topic, id: star.id });
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect({ kind: "star", subject: planet.subject, topic: satellite.topic, id: star.id });
              }
            }}
          >
            <circle cx={starPoint.x} cy={starPoint.y} r="8" fill="transparent" />
            <circle
              cx={starPoint.x}
              cy={starPoint.y}
              r={active ? 4.2 : star.recent ? 3.1 : 2.4}
              fill={star.recent ? "#fff6d2" : "#d7deea"}
              stroke={active ? "#fffaf1" : "none"}
              strokeWidth={active ? 1.4 : 0}
            />
            <title>{star.summary}</title>
          </g>
        );
      })}
      <g
        role="button"
        tabIndex={0}
        aria-label={`${planet.subject}の${satellite.topic}。質問${satellite.count}件`}
        className="cursor-pointer"
        onClick={(event) => {
          event.stopPropagation();
          onSelect({ kind: "satellite", subject: planet.subject, topic: satellite.topic });
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect({ kind: "satellite", subject: planet.subject, topic: satellite.topic });
          }
        }}
      >
        {growing ? (
          <circle cx={point.x} cy={point.y} r={satellite.radius + 6} fill={color} opacity="0.2" filter="url(#universe-glow)" />
        ) : null}
        <circle
          cx={point.x}
          cy={point.y}
          r={satellite.radius}
          fill="#d7deea"
          stroke={selected && selection.kind === "satellite" ? "#fffaf1" : color}
          strokeWidth={selected && selection.kind === "satellite" ? 2.4 : 1.4}
        />
        {focused ? (
          <text
            x={point.x}
            y={point.y + satellite.radius + 13}
            textAnchor="middle"
            fill="#d7deea"
            fontSize="10"
            style={{ pointerEvents: "none" }}
          >
            {satellite.topic}
          </text>
        ) : null}
      </g>
    </g>
  );
}

function SchoolPanel({
  data,
  schoolGrowth,
  onPickPlanet,
}: {
  data: UniversePayload;
  schoolGrowth?: string;
  onPickPlanet: (subject: string) => void;
}) {
  return (
    <div>
      <p className="text-xs tracking-[0.2em] text-terracotta">SCHOOL</p>
      <h2 className="mt-1 font-serif text-2xl">学校全体</h2>
      <p className="mt-3 text-sm">質問数：{data.total}件</p>
      <p className="mt-1 text-sm text-muted">
        直近{data.windowDays}日：{data.recentTotal}件 ／ その前：{data.previousTotal}件
      </p>
      {schoolGrowth ? <p className="mt-2 text-sm text-terracotta">{schoolGrowth}</p> : null}
      <p className="mt-4 text-sm text-muted">惑星は教科、衛星は分野、小さな星はひとつひとつの質問です。クリックすると内訳が見えます。</p>
      <ul className="mt-4 space-y-1 text-sm">
        {data.planets.map((planet) => (
          <li key={planet.subject}>
            <button type="button" className="text-left hover:text-terracotta" onClick={() => onPickPlanet(planet.subject)}>
              {planet.subject} {planet.count}件
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlanetPanel({
  planet,
  onPickTopic,
}: {
  planet: UniversePlanet;
  onPickTopic: (topic: string) => void;
}) {
  const topTopics = planet.satellites.slice(0, 4);
  return (
    <div>
      <p className="text-xs tracking-[0.2em] text-terracotta">PLANET</p>
      <h2 className="mt-1 font-serif text-2xl">{planet.subject}</h2>
      <p className="mt-3 text-sm">質問数：{planet.count}件</p>
      <p className="mt-1 text-sm text-muted">
        直近30日：{planet.growth.recentCount}件 ／ その前：{planet.growth.previousCount}件
      </p>
      {planet.growth.label ? <p className="mt-2 text-sm text-terracotta">{planet.growth.label}</p> : null}

      <h3 className="mt-5 text-sm font-semibold">主な分野</h3>
      {topTopics.length === 0 ? (
        <p className="mt-2 text-sm text-muted">この教科の質問はまだありません。</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {topTopics.map((satellite) => (
            <li key={satellite.topic}>
              <button type="button" className="text-left hover:text-terracotta" onClick={() => onPickTopic(satellite.topic)}>
                ・{satellite.topic}（{satellite.count}件）
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SatellitePanel({
  planet,
  satellite,
  onPickStar,
}: {
  planet: UniversePlanet;
  satellite: UniverseSatellite;
  onPickStar: (id: string) => void;
}) {
  return (
    <div>
      <p className="text-xs tracking-[0.2em] text-terracotta">SATELLITE</p>
      <h2 className="mt-1 font-serif text-2xl">{satellite.topic}</h2>
      <p className="mt-1 text-sm text-muted">{planet.subject}</p>
      <p className="mt-3 text-sm">質問数：{satellite.count}件</p>
      <p className="mt-1 text-sm text-muted">
        直近30日：{satellite.growth.recentCount}件 ／ その前：{satellite.growth.previousCount}件
      </p>
      {satellite.growth.label ? <p className="mt-2 text-sm text-terracotta">{satellite.growth.label}</p> : null}
      <h3 className="mt-5 text-sm font-semibold">質問</h3>
      <ul className="mt-2 space-y-2">
        {satellite.stars.map((star) => (
          <li key={star.id}>
            <button type="button" className="text-left text-sm hover:text-terracotta" onClick={() => onPickStar(star.id)}>
              ・{star.summary}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StarPanel({
  planet,
  satellite,
  star,
}: {
  planet: UniversePlanet;
  satellite: UniverseSatellite;
  star: UniverseStar;
}) {
  return (
    <div>
      <p className="text-xs tracking-[0.2em] text-terracotta">STAR</p>
      <h2 className="mt-1 font-serif text-2xl leading-snug">{star.summary}</h2>
      <p className="mt-2 text-sm text-muted">
        {planet.subject} / {satellite.topic}
      </p>
      <div className="mt-3">
        <QuestionStatusChip status={star.status} />
      </div>
      <p className="mt-3 text-sm text-muted">{formatDateTime(star.createdAt)}</p>
      <Link href={`/admin/questions/${star.id}`} className="btn-navy mt-5 inline-flex text-sm">
        この質問を開く
      </Link>
    </div>
  );
}
