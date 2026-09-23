import type { QuestionStatus, Urgency } from "@/lib/types";
import { statusLabel, urgencyLabel } from "@/lib/format";
import { normalizeStatus } from "@/lib/questions";

const STATUS: Record<string, string> = {
  submitted: "bg-gold/15 text-gold",
  classified: "bg-gold/15 text-gold",
  matched: "bg-gold/15 text-gold",
  accepted: "bg-sage/15 text-sage",
  deferred: "bg-navy/10 text-navy",
  transferred: "bg-navy/10 text-navy",
  answered: "bg-terracotta/15 text-terracotta",
  closed: "bg-line text-muted",
  cancelled: "bg-line text-muted",
};

const URGENCY: Record<Urgency, string> = {
  high: "bg-rose/10 text-rose",
  normal: "bg-navy/10 text-navy",
  low: "bg-line text-muted",
};

export function QuestionStatusChip({ status }: { status: QuestionStatus }) {
  const key = normalizeStatus(status);
  return <span className={`chip ${STATUS[key] ?? STATUS.matched}`}>{statusLabel(status)}</span>;
}

export function UrgencyChip({ urgency }: { urgency: Urgency }) {
  return <span className={`chip ${URGENCY[urgency]}`}>{urgencyLabel(urgency)}</span>;
}
