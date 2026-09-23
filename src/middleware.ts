import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Role } from "@/lib/types";

const COOKIE = "tsunagu_session";
const SECRET = process.env.SESSION_SECRET || "tsunagu-demo-secret-2026";

function homePath(role: Role): string {
  if (role === "teacher") return "/teacher";
  if (role === "admin") return "/admin";
  return "/student";
}

function loginPath(role: Role): string {
  if (role === "teacher") return "/login/teacher";
  if (role === "admin") return "/login/admin";
  return "/login/student";
}

async function hmacHex(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(sig))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function readRole(token: string | undefined): Promise<Role | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmacHex(body);
  if (expected.length !== sig.length || expected !== sig) return null;
  const sep = body.lastIndexOf("|");
  if (sep <= 0) return null;
  const role = body.slice(sep + 1) as Role;
  return ["student", "teacher", "admin"].includes(role) ? role : null;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  let need: Role | null = null;
  if (path.startsWith("/student")) need = "student";
  else if (path.startsWith("/teacher")) need = "teacher";
  else if (path.startsWith("/admin")) need = "admin";
  if (!need) return NextResponse.next();

  const role = await readRole(request.cookies.get(COOKIE)?.value);
  if (!role) {
    return NextResponse.redirect(new URL(loginPath(need), request.url));
  }
  if (role !== need) {
    return NextResponse.redirect(new URL(homePath(role), request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/student",
    "/student/:path*",
    "/teacher",
    "/teacher/:path*",
    "/admin",
    "/admin/:path*",
  ],
};
