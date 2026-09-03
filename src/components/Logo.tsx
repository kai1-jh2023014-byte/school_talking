import Link from "next/link";

export function Logo({ large = false }: { large?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 text-ink">
      <span
        className={`grid place-items-center rounded-2xl bg-navy text-cream ${large ? "h-12 w-12" : "h-9 w-9"}`}
        aria-hidden
      >
        <svg viewBox="0 0 32 32" className={large ? "h-7 w-7" : "h-5 w-5"}>
          <path
            d="M7 12h10a4 4 0 0 1 4 4v1H11a4 4 0 0 1-4-4v-1z"
            fill="currentColor"
            opacity="0.9"
          />
          <path
            d="M15 18h10a4 4 0 0 1 4 4v1H19a4 4 0 0 1-4-4v-1z"
            fill="#f3c19a"
          />
        </svg>
      </span>
      <span className="leading-tight">
        <span className={`block font-serif font-bold ${large ? "text-2xl" : "text-lg"}`}>つなぐ</span>
        <span className="block text-[10px] tracking-[0.18em] text-muted">QUESTION MATCHING</span>
      </span>
    </Link>
  );
}
