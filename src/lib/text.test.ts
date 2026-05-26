import { describe, expect, it } from "vitest";

import { buildWorldSignal, hashDraftText, normalizePostText, validatePostText } from "@/lib/text";

describe("post text normalization", () => {
  it("normalizes whitespace before hashing", () => {
    const normalized = normalizePostText("  hello\t\tworld\r\n\r\n\r\n  second line  ");

    expect(normalized).toBe("hello world\n\nsecond line");
    expect(hashDraftText(normalized)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("binds the signal to the draft hash", () => {
    const validation = validatePostText("Human proof for this post");

    expect(validation.ok).toBe(true);
    if (validation.ok) {
      expect(buildWorldSignal(validation.draftHash)).toBe(validation.signal);
      expect(validation.signal).toMatch(/^veripost:v1:[0-9a-f]{64}$/);
    }
  });

  it("rejects empty and oversized posts", () => {
    expect(validatePostText(" \n\t ").ok).toBe(false);
    expect(validatePostText("x".repeat(221)).ok).toBe(false);
  });
});
