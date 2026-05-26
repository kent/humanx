import { describe, expect, it } from "vitest";

import { buildXIntentUrl } from "@/lib/x";
import { isSavedProofVisibleForDraft, parseSavedProofResult } from "@/lib/saved-proof";

const appOrigin = "https://veripost.io";
const proofUrl = `${appOrigin}/proof/vp_123`;

function makeSavedProof(overrides: Record<string, unknown> = {}) {
  const proof = {
    id: "vp_123",
    draftText: "Posting with VeriPost",
    createdAt: "2026-05-26T16:00:00.000Z",
    proofCommitment: "a".repeat(64),
    xUsername: "alice",
  };

  return {
    proof,
    proofUrl,
    tweetIntentUrl: buildXIntentUrl(proof.draftText, proofUrl),
    createdNew: true,
    ...overrides,
  };
}

describe("saved proof parsing", () => {
  it("accepts saved proofs with matching same-origin proof and X intent URLs", () => {
    expect(parseSavedProofResult(makeSavedProof(), appOrigin)).toEqual(makeSavedProof());
  });

  it("normalizes saved X usernames", () => {
    expect(
      parseSavedProofResult(
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
      )?.proof.xUsername,
    ).toBe("alice");
  });

  it("rejects malformed proof payloads", () => {
    expect(parseSavedProofResult({ proofUrl, tweetIntentUrl: buildXIntentUrl("hello", proofUrl) }, appOrigin)).toBeNull();
    expect(parseSavedProofResult(makeSavedProof({ createdNew: "true" }), appOrigin)).toBeNull();
  });

  it("rejects proof URLs outside the app origin", () => {
    expect(parseSavedProofResult(makeSavedProof({ proofUrl: "https://evil.example/proof/vp_123" }), appOrigin)).toBeNull();
  });

  it("rejects tweet intents that do not match the saved proof", () => {
    expect(
      parseSavedProofResult(
        makeSavedProof({
          tweetIntentUrl: buildXIntentUrl("Different text", proofUrl),
        }),
        appOrigin,
      ),
    ).toBeNull();
  });
});

describe("saved proof visibility", () => {
  it("shows a saved proof for the same user when the compose box is empty", () => {
    const proofResult = parseSavedProofResult(makeSavedProof(), appOrigin);

    expect(isSavedProofVisibleForDraft(proofResult, "@Alice", "")).toBe(true);
  });

  it("shows a saved proof when the current draft still matches after normalization", () => {
    const proofResult = parseSavedProofResult(makeSavedProof(), appOrigin);

    expect(isSavedProofVisibleForDraft(proofResult, "alice", " Posting   with VeriPost ")).toBe(true);
  });

  it("hides a saved proof for a different draft or X account", () => {
    const proofResult = parseSavedProofResult(makeSavedProof(), appOrigin);

    expect(isSavedProofVisibleForDraft(proofResult, "alice", "A different post")).toBe(false);
    expect(isSavedProofVisibleForDraft(proofResult, "bob", "")).toBe(false);
  });
});
