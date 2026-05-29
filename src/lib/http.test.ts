import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { ApiError, errorResponse } from "@/lib/http";

afterEach(() => {
  delete process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.VERCEL_ENV;
  delete process.env.WORLD_ID_ENVIRONMENT;
});

describe("API error responses", () => {
  it("includes diagnostic details outside production launch runtime", async () => {
    const response = errorResponse(new ApiError(400, "example", "Example failed.", { reason: "test" }));

    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "example",
        details: { reason: "test" },
      },
    });
  });

  it("redacts diagnostic details in production launch runtime", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://veripost.io";

    const response = errorResponse(new ApiError(400, "example", "Example failed.", { secret: "do-not-return" }));
    const payload = (await response.json()) as { error: { details?: unknown } };

    expect(payload.error.details).toBeUndefined();
  });

  it("redacts zod validation issues in production launch runtime", async () => {
    process.env.VERCEL_ENV = "production";

    const result = z.object({ proof: z.string() }).safeParse({ proof: 1 });
    expect(result.success).toBe(false);

    const response = errorResponse(result.error);
    const payload = (await response.json()) as { error: { details?: unknown } };

    expect(payload.error.details).toBeUndefined();
  });
});
