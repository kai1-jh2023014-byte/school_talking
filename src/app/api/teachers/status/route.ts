import { NextResponse } from "next/server";
import { isUser, requireUser, toPublicUser } from "@/lib/auth";
import { updateStore } from "@/lib/store";
import type { Availability } from "@/lib/types";

const STATUSES: Availability[] = ["available", "soon", "busy", "off"];

export async function PATCH(request: Request) {
  const user = await requireUser(["teacher"]);
  if (!isUser(user)) return user;

  const body = (await request.json()) as {
    availability?: Availability;
    availableInMinutes?: number;
    note?: string;
  };

  if (!body.availability || !STATUSES.includes(body.availability)) {
    return NextResponse.json({ error: "対応状況が正しくありません" }, { status: 400 });
  }

  const updated = await updateStore((store) => {
    const teacher = store.users.find((item) => item.id === user.id);
    if (!teacher) throw new Error("not found");
    teacher.availability = body.availability;
    teacher.availableInMinutes =
      body.availability === "soon" ? body.availableInMinutes ?? 10 : undefined;
    if (typeof body.note === "string") teacher.note = body.note;
    return toPublicUser(teacher);
  });

  return NextResponse.json({ teacher: updated });
}
