/**
 * Vercel serverless function: generate a draft vocabulary list with an AI.
 *
 * The OpenRouter API key lives only in server-side env vars (OPENROUTER_API_KEY);
 * the frontend never sees it. The function validates the request, enforces a
 * daily per-device usage cap, calls OpenRouter, and returns clean structured
 * JSON — never raw model output.
 *
 * Deploy: Vercel auto-detects the `api/` directory. Required env var:
 *   OPENROUTER_API_KEY
 * Optional:
 *   AI_MODEL (comma-separated model chain), AI_DAILY_LIMIT, AI_SUPPORTER_TOKEN,
 *   AI_SUPPORTER_DAILY_LIMIT, and KV_REST_API_URL / KV_REST_API_TOKEN when a
 *   KV store is bound (auto-injected by Vercel).
 */

import { z } from "zod";
import { languageName } from "./lib/languages.js";
import { buildMessages, generateViaOpenRouter } from "./lib/openRouter.js";
import { checkLimit, resolveTier } from "./lib/limiter.js";
import type { GenerateWordsError, GenerateWordsResponse } from "../src/types/aiGeneration";

const BODY_SCHEMA = z.object({
  sourceLanguage: z.string().min(2).max(16),
  targetLanguage: z.string().min(2).max(16),
  description: z.string().trim().min(1).max(200),
  count: z.number().int().min(1).max(25),
  deviceId: z.string().max(128).optional(),
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function error(data: GenerateWordsError, status: number): Response {
  return json(data, status);
}

/** Daily bucket key: device id when present, otherwise the caller's IP. */
function limitKey(deviceId: string | undefined, req: Request): string {
  const day = new Date().toISOString().slice(0, 10);
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim() || "unknown";
  const id = deviceId?.trim() || ip;
  return `lexi:gen:${day}:${id}`;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return error({ error: "method", message: "Method not allowed." }, 405);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error({ error: "validation", message: "Invalid JSON body." }, 400);
  }

  const parsed = BODY_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return error({ error: "validation", message: "Missing or invalid fields." }, 400);
  }
  const { sourceLanguage, targetLanguage, description, count, deviceId } = parsed.data;

  const sourceName = languageName(sourceLanguage);
  const targetName = languageName(targetLanguage);

  const tier = resolveTier(req);
  const limit = await checkLimit(limitKey(deviceId, req), tier);
  if (!limit.allowed) {
    return error(
      {
        error: "limit",
        message: "You've reached today's free generation limit. Try again tomorrow.",
        remaining: 0,
        limit: limit.limit,
      },
      429,
    );
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return error({ error: "provider", message: "AI generation is not configured on the server." }, 503);
  }

  const messages = buildMessages({
    sourceCode: sourceLanguage,
    sourceName: sourceName,
    targetCode: targetLanguage,
    targetName: targetName,
    description,
    count,
  });
  let words: Awaited<ReturnType<typeof generateViaOpenRouter>>;
  try {
    words = await generateViaOpenRouter(messages);
  } catch {
    return error(
      { error: "generation", message: "The AI couldn't produce a valid list. Please try again." },
      502,
    );
  }

  const response: GenerateWordsResponse = {
    words: words.slice(0, count),
    remaining: limit.remaining,
    limit: limit.limit,
  };
  return json(response);
}