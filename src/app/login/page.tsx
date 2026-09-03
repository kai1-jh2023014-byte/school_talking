"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { api } from "@/lib/client";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";
import type { PublicUser } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("hanako");
  const [password, setPassword] = useState("student");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function homeOf(user: PublicUser) {
    if (user.role === "teacher") return "/teacher";
    if (user.role === "admin") return "/admin";
    return "/student";
  }

  async function submit(event?: React.FormEvent, nextId?: string, nextPassword?: string) {
    event?.preventDefault();
    setPending(true);
    setError("");
    try {
      const data = await api<{ user: PublicUser }>("/api/auth", {
        method: "POST",
        body: JSON.stringify({
          loginId: nextId ?? loginId,
          password: nextPassword ?? password,
        }),
      });
      router.push(homeOf(data.user));
    } catch (err) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-screen max-w-5xl items-center gap-10 px-4 py-10 md:grid-cols-2">
      <div>
        <Logo large />
        <h1 className="mt-8 font-serif text-4xl leading-tight">学校の中の、質問の入り口。</h1>
        <p className="mt-4 text-muted">
          デモ用のアカウントが用意してあります。生徒・先生・管理者を切り替えて、3つの画面を見られます。
        </p>
      </div>

      <div className="card p-6">
        <form className="space-y-4" onSubmit={submit}>
          <label className="block text-sm">
            ログインID
            <input
              className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3 outline-none focus:border-terracotta"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="block text-sm">
            パスワード
            <input
              type="password"
              className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3 outline-none focus:border-terracotta"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error ? <p className="text-sm text-rose">{error}</p> : null}
          <button className="btn-primary w-full" disabled={pending} type="submit">
            {pending ? "接続中…" : "ログイン"}
          </button>
        </form>

        <div className="mt-6 border-t border-line pt-4">
          <p className="text-xs tracking-[0.2em] text-muted">DEMO ACCOUNTS</p>
          <div className="mt-3 grid gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.loginId}
                type="button"
                className="flex items-center justify-between rounded-2xl border border-line bg-paper px-3 py-2 text-left text-sm hover:border-terracotta"
                onClick={() => {
                  setLoginId(account.loginId);
                  setPassword(account.password);
                  void submit(undefined, account.loginId, account.password);
                }}
              >
                <span>
                  <span className="font-semibold">{account.name}</span>
                  <span className="ml-2 text-muted">{account.role}</span>
                </span>
                <span className="text-xs text-muted">
                  {account.loginId} / {account.password}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
