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
import { createOrRefreshProof } from "@/lib/proofs";
import { rateLimitByIdentity, rateLimitRequest } from "@/lib/rate-limit";
import { assertJsonRequest, assertSameOriginRequest } from "@/lib/request-security";
import { validatePostText } from "@/lib/text";
import { hashSignalToField } from "@/lib/world-signal";
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
  tweetUrl: z.string().trim().min(1).max(400),
  bindingNonce: z.string().trim().min(1).max(2_048),
  idkitResponse: idKitResultSchema,
}).strict();

const requestSchema = worldIdKitProofSchema;

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

    const tweet = parseTweetUrl(body.tweetUrl);
    if (!tweet) {
      throw new ApiError(400, "tweet_url_invalid", "Paste the link to your X post (x.com/<you>/status/…).");
    }

    // The binding nonce was minted server-side only after the tweet was verified
    // (author + text) at rp-context time. Re-checking it here proves the World ID
    // proof commits to THIS post by THIS account — recompute the signal from it.
    verifyBindingNonce(body.bindingNonce, {
      draftHash: text.draftHash,
      xHandle: tweet.handle,
      tweetId: tweet.tweetId,
    });
    const signal = buildBoundSignal(body.bindingNonce);

    const config = getWorldServerConfig(getRequestOrigin(request));
    const missingWorld = missingWorldConfig(config);
    if (missingWorld.length > 0) {
      throw new ApiError(503, "configuration_error", "World ID proof verification is not configured.", {
        missing: missingWorld,
      });
    }

    const signalHash = hashSignalToField(signal);
    const worldVerification = await verifyWorldIdKitProof(config, body.idkitResponse, signal);

    // Sybil bound: cap how many distinct posts one verified human can prove.
    rateLimitByIdentity(worldVerification.nullifierDecimal, "proofs:nullifier", {
      limit: 25,
      windowMs: 24 * 60 * 60 * 1000,
    });

    const result = await createOrRefreshProof({
      action: config.action,
      environment: config.environment,
      draftText: text.normalized,
      draftHash: text.draftHash,
      signal,
      signalHash,
      xHandle: tweet.handle,
      tweetId: tweet.tweetId,
      nullifierDecimal: worldVerification.nullifierDecimal,
      worldVerification: {
        verifiedAt: worldVerification.verifiedAt,
        resultCode: worldVerification.resultCode,
      },
    });

    const proofUrl = `${config.appUrl}/proof/${result.proof.id}`;
    logWorldProofCreated(request, result.createdNew, worldVerification.resultCode);

    const response = NextResponse.json({
      proof: result.proof,
      proofUrl,
      tweetUrl: canonicalTweetUrl(tweet),
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
