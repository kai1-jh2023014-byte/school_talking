import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { Role, SessionPayload } from "./types";

export const SESSION_SECRET = process.env.SESSION_SECRET || "tsunagu-demo-secret-2026";
export const SESSION_COOKIE = "tsunagu_session";

export function signSession(payload: SessionPayload): string {
  const body = `${payload.userId}|${payload.role}`;
  const sig = createHmac("sha256", SESSION_SECRET).update(body).digest("hex");
  return `${body}.${sig}`;
}

export function verifySession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", SESSION_SECRET).update(body).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const sep = body.lastIndexOf("|");
  if (sep <= 0) return null;
  const userId = body.slice(0, sep);
  const role = body.slice(sep + 1) as Role;
  if (!userId || !["student", "teacher", "admin"].includes(role)) return null;
  return { userId, role };
}

export function readSession(): SessionPayload | null {
  return verifySession(cookies().get(SESSION_COOKIE)?.value);
}

export function readSessionUserId(): string | null {
  return readSession()?.userId ?? null;
}
