import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import {
  assertProofStorageConfig,
  getRequestOrigin,
  getWorldServerConfig,
  missingWorldConfig,
} from "@/lib/config";
import { ApiError, errorResponse } from "@/lib/http";
import { buildBoundSignal, verifyBindingNonce } from "@/lib/proof-binding";
import { createOrRefreshProof, createProofId } from "@/lib/proofs";
import { rateLimitByIdentity, rateLimitRequest } from "@/lib/rate-limit";
import { assertJsonRequest, assertSameOriginRequest } from "@/lib/request-security";
import { validatePostText } from "@/lib/text";
import { hashSignalToField } from "@/lib/world-signal";
import {
  isXOAuthConfigured,
  postTweetAsUser,
  readXSessionCookie,
  X_SESSION_COOKIE,
} from "@/lib/x-oauth";
import { canonicalTweetUrl, parseTweetUrl } from "@/lib/x-tweet";
import { idKitResultSchema, verifyWorldIdKitProof } from "@/lib/world-idkit-server";
import {
  WORLD_MINIAPP_AUTH_FLOW,
  WORLD_MINIAPP_AUTH_HEADER,
} from "@/lib/world-miniapp-auth";

export const runtime = "nodejs";

const WORLD_RUNTIME_SESSION_HEADER = "x-veripost-runtime-session";

const worldIdKitProofSchema = z.object({
  draftText: z.string(),
  tweetUrl: z.string().trim().min(1).max(400).optional(),
  bindingNonce: z.string().trim().min(1).max(2_048),
  idkitResponse: idKitResultSchema,
}).strict();

const requestSchema = worldIdKitProofSchema;

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
    assertJsonRequest(request, 262_144);
    assertProofStorageConfig();

    const body = requestSchema.parse(await request.json());
    const text = validatePostText(body.draftText);
    if (!text.ok) {
      throw new ApiError(400, text.code, text.message);
    }
    rateLimitRequest(request, "proofs:create", { limit: 12, windowMs: 60_000 });

    const config = getWorldServerConfig(getRequestOrigin(request));
    const missingWorld = missingWorldConfig(config);
    if (missingWorld.length > 0) {
      throw new ApiError(503, "configuration_error", "World ID proof verification is not configured.", {
        missing: missingWorld,
      });
    }

    const signal = buildBoundSignal(body.bindingNonce);
    const signalHash = hashSignalToField(signal);
    const oauth = isXOAuthConfigured();

    // Resolve the X account this proof binds to and check the binding nonce.
    const session = oauth ? readXSessionCookie(readCookie(request, X_SESSION_COOKIE)) : null;
    const pastedTweet = body.tweetUrl ? parseTweetUrl(body.tweetUrl) : null;

    if (oauth) {
      if (!session) throw new ApiError(401, "x_not_connected", "Connect your X account before creating a proof.");
      verifyBindingNonce(body.bindingNonce, { draftHash: text.draftHash, xHandle: session.handle });
    } else {
      if (!pastedTweet) {
        throw new ApiError(400, "tweet_url_invalid", "Paste the link to your X post (x.com/<you>/status/…).");
      }
      verifyBindingNonce(body.bindingNonce, {
        draftHash: text.draftHash,
        xHandle: pastedTweet.handle,
        tweetId: pastedTweet.tweetId,
      });
    }

    // World ID is verified BEFORE anything is published. No proof, no post.
    const worldVerification = await verifyWorldIdKitProof(config, body.idkitResponse, signal);

    // Sybil bound: cap how many distinct posts one verified human can prove.
    rateLimitByIdentity(worldVerification.nullifierDecimal, "proofs:nullifier", {
      limit: 25,
      windowMs: 24 * 60 * 60 * 1000,
    });

    const proofId = createProofId();
    const proofUrl = `${config.appUrl}/proof/${proofId}`;

    // Automated flow: only now that World ID verified, post the tweet on the
    // user's behalf with the proof link embedded, and bind to the resulting id.
    let xHandle: string;
    let tweetId: string;
    if (oauth && session) {
      xHandle = session.handle;
      const posted = await postTweetAsUser(session.accessToken, `${text.normalized}\n\n${proofUrl}`);
      tweetId = posted.tweetId;
    } else if (pastedTweet) {
      xHandle = pastedTweet.handle;
      tweetId = pastedTweet.tweetId;
    } else {
      throw new ApiError(400, "tweet_url_invalid", "Paste the link to your X post.");
    }

    const result = await createOrRefreshProof({
      id: proofId,
      action: config.action,
      environment: config.environment,
      draftText: text.normalized,
      draftHash: text.draftHash,
      signal,
      signalHash,
      xHandle,
      tweetId,
      nullifierDecimal: worldVerification.nullifierDecimal,
      worldVerification: {
        verifiedAt: worldVerification.verifiedAt,
        resultCode: worldVerification.resultCode,
      },
    });

    logWorldProofCreated(request, result.createdNew, worldVerification.resultCode);

    const response = NextResponse.json({
      proof: result.proof,
      proofUrl: `${config.appUrl}/proof/${result.proof.id}`,
      tweetUrl: canonicalTweetUrl({ handle: xHandle, tweetId }),
      createdNew: result.createdNew,
    });
    return response;
  } catch (error) {
    logWorldProofRejection(request, error);
    return errorResponse(error);
  }
}

