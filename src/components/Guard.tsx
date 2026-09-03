"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppShell } from "./AppShell";
import { useUser } from "@/hooks/useUser";
import type { Role } from "@/lib/types";

export function Guard({
  role,
  children,
}: {
  role: Role | Role[];
  children: React.ReactNode;
}) {
  const { user, loading } = useUser();
  const router = useRouter();
  const allowedKey = Array.isArray(role) ? role.join(",") : role;

  useEffect(() => {
    const allowed = allowedKey.split(",") as Role[];
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!allowed.includes(user.role)) {
      const home =
        user.role === "student" ? "/student" : user.role === "teacher" ? "/teacher" : "/admin";
      router.replace(home);
    }
  }, [loading, user, router, allowedKey]);

  const allowed = allowedKey.split(",") as Role[];
  if (loading || !user || !allowed.includes(user.role)) {
    return (
      <div className="grid min-h-screen place-items-center text-muted">読み込み中…</div>
    );
  }

  return <AppShell user={user}>{children}</AppShell>;
}
