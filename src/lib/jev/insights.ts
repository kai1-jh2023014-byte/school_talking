import type { CachedSchoolInsight, ConfidenceBand, SchoolAnalysis, SuggestedAction } from "../types";
import { emptyInsight, snapshotForJev, type SchoolSnapshot, type TopicSnapshot } from "../insights";
import {
  HttpJevClient,
  readApiKey,
  type JevChoiceAnswer,
  type JevClient,
  type JevNoulAnswer,
  type JevQuestion,
  type SystemOneResult,
} from "./client";
import { resolveModel } from "./classifier";
import { logJev } from "./log";

const NONE = "none";

function asChoice(answer: SystemOneResult["answers"][string] | undefined): JevChoiceAnswer | null {
  return answer?.type === "choice" ? answer : null;
}

function asNoul(answer: SystemOneResult["answers"][string] | undefined): JevNoulAnswer | null {
  return answer?.type === "noul" ? answer : null;
}

function bandFromConfidence(value: number): ConfidenceBand {
  if (value >= 0.75) return "high";
  if (value >= 0.5) return "mid";
  return "low";
}

export function topicCriteria(snapshot: SchoolSnapshot): Record<string, string | null> {
  const criteria: Record<string, string | null> = {
    [NONE]: "No single field deserves extra attention from this summary",
  };
  for (const topic of snapshot.topics.slice(0, 8)) {
    criteria[topic.key] =
      `${topic.subject} / ${topic.topic}. Recent ${topic.recentCount}, previous ${topic.previousCount}.`;
  }
  return criteria;
}

export function buildInsightQuestions(snapshot: SchoolSnapshot): Record<string, JevQuestion> {
  const topics = topicCriteria(snapshot);
  return {
    enough_data: {
      type: "noul",
      instructions:
        "Is this school-wide summary large enough to discuss a pattern? Do not judge teaching quality.",
      criteria: {
        true: "There is enough volume to name a possible attention area",
        false: "Too little data to suggest school-wide attention",
      },
    },
    focus_topic: {
      type: "choice",
      instructions:
        "Which subject/topic is the strongest attention candidate from counts and change only? Do not blame teachers or students.",
      criteria: topics,
    },
    second_topic: {
      type: "choice",
      instructions: "Optional second attention candidate. Choose none if only one area stands out.",
      criteria: topics,
    },
    pattern: {
      type: "choice",
      instructions: "What kind of pattern is visible in the counts? Facts only.",
      criteria: {
        increase: "Recent counts are clearly higher than the previous window",
        concentration: "Questions concentrate in one cluster inside a topic",
        mixed: "Both increase and concentration appear",
        none: "No clear pattern",
      },
    },
    action: {
      type: "choice",
      instructions:
        "Which follow-up is reasonable for humans to consider? Do not say a class failed. Do not invent tools that do not exist.",
      criteria: {
        share: "Share the cluster with teachers who already match that subject",
        queue: "Review the existing question list for that topic",
        materials: "Consider extra explanation materials for the concentrated cluster",
        prompt: "A teacher question or understanding check to the class is worth considering",
        test: "The field is a candidate to consider for a future quiz, not a required item",
        review: "In-class follow-up is worth considering",
        wait: "Wait until more questions accumulate",
      },
    },
  };
}

export function reasonsForTopic(topic: TopicSnapshot, pattern: string): string[] {
  const reasons: string[] = [];
  if (topic.growth.label) reasons.push(topic.growth.label);
  else if (topic.recentCount > topic.previousCount) reasons.push("質問数が増えています");
  const top = topic.clusters[0];
  if (top && top.name !== "その他" && top.count >= 2 && (pattern === "concentration" || pattern === "mixed")) {
    reasons.push(`${top.name}に質問が集まっています（${top.count}件）`);
  }
  if (topic.checkAnxious > 0) reasons.push(`理解チェックで不安の回答が${topic.checkAnxious}件あります`);
  if (topic.promptAnswers > 0) reasons.push(`先生からの問いに${topic.promptAnswers}件の回答があります`);
  if (reasons.length === 0) reasons.push(`直近${topic.recentCount}件の質問があります`);
  return reasons;
}

export function actionCopy(kind: SuggestedAction["kind"], topic: TopicSnapshot): SuggestedAction {
  const cluster = topic.clusters.find((item) => item.name !== "その他") ?? topic.clusters[0];
  if (kind === "share") {
    return {
      target: topic.topic,
      kind,
      action: "担当できる先生への共有を検討する",
      reason: `既存のマッチングで、${topic.subject}を見られる先生に状況を渡せます`,
    };
  }
  if (kind === "queue") {
    return {
      target: topic.topic,
      kind,
      action: "この分野の質問一覧を確認する",
      reason: `質問が${topic.count}件あります`,
    };
  }
  if (kind === "materials") {
    return {
      target: topic.topic,
      kind,
      action: cluster ? `${cluster.name}の補足説明を検討する` : "補足説明を検討する",
      reason: cluster ? `関連する質問が${cluster.count}件あります` : `質問が${topic.count}件あります`,
    };
  }
  if (kind === "prompt" || kind === "check") {
    return {
      target: topic.topic,
      kind: "prompt",
      action: "クラスへ問いまたは理解チェックを送ることを検討する",
      reason: "質問しない生徒の状態も、確認として集められます",
    };
  }
  if (kind === "test") {
    return {
      target: topic.topic,
      kind,
      action: "次回の確認問題・テストの出題検討候補にする",
      reason: "入れるかどうかは先生が決めます",
    };
  }
  if (kind === "review") {
    return {
      target: topic.topic,
      kind,
      action: "授業内での追加確認を検討する",
      reason: "確認候補として残します。全員が苦手だとは限りません",
    };
  }
  return {
    target: topic.topic,
    kind: "wait",
    action: "もう少し質問が集まるまで様子を見る",
    reason: "今の件数だけでは学校全体の判断材料が少ないです",
  };
}

