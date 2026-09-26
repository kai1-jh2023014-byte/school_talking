export type Role = "student" | "teacher" | "admin";

export type AccountStatus = "active" | "disabled";

export type Availability = "available" | "soon" | "busy" | "off";

export type Urgency = "low" | "normal" | "high";

export type QuestionType = "解法" | "概念" | "計算" | "確認" | "その他";

export type ClassifySource = "rules" | "ai" | "jev" | "fallback";

export type ConfidenceBand = "high" | "mid" | "low";

export type QuestionStatus =
  | "submitted"
  | "classified"
  | "matched"
  | "accepted"
  | "deferred"
  | "answered"
  | "transferred"
  | "closed"
  | "cancelled"
  | "open"
  | "queued"
  | "assigned";

export type QuestionEventType =
  | "submitted"
  | "classified"
  | "matched"
  | "accepted"
  | "deferred"
  | "answered"
  | "transferred"
  | "closed"
  | "cancelled";

export type User = {
  id: string;
  loginId: string;
  passwordHash: string;
  name: string;
  role: Role;
  status: AccountStatus;
  createdAt: string;
  grade?: string;
  className?: string;
  homeroom?: string;
  homerooms?: string[];
  subjects?: string[];
  specialties?: string[];
  availability?: Availability;
  availableInMinutes?: number;
  note?: string;
};

export type TransferRecord = {
  fromTeacherId: string;
  toTeacherId: string;
  at: string;
  note: string;
};

export type QuestionEvent = {
  type: QuestionEventType;
  at: string;
  actorId?: string;
  message: string;
};

export type Classification = {
  subject: string;
  topic: string;
  summary: string;
  urgency: Urgency;
  recommendedDept: string;
  questionType: QuestionType;
  reasons: string[];
  source: ClassifySource;
  confidence?: number;
  confidenceBand?: ConfidenceBand;
  classifyModel?: string;
};

export type Question = {
  id: string;
  studentId: string;
  body: string;
  note?: string;
  imagePath?: string;
  createdAt: string;
  subject: string;
  topic: string;
  summary: string;
  urgency: Urgency;
  recommendedDept: string;
  questionType: QuestionType;
  classifyReasons: string[];
  classifySource?: ClassifySource;
  status: QuestionStatus;
  assignedTeacherId?: string | null;
  suggestedTeacherIds: string[];
  answer?: string;
  answeredAt?: string;
  answeredBy?: string;
  transferHistory: TransferRecord[];
  events: QuestionEvent[];
};

export type PublicUser = Omit<User, "passwordHash">;

export type SafeTeacher = Omit<User, "passwordHash" | "loginId">;

export type AttentionArea = {
  subject: string;
  topic: string;
  reasons: string[];
  confidence: ConfidenceBand;
};

export type SuggestedAction = {
  target: string;
  action: string;
  reason: string;
  kind: "materials" | "share" | "queue" | "wait" | "prompt" | "check" | "test" | "review";
};

export type PromptKind = "teacher_question" | "understanding_check";

export type PromptAudience =
  | { type: "class"; homeroom: string }
  | { type: "grade"; grade: string }
  | { type: "students"; studentIds: string[] };

export type PromptOption = { id: string; label: string; anxious?: boolean };

export type Prompt = {
  id: string;
  kind: PromptKind;
  teacherId: string;
  subject: string;
  topic: string;
  body: string;
  options: PromptOption[];
  allowFreeText: boolean;
  audience: PromptAudience;
  createdAt: string;
  status: "open" | "closed";
};

export type PromptResponse = {
  id: string;
  promptId: string;
  studentId: string;
  optionId?: string;
  freeText?: string;
  createdAt: string;
};

export type FollowUpMark = {
  id: string;
  subject: string;
  topic: string;
  kind: "class_review" | "test_candidate" | "dismissed";
  actorId: string;
  createdAt: string;
};

export type SchoolAnalysis = {
  summary: string;
  attentionAreas: AttentionArea[];
  suggestedActions: SuggestedAction[];
  model?: string;
  source: "jev" | "none";
};

export type CachedSchoolInsight = {
  fingerprint: string;
  analyzedAt: string;
  status: "ok" | "unavailable" | "sparse" | "error";
  message?: string;
  analysis: SchoolAnalysis | null;
  errorCode?: string;
};

export type StoreData = {
  version?: number;
  users: User[];
  questions: Question[];
  schoolInsight?: CachedSchoolInsight;
  prompts?: Prompt[];
  promptResponses?: PromptResponse[];
  followUps?: FollowUpMark[];
};

export type TeacherMatch = {
  teacher: SafeTeacher;
  score: number;
  reasons: string[];
  activeCount: number;
};

export type SessionPayload = {
  userId: string;
  role: Role;
};
