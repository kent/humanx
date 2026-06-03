import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getPublicProofByTweetIdMock = vi.hoisted(() => vi.fn());
const getPublicProofMock = vi.hoisted(() => vi.fn());
const verifyPostedTweetMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/proofs", () => ({
  getPublicProof: getPublicProofMock,
  getPublicProofByTweetId: getPublicProofByTweetIdMock,
}));

vi.mock("@/lib/x-tweet", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/x-tweet")>();
  return { ...actual, verifyPostedTweet: verifyPostedTweetMock };
});

import { GET } from "@/app/api/proof-check/route";
import { resetRateLimitsForTests } from "@/lib/rate-limit";

function request(query: string): Request {
  return new Request(`https://veripost.io/api/proof-check${query}`);
}

const boundProof = {
  id: "vp_abc",
  draftText: "Hello verified human world.",
  draftHash: "a".repeat(64),
  proofCommitment: "b".repeat(64),
  createdAt: "2026-06-03T00:00:00.000Z",
  xHandle: "kentf",
  tweetId: "100",
};

beforeEach(() => {
  resetRateLimitsForTests();
  getPublicProofByTweetIdMock.mockReset();
  getPublicProofMock.mockReset();
  verifyPostedTweetMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("proof-check verifier route", () => {
  it("requires a tweet or id query", async () => {
    const response = await GET(request(""));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ reason: "missing_query" });
  });

  it("rejects an unparseable tweet URL", async () => {
    const response = await GET(request("?tweet=https://x.com/kentf"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ reason: "tweet_url_invalid" });
  });

  it("reports no proof when the tweet has none", async () => {
    getPublicProofByTweetIdMock.mockResolvedValue(null);
    const response = await GET(request("?tweet=https://x.com/kentf/status/100"));
    await expect(response.json()).resolves.toMatchObject({
      verified: false,
      reason: "no_proof_for_tweet",
      tweetId: "100",
    });
  });

  it("verifies a bound proof whose live tweet still matches", async () => {
    getPublicProofByTweetIdMock.mockResolvedValue(boundProof);
    verifyPostedTweetMock.mockResolvedValue({
      handle: "kentf",
      tweetId: "100",
      tweetText: boundProof.draftText,
      textMatches: true,
    });

    const response = await GET(request("?tweet=https://x.com/kentf/status/100"));
    await expect(response.json()).resolves.toMatchObject({
      verified: true,
      proofId: "vp_abc",
      xHandle: "kentf",
      tweetId: "100",
      postText: boundProof.draftText,
      liveCheck: { attempted: true, authorMatches: true, textMatches: true },
    });
  });

  it("marks unverified when the live tweet author no longer matches", async () => {
    getPublicProofByTweetIdMock.mockResolvedValue(boundProof);
    verifyPostedTweetMock.mockResolvedValue({
      handle: "imposter",
      tweetId: "100",
      tweetText: boundProof.draftText,
      textMatches: true,
    });

    const response = await GET(request("?tweet=https://x.com/kentf/status/100"));
    await expect(response.json()).resolves.toMatchObject({
      verified: false,
      liveCheck: { authorMatches: false },
    });
  });
});
