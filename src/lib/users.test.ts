import { describe, expect, it } from "vitest";
import { verifyPassword } from "./hash";
import type { User } from "./types";
import { buildUser, patchUser } from "./users";

const admin: User = {
  id: "admin-1",
  loginId: "A-0001",
  passwordHash: "x",
  name: "管理 太郎",
  role: "admin",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("buildUser", () => {
  it("creates a student with a hashed password", () => {
    const result = buildUser(
      { role: "student", loginId: "2a-99", name: "新しい生徒", password: "secret1", grade: "2年", className: "A" },
      [],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.user.loginId).toBe("2A-99");
    expect(result.user.homeroom).toBe("2年A組");
    expect(verifyPassword("secret1", result.user.passwordHash)).toBe(true);
  });

  it("rejects a short password", () => {
    const result = buildUser({ role: "student", loginId: "2A-99", name: "短い", password: "12345" }, []);
    expect(result).toMatchObject({ ok: false, error: "パスワードは6文字以上にしてください" });
  });

  it("rejects a duplicate login id", () => {
    const existing = buildUser(
      { role: "student", loginId: "2A-99", name: "先にいる人", password: "secret1" },
      [],
    );
    expect(existing.ok).toBe(true);
    if (!existing.ok) return;
    const result = buildUser(
      { role: "student", loginId: "2A-99", name: "あとから", password: "secret1" },
      [existing.user],
    );
    expect(result.ok).toBe(false);
  });
});

describe("patchUser", () => {
  it("does not let an admin disable themselves", () => {
    const result = patchUser(admin, { status: "disabled" }, admin, [admin]);
    expect(result).toMatchObject({ ok: false, error: "自分のアカウントは無効にできません" });
  });

  it("does not disable the last active admin", () => {
    const other: User = { ...admin, id: "admin-2", loginId: "A-0002" };
    const result = patchUser(admin, { status: "disabled" }, other, [admin]);
    expect(result).toMatchObject({ ok: false, error: "最後の管理者は無効にできません" });
  });

  it("can disable an admin when another remains", () => {
    const other: User = { ...admin, id: "admin-2", loginId: "A-0002" };
    const result = patchUser({ ...admin }, { status: "disabled" }, other, [admin, other]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.user.status).toBe("disabled");
  });
});
