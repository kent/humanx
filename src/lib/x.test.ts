import { describe, expect, it } from "vitest";

import { buildXIntentUrl, normalizeXUsername } from "@/lib/x";

describe("X URL helpers", () => {
  it("builds an X web intent with text and proof URL", () => {
    const intent = new URL(buildXIntentUrl("hello world", "https://veripost.io/proof/vp_123"));

    expect(intent.origin).toBe("https://x.com");
    expect(intent.pathname).toBe("/intent/tweet");
    expect(intent.searchParams.get("text")).toBe("hello world");
    expect(intent.searchParams.get("url")).toBe("https://veripost.io/proof/vp_123");
  });

  it("normalizes valid X usernames", () => {
    expect(normalizeXUsername("Alice_123")).toBe("alice_123");
    expect(normalizeXUsername("@Alice")).toBe("alice");
    expect(normalizeXUsername(" alice ")).toBe("alice");
  });

  it("rejects invalid X usernames", () => {
    expect(normalizeXUsername("")).toBeNull();
    expect(normalizeXUsername("too-long-for-x-usernames")).toBeNull();
    expect(normalizeXUsername("alice.example")).toBeNull();
  });
});
