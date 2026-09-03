import { NextResponse } from "next/server";
import { authenticate } from "@/lib/authenticate";
import { isUser, requireUser, toPublicUser } from "@/lib/auth";
import { SESSION_COOKIE, signSession } from "@/lib/session";
import { readStore } from "@/lib/store";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    loginId?: string;
    password?: string;
    role?: string;
  };

  const store = await readStore();
  const result = authenticate(store.users, body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const response = NextResponse.json({ user: toPublicUser(result.user) });
  response.cookies.set(SESSION_COOKIE, signSession(result.user.id), {
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
