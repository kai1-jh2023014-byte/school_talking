import { createHash } from "crypto";

const SALT = "tsunagu-salt-2026";

export function hashPassword(password: string): string {
  return createHash("sha256").update(`${SALT}:${password}`).digest("hex");
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  return hashPassword(password) === passwordHash;
}
