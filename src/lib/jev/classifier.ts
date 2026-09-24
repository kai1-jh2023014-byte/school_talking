import { QUESTION_TYPES, SUBJECTS } from "../constants";
import { deptForSubject, makeSummary, SUBJECT_RULES, topicsForSubject } from "../classify";
import type { Classification, ConfidenceBand, QuestionType, Urgency } from "../types";
import {
  HttpJevClient,
  readApiKey,
  type JevChoiceAnswer,
  type JevClient,
  type JevNoulAnswer,
  type JevQuestion,
  type SystemOneResult,
} from "./client";
import {
  IN_CATALOG_NOUL_ACCEPT,
  SUBJECT_CONFIDENCE_FLOOR,
  SUBJECT_CONFIDENCE_HIGH,
  SUBJECT_PROBABILITY_CLEAR,
  TOPIC_CONFIDENCE_ACCEPT,
  TYPESAFE_DEFAULT_MODEL_ENV,
  URGENCY_CONFIDENCE_ACCEPT,
} from "./config";
import { logJev } from "./log";

const OTHER_SUBJECT = "その他";
const GENERAL_TOPIC = "一般";
const URGENCY_OPTIONS = ["low", "normal", "high"] as const;

export type JevJudgement = {
  subject: string;
  subjectConfidence: number;
  subjectProbability: number;
  topic: string;
  topicConfidence: number;
  urgency: Urgency;
  urgencyConfidence: number;
  questionType: QuestionType;
  questionTypeConfidence: number;
  inCatalog: number;
  model: string;
};

export function buildSubjectCriteria(): Record<string, string | null> {
  return {
    数学: "数学。関数、確率、図形、微分積分など",
    英語: "英語。文法、長文、英作文など",
    国語: "国語。現代文、古文、漢文など",
    理科: "理科。物理、化学、生物、地学",
    社会: "社会。歴史、地理、公民",
    情報: "情報。プログラミングやネットワーク",
    [OTHER_SUBJECT]: "教科に当てはまらない相談や学校生活",
  };
}

export function buildTopicCriteria(): Record<string, string | null> {
  const criteria: Record<string, string | null> = {
    [GENERAL_TOPIC]: "分野が特定できないとき",
  };
  for (const rule of SUBJECT_RULES) {
    for (const topic of rule.topics) {
      criteria[topic.name] = `${rule.name}の${topic.name}`;
    }
  }
  return criteria;
}

export function topicBelongsTo(subject: string, topic: string): boolean {
  if (topic === GENERAL_TOPIC) return true;
  return topicsForSubject(subject).includes(topic);
}

export function buildClassifyQuestions(): Record<string, JevQuestion> {
  return {
    subject: {
      type: "choice",
      instructions:
        "Which high-school subject is this student question about? Classify only. Do not solve the problem or write an answer.",
      criteria: buildSubjectCriteria(),
    },
    topic: {
      type: "choice",
      instructions:
        "Which topic best matches the student question? If none of the listed topics fit, choose 一般.",
      criteria: buildTopicCriteria(),
    },
    urgency: {
      type: "choice",
      instructions: "How urgently does the student need a teacher? Use the existing school scale.",
      criteria: {
        low: "予習や興味など、急がない",
        normal: "通常の授業の質問。期限の指定なし",
        high: "今日明日のテスト・提出・授業中など、急いでいる",
      },
    },
    questionType: {
      type: "choice",
      instructions: "What kind of help is the student asking for?",
      criteria: {
        解法: "How to solve it",
        概念: "Why / meaning / difference",
        計算: "Calculation check",
        確認: "Is this correct?",
        その他: "Other",
      },
    },
    in_catalog: {
      type: "noul",
      instructions: "Does this question clearly belong to one of the school subjects in the catalog?",
      criteria: {
        true: "It is a class subject question",
        false: "It is general school life or too vague to place",
      },
    },
  };
}

function asChoice(answer: SystemOneResult["answers"][string] | undefined): JevChoiceAnswer | null {
  return answer?.type === "choice" ? answer : null;
}

function asNoul(answer: SystemOneResult["answers"][string] | undefined): JevNoulAnswer | null {
  return answer?.type === "noul" ? answer : null;
}

export function readJudgement(result: SystemOneResult): JevJudgement | null {
  const subject = asChoice(result.answers.subject);
  const topic = asChoice(result.answers.topic);
  const urgency = asChoice(result.answers.urgency);
  const questionType = asChoice(result.answers.questionType);
  const inCatalog = asNoul(result.answers.in_catalog);
  if (!subject || !topic || !urgency || !questionType || !inCatalog) return null;

  const allowedSubjects = [...SUBJECTS, OTHER_SUBJECT];
  if (!allowedSubjects.includes(subject.choice as (typeof SUBJECTS)[number])) return null;
  if (typeof subject.confidence !== "number" || subject.confidence < 0 || subject.confidence > 1) {
    return null;
  }
  const topicKeys = Object.keys(buildTopicCriteria());
  if (!topicKeys.includes(topic.choice)) return null;
  if (!(URGENCY_OPTIONS as readonly string[]).includes(urgency.choice)) return null;
  if (!(QUESTION_TYPES as readonly string[]).includes(questionType.choice)) return null;
  if (inCatalog.noul < 0 || inCatalog.noul > 1) return null;

  return {
    subject: subject.choice,
    subjectConfidence: subject.confidence,
    subjectProbability: subject.probabilities[subject.choice] ?? 0,
    topic: topic.choice,
    topicConfidence: topic.confidence,
    urgency: urgency.choice as Urgency,
    urgencyConfidence: urgency.confidence,
    questionType: questionType.choice as QuestionType,
    questionTypeConfidence: questionType.confidence,
    inCatalog: inCatalog.noul,
    model: result.model,
  };
}

