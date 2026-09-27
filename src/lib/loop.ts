import {
  audienceStudents,
  followUpsOf,
  isAnxiousResponse,
  isAudienceMember,
  promptsOf,
  responsesOf,
  teacherHomerooms,
} from "./prompts";
import type { FollowUpMark, FollowUpStatus, Prompt, PromptResponse, StoreData, User } from "./types";

export type LoopPhase =
  | "new_question"
  | "awaiting_answers"
  | "confirming"
  | "recheck_waiting"
  | "rechecked"
  | "confirm_candidate";

export const LOOP_LABEL: Record<LoopPhase, string> = {
  new_question: "新しい問い",
  awaiting_answers: "回答待ち",
  confirming: "確認中",
  recheck_waiting: "再確認待ち",
  rechecked: "再確認済み",
  confirm_candidate: "追加確認候補",
};

export type OptionTally = { id: string; label: string; count: number; anxious?: boolean };

export type ChainEvent = {
  at: string;
  kind: "question" | "prompt" | "response" | "followup" | "recheck";
  title: string;
  detail?: string;
};

export function followUpStatus(mark: FollowUpMark): FollowUpStatus {
  return mark.status ?? "planned";
}

export function tallyPrompt(prompt: Prompt, responses: PromptResponse[]): OptionTally[] {
  return prompt.options.map((option) => ({
    id: option.id,
    label: option.label,
    count: responses.filter((item) => item.optionId === option.id).length,
    anxious: option.anxious,
  }));
}

