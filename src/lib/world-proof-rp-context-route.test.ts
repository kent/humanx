import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyPostedTweetMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/x-tweet", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/x-tweet")>();
  return { ...actual, verifyPostedTweet: verifyPostedTweetMock };
});

import { POST } from "@/app/api/world-proof/rp-context/route";
import { resetRateLimitsForTests } from "@/lib/rate-limit";

function rpContextRequest(body: Record<string, unknown>): Request {
  return new Request("https://veripost.io/api/world-proof/rp-context", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://veripost.io",
      "x-veripost-world-app-flow": "idkit-native",
    },
    body: JSON.stringify({ tweetUrl: "https://x.com/kentf/status/1", ...body }),
  });
}

beforeEach(() => {
  resetRateLimitsForTests();
  verifyPostedTweetMock.mockReset();
  verifyPostedTweetMock.mockResolvedValue({
    handle: "kentf",
    tweetId: "1",
    tweetText: "hello from World App",
    textMatches: true,
  });
  process.env.NEXT_PUBLIC_WORLD_APP_ID = "app_123";
  process.env.WORLD_ID_RP_ID = "rp_123";
  process.env.WORLD_ID_RP_SIGNING_KEY = "1".repeat(64);
  process.env.NEXT_PUBLIC_APP_URL = "https://veripost.io";
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_WORLD_APP_ID;
  delete process.env.WORLD_ID_RP_ID;
  delete process.env.WORLD_ID_RP_SIGNING_KEY;
  delete process.env.NEXT_PUBLIC_APP_URL;
});

describe("World proof RP context route", () => {
  it("returns a signed RP context, binding nonce, and bound signal for a verified tweet", async () => {
    const response = await POST(rpContextRequest({ draftText: "hello from World App" }));

    expect(response.status).toBe(200);
    const payload = await response.json() as {
      rpContext: { rp_id: string; nonce: string; signature: string };
      bindingNonce: string;
      signal: string;
    };
    expect(payload.rpContext).toMatchObject({ rp_id: "rp_123" });
    expect(payload.rpContext.nonce).toMatch(/^0x[0-9a-f]{64}$/i);
    expect(payload.rpContext.signature).toMatch(/^0x[0-9a-f]{130}$/i);
    expect(payload.bindingNonce).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(payload.signal).toMatch(/^veripost:v2:[0-9a-f]{64}$/);
    expect(JSON.stringify(payload)).not.toContain(process.env.WORLD_ID_RP_SIGNING_KEY);
  });

  it("rejects invalid draft text before verifying the tweet", async () => {
    const response = await POST(rpContextRequest({ draftText: "" }));

    await expect(response.json()).resolves.toMatchObject({ error: { code: "empty_text" } });
    expect(response.status).toBe(400);
    expect(verifyPostedTweetMock).not.toHaveBeenCalled();
  });

  it("fails closed when RP credentials are missing", async () => {
    delete process.env.WORLD_ID_RP_ID;

    const response = await POST(rpContextRequest({ draftText: "hello from World App" }));

    await expect(response.json()).resolves.toMatchObject({ error: { code: "configuration_error" } });
    expect(response.status).toBe(503);
  });
});
