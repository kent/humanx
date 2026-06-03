import { hashSignal } from "@worldcoin/idkit-core/hashing";
import { describe, expect, it, vi } from "vitest";

import type { WorldServerConfig } from "@/lib/config";
import {
  createWorldIdKitRpContext,
  verifyWorldIdKitProof,
} from "@/lib/world-idkit-server";

const config = {
  appId: "app_123",
  rpId: "rp_123",
  rpSigningKey: "1".repeat(64),
  action: "veripost-tweet-proof",
  environment: "production",
  appUrl: "https://veripost.io",
  supportEmail: "support@veripost.io",
} satisfies WorldServerConfig;

const signal = `veripost:v1:${"a".repeat(64)}`;
const nullifier = "0x1111111111111111111111111111111111111111111111111111111111111111";

function successfulVerifierResponse(): Response {
  return new Response(JSON.stringify({ success: true }), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}

function idkitResult(overrides: Record<string, unknown> = {}) {
  return {
    protocol_version: "4.0",
    nonce: "0x2222222222222222222222222222222222222222222222222222222222222222",
    action: config.action,
    environment: config.environment,
    user_presence_completed: true,
    responses: [{
      identifier: "proof_of_human",
      signal_hash: hashSignal(signal),
      nullifier,
      proof: ["0x1", "0x2", "0x3", "0x4", "0x5"],
      issuer_schema_id: 1,
      expires_at_min: 1_800_000_000,
    }],
    ...overrides,
  };
}

describe("World IDKit server helpers", () => {
  it("creates signed RP context without exposing the signing key", () => {
    const rpContext = createWorldIdKitRpContext(config);

    expect(rpContext.rp_id).toBe("rp_123");
    expect(rpContext.nonce).toMatch(/^0x[0-9a-f]{64}$/i);
    expect(rpContext.signature).toMatch(/^0x[0-9a-f]{130}$/i);
    expect(rpContext.expires_at - rpContext.created_at).toBe(180);
    expect(JSON.stringify(rpContext)).not.toContain(config.rpSigningKey);
  });

  it("verifies the IDKit result against World developer verification before storage", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return successfulVerifierResponse();
    });

    const result = await verifyWorldIdKitProof(config, idkitResult(), signal, { fetcher });

    expect(result).toMatchObject({
      nullifierDecimal: BigInt(nullifier).toString(10),
      resultCode: "world_idkit_v4_proof_of_human",
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://developer.world.org/api/v4/verify/rp_123",
      expect.objectContaining({
        method: "POST",
        headers: { "content-type": "application/json" },
      }),
    );
    const call = fetcher.mock.calls[0];
    if (!call) throw new Error("World verifier was not called.");
    const init = call[1] as RequestInit;
    const body = JSON.parse(String(init.body)) as { responses: Array<{ nullifier?: string }> };
    expect(body.responses[0]?.nullifier).toBe(nullifier);
  });

  it("accepts valid native IDKit results without the optional user-presence flag", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return successfulVerifierResponse();
    });
    const withoutUserPresence = idkitResult();
    delete (withoutUserPresence as { user_presence_completed?: unknown }).user_presence_completed;

    await expect(
      verifyWorldIdKitProof(config, withoutUserPresence, signal, { fetcher }),
    ).resolves.toMatchObject({
      nullifierDecimal: BigInt(nullifier).toString(10),
      resultCode: "world_idkit_v4_proof_of_human",
    });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("accepts valid native IDKit results when user presence is reported false", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return successfulVerifierResponse();
    });

    await expect(
      verifyWorldIdKitProof(config, idkitResult({ user_presence_completed: false }), signal, { fetcher }),
    ).resolves.toMatchObject({
      nullifierDecimal: BigInt(nullifier).toString(10),
    });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("rejects signal mismatches before calling the World verifier", async () => {
    const fetcher = vi.fn();

    await expect(
      verifyWorldIdKitProof(
        config,
        idkitResult({
          responses: [{
            identifier: "proof_of_human",
            signal_hash: hashSignal("different-post"),
            nullifier,
          }],
        }),
        signal,
        { fetcher },
      ),
    ).rejects.toThrow("different post");

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects legacy World ID proof versions before calling the World verifier", async () => {
    const fetcher = vi.fn();

    await expect(
      verifyWorldIdKitProof(
        config,
        idkitResult({
          protocol_version: "3.0",
        }),
        signal,
        { fetcher },
      ),
    ).rejects.toThrow();

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects failed World verifier responses", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return new Response(JSON.stringify({ success: false, code: "invalid_proof" }), {
        headers: { "content-type": "application/json" },
        status: 403,
      });
    });

    await expect(
      verifyWorldIdKitProof(config, idkitResult(), signal, { fetcher }),
    ).rejects.toThrow("could not be verified");
  });
});
