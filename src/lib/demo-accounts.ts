export const DEMO_PASSWORD = {
  student: "student",
  teacher: "teacher",
  admin: "admin",
};

export const DEMO_ACCOUNTS = [
  { loginId: "hanako", password: DEMO_PASSWORD.student, role: "生徒", name: "山田 花子" },
  { loginId: "taro", password: DEMO_PASSWORD.student, role: "生徒", name: "佐藤 太郎" },
  { loginId: "tanaka", password: DEMO_PASSWORD.teacher, role: "数学・田中先生", name: "田中 美咲" },
  { loginId: "suzuki", password: DEMO_PASSWORD.teacher, role: "数学・鈴木先生", name: "鈴木 健一" },
  { loginId: "takahashi", password: DEMO_PASSWORD.teacher, role: "英語・高橋先生", name: "高橋 恵" },
  { loginId: "ito", password: DEMO_PASSWORD.teacher, role: "国語・伊藤先生", name: "伊藤 誠" },
  { loginId: "nakamura", password: DEMO_PASSWORD.teacher, role: "理科・中村先生", name: "中村 理沙" },
  { loginId: "admin", password: DEMO_PASSWORD.admin, role: "管理者", name: "管理 太郎" },
] as const;
