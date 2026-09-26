"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "./Logo";
import { api } from "@/lib/client";
import { loginPath } from "@/lib/paths";
import type { PublicUser } from "@/lib/types";

const NAV: Record<PublicUser["role"], { href: string; label: string }[]> = {
  student: [
    { href: "/student", label: "ホーム" },
    { href: "/student/ask", label: "質問する" },
    { href: "/student/universe", label: "My Universe" },
  ],
  teacher: [
    { href: "/teacher", label: "受付と質問" },
    { href: "/teacher/universe", label: "Class Universe" },
    { href: "/teacher/prompts/new", label: "問いを送る" },
    { href: "/teacher/history", label: "対応した質問" },
  ],
  admin: [
    { href: "/admin", label: "分析" },
    { href: "/admin/staffroom", label: "職員室" },
    { href: "/admin/universe", label: "Question Universe" },
    { href: "/admin/users", label: "名簿" },
    { href: "/admin/questions", label: "質問履歴" },
  ],
};

export function AppShell({
  user,
  children,
}: {
  user: PublicUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const links = NAV[user.role];

  async function logout() {
    await api("/api/auth", { method: "DELETE" });
    router.push(loginPath(user.role));
  }

  const roleLabel =
    user.role === "student" ? "生徒" : user.role === "teacher" ? "先生" : "管理者";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line/80 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Logo />
          <nav className="flex items-center gap-1 text-sm">
            {links.map((link) => {
              const better = links.some(
                (other) =>
                  other.href !== link.href &&
                  other.href.length > link.href.length &&
                  (pathname === other.href || pathname.startsWith(`${other.href}/`)),
              );
              const active = pathname === link.href || (pathname.startsWith(`${link.href}/`) && !better);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-3 py-1.5 ${active ? "bg-navy text-cream" : "text-muted hover:bg-line/60"}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <div className="hidden text-right sm:block">
              <div className="font-semibold">{user.name}</div>
              <div className="text-xs text-muted">
                {roleLabel}
                {user.homeroom ? ` · ${user.homeroom}` : ""}
                {user.subjects?.length ? ` · ${user.subjects.join("・")}` : ""}
              </div>
            </div>
            <button className="btn-ghost px-3 py-1.5 text-xs" onClick={logout}>
              ログアウト
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
