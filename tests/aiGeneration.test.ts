import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { languageName } from "../api/lib/languages";
import { buildMessages, parseWordJson, generateViaOpenRouter, ProviderError } from "../api/lib/openRouter";
import { checkLimit, resolveTier, LIMIT_TTL_SECONDS } from "../api/lib/limiter";

describe("languageName", () => {
  it("maps ISO codes to full names", () => {
    expect(languageName("ja")).toBe("Japanese");
    expect(languageName("en")).toBe("English");
    expect(languageName("de")).toBe("German");
  });

  it("falls back to the raw code for unknown languages", () => {
    expect(languageName("xx")).toBe("xx");
  });
});

describe("buildMessages", () => {
  it("names both languages (start and end), the codes, topic and count", () => {
    const messages = buildMessages({
      sourceCode: "en",
      sourceName: "English",
      targetCode: "ja",
      targetName: "Japanese",
      description: "restaurant phrases",
      count: 12,
    });
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    const user = messages[1].content;
    expect(user).toContain('"restaurant phrases"');
    expect(user).toContain("12");
    expect(user).toContain("English");
    expect(user).toContain("Japanese");
    expect(user).toContain("(en)");
    expect(user).toContain("(ja)");
    // Language requirement must be stated more than once (start + reminder).
    const english = user.match(/English/g)?.length ?? 0;
    const japanese = user.match(/Japanese/g)?.length ?? 0;
    expect(english).toBeGreaterThanOrEqual(2);
    expect(japanese).toBeGreaterThanOrEqual(2);
    // The reminder must forbid putting the source language in the target column.
    expect(user).toMatch(/Writing English into the target column/i);
  });
});

describe("parseWordJson", () => {
  it("parses clean JSON objects", () => {
    const words = parseWordJson(
      '{"words":[{"source":"casa","target":"house","grammar":"noun","example":"La casa es grande."}]}',
    );
    expect(words).toEqual([
      { source: "casa", target: "house", grammar: "noun", example: "La casa es grande." },
    ]);
  });

  it("tolerates code fences and prose wrappers", () => {
    const words = parseWordJson(
      'Sure! Here you go:\n```json\n{"words":[{"source":"pan","target":"bread"}]}\n```\nHope that helps.',
    );
    expect(words).toEqual([{ source: "pan", target: "bread", grammar: undefined, example: undefined }]);
  });

  it("drops rows missing source or target", () => {
    const words = parseWordJson(
      '{"words":[{"source":"ok","target":"good"},{"source":"","target":"x"},{"source":"y"},{}]}',
    );
    expect(words).toHaveLength(1);
    expect(words[0].source).toBe("ok");
  });

  it("trims whitespace and returns empty on invalid JSON", () => {
    expect(parseWordJson("not json at all")).toEqual([]);
    expect(parseWordJson("")).toEqual([]);
    expect(
      parseWordJson('{"words":[{"source":"  casa  ","target":"  house  "}]}'),
    ).toEqual([{ source: "casa", target: "house", grammar: undefined, example: undefined }]);
  });
});

describe("generateViaOpenRouter", () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENROUTER_API_KEY;
  const originalModel = process.env.AI_MODEL;

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.AI_MODEL = "mock/model-a:free,mock/model-b:free";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.AI_MODEL;
    else process.env.AI_MODEL = originalModel;
  });

  it("returns parsed words from the first successful model", async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"words":[{"source":"casa","target":"house"}]}' } }],
        }),
        { status: 200 },
      );
    });
    const words = await generateViaOpenRouter(buildMessages({ sourceCode: "en", sourceName: "English", targetCode: "bg", targetName: "Bulgarian", description: "x", count: 1 }));
    expect(words).toHaveLength(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("reads the reasoning field when content is null (thinking model)", async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: null, reasoning: '{"words":[{"source":"mesa","target":"table"}]}' } }],
        }),
        { status: 200 },
      );
    });
    const words = await generateViaOpenRouter(buildMessages({ sourceCode: "en", sourceName: "English", targetCode: "bg", targetName: "Bulgarian", description: "x", count: 1 }));
    expect(words).toEqual([{ source: "mesa", target: "table", grammar: undefined, example: undefined }]);
  });

  it("moves to the next model on 429 and 5xx, then fails with ProviderError", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 429 }))
      .mockResolvedValueOnce(new Response("{}", { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: "oops" } }] }), { status: 200 }));
    await expect(
      generateViaOpenRouter(buildMessages({ sourceCode: "en", sourceName: "English", targetCode: "bg", targetName: "Bulgarian", description: "x", count: 1 })),
    ).rejects.toBeInstanceOf(ProviderError);
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });
});

describe("limiter", () => {
  const originalVars = {
    kvUrl: process.env.KV_REST_API_URL,
    kvToken: process.env.KV_REST_API_TOKEN,
    limit: process.env.AI_DAILY_LIMIT,
  };

  beforeEach(() => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    process.env.AI_DAILY_LIMIT = "2";
  });

  afterEach(() => {
    if (originalVars.kvUrl === undefined) delete process.env.KV_REST_API_URL;
    else process.env.KV_REST_API_URL = originalVars.kvUrl;
    if (originalVars.kvToken === undefined) delete process.env.KV_REST_API_TOKEN;
    else process.env.KV_REST_API_TOKEN = originalVars.kvToken;
    if (originalVars.limit === undefined) delete process.env.AI_DAILY_LIMIT;
    else process.env.AI_DAILY_LIMIT = originalVars.limit;
  });

  it("enforces the daily cap via the in-memory store", async () => {
    const first = await checkLimit("k1", "free");
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);

    const second = await checkLimit("k1", "free");
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);

    const third = await checkLimit("k1", "free");
    expect(third.allowed).toBe(false);
  });

  it("uses a separate bucket per key", async () => {
    await checkLimit("a", "free");
    const other = await checkLimit("b", "free");
    expect(other.allowed).toBe(true);
    expect(other.remaining).toBe(1);
  });

  it("resets the bucket after the TTL", async () => {
    vi.useFakeTimers();
    await checkLimit("k2", "free");
    await checkLimit("k2", "free");
    expect((await checkLimit("k2", "free")).allowed).toBe(false);
    vi.advanceTimersByTime(LIMIT_TTL_SECONDS * 1000 + 1);
    expect((await checkLimit("k2", "free")).allowed).toBe(true);
    vi.useRealTimers();
  });

  it("classifies supporter requests by shared token", () => {
    const before = process.env.AI_SUPPORTER_TOKEN;
    process.env.AI_SUPPORTER_TOKEN = "supersecret";
    try {
      const req = new Request("http://localhost", { headers: { "x-supporter-token": "supersecret" } });
      expect(resolveTier(req)).toBe("supporter");
      const normal = new Request("http://localhost");
      expect(resolveTier(normal)).toBe("free");
    } finally {
      if (before === undefined) delete process.env.AI_SUPPORTER_TOKEN;
      else process.env.AI_SUPPORTER_TOKEN = before;
    }
  });
});

describe("handler", () => {
  it("smoke: handler module loads and exposes a default export", async () => {
    const mod = await import("../api/generate-words");
    expect(typeof mod.default).toBe("function");
  });
});