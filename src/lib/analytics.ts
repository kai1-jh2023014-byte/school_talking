import type { Question, StoreData } from "./types";

export type SubjectCount = { subject: string; count: number };
export type TopicCount = { subject: string; topic: string; count: number };
export type HourCount = { hour: number; count: number };

export type AnalyticsPayload = {
  total: number;
  unanswered: number;
  answered: number;
  bySubject: SubjectCount[];
  byTopic: TopicCount[];
  byHour: HourCount[];
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

export function buildAnalytics(store: StoreData): AnalyticsPayload {
  const questions: Question[] = store.questions;
  const total = questions.length;
  const answered = questions.filter((q) => q.status === "answered").length;
  const unanswered = questions.filter((q) => q.status !== "answered" && q.status !== "closed").length;

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

  const insights: string[] = [];
  if (bySubject[0]) {
    insights.push(`${bySubject[0].subject}の質問が最も多く、全体の見直し候補です。`);
  }
  if (byTopic[0]) {
    insights.push(`「${byTopic[0].subject} / ${byTopic[0].topic}」に質問が集中しています。補足教材や復習時間の検討が有効です。`);
  }
  const peak = [...byHour].sort((a, b) => b.count - a.count)[0];
  if (peak && peak.count > 0) {
    insights.push(`質問が集まりやすい時間帯は ${peak.hour}時台です。放課後の質問対応シフトに活かせます。`);
  }
  if (unanswered > 0) {
    insights.push(`未回答が${unanswered}件あります。対応可能な先生への再マッチングを検討してください。`);
  }

  return { total, unanswered, answered, bySubject, byTopic, byHour, insights };
}
