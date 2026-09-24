import { SUBJECTS } from "./constants";
import { normalizeStatus } from "./questions";
import type { Question, QuestionStatus, StoreData } from "./types";

export const UNIVERSE_WINDOW_DAYS = 30;

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
  stars: UniverseStar[];
};

export type UniversePlanet = {
  subject: string;
  count: number;
  radius: number;
  growth: UniverseGrowth;
  satellites: UniverseSatellite[];
};

export type UniversePayload = {
  total: number;
  recentTotal: number;
  previousTotal: number;
  generatedAt: string;
  windowDays: number;
  planets: UniversePlanet[];
};

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
