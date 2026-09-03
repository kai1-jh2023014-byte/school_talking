import Link from "next/link";
import { Logo } from "@/components/Logo";

const WALLS = [
  {
    title: "物理的な壁",
    problem: "先生がどこにいるかわからない",
    solve: "対応状況を、職員室の名札のように見える化する",
  },
  {
    title: "心理的な壁",
    problem: "先生に話しかけづらい",
    solve: "まずアプリから質問できる。職員室に行かなくても意思が届く",
  },
  {
    title: "情報の壁",
    problem: "誰に聞けばいいかわからない",
    solve: "AIが質問内容から、適切な先生を探す",
  },
];

const STEPS = [
  "質問する",
  "AIが内容を整理",
  "対応可能な先生を提示",
  "先生が都合のよい時間に対応",
  "質問データが学校改善へ",
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Logo large />
        <div className="flex flex-wrap gap-2">
          <Link href="/login/student" className="btn-primary">
            生徒ログイン
          </Link>
          <Link href="/login/teacher" className="btn-ghost">
            先生ログイン
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-6">
        <p className="text-sm tracking-[0.25em] text-terracotta">高校生テックコンテスト2026</p>
        <h1 className="mt-4 max-w-3xl font-serif text-4xl font-bold leading-tight sm:text-6xl">
          「聞きたいのに聞けない」をなくす学校へ
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-navy/80">
          先生を探す必要はない。質問が、先生を見つける。
          生徒と先生のあいだにある小さな壁を、AIとデジタルでつなぐ学校内プラットフォームです。
        </p>
        <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
          <Link href="/login/student" className="card block p-5 hover:-translate-y-0.5">
            <p className="text-xs tracking-[0.2em] text-terracotta">生徒</p>
            <h2 className="mt-2 font-serif text-2xl">学籍番号で入る</h2>
            <p className="mt-2 text-sm text-muted">質問したいときに使う入口です。</p>
          </Link>
          <Link href="/login/teacher" className="card block p-5 hover:-translate-y-0.5">
            <p className="text-xs tracking-[0.2em] text-terracotta">先生</p>
            <h2 className="mt-2 font-serif text-2xl">職員番号で入る</h2>
            <p className="mt-2 text-sm text-muted">受付と回答に使う入口です。</p>
          </Link>
        </div>
        <a href="#concept" className="btn-ghost mt-4">
          企画の考え方
        </a>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 md:grid-cols-3">
        {WALLS.map((wall) => (
          <article key={wall.title} className="card p-6">
            <p className="text-xs tracking-[0.2em] text-terracotta">{wall.title}</p>
            <h2 className="mt-3 font-serif text-2xl">{wall.problem}</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">{wall.solve}</p>
          </article>
        ))}
      </section>

      <section id="concept" className="mx-auto max-w-6xl px-4 py-16">
        <div className="card overflow-hidden md:grid md:grid-cols-2">
          <div className="border-b border-line p-8 md:border-b-0 md:border-r">
            <p className="text-xs tracking-[0.2em] text-muted">従来</p>
            <h2 className="mt-2 font-serif text-3xl">生徒が先生を探す</h2>
            <ol className="mt-6 space-y-2 text-sm text-muted">
              <li>職員室へ行く</li>
              <li>先生がいるか確認する</li>
              <li>忙しそうで声をかけられない</li>
              <li>いなければ戻る</li>
            </ol>
          </div>
          <div className="bg-navy p-8 text-cream">
            <p className="text-xs tracking-[0.2em] text-[#f3c19a]">つなぐ</p>
            <h2 className="mt-2 font-serif text-3xl">質問が先生を見つける</h2>
            <ol className="mt-6 space-y-2 text-sm text-cream/80">
              {STEPS.map((step, index) => (
                <li key={step}>
                  {index + 1}. {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="font-serif text-3xl">AIは答えを出さない</h2>
        <p className="mt-4 max-w-3xl leading-relaxed text-muted">
          投稿された質問から科目・分野・緊急度を整理し、対応できる先生へつなぎます。
          人と人のあいだにあるコミュニケーションの壁を取り除くために、AIを使います。
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { t: "生徒支援", d: "聞きたい瞬間に、適切な先生へ届く" },
            { t: "教員支援", d: "自分の都合で質問を整理し、対応できる" },
            { t: "学校改善", d: "つまずきがデータになり、授業が変わる" },
          ].map((item) => (
            <article key={item.t} className="rounded-3xl border border-line bg-cream/70 p-5">
              <h3 className="font-serif text-xl">{item.t}</h3>
              <p className="mt-2 text-sm text-muted">{item.d}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-line py-10 text-center text-sm text-muted">
        つなぐ — 生徒と先生で入口を分けた、学校内の質問プラットフォーム
      </footer>
    </div>
  );
}
