import { SUBJECT_RULES } from "./classify";
import { SUBJECTS } from "./constants";
import { normalizeStatus } from "./questions";
import type { Question, QuestionStatus, StoreData } from "./types";

export const SAMPLE_LIMIT = 8;
export const UNIVERSE_WINDOW_DAYS = 30;

export type ClusterStat = {
  name: string;
  count: number;
  samples: { id: string; summary: string; createdAt: string }[];
};

export type UniverseGrowth = {
  recentCount: number;
  previousCount: number;
  delta: number;
  label?: string;
};

export type UniverseStar = {
  id: string;
  summary: string;
  status: QuestionStatus;
  createdAt: string;
  recent: boolean;
};

export type UniverseSatellite = {
  topic: string;
  count: number;
  radius: number;
  growth: UniverseGrowth;
  clusters: ClusterStat[];
  stars: UniverseStar[];
};

export type UniversePlanet = {
  subject: string;
  count: number;
  radius: number;
  growth: UniverseGrowth;
  satellites: UniverseSatellite[];
};

export type UniverseViewSatellite = Omit<UniverseSatellite, "stars"> & {
  sampleCount: number;
  samples: UniverseStar[];
};

export type UniverseViewPlanet = Omit<UniversePlanet, "satellites"> & {
  satellites: UniverseViewSatellite[];
};

export type UniversePayload = {
  total: number;
  recentTotal: number;
  previousTotal: number;
  generatedAt: string;
  windowDays: number;
  planets: UniversePlanet[];
};

export type Focus =
  | { level: 1 }
  | { level: 2; subject: string }
  | { level: 3; subject: string; topic: string }
  | { level: 4; subject: string; topic: string; cluster: string };

export type GraphNode = {
  id: string;
  kind: "school" | "subject" | "topic" | "cluster" | "question";
  label: string;
  x: number;
  y: number;
  r: number;
  count: number;
  attention?: boolean;
};

export type GraphEdge = { from: string; to: string };

export type Point = { x: number; y: number };

export function bodyRadius(count: number, min: number, max: number): number {
  if (count <= 0) return Math.max(8, Math.round(min * 0.72));
  const t = Math.log2(count + 1) / Math.log2(33);
  return Math.round(min + (max - min) * Math.min(1, Math.max(0, t)));
}

export function growthLabel(recentCount: number, previousCount: number): string | undefined {
  if (previousCount > 0) {
    const change = Math.round(((recentCount - previousCount) / previousCount) * 100);
    if (change >= 20) {
      return `質問数が増えています（直近${UNIVERSE_WINDOW_DAYS}日は、その前の${UNIVERSE_WINDOW_DAYS}日より約${change}%多い）`;
    }
    if (change <= -20) {
      return `直近${UNIVERSE_WINDOW_DAYS}日の質問数は、その前の${UNIVERSE_WINDOW_DAYS}日より約${Math.abs(change)}%少ないです`;
    }
    if (recentCount > previousCount) return "質問数が増えています";
    return undefined;
  }
  if (recentCount >= 3) return `直近${UNIVERSE_WINDOW_DAYS}日に質問が集まっています`;
  return undefined;
}

export function makeGrowth(recentCount: number, previousCount: number): UniverseGrowth {
  return {
    recentCount,
    previousCount,
    delta: recentCount - previousCount,
    label: growthLabel(recentCount, previousCount),
  };
}

function clusterName(raw: string): string {
  if (raw === "最大値" || raw === "最小値") return "最大値・最小値";
  return raw;
}

