import { afterEach, describe, expect, it } from "vitest";

import { assertJsonRequest, assertSameOriginRequest, getClientIp } from "@/lib/request-security";

afterEach(() => {
  delete process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.VERCEL_ENV;
  delete process.env.WORLD_ID_ENVIRONMENT;
});

describe("request origin guards", () => {
  it("accepts same-origin POST requests and local requests without an Origin header", () => {
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

  it("rejects production POST requests without browser provenance headers", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://veripost.io";

    expect(() => assertSameOriginRequest(new Request("https://veripost.io/api/proofs", { method: "POST" }))).toThrow(
      "origin is required",
    );
  });

  it("accepts same-origin referers when Origin is absent", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://veripost.io";

    expect(() =>
      assertSameOriginRequest(
        new Request("https://veripost.io/api/proofs", {
          method: "POST",
          headers: { referer: "https://veripost.io/" },
        }),
      ),
    ).not.toThrow();
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

  it("rejects fetch metadata marked as cross-site", () => {
    expect(() =>
      assertSameOriginRequest(
        new Request("https://veripost.io/api/proofs", {
          method: "POST",
          headers: { origin: "https://veripost.io", "sec-fetch-site": "cross-site" },
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

describe("JSON request guards", () => {
  it("accepts bounded JSON requests", () => {
    expect(() =>
      assertJsonRequest(
        new Request("https://veripost.io/api/proofs", {
          method: "POST",
          headers: { "content-type": "application/json", "content-length": "42" },
        }),
        100,
      ),
    ).not.toThrow();
  });

  it("rejects non-JSON and oversized requests", () => {
    expect(() =>
      assertJsonRequest(
        new Request("https://veripost.io/api/proofs", {
          method: "POST",
          headers: { "content-type": "text/plain", "content-length": "42" },
        }),
        100,
      ),
    ).toThrow("must be JSON");

    expect(() =>
      assertJsonRequest(
        new Request("https://veripost.io/api/proofs", {
          method: "POST",
          headers: { "content-type": "application/json", "content-length": "101" },
        }),
        100,
      ),
    ).toThrow("too large");
  });
});
