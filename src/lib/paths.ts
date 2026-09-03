import type { Role } from "./types";

export function homePath(role: Role): string {
  if (role === "teacher") return "/teacher";
  if (role === "admin") return "/admin";
  return "/student";
}

export function loginPath(role: Role): string {
  if (role === "teacher") return "/login/teacher";
  if (role === "admin") return "/login/admin";
  return "/login/student";
}

export function idLabel(role: Role): string {
  if (role === "teacher") return "職員番号";
  if (role === "admin") return "管理者ID";
  return "学籍番号";
}

export function normalizeLoginId(loginId: string): string {
  return loginId.trim().toUpperCase();
}
