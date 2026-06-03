import { describe, expect, it } from "vitest";

import { isSavedProofVisibleForDraft, parseSavedProofResult } from "@/lib/saved-proof";

const appOrigin = "https://veripost.io";
const proofUrl = `${appOrigin}/proof/vp_123`;
const tweetUrl = "https://x.com/alice/status/100";

function makeSavedProof(overrides: Record<string, unknown> = {}) {
  const proof = {
    id: "vp_123",
    draftText: "Posting with VeriPost",
    createdAt: "2026-05-26T16:00:00.000Z",
    proofCommitment: "a".repeat(64),
    xUsername: "alice",
    xHandle: "alice",
    tweetId: "100",
  };

  return {
    proof,
    proofUrl,
    tweetUrl,
    createdNew: true,
    ...overrides,
  };
}

describe("saved proof parsing", () => {
  it("accepts saved proofs with a same-origin proof URL and a real tweet URL", () => {
    const parsed = parseSavedProofResult(makeSavedProof(), appOrigin);
    expect(parsed).not.toBeNull();
    expect(parsed?.proofUrl).toBe(proofUrl);
    expect(parsed?.tweetUrl).toBe(tweetUrl);
    expect(parsed?.proof.xHandle).toBe("alice");
    expect(parsed?.proof.tweetId).toBe("100");
  });

  it("normalizes saved X usernames", () => {
    const parsed = parseSavedProofResult(
      makeSavedProof({
        proof: {
          id: "vp_123",
          draftText: "Posting with VeriPost",
          createdAt: "2026-05-26T16:00:00.000Z",
          proofCommitment: "a".repeat(64),
          xUsername: "@Alice",
        },
      }),
      appOrigin,
    );
    expect(parsed?.proof.xUsername).toBe("alice");
  });

  it("rejects malformed proof payloads", () => {
    expect(parseSavedProofResult({ proofUrl, tweetUrl }, appOrigin)).toBeNull();
    expect(parseSavedProofResult(makeSavedProof({ createdNew: "true" }), appOrigin)).toBeNull();
  });

  it("rejects proof URLs outside the app origin", () => {
    expect(parseSavedProofResult(makeSavedProof({ proofUrl: "https://evil.example/proof/vp_123" }), appOrigin)).toBeNull();
  });

  it("rejects tweet URLs that are not real X status links", () => {
    expect(parseSavedProofResult(makeSavedProof({ tweetUrl: "https://x.com/alice" }), appOrigin)).toBeNull();
    expect(parseSavedProofResult(makeSavedProof({ tweetUrl: "https://evil.example/alice/status/1" }), appOrigin)).toBeNull();
  });
});

describe("saved proof visibility", () => {
  it("shows a saved proof when the compose box is empty", () => {
    const proofResult = parseSavedProofResult(makeSavedProof(), appOrigin);

    expect(isSavedProofVisibleForDraft(proofResult, "")).toBe(true);
  });

  it("shows a saved proof when the current draft still matches after normalization", () => {
    const proofResult = parseSavedProofResult(makeSavedProof(), appOrigin);

    expect(isSavedProofVisibleForDraft(proofResult, " Posting   with VeriPost ")).toBe(true);
  });

  it("hides a saved proof for a different draft", () => {
    const proofResult = parseSavedProofResult(makeSavedProof(), appOrigin);

    expect(isSavedProofVisibleForDraft(proofResult, "A different post")).toBe(false);
  });
});
