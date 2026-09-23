import type { Availability, QuestionStatus, Urgency } from "./types";
import { normalizeStatus } from "./questions";

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${m}/${d} ${hh}:${mm}`;
}

export function statusLabel(status: QuestionStatus): string {
  switch (normalizeStatus(status)) {
    case "submitted":
    case "classified":
    case "matched":
      return "受付待ち";
    case "accepted":
      return "先生が確認中";
    case "deferred":
      return "保留";
    case "transferred":
      return "転送済み";
    case "answered":
      return "回答あり";
    case "closed":
      return "終了";
    case "cancelled":
      return "取り消し";
    default:
      return "受付待ち";
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
