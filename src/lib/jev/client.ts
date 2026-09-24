import {
  DEFAULT_BASE_URL,
  DEFAULT_TIMEOUT_MS,
  MAX_OVERLOAD_RETRIES,
  TYPESAFE_API_KEY_ENV,
  TYPESAFE_BASE_URL_ENV,
} from "./config";

export type JevState = string | Record<string, unknown> | unknown[];

export type JevQuestion =
  | {
      type: "choice";
      instructions: string | Record<string, unknown>;
      criteria: Record<string, string | null>;
    }
  | {
      type: "score";
      instructions: string | Record<string, unknown>;
      criteria: string[];
    }
  | {
      type: "noul";
      instructions: string | Record<string, unknown>;
      criteria?: { true: string; false: string };
    };

export type JevChoiceAnswer = {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
};

export type JevScoreAnswer = {
  type: "score";
  score: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
  confidence: number;
};

export type JevNoulAnswer = {
  type: "noul";
  noul: number;
};

export type JevAnswer = JevChoiceAnswer | JevScoreAnswer | JevNoulAnswer;

export type SystemOneRequest = {
  model: string;
  state: JevState;
  questions: Record<string, JevQuestion>;
};

export type SystemOneResult = {
  model: string;
  answers: Record<string, JevAnswer>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

export type ModelCard = {
  name: string;
  description?: string;
  release_date?: string;
};

export type JevClientErrorCode =
  | "missing_api_key"
  | "timeout"
  | "network"
  | "unauthorized"
  | "validation"
  | "rate_limit"
  | "overloaded"
  | "server"
  | "invalid_response";

export type JevFailure = {
  ok: false;
  error: JevClientErrorCode;
  status?: number;
};

export type JevSuccess<T> = { ok: true; value: T };
export type JevResult<T> = JevSuccess<T> | JevFailure;

export type JevClient = {
  listModels(): Promise<JevResult<ModelCard[]>>;
  systemOne(request: SystemOneRequest): Promise<JevResult<SystemOneResult>>;
};

export type EnvMap = Record<string, string | undefined>;

export function readApiKey(env: EnvMap = process.env): string | null {
  const key = env[TYPESAFE_API_KEY_ENV]?.trim();
  return key ? key : null;
}

export function readBaseUrl(env: EnvMap = process.env): string {
  return (env[TYPESAFE_BASE_URL_ENV]?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");
}

function mapStatus(status: number): JevClientErrorCode {
  if (status === 401) return "unauthorized";
  if (status === 422) return "validation";
  if (status === 429) return "rate_limit";
  if (status === 529) return "overloaded";
  if (status >= 500) return "server";
  return "invalid_response";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class HttpJevClient implements JevClient {
  constructor(
    private readonly options: {
      apiKey?: string | null;
      baseUrl?: string;
      timeoutMs?: number;
      fetch?: typeof fetch;
      env?: EnvMap;
    } = {},
  ) {}

  private key(): string | null {
    return this.options.apiKey !== undefined
      ? this.options.apiKey
      : readApiKey(this.options.env ?? process.env);
  }

  private base(): string {
    return this.options.baseUrl ?? readBaseUrl(this.options.env ?? process.env);
  }

  private timeout(): number {
    return this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private async request(path: string, init: RequestInit, started: number): Promise<JevResult<unknown>> {
    const apiKey = this.key();
    if (!apiKey) return { ok: false, error: "missing_api_key" };

    const fetchFn = this.options.fetch ?? fetch;
    const remaining = this.timeout() - (Date.now() - started);
    if (remaining <= 0) return { ok: false, error: "timeout" };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);
    try {
      const response = await fetchFn(`${this.base()}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...(init.headers ?? {}),
        },
        signal: controller.signal,
      });
      if (!response.ok) {
        return { ok: false, error: mapStatus(response.status), status: response.status };
      }
      const body = (await response.json()) as unknown;
      return { ok: true, value: body };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return { ok: false, error: "timeout" };
      }
      return { ok: false, error: "network" };
    } finally {
      clearTimeout(timer);
    }
  }

  async listModels(): Promise<JevResult<ModelCard[]>> {
    const started = Date.now();
    const result = await this.request("/v1/models", { method: "GET" }, started);
    if (!result.ok) return result;
    const cards = parseModelCards(result.value);
    if (!cards) return { ok: false, error: "invalid_response" };
    return { ok: true, value: cards };
  }

  async systemOne(request: SystemOneRequest): Promise<JevResult<SystemOneResult>> {
    const started = Date.now();
    let attempt = 0;
    while (true) {
      const result = await this.request(
        "/v1/systemone",
        { method: "POST", body: JSON.stringify(request) },
        started,
      );
      if (
        !result.ok &&
        (result.error === "rate_limit" || result.error === "overloaded") &&
        attempt < MAX_OVERLOAD_RETRIES &&
        this.timeout() - (Date.now() - started) > 250
      ) {
        attempt += 1;
        await sleep(200);
        continue;
      }
      if (!result.ok) return result;
      const parsed = parseSystemOneResult(result.value);
      if (!parsed) return { ok: false, error: "invalid_response" };
      return { ok: true, value: parsed };
    }
  }
}

export function parseModelCards(value: unknown): ModelCard[] | null {
  if (Array.isArray(value)) {
    return value.every(isModelCard) ? value : null;
  }
  if (value && typeof value === "object" && Array.isArray((value as { models?: unknown }).models)) {
    const models = (value as { models: unknown[] }).models;
    return models.every(isModelCard) ? (models as ModelCard[]) : null;
  }
  return null;
}

function isModelCard(value: unknown): value is ModelCard {
  return Boolean(value && typeof value === "object" && typeof (value as ModelCard).name === "string");
}

export function parseSystemOneResult(value: unknown): SystemOneResult | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { model?: unknown; answers?: unknown; usage?: SystemOneResult["usage"] };
  if (typeof record.model !== "string" || !record.answers || typeof record.answers !== "object") {
    return null;
  }
  const answers: Record<string, JevAnswer> = {};
  for (const [key, raw] of Object.entries(record.answers as Record<string, unknown>)) {
    const parsed = parseAnswer(raw);
    if (!parsed) return null;
    answers[key] = parsed;
  }
  return { model: record.model, answers, usage: record.usage };
}

function parseAnswer(value: unknown): JevAnswer | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.type === "choice") {
    if (typeof record.choice !== "string" || typeof record.confidence !== "number") return null;
    if (!record.probabilities || typeof record.probabilities !== "object") return null;
    return {
      type: "choice",
      choice: record.choice,
      confidence: record.confidence,
      probabilities: record.probabilities as Record<string, number>,
    };
  }
  if (record.type === "score") {
    if (typeof record.score !== "number" || typeof record.confidence !== "number") return null;
    if (!record.probabilities || typeof record.probabilities !== "object") return null;
    return {
      type: "score",
      score: record.score,
      confidence: record.confidence,
      legend: (record.legend as Record<string, string>) ?? {},
      probabilities: record.probabilities as Record<string, number>,
    };
  }
  if (record.type === "noul") {
    if (typeof record.noul !== "number") return null;
    return { type: "noul", noul: record.noul };
  }
  return null;
}
