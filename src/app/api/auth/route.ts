import { NextResponse } from "next/server";
import { isUser, requireUser, toPublicUser } from "@/lib/auth";
import { verifyPassword } from "@/lib/hash";
import { SESSION_COOKIE, signSession } from "@/lib/session";
import { readStore } from "@/lib/store";

export async function POST(request: Request) {
  const body = (await request.json()) as { loginId?: string; password?: string };
  const loginId = body.loginId?.trim();
  const password = body.password ?? "";
  if (!loginId || !password) {
    return NextResponse.json({ error: "ログインIDとパスワードを入力してください" }, { status: 400 });
  }

  const store = await readStore();
  const user = store.users.find((item) => item.loginId === loginId);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "ログインIDまたはパスワードが違います" }, { status: 401 });
  }

  const response = NextResponse.json({ user: toPublicUser(user) });
  response.cookies.set(SESSION_COOKIE, signSession(user.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

export async function GET() {
  const user = await requireUser();
  if (!isUser(user)) return user;
  return NextResponse.json({ user: toPublicUser(user) });
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
