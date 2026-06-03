import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildBoundSignal, issueBindingNonce, verifyBindingNonce } from "@/lib/proof-binding";

const facts = {
  draftHash: "a".repeat(64),
  xHandle: "kentf",
  tweetId: "1234567890",
  xUserId: "44196397",
};

describe("proof binding nonce", () => {
  beforeEach(() => {
    process.env.VERIPOST_BINDING_SECRET = "test-binding-secret";
  });
  afterEach(() => {
    delete process.env.VERIPOST_BINDING_SECRET;
  });

  it("round-trips a freshly issued nonce and returns the sealed xUserId", () => {
    const token = issueBindingNonce(facts);
    expect(verifyBindingNonce(token, facts)).toEqual(facts);
  });

  it("derives a stable v2 signal from the token", () => {
    const token = issueBindingNonce(facts);
    const signal = buildBoundSignal(token);
    expect(signal).toMatch(/^veripost:v2:[0-9a-f]{64}$/);
    expect(buildBoundSignal(token)).toBe(signal);
  });

  it("rejects a token whose sealed facts differ from the submitted post", () => {
    const token = issueBindingNonce(facts);
    expect(() => verifyBindingNonce(token, { ...facts, tweetId: "9999" })).toThrow("does not match");
    expect(() => verifyBindingNonce(token, { ...facts, xHandle: "someone_else" })).toThrow("does not match");
    expect(() => verifyBindingNonce(token, { ...facts, draftHash: "b".repeat(64) })).toThrow("does not match");
  });

  it("rejects a tampered signature", () => {
    const token = issueBindingNonce(facts);
    const [body] = token.split(".");
    expect(() => verifyBindingNonce(`${body}.forged`, facts)).toThrow("signature is invalid");
  });

  it("rejects an expired token", () => {
    const issuedAt = 1_000_000;
    const token = issueBindingNonce(facts, issuedAt);
    expect(() => verifyBindingNonce(token, facts, issuedAt + 11 * 60 * 1000)).toThrow("expired");
  });

  it("rejects a token signed with a different secret", () => {
    const token = issueBindingNonce(facts);
    process.env.VERIPOST_BINDING_SECRET = "different-secret";
    expect(() => verifyBindingNonce(token, facts)).toThrow("signature is invalid");
  });
});
