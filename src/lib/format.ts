import type { Availability, QuestionStatus, Urgency } from "./types";

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${m}/${d} ${hh}:${mm}`;
}

export function statusLabel(status: QuestionStatus): string {
  switch (status) {
    case "open":
      return "受付待ち";
    case "queued":
      return "待ち行列";
    case "assigned":
      return "先生が確認中";
    case "answered":
      return "回答あり";
    case "closed":
      return "終了";
  }
}

export function urgencyLabel(urgency: Urgency): string {
  switch (urgency) {
    case "high":
      return "急いでほしい";
    case "normal":
      return "通常";
    case "low":
      return "急がない";
  }
}

export function availabilityTone(status: Availability): string {
  switch (status) {
    case "available":
      return "sage";
    case "soon":
      return "gold";
    case "busy":
      return "rose";
    case "off":
      return "muted";
  }
}
