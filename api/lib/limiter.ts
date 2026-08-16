/**
 * Daily usage limiting for AI word generation.
 *
 * Primary store is Vercel KV (Upstash Redis) — its REST URL + token env vars
 * are injected automatically when a KV store is bound to the deployment. If
 * they are absent (local dev, pre-configuration) the limiter degrades to an
 * in-process Map so the feature keeps working, at the cost of being an
 * approximation across serverless instances.
 *
 * The limiter is tier-aware on purpose: `resolveTier` is where a future paid
 * ("supporter") check plugs in. Today it only honours an optional shared
 * secret sent as `x-supporter-token`, so no paid-tier logic exists yet.
 */

export type SupporterStatus = "free" | "supporter";

/** Time-to-live for one daily bucket, in seconds. */
export const LIMIT_TTL_SECONDS = 86_400;

export interface LimitCheck {
  allowed: boolean;
  remaining: number;
  limit: number;
}

const DEFAULT_FREE = 3;
const DEFAULT_SUPPORTER = 50;

function tierLimit(tier: SupporterStatus): number {
  const raw = Number(
    tier === "supporter" ? process.env.AI_SUPPORTER_DAILY_LIMIT : process.env.AI_DAILY_LIMIT,
  );
  const fallback = tier === "supporter" ? DEFAULT_SUPPORTER : DEFAULT_FREE;
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : fallback;
}

function usesKv(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

/** INCR a key and set its TTL in one Upstash REST pipeline round-trip. */
async function kvIncr(key: string, ttlSeconds: number): Promise<number> {
  const res = await fetch(`${process.env.KV_REST_API_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, ttlSeconds],
    ]),
  });
  if (!res.ok) throw new Error(`KV pipeline failed with ${res.status}`);
  const data = (await res.json()) as unknown[];
  const value = data[0];
  const count = typeof value === "number" ? value : Number(value);
  return Number.isFinite(count) ? count : 1;
}

interface MemoryBucket {
  count: number;
  resetAt: number;
}

/** In-process fallback store. Prunes expired buckets opportunistically. */
const memory = new Map<string, MemoryBucket>();

function memoryIncr(key: string, ttlSeconds: number): number {
  const now = Date.now();
  for (const [k, bucket] of memory) {
    if (bucket.resetAt <= now) memory.delete(k);
  }
  const bucket = memory.get(key);
  if (!bucket || bucket.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + ttlSeconds * 1000 });
    return 1;
  }
  bucket.count += 1;
  return bucket.count;
}

/**
 * Determine the caller's tier. All callers are "free" today; the supporter
 * branch is the placeholder a future paid-status check fills in.
 */
export function resolveTier(req: Request): SupporterStatus {
  const secret = process.env.AI_SUPPORTER_TOKEN;
  if (secret && req.headers.get("x-supporter-token") === secret) return "supporter";
  return "free";
}

/** Increment the caller's daily counter and report whether they may continue. */
export async function checkLimit(key: string, tier: SupporterStatus): Promise<LimitCheck> {
  const limit = tierLimit(tier);
  let count: number;
  if (usesKv()) {
    try {
      count = await kvIncr(key, LIMIT_TTL_SECONDS);
    } catch {
      count = memoryIncr(key, LIMIT_TTL_SECONDS);
    }
  } else {
    count = memoryIncr(key, LIMIT_TTL_SECONDS);
  }
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    limit,
  };
}