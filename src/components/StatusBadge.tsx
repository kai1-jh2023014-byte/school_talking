import type { Availability } from "@/lib/types";
import { availabilityLabel } from "@/lib/match";

const STYLES: Record<Availability, string> = {
  available: "bg-sage/15 text-sage border-sage/30",
  soon: "bg-gold/15 text-gold border-gold/30",
  busy: "bg-rose/10 text-rose border-rose/20",
  off: "bg-line text-muted border-line",
};

const DOT: Record<Availability, string> = {
  available: "bg-sage",
  soon: "bg-gold",
  busy: "bg-rose",
  off: "bg-muted",
};

export function StatusBadge({
  status,
  minutes,
}: {
  status: Availability;
  minutes?: number;
}) {
  return (
    <span className={`chip border ${STYLES[status]}`}>
      <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${DOT[status]}`} />
      {availabilityLabel(status, minutes)}
    </span>
  );
}
