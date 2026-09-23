import { NextResponse } from "next/server";
import { isUser, requireUser } from "@/lib/auth";
import { updateStore } from "@/lib/store";
import { patchUser, toRosterUser, type UserDraft } from "@/lib/users";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const actor = await requireUser(["admin"]);
  if (!isUser(actor)) return actor;
  const draft = (await request.json().catch(() => ({}))) as Partial<UserDraft>;

  const result = await updateStore((store) => {
    const target = store.users.find((item) => item.id === params.id);
    if (!target) return { ok: false as const, error: "ユーザーが見つかりません" };
    const patched = patchUser(target, draft, actor, store.users);
    if (!patched.ok) return patched;
    return { ok: true as const, user: toRosterUser(patched.user) };
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.error.includes("見つかり") ? 404 : 400 });
  }
  return NextResponse.json(result);
}
