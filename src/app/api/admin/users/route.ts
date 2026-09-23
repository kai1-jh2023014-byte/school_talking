import { NextResponse } from "next/server";
import { isUser, requireUser } from "@/lib/auth";
import { readStore, updateStore } from "@/lib/store";
import { buildUser, toRosterUser, type UserDraft } from "@/lib/users";

export async function GET() {
  const user = await requireUser(["admin"]);
  if (!isUser(user)) return user;
  const store = await readStore();
  return NextResponse.json({
    users: store.users.map(toRosterUser),
  });
}

export async function POST(request: Request) {
  const user = await requireUser(["admin"]);
  if (!isUser(user)) return user;
  const draft = (await request.json().catch(() => ({}))) as UserDraft;
  const result = await updateStore((store) => {
    const created = buildUser(draft, store.users);
    if (!created.ok) return created;
    store.users.push(created.user);
    return { ok: true as const, user: toRosterUser(created.user) };
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
