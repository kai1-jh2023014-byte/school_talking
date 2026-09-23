import { randomUUID } from "crypto";
import { CLASS_NAMES, GRADES, SUBJECTS, homeroomOf } from "./constants";
import { hashPassword } from "./hash";
import { normalizeLoginId } from "./paths";
import type { AccountStatus, Availability, Role, User } from "./types";

export type UserDraft = {
  role: Role;
  loginId: string;
  name: string;
  password?: string;
  grade?: string;
  className?: string;
  subjects?: string[];
  specialties?: string[];
  status?: AccountStatus;
  availability?: Availability;
  note?: string;
};

export type UserMutationResult = { ok: true; user: User } | { ok: false; error: string };

function validSubjects(subjects?: string[]): boolean {
  if (!subjects) return true;
  return subjects.every((item) => (SUBJECTS as readonly string[]).includes(item));
}

export function buildUser(draft: UserDraft, existing: User[]): UserMutationResult {
  const role = draft.role;
  const loginId = normalizeLoginId(draft.loginId);
  const name = draft.name.trim();
  const password = draft.password?.trim() ?? "";

  if (!["student", "teacher", "admin"].includes(role)) {
    return { ok: false, error: "役割が正しくありません" };
  }
  if (!loginId || !name) {
    return { ok: false, error: "番号と氏名を入力してください" };
  }
  if (password.length < 6) {
    return { ok: false, error: "パスワードは6文字以上にしてください" };
  }
  if (existing.some((user) => normalizeLoginId(user.loginId) === loginId)) {
    return { ok: false, error: "同じ番号の人がすでにいます" };
  }
  if (role === "student") {
    if (draft.grade && !(GRADES as readonly string[]).includes(draft.grade)) {
      return { ok: false, error: "学年が正しくありません" };
    }
    if (draft.className && !(CLASS_NAMES as readonly string[]).includes(draft.className)) {
      return { ok: false, error: "組が正しくありません" };
    }
  }
  if (role === "teacher" && !validSubjects(draft.subjects)) {
    return { ok: false, error: "担当科目が正しくありません" };
  }

  const user: User = {
    id: randomUUID(),
    loginId,
    passwordHash: hashPassword(password),
    name,
    role,
    status: "active",
    createdAt: new Date().toISOString(),
    grade: role === "student" ? draft.grade : undefined,
    className: role === "student" ? draft.className : undefined,
    homeroom: role === "student" ? homeroomOf(draft.grade, draft.className) : undefined,
    subjects: role === "teacher" ? draft.subjects ?? [] : undefined,
    specialties: role === "teacher" ? draft.specialties ?? [] : undefined,
    availability: role === "teacher" ? draft.availability ?? "off" : undefined,
    note: draft.note,
  };
  return { ok: true, user };
}

export function patchUser(user: User, draft: Partial<UserDraft>, actor: User, all: User[]): UserMutationResult {
  if (draft.loginId) {
    const loginId = normalizeLoginId(draft.loginId);
    if (all.some((item) => item.id !== user.id && normalizeLoginId(item.loginId) === loginId)) {
      return { ok: false, error: "同じ番号の人がすでにいます" };
    }
    user.loginId = loginId;
  }
  if (draft.name?.trim()) user.name = draft.name.trim();
  if (draft.password?.trim()) {
    if (draft.password.trim().length < 6) {
      return { ok: false, error: "パスワードは6文字以上にしてください" };
    }
    user.passwordHash = hashPassword(draft.password.trim());
  }
  if (user.role === "student") {
    if (draft.grade) user.grade = draft.grade;
    if (draft.className) user.className = draft.className;
    user.homeroom = homeroomOf(user.grade, user.className) ?? user.homeroom;
  }
  if (user.role === "teacher") {
    if (draft.subjects) {
      if (!validSubjects(draft.subjects)) {
        return { ok: false, error: "担当科目が正しくありません" };
      }
      user.subjects = draft.subjects;
    }
    if (draft.specialties) user.specialties = draft.specialties;
    if (draft.availability) user.availability = draft.availability;
  }
  if (draft.note !== undefined) user.note = draft.note;
  if (draft.status) {
    if (draft.status === "disabled" && user.id === actor.id) {
      return { ok: false, error: "自分のアカウントは無効にできません" };
    }
    if (draft.status === "disabled" && user.role === "admin") {
      const otherAdmins = all.filter(
        (item) => item.role === "admin" && item.status === "active" && item.id !== user.id,
      );
      if (otherAdmins.length === 0) {
        return { ok: false, error: "最後の管理者は無効にできません" };
      }
    }
    user.status = draft.status;
  }
  return { ok: true, user };
}

export function toRosterUser(user: User): Omit<User, "passwordHash"> {
  const { passwordHash: _passwordHash, ...safe } = user;
  void _passwordHash;
  return safe;
}
