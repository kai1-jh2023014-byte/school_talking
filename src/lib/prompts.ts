import type {
  FollowUpMark,
  Prompt,
  PromptAudience,
  PromptKind,
  PromptOption,
  PromptResponse,
  StoreData,
  User,
} from "./types";

export const CHECK_OPTIONS: PromptOption[] = [
  { id: "lost", label: "よく分からない", anxious: true },
  { id: "uneasy", label: "少し不安", anxious: true },
  { id: "ok", label: "だいたい理解" },
  { id: "sure", label: "かなり理解" },
];

export function promptsOf(store: StoreData): Prompt[] {
  return store.prompts ?? [];
}

export function responsesOf(store: StoreData): PromptResponse[] {
  return store.promptResponses ?? [];
}

export function followUpsOf(store: StoreData): FollowUpMark[] {
  return store.followUps ?? [];
}

export function audienceStudents(store: StoreData, audience: PromptAudience): User[] {
  const students = store.users.filter((user) => user.role === "student" && user.status !== "disabled");
  if (audience.type === "class") {
    return students.filter((user) => user.homeroom === audience.homeroom);
  }
  if (audience.type === "grade") {
    return students.filter((user) => user.grade === audience.grade);
  }
  return students.filter((user) => audience.studentIds.includes(user.id));
}

export function canAuthorPrompts(user: User): boolean {
  return user.role === "teacher" || user.role === "admin";
}

export function teacherHomerooms(user: User, store: StoreData): string[] {
  if (user.homerooms?.length) return user.homerooms;
  if (user.role === "admin") {
    return Array.from(new Set(store.users.map((item) => item.homeroom).filter((item): item is string => Boolean(item))));
  }
  const subjects = user.subjects ?? [];
  const studentIds = new Set(
    store.questions.filter((question) => subjects.includes(question.subject)).map((question) => question.studentId),
  );
  return Array.from(
    new Set(
      store.users
        .filter((item) => studentIds.has(item.id) && item.homeroom)
        .map((item) => item.homeroom as string),
    ),
  );
}

export function canViewClass(user: User, homeroom: string, store: StoreData): boolean {
  if (user.role === "admin") return true;
  if (user.role !== "teacher") return false;
  return teacherHomerooms(user, store).includes(homeroom);
}

export function isAudienceMember(student: User, prompt: Prompt): boolean {
  const audience = prompt.audience;
  if (audience.type === "class") return student.homeroom === audience.homeroom;
  if (audience.type === "grade") return student.grade === audience.grade;
  return audience.studentIds.includes(student.id);
}

export function pendingPromptsFor(store: StoreData, student: User): Prompt[] {
  const answered = new Set(
    responsesOf(store)
      .filter((item) => item.studentId === student.id)
      .map((item) => item.promptId),
  );
  return promptsOf(store).filter(
    (prompt) => prompt.status === "open" && isAudienceMember(student, prompt) && !answered.has(prompt.id),
  );
}

export function isAnxiousResponse(prompt: Prompt, response: PromptResponse): boolean {
  if (!response.optionId) return false;
  return Boolean(prompt.options.find((option) => option.id === response.optionId)?.anxious);
}

export function createPrompt(input: {
  id: string;
  teacherId: string;
  kind: PromptKind;
  subject: string;
  topic: string;
  body: string;
  options?: PromptOption[];
  allowFreeText?: boolean;
  audience: PromptAudience;
}): Prompt {
  const options =
    input.options && input.options.length > 0
      ? input.options
      : input.kind === "understanding_check"
        ? CHECK_OPTIONS
        : [];
  return {
    id: input.id,
    kind: input.kind,
    teacherId: input.teacherId,
    subject: input.subject,
    topic: input.topic,
    body: input.body.trim(),
    options,
    allowFreeText: input.allowFreeText ?? (options.length === 0),
    audience: input.audience,
    createdAt: new Date().toISOString(),
    status: "open",
  };
}

export type ReviewReason = { label: string; detail: string };

export type MyTopicState = {
  subject: string;
  topic: string;
  questionCount: number;
  anxiousChecks: number;
  promptAnswers: number;
  reasons: ReviewReason[];
  reviewCandidate: boolean;
};

