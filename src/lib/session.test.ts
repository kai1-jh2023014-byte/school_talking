import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "./session";

describe("session", () => {
  it("round-trips a signed role cookie", () => {
    const token = signSession({ userId: "u-student-1", role: "student" });
    expect(verifySession(token)).toEqual({ userId: "u-student-1", role: "student" });
  });

  it("rejects a tampered token", () => {
    const token = signSession({ userId: "u-student-1", role: "student" });
    expect(verifySession(token.replace("student", "admin"))).toBeNull();
    expect(verifySession("not-a-token")).toBeNull();
  });
});