export function confidenceBand(judgement: JevJudgement): ConfidenceBand {
  if (
    judgement.subjectConfidence >= SUBJECT_CONFIDENCE_HIGH &&
    judgement.subjectProbability >= SUBJECT_PROBABILITY_CLEAR &&
    judgement.inCatalog >= IN_CATALOG_NOUL_ACCEPT
  ) {
    return "high";
  }
  if (judgement.subjectConfidence >= SUBJECT_CONFIDENCE_FLOOR && judgement.subjectProbability >= 0.35) {
    return "mid";
  }
  return "low";
}

export function mergeJudgement(
  judgement: JevJudgement,
  rules: Classification,
  subjectHint: string | undefined,
  band: ConfidenceBand,
  body = rules.summary,
): Classification {
  let subject = judgement.subject;
  let topic = judgement.topic;

  if (subjectHint && (SUBJECTS as readonly string[]).includes(subjectHint)) {
    subject = subjectHint;
    if (!topicBelongsTo(subject, topic) || judgement.topicConfidence < TOPIC_CONFIDENCE_ACCEPT) {
      topic = rules.subject === subject ? rules.topic : GENERAL_TOPIC;
    }
  } else if (band === "mid" && rules.subject !== OTHER_SUBJECT && rules.subject !== judgement.subject) {
    subject = rules.subject;
    topic =
      topicBelongsTo(subject, judgement.topic) && judgement.topicConfidence >= TOPIC_CONFIDENCE_ACCEPT
        ? judgement.topic
        : rules.topic;
  } else if (!topicBelongsTo(subject, topic) || judgement.topicConfidence < TOPIC_CONFIDENCE_ACCEPT) {
    topic = rules.subject === subject ? rules.topic : GENERAL_TOPIC;
  }

  const urgency =
    judgement.urgencyConfidence >= URGENCY_CONFIDENCE_ACCEPT ? judgement.urgency : rules.urgency;
  const questionType =
    judgement.questionTypeConfidence >= TOPIC_CONFIDENCE_ACCEPT
      ? judgement.questionType
      : rules.questionType;

  const confidence = Math.min(judgement.subjectConfidence, judgement.topicConfidence);
  const reasons = [
    band === "high"
      ? `Jevの科目確信度は${judgement.subjectConfidence.toFixed(2)}で、自動整理しました。`
      : `Jevの科目確信度は${judgement.subjectConfidence.toFixed(2)}です。校内ルールと照らして整理しました。`,
    `科目は「${subject}」、分野は「${topic}」です。`,
    urgency !== rules.urgency
      ? `緊急度はJevの判断（${urgency}）を使いました。`
      : `緊急度は${urgency}です。`,
    "AIは答えを出しません。対応できる先生へつなぐために使っています。",
  ];

  return {
    subject,
    topic,
    summary: makeSummary(body, subject, topic),
    urgency,
    recommendedDept: deptForSubject(subject),
    questionType,
    reasons,
    source: "jev",
    confidence,
    confidenceBand: band,
    classifyModel: judgement.model,
  };
}

let resolvedModel: string | null | undefined;

export async function resolveModel(client: JevClient, env: import("./client").EnvMap = process.env): Promise<string | null> {
  const configured = env[TYPESAFE_DEFAULT_MODEL_ENV]?.trim();
  if (configured) return configured;
  if (resolvedModel !== undefined) return resolvedModel;

  const listed = await client.listModels();
  if (!listed.ok) {
    resolvedModel = null;
    return null;
  }
  const names = listed.value.map((item) => item.name);
  resolvedModel = names.includes("jev-latest") ? "jev-latest" : names[0] ?? null;
  return resolvedModel;
}

export function resetResolvedModel(): void {
  resolvedModel = undefined;
}

export async function classifyWithJev(input: {
  body: string;
  subjectHint?: string;
  rules: Classification;
  client?: JevClient;
  env?: import("./client").EnvMap;
}): Promise<Classification | null> {
  const env = input.env ?? process.env;
  const client = input.client ?? new HttpJevClient({ env });
  if (!readApiKey(env)) {
    logJev("skip", { reason: "missing_api_key" });
    return null;
  }

  const started = Date.now();
  logJev("start", { chars: input.body.trim().length, hasHint: Boolean(input.subjectHint) });

  try {
    const model = await resolveModel(client, env);
    if (!model) {
      logJev("fallback", { reason: "no_model", latencyMs: Date.now() - started });
      return null;
    }

    const response = await client.systemOne({
      model,
      state: {
        task: "Classify a Japanese high-school student question. Do not solve it.",
        subject_hint: input.subjectHint ?? null,
        question: input.body,
      },
      questions: buildClassifyQuestions(),
    });

    if (!response.ok) {
      logJev("fallback", { reason: response.error, latencyMs: Date.now() - started });
      return null;
    }

    const judgement = readJudgement(response.value);
    if (!judgement) {
      logJev("fallback", { reason: "invalid_response", latencyMs: Date.now() - started, model: response.value.model });
      return null;
    }

    const band = confidenceBand(judgement);
    if (band === "low") {
      logJev("fallback", {
        reason: "low_confidence",
        latencyMs: Date.now() - started,
        model: judgement.model,
        subject: judgement.subject,
        topic: judgement.topic,
        confidence: judgement.subjectConfidence,
        band,
      });
      return null;
    }

    const merged = mergeJudgement(judgement, input.rules, input.subjectHint, band, input.body);
    logJev("success", {
      latencyMs: Date.now() - started,
      model: judgement.model,
      subject: merged.subject,
      topic: merged.topic,
      confidence: merged.confidence,
      band,
    });
    return merged;
  } catch {
    logJev("fallback", { reason: "network", latencyMs: Date.now() - started });
    return null;
  }
}