export function buildMyUniverse(store: StoreData, student: User) {
  const mine = store.questions.filter((question) => question.studentId === student.id);
  const myResponses = responsesOf(store).filter((item) => item.studentId === student.id);
  const keys = new Set(mine.map((question) => `${question.subject}:::${question.topic}`));
  for (const response of myResponses) {
    const prompt = promptsOf(store).find((item) => item.id === response.promptId);
    if (prompt) keys.add(`${prompt.subject}:::${prompt.topic}`);
  }

  const topics: MyTopicState[] = Array.from(keys)
    .map((key) => {
      const [subject, topic] = key.split(":::");
      const questionCount = mine.filter((question) => question.subject === subject && question.topic === topic).length;
      const relatedPrompts = promptsOf(store).filter((prompt) => prompt.subject === subject && prompt.topic === topic);
      const relatedResponses = myResponses.filter((item) => relatedPrompts.some((prompt) => prompt.id === item.promptId));
      const anxiousChecks = relatedResponses.filter((item) => {
        const prompt = relatedPrompts.find((prompt) => prompt.id === item.promptId);
        return prompt?.kind === "understanding_check" && prompt && isAnxiousResponse(prompt, item);
      }).length;
      const promptAnswers = relatedResponses.filter((item) => {
        const prompt = relatedPrompts.find((prompt) => prompt.id === item.promptId);
        return prompt?.kind === "teacher_question";
      }).length;
      const reasons: ReviewReason[] = [];
      if (questionCount > 0) reasons.push({ label: "自分からの質問", detail: `${questionCount}件` });
      if (anxiousChecks > 0) reasons.push({ label: "理解チェック", detail: `「少し不安」または「よく分からない」を${anxiousChecks}回選んでいます` });
      if (promptAnswers > 0) reasons.push({ label: "先生からの問い", detail: `${promptAnswers}件に回答済み` });
      return {
        subject,
        topic,
        questionCount,
        anxiousChecks,
        promptAnswers,
        reasons,
        reviewCandidate: questionCount >= 2 || anxiousChecks >= 1,
      };
    })
    .sort((a, b) => Number(b.reviewCandidate) - Number(a.reviewCandidate) || b.questionCount - a.questionCount);

  return {
    studentName: student.name,
    topics,
    reviewCandidates: topics.filter((item) => item.reviewCandidate),
    disclaimer: "これはAIによる診断ではなく、いま確認できるデータからの復習候補です。",
  };
}

export type ClassTopicState = {
  subject: string;
  topic: string;
  questionCount: number;
  checkAnswers: number;
  checkAnxious: number;
  promptAnswers: number;
  promptAudience: number;
  confirmCandidate: boolean;
  reasons: string[];
};

export function buildClassUniverse(store: StoreData, homeroom: string) {
  const students = store.users.filter((user) => user.role === "student" && user.homeroom === homeroom);
  const ids = new Set(students.map((user) => user.id));
  const questions = store.questions.filter((question) => ids.has(question.studentId));
  const classPrompts = promptsOf(store).filter((prompt) => {
    const audience = prompt.audience;
    if (audience.type === "class") return audience.homeroom === homeroom;
    if (audience.type === "grade") return students.some((user) => user.grade === audience.grade);
    return audience.studentIds.some((id) => ids.has(id));
  });
  const keys = new Set([
    ...questions.map((question) => `${question.subject}:::${question.topic}`),
    ...classPrompts.map((prompt) => `${prompt.subject}:::${prompt.topic}`),
  ]);

  const topics: ClassTopicState[] = Array.from(keys)
    .map((key) => {
      const [subject, topic] = key.split(":::");
      const questionCount = questions.filter((question) => question.subject === subject && question.topic === topic).length;
      const prompts = classPrompts.filter((prompt) => prompt.subject === subject && prompt.topic === topic);
      const promptAudience = Math.max(
        0,
        ...prompts.map((prompt) => audienceStudents(store, prompt.audience).filter((user) => ids.has(user.id)).length),
      );
      const responses = responsesOf(store).filter((item) => prompts.some((prompt) => prompt.id === item.promptId) && ids.has(item.studentId));
      const checks = prompts.filter((prompt) => prompt.kind === "understanding_check");
      const checkResponses = responses.filter((item) => checks.some((prompt) => prompt.id === item.promptId));
      const checkAnxious = checkResponses.filter((item) => {
        const prompt = checks.find((prompt) => prompt.id === item.promptId);
        return prompt ? isAnxiousResponse(prompt, item) : false;
      }).length;
      const promptAnswers = responses.filter((item) =>
        prompts.some((prompt) => prompt.kind === "teacher_question" && prompt.id === item.promptId),
      ).length;
      const reasons: string[] = [];
      if (questionCount > 0) reasons.push(`生徒からの質問 ${questionCount}件`);
      if (checkAnxious > 0) reasons.push(`理解チェックで不安の回答 ${checkAnxious}件`);
      if (promptAnswers > 0) reasons.push(`先生からの問いに ${promptAnswers}件の回答`);
      const confirmCandidate = questionCount >= 2 || checkAnxious >= 2;
      return {
        subject,
        topic,
        questionCount,
        checkAnswers: checkResponses.length,
        checkAnxious,
        promptAnswers,
        promptAudience,
        confirmCandidate,
        reasons,
      };
    })
    .sort((a, b) => Number(b.confirmCandidate) - Number(a.confirmCandidate) || b.questionCount - a.questionCount);

  return {
    homeroom,
    studentCount: students.length,
    topics,
    confirmCandidates: topics.filter((item) => item.confirmCandidate),
    disclaimer: "質問が多いことは、全員が苦手だという意味ではありません。追加確認を検討できる領域です。",
  };
}
