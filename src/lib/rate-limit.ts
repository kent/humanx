import { createHash } from "node:crypto";

import { ApiError } from "@/lib/http";
import { getClientIp } from "@/lib/request-security";

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

function consume(key: string, options: RateLimitOptions, now: number): void {
  for (const [bucketKey, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(bucketKey);
    }
  }

  if (!buckets.has(key) && buckets.size >= MAX_BUCKETS) {
    throw new ApiError(429, "rate_limited", "Too many attempts. Try again shortly.");
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return;
  }

  bucket.count += 1;
  if (bucket.count > options.limit) {
    throw new ApiError(429, "rate_limited", "Too many attempts. Try again shortly.");
  }
}

export function rateLimitRequest(
  request: Request,
  scope: string,
  options: RateLimitOptions,
  now = Date.now(),
): void {
  consume(`${scope}:${getClientIp(request)}`, options, now);
}

// Rate limit by an arbitrary identity (e.g. a World ID nullifier) rather than
// by IP. The identity is hashed so the raw value is never held in the map.
export function rateLimitByIdentity(
  identity: string,
  scope: string,
  options: RateLimitOptions,
  now = Date.now(),
): void {
  const hashed = createHash("sha256").update(`${scope}:${identity}`).digest("base64url");
  consume(`${scope}#${hashed}`, options, now);
}

export function resetRateLimitsForTests(): void {
  buckets.clear();
}
