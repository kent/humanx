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

export function rateLimitRequest(
  request: Request,
  scope: string,
  options: RateLimitOptions,
  now = Date.now(),
): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }

  const key = `${scope}:${getClientIp(request)}`;
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

export function resetRateLimitsForTests(): void {
  buckets.clear();
}
