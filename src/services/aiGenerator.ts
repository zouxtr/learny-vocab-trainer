/**
 * Frontend client for the AI word-generation endpoint.
 *
 * All calls go through the same-origin serverless function (/api/generate-words)
 * so the OpenRouter API key never reaches the browser. Error responses are
 * surfaced as `AiGenerationError` with a stable `code` the UI can localize.
 */

import type { GenerateWordsRequest, GenerateWordsResponse, GenerateWordsError } from "@/types/aiGeneration";

const DEVICE_KEY = "lexi-device-id";

/** Persistent anonymous identifier for the daily usage cap (never sent to OpenRouter). */
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export class AiGenerationError extends Error {
  readonly code: GenerateWordsError["error"];
  constructor(code: GenerateWordsError["error"], message: string) {
    super(message);
    this.name = "AiGenerationError";
    this.code = code;
  }
}

export async function generateWords(request: GenerateWordsRequest): Promise<GenerateWordsResponse> {
  const response = await fetch("/api/generate-words", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const data = (await response.json().catch(() => null)) as
    | GenerateWordsResponse
    | GenerateWordsError
    | null;

  if (!response.ok) {
    const err = data as GenerateWordsError | null;
    throw new AiGenerationError(
      err?.error ?? "generation",
      err?.message ?? "AI generation failed. Please try again.",
    );
  }

  return data as GenerateWordsResponse;
}