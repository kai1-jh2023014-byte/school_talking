"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { api } from "@/lib/client";
import { sampleAccountsFor } from "@/lib/demo-accounts";
import { homePath, idLabel } from "@/lib/paths";
import type { PublicUser, Role } from "@/lib/types";

const COPY: Record<
  Role,
  { kicker: string; title: string; lead: string; placeholder: string }
> = {
  student: {
    kicker: "生徒",
    title: "学籍番号で入る",
    lead: "クラスで配られた学籍番号とパスワードで、質問の入口に入れます。先生用の入口からは入れません。",
    placeholder: "例）2A-01",
  },
  teacher: {
    kicker: "先生",
    title: "職員番号で入る",
    lead: "職員番号とパスワードで、質問の受付と回答に入れます。生徒用の入口からは入れません。",
    placeholder: "例）T-1001",
  },
  admin: {
    kicker: "管理者",
    title: "学校の分析に入る",
    lead: "質問の傾向を見るための入口です。生徒・先生の画面とは分かれています。",
    placeholder: "例）A-0001",
  },
};

export function LoginForm({ role }: { role: Role }) {
  const router = useRouter();
  const copy = COPY[role];
  const label = idLabel(role);
  const samples = sampleAccountsFor(role);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api<{ user: PublicUser }>("/api/auth")
      .then((data) => router.replace(homePath(data.user.role)))
      .catch(() => undefined);
  }, [router]);

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
          role,
        }),
      });
      router.push(homePath(data.user.role));
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
        <p className="mt-8 text-xs tracking-[0.25em] text-terracotta">{copy.kicker}</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight">{copy.title}</h1>
        <p className="mt-4 text-muted">{copy.lead}</p>
        <p className="mt-6 text-sm">
          <Link href="/login" className="text-navy underline-offset-4 hover:underline">
            ← 入口を選び直す
          </Link>
        </p>
      </div>

      <div className="card p-6">
        <form className="space-y-4" onSubmit={submit}>
          <label className="block text-sm">
            {label}
            <input
              className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3 outline-none focus:border-terracotta"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              autoComplete="username"
              placeholder={copy.placeholder}
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
            {pending ? "確認しています…" : `${copy.kicker}として入る`}
          </button>
        </form>

        <details className="mt-6 border-t border-line pt-4 text-sm">
          <summary className="cursor-pointer text-muted">動作確認用の番号（あとで学校の名簿に差し替え）</summary>
          <div className="mt-3 grid gap-2">
            {samples.map((account) => (
              <button
                key={account.loginId}
                type="button"
                className="flex items-center justify-between rounded-2xl border border-line bg-paper px-3 py-2 text-left hover:border-terracotta"
                onClick={() => {
                  setLoginId(account.loginId);
                  setPassword(account.password);
                  void submit(undefined, account.loginId, account.password);
                }}
              >
                <span>
                  <span className="font-semibold">{account.name}</span>
                  <span className="ml-2 text-muted">{account.note}</span>
                </span>
                <span className="text-xs text-muted">{account.loginId}</span>
              </button>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
