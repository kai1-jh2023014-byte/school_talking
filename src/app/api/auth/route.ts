import { NextResponse } from "next/server";
import { authenticate } from "@/lib/authenticate";
import { isUser, requireUser, toPublicUser } from "@/lib/auth";
import { hashPassword, needsRehash } from "@/lib/hash";
import { SESSION_COOKIE, signSession } from "@/lib/session";
import { readStore, updateStore } from "@/lib/store";

export async function POST(request: Request) {
  let body: { loginId?: string; password?: string; role?: string };
  try {
    body = (await request.json()) as { loginId?: string; password?: string; role?: string };
  } catch {
    return NextResponse.json({ error: "入力内容を確認してください" }, { status: 400 });
  }

  const store = await readStore();
  const result = authenticate(store.users, body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (needsRehash(result.user.passwordHash) && body.password) {
    await updateStore((next) => {
      const user = next.users.find((item) => item.id === result.user.id);
      if (user) user.passwordHash = hashPassword(body.password!);
    });
  }

  const response = NextResponse.json({ user: toPublicUser(result.user) });
  response.cookies.set(
    SESSION_COOKIE,
    signSession({ userId: result.user.id, role: result.user.role }),
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    },
  );
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
