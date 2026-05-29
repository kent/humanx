import { hashSignal } from "@worldcoin/idkit/hashing";
import { describe, expect, it } from "vitest";

import {
  assertIdKitSignal,
  extractNullifier,
  hashSignalToField,
  nullifierToDecimal,
  verifyWorldProof,
} from "@/lib/world";

const config = {
  appId: "app_123",
  rpId: "rp_123",
  rpSigningKey: "0x" + "1".repeat(64),
  action: "veripost-tweet-proof",
  environment: "production" as const,
  appUrl: "https://veripost.io",
  supportEmail: "support@veripost.io",
};

describe("World ID signal binding", () => {
  it("matches the IDKit hashSignal helper", () => {
    const signal = "veripost:v1:9adcc7206d8d990e9c1fe713ab7aeea18c5f1cb87ff88f1d06b5b2d351b4f924";

    expect(hashSignalToField(signal)).toBe(hashSignal(signal));
  });

  it("rejects mismatched IDKit signal hashes", () => {
    expect(() =>
      assertIdKitSignal(
        {
          protocol_version: "4.0",
          nonce: "0xabc",
          action: "veripost-tweet-proof",
          environment: "production",
          responses: [
            {
              identifier: "proof_of_human",
              signal_hash: hashSignalToField("different"),
              proof: ["0x1", "0x2", "0x3", "0x4", "0x5"],
              nullifier: "0x1",
              issuer_schema_id: 1,
              expires_at_min: 0,
            },
          ],
        },
        "veripost-tweet-proof",
        "production",
        hashSignalToField("expected"),
      ),
    ).toThrow("proof does not match");
  });

  it("rejects legacy v3 proofs for post proof creation", () => {
    const signalHash = hashSignalToField("expected");

    expect(() =>
      assertIdKitSignal(
        {
          protocol_version: "3.0",
          nonce: "0xabc",
          action: "veripost-tweet-proof",
          environment: "production",
          responses: [
            {
              identifier: "proof_of_human",
              signal_hash: signalHash,
              proof: "0xproof",
              merkle_root: "0x1",
              nullifier: "0x1",
            },
          ],
        },
        "veripost-tweet-proof",
        "production",
        signalHash,
      ),
    ).toThrow("proof response type is not accepted");
  });

  it("rejects proofs from the wrong action or environment", () => {
    const signalHash = hashSignalToField("expected");

    expect(() =>
      assertIdKitSignal(
        {
          protocol_version: "4.0",
          nonce: "0xabc",
          action: "other-action",
          environment: "production",
          responses: [
            {
              identifier: "proof_of_human",
              signal_hash: signalHash,
              proof: ["0x1", "0x2", "0x3", "0x4", "0x5"],
              nullifier: "0x1",
              issuer_schema_id: 1,
              expires_at_min: 0,
            },
          ],
        },
        "veripost-tweet-proof",
        "production",
        signalHash,
      ),
    ).toThrow("different action");

    expect(() =>
      assertIdKitSignal(
        {
          protocol_version: "4.0",
          nonce: "0xabc",
          action: "veripost-tweet-proof",
          environment: "staging",
          responses: [
            {
              identifier: "proof_of_human",
              signal_hash: signalHash,
              proof: ["0x1", "0x2", "0x3", "0x4", "0x5"],
              nullifier: "0x1",
              issuer_schema_id: 1,
              expires_at_min: 0,
            },
          ],
        },
        "veripost-tweet-proof",
        "production",
        signalHash,
      ),
    ).toThrow("different environment");
  });

  it("rejects mixed response payloads that could decouple text binding from the verified credential", () => {
    const expectedSignalHash = hashSignalToField("expected");

    expect(() =>
      assertIdKitSignal(
        {
          protocol_version: "4.0",
          nonce: "0xabc",
          action: "veripost-tweet-proof",
          environment: "production",
          responses: [
            {
              identifier: "proof_of_human",
              signal_hash: expectedSignalHash,
              proof: ["0x1", "0x2", "0x3", "0x4", "0x5"],
              nullifier: "0x1",
              issuer_schema_id: 1,
              expires_at_min: 0,
            },
            {
              identifier: "proof_of_human",
              signal_hash: hashSignalToField("different"),
              proof: ["0x1", "0x2", "0x3", "0x4", "0x5"],
              nullifier: "0x2",
              issuer_schema_id: 1,
              expires_at_min: 0,
            },
          ],
        },
        "veripost-tweet-proof",
        "production",
        expectedSignalHash,
      ),
    ).toThrow("exactly one credential");
  });

  it("rejects session proofs and unsupported credentials for post proof creation", () => {
    const signalHash = hashSignalToField("expected");

    expect(() =>
      assertIdKitSignal(
        {
          protocol_version: "4.0",
          nonce: "0xabc",
          session_id: "session_123",
          environment: "production",
          responses: [
            {
              identifier: "proof_of_human",
              signal_hash: signalHash,
              proof: ["0x1", "0x2", "0x3", "0x4", "0x5"],
              session_nullifier: ["0x1", "0x2"],
              issuer_schema_id: 1,
              expires_at_min: 0,
            },
          ],
        },
        "veripost-tweet-proof",
        "production",
        signalHash,
      ),
    ).toThrow("Session proofs");

    expect(() =>
      assertIdKitSignal(
        {
          protocol_version: "4.0",
          nonce: "0xabc",
          action: "veripost-tweet-proof",
          environment: "production",
          responses: [
            {
              identifier: "face",
              signal_hash: signalHash,
              proof: ["0x1", "0x2", "0x3", "0x4", "0x5"],
              nullifier: "0x1",
              issuer_schema_id: 11,
              expires_at_min: 0,
            },
          ],
        },
        "veripost-tweet-proof",
        "production",
        signalHash,
      ),
    ).toThrow("credential is not accepted");
  });

  it("extracts and normalizes nullifiers", () => {
    expect(nullifierToDecimal("0x0f")).toBe("15");
    expect(nullifierToDecimal("42")).toBe("42");
    expect(
      extractNullifier({
        protocol_version: "4.0",
        nonce: "0xabc",
        action: "veripost-tweet-proof",
        environment: "production",
        responses: [
          {
            identifier: "proof_of_human",
            proof: ["0x1", "0x2", "0x3", "0x4", "0x5"],
            nullifier: "0x2a",
            issuer_schema_id: 1,
            expires_at_min: 0,
          },
        ],
      }),
    ).toBe("0x2a");
  });
});

