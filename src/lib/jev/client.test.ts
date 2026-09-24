import { describe, expect, it } from "vitest";
import { HttpJevClient, parseModelCards, parseSystemOneResult, readApiKey } from "./client";

describe("readApiKey", () => {
  it("treats a missing or blank key as unavailable without exposing secrets", () => {
    expect(readApiKey({})).toBeNull();
    expect(readApiKey({ TYPESAFE_API_KEY: "   " })).toBeNull();
    expect(readApiKey({ TYPESAFE_API_KEY: "secret" })).toBe("secret");
  });
});

describe("HttpJevClient", () => {
  it("returns a clear missing_api_key error and does not call the network", async () => {
    let called = false;
    const client = new HttpJevClient({
      apiKey: null,
      fetch: async () => {
        called = true;
        return new Response("{}");
      },
    });
    const result = await client.systemOne({
      model: "test-model",
      state: "q",
      questions: { subject: { type: "noul", instructions: "x" } },
    });
    expect(result).toEqual({ ok: false, error: "missing_api_key" });
    expect(called).toBe(false);
  });

  it("maps timeout to a typed failure", async () => {
    const client = new HttpJevClient({
      apiKey: "k",
      timeoutMs: 20,
      fetch: (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        }),
    });
    const result = await client.systemOne({
      model: "test-model",
      state: "q",
      questions: { subject: { type: "noul", instructions: "x" } },
    });
    expect(result).toMatchObject({ ok: false, error: "timeout" });
  });

  it("maps 5xx to server and 401 to unauthorized", async () => {
    const client = new HttpJevClient({
      apiKey: "k",
      fetch: async () => new Response("no", { status: 500 }),
    });
    expect(await client.systemOne({ model: "m", state: "q", questions: {} })).toMatchObject({
      ok: false,
      error: "server",
      status: 500,
    });

    const auth = new HttpJevClient({
      apiKey: "k",
      fetch: async () => new Response("no", { status: 401 }),
    });
    expect(await auth.systemOne({ model: "m", state: "q", questions: {} })).toMatchObject({
      ok: false,
      error: "unauthorized",
    });
  });

  it("rejects an unexpected JSON body", async () => {
    const client = new HttpJevClient({
      apiKey: "k",
      fetch: async () => new Response(JSON.stringify({ hello: true }), { status: 200 }),
    });
    expect(await client.systemOne({ model: "m", state: "q", questions: {} })).toMatchObject({
      ok: false,
      error: "invalid_response",
    });
  });
});

describe("parsers", () => {
  it("reads official model list shapes", () => {
    expect(parseModelCards({ models: [{ name: "jev-latest", description: "alias", release_date: "2026-09" }] })).toEqual([
      { name: "jev-latest", description: "alias", release_date: "2026-09" },
    ]);
    expect(parseModelCards([{ name: "jev-latest" }])).toEqual([{ name: "jev-latest" }]);
    expect(parseModelCards({ models: [{ id: "nope" }] })).toBeNull();
  });

  it("reads a System One response", () => {
    const parsed = parseSystemOneResult({
      model: "jev-1.13.0",
      answers: {
        subject: { type: "choice", choice: "数学", confidence: 0.9, probabilities: { 数学: 0.9 } },
      },
    });
    expect(parsed?.model).toBe("jev-1.13.0");
    expect(parsed?.answers.subject).toMatchObject({ type: "choice", choice: "数学" });
  });
});
