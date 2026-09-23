import { createHash } from "crypto";
import { describe, expect, it } from "vitest";
import { hashPassword, isBcryptHash, needsRehash, verifyPassword } from "./hash";

describe("hash", () => {
  it("hashes new passwords with bcrypt", () => {
    const hashed = hashPassword("student");
    expect(isBcryptHash(hashed)).toBe(true);
    expect(verifyPassword("student", hashed)).toBe(true);
    expect(verifyPassword("wrong", hashed)).toBe(false);
    expect(needsRehash(hashed)).toBe(false);
  });

  it("still accepts legacy SHA-256 hashes and marks them for rehash", () => {
    const legacy = createHash("sha256").update("tsunagu-salt-2026:student").digest("hex");
    expect(isBcryptHash(legacy)).toBe(false);
    expect(verifyPassword("student", legacy)).toBe(true);
    expect(needsRehash(legacy)).toBe(true);
  });
});
