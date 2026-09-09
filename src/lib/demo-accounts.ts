import type { Role } from "./types";

export const DEMO_PASSWORD = {
  student: "student",
  teacher: "teacher",
  admin: "admin",
};

export type SampleAccount = {
  loginId: string;
  password: string;
  role: Role;
  name: string;
  note: string;
};

export const SAMPLE_ACCOUNTS: SampleAccount[] = [
  { loginId: "2A-01", password: DEMO_PASSWORD.student, role: "student", name: "山田 花子", note: "2年A組" },
  { loginId: "2B-08", password: DEMO_PASSWORD.student, role: "student", name: "佐藤 太郎", note: "2年B組" },
  { loginId: "1C-15", password: DEMO_PASSWORD.student, role: "student", name: "斎藤 陽菜", note: "1年C組" },
  { loginId: "3A-04", password: DEMO_PASSWORD.student, role: "student", name: "加藤 蓮", note: "3年A組" },
  { loginId: "T-1001", password: DEMO_PASSWORD.teacher, role: "teacher", name: "田中 美咲", note: "数学科" },
  { loginId: "T-1002", password: DEMO_PASSWORD.teacher, role: "teacher", name: "鈴木 健一", note: "数学科" },
  { loginId: "T-2001", password: DEMO_PASSWORD.teacher, role: "teacher", name: "高橋 恵", note: "英語科" },
  { loginId: "T-3001", password: DEMO_PASSWORD.teacher, role: "teacher", name: "伊藤 誠", note: "国語科" },
  { loginId: "T-4001", password: DEMO_PASSWORD.teacher, role: "teacher", name: "中村 理沙", note: "理科" },
  { loginId: "T-5001", password: DEMO_PASSWORD.teacher, role: "teacher", name: "小林 直人", note: "社会科" },
  { loginId: "A-0001", password: DEMO_PASSWORD.admin, role: "admin", name: "管理 太郎", note: "学校管理者" },
];

export const LOGIN_ID_BY_USER_ID: Record<string, string> = {
  "u-student-1": "2A-01",
  "u-student-2": "2B-08",
  "u-student-3": "1C-15",
  "u-student-4": "3A-04",
  "u-math-a": "T-1001",
  "u-math-b": "T-1002",
  "u-english": "T-2001",
  "u-japanese": "T-3001",
  "u-science": "T-4001",
  "u-social": "T-5001",
  "u-admin": "A-0001",
};

export function sampleAccountsFor(role: Role): SampleAccount[] {
  return SAMPLE_ACCOUNTS.filter((account) => account.role === role);
}
