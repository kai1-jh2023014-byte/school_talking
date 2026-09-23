import { createHash } from "crypto";
import bcrypt from "bcryptjs";

const LEGACY_SALT = "tsunagu-salt-2026";
const ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, ROUNDS);
}

export function isBcryptHash(passwordHash: string): boolean {
  return (
    passwordHash.startsWith("$2a$") ||
    passwordHash.startsWith("$2b$") ||
    passwordHash.startsWith("$2y$")
  );
}

function legacyHash(password: string): string {
  return createHash("sha256").update(`${LEGACY_SALT}:${password}`).digest("hex");
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  if (isBcryptHash(passwordHash)) {
    return bcrypt.compareSync(password, passwordHash);
  }
  return legacyHash(password) === passwordHash;
}

export function needsRehash(passwordHash: string): boolean {
  return !isBcryptHash(passwordHash);
}
