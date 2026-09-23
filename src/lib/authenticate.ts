import { verifyPassword } from "./hash";
import { idLabel, normalizeLoginId } from "./paths";
import type { Role, User } from "./types";

const PORTAL_ROLES: Role[] = ["student", "teacher", "admin"];

export function isPortalRole(value: string | undefined): value is Role {
  return !!value && PORTAL_ROLES.includes(value as Role);
}

export type AuthSuccess = { ok: true; user: User };
export type AuthFailure = { ok: false; status: number; error: string };
export type AuthResult = AuthSuccess | AuthFailure;

export function authenticate(
  users: User[],
  input: { loginId?: string; password?: string; role?: string },
): AuthResult {
  if (!isPortalRole(input.role)) {
    return { ok: false, status: 400, error: "生徒または先生の入口から入ってください" };
  }

  const role = input.role;
  const loginId = normalizeLoginId(input.loginId ?? "");
  const password = input.password ?? "";

  if (!loginId || !password) {
    return {
      ok: false,
      status: 400,
      error: `${idLabel(role)}とパスワードを入力してください`,
    };
  }

  const user = users.find(
    (item) => item.role === role && normalizeLoginId(item.loginId) === loginId,
  );
  if (!user || user.status === "disabled" || !verifyPassword(password, user.passwordHash)) {
    return {
      ok: false,
      status: 401,
      error: `${idLabel(role)}またはパスワードが違います`,
    };
  }

  return { ok: true, user };
}
