import { clusterQuestions } from "./universe";
import { LOOP_LABEL, topicLoopPhase, type LoopPhase } from "./loop";
import { followUpsOf, promptsOf, responsesOf } from "./prompts";
import type { FollowUpMark, Prompt, PromptResponse, Question, StoreData, User } from "./types";

export type LoopNodeKind = "question" | "teacher" | "prompt" | "response" | "followup" | "related" | "action";

export type LoopNode = {
  id: string;
  kind: LoopNodeKind;
  label: string;
  detail?: string;
  at?: string;
  refId?: string;
};

export type LoopEdge = {
  from: string;
  to: string;
  label: string;
};

export type LoopStep = {
  n: number;
  kind: LoopNodeKind;
  title: string;
  body: string;
  data?: string;
};

export type QuestionLoop = {
  questionId: string;
  subject: string;
  topic: string;
  cluster?: string;
  summary: string;
  body: string;
  relatedCount: number;
  relatedIds: string[];
  phase: LoopPhase;
  phaseLabel: string;
  nodes: LoopNode[];
  edges: LoopEdge[];
  steps: LoopStep[];
  answered: number;
  audience: number;
};

function clusterOf(store: StoreData, question: Question) {
  const peers = store.questions.filter((item) => item.subject === question.subject && item.topic === question.topic);
  const clusters = clusterQuestions(question.subject, question.topic, peers);
  return clusters.find((cluster) => cluster.samples.some((sample) => sample.id === question.id));
}

function relatedIds(store: StoreData, question: Question): string[] {
  const cluster = clusterOf(store, question);
  const sameTopic = store.questions.filter((item) => item.id !== question.id && item.subject === question.subject && item.topic === question.topic);
  const inCluster = new Set((cluster?.samples ?? []).map((sample) => sample.id));
  return [...sameTopic]
    .sort((a, b) => {
      const aHit = inCluster.has(a.id) ? 1 : 0;
      const bHit = inCluster.has(b.id) ? 1 : 0;
      if (aHit !== bHit) return bHit - aHit;
      return b.createdAt.localeCompare(a.createdAt);
    })
    .slice(0, 4)
    .map((item) => item.id);
}

function teacherOf(store: StoreData, question: Question): User | undefined {
  if (!question.assignedTeacherId) return undefined;
  return store.users.find((user) => user.id === question.assignedTeacherId);
}

