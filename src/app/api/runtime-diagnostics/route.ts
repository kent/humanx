import { NextResponse } from "next/server";
import { z } from "zod";

import { ApiError, errorResponse } from "@/lib/http";
import { rateLimitRequest } from "@/lib/rate-limit";
import { assertJsonRequest } from "@/lib/request-security";

export const runtime = "nodejs";

const MAX_DIAGNOSTIC_BODY_BYTES = 16_384;
const MAX_DIAGNOSTIC_TEXT_LENGTH = 240;

const worldAppInitSchema = z.object({
  attempted: z.boolean(),
  success: z.boolean().nullable(),
  attempts: z.number().int().min(0).max(10).default(0),
  transport: z.enum(["android", "ios", "missing"]).default("missing"),
  stateContainer: z.enum(["created", "existing", "skipped", "missing"]).default("missing"),
  errorCode: z.string().max(80).nullable(),
  errorMessage: z.string().max(MAX_DIAGNOSTIC_TEXT_LENGTH).nullable(),
}).strict();

const runtimeDiagnosticsSchema = z.object({
  flowVersion: z.string().max(80).optional(),
  worldAppRuntime: z.boolean(),
  nativeTransport: z.boolean(),
  worldAppUserAgent: z.boolean(),
  walletAddress: z.enum(["present", "missing"]),
  accountSource: z.enum(["world_app", "minikit", "wallet_provider", "missing"]),
  accountSourceDetail: z.enum([
    "world_app_flat",
    "world_app_user",
    "world_app_account",
    "world_app_wallet",
    "world_app_user_account",
    "world_app_user_wallet",
    "world_app_message",
    "minikit",
    "wallet_provider",
    "missing",
  ]).optional(),
  orbVerified: z.boolean().nullable(),
  worldAppVersion: z.number().int().nonnegative().nullable(),
  deviceOS: z.string().max(80).nullable(),
  launchLocation: z.string().max(120).nullable(),
  openOrigin: z.string().max(160).nullable(),
  miniKitBridge: z.object({
    trigger: z.boolean(),
    subscribe: z.boolean(),
    unsubscribe: z.boolean(),
  }).strict(),
  worldAppInit: worldAppInitSchema,
  worldAppKeys: z.array(z.string().max(80)).max(64).optional(),
  worldAppShapeKeys: z.array(z.string().max(120)).max(64).optional(),
  miniKitUserKeys: z.array(z.string().max(80)).max(64).optional(),
}).strict();

const diagnosticEventSchema = z.object({
  event: z.enum([
    "world_account_context_pending",
    "world_account_context_detected",
    "world_account_check_started",
    "world_external_navigation_blocked",
    "world_idkit_connector_blocked",
    "world_idkit_native_failed",
    "world_idkit_native_started",
    "world_proof_ready",
    "world_proof_request_started",
    "world_runtime_error",
    "world_runtime_initial",
    "world_runtime_loaded",
    "world_runtime_pagehide",
    "world_runtime_visibility_hidden",
  ]),
  sessionId: z.string().trim().regex(/^[a-z0-9-]{8,80}$/i).optional(),
  errorMessage: z.string().trim().min(1).max(MAX_DIAGNOSTIC_TEXT_LENGTH).optional(),
  phase: z.enum(["creating_proof", "error", "loading", "proof_ready", "ready", "verifying_world"]),
  diagnostics: runtimeDiagnosticsSchema,
}).strict().superRefine((event, context) => {
  if (
    event.event === "world_runtime_error" &&
    !event.errorMessage
  ) {
    context.addIssue({
      code: "custom",
      message: "errorMessage is required for error diagnostics.",
      path: ["errorMessage"],
    });
  }
});

type HeaderOriginState = "same" | "other" | "missing" | "invalid";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertDiagnosticRequestProvenance(request);
    assertJsonRequest(request, MAX_DIAGNOSTIC_BODY_BYTES);
    rateLimitRequest(request, "runtime-diagnostics", { limit: 20, windowMs: 60_000 });

    const event = diagnosticEventSchema.parse(await request.json());
    console.info(
      "world_runtime_diagnostics",
      JSON.stringify({
        receivedAt: new Date().toISOString(),
        request: getDiagnosticRequestMetadata(request),
        ...event,
      }),
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}

function assertDiagnosticRequestProvenance(request: Request): void {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    throw new ApiError(403, "invalid_origin", "The request origin is not accepted.");
  }

  const originHeader = request.headers.get("origin");
  const refererHeader = request.headers.get("referer");
  if (!originHeader && !refererHeader) return;

  const expectedOrigin = getExpectedOrigin(request);
  const originState = classifyHeaderOrigin(originHeader, expectedOrigin);
  const refererState = classifyHeaderOrigin(refererHeader, expectedOrigin);

  if (originState === "same" || (!originHeader && refererState === "same")) return;

  throw new ApiError(403, "invalid_origin", "The request origin is not accepted.");
}

function getDiagnosticRequestMetadata(request: Request) {
  const expectedOrigin = getExpectedOrigin(request);
  const userAgent = request.headers.get("user-agent") ?? "";

  return {
    provenance: {
      origin: classifyHeaderOrigin(request.headers.get("origin"), expectedOrigin),
      referer: classifyHeaderOrigin(request.headers.get("referer"), expectedOrigin),
      secFetchSite: safeFetchHeader(request.headers.get("sec-fetch-site")),
      secFetchMode: safeFetchHeader(request.headers.get("sec-fetch-mode")),
      secFetchDest: safeFetchHeader(request.headers.get("sec-fetch-dest")),
    },
    userAgent: {
      worldApp: /world ?app|worldcoin/i.test(userAgent),
      ios: /iphone|ipad|ipod/i.test(userAgent),
      android: /android/i.test(userAgent),
      mobile: /mobile|iphone|ipad|ipod|android/i.test(userAgent),
      safari: /safari/i.test(userAgent) && !/chrome|chromium|crios|fxios/i.test(userAgent),
      chrome: /chrome|chromium|crios/i.test(userAgent),
    },
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
