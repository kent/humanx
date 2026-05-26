import { hashSignal } from "@worldcoin/idkit/hashing";
import { describe, expect, it } from "vitest";

import { assertIdKitSignal, extractNullifier, hashSignalToField, nullifierToDecimal } from "@/lib/world";

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
        hashSignalToField("expected"),
      ),
    ).toThrow("proof does not match");
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
