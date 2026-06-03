import { NextResponse } from "next/server";

import { getRequestOrigin } from "@/lib/config";
import { errorResponse } from "@/lib/http";
import { getPublicProof, getPublicProofByTweetId, type PublicProof } from "@/lib/proofs";
import { rateLimitRequest } from "@/lib/rate-limit";
import { canonicalTweetUrl, parseTweetUrl, verifyPostedTweet } from "@/lib/x-tweet";

export const runtime = "nodejs";

// Public, machine-readable verification. Given a tweet URL (or proof id) it
// answers: does a VeriPost proof exist for this exact post, by this exact X
// account, with matching text? Third parties call this instead of trusting a
// "verified" badge or a screenshot. Domain-anchored: the answer is only
// authoritative when served from the real veripost.io.
export async function GET(request: Request): Promise<NextResponse> {
  try {
    rateLimitRequest(request, "verify:read", { limit: 60, windowMs: 60_000 });

    const url = new URL(request.url);
    const tweetParam = url.searchParams.get("tweet")?.trim();
    const idParam = url.searchParams.get("id")?.trim();
    const origin = getRequestOrigin(request);

    let proof: PublicProof | null = null;
    let tweetId: string | null = null;

    if (tweetParam) {
      const parsed = parseTweetUrl(tweetParam);
      if (!parsed) {
        return NextResponse.json(
          { verified: false, reason: "tweet_url_invalid" },
          { status: 400 },
        );
      }
      tweetId = parsed.tweetId;
      proof = await getPublicProofByTweetId(parsed.tweetId);
    } else if (idParam) {
      proof = await getPublicProof(idParam);
      tweetId = proof?.tweetId ?? null;
    } else {
      return NextResponse.json(
        { verified: false, reason: "missing_query", hint: "Pass ?tweet=<x.com link> or ?id=<proof id>" },
        { status: 400 },
      );
    }

    if (!proof || !proof.tweetId) {
      return NextResponse.json({
        verified: false,
        reason: "no_proof_for_tweet",
        tweetId,
      });
    }

    // Live cross-check against X so verification reflects current truth (author
    // + text), not just what was stored. Failures degrade to a stored-only answer.
    let liveAuthorMatches: boolean | null = null;
    let liveTextMatches: boolean | null = null;
    try {
      const live = await verifyPostedTweet(canonicalTweetUrl({ handle: proof.xHandle ?? "", tweetId: proof.tweetId }), proof.draftText, {
        requireTextMatch: false,
      });
      liveAuthorMatches = live.handle === proof.xHandle;
      liveTextMatches = live.textMatches;
    } catch {
      liveAuthorMatches = null;
      liveTextMatches = null;
    }

    const verified = liveAuthorMatches !== false && liveTextMatches !== false;

    return NextResponse.json({
      verified,
      proofId: proof.id,
      proofUrl: `${origin}/proof/${proof.id}`,
      xHandle: proof.xHandle ?? null,
      tweetId: proof.tweetId,
      tweetUrl: proof.xHandle ? canonicalTweetUrl({ handle: proof.xHandle, tweetId: proof.tweetId }) : null,
      postText: proof.draftText,
      draftHash: proof.draftHash,
      proofCommitment: proof.proofCommitment,
      createdAt: proof.createdAt,
      liveCheck: {
        attempted: liveAuthorMatches !== null || liveTextMatches !== null,
        authorMatches: liveAuthorMatches,
        textMatches: liveTextMatches,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