export function readSchoolAnalysis(result: SystemOneResult, snapshot: SchoolSnapshot): SchoolAnalysis | null {
  const enough = asNoul(result.answers.enough_data);
  const focus = asChoice(result.answers.focus_topic);
  const second = asChoice(result.answers.second_topic);
  const pattern = asChoice(result.answers.pattern);
  const action = asChoice(result.answers.action);
  if (!enough || !focus || !second || !pattern || !action) return null;
  if (enough.noul < 0 || enough.noul > 1) return null;

  const allowed = new Set([...Object.keys(topicCriteria(snapshot))]);
  if (!allowed.has(focus.choice) || !allowed.has(second.choice)) return null;
  if (!["increase", "concentration", "mixed", "none"].includes(pattern.choice)) return null;
  if (!["share", "queue", "materials", "wait", "prompt", "test", "review"].includes(action.choice)) return null;

  if (enough.noul < 0.5 || focus.choice === NONE || pattern.choice === "none") {
    return {
      summary: "今の集計だけでは、学校全体として注目する領域をはっきり言えません。",
      attentionAreas: [],
      suggestedActions: [
        {
          target: "学校全体",
          kind: "wait",
          action: "質問がもう少し蓄積されるのを待つ",
          reason: "件数が少ないか、偏りがはっきりしていません",
        },
      ],
      model: result.model,
      source: "jev",
    };
  }

  const topics = [focus.choice, second.choice === focus.choice ? NONE : second.choice]
    .filter((key) => key !== NONE)
    .map((key) => snapshot.topics.find((topic) => topic.key === key))
    .filter((topic): topic is TopicSnapshot => Boolean(topic));

  if (topics.length === 0) return null;

  const attentionAreas = topics.map((topic) => ({
    subject: topic.subject,
    topic: topic.topic,
    reasons: reasonsForTopic(topic, pattern.choice),
    confidence: bandFromConfidence(focus.confidence),
  }));

  const primary = topics[0];
  const summaryParts = [`直近の集計では「${primary.subject} / ${primary.topic}」が目に入ります。`];
  if (pattern.choice === "increase" || pattern.choice === "mixed") {
    summaryParts.push("質問数が前の期間より増えています。");
  }
  if (pattern.choice === "concentration" || pattern.choice === "mixed") {
    const cluster = primary.clusters.find((item) => item.name !== "その他");
    if (cluster) summaryParts.push(`とくに「${cluster.name}」へ質問が集まっています。`);
  }

  return {
    summary: summaryParts.join(""),
    attentionAreas,
    suggestedActions: [actionCopy(action.choice as SuggestedAction["kind"], primary)],
    model: result.model,
    source: "jev",
  };
}

export async function analyzeSchoolSnapshot(input: {
  snapshot: SchoolSnapshot;
  client?: JevClient;
  env?: import("./client").EnvMap;
}): Promise<CachedSchoolInsight> {
  const { snapshot } = input;
  if (!snapshot.enoughData) {
    return emptyInsight(
      snapshot.fingerprint,
      "sparse",
      "現在は十分な質問データがありません。もう少し質問が蓄積されると、学校全体の傾向を分析できます。",
    );
  }

  const env = input.env ?? process.env;
  const client = input.client ?? new HttpJevClient({ env });
  if (!readApiKey(env)) {
    logJev("skip", { reason: "missing_api_key" });
    return emptyInsight(
      snapshot.fingerprint,
      "unavailable",
      "現在AI分析を取得できません。集計データのみ表示しています。",
      "missing_api_key",
    );
  }

  const started = Date.now();
  logJev("start", { chars: JSON.stringify(snapshotForJev(snapshot)).length });

  try {
    const model = await resolveModel(client, env);
    if (!model) {
      logJev("fallback", { reason: "no_model", latencyMs: Date.now() - started });
      return emptyInsight(snapshot.fingerprint, "error", "現在AI分析を取得できません。集計データのみ表示しています。", "no_model");
    }

    const response = await client.systemOne({
      model,
      state: {
        task: "Judge school-wide confirmation candidates from aggregated counts. Do not label weaknesses. Do not blame teachers.",
        stats: snapshotForJev(snapshot),
      },
      questions: buildInsightQuestions(snapshot),
    });

    if (!response.ok) {
      logJev("fallback", { reason: response.error, latencyMs: Date.now() - started });
      return emptyInsight(
        snapshot.fingerprint,
        "error",
        "現在AI分析を取得できません。集計データのみ表示しています。",
        response.error,
      );
    }

    const analysis = readSchoolAnalysis(response.value, snapshot);
    if (!analysis) {
      logJev("fallback", { reason: "invalid_response", latencyMs: Date.now() - started, model: response.value.model });
      return emptyInsight(
        snapshot.fingerprint,
        "error",
        "現在AI分析を取得できません。集計データのみ表示しています。",
        "invalid_response",
      );
    }

    logJev("success", { latencyMs: Date.now() - started, model: analysis.model });
    return {
      fingerprint: snapshot.fingerprint,
      analyzedAt: new Date().toISOString(),
      status: "ok",
      analysis,
    };
  } catch {
    logJev("fallback", { reason: "network", latencyMs: Date.now() - started });
    return emptyInsight(snapshot.fingerprint, "error", "現在AI分析を取得できません。集計データのみ表示しています。", "network");
  }
}
