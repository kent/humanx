// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const idkitRequestMock = vi.hoisted(() => vi.fn());
const proofOfHumanMock = vi.hoisted(() => vi.fn((input: unknown) => ({
  credential_type: "proof_of_human",
  input,
})));

vi.mock("@worldcoin/idkit-core", () => ({
  IDKit: {
    request: idkitRequestMock,
  },
  proofOfHuman: proofOfHumanMock,
}));

import { requestNativeWorldIdKitProof } from "@/lib/world-idkit-client";

const idkitResult = {
  protocol_version: "4.0",
  nonce: "0x2222222222222222222222222222222222222222222222222222222222222222",
  action: "veripost-tweet-proof",
  environment: "production",
  responses: [{
    identifier: "proof_of_human",
    signal_hash: "0x3333333333333333333333333333333333333333333333333333333333333333",
    nullifier: "0x1111111111111111111111111111111111111111111111111111111111111111",
    proof: ["0x1", "0x2", "0x3", "0x4", "0x5"],
    issuer_schema_id: 1,
    expires_at_min: 1_800_000_000,
  }],
};

describe("World IDKit client", () => {
  beforeEach(() => {
    idkitRequestMock.mockReset();
    proofOfHumanMock.mockClear();
    Object.defineProperty(window, "WorldApp", {
      configurable: true,
      value: {
        supported_commands: [
          { name: "verify", supported_versions: [2] },
        ],
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(window, "WorldApp");
    Reflect.deleteProperty(window, "__veripostAllowNativeWorldIdkitVerifyUntil");
  });

  it("allows legacy proof fallback without requiring optional user-presence metadata", async () => {
    idkitRequestMock.mockReturnValueOnce({
      preset: vi.fn(async () => ({
        connectorURI: "",
        pollUntilCompletion: vi.fn(async () => ({
          success: true,
          result: idkitResult,
        })),
      })),
    });

    await expect(
      requestNativeWorldIdKitProof({
        action: "veripost-tweet-proof",
        appId: "app_dc56f8eecb48c4d395981ec1ca5c6329",
        environment: "production",
        rpContext: {
          rp_id: "rp_123",
          nonce: "0x2222222222222222222222222222222222222222222222222222222222222222",
          created_at: 1_800_000_000,
          expires_at: 1_800_000_180,
          signature: "0x" + "4".repeat(130),
        },
        signal: "veripost:v1:" + "a".repeat(64),
      }),
    ).resolves.toBe(idkitResult);

    const requestConfig = idkitRequestMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(requestConfig).not.toHaveProperty("require_user_presence");
    expect(idkitRequestMock).toHaveBeenCalledWith(expect.objectContaining({
      allow_legacy_proofs: true,
      environment: "production",
    }));
  });
});
