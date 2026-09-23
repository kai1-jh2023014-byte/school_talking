import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { isUser, requireUser } from "@/lib/auth";
import { uploadsDir } from "@/lib/store";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  const user = await requireUser(["student"]);
  if (!isUser(user)) return user;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "画像の送信に失敗しました。もう一度お試しください。" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "画像ファイルを選んでください" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "JPEG / PNG / WebP / GIF のみ送れます" }, { status: 400 });
  }
  if (file.size > 3 * 1024 * 1024) {
    return NextResponse.json({ error: "画像は3MBまでです" }, { status: 400 });
  }

  const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const filename = `${randomUUID()}.${ext}`;
  const dir = uploadsDir();
  await fs.mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, filename), buffer);

  return NextResponse.json({ imagePath: `/api/uploads/${filename}` });
}