function logWorldProofCreated(request: Request, createdNew: boolean, resultCode: string): void {
  console.info(
    "world_proof_created",
    JSON.stringify({
      receivedAt: new Date().toISOString(),
      request: getProofRequestMetadata(request),
      createdNew,
      resultCode,
    }),
  );
}

type HeaderOriginState = "same" | "other" | "missing" | "invalid";

function logWorldProofRejection(request: Request, error: unknown): void {
  const rejection = getWorldProofRejection(error);
  if (!rejection) return;

  console.info(
    "world_proof_rejected",
    JSON.stringify({
      receivedAt: new Date().toISOString(),
      request: getProofRequestMetadata(request),
      ...rejection,
    }),
  );
}

function getWorldProofRejection(error: unknown): { status: number; code: string } | null {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      code: error.code,
    };
  }

  if (error instanceof ZodError) {
    return {
      status: 400,
      code: "invalid_request",
    };
  }

  return null;
}

function getProofRequestMetadata(request: Request) {
  const expectedOrigin = getExpectedOrigin(request);
  const userAgent = request.headers.get("user-agent") ?? "";

  return {
    provenance: {
      origin: classifyHeaderOrigin(request.headers.get("origin"), expectedOrigin),
      referer: classifyHeaderOrigin(request.headers.get("referer"), expectedOrigin),
      secFetchSite: safeFetchHeader(request.headers.get("sec-fetch-site")),
      secFetchMode: safeFetchHeader(request.headers.get("sec-fetch-mode")),
      secFetchDest: safeFetchHeader(request.headers.get("sec-fetch-dest")),
      accountContext: request.headers.get(WORLD_MINIAPP_AUTH_HEADER) === WORLD_MINIAPP_AUTH_FLOW,
    },
    userAgent: {
      worldApp: /world ?app|worldcoin/i.test(userAgent),
      ios: /iphone|ipad|ipod/i.test(userAgent),
      android: /android/i.test(userAgent),
      mobile: /mobile|iphone|ipad|ipod|android/i.test(userAgent),
      safari: /safari/i.test(userAgent) && !/chrome|chromium|crios|fxios/i.test(userAgent),
      chrome: /chrome|chromium|crios/i.test(userAgent),
    },
    runtimeSessionId: getRuntimeSessionId(request),
  };
}

function getExpectedOrigin(request: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
    : new URL(request.url).origin;
}

function classifyHeaderOrigin(value: string | null, expectedOrigin: string): HeaderOriginState {
  if (!value) return "missing";

  try {
    return new URL(value).origin === expectedOrigin ? "same" : "other";
  } catch {
    return "invalid";
  }
}

function safeFetchHeader(value: string | null): string | null {
  if (!value || !/^[a-z0-9_-]{1,40}$/i.test(value)) return null;
  return value;
}

function getRuntimeSessionId(request: Request): string | null {
  const sessionId = request.headers.get(WORLD_RUNTIME_SESSION_HEADER);
  if (!sessionId || !/^[a-z0-9-]{8,80}$/i.test(sessionId)) return null;
  return sessionId;
}
