import { normalizeStatus } from "./questions";
import type { Question, QuestionStatus, StoreData } from "./types";

export type SubjectCount = { subject: string; count: number };
export type TopicCount = { subject: string; topic: string; count: number };
export type HourCount = { hour: number; count: number };
export type SlotCount = { slot: string; count: number };
export type StatusCount = { status: string; count: number };
export type Struggle = { subject: string; topic: string; count: number; previousCount: number; deltaLabel?: string };

export type AnalyticsPayload = {
  total: number;
  unanswered: number;
  answered: number;
  inProgress: number;
  transferred: number;
  bySubject: SubjectCount[];
  byTopic: TopicCount[];
  byHour: HourCount[];
  bySlot: SlotCount[];
  byStatus: StatusCount[];
  struggles: Struggle[];
  insights: string[];
};

function countBy<T extends string>(items: T[]): { key: T; count: number }[] {
  const map = new Map<T, number>();
  for (const item of items) {
    map.set(item, (map.get(item) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

export function timeSlot(iso: string): string {
  const hour = new Date(iso).getHours();
  if (hour < 8) return "朝（登校前）";
  if (hour < 12) return "午前の授業";
  if (hour < 14) return "昼休み";
  if (hour < 16) return "午後の授業";
  if (hour < 19) return "放課後";
  return "夜";
}

function statusGroup(status: QuestionStatus): string {
  const normalized = normalizeStatus(status);
  if (normalized === "answered") return "回答済み";
  if (normalized === "closed" || normalized === "cancelled") return "終了";
  if (normalized === "transferred") return "転送";
  if (normalized === "accepted") return "対応中";
  if (normalized === "deferred") return "保留";
  return "未対応";
}

export function buildAnalytics(store: StoreData, now = new Date()): AnalyticsPayload {
  const questions: Question[] = store.questions;
  const total = questions.length;
  const answered = questions.filter((q) => normalizeStatus(q.status) === "answered").length;
  const inProgress = questions.filter((q) =>
    ["accepted", "deferred", "transferred"].includes(normalizeStatus(q.status)),
  ).length;
  const transferred = questions.filter((q) => q.transferHistory.length > 0).length;
  const unanswered = questions.filter((q) =>
    !["answered", "closed", "cancelled"].includes(normalizeStatus(q.status)),
  ).length;

  const bySubject = countBy(questions.map((q) => q.subject)).map(({ key, count }) => ({
    subject: key,
    count,
  }));

  const topicKey = questions.map((q) => `${q.subject}:::${q.topic}`);
  const byTopic = countBy(topicKey).map(({ key, count }) => {
    const [subject, topic] = key.split(":::");
    return { subject, topic, count };
  });

  const byHourMap = new Map<number, number>();
  for (let hour = 0; hour < 24; hour += 1) byHourMap.set(hour, 0);
  for (const question of questions) {
    const hour = new Date(question.createdAt).getHours();
    byHourMap.set(hour, (byHourMap.get(hour) ?? 0) + 1);
  }
  const byHour = Array.from(byHourMap.entries()).map(([hour, count]) => ({ hour, count }));

  const bySlot = countBy(questions.map((q) => timeSlot(q.createdAt))).map(({ key, count }) => ({
    slot: key,
    count,
  }));

  const byStatus = countBy(questions.map((q) => statusGroup(q.status))).map(({ key, count }) => ({
    status: key,
    count,
  }));

  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const recent = questions.filter((q) => new Date(q.createdAt) >= monthAgo);
  const previous = questions.filter((q) => {
    const created = new Date(q.createdAt);
    return created >= sixtyAgo && created < monthAgo;
  });
  const recentTopics = countBy(recent.map((q) => `${q.subject}:::${q.topic}`));
  const previousMap = new Map(
    countBy(previous.map((q) => `${q.subject}:::${q.topic}`)).map((item) => [item.key, item.count]),
  );
  const struggles: Struggle[] = recentTopics.slice(0, 5).map(({ key, count }) => {
    const [subject, topic] = key.split(":::");
    const previousCount = previousMap.get(key) ?? 0;
    let deltaLabel: string | undefined;
    if (previousCount > 0) {
      const change = Math.round(((count - previousCount) / previousCount) * 100);
      if (Math.abs(change) >= 20) {
        deltaLabel =
          change > 0
            ? `直近30日は、その前の30日より約${change}%多い`
            : `直近30日は、その前の30日より約${Math.abs(change)}%少ない`;
      }
    } else if (count >= 3) {
      deltaLabel = "直近30日に新たに集まっている分野です";
    }
    return { subject, topic, count, previousCount, deltaLabel };
  });

  const insights: string[] = [];
  if (struggles[0]) {
    insights.push(`今月いちばん集まっているのは「${struggles[0].subject} / ${struggles[0].topic}」です（${struggles[0].count}件）。`);
    if (struggles[0].deltaLabel) insights.push(struggles[0].deltaLabel);
  }
  if (bySubject[0]) {
    insights.push(`${bySubject[0].subject}の質問が全体でも多く、授業の見直し候補です。`);
  }
  const peakSlot = [...bySlot].sort((a, b) => b.count - a.count)[0];
  if (peakSlot && peakSlot.count > 0) {
    insights.push(`質問が集まりやすい時間帯は「${peakSlot.slot}」です。`);
  }
  if (unanswered > 0) {
    insights.push(`未対応が${unanswered}件あります。対応できる先生への再マッチングを検討してください。`);
  }

  return {
    total,
    unanswered,
    answered,
    inProgress,
    transferred,
    bySubject,
    byTopic,
    byHour,
    bySlot,
    byStatus,
    struggles,
    insights,
  };
}
