import { NextResponse } from "next/server";
import { readSessionUserId } from "./session";
import { readStore } from "./store";
import type { PublicUser, Role, User } from "./types";

export function toPublicUser(user: User): PublicUser {
  const copy = { ...user };
  delete (copy as { passwordHash?: string }).passwordHash;
  return copy;
}

export async function getCurrentUser(): Promise<User | null> {
  const userId = readSessionUserId();
  if (!userId) return null;
  const store = await readStore();
  return store.users.find((user) => user.id === userId) ?? null;
}

export async function requireUser(roles?: Role[]): Promise<User | NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }
  if (roles && !roles.includes(user.role)) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }
  return user;
}

export function isUser(value: User | NextResponse): value is User {
  return !(value instanceof NextResponse);
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