function promptsForQuestion(store: StoreData, question: Question): Prompt[] {
  return promptsOf(store)
    .filter((prompt) => {
      if (prompt.sourceQuestionId === question.id) return true;
      return prompt.subject === question.subject && prompt.topic === question.topic;
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function followUpsForQuestion(store: StoreData, question: Question): FollowUpMark[] {
  return followUpsOf(store)
    .filter((item) => item.subject === question.subject && item.topic === question.topic)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function responseLabel(prompt: Prompt, response: PromptResponse): string {
  const option = prompt.options.find((item) => item.id === response.optionId);
  return [option?.label, response.freeText].filter(Boolean).join(" / ") || "回答";
}

export function buildQuestionLoop(store: StoreData, questionId: string): QuestionLoop | null {
  const question = store.questions.find((item) => item.id === questionId);
  if (!question) return null;

  const teacher = teacherOf(store, question);
  const prompts = promptsForQuestion(store, question);
  const followUps = followUpsForQuestion(store, question);
  const related = relatedIds(store, question);
  const cluster = clusterOf(store, question);
  const nodes: LoopNode[] = [];
  const edges: LoopEdge[] = [];
  const qNode = `question:${question.id}`;

  nodes.push({
    id: qNode,
    kind: "question",
    label: question.summary,
    detail: question.body,
    at: question.createdAt,
    refId: question.id,
  });

  if (teacher) {
    const tNode = `teacher:${teacher.id}:${question.id}`;
    nodes.push({
      id: tNode,
      kind: "teacher",
      label: teacher.name,
      detail: teacher.subjects?.join("・"),
      refId: teacher.id,
    });
    edges.push({ from: qNode, to: tNode, label: "担当" });
  }

  const promptNodes = new Map<string, string>();
  for (const prompt of prompts) {
    const pNode = `prompt:${prompt.id}`;
    promptNodes.set(prompt.id, pNode);
    const isRecheck = prompt.purpose === "recheck" || Boolean(prompt.parentPromptId);
    nodes.push({
      id: pNode,
      kind: "prompt",
      label: isRecheck ? "再確認" : prompt.kind === "understanding_check" ? "確認" : "先生の問い",
      detail: prompt.body,
      at: prompt.createdAt,
      refId: prompt.id,
    });
    if (prompt.parentPromptId && promptNodes.has(prompt.parentPromptId)) {
      edges.push({ from: promptNodes.get(prompt.parentPromptId) as string, to: pNode, label: "再確認" });
    } else if (prompt.sourceQuestionId === question.id || !prompt.parentPromptId) {
      edges.push({ from: qNode, to: pNode, label: isRecheck ? "再確認" : "確認" });
    }
    const replies = responsesOf(store).filter((item) => item.promptId === prompt.id);
    replies.slice(0, 3).forEach((response, index) => {
      const rNode = `response:${response.id}`;
      nodes.push({
        id: rNode,
        kind: "response",
        label: replies.length > 1 ? `回答 ${index + 1}` : "回答",
        detail: responseLabel(prompt, response),
        at: response.createdAt,
        refId: response.id,
      });
      edges.push({ from: pNode, to: rNode, label: "回答" });
    });
  }

  for (const mark of followUps) {
    const aNode = `action:${mark.id}`;
    nodes.push({
      id: aNode,
      kind: mark.kind === "class_review" || mark.kind === "test_candidate" ? "action" : "followup",
      label:
        mark.kind === "class_review" ? "授業で確認" : mark.kind === "test_candidate" ? "出題検討" : "今回は見送り",
      detail: mark.status === "completed" ? "完了" : mark.status === "cancelled" ? "取消" : "予定",
      at: mark.createdAt,
      refId: mark.id,
    });
    edges.push({ from: qNode, to: aNode, label: "対応" });
    if (mark.promptId && promptNodes.has(mark.promptId)) {
      edges.push({ from: promptNodes.get(mark.promptId) as string, to: aNode, label: "確認" });
    }
    if (mark.recheckPromptId && promptNodes.has(mark.recheckPromptId)) {
      edges.push({ from: aNode, to: promptNodes.get(mark.recheckPromptId) as string, label: "再確認" });
    }
  }

  related.forEach((id) => {
    const other = store.questions.find((item) => item.id === id);
    if (!other) return;
    const rNode = `related:${other.id}`;
    nodes.push({
      id: rNode,
      kind: "related",
      label: other.summary,
      detail: other.body,
      at: other.createdAt,
      refId: other.id,
    });
    edges.push({ from: qNode, to: rNode, label: "関連" });
  });

  const check = prompts.find((prompt) => prompt.kind === "understanding_check" && prompt.purpose !== "recheck") ?? prompts[0];
  const checkResponses = check ? responsesOf(store).filter((item) => item.promptId === check.id) : [];
  const classRoom = check?.audience.type === "class" ? check.audience.homeroom : undefined;
  const audience = classRoom
    ? store.users.filter((user) => user.role === "student" && user.homeroom === classRoom).length
    : checkResponses.length;

  const phase = topicLoopPhase(store, question.subject, question.topic, {
    questionCount: store.questions.filter((item) => item.subject === question.subject && item.topic === question.topic).length,
  });

  const steps: LoopStep[] = [];
  const pushStep = (kind: LoopNodeKind, title: string, body: string, data?: string) => {
    steps.push({ n: steps.length + 1, kind, title, body, data });
  };
  pushStep("question", "生徒の質問", question.body);
  if (teacher) pushStep("teacher", "先生につながった", teacher.name);
  prompts
    .filter((prompt) => prompt.purpose !== "recheck" && !prompt.parentPromptId)
    .forEach((prompt) => {
      const replies = responsesOf(store).filter((item) => item.promptId === prompt.id);
      pushStep(
        "prompt",
        prompt.kind === "understanding_check" ? "先生からの確認" : "先生からの問い",
        prompt.body,
        replies.length ? `回答済み ${replies.length}${audience ? ` / ${audience}` : ""}` : "回答待ち",
      );
    });
  followUps.forEach((mark) => {
    pushStep(
      "action",
      mark.kind === "class_review" ? "授業で確認" : mark.kind === "test_candidate" ? "出題検討" : "見送り",
      mark.status === "planned" ? "予定" : mark.status === "completed" ? "完了" : "取消",
    );
  });
  prompts
    .filter((prompt) => prompt.purpose === "recheck" || Boolean(prompt.parentPromptId))
    .forEach((prompt) => {
      const replies = responsesOf(store).filter((item) => item.promptId === prompt.id);
      pushStep("followup", "再確認", prompt.body, replies.length ? `回答 ${replies.length}件` : "未回答あり");
    });
  if (related.length) {
    pushStep("related", "この問いにつながる質問", `${related.length}件`, cluster ? cluster.name : undefined);
  }
  pushStep("action", "現在", LOOP_LABEL[phase]);

  return {
    questionId: question.id,
    subject: question.subject,
    topic: question.topic,
    cluster: cluster?.name,
    summary: question.summary,
    body: question.body,
    relatedCount: related.length,
    relatedIds: related,
    phase,
    phaseLabel: LOOP_LABEL[phase],
    nodes,
    edges,
    steps,
    answered: checkResponses.length,
    audience,
  };
}

export function buildUniverseLoops(store: StoreData, limit = 24): QuestionLoop[] {
  const ranked = [...store.questions].sort((a, b) => {
    const score = (question: Question) => {
      const prompts = promptsForQuestion(store, question).length;
      const related = relatedIds(store, question).length;
      const featured = question.id === "q-1" ? 20 : 0;
      return featured + prompts * 3 + related * 2;
    };
    return score(b) - score(a) || b.createdAt.localeCompare(a.createdAt);
  });
  const loops: QuestionLoop[] = [];
  for (const question of ranked) {
    const loop = buildQuestionLoop(store, question.id);
    if (!loop) continue;
    if (loop.nodes.length <= 1 && loop.relatedCount === 0) continue;
    loops.push(loop);
    if (loops.length >= limit) break;
  }
  if (!loops.some((item) => item.questionId === "q-1")) {
    const featured = buildQuestionLoop(store, "q-1");
    if (featured) loops.unshift(featured);
  }
  return loops;
}

export function relatedStarLinks(loops: QuestionLoop[]): { from: string; to: string }[] {
  const seen = new Set<string>();
  const links: { from: string; to: string }[] = [];
  for (const loop of loops) {
    for (const id of loop.relatedIds) {
      const key = [loop.questionId, id].sort().join(">");
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({ from: loop.questionId, to: id });
    }
  }
  return links;
}
