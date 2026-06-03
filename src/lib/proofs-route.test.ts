import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/proofs/route";
import { ApiError } from "@/lib/http";
import { issueBindingNonce } from "@/lib/proof-binding";
import { resetRateLimitsForTests } from "@/lib/rate-limit";
import { hashDraftText, normalizePostText } from "@/lib/text";

const createOrRefreshProofMock = vi.hoisted(() => vi.fn());
const verifyWorldIdKitProofMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/proofs", () => ({
  createOrRefreshProof: createOrRefreshProofMock,
  createProofId: () => "vp_idkit",
}));

vi.mock("@/lib/world-idkit-server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/world-idkit-server")>();
  return {
    ...actual,
    verifyWorldIdKitProof: verifyWorldIdKitProofMock,
  };
});

const idkitNullifier = "0x1111111111111111111111111111111111111111111111111111111111111111";
const DRAFT = "hello from World App";
const TWEET_URL = "https://x.com/kentf/status/100";

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

const legacyIdkitResponse = {
  protocol_version: "3.0",
  nonce: "0x2222222222222222222222222222222222222222222222222222222222222222",
  action: "veripost-tweet-proof",
  environment: "production",
  user_presence_completed: true,
  responses: [{
    identifier: "proof_of_human",
    signal_hash: "0x3333333333333333333333333333333333333333333333333333333333333333",
    nullifier: idkitNullifier,
    proof: "0x1234",
    merkle_root: "0x5678",
  }],
};

// Build a valid binding nonce for the canonical (draft, tweet) used in tests.
function validBindingNonce(draft = DRAFT, handle = "kentf", tweetId = "100"): string {
  return issueBindingNonce({
    draftHash: hashDraftText(normalizePostText(draft)),
    xHandle: handle,
    tweetId,
    xUserId: handle,
  });
}

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

function validProofBody(idkit: unknown = idkitResponse): Record<string, unknown> {
  return {
    draftText: DRAFT,
    tweetUrl: TWEET_URL,
    bindingNonce: validBindingNonce(),
    idkitResponse: idkit,
  };
}

beforeEach(() => {
  resetRateLimitsForTests();
  createOrRefreshProofMock.mockReset();
  verifyWorldIdKitProofMock.mockReset();
  process.env.VERIPOST_BINDING_SECRET = "test-binding-secret";
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
  delete process.env.VERIPOST_BINDING_SECRET;
});

describe("proof route rejection diagnostics", () => {
  it("logs redacted proof request rejection metadata without proof or draft fields", async () => {
    const response = await POST(
      proofRequest(validProofBody({ ...idkitResponse, responses: [] })),
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
        provenance: { accountContext: true, origin: "same" },
        userAgent: { worldApp: true, ios: true, mobile: true },
      },
    });
    expect(serializedEvent).not.toContain(idkitNullifier);
    expect(serializedEvent).not.toContain(DRAFT);
    expect(serializedEvent).not.toContain("idkitResponse");
    expect(serializedEvent).not.toContain("Mozilla/5.0");
  });

  it("creates proofs bound to the tweet from native in-app IDKit results", async () => {
    process.env.NEXT_PUBLIC_WORLD_APP_ID = "app_123";
    process.env.WORLD_ID_RP_ID = "rp_123";
    process.env.WORLD_ID_RP_SIGNING_KEY = "1".repeat(64);
    process.env.NEXT_PUBLIC_APP_URL = "https://veripost.io";
    process.env.VERCEL_ENV = "production";
    process.env.DATABASE_URL = "postgres://veripost:test@localhost:5432/veripost";
    verifyWorldIdKitProofMock.mockResolvedValue({
      nullifierDecimal: "123",
      verifiedAt: "2026-05-31T12:00:00.000Z",
      resultCode: "world_idkit_v3_proof_of_human",
    });
    createOrRefreshProofMock.mockResolvedValue({
      proof: {
        id: "vp_idkit",
        draftText: DRAFT,
        createdAt: "2026-05-31T12:00:01.000Z",
        proofCommitment: "a".repeat(64),
        xHandle: "kentf",
        tweetId: "100",
      },
      createdNew: true,
    });

    const response = await POST(proofRequest(validProofBody(legacyIdkitResponse)));

    await expect(response.json()).resolves.toMatchObject({
      proof: { id: "vp_idkit" },
      proofUrl: "https://veripost.io/proof/vp_idkit",
      tweetUrl: "https://x.com/kentf/status/100",
      createdNew: true,
    });
    expect(response.status).toBe(200);
    const [, serializedEvent] = vi.mocked(console.info).mock.calls[0] as [string, string];
    expect(serializedEvent).not.toContain(idkitNullifier);
    expect(serializedEvent).not.toContain(DRAFT);
    // The proof is verified against the v2 bound signal, not a bare text hash.
    expect(verifyWorldIdKitProofMock).toHaveBeenCalledWith(
      expect.objectContaining({ appId: "app_123", rpId: "rp_123" }),
      legacyIdkitResponse,
      expect.stringMatching(/^veripost:v2:[0-9a-f]{64}$/),
    );
    expect(createOrRefreshProofMock).toHaveBeenCalledWith(expect.objectContaining({
      nullifierDecimal: "123",
      xHandle: "kentf",
      tweetId: "100",
    }));
  });

  it("rejects a binding nonce that does not match the submitted tweet", async () => {
    process.env.NEXT_PUBLIC_WORLD_APP_ID = "app_123";
    process.env.WORLD_ID_RP_ID = "rp_123";
    process.env.WORLD_ID_RP_SIGNING_KEY = "1".repeat(64);

    const response = await POST(
      proofRequest({
        draftText: DRAFT,
        tweetUrl: "https://x.com/someone_else/status/777",
        bindingNonce: validBindingNonce(), // sealed for kentf/100
        idkitResponse,
      }),
    );

    await expect(response.json()).resolves.toMatchObject({
      error: { code: "proof_binding_mismatch" },
    });
    expect(response.status).toBe(400);
    expect(verifyWorldIdKitProofMock).not.toHaveBeenCalled();
    expect(createOrRefreshProofMock).not.toHaveBeenCalled();
  });

  it("rejects stale account-context payloads instead of creating proofs", async () => {
    process.env.NEXT_PUBLIC_WORLD_APP_ID = "app_123";

    const response = await POST(
      proofRequest({
        draftText: DRAFT,
        worldAppAccount: { wallet_address: "0x1111111111111111111111111111111111111111" },
      }, "account-context"),
    );

    await expect(response.json()).resolves.toMatchObject({ error: { code: "invalid_request" } });
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

    const response = await POST(proofRequest(validProofBody()));

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
