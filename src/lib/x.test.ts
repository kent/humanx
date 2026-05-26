import { describe, expect, it } from "vitest";

import { buildXIntentUrl, normalizeXPostUrl } from "@/lib/x";

describe("X URL helpers", () => {
  it("builds an X web intent with text and proof URL", () => {
    const intent = new URL(buildXIntentUrl("hello world", "https://humanx.example/proof/hx_123"));

    expect(intent.origin).toBe("https://x.com");
    expect(intent.pathname).toBe("/intent/tweet");
    expect(intent.searchParams.get("text")).toBe("hello world");
    expect(intent.searchParams.get("url")).toBe("https://humanx.example/proof/hx_123");
  });

  it("accepts canonical X post URLs only", () => {
    expect(normalizeXPostUrl("https://twitter.com/alice/status/123?ref=share")).toBe(
      "https://x.com/alice/status/123",
    );
    expect(normalizeXPostUrl("http://x.com/alice/status/123")).toBeNull();
    expect(normalizeXPostUrl("https://x.com/alice")).toBeNull();
    expect(normalizeXPostUrl("https://example.com/alice/status/123")).toBeNull();
  });
});
