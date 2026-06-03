import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getRequestOrigin,
  getWorldServerConfig,
} from "@/lib/config";
import { ApiError, errorResponse } from "@/lib/http";
import { buildBoundSignal, issueBindingNonce } from "@/lib/proof-binding";
import { rateLimitRequest } from "@/lib/rate-limit";
import { assertJsonRequest, assertSameOriginRequest } from "@/lib/request-security";
import { validatePostText } from "@/lib/text";
import { createWorldIdKitRpContext } from "@/lib/world-idkit-server";
import { isXOAuthConfigured, readXSessionCookie, X_SESSION_COOKIE } from "@/lib/x-oauth";
import { verifyPostedTweet } from "@/lib/x-tweet";
import {
  WORLD_MINIAPP_AUTH_FLOW,
  WORLD_MINIAPP_AUTH_HEADER,
} from "@/lib/world-miniapp-auth";

export const runtime = "nodejs";

const rpContextRequestSchema = z.object({
  draftText: z.string(),
  tweetUrl: z.string().trim().min(1).max(400).optional(),
}).strict();

function readCookie(request: Request, name: string): string | undefined {
  const raw = request.headers.get("cookie") ?? "";
  const match = raw
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

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
      return NextResponse.json({ error: { code: text.code, message: text.message } }, { status: 400 });
    }

    let bindingNonce: string;
    if (isXOAuthConfigured()) {
      // Automated flow: the user has connected X; VeriPost will post the tweet
      // itself after the proof. Bind the OAuth-verified account (no tweet yet).
      const session = readXSessionCookie(readCookie(request, X_SESSION_COOKIE));
      if (!session) {
        throw new ApiError(401, "x_not_connected", "Connect your X account before creating a proof.");
      }
      bindingNonce = issueBindingNonce({
        draftHash: text.draftHash,
        xHandle: session.handle,
        xUserId: session.xUserId,
      });
    } else {
      // Fallback: the user posted manually and pasted the link; verify via oEmbed.
      if (!body.tweetUrl) {
        throw new ApiError(400, "tweet_url_required", "Paste the link to your X post.");
      }
      const verifiedTweet = await verifyPostedTweet(body.tweetUrl, text.normalized, {
        requireTextMatch: true,
      });
      bindingNonce = issueBindingNonce({
        draftHash: text.draftHash,
        xHandle: verifiedTweet.handle,
        tweetId: verifiedTweet.tweetId,
        xUserId: verifiedTweet.handle,
      });
    }

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