describe("World verifier response handling", () => {
  const payload = {
    protocol_version: "4.0",
    nonce: "0xabc",
    action: "veripost-tweet-proof",
    environment: "production",
    responses: [
      {
        identifier: "proof_of_human",
        signal_hash: hashSignalToField("expected"),
        proof: ["0x1", "0x2", "0x3", "0x4", "0x5"],
        nullifier: "0xdead",
        issuer_schema_id: 1,
        expires_at_min: 0,
      },
    ],
  };

  it("uses the verifier-returned nullifier instead of trusting the client payload", async () => {
    const fetchImpl = async () =>
      new Response(
        JSON.stringify({
          success: true,
          action: "veripost-tweet-proof",
          environment: "production",
          results: [{ identifier: "proof_of_human", success: true, nullifier: "0x2a", code: "success" }],
        }),
        { status: 200 },
      );

    await expect(verifyWorldProof(config, payload, fetchImpl as typeof fetch)).resolves.toMatchObject({
      nullifierDecimal: "42",
      resultCode: "success",
    });
  });

  it("rejects verifier success responses without a verifier nullifier", async () => {
    const fetchImpl = async () =>
      new Response(
        JSON.stringify({
          success: true,
          action: "veripost-tweet-proof",
          environment: "production",
          results: [{ identifier: "proof_of_human", success: true, code: "success" }],
        }),
        { status: 200 },
      );

    await expect(verifyWorldProof(config, payload, fetchImpl as typeof fetch)).rejects.toThrow("did not return a nullifier");
  });

  it("rejects verifier success for unsupported credentials or mismatched action context", async () => {
    const faceFetch = async () =>
      new Response(
        JSON.stringify({
          success: true,
          action: "veripost-tweet-proof",
          environment: "production",
          results: [{ identifier: "face", success: true, nullifier: "0x2a", code: "success" }],
        }),
        { status: 200 },
      );

    await expect(verifyWorldProof(config, payload, faceFetch as typeof fetch)).rejects.toThrow(
      "unsupported credential",
    );

    const wrongActionFetch = async () =>
      new Response(
        JSON.stringify({
          success: true,
          action: "other-action",
          environment: "production",
          results: [{ identifier: "proof_of_human", success: true, nullifier: "0x2a", code: "success" }],
        }),
        { status: 200 },
      );

    await expect(verifyWorldProof(config, payload, wrongActionFetch as typeof fetch)).rejects.toThrow(
      "different action",
    );
  });
});
