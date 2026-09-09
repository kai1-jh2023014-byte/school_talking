import type { QuestionStatus, Urgency } from "@/lib/types";
import { statusLabel, urgencyLabel } from "@/lib/format";

const STATUS: Record<QuestionStatus, string> = {
  open: "bg-gold/15 text-gold",
  queued: "bg-navy/10 text-navy",
  assigned: "bg-sage/15 text-sage",
  answered: "bg-terracotta/15 text-terracotta",
  closed: "bg-line text-muted",
};

const URGENCY: Record<Urgency, string> = {
  high: "bg-rose/10 text-rose",
  normal: "bg-navy/10 text-navy",
  low: "bg-line text-muted",
};

export function QuestionStatusChip({ status }: { status: QuestionStatus }) {
  return <span className={`chip ${STATUS[status]}`}>{statusLabel(status)}</span>;
}

export function UrgencyChip({ urgency }: { urgency: Urgency }) {
  return <span className={`chip ${URGENCY[urgency]}`}>{urgencyLabel(urgency)}</span>;
}
