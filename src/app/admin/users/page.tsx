"use client";

import { useEffect, useMemo, useState } from "react";
import { Guard } from "@/components/Guard";
import { api } from "@/lib/client";
import { CLASS_NAMES, GRADES, SUBJECTS } from "@/lib/constants";
import type { AccountStatus, PublicUser, Role } from "@/lib/types";

const ROLES: { id: Role; label: string }[] = [
  { id: "student", label: "生徒" },
  { id: "teacher", label: "先生" },
  { id: "admin", label: "管理者" },
];

type FormState = {
  role: Role;
  loginId: string;
  name: string;
  password: string;
  grade: string;
  className: string;
  subjects: string[];
  specialties: string;
  status: AccountStatus;
  note: string;
};

const EMPTY: FormState = {
  role: "student",
  loginId: "",
  name: "",
  password: "",
  grade: "1年",
  className: "A",
  subjects: ["数学"],
  specialties: "",
  status: "active",
  note: "",
};

export default function AdminUsersPage() {
  return (
    <Guard role="admin">
      <Roster />
    </Guard>
  );
}

function Roster() {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [filter, setFilter] = useState<Role | "all">("all");
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function load() {
    const data = await api<{ users: PublicUser[] }>("/api/admin/users");
    setUsers(data.users);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "読み込めませんでした"));
  }, []);

  const visible = useMemo(
    () => users.filter((user) => (filter === "all" ? true : user.role === filter)),
    [users, filter],
  );

  function startCreate() {
    setSelectedId("new");
    setForm(EMPTY);
    setError("");
  }

  function startEdit(user: PublicUser) {
    setSelectedId(user.id);
    setForm({
      role: user.role,
      loginId: user.loginId,
      name: user.name,
      password: "",
      grade: user.grade ?? "1年",
      className: user.className ?? "A",
      subjects: user.subjects ?? ["数学"],
      specialties: user.specialties?.join("、") ?? "",
      status: user.status,
      note: user.note ?? "",
    });
    setError("");
  }

  async function save() {
    if (pending) return;
    setPending(true);
    setError("");
    const payload = {
      role: form.role,
      loginId: form.loginId,
      name: form.name,
      password: form.password || undefined,
      grade: form.role === "student" ? form.grade : undefined,
      className: form.role === "student" ? form.className : undefined,
      subjects: form.role === "teacher" ? form.subjects : undefined,
      specialties:
        form.role === "teacher"
          ? form.specialties.split(/[、,]/).map((item) => item.trim()).filter(Boolean)
          : undefined,
      status: form.status,
      note: form.note || undefined,
    };
    try {
      if (selectedId === "new") {
        await api("/api/admin/users", { method: "POST", body: JSON.stringify(payload) });
      } else if (selectedId) {
        await api(`/api/admin/users/${selectedId}`, { method: "PATCH", body: JSON.stringify(payload) });
      }
      await load();
      setSelectedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存できませんでした");
    } finally {
      setPending(false);
    }
  }

  function roleLabel(role: Role) {
    return ROLES.find((item) => item.id === role)?.label ?? role;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-terracotta">ROSTER</p>
          <h1 className="mt-1 font-serif text-3xl">学校の名簿</h1>
          <p className="mt-2 text-sm text-muted">
            学籍番号・職員番号の追加、担当科目の変更、アカウントの無効化ができます。
          </p>
        </div>
        <button className="btn-primary" type="button" onClick={startCreate}>
          新しい人を追加
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", ...ROLES.map((item) => item.id)] as const).map((id) => (
          <button
            key={id}
            type="button"
            className={`rounded-full px-3 py-1.5 text-sm ${filter === id ? "bg-navy text-cream" : "bg-line/60"}`}
            onClick={() => setFilter(id)}
          >
            {id === "all" ? "全員" : roleLabel(id)}
          </button>
        ))}
      </div>

      {error && !selectedId ? <p className="text-rose">{error}</p> : null}

      {selectedId ? (
        <section className="card p-6">
          <h2 className="font-serif text-2xl">{selectedId === "new" ? "追加する" : "内容を直す"}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {selectedId === "new" ? (
              <label className="text-sm">
                役割
                <select
                  className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                >
                  {ROLES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="text-sm text-muted">役割：{roleLabel(form.role)}</p>
            )}
            <label className="text-sm">
              {form.role === "teacher" ? "職員番号" : form.role === "admin" ? "管理者ID" : "学籍番号"}
              <input
                className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3"
                value={form.loginId}
                onChange={(e) => setForm({ ...form, loginId: e.target.value })}
              />
            </label>
            <label className="text-sm">
              氏名
              <input
                className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="text-sm">
              パスワード{selectedId === "new" ? "（6文字以上）" : "（空なら変更しない）"}
              <input
                type="password"
                className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
            {form.role === "student" ? (
              <>
                <label className="text-sm">
                  学年
                  <select
                    className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3"
                    value={form.grade}
                    onChange={(e) => setForm({ ...form, grade: e.target.value })}
                  >
                    {GRADES.map((grade) => (
                      <option key={grade}>{grade}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  組
                  <select
                    className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3"
                    value={form.className}
                    onChange={(e) => setForm({ ...form, className: e.target.value })}
                  >
                    {CLASS_NAMES.map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}
            {form.role === "teacher" ? (
              <>
                <fieldset className="text-sm md:col-span-2">
                  <legend>担当科目</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {SUBJECTS.map((subject) => {
                      const checked = form.subjects.includes(subject);
                      return (
                        <label key={subject} className="chip cursor-pointer bg-line/60">
                          <input
                            type="checkbox"
                            className="mr-2"
                            checked={checked}
                            onChange={() =>
                              setForm({
                                ...form,
                                subjects: checked
                                  ? form.subjects.filter((item) => item !== subject)
                                  : [...form.subjects, subject],
                              })
                            }
                          />
                          {subject}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                <label className="text-sm md:col-span-2">
                  専門分野（読点区切り）
                  <input
                    className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3"
                    value={form.specialties}
                    onChange={(e) => setForm({ ...form, specialties: e.target.value })}
                    placeholder="二次関数、微分・積分"
                  />
                </label>
              </>
            ) : null}
            <label className="text-sm">
              状態
              <select
                className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as AccountStatus })}
              >
                <option value="active">有効</option>
                <option value="disabled">無効</option>
              </select>
            </label>
            <label className="text-sm md:col-span-2">
              メモ
              <input
                className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </label>
          </div>
          {error ? <p className="mt-3 text-sm text-rose">{error}</p> : null}
          <div className="mt-4 flex gap-2">
            <button className="btn-primary" type="button" disabled={pending} onClick={() => void save()}>
              {pending ? "保存中…" : "保存する"}
            </button>
            <button className="btn-ghost" type="button" onClick={() => setSelectedId(null)}>
              やめる
            </button>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        {visible.map((user) => (
          <button
            key={user.id}
            type="button"
            className="card block w-full p-5 text-left hover:-translate-y-0.5"
            onClick={() => startEdit(user)}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip bg-navy/10 text-navy">{roleLabel(user.role)}</span>
              <span className={`chip ${user.status === "active" ? "bg-sage/15 text-sage" : "bg-line text-muted"}`}>
                {user.status === "active" ? "有効" : "無効"}
              </span>
              <span className="ml-auto text-xs text-muted">{user.loginId}</span>
            </div>
            <p className="mt-3 font-serif text-xl">{user.name}</p>
            <p className="mt-1 text-sm text-muted">
              {user.homeroom ?? user.subjects?.join("・") ?? "管理者"}
              {user.specialties?.length ? ` · ${user.specialties.join("、")}` : ""}
            </p>
          </button>
        ))}
        {visible.length === 0 ? <p className="text-muted">該当する人はいません。</p> : null}
      </section>
    </div>
  );
}
