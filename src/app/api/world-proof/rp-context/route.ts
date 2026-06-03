import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getRequestOrigin,
  getWorldServerConfig,
} from "@/lib/config";
import { errorResponse } from "@/lib/http";
import { buildBoundSignal, issueBindingNonce } from "@/lib/proof-binding";
import { rateLimitRequest } from "@/lib/rate-limit";
import { assertJsonRequest, assertSameOriginRequest } from "@/lib/request-security";
import { validatePostText } from "@/lib/text";
import { createWorldIdKitRpContext } from "@/lib/world-idkit-server";
import { verifyPostedTweet } from "@/lib/x-tweet";
import {
  WORLD_MINIAPP_AUTH_FLOW,
  WORLD_MINIAPP_AUTH_HEADER,
} from "@/lib/world-miniapp-auth";

export const runtime = "nodejs";

const rpContextRequestSchema = z.object({
  draftText: z.string(),
  tweetUrl: z.string().trim().min(1).max(400),
}).strict();

export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOriginRequest(request, {
      allowMissingProvenanceHeader: {
        name: WORLD_MINIAPP_AUTH_HEADER,
        value: WORLD_MINIAPP_AUTH_FLOW,
      },
    });
    assertJsonRequest(request, 16_384);
    rateLimitRequest(request, "world-idkit:rp-context", { limit: 20, windowMs: 60_000 });

    const body = rpContextRequestSchema.parse(await request.json());
    const text = validatePostText(body.draftText);
    if (!text.ok) {
      return NextResponse.json({
        error: {
          code: text.code,
          message: text.message,
        },
      }, { status: 400 });
    }

    // Verify the tweet exists, was authored by the handle in its link, and that
    // its text matches the post being proved. Only then mint a binding nonce
    // sealing (draftHash, handle, tweetId) for the World ID proof to commit to.
    const verifiedTweet = await verifyPostedTweet(body.tweetUrl, text.normalized, {
      requireTextMatch: true,
    });

    const bindingNonce = issueBindingNonce({
      draftHash: text.draftHash,
      xHandle: verifiedTweet.handle,
      tweetId: verifiedTweet.tweetId,
    });

    const config = getWorldServerConfig(getRequestOrigin(request));
    return NextResponse.json({
      rpContext: createWorldIdKitRpContext(config),
      bindingNonce,
      signal: buildBoundSignal(bindingNonce),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
