/**
 * OpenRouter plumbing for AI word generation.
 *
 * Deliberately uses a specific `:free` model (not the `openrouter/free`
 * router): the router can pick thinking models whose JSON lands in the
 * `reasoning` field with `content: null`, which silently breaks structured
 * parsing. Free endpoints rotate and rate-limit often, so the request is
 * retried across an ordered model chain, each attempt parsing defensively.
 */

import type { AiWord } from "../../src/types/aiGeneration";

/** Ordered fallback chain; override with a comma-separated AI_MODEL env var. */
const MODEL_CHAIN = (
  process.env.AI_MODEL ??
  "openai/gpt-oss-20b:free,arcee-ai/trinity-large-preview:free,meta-llama/llama-3.3-70b-instruct:free"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

interface Message {
  role: "system" | "user";
  content: string;
}

export interface GenerateOptions {
  sourceCode: string;
  sourceName: string;
  targetCode: string;
  targetName: string;
  description: string;
  count: number;
}

export function buildMessages(opts: GenerateOptions): Message[] {
  const system =
    "You are a bilingual vocabulary generator. You write real, everyday words in two specific languages and reply with ONLY a JSON object " +
    'matching the schema {"words":[{"source":"...","target":"...","grammar":"...","example":"..."}]}. ' +
    "No prose, no markdown, no code fences, no commentary outside the JSON.";
  const user = [
    `Create ${opts.count} vocabulary words about: "${opts.description}".`,
    "",
    `SOURCE language: ${opts.sourceName} (${opts.sourceCode}) — every "source" value MUST be a real word written in ${opts.sourceName}.`,
    `TARGET language: ${opts.targetName} (${opts.targetCode}) — every "target" value MUST be the translation of that source word, written in ${opts.targetName}.`,
    "",
    "Shape of each object (the actual words must be about your topic, not these placeholders):",
    `  {"source": "<a real ${opts.sourceName} word>", "target": "<its ${opts.targetName} translation>", "grammar": "<part of speech>", "example": "<one short sentence in ${opts.targetName} using the word>"}`,
    "",
    "- grammar (optional): part of speech, gender/article or conjugation note, e.g. \"noun\" or \"noun, die\".",
    `- example (optional): one short natural sentence in ${opts.targetName}.`,
    "- Prefer varied, realistic everyday words over the most obvious ones.",
    "",
    `REMINDER — do not skip this: "source" MUST be in ${opts.sourceName}, "target" MUST be in ${opts.targetName}. Writing ${opts.sourceName} into the target column, or ${opts.targetName} into the source column, is a serious error. Return exactly ${opts.count} word objects.`,
  ].join("\n");
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

/** Extract the assistant text, tolerating thinking models that reply in `reasoning`. */
function pickContent(data: unknown): string {
  const message = (data as { choices?: { message?: Record<string, unknown> }[] } | null)?.choices?.[0]?.message;
  if (!message) return "";
  const content = message.content;
  if (typeof content === "string" && content.trim()) return content;
  const reasoning = message.reasoning;
  return typeof reasoning === "string" ? reasoning : "";
}

function stripFences(text: string): string {
  return text.replace(/```(?:json)?/gi, "").trim();
}

/**
 * Parse model output into clean word rows. Tolerates prose wrappers and code
 * fences by extracting the first balanced JSON object, then validating each
 * row's required fields.
 */
export function parseWordJson(text: string): AiWord[] {
  const cleaned = stripFences(text);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return [];
  }
  const array = Array.isArray(parsed) ? parsed : (parsed as { words?: unknown } | null)?.words;
  if (!Array.isArray(array)) return [];

  const clean = (v: unknown): string | undefined => {
    const s = typeof v === "string" ? v.trim() : "";
    return s || undefined;
  };

  return array
    .map((row) => {
      const w = row as Record<string, unknown>;
      return {
        source: clean(w.source) ?? "",
        target: clean(w.target) ?? "",
        grammar: clean(w.grammar),
        example: clean(w.example),
      };
    })
    .filter((w) => w.source && w.target);
}

/** Error carrying the per-model failure trail for diagnostics. */
export class ProviderError extends Error {
  readonly attempts: string[];
  constructor(attempts: string[]) {
    super("No AI model produced a usable vocabulary list.");
    this.name = "ProviderError";
    this.attempts = attempts;
  }
}

/**
 * Call OpenRouter across the model chain until one returns parseable words.
 * Throws `ProviderError` when every model failed.
 */
export async function generateViaOpenRouter(messages: Message[]): Promise<AiWord[]> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new ProviderError(["missing OPENROUTER_API_KEY"]);
  const attempts: string[] = [];

  for (const model of MODEL_CHAIN) {
    console.log(`[lexi-ai] attempt model=${model}`);
    try {
      console.log(`[lexi-ai] prompt=${JSON.stringify(messages)}`);
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_URL ?? "https://lexi.app",
          "X-Title": "Lexi!",
        },
        signal: AbortSignal.timeout(45_000),
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
          max_tokens: 4096,
        }),
      });

      console.log(`[lexi-ai] response status=${res.status}`);
      if (res.status === 429) {
        attempts.push(`${model}: rate limited`);
        continue;
      }
      if (!res.ok) {
        const raw = await res.text();
        console.log(`[lexi-ai] response body=${raw}`);
        attempts.push(`${model}: HTTP ${res.status}`);
        continue;
      }

      const data: unknown = await res.json();
      const content = pickContent(data);
      console.log(`[lexi-ai] response raw=${content}`);
      const words = parseWordJson(content);
      console.log(`[lexi-ai] parsed words=${words.length}`);
      if (words.length === 0) {
        attempts.push(`${model}: no parseable JSON`);
        continue;
      }
      return words;
    } catch (e) {
      console.log(`[lexi-ai] request threw: ${e instanceof Error ? e.message : String(e)}`);
      attempts.push(`${model}: request failed`);
    }
  }

  throw new ProviderError(attempts);
}