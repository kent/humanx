import { describe, expect, it } from "vitest";

import { buildXIntentUrl } from "@/lib/x";
import { parseSavedProofResult } from "@/lib/saved-proof";

const appOrigin = "https://humanx.example";
const proofUrl = `${appOrigin}/proof/hx_123`;

function makeSavedProof(overrides: Record<string, unknown> = {}) {
  const proof = {
    id: "hx_123",
    draftText: "Posting with HumanX",
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

  it("rejects malformed proof payloads", () => {
    expect(parseSavedProofResult({ proofUrl, tweetIntentUrl: buildXIntentUrl("hello", proofUrl) }, appOrigin)).toBeNull();
    expect(parseSavedProofResult(makeSavedProof({ createdNew: "true" }), appOrigin)).toBeNull();
  });

  it("rejects proof URLs outside the app origin", () => {
    expect(parseSavedProofResult(makeSavedProof({ proofUrl: "https://evil.example/proof/hx_123" }), appOrigin)).toBeNull();
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
