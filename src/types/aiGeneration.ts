/**
 * Shared contract between the Vercel serverless function (`api/generate-words`)
 * and the frontend client (`src/services/aiGenerator`). The server never returns
 * free text — only this shape — and the client never talks to OpenRouter.
 */

/** One generated word row, matching `ImportWord` in the import pipeline. */
export interface AiWord {
  source: string;
  target: string;
  grammar?: string;
  example?: string;
}

export interface GenerateWordsRequest {
  sourceLanguage: string;
  targetLanguage: string;
  description: string;
  count: number;
  /** Anonymous per-device identifier used for the daily usage cap. */
  deviceId?: string;
}

export interface GenerateWordsResponse {
  words: AiWord[];
  remaining: number;
  limit: number;
}

/** Error shapes returned by the serverless function with a non-2xx status. */
export type GenerateWordsError = {
  error: "method" | "validation" | "limit" | "provider" | "generation";
  message: string;
  remaining?: number;
  limit?: number;
};