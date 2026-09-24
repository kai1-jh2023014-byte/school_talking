type JevLogEvent = "start" | "success" | "fallback" | "skip";

type JevLogFields = {
  reason?: string;
  latencyMs?: number;
  model?: string;
  subject?: string;
  topic?: string;
  confidence?: number;
  band?: string;
  chars?: number;
  hasHint?: boolean;
};

export function logJev(event: JevLogEvent, fields: JevLogFields): void {
  const payload = { event, ...fields };
  if (event === "fallback" || event === "skip") {
    console.info("[jev]", payload);
    return;
  }
  console.info("[jev]", payload);
}
