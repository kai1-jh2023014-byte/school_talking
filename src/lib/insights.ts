import { SUBJECTS } from "./constants";
import { isAnxiousResponse, promptsOf, responsesOf } from "./prompts";
import type { CachedSchoolInsight, Question, StoreData } from "./types";
import {
  UNIVERSE_WINDOW_DAYS,
  clusterQuestions,
  makeGrowth,
  type ClusterStat,
  type UniverseGrowth,
} from "./universe";

export const INSIGHT_MIN_RECENT = 5;
export const INSIGHT_MIN_TOPIC_RECENT = 3;
export const MAX_JEV_TOPICS = 8;

export type TopicSnapshot = {
  subject: string;
  topic: string;
  key: string;
  count: number;
  recentCount: number;
  previousCount: number;
  growth: UniverseGrowth;
  clusters: ClusterStat[];
  checkAnswers: number;
  checkAnxious: number;
  promptCount: number;
  promptAnswers: number;
};

export type SubjectSnapshot = {
  subject: string;
  count: number;
  recentCount: number;
  previousCount: number;
  growth: UniverseGrowth;
};

export type SchoolSnapshot = {
  fingerprint: string;
  generatedAt: string;
  windowDays: number;
  total: number;
  recentTotal: number;
  previousTotal: number;
  enoughData: boolean;
  subjects: SubjectSnapshot[];
  topics: TopicSnapshot[];
};

function inWindow(iso: string, start: Date, end: Date): boolean {
  const created = new Date(iso);
  return created >= start && created < end;
}

export function snapshotFingerprint(store: StoreData | Question[]): string {
  const questions = Array.isArray(store) ? store : store.questions;
  const prompts = Array.isArray(store) ? [] : promptsOf(store);
  const responses = Array.isArray(store) ? [] : responsesOf(store);
  const parts = [
    ...questions.map((question) => `q:${question.id}:${question.subject}:${question.topic}:${question.createdAt}`),
    ...prompts.map((prompt) => `p:${prompt.id}:${prompt.kind}:${prompt.createdAt}`),
    ...responses.map((item) => `r:${item.id}:${item.promptId}:${item.optionId ?? ""}:${item.createdAt}`),
  ].sort();
  const raw = `${questions.length}:${prompts.length}:${responses.length}|${parts.join("|")}`;
  let hash = 2166136261;
  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${questions.length}-${(hash >>> 0).toString(16)}`;
}

export function buildSchoolSnapshot(store: StoreData, now = new Date()): SchoolSnapshot {
  const recentStart = new Date(now.getTime() - UNIVERSE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const previousStart = new Date(now.getTime() - UNIVERSE_WINDOW_DAYS * 2 * 24 * 60 * 60 * 1000);
  const questions = store.questions;
  const recentTotal = questions.filter((question) => inWindow(question.createdAt, recentStart, now)).length;
  const previousTotal = questions.filter((question) => inWindow(question.createdAt, previousStart, recentStart)).length;

  const subjectNames = new Set<string>(SUBJECTS);
  for (const question of questions) {
    if (question.subject) subjectNames.add(question.subject);
  }

  const subjects: SubjectSnapshot[] = Array.from(subjectNames).map((subject) => {
    const owned = questions.filter((question) => question.subject === subject);
    const recentCount = owned.filter((question) => inWindow(question.createdAt, recentStart, now)).length;
    const previousCount = owned.filter((question) => inWindow(question.createdAt, previousStart, recentStart)).length;
    return {
      subject,
      count: owned.length,
      recentCount,
      previousCount,
      growth: makeGrowth(recentCount, previousCount),
    };
  });

  const topicKeys = new Set([
    ...questions.map((question) => `${question.subject}:::${question.topic || "その他"}`),
    ...promptsOf(store).map((prompt) => `${prompt.subject}:::${prompt.topic}`),
  ]);
  const topics: TopicSnapshot[] = Array.from(topicKeys)
    .map((key) => {
      const [subject, topic] = key.split(":::");
      const owned = questions.filter((question) => question.subject === subject && (question.topic || "その他") === topic);
      const recentCount = owned.filter((question) => inWindow(question.createdAt, recentStart, now)).length;
      const previousCount = owned.filter((question) => inWindow(question.createdAt, previousStart, recentStart)).length;
      const topicPrompts = promptsOf(store).filter((prompt) => prompt.subject === subject && prompt.topic === topic);
      const topicResponses = responsesOf(store).filter((item) => topicPrompts.some((prompt) => prompt.id === item.promptId));
      const checks = topicPrompts.filter((prompt) => prompt.kind === "understanding_check");
      const checkResponses = topicResponses.filter((item) => checks.some((prompt) => prompt.id === item.promptId));
      const checkAnxious = checkResponses.filter((item) => {
        const prompt = checks.find((prompt) => prompt.id === item.promptId);
        return prompt ? isAnxiousResponse(prompt, item) : false;
      }).length;
      return {
        subject,
        topic,
        key: `${subject}/${topic}`,
        count: owned.length,
        recentCount,
        previousCount,
        growth: makeGrowth(recentCount, previousCount),
        clusters: clusterQuestions(subject, topic, owned),
        checkAnswers: checkResponses.length,
        checkAnxious,
        promptCount: topicPrompts.filter((prompt) => prompt.kind === "teacher_question").length,
        promptAnswers: topicResponses.filter((item) =>
          topicPrompts.some((prompt) => prompt.kind === "teacher_question" && prompt.id === item.promptId),
        ).length,
      };
    })
    .sort((a, b) => b.recentCount - a.recentCount || b.count - a.count);

  const enoughData =
    recentTotal >= INSIGHT_MIN_RECENT || topics.some((topic) => topic.recentCount >= INSIGHT_MIN_TOPIC_RECENT);

  return {
    fingerprint: snapshotFingerprint(store),
    generatedAt: now.toISOString(),
    windowDays: UNIVERSE_WINDOW_DAYS,
    total: questions.length,
    recentTotal,
    previousTotal,
    enoughData,
    subjects,
    topics,
  };
}

export function insightStale(cached: CachedSchoolInsight | undefined, fingerprint: string): boolean {
  if (!cached) return true;
  return cached.fingerprint !== fingerprint;
}

export function snapshotForJev(snapshot: SchoolSnapshot) {
  return {
    windowDays: snapshot.windowDays,
    recentTotal: snapshot.recentTotal,
    previousTotal: snapshot.previousTotal,
    topics: snapshot.topics.slice(0, MAX_JEV_TOPICS).map((topic) => ({
      key: topic.key,
      recent: topic.recentCount,
      previous: topic.previousCount,
      total: topic.count,
      clusters: topic.clusters.slice(0, 5).map((cluster) => ({ name: cluster.name, count: cluster.count })),
      checkAnswers: topic.checkAnswers,
      checkAnxious: topic.checkAnxious,
      promptCount: topic.promptCount,
      promptAnswers: topic.promptAnswers,
    })),
  };
}

export function emptyInsight(fingerprint: string, status: CachedSchoolInsight["status"], message: string, errorCode?: string): CachedSchoolInsight {
  return {
    fingerprint,
    analyzedAt: new Date().toISOString(),
    status,
    message,
    analysis: null,
    errorCode,
  };
}
