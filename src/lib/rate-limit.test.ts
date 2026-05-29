import { beforeEach, describe, expect, it } from "vitest";

import { rateLimitRequest, resetRateLimitsForTests } from "@/lib/rate-limit";

beforeEach(() => {
  resetRateLimitsForTests();
});

describe("in-memory request rate limiting", () => {
  it("allows requests up to the configured window limit", () => {
    const request = new Request("https://veripost.io/api/proofs", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    });

    expect(() => rateLimitRequest(request, "proofs:create", { limit: 2, windowMs: 1_000 }, 1_000)).not.toThrow();
    expect(() => rateLimitRequest(request, "proofs:create", { limit: 2, windowMs: 1_000 }, 1_001)).not.toThrow();
  });

  it("rejects requests over the configured window limit and resets after the window", () => {
    const request = new Request("https://veripost.io/api/proofs", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    });

    rateLimitRequest(request, "proofs:create", { limit: 1, windowMs: 1_000 }, 1_000);
    expect(() => rateLimitRequest(request, "proofs:create", { limit: 1, windowMs: 1_000 }, 1_001)).toThrow(
      "Too many attempts",
    );
    expect(() => rateLimitRequest(request, "proofs:create", { limit: 1, windowMs: 1_000 }, 2_001)).not.toThrow();
  });
});
