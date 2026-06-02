import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/proofs/route";
import { ApiError } from "@/lib/http";
import { resetRateLimitsForTests } from "@/lib/rate-limit";

const createOrRefreshProofMock = vi.hoisted(() => vi.fn());
const verifyWorldIdKitProofMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/proofs", () => ({
  createOrRefreshProof: createOrRefreshProofMock,
}));

vi.mock("@/lib/world-idkit-server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/world-idkit-server")>();
  return {
    ...actual,
    verifyWorldIdKitProof: verifyWorldIdKitProofMock,
  };
});

const idkitNullifier = "0x1111111111111111111111111111111111111111111111111111111111111111";
const idkitResponse = {
  protocol_version: "4.0",
  nonce: "0x2222222222222222222222222222222222222222222222222222222222222222",
  action: "veripost-tweet-proof",
  environment: "production",
  user_presence_completed: true,
  responses: [{
    identifier: "proof_of_human",
    signal_hash: "0x3333333333333333333333333333333333333333333333333333333333333333",
    nullifier: idkitNullifier,
    proof: ["0x1", "0x2", "0x3", "0x4", "0x5"],
    issuer_schema_id: 1,
    expires_at_min: 1_800_000_000,
  }],
};

function proofRequest(body: unknown, flow = "idkit-native"): Request {
  return new Request("https://veripost.io/api/proofs", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://veripost.io",
      "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) WorldApp",
      "x-veripost-runtime-session": "runtime-session-1234",
      "x-veripost-world-app-flow": flow,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  resetRateLimitsForTests();
  createOrRefreshProofMock.mockReset();
  verifyWorldIdKitProofMock.mockReset();
  vi.spyOn(console, "info").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.NEXT_PUBLIC_WORLD_APP_ID;
  delete process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.WORLD_ID_RP_ID;
  delete process.env.WORLD_ID_RP_SIGNING_KEY;
  delete process.env.VERCEL_ENV;
  delete process.env.WORLD_ID_ENVIRONMENT;
  delete process.env.DATABASE_URL;
});

describe("proof route rejection diagnostics", () => {
  it("logs redacted proof request rejection metadata without proof or draft fields", async () => {
    const response = await POST(
      proofRequest({
        draftText: "hello from World App",
        idkitResponse: {
          ...idkitResponse,
          responses: [],
        },
      }),
    );

    expect(response.status).toBe(400);
    expect(console.info).toHaveBeenCalledTimes(1);
    const [, serializedEvent] = vi.mocked(console.info).mock.calls[0] as [string, string];
    const loggedEvent = JSON.parse(serializedEvent) as {
      code: string;
      status: number;
      request: {
        provenance: { accountContext: boolean; origin: string };
        runtimeSessionId: string;
        userAgent: { worldApp: boolean; ios: boolean; mobile: boolean };
      };
    };

    expect(loggedEvent).toMatchObject({
      code: "invalid_request",
      status: 400,
      request: {
        runtimeSessionId: "runtime-session-1234",
        provenance: {
          accountContext: true,
          origin: "same",
        },
        userAgent: {
          worldApp: true,
          ios: true,
          mobile: true,
        },
      },
    });
    expect(serializedEvent).not.toContain(idkitNullifier);
    expect(serializedEvent).not.toContain("hello from World App");
    expect(serializedEvent).not.toContain("worldMiniAppWalletAuth");
    expect(serializedEvent).not.toContain("idkitResponse");
    expect(serializedEvent).not.toContain("signature");
    expect(serializedEvent).not.toContain("Mozilla/5.0");
  });

  it("creates proofs from native in-app IDKit results without redirect auth", async () => {
    process.env.NEXT_PUBLIC_WORLD_APP_ID = "app_123";
    process.env.WORLD_ID_RP_ID = "rp_123";
    process.env.WORLD_ID_RP_SIGNING_KEY = "1".repeat(64);
    process.env.NEXT_PUBLIC_APP_URL = "https://veripost.io";
    process.env.VERCEL_ENV = "production";
    process.env.DATABASE_URL = "postgres://veripost:test@localhost:5432/veripost";
    verifyWorldIdKitProofMock.mockResolvedValue({
      nullifierDecimal: "123",
      verifiedAt: "2026-05-31T12:00:00.000Z",
      resultCode: "world_idkit_v4_proof_of_human",
    });
    createOrRefreshProofMock.mockResolvedValue({
      proof: {
        id: "vp_idkit",
        draftText: "hello from World App",
        createdAt: "2026-05-31T12:00:01.000Z",
        proofCommitment: "a".repeat(64),
      },
      createdNew: true,
    });

    const response = await POST(
      proofRequest({
        draftText: "hello from World App",
        idkitResponse,
      }),
    );

    await expect(response.json()).resolves.toMatchObject({
      proof: {
        id: "vp_idkit",
      },
      proofUrl: "https://veripost.io/proof/vp_idkit",
      createdNew: true,
    });
    expect(response.status).toBe(200);
    expect(console.info).toHaveBeenCalledWith(
      "world_proof_created",
      expect.stringContaining('"runtimeSessionId":"runtime-session-1234"'),
    );
    const [, serializedEvent] = vi.mocked(console.info).mock.calls[0] as [string, string];
    expect(serializedEvent).not.toContain(idkitNullifier);
    expect(serializedEvent).not.toContain("hello from World App");
    expect(verifyWorldIdKitProofMock).toHaveBeenCalledWith(
      expect.objectContaining({ appId: "app_123", rpId: "rp_123" }),
      idkitResponse,
      expect.stringMatching(/^veripost:v1:/),
    );
    expect(createOrRefreshProofMock).toHaveBeenCalledWith(expect.objectContaining({
      nullifierDecimal: "123",
      worldVerification: {
        verifiedAt: "2026-05-31T12:00:00.000Z",
        resultCode: "world_idkit_v4_proof_of_human",
      },
    }));
  });

  it("rejects stale account-context payloads instead of creating proofs", async () => {
    process.env.NEXT_PUBLIC_WORLD_APP_ID = "app_123";

    const response = await POST(
      proofRequest({
        draftText: "hello from World App",
        worldAppAccount: {
          wallet_address: "0x1111111111111111111111111111111111111111",
        },
      }, "account-context"),
    );

    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "invalid_request",
      },
    });
    expect(response.status).toBe(400);
    expect(verifyWorldIdKitProofMock).not.toHaveBeenCalled();
    expect(createOrRefreshProofMock).not.toHaveBeenCalled();
  });

  it("checks World ID proof verification before proof storage", async () => {
    process.env.NEXT_PUBLIC_WORLD_APP_ID = "app_123";
    process.env.WORLD_ID_RP_ID = "rp_123";
    process.env.WORLD_ID_RP_SIGNING_KEY = "1".repeat(64);
    verifyWorldIdKitProofMock.mockRejectedValue(
      new ApiError(403, "world_id_proof_invalid", "World ID proof could not be verified."),
    );

    const response = await POST(
      proofRequest({
        draftText: "hello from World App",
        idkitResponse,
      }),
    );

    await expect(response.json()).resolves.toEqual({
      error: {
        code: "world_id_proof_invalid",
        message: "World ID proof could not be verified.",
      },
    });
    expect(response.status).toBe(403);
    expect(verifyWorldIdKitProofMock).toHaveBeenCalledOnce();
    expect(createOrRefreshProofMock).not.toHaveBeenCalled();
  });
});