export function clusterQuestions(subject: string, topic: string, questions: Question[]): ClusterStat[] {
  const rule = SUBJECT_RULES.find((item) => item.name === subject);
  const topicRule = rule?.topics.find((item) => item.name === topic);
  const keys = (topicRule?.keys ?? []).filter((key) => key !== topic);
  const buckets = new Map<string, Question[]>();

  for (const question of questions) {
    const hay = `${question.summary} ${question.body}`.toLowerCase();
    const hit = keys.find((key) => hay.includes(key.toLowerCase()));
    const name = clusterName(hit ?? "その他");
    const list = buckets.get(name) ?? [];
    list.push(question);
    buckets.set(name, list);
  }

  return Array.from(buckets.entries())
    .map(([name, list]) => ({
      name,
      count: list.length,
      samples: [...list]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, SAMPLE_LIMIT)
        .map((question) => ({
          id: question.id,
          summary: question.summary,
          createdAt: question.createdAt,
        })),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ja"));
}

function inWindow(iso: string, start: Date, end: Date): boolean {
  const created = new Date(iso);
  return created >= start && created < end;
}

function sortStars(stars: UniverseStar[]): UniverseStar[] {
  return [...stars].sort((a, b) => {
    const byTime = b.createdAt.localeCompare(a.createdAt);
    if (byTime !== 0) return byTime;
    return a.id.localeCompare(b.id);
  });
}

export function buildUniverse(store: StoreData, now = new Date()): UniversePayload {
  const recentStart = new Date(now.getTime() - UNIVERSE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const previousStart = new Date(now.getTime() - UNIVERSE_WINDOW_DAYS * 2 * 24 * 60 * 60 * 1000);

  const questions = store.questions;
  const subjectNames = new Set<string>(SUBJECTS);
  for (const question of questions) {
    if (question.subject) subjectNames.add(question.subject);
  }

  const planets: UniversePlanet[] = Array.from(subjectNames).map((subject) => {
    const owned = questions.filter((question) => question.subject === subject);
    const topicNames = new Set(owned.map((question) => question.topic || "その他"));
    const satellites: UniverseSatellite[] = Array.from(topicNames)
      .map((topic) => {
        const topicQuestions = owned.filter((question) => (question.topic || "その他") === topic);
        const stars = sortStars(
          topicQuestions.map((question) => toStar(question, recentStart, now)),
        );
        return {
          topic,
          count: topicQuestions.length,
          radius: bodyRadius(topicQuestions.length, 9, 22),
          growth: makeGrowth(
            topicQuestions.filter((question) => inWindow(question.createdAt, recentStart, now)).length,
            topicQuestions.filter((question) => inWindow(question.createdAt, previousStart, recentStart)).length,
          ),
          clusters: clusterQuestions(subject, topic, topicQuestions),
          stars,
        };
      })
      .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic, "ja"));

    return {
      subject,
      count: owned.length,
      radius: bodyRadius(owned.length, 20, 52),
      growth: makeGrowth(
        owned.filter((question) => inWindow(question.createdAt, recentStart, now)).length,
        owned.filter((question) => inWindow(question.createdAt, previousStart, recentStart)).length,
      ),
      satellites,
    };
  });

  planets.sort((a, b) => {
    const ai = SUBJECTS.indexOf(a.subject as (typeof SUBJECTS)[number]);
    const bi = SUBJECTS.indexOf(b.subject as (typeof SUBJECTS)[number]);
    const ao = ai === -1 ? SUBJECTS.length : ai;
    const bo = bi === -1 ? SUBJECTS.length : bi;
    if (ao !== bo) return ao - bo;
    return a.subject.localeCompare(b.subject, "ja");
  });

  return {
    total: questions.length,
    recentTotal: questions.filter((question) => inWindow(question.createdAt, recentStart, now)).length,
    previousTotal: questions.filter((question) => inWindow(question.createdAt, previousStart, recentStart)).length,
    generatedAt: now.toISOString(),
    windowDays: UNIVERSE_WINDOW_DAYS,
    planets,
  };
}

function toStar(question: Question, recentStart: Date, now: Date): UniverseStar {
  return {
    id: question.id,
    summary: question.summary,
    status: normalizeStatus(question.status),
    createdAt: question.createdAt,
    recent: inWindow(question.createdAt, recentStart, now),
  };
}

export function planetPosition(
  index: number,
  total: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): Point {
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / Math.max(total, 1);
  return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
}

export function satellitePosition(
  planet: Point,
  index: number,
  total: number,
  orbit: number,
  phase = 0.35,
): Point {
  const angle = phase + (2 * Math.PI * index) / Math.max(total, 1) - Math.PI / 2;
  return { x: planet.x + orbit * Math.cos(angle), y: planet.y + orbit * Math.sin(angle) };
}

export function starPosition(origin: Point, index: number, orbit: number): Point {
  const golden = index * 2.399963229728653;
  const r = orbit + Math.sqrt(index) * 5.2;
  return { x: origin.x + r * Math.cos(golden), y: origin.y + r * Math.sin(golden) };
}

export function satelliteOrbit(planetRadius: number, satelliteCount: number): number {
  return planetRadius + 42 + Math.min(22, Math.max(0, satelliteCount - 2) * 5);
}

export function toUniverseView(payload: UniversePayload): { planets: UniverseViewPlanet[] } & Omit<UniversePayload, "planets"> {
  return {
    ...payload,
    planets: payload.planets.map((planet) => ({
      ...planet,
      satellites: planet.satellites.map((satellite) => ({
        topic: satellite.topic,
        count: satellite.count,
        radius: satellite.radius,
        growth: satellite.growth,
        clusters: satellite.clusters,
        sampleCount: satellite.stars.length,
        samples: satellite.stars.slice(0, SAMPLE_LIMIT),
      })),
    })),
  };
}

function ring(origin: Point, index: number, total: number, radius: number, phase = 0): Point {
  const angle = -Math.PI / 2 + phase + (2 * Math.PI * index) / Math.max(total, 1);
  return { x: origin.x + radius * Math.cos(angle), y: origin.y + radius * Math.sin(angle) };
}

export function layoutScene(
  payload: { planets: Array<{ subject: string; count: number; radius: number; satellites: Array<{ topic: string; count: number; radius: number; clusters: ClusterStat[] }> }> },
  focus: Focus,
  attentionKeys: string[],
): { nodes: GraphNode[]; edges: GraphEdge[]; camera: { x: number; y: number; w: number; h: number } } {
  const CX = 460;
  const CY = 278;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const attention = new Set(attentionKeys);
  if (focus.level === 1) {
    nodes.push({ id: "school", kind: "school", label: "学校", x: CX, y: CY, r: 28, count: 0 });
  }

  const planets = payload.planets;
  planets.forEach((planet, index) => {
    const inward = attention.has(planet.subject);
    const seat = planetPosition(index, planets.length, CX, CY, inward ? 200 : 268, inward ? 148 : 196);
    const planetId = `subject:${planet.subject}`;
    if (focus.level === 1 || ("subject" in focus && focus.subject === planet.subject)) {
      nodes.push({
        id: planetId,
        kind: "subject",
        label: planet.subject,
        x: focus.level === 1 ? seat.x : CX,
        y: focus.level === 1 ? seat.y : CY,
        r: planet.radius,
        count: planet.count,
        attention: inward,
      });
      edges.push({ from: "school", to: planetId });
    }
  });

  if (focus.level >= 2 && "subject" in focus) {
    const planet = planets.find((item) => item.subject === focus.subject);
    const origin = nodes.find((node) => node.id === `subject:${focus.subject}`) ?? {
      id: `subject:${focus.subject}`,
      kind: "subject" as const,
      label: focus.subject,
      x: CX,
      y: CY,
      r: 36,
      count: 0,
    };
    planet?.satellites.forEach((satellite, index) => {
      const topicId = `topic:${planet.subject}/${satellite.topic}`;
      const seat = ring(origin, index, planet.satellites.length, satelliteOrbit(origin.r, planet.satellites.length));
      if (focus.level === 2 || ("topic" in focus && focus.topic === satellite.topic)) {
        nodes.push({
          id: topicId,
          kind: "topic",
          label: satellite.topic,
          x: focus.level === 2 ? seat.x : CX + 10,
          y: focus.level === 2 ? seat.y : CY + 10,
          r: satellite.radius,
          count: satellite.count,
          attention: attention.has(`${planet.subject}/${satellite.topic}`) || attention.has(satellite.topic),
        });
        edges.push({ from: origin.id, to: topicId });
      }
    });
  }

  if (focus.level >= 3 && "topic" in focus) {
    const planet = planets.find((item) => item.subject === focus.subject);
    const satellite = planet?.satellites.find((item) => item.topic === focus.topic);
    const origin = nodes.find((node) => node.id === `topic:${focus.subject}/${focus.topic}`);
    satellite?.clusters.forEach((cluster, index) => {
      const clusterId = `cluster:${focus.subject}/${focus.topic}/${cluster.name}`;
      if (!origin) return;
      const seat = ring(origin, index, satellite.clusters.length, origin.r + 56);
      if (focus.level === 3 || ("cluster" in focus && focus.cluster === cluster.name)) {
        nodes.push({
          id: clusterId,
          kind: "cluster",
          label: cluster.name,
          x: focus.level === 3 ? seat.x : CX,
          y: focus.level === 3 ? seat.y : CY - 40,
          r: bodyRadius(cluster.count, 10, 20),
          count: cluster.count,
        });
        edges.push({ from: origin.id, to: clusterId });
      }
    });
  }

  if (focus.level === 4 && "cluster" in focus) {
    const planet = planets.find((item) => item.subject === focus.subject);
    const satellite = planet?.satellites.find((item) => item.topic === focus.topic);
    const cluster = satellite?.clusters.find((item) => item.name === focus.cluster);
    const origin = nodes.find((node) => node.id === `cluster:${focus.subject}/${focus.topic}/${focus.cluster}`);
    cluster?.samples.forEach((sample, index) => {
      if (!origin) return;
      const seat = ring(origin, index, cluster.samples.length, 70);
      nodes.push({
        id: `question:${sample.id}`,
        kind: "question",
        label: sample.summary,
        x: seat.x,
        y: seat.y,
        r: 6,
        count: 1,
      });
      edges.push({ from: origin.id, to: `question:${sample.id}` });
    });
  }

  const visible = nodes.filter((node) => node.kind !== "school" || focus.level === 1);
  const xs = visible.map((node) => node.x);
  const ys = visible.map((node) => node.y);
  const minX = Math.min(...xs, CX) - 80;
  const maxX = Math.max(...xs, CX) + 80;
  const minY = Math.min(...ys, CY) - 70;
  const maxY = Math.max(...ys, CY) + 70;
  return {
    nodes,
    edges,
    camera: { x: minX, y: minY, w: Math.max(420, maxX - minX), h: Math.max(320, maxY - minY) },
  };
}
