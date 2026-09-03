import Link from "next/link";
import { Logo } from "@/components/Logo";

const ENTRIES = [
  {
    href: "/login/student",
    kicker: "生徒",
    title: "学籍番号で入る",
    body: "質問したいときに使う入口です。職員室に行かなくても、対応できる先生へ届きます。",
  },
  {
    href: "/login/teacher",
    kicker: "先生",
    title: "職員番号で入る",
    body: "質問の受付状況を出して、届いた質問に自分の都合で答えます。",
  },
];

export default function LoginChooserPage() {
  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-10">
      <Logo large />
      <p className="mt-10 text-xs tracking-[0.25em] text-terracotta">LOGIN</p>
      <h1 className="mt-3 font-serif text-4xl leading-tight">どちらで入りますか</h1>
      <p className="mt-4 max-w-xl text-muted">
        生徒と先生では、見る画面も入る番号も違います。自分の役割の入口を選んでください。
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {ENTRIES.map((entry) => (
          <Link key={entry.href} href={entry.href} className="card block p-6 hover:-translate-y-0.5">
            <p className="text-xs tracking-[0.2em] text-terracotta">{entry.kicker}</p>
            <h2 className="mt-2 font-serif text-2xl">{entry.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{entry.body}</p>
            <p className="mt-6 text-sm font-semibold text-navy">この入口へ →</p>
          </Link>
        ))}
      </div>

      <p className="mt-10 text-sm text-muted">
        学校の分析を見る方は{" "}
        <Link href="/login/admin" className="underline-offset-4 hover:underline">
          管理者入口
        </Link>
      </p>
    </div>
  );
}
