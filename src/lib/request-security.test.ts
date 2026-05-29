import { afterEach, describe, expect, it } from "vitest";

import { assertSameOriginRequest, getClientIp } from "@/lib/request-security";

afterEach(() => {
  delete process.env.NEXT_PUBLIC_APP_URL;
});

describe("request origin guards", () => {
  it("accepts same-origin POST requests and requests without an Origin header", () => {
    expect(() =>
      assertSameOriginRequest(
        new Request("https://veripost.io/api/proofs", {
          method: "POST",
          headers: { origin: "https://veripost.io" },
        }),
      ),
    ).not.toThrow();

    expect(() => assertSameOriginRequest(new Request("https://veripost.io/api/proofs", { method: "POST" }))).not.toThrow();
  });

  it("rejects cross-origin POST requests", () => {
    expect(() =>
      assertSameOriginRequest(
        new Request("https://veripost.io/api/proofs", {
          method: "POST",
          headers: { origin: "https://evil.example" },
        }),
      ),
    ).toThrow("origin is not accepted");
  });

  it("uses the configured app origin when present", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://veripost.io";

    expect(() =>
      assertSameOriginRequest(
        new Request("https://preview-host.example/api/proofs", {
          method: "POST",
          headers: { origin: "https://preview-host.example" },
        }),
      ),
    ).toThrow("origin is not accepted");

    expect(() =>
      assertSameOriginRequest(
        new Request("https://preview-host.example/api/proofs", {
          method: "POST",
          headers: { origin: "https://veripost.io" },
        }),
      ),
    ).not.toThrow();
  });

  it("extracts the first forwarded client IP for rate limiting", () => {
    const request = new Request("https://veripost.io/api/proofs", {
      headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
    });

    expect(getClientIp(request)).toBe("203.0.113.10");
  });
});
