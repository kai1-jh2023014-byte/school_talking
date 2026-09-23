import { describe, expect, it } from "vitest";
import { authenticate } from "./authenticate";
import { hashPassword } from "./hash";
import type { User } from "./types";

const users: User[] = [
  {
    id: "s1",
    loginId: "2A-01",
    passwordHash: hashPassword("student"),
    name: "山田 花子",
    role: "student",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "t1",
    loginId: "T-1001",
    passwordHash: hashPassword("teacher"),
    name: "田中 美咲",
    role: "teacher",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "s-off",
    loginId: "2A-99",
    passwordHash: hashPassword("student"),
    name: "無効 生徒",
    role: "student",
    status: "disabled",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("authenticate", () => {
  it("lets a student into the student portal", () => {
    const result = authenticate(users, {
      loginId: "2a-01",
      password: "student",
      role: "student",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.user.id).toBe("s1");
  });

  it("lets a teacher into the teacher portal", () => {
    const result = authenticate(users, {
      loginId: "t-1001",
      password: "teacher",
      role: "teacher",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.user.role).toBe("teacher");
  });

  it("rejects a teacher account on the student portal", () => {
    const result = authenticate(users, {
      loginId: "T-1001",
      password: "teacher",
      role: "student",
    });
    expect(result).toMatchObject({
      ok: false,
      status: 401,
      error: "学籍番号またはパスワードが違います",
    });
  });

  it("rejects a student account on the teacher portal", () => {
    const result = authenticate(users, {
      loginId: "2A-01",
      password: "student",
      role: "teacher",
    });
    expect(result).toMatchObject({
      ok: false,
      status: 401,
      error: "職員番号またはパスワードが違います",
    });
  });

  it("requires a portal role", () => {
    const result = authenticate(users, { loginId: "2A-01", password: "student" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("rejects a disabled account without saying the account is disabled", () => {
    const result = authenticate(users, {
      loginId: "2A-99",
      password: "student",
      role: "student",
    });
    expect(result).toMatchObject({
      ok: false,
      status: 401,
      error: "学籍番号またはパスワードが違います",
    });
  });
});