export function checksForTopic(store: StoreData, subject: string, topic: string, homeroom?: string): Prompt[] {
  return promptsOf(store)
    .filter((prompt) => {
      if (prompt.kind !== "understanding_check") return false;
      if (prompt.subject !== subject || prompt.topic !== topic) return false;
      if (!homeroom) return true;
      const audience = prompt.audience;
      return audience.type === "class" && audience.homeroom === homeroom;
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function beforeAfterChecks(store: StoreData, subject: string, topic: string, homeroom?: string) {
  const checks = checksForTopic(store, subject, topic, homeroom);
  const initial = checks.find((prompt) => (prompt.purpose ?? "initial") !== "recheck") ?? checks[0];
  const recheck = [...checks].reverse().find((prompt) => prompt.purpose === "recheck" || Boolean(prompt.parentPromptId));
  if (!initial) return { before: null as OptionTally[] | null, after: null as OptionTally[] | null, recheckCount: 0 };
  const before = tallyPrompt(
    initial,
    responsesOf(store).filter((item) => item.promptId === initial.id),
  );
  const after =
    recheck && recheck.id !== initial.id
      ? tallyPrompt(
          recheck,
          responsesOf(store).filter((item) => item.promptId === recheck.id),
        )
      : null;
  return { before, after, recheckCount: checks.filter((prompt) => prompt.purpose === "recheck" || prompt.parentPromptId).length };
}

export function topicFollowUps(store: StoreData, subject: string, topic: string, homeroom?: string): FollowUpMark[] {
  return followUpsOf(store).filter((item) => {
    if (item.subject !== subject || item.topic !== topic) return false;
    if (homeroom && item.homeroom && item.homeroom !== homeroom) return false;
    return true;
  });
}

export function topicLoopPhase(
  store: StoreData,
  subject: string,
  topic: string,
  options?: { homeroom?: string; questionCount?: number; checkAnxious?: number },
): LoopPhase {
  const prompts = promptsOf(store).filter((prompt) => {
    if (prompt.subject !== subject || prompt.topic !== topic) return false;
    if (!options?.homeroom) return true;
    const audience = prompt.audience;
    return audience.type !== "class" || audience.homeroom === options.homeroom;
  });
  const followUps = topicFollowUps(store, subject, topic, options?.homeroom);
  const rechecks = prompts.filter((prompt) => prompt.purpose === "recheck" || prompt.parentPromptId);
  const review = followUps.find((item) => item.kind === "class_review" && followUpStatus(item) === "planned");
  const openRecheck = rechecks.find((prompt) => prompt.status === "open");
  if (openRecheck) {
    const answered = responsesOf(store).some((item) => item.promptId === openRecheck.id);
    const audience = audienceStudents(store, openRecheck.audience);
    const pending = audience.some(
      (student) => !responsesOf(store).some((item) => item.promptId === openRecheck.id && item.studentId === student.id),
    );
    if (answered && !pending) return "rechecked";
    return "recheck_waiting";
  }
  if (rechecks.some((prompt) => responsesOf(store).some((item) => item.promptId === prompt.id))) return "rechecked";
  if (review) return "confirming";
  const open = prompts.filter((prompt) => prompt.status === "open");
  const waiting = open.some((prompt) =>
    audienceStudents(store, prompt.audience).some(
      (student) => !responsesOf(store).some((item) => item.promptId === prompt.id && item.studentId === student.id),
    ),
  );
  if (waiting) return "awaiting_answers";
  if ((options?.questionCount ?? 0) >= 2 || (options?.checkAnxious ?? 0) >= 2) return "confirm_candidate";
  if ((options?.questionCount ?? 0) > 0 || prompts.length > 0) return "new_question";
  return "confirm_candidate";
}

export function buildTopicChain(
  store: StoreData,
  subject: string,
  topic: string,
  student?: User,
): ChainEvent[] {
  const events: ChainEvent[] = [];
  for (const question of store.questions.filter((item) => item.subject === subject && item.topic === topic)) {
    if (student && question.studentId !== student.id) continue;
    events.push({
      at: question.createdAt,
      kind: "question",
      title: student ? question.summary : `質問 ${question.summary}`,
      detail: student ? question.body : undefined,
    });
  }
  for (const prompt of promptsOf(store).filter((item) => item.subject === subject && item.topic === topic)) {
    if (student && !isAudienceMember(student, prompt)) continue;
    const isRecheck = prompt.purpose === "recheck" || Boolean(prompt.parentPromptId);
    events.push({
      at: prompt.createdAt,
      kind: isRecheck ? "recheck" : "prompt",
      title: isRecheck ? "再確認" : prompt.kind === "understanding_check" ? "理解チェック" : "先生からの問い",
      detail: prompt.body,
    });
    for (const response of responsesOf(store).filter((item) => item.promptId === prompt.id)) {
      if (student && response.studentId !== student.id) continue;
      const option = prompt.options.find((item) => item.id === response.optionId);
      events.push({
        at: response.createdAt,
        kind: "response",
        title: student ? "自分の回答" : "回答",
        detail: [option?.label, response.freeText].filter(Boolean).join(" / "),
      });
    }
  }
  for (const mark of topicFollowUps(store, subject, topic, student?.homeroom)) {
    events.push({
      at: mark.createdAt,
      kind: "followup",
      title:
        mark.kind === "class_review" ? "授業で確認" : mark.kind === "test_candidate" ? "出題検討" : "今回は見送り",
      detail: followUpStatus(mark) === "completed" ? "完了" : followUpStatus(mark) === "cancelled" ? "取消" : "予定",
    });
  }
  return events.sort((a, b) => a.at.localeCompare(b.at) || a.title.localeCompare(b.title, "ja"));
}

export function visibleFollowUps(store: StoreData, user: User): FollowUpMark[] {
  const all = followUpsOf(store);
  if (user.role === "admin") return all;
  if (user.role !== "teacher") return [];
  const rooms = teacherHomerooms(user, store);
  return all.filter((item) => item.actorId === user.id || (item.homeroom && rooms.includes(item.homeroom)));
}

export function anxiousCount(prompt: Prompt, responses: PromptResponse[]): number {
  return responses.filter((item) => isAnxiousResponse(prompt, item)).length;
}

export type EnrichedClassTopic = {
  loopPhase: LoopPhase;
  loopLabel: string;
  recheckCount: number;
  before: OptionTally[] | null;
  after: OptionTally[] | null;
  followUpKinds: FollowUpMark["kind"][];
  chain: ChainEvent[];
};

export function enrichClassTopic(
  store: StoreData,
  homeroom: string,
  topic: { subject: string; topic: string; questionCount: number; checkAnxious: number },
): EnrichedClassTopic {
  const { before, after, recheckCount } = beforeAfterChecks(store, topic.subject, topic.topic, homeroom);
  const loopPhase = topicLoopPhase(store, topic.subject, topic.topic, {
    homeroom,
    questionCount: topic.questionCount,
    checkAnxious: topic.checkAnxious,
  });
  return {
    loopPhase,
    loopLabel: LOOP_LABEL[loopPhase],
    recheckCount,
    before,
    after,
    followUpKinds: topicFollowUps(store, topic.subject, topic.topic, homeroom).map((item) => item.kind),
    chain: buildTopicChain(store, topic.subject, topic.topic),
  };
}
