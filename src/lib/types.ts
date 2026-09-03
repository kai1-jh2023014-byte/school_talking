export type Role = "student" | "teacher" | "admin";

export type Availability = "available" | "soon" | "busy" | "off";

export type Urgency = "low" | "normal" | "high";

export type QuestionStatus =
  | "open"
  | "queued"
  | "assigned"
  | "answered"
  | "closed";

export type User = {
  id: string;
  loginId: string;
  passwordHash: string;
  name: string;
  role: Role;
  grade?: string;
  homeroom?: string;
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
  note?: string;
};

export type Classification = {
  subject: string;
  topic: string;
  summary: string;
  urgency: Urgency;
  recommendedDept: string;
  reasons: string[];
};

export type Question = {
  id: string;
  studentId: string;
  body: string;
  imagePath?: string;
  createdAt: string;
  subject: string;
  topic: string;
  summary: string;
  urgency: Urgency;
  recommendedDept: string;
  classifyReasons: string[];
  status: QuestionStatus;
  assignedTeacherId?: string | null;
  suggestedTeacherIds: string[];
  answer?: string;
  answeredAt?: string;
  answeredBy?: string;
  transferHistory: TransferRecord[];
};

export type PublicUser = Omit<User, "passwordHash">;

export type StoreData = {
  users: User[];
  questions: Question[];
};

export type TeacherMatch = {
  teacher: PublicUser;
  score: number;
  reasons: string[];
};
